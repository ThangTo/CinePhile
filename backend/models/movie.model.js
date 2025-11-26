const mongoose = require('mongoose');

// Định nghĩa Schema lồng nhau cho categories
// Thuộc tính này được nhúng (embedded) trong movieSchema
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String, // Ví dụ: "Hành Động"
    },
    slug: {
      type: String, // Ví dụ: "hanh-dong" -> dùng để filter/link
    },
  },
  { _id: false },
); // Tắt _id cho subdocument category

// Định nghĩa Movie Schema
const movieSchema = new mongoose.Schema(
  {
    // --- CÁC TRƯỜNG CƠ BẢN ---
    title: { type: String, required: true, index: true },
    englishTitle: { type: String, index: true },
    description: String,
    poster: String,
    backgroundImage: String,
    type: { type: String, enum: ['movie', 'series'], default: 'movie' },
    year: { type: Number, index: true },
    duration: String,
    quality: String,
    country: { type: String, index: true },
    genres: [{ type: String, index: true }],

    slug: { type: String, unique: true, index: true },

    // --- THỐNG KÊ & TRẠNG THÁI ---
    viewCount: { type: Number, default: 0 },
    status: { type: String, enum: ['upcoming', 'ongoing', 'completed'], default: 'ongoing' },

    // Series info
    currentEpisode: String,

    isNewRelease: { type: Boolean, default: false, index: true },

    // --- RATING SYSTEM (Computed Pattern) ---
    rating: { type: Number, default: 0, index: true },
    totalRatings: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Index text search
movieSchema.index({ title: 'text', englishTitle: 'text' });

// Thêm index cho mảng categories để tìm kiếm/lọc hiệu quả.
movieSchema.index({ categories: 1 });

// Tạo Model
const Movie = mongoose.model('Movie', movieSchema);

module.exports = Movie;
