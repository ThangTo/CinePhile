const mongoose = require('mongoose');

const episodeSchema = new mongoose.Schema(
  {
    // Tham chiếu đến Movie (ObjId)
    movieId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie',
      required: true,
      index: true,
    },
    episodeId: {
      type: Number, // Số tập (e.g., 1, 2, 3)
      required: true,
    },
    slug: {
      type: String, // Slug của tập (dùng cho link)
      required: true,
    },
    // Thông tin server/nguồn phát
    serverName: {
      type: String, // VD: "#Hà Nội (Vietsub)"
    },
    audioType: {
      type: String, // VD: "vietsub" | "thuyet-minh" | "long-tieng" | ...
    },
    filename: {
      type: String, // Tên file đầy đủ từ API nguồn
    },
    duration: {
      type: Number, // Số phút (vd 35 = 35 phút)
    },
    // Link phát
    link_embed: {
      type: String, // Link nhúng (embed)
    },
    link_m3u8: {
      type: String, // Link m3u8 (HLS stream)
    },
  },
  {
    timestamps: true, // Tự động thêm createdAt và updatedAt
  },
);

// Index: Đảm bảo không trùng tập phim theo movie + tập + loại audio
episodeSchema.index({ movieId: 1, episodeId: 1, audioType: 1 }, { unique: true });

// Tạo Model
const Episode = mongoose.model('Episode', episodeSchema);

module.exports = Episode;
