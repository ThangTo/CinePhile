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

// Đường dẫn thư mục
const VIDEO_FOLDER = 'F:/Movie'; // Thư mục chứa các file mp4

// Cấu hình Thumbnail
const INTERVAL = 10; // Cứ 10 giây chụp 1 tấm
const THUMB_WIDTH = 320; // Chiều rộng MỘT thumbnail (px)

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

// ==========================================
// 4. UTILITY FUNCTIONS
// ==========================================

// Upload file lên R2
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
    return publicUrl;
  } catch (err) {
    console.error('❌ Lỗi upload R2:', err);
    throw err;
  }
}

// Tạo nội dung VTT
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

// ==========================================
// 5. DOWNLOAD VIDEO FROM M3U8
// ==========================================

// Từ khóa quảng cáo (giống downloadMovie.js)
const AD_KEYWORDS = ['/v7/', '/adjump/', 'google', 'ads', 'doubleclick', 'facebook'];

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Lỗi tải URL: ${url} (Status: ${response.status})`);
  return await response.text();
}

async function downloadVideoFromM3U8(m3u8Url, outputPath, logPrefix) {
  const { exec } = require('child_process');

  try {
    console.log(`${logPrefix} 📥 Link m3u8: ${m3u8Url}`);

    let currentUrl = m3u8Url;
    let content = await fetchText(currentUrl);

    // BƯỚC 1: KIỂM TRA MASTER PLAYLIST (Chọn chất lượng cao nhất)
    if (content.includes('#EXT-X-STREAM-INF')) {
      console.log(
        `${logPrefix} 🔍 Phát hiện Master Playlist. Đang tìm luồng chất lượng cao nhất...`,
      );

      const lines = content.split('\n');
      let maxBandwidth = 0;
      let bestUri = '';

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('BANDWIDTH=')) {
          const match = lines[i].match(/BANDWIDTH=(\d+)/);
          const bandwidth = match ? parseInt(match[1]) : 0;

          if (lines[i + 1] && bandwidth > maxBandwidth) {
            maxBandwidth = bandwidth;
            bestUri = lines[i + 1].trim();
          }
        }
      }

      if (bestUri) {
        currentUrl = new URL(bestUri, currentUrl).toString();
        console.log(`${logPrefix} ✅ Chọn luồng: ${maxBandwidth} bps`);
        content = await fetchText(currentUrl);
      }
    }

    // BƯỚC 2: LỌC QUẢNG CÁO
    console.log(`${logPrefix} 🧹 Đang lọc quảng cáo...`);

    const baseUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/') + 1);
    const lines = content.split('\n');
    const cleanLines = [];
    let skipNext = false;
    let adsRemoved = 0;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) continue;

      if (line.startsWith('#EXTINF')) {
        let nextLine = (lines[i + 1] || '').trim();

        if (nextLine && !nextLine.startsWith('#')) {
          const isAd = AD_KEYWORDS.some((k) => nextLine.includes(k));

          if (isAd) {
            skipNext = true;
            adsRemoved++;
            continue;
          }
        }
      }

      if (skipNext) {
        skipNext = false;
        continue;
      }

      if (line.includes('#EXT-X-DISCONTINUITY')) continue;

      if (!line.startsWith('#')) {
        if (!line.startsWith('http')) {
          line = new URL(line, baseUrl).toString();
        }

        if (line.includes('convertv7/')) {
          line = line.replace('convertv7/', '');
        }
      }

      cleanLines.push(line);
    }

    console.log(`${logPrefix} ✅ Đã lọc ${adsRemoved} đoạn quảng cáo`);

    // BƯỚC 3: GHI FILE M3U8 SẠCH
    const cleanM3u8Path = path.join(
      VIDEO_FOLDER,
      `${path.basename(outputPath, '.mp4')}_clean.m3u8`,
    );
    fs.writeFileSync(cleanM3u8Path, cleanLines.join('\n'));
    console.log(`${logPrefix} 📝 Đã tạo file playlist sạch`);

    // BƯỚC 4: TẢI VIDEO BẰNG FFMPEG
    console.log(`${logPrefix} 🎥 Bắt đầu tải video bằng FFmpeg...`);

    const command = [
      'ffmpeg',
      '-protocol_whitelist file,http,https,tcp,tls,crypto',
      `-i "${cleanM3u8Path}"`,
      '-c copy',
      '-bsf:a aac_adtstoasc',
      `-y "${outputPath}"`,
    ].join(' ');

    return new Promise((resolve, reject) => {
      const ffmpegProcess = exec(command);
      let lastProgress = '';

      ffmpegProcess.stderr.on('data', (data) => {
        const output = data.toString();

        // Tìm thông tin tiến trình
        const timeMatch = output.match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/);
        const speedMatch = output.match(/speed=\s*([\d.]+)x/);

        if (timeMatch || speedMatch) {
          const progress = `${logPrefix} 🔄 Tiến trình: ${
            timeMatch ? timeMatch[1] : 'N/A'
          } | Tốc độ: ${speedMatch ? speedMatch[1] : 'N/A'}x`;
          if (progress !== lastProgress) {
            console.log(progress);
            lastProgress = progress;
          }
        }
      });

      ffmpegProcess.on('close', (code) => {
        // Xóa file tạm
        try {
          fs.unlinkSync(cleanM3u8Path);
        } catch (err) {
          // Không quan trọng
        }

        if (code === 0) {
          console.log(`${logPrefix} ✅ Tải video hoàn tất: ${outputPath}`);
          resolve(outputPath);
        } else {
          reject(new Error(`FFmpeg thoát với mã lỗi: ${code}`));
        }
      });

      ffmpegProcess.on('error', (err) => {
        reject(err);
      });
    });
  } catch (error) {
    console.error(`${logPrefix} ❌ Lỗi tải video:`, error.message);
    throw error;
  }
}

// ==========================================
// 6. GENERATE THUMBNAILS
// ==========================================

async function generateThumbnails(movieSlug, videoPath, forceFlag, logPrefix) {
  const outputFolder = './temp_output';
  if (!fs.existsSync(outputFolder)) fs.mkdirSync(outputFolder);

  const spriteFileName = `${movieSlug}-sprite.jpg`;
  const vttFileName = `${movieSlug}.vtt`;
  const spriteOutputPath = path.join(outputFolder, spriteFileName);
  const vttOutputPath = path.join(outputFolder, vttFileName);

  // Kiểm tra file đã tồn tại trong temp_output
  const spriteExists = fs.existsSync(spriteOutputPath);
  const vttExists = fs.existsSync(vttOutputPath);

  if (spriteExists && vttExists && !forceFlag) {
    console.log(`${logPrefix} 📁 File thumbnails đã tồn tại trong temp_output, đang sử dụng...`);
  } else {
    if (forceFlag && (spriteExists || vttExists)) {
      console.log(`${logPrefix} 🔄 Flag --force: Đang xóa file cũ...`);
      if (spriteExists) fs.unlinkSync(spriteOutputPath);
      if (vttExists) fs.unlinkSync(vttOutputPath);
    }

    // Lấy metadata video
    console.log(`${logPrefix} 📊 Đang phân tích video...`);
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

    // Tính toán lưới
    const totalThumbs = Math.floor(duration / INTERVAL);
    const columns = Math.ceil(Math.sqrt(totalThumbs));
    const rows = Math.ceil(totalThumbs / columns);

    console.log(`${logPrefix} ⏱️  Thời lượng: ${Math.floor(duration)}s`);
    console.log(`${logPrefix} 📐 Lưới: ${columns}x${rows} (${totalThumbs} thumbnails)`);

    // Tạo sprite image
    console.log(`${logPrefix} 📸 Đang tạo sprite image...`);
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .complexFilter([
          `fps=1/${INTERVAL},scale=${THUMB_WIDTH}:${thumbHeight}[thumbs]`,
          `[thumbs]tile=${columns}x${rows}[sprite]`,
        ])
        .outputOptions(['-map [sprite]', '-vframes 1'])
        .output(spriteOutputPath)
        .on('start', (cmd) => {
          console.log(`${logPrefix} 🎬 FFmpeg command: ${cmd.substring(0, 100)}...`);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`${logPrefix} 🔄 Tiến trình tạo sprite: ${progress.percent.toFixed(1)}%`);
          } else if (progress.frames) {
            console.log(`${logPrefix} 🔄 Đã xử lý ${progress.frames} frames...`);
          }
        })
        .on('end', () => {
          console.log(`${logPrefix} ✅ Đã tạo xong sprite image`);
          resolve();
        })
        .on('error', (err) => {
          console.error(`${logPrefix} ❌ Lỗi tạo sprite:`, err.message);
          reject(err);
        })
        .run();
    });

    // Tạo VTT file
    console.log(`${logPrefix} 📝 Đang tạo VTT file...`);
    createVTTFile(duration, columns, rows, THUMB_WIDTH, thumbHeight, spriteFileName, vttOutputPath);
    console.log(`${logPrefix} ✅ Đã tạo xong VTT file`);
  }

  // Upload lên R2
  console.log(`${logPrefix} ☁️  Đang upload lên Cloudflare R2...`);
  const spriteUrl = await uploadToR2(spriteOutputPath, spriteFileName, 'image/jpeg');
  console.log(`${logPrefix} ✅ Upload sprite: ${spriteUrl}`);

  const vttUrl = await uploadToR2(vttOutputPath, vttFileName, 'text/vtt');
  console.log(`${logPrefix} ✅ Upload VTT: ${vttUrl}`);

  return { spriteUrl, vttUrl };
}

// ==========================================
// 7. PROCESS SINGLE MOVIE
// ==========================================

async function processMovie(movieSlug, forceFlag) {
  const logPrefix = `[${movieSlug}]`;

  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${logPrefix} 🎬 BẮT ĐẦU XỬ LÝ PHIM`);
    console.log(`${'='.repeat(60)}`);

    // 1. Tìm phim trong database
    console.log(`${logPrefix} 🔍 Đang tìm phim trong database...`);
    const movie = await Movie.findOne({ slug: movieSlug });
    if (!movie) {
      console.error(`${logPrefix} ❌ Không tìm thấy phim với slug: ${movieSlug}`);
      return { success: false, slug: movieSlug, error: 'Movie not found' };
    }
    console.log(`${logPrefix} ✅ Tìm thấy phim: ${movie.name}`);

    // 2. Kiểm tra xem đã có thumbnails chưa
    const existingEpisode = await Episode.findOne({ movieId: movie._id });
    if (existingEpisode && existingEpisode.thumbnail_sprite && existingEpisode.thumbnail_vtt) {
      if (!forceFlag) {
        console.log(`${logPrefix} ⚠️  Phim này đã có thumbnails!`);
        console.log(`${logPrefix}    Sprite: ${existingEpisode.thumbnail_sprite}`);
        console.log(`${logPrefix}    VTT: ${existingEpisode.thumbnail_vtt}`);
        console.log(`${logPrefix} 💡 Bỏ qua. Dùng --force để tạo lại.`);
        return { success: true, slug: movieSlug, skipped: true };
      } else {
        console.log(`${logPrefix} 🔄 Flag --force: Đang ghi đè thumbnails cũ...`);
      }
    }

    // 3. Kiểm tra file video
    let videoPath = path.join(VIDEO_FOLDER, `${movieSlug}.mp4`);

    if (!fs.existsSync(videoPath)) {
      console.log(`${logPrefix} ⚠️  Không tìm thấy file video: ${videoPath}`);
      console.log(`${logPrefix} 🔍 Đang tìm link m3u8 trong database...`);

      // Lấy episodes và tìm link m3u8 (ưu tiên: lồng tiếng → thuyết minh → phụ đề)
      const episodes = await Episode.find({ movieId: movie._id });

      if (episodes.length === 0) {
        console.error(`${logPrefix} ❌ Không tìm thấy episode nào cho phim này`);
        return { success: false, slug: movieSlug, error: 'No episodes found' };
      }

      // Ưu tiên audioType
      const priority = ['long-tieng', 'thuyet-minh', 'vietsub'];
      let selectedEpisode = null;

      for (const audioType of priority) {
        selectedEpisode = episodes.find((ep) => ep.audioType === audioType && ep.link_m3u8);
        if (selectedEpisode) {
          console.log(`${logPrefix} ✅ Tìm thấy episode (${audioType})`);
          break;
        }
      }

      // Fallback: Lấy episode đầu tiên có link_m3u8
      if (!selectedEpisode) {
        selectedEpisode = episodes.find((ep) => ep.link_m3u8);
      }

      if (!selectedEpisode || !selectedEpisode.link_m3u8) {
        console.error(`${logPrefix} ❌ Không tìm thấy link m3u8 trong episodes`);
        return { success: false, slug: movieSlug, error: 'No m3u8 link found' };
      }

      // Tải video từ m3u8
      try {
        videoPath = await downloadVideoFromM3U8(selectedEpisode.link_m3u8, videoPath, logPrefix);
      } catch (downloadError) {
        console.error(`${logPrefix} ❌ Lỗi tải video:`, downloadError.message);
        return {
          success: false,
          slug: movieSlug,
          error: `Download failed: ${downloadError.message}`,
        };
      }
    } else {
      console.log(`${logPrefix} ✅ Tìm thấy file video: ${videoPath}`);
    }

    // 4. Tạo thumbnails
    const { spriteUrl, vttUrl } = await generateThumbnails(
      movieSlug,
      videoPath,
      forceFlag,
      logPrefix,
    );

    // 5. Cập nhật database
    console.log(`${logPrefix} 💾 Đang cập nhật database...`);
    const episodes = await Episode.find({ movieId: movie._id });

    if (episodes.length === 0) {
      console.warn(`${logPrefix} ⚠️  Không tìm thấy episode nào cho phim này`);
      return {
        success: true,
        slug: movieSlug,
        spriteUrl,
        vttUrl,
        warning: 'No episodes found',
      };
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

    console.log(`${logPrefix} ✅ Đã cập nhật ${updateResult.modifiedCount} episodes`);

    console.log(`\n${logPrefix} 🎉 HOÀN TẤT!`);
    console.log(`${logPrefix} ${'─'.repeat(50)}`);
    console.log(`${logPrefix} Sprite: ${spriteUrl}`);
    console.log(`${logPrefix} VTT: ${vttUrl}`);
    console.log(`${logPrefix} Episodes: ${updateResult.modifiedCount}`);
    console.log(`${logPrefix} ${'─'.repeat(50)}\n`);

    return {
      success: true,
      slug: movieSlug,
      spriteUrl,
      vttUrl,
      episodesUpdated: updateResult.modifiedCount,
    };
  } catch (error) {
    console.error(`${logPrefix} ❌ LỖI:`, error.message);
    return { success: false, slug: movieSlug, error: error.message };
  }
}

