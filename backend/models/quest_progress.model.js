const mongoose = require('mongoose');

const questProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    questId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QuestDefinition',
      required: true,
      index: true,
    },
    // 'YYYY-MM-DD' for daily, 'YYYY-WXX' for weekly (e.g. '2026-W14')
    periodKey: {
      type: String,
      required: true,
    },
    // For counter-based metrics (comment_count, rating_count, etc.)
    currentValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    // For unique-movies metric: set of movieIds watched this period
    watchedMovieIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Movie',
      },
    ],
    isCompleted: {
      type: Boolean,
      default: false,
    },
    isClaimed: {
      type: Boolean,
      default: false,
    },
    claimedAt: {
      type: Date,
      default: null,
    },
    isCompletionBonusClaimed: {
      type: Boolean,
      default: false,
    },
    completionBonusClaimedAt: {
      type: Date,
      default: null,
    },
    lastUpdatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Unique per user + quest + period
questProgressSchema.index({ userId: 1, questId: 1, periodKey: 1 }, { unique: true });
questProgressSchema.index({ userId: 1, periodKey: 1 });

module.exports = mongoose.model('QuestProgress', questProgressSchema);
