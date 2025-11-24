const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email'],
    },
    avatar: {
      type: String,
      default: 'https://i.pravatar.cc/150?img=default',
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'premium'],
      default: 'user',
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      default: 'other',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Plugin configuration
userSchema.plugin(passportLocalMongoose, {
  saltlen: 16,
  keylen: 32,
  usernameCaseInsensitive: true,
  usernameField: 'email',
  usernameLowerCase: true,
});

// Remove password from JSON output (passport-local-mongoose adds salt and hash)
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.hash;
  delete userObject.salt;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);
