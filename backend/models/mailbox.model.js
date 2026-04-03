const mongoose = require('mongoose');

const MAILBOX_CATEGORIES = ['bug', 'suggestion', 'feature_request', 'chat', 'other'];

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    direction: {
      type: String,
      enum: ['sent', 'reply'],
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true, timestamps: true },
);

const mailboxSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: {
      type: String,
      enum: MAILBOX_CATEGORIES,
      default: 'chat',
      required: true,
    },
    subject: {
      type: String,
      maxlength: 200,
      default: '',
    },
    status: {
      type: String,
      enum: ['open', 'replied', 'closed'],
      default: 'open',
    },
    messages: [messageSchema],
    unreadAdminReplies: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

mailboxSchema.index({ status: 1, updatedAt: -1 });
mailboxSchema.index({ userId: 1, category: 1 }, { unique: true });

const Mailbox = mongoose.model('Mailbox', mailboxSchema);

Mailbox.MAILBOX_CATEGORIES = MAILBOX_CATEGORIES;

module.exports = Mailbox;
