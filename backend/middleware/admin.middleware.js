const isAdmin = (req, res, next) => {
    // 1. Kiểm tra xem middleware trước đã tìm thấy user chưa
    if (!req.user) {
        return res.status(401).json({ message: 'Chưa đăng nhập hoặc token không hợp lệ' });
    }

    // 2. Kiểm tra Role (Dựa trên schema User của bạn: enum [user, premium, admin])
    if (req.user.role === 'admin') {
        return next(); // Là Admin -> Cho qua
    }

    // 3. Nếu không phải admin -> Chặn lại
    return res.status(403).json({ message: 'Truy cập bị từ chối: Yêu cầu quyền Admin' });
    
  
};
module.exports = { isAdmin };