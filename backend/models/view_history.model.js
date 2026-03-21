const mongoose = require('mongoose');

const viewHistorySchema = new mongoose.Schema(
  {
    // Phim được xem
    movieId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie',
      required: true,
      index: true,
    },
    // Tập phim (optional - cho phim bộ)
    episodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Episode',
      default: null,
      index: true,
    },
    // User đã đăng nhập (optional - guest sẽ null)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    // IP Address (dùng để track guest chưa đăng nhập)
    ipAddress: {
      type: String,
      required: true,
      index: true,
    },
    // Thời lượng xem trong phiên này (giây)
    watchDuration: {
      type: Number,
      default: 0,
    },
    // Chuỗi User-Agent đầy đủ
    userAgent: {
      type: String,
      default: 'Unknown',
    },
    // Loại thiết bị phân tích sẵn
    deviceType: {
      type: String,
      enum: ['Desktop', 'Mobile', 'Tablet', 'Unknown'],
      default: 'Unknown',
    },
  },
  {
    timestamps: true, // createdAt = thời điểm bắt đầu xem
  },
);

// Compound index: Truy vấn nhanh "user/ip này đã xem phim này trong 2h qua chưa?"
viewHistorySchema.index({ movieId: 1, userId: 1, createdAt: -1 });
viewHistorySchema.index({ movieId: 1, ipAddress: 1, createdAt: -1 });

// Chi tiết tập phim
viewHistorySchema.index({ episodeId: 1, userId: 1, createdAt: -1 });
viewHistorySchema.index({ episodeId: 1, ipAddress: 1, createdAt: -1 });

// Index cho Dashboard thống kê theo tuần
viewHistorySchema.index({ createdAt: -1 });

module.exports = mongoose.model('ViewHistory', viewHistorySchema);
