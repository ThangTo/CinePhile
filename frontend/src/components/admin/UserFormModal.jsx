import React, { useState, useEffect } from "react";

const UserFormModal = ({ isOpen, onClose, user = null, onSave }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "user",
    status: "active",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        role: user.role || "user",
        status: user.status || "active",
        password: "",
        confirmPassword: "",
      });
    } else {
      setFormData({
        name: "",
        email: "",
        role: "user",
        status: "active",
        password: "",
        confirmPassword: "",
      });
    }
    setErrors({});
  }, [user, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = "Họ tên không được để trống";
    }
    
    if (!formData.email.trim()) {
      newErrors.email = "Email không được để trống";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email không hợp lệ";
    }
    
    // Validate password chỉ khi tạo mới hoặc user nhập password
    if (!user || formData.password) {
      if (!formData.password) {
        newErrors.password = "Mật khẩu không được để trống";
      } else if (formData.password.length < 6) {
        newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự";
      }
      
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Mật khẩu xác nhận không khớp";
      }
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const userData = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        status: formData.status,
      };
      
      // Chỉ gửi password nếu có thay đổi
      if (formData.password) {
        userData.password = formData.password;
      }

      await onSave(userData);
      onClose();
    } catch (error) {
      console.error("Error saving user:", error);
      setErrors({ submit: "Có lỗi xảy ra khi lưu người dùng" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/10">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">
            {user ? "Chỉnh Sửa Người Dùng" : "Thêm Người Dùng Mới"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <i className="fa-solid fa-times text-2xl"></i>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Họ tên */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Họ Tên <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full bg-gray-800 border ${
                errors.name ? "border-red-500" : "border-white/10"
              } rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primaryColor`}
              placeholder="Nhập họ tên..."
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full bg-gray-800 border ${
                errors.email ? "border-red-500" : "border-white/10"
              } rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primaryColor`}
              placeholder="email@example.com"
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>

          {/* Role và Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Vai Trò
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primaryColor"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Trạng Thái
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primaryColor"
              >
                <option value="active">Hoạt động</option>
                <option value="inactive">Vô hiệu</option>
              </select>
            </div>
          </div>

          {/* Password */}
          <div className="border-t border-white/10 pt-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              {user ? "Đổi Mật Khẩu (Để trống nếu không đổi)" : "Mật Khẩu"}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Mật Khẩu {!user && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full bg-gray-800 border ${
                    errors.password ? "border-red-500" : "border-white/10"
                  } rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primaryColor`}
                  placeholder="••••••••"
                />
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Xác Nhận Mật Khẩu {!user && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full bg-gray-800 border ${
                    errors.confirmPassword ? "border-red-500" : "border-white/10"
                  } rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primaryColor`}
                  placeholder="••••••••"
                />
                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
                )}
              </div>
            </div>
          </div>

          {/* Error message */}
          {errors.submit && (
            <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 text-red-500">
              {errors.submit}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-primaryColor hover:bg-primaryColor/90 text-black font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  Đang lưu...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-save"></i>
                  {user ? "Cập Nhật" : "Thêm User"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormModal;

