const NotificationModel = require('../models/notification.model');

/**
 * Build query to fetch notifications for a user (include system notifications).
 */
const buildUserQuery = (userId) => ({
  $or: [{ userId }, { userId: null }],
});

const getNotifications = async (userId, { page = 1, limit = 100 } = {}) => {
  const query = buildUserQuery(userId);
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  const [notifications, total, unreadCount] = await Promise.all([
    NotificationModel.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    NotificationModel.countDocuments(query),
    NotificationModel.countDocuments({ ...query, isRead: false }),
  ]);

  return {
    notifications,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
    unreadCount,
  };
};

const getUnreadNotifications = async (userId, { limit = 100 } = {}) => {
  const query = { ...buildUserQuery(userId), isRead: false };
  return NotificationModel.find(query).sort({ createdAt: -1 }).limit(parseInt(limit)).lean();
};

const getUnreadCount = async (userId) => {
  const query = { ...buildUserQuery(userId), isRead: false };
  return NotificationModel.countDocuments(query).lean();
};

const markAsReadById = async (userId, id) => {
  const notification = await NotificationModel.findById(id);
  if (!notification) {
    return { error: 'NOT_FOUND' };
  }
  if (notification.userId && notification.userId.toString() !== userId.toString()) {
    return { error: 'FORBIDDEN' };
  }
  const updated = await NotificationModel.findByIdAndUpdate(id, { isRead: true }, { new: true });
  return { notification: updated };
};

const markAllAsRead = async (userId) => {
  const result = await NotificationModel.updateMany({ userId, isRead: false }, { isRead: true });
  return { modifiedCount: result.modifiedCount };
};

const deleteNotification = async (userId, id) => {
  const notification = await NotificationModel.findById(id);
  if (!notification) return { error: 'NOT_FOUND' };
  if (notification.userId && notification.userId.toString() !== userId.toString()) {
    return { error: 'FORBIDDEN' };
  }
  await NotificationModel.findByIdAndDelete(id);
  return { success: true };
};

const createNotification = async (data) => {
  const newNoti = new NotificationModel({
    title: data.title,
    message: data.message,
    type: data.type,
    movieId: data.movieId || null,
    userId: data.userId || null,
    targetUrl: data.targetUrl || null,
    isRead: false,
    createdAt: new Date(),
  });
  return newNoti.save();
};

module.exports = {
  getNotifications,
  getUnreadNotifications,
  getUnreadCount,
  markAsReadById,
  markAllAsRead,
  deleteNotification,
  createNotification,
};
