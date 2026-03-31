const mongoose = require('mongoose');

/**
 * DailyAnalytics Schema
 * Stores a persistent snapshot of unique visitor counts per day.
 * Written by the cron job at 23:55 VN time every day.
 * This allows historical analytics to survive Redis TTL expiry.
 */
const dailyAnalyticsSchema = new mongoose.Schema(
  {
    // Primary key: ISO date string "YYYY-MM-DD"
    date: {
      type: String,
      required: true,
      unique: true,
      index: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },

    // Denormalized time fields for efficient grouping queries
    year: { type: Number, required: true, index: true },
    month: { type: Number, required: true, min: 1, max: 12 }, // 1-12
    week: { type: Number, required: true, min: 1, max: 53 },  // ISO week
    dayOfWeek: { type: Number, required: true, min: 1, max: 7 }, // ISO: 1=Mon, 7=Sun

    // Visitor counts (unique identifiers that day)
    total: { type: Number, default: 0, min: 0 },
    guestCount: { type: Number, default: 0, min: 0 },
    userCount: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
    collection: 'daily_analytics',
  }
);

// Compound index for efficient range queries
dailyAnalyticsSchema.index({ year: 1, month: 1, date: 1 });
dailyAnalyticsSchema.index({ year: 1, week: 1 });

module.exports = mongoose.model('DailyAnalytics', dailyAnalyticsSchema);
