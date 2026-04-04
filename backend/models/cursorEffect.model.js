const mongoose = require('mongoose');

const cursorEffectSchema = new mongoose.Schema(
  {
    effectId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    nameVi: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    descriptionVi: {
      type: String,
      default: '',
    },
    thumbnail: {
      type: String,
      default: '',
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    requiredRole: {
      type: String,
      enum: ['user', 'premium', 'admin'],
      default: 'user',
    },
    unlockType: {
      type: String,
      enum: ['shop', 'premium', 'event'],
      default: 'shop',
    },
    unlockCondition: {
      type: String,
      default: null,
    },
    unlockConditionVi: {
      type: String,
      default: null,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('CursorEffect', cursorEffectSchema);