// ==========================================
// 8. MAIN FUNCTION
// ==========================================

async function main() {
  try {
    const args = process.argv.slice(2);
    const forceFlag = args.includes('--force') || args.includes('-f');

    // Lọc ra các slug (bỏ qua flags)
    const movieSlugs = args.filter((arg) => !arg.startsWith('--') && !arg.startsWith('-'));

    if (movieSlugs.length === 0) {
      console.error('❌ Vui lòng cung cấp ít nhất một movie slug!');
      console.log('\n📖 Cách sử dụng:');
      console.log('   node scripts/processMovies.js <slug1> [slug2] [slug3] ... [--force]');
      console.log('\n📝 Ví dụ:');
      console.log('   node scripts/processMovies.js na-tra-2-ma-dong-nao-hai');
      console.log('   node scripts/processMovies.js movie-1 movie-2 movie-3');
      console.log('   node scripts/processMovies.js movie-1 movie-2 --force');
      console.log('\n💡 Lưu ý:');
      console.log('   - Nếu chưa có file video, script sẽ tự động tải từ link m3u8 trong database');
      console.log('   - Ưu tiên audioType: lồng tiếng → thuyết minh → phụ đề');
      console.log('   - File video sẽ lưu tại: F:/Movie/<slug>.mp4');
      console.log('   - Phim phải tồn tại trong database với ít nhất 1 episode có link_m3u8');
      console.log('   - Dùng --force để ghi đè thumbnails cũ');
      console.log('   - Có thể xử lý nhiều phim cùng lúc (song song)');
      process.exit(1);
    }

    console.log('\n🚀 SCRIPT XỬ LÝ PHIM - TÍCH HỢP GHÉP VIDEO & TẠO THUMBNAILS');
    console.log(`📋 Số lượng phim: ${movieSlugs.length}`);
    console.log(`🔄 Force mode: ${forceFlag ? 'BẬT' : 'TẮT'}`);
    console.log(`⚙️  Cấu hình: THUMB_WIDTH=${THUMB_WIDTH}px, INTERVAL=${INTERVAL}s`);

    // Kết nối MongoDB
    console.log('\n🔌 Đang kết nối MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Đã kết nối MongoDB\n');

    // Xử lý song song tất cả phim
    const startTime = Date.now();
    console.log(`⏰ Bắt đầu lúc: ${new Date().toLocaleString()}\n`);

    const results = await Promise.allSettled(
      movieSlugs.map((slug) => processMovie(slug, forceFlag)),
    );

    // Tổng kết
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);

    console.log('\n' + '='.repeat(60));
    console.log('📊 TỔNG KẾT');
    console.log('='.repeat(60));

    let successCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    results.forEach((result, index) => {
      const slug = movieSlugs[index];
      if (result.status === 'fulfilled') {
        const data = result.value;
        if (data.success) {
          if (data.skipped) {
            skippedCount++;
            console.log(`✅ [${slug}] Đã có thumbnails (bỏ qua)`);
          } else {
            successCount++;
            console.log(`✅ [${slug}] Thành công - ${data.episodesUpdated || 0} episodes`);
          }
        } else {
          failedCount++;
          console.log(`❌ [${slug}] Thất bại: ${data.error}`);
        }
      } else {
        failedCount++;
        console.log(`❌ [${slug}] Lỗi: ${result.reason}`);
      }
    });

    console.log('\n' + '─'.repeat(60));
    console.log(`✅ Thành công: ${successCount}`);
    console.log(`⏭️  Bỏ qua: ${skippedCount}`);
    console.log(`❌ Thất bại: ${failedCount}`);
    console.log(`⏱️  Tổng thời gian: ${duration}s`);
    console.log(`⏰ Kết thúc lúc: ${new Date().toLocaleString()}`);
    console.log('─'.repeat(60) + '\n');

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
