const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const mongoose = require('mongoose');
require('dotenv').config();

// ==========================================
// 1. CẤU HÌNH
// ==========================================

// Thông tin Cloudflare R2
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY;
const R2_SECRET_KEY = process.env.R2_SECRET_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const PUBLIC_DOMAIN = process.env.PUBLIC_DOMAIN;

// Đường dẫn thư mục chứa video
const VIDEO_FOLDER = 'F:/Movie'; // Thư mục chứa các file mp4

// Cấu hình Thumbnail
const INTERVAL = 10; // Cứ 10 giây chụp 1 tấm
const THUMB_WIDTH = 320; // Chiều rộng MỘT thumbnail (px) - Kích thước hiển thị mong muốn

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cinephine';

// ==========================================
// 2. MODELS
// ==========================================
const Movie = require('../models/movie.model');
const Episode = require('../models/episode.model');

// ==========================================
// 3. KHỞI TẠO S3 CLIENT (Cloudflare R2)
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
    Key: `thumbnails/${fileName}`,
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
// 4. LOGIC XỬ LÝ FFMPEG & TẠO VTT
// ==========================================

const outputFolder = './temp_output';
if (!fs.existsSync(outputFolder)) fs.mkdirSync(outputFolder);

// Hàm tạo nội dung VTT
function createVTTFile(duration, columns, rows, thumbWidth, thumbHeight, spriteName, outputPath) {
  let vttContent = 'WEBVTT\n\n';
  let currentTime = 0;
  let count = 0;

  const formatTime = (seconds) => {
    const date = new Date(0);
    date.setSeconds(seconds);
    const timeStr = date.toISOString().substring(11, 19);
    const ms = (seconds % 1).toFixed(3).substring(2);
    return `${timeStr}.${ms}`;
  };

  while (currentTime < duration) {
    const endTime = Math.min(currentTime + INTERVAL, duration);

    const colIndex = count % columns;
    const rowIndex = Math.floor(count / columns);
    const x = colIndex * thumbWidth;
    const y = rowIndex * thumbHeight;

    vttContent += `${formatTime(currentTime)} --> ${formatTime(endTime)}\n`;
    vttContent += `${spriteName}#xywh=${x},${y},${thumbWidth},${thumbHeight}\n\n`;

    currentTime += INTERVAL;
    count++;
  }

  fs.writeFileSync(outputPath, vttContent);
}

