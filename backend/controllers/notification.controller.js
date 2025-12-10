const NotificationModel = require('../models/notification.model');

// --- 1. CÁC HÀM XỬ LÝ API (Req, Res) ---

/**
 * GET /notifications
 * Lấy danh sách thông báo (Bao gồm của User + Thông báo hệ thống)
 */
const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id; // Lấy ID từ token
    const { page = 1, limit = 10 } = req.query;

    // QUERY: Lấy thông báo của User hiện tại HOẶC thông báo chung (System)
    const query = {
      $or: [
        { userId: userId }, // Thông báo riêng
        { userId: null }    // Thông báo từ Crawler/System
      ]
    };

    const notifications = await NotificationModel.find(query)
      .sort({ createdAt: -1 }) // Mới nhất lên đầu
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
      
    // Đếm số lượng chưa đọc (Lưu ý: Với thông báo chung, logic isRead sẽ dùng chung cho tất cả - hạn chế của thiết kế đơn giản)
    const unreadCount = await NotificationModel.countDocuments({ 
        ...query, 
        isRead: false 
    });

    res.status(200).json({ 
        data: notifications, 
        unreadCount 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /notifications/mark-read
 * Đánh dấu đã đọc
 */
const markAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const { notificationId } = req.body;

    if (notificationId) {
        // Đánh dấu 1 cái cụ thể
        await NotificationModel.findByIdAndUpdate(
            notificationId, 
            { isRead: true }
        );
    } else {
        // Đánh dấu tất cả (Chỉ áp dụng cho thông báo riêng của User để tránh ảnh hưởng User khác với thông báo System)
        await NotificationModel.updateMany(
            { userId: userId, isRead: false }, 
            { isRead: true }
        );
    }

    res.status(200).json({ message: 'Đã đánh dấu đã đọc' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /notifications (API tạo thủ công nếu cần)
 */
const createNotificationApi = async (req, res) => {
  try {
    // Gọi hàm logic nội bộ
    const noti = await createNotificationRaw(req.body);
    res.status(201).json(noti);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// --- 2. HÀM LOGIC NỘI BỘ (Dùng cho Crawler & Services khác) ---

/**
 * Hàm tạo thông báo (Nhận Object data, KHÔNG nhận req, res)
 * @param {Object} data 
 */
const createNotificationRaw = async (data) => {
  try {
    const newNoti = new NotificationModel({
      title: data.title,
      message: data.message,
      type: data.type,
      movieId: data.movieId || null, // Link tới phim (nếu có)
      
      // Quan trọng: Nếu không truyền userId thì hiểu là System/Crawler Notification
      userId: data.userId || null, 

      isRead: false,
      createdAt: new Date()
    });
    return await newNoti.save();
  } catch (error) {
    throw error; // Ném lỗi để bên gọi (Crawler) catch được
  }
};

// --- 3. EXPORTS ---

module.exports = {
  // Export cho Router (API)
  getNotifications,
  markAsRead,
  createNotificationApi,

  // Export cho Crawler/Service (Quan trọng: Đặt tên key là createNotification để khớp với require bên crawler)
  createNotification: createNotificationRaw 
};