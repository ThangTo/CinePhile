const mongoose = require('mongoose');

const userFavoriteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  movieId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Movie',
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to ensure a user can only favorite a movie once
userFavoriteSchema.index({ userId: 1, movieId: 1 }, { unique: true });

module.exports = mongoose.model('UserFavorite', userFavoriteSchema);
