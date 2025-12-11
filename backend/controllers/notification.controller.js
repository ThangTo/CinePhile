const notificationService = require('../services/notification.service');

/**
 * GET /notifications
 * Lấy danh sách thông báo (Bao gồm của User + Thông báo hệ thống)
 */
const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id; // Lấy ID từ token
    const { page = 1, limit = 100 } = req.query;
    const result = await notificationService.getNotifications(userId, { page, limit });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /notifications/unread
 * Lấy danh sách thông báo chưa đọc
 */
const getUnreadNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 100 } = req.query;

    const notifications = await notificationService.getUnreadNotifications(userId, { limit });
    res.status(200).json({ notifications });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /notifications/unread/count
 * Lấy số lượng thông báo chưa đọc
 */
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;

    const count = await notificationService.getUnreadCount(userId);

    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * PUT /notifications/:id/read
 * Đánh dấu một thông báo cụ thể là đã đọc
 */
const markAsReadById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const { notification, error } = await notificationService.markAsReadById(userId, id);
    if (error === 'NOT_FOUND') {
      return res.status(404).json({ message: 'Notification not found' });
    }
    if (error === 'FORBIDDEN') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    res.status(200).json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * PUT /notifications/read-all
 * Đánh dấu tất cả thông báo là đã đọc
 */
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    const result = await notificationService.markAllAsRead(userId);

    res.status(200).json({
      message: 'Đã đánh dấu tất cả đã đọc',
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * DELETE /notifications/:id
 * Xóa một thông báo
 */
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const { error } = await notificationService.deleteNotification(userId, id);
    if (error === 'NOT_FOUND') {
      return res.status(404).json({ message: 'Notification not found' });
    }
    if (error === 'FORBIDDEN') {
      return res.status(403).json({ message: 'Cannot delete system notifications' });
    }

    res.status(200).json({ message: 'Notification deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /notifications (API tạo thủ công nếu cần)
 */
const createNotificationApi = async (req, res) => {
  try {
    const noti = await notificationService.createNotification(req.body);
    res.status(201).json(noti);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- 3. EXPORTS ---

module.exports = {
  // Export cho Router (API)
  getNotifications,
  getUnreadNotifications,
  getUnreadCount,
  markAsReadById,
  markAllAsRead,
  deleteNotification,
  createNotificationApi,
  // Export cho Crawler/Service
  createNotification: notificationService.createNotification,
};
