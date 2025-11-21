const axios = require("axios");
const MovieModel = require("../models/movie.model"); // Đường dẫn tới file model ở Bước 1

// Cấu hình đường dẫn gốc
const API_BASE_URL = "https://phimapi.com";

/**
 * Hàm chính: Crawl phim từ trang phim mới cập nhật
 * @param {number} page - Trang cần crawl (mặc định trang 1)
 */
const crawlMovies = async (page = 1) => {
  try {
    console.log(`🚀 Bắt đầu crawl trang ${page}...`);

    // 1. Gọi API lấy danh sách phim mới
    const listResponse = await axios.get(`${API_BASE_URL}/danh-sach/phim-moi-cap-nhat?page=${page}`);
    const moviesList = listResponse.data.items;

    let count = 0;

    // 2. Lặp qua từng phim trong danh sách
    for (const movieItem of moviesList) {
      const slug = movieItem.slug;

      // Kiểm tra xem phim này đã có trong DB chưa (để tránh gọi API chi tiết thừa thãi)
      // (Tùy chọn: Bạn có thể bỏ qua bước check này nếu muốn luôn cập nhật tập mới nhất)
      
      // 3. Gọi API chi tiết để lấy link m3u8 và thông tin đầy đủ
      // Lưu ý: Phải dùng try-catch trong vòng lặp để 1 phim lỗi không làm chết cả tiến trình
      try {
        const detailResponse = await axios.get(`${API_BASE_URL}/phim/${slug}`);
        const movieData = detailResponse.data.movie;
        const episodesData = detailResponse.data.episodes;

        // 4. Chuẩn bị dữ liệu để lưu vào DB (Mapping Data)
        // Ta phải map dữ liệu từ API sang đúng cấu trúc Model của ta
        const payload = {
          name: movieData.name,
          slug: movieData.slug,
          origin_name: movieData.origin_name,
          content: movieData.content,
          type: movieData.type,
          status: movieData.status,
          thumb_url: movieData.thumb_url,
          poster_url: movieData.poster_url,
          time: movieData.time,
          year: movieData.year,
          episodes: episodesData.map(server => ({
            server_name: server.server_name,
            items: server.server_data.map(ep => ({
              name: ep.name,
              slug: ep.slug,
              embed: ep.link_embed,
              m3u8: ep.link_m3u8, // Đây là cái ta cần nhất
            })),
          })),
        };

        // 5. Lưu vào DB (Dùng upsert: Nếu có rồi thì update, chưa có thì tạo mới)
        await MovieModel.findOneAndUpdate(
          { slug: slug }, // Tìm theo slug
          payload,        // Dữ liệu update
          { upsert: true, new: true } // Tùy chọn tạo mới nếu không tìm thấy
        );

        console.log(`✅ Đã cập nhật: ${movieData.name}`);
        count++;

      } catch (err) {
        console.error(`❌ Lỗi khi lấy chi tiết phim ${slug}:`, err.message);
      }
    }

    return {
      status: "success",
      message: `Đã quét xong trang ${page}`,
      updated_count: count,
    };

  } catch (error) {
    console.error("❌ Lỗi Crawl System:", error.message);
    throw error; // Ném lỗi ra để Controller bắt
  }
};

module.exports = {
  crawlMovies,
};