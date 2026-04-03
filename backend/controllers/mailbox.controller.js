const Mailbox = require('../models/mailbox.model');

const MAILBOX_CATEGORIES = Mailbox.MAILBOX_CATEGORIES || [
  'bug',
  'suggestion',
  'feature_request',
  'chat',
  'other',
];

const CATEGORY_ORDER = MAILBOX_CATEGORIES.reduce((accumulator, category, index) => {
  accumulator[category] = index;
  return accumulator;
}, {});

const USER_POPULATE_FIELDS = 'username avatarUrl';
const ADMIN_USER_POPULATE_FIELDS = 'username email avatarUrl role createdAt';
const ADMIN_MESSAGE_POPULATE_FIELDS = 'username avatarUrl role';

function normalizeCategory(category, { allowEmpty = false } = {}) {
  if (category === undefined || category === null || category === '') {
    return allowEmpty ? null : 'chat';
  }

  if (!MAILBOX_CATEGORIES.includes(category)) {
    return null;
  }

  return category;
}

function sortMailboxes(mailboxes) {
  return [...mailboxes].sort((left, right) => {
    const leftOrder = CATEGORY_ORDER[left.category] ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = CATEGORY_ORDER[right.category] ?? Number.MAX_SAFE_INTEGER;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return new Date(right.updatedAt || 0) - new Date(left.updatedAt || 0);
  });
}

async function populateUserMailbox(mailbox) {
  return mailbox.populate('messages.senderId', USER_POPULATE_FIELDS);
}

async function populateAdminMailbox(mailboxQueryOrDoc) {
  return mailboxQueryOrDoc
    .populate('userId', ADMIN_USER_POPULATE_FIELDS)
    .populate('messages.senderId', ADMIN_MESSAGE_POPULATE_FIELDS);
}

async function appendMessageToMailboxThread({ userId, category, subject, content }) {
  const trimmedSubject = (subject || '').trim();
  let mailbox = await Mailbox.findOne({ userId, category });

  if (!mailbox) {
    mailbox = new Mailbox({
      userId,
      category,
      subject: trimmedSubject,
      messages: [
        {
          senderId: userId,
          content,
          direction: 'sent',
          isRead: false,
        },
      ],
      status: 'open',
    });
  } else {
    mailbox.messages.push({
      senderId: userId,
      content,
      direction: 'sent',
      isRead: false,
    });

    if (!mailbox.subject && trimmedSubject) {
      mailbox.subject = trimmedSubject;
    }

    if (mailbox.status === 'closed') {
      mailbox.status = 'open';
    }
  }

  await mailbox.save();
  await populateUserMailbox(mailbox);
  return mailbox;
}

