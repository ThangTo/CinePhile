const mongoose = require('mongoose');
const {
  QUEST_TYPES,
  QUEST_CATEGORIES,
  QUEST_TARGET_METRICS,
} = require('../constants/quest.constants');

const questDefinitionSchema = new mongoose.Schema(
  {
    questId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: QUEST_TYPES,
    },
    category: {
      type: String,
      required: true,
      enum: QUEST_CATEGORIES,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    icon: {
      type: String,
      default: 'fa-solid fa-star',
    },
    // How many units needed (e.g. 1 comment, 600 seconds, 7 movies)
    targetValue: {
      type: Number,
      required: true,
      min: 1,
    },
    // Which metric to track
    // 'comment_count' | 'rating_count' | 'watch_seconds' | 'unique_movies' | 'favorite_count' | 'watchlist_count'
    targetMetric: {
      type: String,
      required: true,
      enum: QUEST_TARGET_METRICS,
    },
    // Optional filter for target movies ('any' for now)
    targetMovieFilter: {
      type: String,
      default: 'any',
    },
    // Must be multiple of 10, between 10 and 500
    rewardCoins: {
      type: Number,
      required: true,
      validate: {
        validator: function (v) {
          return v >= 10 && v <= 500 && v % 10 === 0;
        },
        message: 'rewardCoins must be a multiple of 10, min 10, max 500',
      },
    },
    // Bonus coins when ALL quests of this type are completed
    // Must be multiple of 10, between 10 and 500
    completionBonusCoins: {
      type: Number,
      default: 0,
      validate: {
        validator: function (v) {
          return v % 10 === 0 && v >= 0 && v <= 500;
        },
        message: 'completionBonusCoins must be a multiple of 10, min 0, max 500',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Display order
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

questDefinitionSchema.index({ type: 1, isActive: 1 });
questDefinitionSchema.index({ type: 1, order: 1 });

module.exports = mongoose.model('QuestDefinition', questDefinitionSchema);
