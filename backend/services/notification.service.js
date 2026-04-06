const NotificationModel = require('../models/notification.model');
const User = require('../models/user.model');

/**
 * Build query to fetch notifications for a user (only user's own notifications).
 */
const buildUserQuery = (userId) => ({
  userId: userId,
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
  const notification = await NotificationModel.findOne({ _id: id, userId: userId });
  if (!notification) {
    return { error: 'NOT_FOUND' };
  }
  const updated = await NotificationModel.findByIdAndUpdate(id, { isRead: true }, { new: true });
  return { notification: updated };
};

const markAllAsRead = async (userId) => {
  const result = await NotificationModel.updateMany(
    { userId: userId, isRead: false },
    { isRead: true },
  );
  return { modifiedCount: result.modifiedCount };
};

const deleteNotification = async (userId, id) => {
  const notification = await NotificationModel.findOne({ _id: id, userId: userId });
  if (!notification) return { error: 'NOT_FOUND' };
  await NotificationModel.findByIdAndDelete(id);
  return { success: true };
};

/**
 * Create notification(s)
 * - If userId is provided: create notification for that specific user
 * - If userId is null/undefined: create notification for ALL users (system notification)
 */
const createNotification = async (data) => {
  // If userId is provided, create notification for that specific user
  if (data.userId) {
    const newNoti = new NotificationModel({
      title: data.title,
      message: data.message,
      type: data.type,
      data: data.data || null,
      movieId: data.movieId || null,
      userId: data.userId,
      targetUrl: data.targetUrl || null,
      isRead: false,
      createdAt: new Date(),
    });
    return newNoti.save();
  }

  // If userId is null/undefined, create notification for ALL users (system notification)
  // Get all users and create a copy of the notification for each user
  try {
    const users = await User.find({}).select('_id').lean();
    
    if (!users || users.length === 0) {
      console.warn('No users found to send system notification');
      return { message: 'No users found', count: 0 };
    }

    // Create notification documents for all users
    const notifications = users.map((user) => ({
      title: data.title,
      message: data.message,
      type: data.type,
      data: data.data || null,
      movieId: data.movieId || null,
      userId: user._id,
      targetUrl: data.targetUrl || null,
      isRead: false,
      createdAt: new Date(),
    }));

    // Insert all notifications in bulk
    const result = await NotificationModel.insertMany(notifications);

    return {
      message: `System notification created for ${result.length} users`,
      count: result.length,
      notifications: result,
    };
  } catch (error) {
    console.error('Error creating system notification:', error);
    throw error;
  }
};

const create = async (userId, payload = {}) =>
  createNotification({
    userId,
    ...payload,
  });

module.exports = {
  getNotifications,
  getUnreadNotifications,
  getUnreadCount,
  markAsReadById,
  markAllAsRead,
  deleteNotification,
  create,
  createNotification,
};
