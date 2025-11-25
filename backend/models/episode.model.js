const mongoose = require("mongoose");

const episodeSchema = new mongoose.Schema({
  // Tham chiếu đến Movie (ObjId)
  movieId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Movie', 
    required: true, 
    index: true 
  },
  episodeId: { 
    type: Number, // Số tập (e.g., 1, 2, 3)
    required: true,
  }, 
  slug: {
    type: String, // Slug của tập (dùng cho link)
    required: true,
  },
  duration: {
    type: Number, // Số phút (vd 35 = 35 phút)
  }, 
  // Cập nhật theo schema mới:
  link_embed: {
    type: String, // Link nhúng (embed)
  },
  link_m3u8: {
    type: String, // Link m3u8 (HLS stream)
  },
}, { 
  timestamps: true // Tự động thêm createdAt và updatedAt
});

// Index bắt buộc: Đảm bảo không trùng tập phim (Unique Compound Index)
// Dùng movieId + slug để xác định duy nhất một tập phim
episodeSchema.index({ movieId: 1, slug: 1 }, { unique: true });

// Tạo Model
const Episode = mongoose.model("Episode", episodeSchema);

module.exports = Episode;