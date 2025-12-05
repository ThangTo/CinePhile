const mongoose = require('mongoose');

const castSchema = new mongoose.Schema(
  {
    // Tên hiển thị (theo dữ liệu phimapi hoặc TMDb)
    name: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    // Tên Latin (chuẩn hóa từ tên tượng hình: Hàn, Trung, Nhật)
    nameLatin: {
      type: String,
      index: true,
      trim: true,
    },

    // ID của người này trên TMDb (nếu tìm được)
    tmdbId: {
      type: Number,
      unique: true,
      sparse: true,
    },

    // Ảnh profile từ TMDb
    profilePath: {
      type: String,
    },

    // Link ảnh đầy đủ (có thể build từ profilePath + base URL)
    profileUrl: {
      type: String,
    },

    // Bộ phận nổi bật: "Acting", "Directing", ...
    knownForDepartment: {
      type: String,
    },

    // Loại vai trong hệ thống của bạn: "actor", "director", hoặc cả hai
    roles: [
      {
        type: String,
        enum: ['actor', 'director'],
      },
    ],

    // Độ nổi tiếng theo TMDb (nếu có)
    popularity: {
      type: Number,
      default: 0,
    },

    // Các alias / tên khác (nếu cần sau này)
    alsoKnownAs: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  },
);

castSchema.index({ name: 'text' });

const Cast = mongoose.model('Cast', castSchema);

module.exports = Cast;
