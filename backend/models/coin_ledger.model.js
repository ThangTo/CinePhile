const mongoose = require('mongoose');

const coinLedgerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    delta: {
      type: Number,
      required: true,
    },
    balanceBefore: {
      type: Number,
      required: true,
      min: 0,
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    sourceType: {
      type: String,
      default: null,
      trim: true,
    },
    sourceId: {
      type: String,
      default: null,
      trim: true,
    },
    note: {
      type: String,
      default: '',
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

coinLedgerSchema.index({ userId: 1, createdAt: -1 });
coinLedgerSchema.index({ sourceType: 1, sourceId: 1 });

module.exports = mongoose.model('CoinLedger', coinLedgerSchema);