const getMyMailbox = async (req, res) => {
  try {
    const userId = req.user._id;
    const mailboxes = await Mailbox.find({ userId })
      .populate('messages.senderId', USER_POPULATE_FIELDS)
      .sort({ updatedAt: -1 });

    res.status(200).json({ mailboxes: sortMailboxes(mailboxes) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const sendMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { content, category, subject } = req.body;
    const normalizedCategory = normalizeCategory(category);

    if (!normalizedCategory) {
      return res.status(400).json({ message: 'Chủ đề không hợp lệ' });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Nội dung tin nhắn không được trống' });
    }

    const trimmedContent = content.trim();

    if (trimmedContent.length > 5000) {
      return res.status(400).json({ message: 'Tin nhắn quá dài (tối đa 5000 ký tự)' });
    }

    let mailbox;

    try {
      mailbox = await appendMessageToMailboxThread({
        userId,
        category: normalizedCategory,
        subject,
        content: trimmedContent,
      });
    } catch (error) {
      if (error?.code === 11000 && error?.keyPattern?.userId) {
        await Mailbox.syncIndexes();
        mailbox = await appendMessageToMailboxThread({
          userId,
          category: normalizedCategory,
          subject,
          content: trimmedContent,
        });
      } else {
        throw error;
      }
    }

    res.status(201).json({ mailbox });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;
    const mailboxes = await Mailbox.find({ userId }).select('unreadAdminReplies');
    const count = mailboxes.reduce(
      (total, mailbox) => total + (mailbox.unreadAdminReplies || 0),
      0,
    );

    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markRepliesAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const normalizedCategory = normalizeCategory(req.body?.category, { allowEmpty: true });

    if (req.body?.category && !normalizedCategory) {
      return res.status(400).json({ message: 'Chủ đề không hợp lệ' });
    }

    const query = { userId };
    if (normalizedCategory) {
      query.category = normalizedCategory;
    }

    await Mailbox.updateMany(
      query,
      {
        $set: { 'messages.$[elem].isRead': true, unreadAdminReplies: 0 },
      },
      {
        arrayFilters: [{ 'elem.direction': 'reply', 'elem.isRead': false }],
      },
    );

    res.status(200).json({ message: 'Đã đánh dấu đã đọc' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const adminGetInbox = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, category } = req.query;
    const normalizedCategory = normalizeCategory(category, { allowEmpty: true });

    if (category && !normalizedCategory) {
      return res.status(400).json({ message: 'Chủ đề không hợp lệ' });
    }

    const query = {};
    if (status) query.status = status;
    if (normalizedCategory) query.category = normalizedCategory;

    const currentPage = Number.parseInt(page, 10) || 1;
    const pageSize = Number.parseInt(limit, 10) || 20;
    const skip = (currentPage - 1) * pageSize;

    const [mailboxes, total] = await Promise.all([
      Mailbox.find(query)
        .populate('userId', ADMIN_USER_POPULATE_FIELDS)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(pageSize),
      Mailbox.countDocuments(query),
    ]);

    res.status(200).json({
      mailboxes,
      pagination: {
        currentPage,
        totalPages: Math.ceil(total / pageSize),
        totalItems: total,
        limit: pageSize,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const adminGetMailbox = async (req, res) => {
  try {
    const { mailboxId } = req.params;
    const mailbox = await populateAdminMailbox(
      Mailbox.findById(mailboxId),
    );

    if (!mailbox) {
      return res.status(404).json({ message: 'Không tìm thấy hộp thư' });
    }

    await Mailbox.updateOne(
      { _id: mailboxId },
      { $set: { 'messages.$[elem].isRead': true } },
      { arrayFilters: [{ 'elem.direction': 'sent', 'elem.isRead': false }] },
    );

    res.status(200).json({ mailbox });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const adminReply = async (req, res) => {
  try {
    const { mailboxId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Nội dung phản hồi không được trống' });
    }

    const mailbox = await Mailbox.findById(mailboxId);
    if (!mailbox) {
      return res.status(404).json({ message: 'Không tìm thấy hộp thư' });
    }

    mailbox.messages.push({
      senderId: req.user._id,
      content: content.trim(),
      direction: 'reply',
      isRead: false,
    });
    mailbox.status = 'replied';
    mailbox.unreadAdminReplies += 1;

    await mailbox.save();
    await populateAdminMailbox(mailbox);

    res.status(201).json({ mailbox });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const adminUpdateStatus = async (req, res) => {
  try {
    const { mailboxId } = req.params;
    const { status } = req.body;

    if (!['open', 'replied', 'closed'].includes(status)) {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
    }

    const mailbox = await Mailbox.findByIdAndUpdate(
      mailboxId,
      { status },
      { new: true },
    );

    if (!mailbox) {
      return res.status(404).json({ message: 'Không tìm thấy hộp thư' });
    }

    await populateAdminMailbox(mailbox);

    res.status(200).json({ mailbox });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getMyMailbox,
  sendMessage,
  getUnreadCount,
  markRepliesAsRead,
  adminGetInbox,
  adminGetMailbox,
  adminReply,
  adminUpdateStatus,
};