// Hàm xử lý video và tạo thumbnails
async function processVideo(movieSlug, forceFlag = false) {
  try {
    console.log(`\n🎬 Bắt đầu xử lý phim: ${movieSlug}`);

    // 1. Tìm phim trong database
    const movie = await Movie.findOne({ slug: movieSlug });
    if (!movie) {
      console.error(`❌ Không tìm thấy phim với slug: ${movieSlug}`);
      return;
    }

    console.log(`✅ Tìm thấy phim: ${movie.name}`);

    // 2. Kiểm tra xem đã có thumbnails chưa
    const existingEpisode = await Episode.findOne({ movieId: movie._id });
    if (existingEpisode && existingEpisode.thumbnail_sprite && existingEpisode.thumbnail_vtt) {
      if (!forceFlag) {
        console.log('⚠️  Phim này đã có thumbnails!');
        console.log(`   Sprite: ${existingEpisode.thumbnail_sprite}`);
        console.log(`   VTT: ${existingEpisode.thumbnail_vtt}`);
        console.log('\n💡 Nếu muốn tạo lại, hãy thêm flag --force:');
        console.log(`   node scripts/generateThumbnails.js ${movieSlug} --force\n`);
        return;
      } else {
        console.log('🔄 Flag --force được bật. Đang ghi đè thumbnails cũ...');
      }
    }

    // 3. Tìm file video (tên file = slug.mp4)
    const videoFileName = `${movieSlug}.mp4`;
    const videoPath = path.join(VIDEO_FOLDER, videoFileName);

    if (!fs.existsSync(videoPath)) {
      console.error(`❌ Không tìm thấy file video: ${videoPath}`);
      console.log(`💡 Đảm bảo file video có tên: ${videoFileName}`);
      return;
    }

    console.log(`✅ Tìm thấy file video: ${videoPath}`);

    // 4. Lấy metadata video
    const metadata = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    const duration = metadata.format.duration;
    const originalHeight = metadata.streams[0].height || 1080;
    const originalWidth = metadata.streams[0].width || 1920;
    const thumbHeight = Math.round((THUMB_WIDTH / originalWidth) * originalHeight);

    // 5. Tính toán lưới
    const totalThumbs = Math.floor(duration / INTERVAL);
    const columns = Math.ceil(Math.sqrt(totalThumbs));
    const rows = Math.ceil(totalThumbs / columns);

    console.log(`⏱️  Thời lượng: ${Math.floor(duration)}s`);
    console.log(`📐 Lưới: ${columns}x${rows} (${totalThumbs} thumbnails)`);

    // 6. Tên file đầu ra
    const spriteFileName = `${movieSlug}-sprite.jpg`;
    const vttFileName = `${movieSlug}.vtt`;
    const spriteOutputPath = path.join(outputFolder, spriteFileName);
    const vttOutputPath = path.join(outputFolder, vttFileName);

    // Kiểm tra file đã tồn tại trong temp_output chưa
    const spriteExists = fs.existsSync(spriteOutputPath);
    const vttExists = fs.existsSync(vttOutputPath);

    if (spriteExists && vttExists && !forceFlag) {
      console.log('📁 File thumbnails đã tồn tại trong temp_output!');
      console.log(`   Sprite: ${spriteOutputPath}`);
      console.log(`   VTT: ${vttOutputPath}`);
      console.log('\n💡 Đang sử dụng file có sẵn. Nếu muốn tạo lại, dùng --force');

      // Skip tạo file, nhảy thẳng đến upload
      console.log('☁️  Đang upload lên Cloudflare R2...');
      const spriteUrl = await uploadToR2(spriteOutputPath, spriteFileName, 'image/jpeg');
      const vttUrl = await uploadToR2(vttOutputPath, vttFileName, 'text/vtt');

      // Cập nhật database
      console.log('💾 Đang cập nhật database...');
      const episodes = await Episode.find({ movieId: movie._id });

      if (episodes.length === 0) {
        console.warn('⚠️  Không tìm thấy episode nào cho phim này');
        console.log('\n📋 URLs đã tạo:');
        console.log(`Sprite: ${spriteUrl}`);
        console.log(`VTT: ${vttUrl}`);
        return;
      }

      const updateResult = await Episode.updateMany(
        { movieId: movie._id },
        {
          $set: {
            thumbnail_sprite: spriteUrl,
            thumbnail_vtt: vttUrl,
          },
        },
      );

      console.log(`✅ Đã cập nhật ${updateResult.modifiedCount} episodes`);

      console.log('\n🎉 HOÀN TẤT!');
      console.log('------------------------------------------------');
      console.log(`Sprite URL: ${spriteUrl}`);
      console.log(`VTT URL: ${vttUrl}`);
      console.log(`Đã cập nhật ${updateResult.modifiedCount} episodes`);
      console.log('------------------------------------------------\n');
      return;
    }

    if (forceFlag && (spriteExists || vttExists)) {
      console.log('🔄 Flag --force: Đang xóa file cũ trong temp_output...');
      if (spriteExists) {
        fs.unlinkSync(spriteOutputPath);
        console.log(`   ✅ Đã xóa: ${spriteFileName}`);
      }
      if (vttExists) {
        fs.unlinkSync(vttOutputPath);
        console.log(`   ✅ Đã xóa: ${vttFileName}`);
      }
    }

    // 7. Tạo sprite image
    console.log('📸 Đang tạo sprite image...');
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .complexFilter([
          `fps=1/${INTERVAL},scale=${THUMB_WIDTH}:${thumbHeight}[thumbs]`,
          `[thumbs]tile=${columns}x${rows}[sprite]`,
        ])
        .outputOptions(['-map [sprite]', '-vframes 1'])
        .output(spriteOutputPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    console.log('✅ Đã tạo xong sprite image');

    // 8. Tạo VTT file
    console.log('📝 Đang tạo VTT file...');
    createVTTFile(duration, columns, rows, THUMB_WIDTH, thumbHeight, spriteFileName, vttOutputPath);
    console.log('✅ Đã tạo xong VTT file');

    // 9. Upload lên R2
    console.log('☁️  Đang upload lên Cloudflare R2...');
    const spriteUrl = await uploadToR2(spriteOutputPath, spriteFileName, 'image/jpeg');
    const vttUrl = await uploadToR2(vttOutputPath, vttFileName, 'text/vtt');

    // 10. Cập nhật database - Tìm tất cả episodes của phim
    console.log('💾 Đang cập nhật database...');
    const episodes = await Episode.find({ movieId: movie._id });

    if (episodes.length === 0) {
      console.warn('⚠️  Không tìm thấy episode nào cho phim này');
      console.log('\n📋 URLs đã tạo:');
      console.log(`Sprite: ${spriteUrl}`);
      console.log(`VTT: ${vttUrl}`);
      return;
    }

    // Cập nhật tất cả episodes
    const updateResult = await Episode.updateMany(
      { movieId: movie._id },
      {
        $set: {
          thumbnail_sprite: spriteUrl,
          thumbnail_vtt: vttUrl,
        },
      },
    );

    console.log(`✅ Đã cập nhật ${updateResult.modifiedCount} episodes`);

    // 11. Xóa file tạm (optional)
    try {
      fs.unlinkSync(spriteOutputPath);
      fs.unlinkSync(vttOutputPath);
      console.log('🗑️  Đã xóa file tạm');
    } catch (err) {
      console.warn('⚠️  Không thể xóa file tạm:', err.message);
    }

    console.log('\n🎉 HOÀN TẤT!');
    console.log('------------------------------------------------');
    console.log(`Sprite URL: ${spriteUrl}`);
    console.log(`VTT URL: ${vttUrl}`);
    console.log(`Đã cập nhật ${updateResult.modifiedCount} episodes`);
    console.log('------------------------------------------------\n');
  } catch (error) {
    console.error('❌ Lỗi xử lý:', error);
    throw error;
  }
}

// ==========================================
// 5. MAIN FUNCTION
// ==========================================

async function main() {
  try {
    // Lấy movie slug và flags từ command line argument
    const args = process.argv.slice(2);
    const movieSlug = args[0];
    const forceFlag = args.includes('--force') || args.includes('-f');

    if (!movieSlug) {
      console.error('❌ Vui lòng cung cấp movie slug!');
      console.log('\n📖 Cách sử dụng:');
      console.log('   node scripts/generateThumbnails.js <movie-slug> [--force]');
      console.log('\n📝 Ví dụ:');
      console.log('   node scripts/generateThumbnails.js na-tra-2-ma-dong-nao-hai');
      console.log('   node scripts/generateThumbnails.js na-tra-2-ma-dong-nao-hai --force');
      console.log('\n💡 Lưu ý:');
      console.log('   - File video phải có tên: <movie-slug>.mp4');
      console.log(`   - File video phải nằm trong: ${VIDEO_FOLDER}`);
      console.log('   - Phim phải tồn tại trong database');
      console.log('   - Dùng --force để ghi đè thumbnails cũ');
      process.exit(1);
    }

    // Kết nối MongoDB
    console.log('🔌 Đang kết nối MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Đã kết nối MongoDB');

    // Xử lý video
    await processVideo(movieSlug, forceFlag);

    // Đóng kết nối
    await mongoose.connection.close();
    console.log('👋 Đã đóng kết nối MongoDB');
  } catch (error) {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  }
}

// Chạy script
main();
