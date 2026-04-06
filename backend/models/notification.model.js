const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    // userId: required cho thông báo mới
    // Thông báo system sẽ được tạo riêng cho từng user (mỗi user có một bản copy)
    // Giữ required: false để tương thích với dữ liệu cũ
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },

    type: {
      type: String,
      enum: [
        'new_episode',
        'comment_reply',
        'system',
        'payment',
        'movie_update',
        'quest_claimed',
        'quest_bonus',
        'quest_auto_claim',
      ],
      required: true,
    },

    message: { type: String, required: true },
    title: { type: String },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    movieId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie',
    },

    targetUrl: { type: String },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Notification', notificationSchema);
