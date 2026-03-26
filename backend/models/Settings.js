const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  },
);

// Ensure only one document per key
SettingsSchema.index({ key: 1 }, { unique: true });

module.exports = mongoose.model('Settings', SettingsSchema);
