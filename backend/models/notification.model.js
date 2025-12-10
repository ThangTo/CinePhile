const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Bỏ required: true để cho phép thông báo hệ thống (không của riêng ai)
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: false // <--- SỬA: Cho phép null (System notification)
  },
  
  // Thêm 'movie_update' vào enum
  type: { 
    type: String, 
    enum: ['new_episode', 'comment_reply', 'system', 'payment', 'movie_update'], // <--- SỬA: Đã thêm movie_update
    required: true 
  },
  
  message: { type: String, required: true },
  title: { type: String }, // <--- SỬA: Thêm title vì Crawler có gửi title
  
  // Thêm movieId để FE biết link tới phim nào
  movieId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Movie' 
  }, 

  targetUrl: { type: String }, 
  isRead: { type: Boolean, default: false },

}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);