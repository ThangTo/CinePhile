const mongoose = require('mongoose');
// 1. Import thư viện này (QUAN TRỌNG)
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    // Lưu ý: Khi dùng passport-local-mongoose, nó sẽ tự động quản lý password (hash/salt)
    // nên ta có thể không cần khai báo trường password ở đây, hoặc giữ lại cũng không sao.
    password: {
      type: String,
    },
    avatar: {
      type: String,
      default: '',
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      default: 'other',
    },
    role: {
      type: String,
      enum: ['user', 'premium', 'admin'],
      default: 'user',
    },
    premiumPlan: {
      type: String,
      enum: ['weekly', 'monthly', 'yearly'],
      default: null,
    },
    premiumExpiresAt: {
      type: Date,
      default: null,
    },
    coin: {
      type: Number,
      default: 0,
      min: 0,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
  },
);

// Index
userSchema.index({ email: 1 });

// 2. Kích hoạt Plugin (QUAN TRỌNG)
// Dòng này sẽ tự động thêm các hàm: authenticate(), serializeUser(), ... vào User model
// usernameField: "email" nghĩa là ta dùng email để đăng nhập thay vì username
userSchema.plugin(passportLocalMongoose, { usernameField: 'email' });

module.exports = mongoose.model('User', userSchema);
