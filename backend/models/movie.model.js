// backend/models/movie.model.js
const mongoose = require("mongoose");

const movieSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true }, // Quan trọng: Slug không được trùng
  origin_name: String,
  content: String,
  type: String, // single (lẻ), series (bộ), hoathinh...
  status: String, // completed, ongoing
  thumb_url: String,
  poster_url: String,
  time: String,
  year: Number,
  
  // Lưu danh sách tập phim và link m3u8
  episodes: [
    {
      server_name: String,
      items: [
        {
          name: String, // Tập 1, Tập 2...
          slug: String,
          embed: String,
          m3u8: String, // Link quan trọng nhất
        },
      ],
    },
  ],
}, { timestamps: true });

module.exports = mongoose.model("Movie", movieSchema);