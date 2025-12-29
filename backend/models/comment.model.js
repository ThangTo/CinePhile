const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  // Tham chiếu đến Movie (ObjId)
  movieId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Movie', 
    required: true, 
    index: true 
  }, 
  // Tham chiếu đến User (ObjId)
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  content: { 
    type: String, 
    required: true 
  },
  // Chỉ định rõ episodeId là Number (theo schema)
  episodeId: { 
    type: Number 
  }, 
  likes: { 
    type: Number, 
    default: 0 
  },
  dislikes: { 
    type: Number, 
    default: 0 
  },
  // AI Moderation fields
  flag: {
    type: String, // e.g., 'spam', 'toxic', 'spoiler'
    default: null
  },
  flagReason: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'allowed', 'banned', 'dismissed'],
    default: 'allowed'
  },
}, { 
  timestamps: true // Tự động thêm createdAt và updatedAt
});

// Index quan trọng: movieId, userId, và createdAt (-1) cho sắp xếp mới nhất lên đầu 
commentSchema.index({ movieId: 1 });
commentSchema.index({ userId: 1 });
commentSchema.index({ createdAt: -1 });
commentSchema.index({ status: 1 });
commentSchema.index({ status: 1, createdAt: -1 });


module.exports = mongoose.model("Comment", commentSchema);