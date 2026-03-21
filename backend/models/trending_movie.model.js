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
    source: { type: String, enum: ['tmdb', 'google', 'both'], default: 'tmdb' },
  },
  {
    timestamps: true,
  },
);

const TrendingMovie = mongoose.model('TrendingMovie', trendingMovieSchema);
module.exports = TrendingMovie;
