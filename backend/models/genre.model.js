const mongoose = require('mongoose');

const genreSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    count: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Genre', genreSchema);
