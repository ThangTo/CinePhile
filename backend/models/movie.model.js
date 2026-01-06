const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: String,
    slug: String,
  },
  { _id: false },
);

// Schema phụ cho Category và Country (cấu trúc giống nhau)
const subDataSchema = new mongoose.Schema(
  {
    name: String,
    slug: String,
  },
  { _id: false },
);

const movieSchema = new mongoose.Schema(
  {
    // --- ĐỊNH DANH ---
    source_id: { type: String, index: true },
    slug: { type: String, unique: true, required: true, index: true },

    // --- TÊN PHIM ---
    name: { type: String, required: true, index: true },
    original_name: { type: String, index: true },

    // --- NỘI DUNG & MEDIA ---
    content: { type: String },
    poster_url: { type: String },
    thumb_url: { type: String },
    trailer_url: { type: String },

    // --- THÔNG TIN CHI TIẾT ---
    time: { type: String },
    year: { type: Number, index: true },
    lang: { type: String },
    quality: { type: String, default: 'HD' },
    type: { type: String, enum: ['movie', 'tvshows', 'series', 'hoathinh'], index: true },
    status: { type: String, enum: ['upcoming', 'ongoing', 'completed'], default: 'ongoing' },

    age_rating: {
      type: String,
      enum: ['T12', 'T16', '18+'],
      default: 'T12',
      index: true,
    },
    // --- ĐỘI NGŨ & PHÂN LOẠI ---
    actor: [{ type: String }],
    director: [{ type: String }],
    categories: [categorySchema],

    country: [subDataSchema],
    // --- SERIES INFO ---
    season: { type: Number, default: 0 }, // Thêm field này theo Schema
    currentEpisode: { type: String },
    totalEpisodes: { type: Number, default: 0 },

    // --- THỐNG KÊ ---
    viewCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 }, // Thêm field này theo Schema
    imdb: { type: Number, default: 0 }, // Thêm field này theo Schema
    rating: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 },

    isNewRelease: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

// Text index for full-text search (BM25 relevance scoring)
// Weight: name (Vietnamese) = 20, original_name (English) = 5, slug = 1
// This prioritizes Vietnamese titles over English titles in search results
movieSchema.index(
  { name: 'text', original_name: 'text', slug: 'text' },
  {
    weights: { name: 20, original_name: 5, slug: 1 },
    name: 'movie_text_index',
  },
);
movieSchema.index({ 'categories.slug': 1 });

const Movie = mongoose.model('Movie', movieSchema);
module.exports = Movie;
