const mongoose = require('mongoose');

const userHistorySchema = new mongoose.Schema(
  {
    // Tham chiếu đến User (required, indexed)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Tham chiếu đến Movie (required, indexed)
    movieId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie',
      required: true,
      index: true,
    },
    // Tham chiếu đến Episode (optional)
    episodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Episode',
    },
    watchTime: {
      type: Number, // seconds
    },
    duration: {
      type: Number, // total seconds
    },
    progress: {
      type: Number, // percentage 0-100
      min: 0,
      max: 100,
    },
    lastWatchedAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true, // Tự động thêm createdAt và updatedAt
  },
);

// Compound Index: Sắp xếp lịch sử theo người dùng và thời gian xem gần nhất (-1)
userHistorySchema.index({ userId: 1, lastWatchedAt: -1 });

module.exports = mongoose.model('UserHistory', userHistorySchema);
