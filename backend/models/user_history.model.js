const mongoose = require('mongoose');

const userHistorySchema = new mongoose.Schema({
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
  episodeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Episode', // Assuming there is an Episode model, or it can be optional
    default: null
  },
  watchTime: {
    type: Number, // in seconds
    default: 0
  },
  duration: {
    type: Number, // total seconds
    default: 0
  },
  progress: {
    type: Number, // percentage 0-100
    default: 0
  },
  lastWatchedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for retrieving history sorted by last watched
userHistorySchema.index({ userId: 1, lastWatchedAt: -1 });

module.exports = mongoose.model('UserHistory', userHistorySchema);
