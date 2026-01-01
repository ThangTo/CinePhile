const axios = require('axios'); // Nhớ cài: npm install axios

const baseUrl = 'https://s6.kkphimplayer6.com/20251228/24wsejey/';
// Danh sách các bitrate/folder phổ biến thường gặp ở server phim
const patterns = [
  '3500kb', // Gốc (đã biết)
  '2500kb',
  '2000kb', // Full HD thấp hơn
  '1800kb',
  '1500kb',
  '1200kb', // HD 720p
  '1000kb',
  '800kb',
  '600kb', // SD 480p
  '500kb',
  '360kb',
  '250kb', // Low 360p
  '720p',
  '1080p',
  '480p',
  '360p', // Thử thêm kiểu đặt tên folder này
];

async function checkUrl(prefix) {
  const fullUrl = `${baseUrl}${prefix}/hls/index.m3u8`;
  try {
    // Chỉ gửi request HEAD để check xem file có tồn tại không (nhanh hơn tải về)
    await axios.head(fullUrl);
    console.log(`✅ TÌM THẤY SOURCE: ${fullUrl}`);
    return fullUrl;
  } catch (error) {
    // 404 là không tìm thấy
    // console.log(`❌ Không có: ${prefix}`);
  }
}

async function scan() {
  console.log('Đang quét source ẩn...');
  const promises = patterns.map((p) => checkUrl(p));
  await Promise.all(promises);
  console.log('Hoàn tất.');
}

scan();
