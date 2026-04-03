const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderCode: {
    type: String,
    required: true,
    unique: true
  },
  amount: {
    type: Number,
    required: true
  },
  packageId: {
    type: String,
    default: null
  },
  coinAmount: {
    type: Number,
    required: true
  },
  bonusCoin: {
    type: Number,
    default: 0
  },
  provider: {
    type: String,
    enum: ['PAYOS'],
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED'],
    default: 'PENDING'
  },
  webhookData: {
    type: mongoose.Schema.Types.Mixed
  }
}, { timestamps: true });

// Create indexes for fast lookup and webhook mapping
transactionSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
