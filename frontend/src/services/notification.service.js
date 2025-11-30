import apiRequest from "./utils/apiRequest";

/**
 * Notification Service
 * API calls for notifications
 */

const notificationService = {
  /**
   * Get all notifications for current user
   * @param {Object} params - { page?, limit?, filter? } - filter: 'all' | 'unread' | 'read'
   * @returns {Promise<Object>} { notifications: [], total, page, limit, totalPages }
   */
  getNotifications: (params = {}) =>
    apiRequest(`/notifications`, {
      params,
      requiresAuth: true,
    }),

  /**
   * Get unread notifications only
   * @param {Object} params - { limit? }
   * @returns {Promise<Object>} { notifications: [] }
   */
  getUnreadNotifications: (params = {}) =>
    apiRequest(`/notifications/unread`, {
      params,
      requiresAuth: true,
    }),

  /**
   * Get unread notifications count
   * @returns {Promise<Object>} { count: number }
   */
  getUnreadCount: () =>
    apiRequest(`/notifications/unread/count`, {
      requiresAuth: true,
    }),

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object>} Updated notification
   */
  markAsRead: (notificationId) =>
    apiRequest(`/notifications/${notificationId}/read`, {
      method: "PUT",
      requiresAuth: true,
    }),

  /**
   * Mark all notifications as read
   * @returns {Promise<Object>} { message, modifiedCount }
   */
  markAllAsRead: () =>
    apiRequest(`/notifications/read-all`, {
      method: "PUT",
      requiresAuth: true,
    }),

  /**
   * Delete notification
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object>} { message }
   */
  deleteNotification: (notificationId) =>
    apiRequest(`/notifications/${notificationId}`, {
      method: "DELETE",
      requiresAuth: true,
    }),
};

export default notificationService;
