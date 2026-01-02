const User = require('../models/user.model');

/**
 * Middleware chỉ check role (không check auth)
 * Giả định req.user đã được set bởi authMiddleware trước đó
 *
 * BẢO MẬT: Re-query database để lấy role mới nhất, tránh giả mạo
 *
 * @param {string|string[]} allowedRoles - Role hoặc mảng roles được phép
 * @returns {Function} Express middleware function
 */
const checkRole = (allowedRoles) => {
  return async (req, res, next) => {
    // Kiểm tra xem có user không (nên đã có từ authMiddleware)
    if (!req.user) {
      return res.status(401).json({
        message: 'Chưa đăng nhập hoặc token không hợp lệ',
      });
    }

    // Bảo mật: Re-query database để lấy role mới nhất, tránh giả mạo
    // Lấy userId từ req.user (có thể là _id hoặc id)
    const userId = req.user._id || req.user.id;

    if (!userId) {
      return res.status(401).json({
        message: 'Thông tin user không hợp lệ',
      });
    }

    try {
      // Query database để lấy role mới nhất
      const user = await User.findById(userId).select('role');

      if (!user) {
        return res.status(401).json({
          message: 'User không tồn tại',
        });
      }

      // Bảo mật: Validate role chỉ có thể là các giá trị hợp lệ
      const validRoles = ['user', 'premium', 'admin'];
      if (!validRoles.includes(user.role)) {
        return res.status(403).json({
          message: 'Role không hợp lệ',
        });
      }

      // Chuyển đổi allowedRoles thành array nếu là string
      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

      // Kiểm tra role của user có trong danh sách được phép không
      if (roles.includes(user.role)) {
        // Cập nhật req.user.role với giá trị mới nhất từ database
        req.user.role = user.role;
        return next(); // Role hợp lệ -> Cho qua
      }

      // Role không hợp lệ -> Chặn lại
      return res.status(403).json({
        message: `Truy cập bị từ chối: Yêu cầu quyền ${roles.join(' hoặc ')}`,
      });
    } catch (error) {
      console.error('Error checking role:', error);
      return res.status(500).json({
        message: 'Lỗi kiểm tra quyền truy cập',
      });
    }
  };
};

/**
 * Middleware check admin role
 * Sử dụng checkRole với role 'admin'
 */
const isAdmin = checkRole('admin');

/**
 * Middleware check premium hoặc admin role
 */
const isPremiumOrAdmin = checkRole(['premium', 'admin']);

module.exports = {
  checkRole,
  isAdmin,
  isPremiumOrAdmin,
};
