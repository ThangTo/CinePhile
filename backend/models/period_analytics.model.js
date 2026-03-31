const mongoose = require('mongoose');

/**
 * PeriodAnalytics Schema
 * Stores TRUE unique visitor counts per calendar period (week / month),
 * computed via Redis SUNION across all day keys in that period.
 *
 * Unlike DailyAnalytics which sums daily totals (one person visiting
 * 5 days = 5), this model stores the actual unique count across the
 * whole period (one person visiting 5 days = 1).
 */
const periodAnalyticsSchema = new mongoose.Schema(
  {
    // 'week' | 'month'
    periodType: {
      type: String,
      required: true,
      enum: ['week', 'month'],
      index: true,
    },

    // ISO key: '2026-W13' for weeks, '2026-03' for months
    periodKey: {
      type: String,
      required: true,
      index: true,
    },

    // Denormalized for easy range queries
    year: { type: Number, required: true, index: true },

    // TRUE unique visitor counts (via Redis SUNION of all days in period)
    total: { type: Number, default: 0, min: 0 },
    guestCount: { type: Number, default: 0, min: 0 },
    userCount: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
    collection: 'period_analytics',
  }
);

// Primary compound unique index
periodAnalyticsSchema.index({ periodType: 1, periodKey: 1 }, { unique: true });

module.exports = mongoose.model('PeriodAnalytics', periodAnalyticsSchema);
