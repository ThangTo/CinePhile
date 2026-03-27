const mongoose = require('mongoose');

const trendingMovieSchema = new mongoose.Schema(
  {
    tmdb_id: { type: Number, index: true },
    title: { type: String, required: true },
    original_title: { type: String },
    movieId: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
    slug: { type: String, required: true },
    poster_url: { type: String },
    thumb_url: { type: String },
    ai_quote: { type: String, default: '' },
    trend_score: { type: Number, default: 0, min: 1, max: 10 },
    source: { type: String, default: 'tmdb', index: true },
    primary_source: {
      type: String,
      enum: ['tiktok', 'tmdb', 'google', 'hybrid'],
      default: 'tmdb',
      index: true,
    },
    signals: {
      tiktok: { type: mongoose.Schema.Types.Mixed, default: {} },
      tmdb: { type: mongoose.Schema.Types.Mixed, default: {} },
      google: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    matched_keywords: {
      tiktok: { type: [String], default: [] },
      google: { type: [String], default: [] },
    },
    signal_scores: {
      tiktok: { type: Number, default: 0 },
      tmdb: { type: Number, default: 0 },
      google: { type: Number, default: 0 },
    },
    fallback_mode: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
  },
);

const TrendingMovie = mongoose.model('TrendingMovie', trendingMovieSchema);
module.exports = TrendingMovie;
