const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    // Bỏ required: true để cho phép thông báo hệ thống (không của riêng ai)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },

    type: {
      type: String,
      enum: ['new_episode', 'comment_reply', 'system', 'payment', 'movie_update'],
      required: true,
    },

    message: { type: String, required: true },
    title: { type: String },

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
