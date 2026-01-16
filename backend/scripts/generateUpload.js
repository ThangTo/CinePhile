const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// ==========================================
// 1. CẤU HÌNH (Thay thông tin của bạn vào đây)
// ==========================================

// Thông tin Cloudflare R2 (Lấy từ bước trước)
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY;
const R2_SECRET_KEY = process.env.R2_SECRET_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const PUBLIC_DOMAIN = process.env.PUBLIC_DOMAIN;

// Thông tin File Phim
const INPUT_VIDEO = 'F:/Movie/na_tra_2.mp4'; // Tên file video gốc đang nằm cùng thư mục
const MOVIE_SLUG = 'na-tra-2-ma-dong-nao-hai'; // Tên phim viết liền không dấu (để đặt tên file trên R2)

// Cấu hình Thumbnail
const INTERVAL = 10; // Cứ 10 giây chụp 1 tấm
const THUMB_WIDTH = 160; // Chiều rộng ảnh nhỏ (px)

// ==========================================
// 2. KHỞI TẠO S3 CLIENT (Cloudflare R2)
// ==========================================
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY,
  },
});

// Hàm Upload file lên R2
async function uploadToR2(filePath, fileName, contentType) {
  const fileStream = fs.createReadStream(filePath);
  const uploadParams = {
    Bucket: R2_BUCKET_NAME,
    Key: `thumbnails/${fileName}`, // Lưu vào thư mục thumbnails/
    Body: fileStream,
    ContentType: contentType,
  };

  try {
    await s3Client.send(new PutObjectCommand(uploadParams));
    const publicUrl = `${PUBLIC_DOMAIN}/thumbnails/${fileName}`;
    console.log(`✅ Upload thành công: ${publicUrl}`);
    return publicUrl;
  } catch (err) {
    console.error('❌ Lỗi upload R2:', err);
    throw err;
  }
}

// ==========================================
// 3. LOGIC XỬ LÝ FFMPEG & TẠO VTT
// ==========================================

const outputFolder = './temp_output'; // Thư mục tạm
if (!fs.existsSync(outputFolder)) fs.mkdirSync(outputFolder);

// Tên file đầu ra
const spriteFileName = `${MOVIE_SLUG}-sprite.jpg`;
const vttFileName = `${MOVIE_SLUG}.vtt`;

console.log('🚀 Đang bắt đầu xử lý phim:', INPUT_VIDEO);

ffmpeg.ffprobe(INPUT_VIDEO, (err, metadata) => {
  if (err) {
    console.error('Lỗi đọc file video:', err);
    return;
  }

  const duration = metadata.format.duration;
  const originalHeight = metadata.streams[0].height || 1080;
  const originalWidth = metadata.streams[0].width || 1920;

  // Tính chiều cao thumbnail giữ đúng tỷ lệ
  const thumbHeight = Math.round((THUMB_WIDTH / originalWidth) * originalHeight);

  // Tính toán lưới (Grid) cho Sprite
  const totalThumbs = Math.floor(duration / INTERVAL);
  const columns = Math.ceil(Math.sqrt(totalThumbs));
  const rows = Math.ceil(totalThumbs / columns);

  console.log(`⏱️  Thời lượng: ${Math.floor(duration)}s. Tạo lưới: ${columns}x${rows}`);

  // Bắt đầu chạy FFmpeg
  ffmpeg(INPUT_VIDEO)
    .complexFilter([
      `fps=1/${INTERVAL},scale=${THUMB_WIDTH}:${thumbHeight}[thumbs]`,
      `[thumbs]tile=${columns}x${rows}[sprite]`,
    ])
    .outputOptions(['-map [sprite]', '-vframes 1'])
    .output(path.join(outputFolder, spriteFileName))
    .on('end', async () => {
      console.log('📸 Đã tạo xong ảnh Sprite. Đang tạo file VTT...');

      // Tạo nội dung file VTT
      createVTTFile(duration, columns, rows, THUMB_WIDTH, thumbHeight, spriteFileName);

      console.log('☁️  Đang upload lên Cloudflare R2...');
      try {
        // Upload Sprite
        const spriteUrl = await uploadToR2(
          path.join(outputFolder, spriteFileName),
          spriteFileName,
          'image/jpeg',
        );

        // Upload VTT
        const vttUrl = await uploadToR2(
          path.join(outputFolder, vttFileName),
          vttFileName,
          'text/vtt',
        );

        console.log('\n🎉 HOÀN TẤT! HÃY COPY 2 DÒNG NÀY VÀO MONGODB:');
        console.log('------------------------------------------------');
        console.log(`thumbnail_sprite: "${spriteUrl}"`);
        console.log(`thumbnail_vtt:    "${vttUrl}"`);
        console.log('------------------------------------------------');

        // (Tùy chọn) Xóa file tạm sau khi upload xong
        // fs.unlinkSync(path.join(outputFolder, spriteFileName));
        // fs.unlinkSync(path.join(outputFolder, vttFileName));
      } catch (uploadErr) {
        console.error('Lỗi trong quá trình upload:', uploadErr);
      }
    })
    .on('error', (err) => {
      console.error('Lỗi FFmpeg:', err);
    })
    .run();
});

// Hàm tạo nội dung VTT chuẩn xác
function createVTTFile(duration, columns, rows, thumbWidth, thumbHeight, spriteName) {
  let vttContent = 'WEBVTT\n\n';
  let currentTime = 0;
  let count = 0;

  // Hàm format thời gian: 00:00:10.000
  const formatTime = (seconds) => {
    const date = new Date(0);
    date.setSeconds(seconds);
    const timeStr = date.toISOString().substr(11, 8);
    const ms = (seconds % 1).toFixed(3).substring(2);
    return `${timeStr}.${ms}`;
  };

  while (currentTime < duration) {
    const endTime = Math.min(currentTime + INTERVAL, duration);

    const colIndex = count % columns;
    const rowIndex = Math.floor(count / columns);
    const x = colIndex * thumbWidth;
    const y = rowIndex * thumbHeight;

    // Quan trọng: Chỉ ghi tên file ảnh, không ghi đường dẫn full
    // Vì trên R2, file .vtt và .jpg nằm cùng thư mục
    vttContent += `${formatTime(currentTime)} --> ${formatTime(endTime)}\n`;
    vttContent += `${spriteName}#xywh=${x},${y},${thumbWidth},${thumbHeight}\n\n`;

    currentTime += INTERVAL;
    count++;
  }

  fs.writeFileSync(path.join(outputFolder, vttFileName), vttContent);
}
