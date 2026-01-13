#!/usr/bin/env node
/**
 * Script tải phim từ link m3u8 với FFmpeg
 * Sử dụng: node downloadMovie.js <m3u8_url> [output_filename] [output_directory]
 * 
 * Ví dụ:
 *   node downloadMovie.js "https://s6.kkphimplayer6.com/20251223/ZdX0LpcK/index.m3u8"
 *   node downloadMovie.js "https://s6.kkphimplayer6.com/20251223/ZdX0LpcK/index.m3u8" "my_movie.mp4"
 *   node downloadMovie.js "https://s6.kkphimplayer6.com/20251223/ZdX0LpcK/index.m3u8" "my_movie.mp4" "D:/Movies"
 *   node downloadMovie.js "https://s6.kkphimplayer6.com/20251223/ZdX0LpcK/index.m3u8" "" "D:/Movies"
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// --- CẤU HÌNH MẶC ĐỊNH ---
// Từ khóa quảng cáo (giống app.js)
const AD_KEYWORDS = ['/v7/', '/adjump/', 'google', 'ads', 'doubleclick', 'facebook'];

// Thư mục lưu mặc định (có thể thay đổi ở đây)
const DEFAULT_OUTPUT_DIR = 'F:/Movie'; // Thư mục hiện tại

// Lấy tham số từ command line
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('❌ Thiếu tham số!');
  console.log('\n📖 Cách sử dụng:');
  console.log('   node downloadMovie.js <m3u8_url> [output_filename] [output_directory]\n');
  console.log('📝 Ví dụ:');
  console.log('   node downloadMovie.js "https://s6.kkphimplayer6.com/20251223/ZdX0LpcK/index.m3u8"');
  console.log('   node downloadMovie.js "https://s6.kkphimplayer6.com/20251223/ZdX0LpcK/index.m3u8" "phim_hay.mp4"');
  console.log('   node downloadMovie.js "https://s6.kkphimplayer6.com/20251223/ZdX0LpcK/index.m3u8" "phim_hay.mp4" "D:/Movies"');
  console.log('   node downloadMovie.js "https://s6.kkphimplayer6.com/20251223/ZdX0LpcK/index.m3u8" "" "D:/Movies"\n');
  console.log('💡 Mẹo:');
  console.log('   - Để trống output_filename (dùng "") để tự động đặt tên');
  console.log('   - Thay đổi DEFAULT_OUTPUT_DIR trong script để đổi thư mục mặc định\n');
  process.exit(1);
}

const INITIAL_URL = args[0];
const OUTPUT_FILENAME = args[1] || `movie_${Date.now()}.mp4`;
const OUTPUT_DIR = args[2] || DEFAULT_OUTPUT_DIR;

// Tạo thư mục nếu chưa tồn tại
if (!fs.existsSync(OUTPUT_DIR)) {
  console.log(`📁 Tạo thư mục: ${OUTPUT_DIR}`);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Đường dẫn đầy đủ của file output
const OUTPUT_FILE = path.join(OUTPUT_DIR, OUTPUT_FILENAME);

// ----------------

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Lỗi tải URL: ${url} (Status: ${response.status})`);
  return await response.text();
}

async function main() {
  console.log('═'.repeat(80));
  console.log('🎬 CINEPHINE VIDEO DOWNLOADER');
  console.log('═'.repeat(80));
  console.log(`\n📥 Link gốc: ${INITIAL_URL}`);
  console.log(`� Thư mục lưu: ${OUTPUT_DIR}`);
  console.log(`�💾 Tên file: ${OUTPUT_FILENAME}`);
  console.log(`📍 Đường dẫn đầy đủ: ${OUTPUT_FILE}\n`);

  try {
    let currentUrl = INITIAL_URL;
    let content = await fetchText(currentUrl);

    // ═══════════════════════════════════════════════════════════════════════
    // BƯỚC 1: KIỂM TRA MASTER PLAYLIST (Chọn chất lượng cao nhất)
    // ═══════════════════════════════════════════════════════════════════════
    if (content.includes('#EXT-X-STREAM-INF')) {
      console.log('🔍 Phát hiện Master Playlist. Đang tìm luồng chất lượng cao nhất...');
      
      const lines = content.split('\n');
      let maxBandwidth = 0;
      let bestUri = '';

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('BANDWIDTH=')) {
          const match = lines[i].match(/BANDWIDTH=(\d+)/);
          const bandwidth = match ? parseInt(match[1]) : 0;

          // Dòng tiếp theo là link của luồng
          if (lines[i + 1] && bandwidth > maxBandwidth) {
            maxBandwidth = bandwidth;
            bestUri = lines[i + 1].trim();
          }
        }
      }

      if (bestUri) {
        // Tạo URL tuyệt đối
        currentUrl = new URL(bestUri, currentUrl).toString();
        console.log(`✅ Chọn luồng: ${maxBandwidth} bps`);
        console.log(`➡️  Chuyển đến: ${currentUrl}\n`);
        
        // Tải lại nội dung Media Playlist
        content = await fetchText(currentUrl);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // BƯỚC 2: LỌC QUẢNG CÁO (Logic giống app.js)
    // ═══════════════════════════════════════════════════════════════════════
    console.log('🧹 Đang lọc quảng cáo...');
    
    const baseUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/') + 1);
    const lines = content.split('\n');
    const cleanLines = [];
    let skipNext = false;
    let adsRemoved = 0;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) continue; // Bỏ dòng trống

      // Xử lý logic lọc
      if (line.startsWith('#EXTINF')) {
        // Kiểm tra dòng URL ngay bên dưới
        let nextLine = (lines[i + 1] || '').trim();

        // Chỉ check quảng cáo nếu dòng dưới là link (không phải tag #)
        if (nextLine && !nextLine.startsWith('#')) {
          const isAd = AD_KEYWORDS.some((k) => nextLine.includes(k));
          
          if (isAd) {
            console.log(`   ❌ Bỏ qua quảng cáo: ${nextLine.substring(0, 60)}...`);
            skipNext = true; // Đánh dấu bỏ qua URL bên dưới
            adsRemoved++;
            continue; // Bỏ qua dòng #EXTINF này
          }
        }
      }

      if (skipNext) {
        skipNext = false;
        continue; // Bỏ qua dòng URL quảng cáo
      }

      // Bỏ qua tag ngắt quãng (gây lag khi nối video)
      if (line.includes('#EXT-X-DISCONTINUITY')) continue;

      // Xử lý Rewriting URL
      if (!line.startsWith('#')) {
        if (!line.startsWith('http')) {
          // Ghép với baseUrl
          line = new URL(line, baseUrl).toString();
        }
        
        // Xử lý các trường hợp đặc biệt
        if (line.includes('convertv7/')) {
          line = line.replace('convertv7/', '');
        }
      }

      cleanLines.push(line);
    }

    console.log(`✅ Đã lọc ${adsRemoved} đoạn quảng cáo\n`);

    // ═══════════════════════════════════════════════════════════════════════
    // BƯỚC 3: GHI FILE M3U8 SẠCH
    // ═══════════════════════════════════════════════════════════════════════
    // Lưu file m3u8 cùng thư mục với file mp4
    const cleanM3u8Path = path.join(OUTPUT_DIR, 'clean_playlist.m3u8');
    fs.writeFileSync(cleanM3u8Path, cleanLines.join('\n'));
    console.log(`📝 Đã tạo file: ${cleanM3u8Path}\n`);

    // ═══════════════════════════════════════════════════════════════════════
    // BƯỚC 4: TẢI VIDEO BẰNG FFMPEG
    // ═══════════════════════════════════════════════════════════════════════
    console.log('🎥 Bắt đầu tải video bằng FFmpeg...');
    console.log('⏳ Quá trình này có thể mất vài phút...\n');

    // Command FFmpeg đơn giản hơn, tương thích với nhiều phiên bản
    const command = [
      'ffmpeg',
      '-protocol_whitelist file,http,https,tcp,tls,crypto',
      `-i "${cleanM3u8Path}"`,
      '-c copy',
      '-bsf:a aac_adtstoasc',
      `-y "${OUTPUT_FILE}"` // -y để ghi đè file nếu đã tồn tại
    ].join(' ');

    console.log(`🔧 Command: ${command}\n`);

    const ffmpegProcess = exec(command);

    // Hiển thị output của FFmpeg
    ffmpegProcess.stdout.on('data', (data) => {
      process.stdout.write(data);
    });

    ffmpegProcess.stderr.on('data', (data) => {
      // FFmpeg ghi log vào stderr (không phải lỗi)
      process.stderr.write(data);
    });

    ffmpegProcess.on('close', (code) => {
      console.log('\n' + '═'.repeat(80));
      
      if (code === 0) {
        console.log('✅ THÀNH CÔNG!');
        console.log(`💾 Video đã được lưu tại: ${path.resolve(OUTPUT_FILE)}`);
        
        // Xóa file tạm
        try {
          fs.unlinkSync(cleanM3u8Path);
          console.log('🗑️  Đã xóa file tạm');
        } catch (err) {
          // Không quan trọng nếu xóa thất bại
        }
      } else {
        console.log('❌ THẤT BẠI!');
        console.log(`⚠️  FFmpeg thoát với mã lỗi: ${code}`);
        console.log(`📄 File playlist sạch vẫn còn tại: ${cleanM3u8Path}`);
        console.log('💡 Bạn có thể thử chạy lại hoặc kiểm tra log ở trên');
      }
      
      console.log('═'.repeat(80));
    });

  } catch (error) {
    console.error('\n❌ LỖI SCRIPT:', error.message);
    console.error('\n📋 Chi tiết lỗi:');
    console.error(error);
    process.exit(1);
  }
}

// Chạy script
main();
