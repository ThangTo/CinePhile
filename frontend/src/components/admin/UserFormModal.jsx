import React, { useState, useEffect } from "react";
import {
  FiX,
  FiSave,
  FiUser,
  FiMail,
  FiShield,
  FiLock,
  FiAlertCircle,
  FiCheck,
  FiUsers,
} from "react-icons/fi";

// --- UI COMPONENTS ---

const FormField = ({ label, name, type = "text", error, icon: Icon, children, ...props }) => (
  <div className="space-y-1.5 w-full">
    <label className="text-xs font-semibold uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
      {Icon && <Icon className="text-primaryColor" />} {label}
    </label>
    {children ? (
      children
    ) : (
      <input
        type={type}
        name={name}
        className={`w-full bg-black/20 border ${
          error
            ? "border-red-500/50 focus:border-red-500"
            : "border-white/5 focus:border-primaryColor"
        } rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primaryColor/50 transition-all shadow-inner hover:bg-black/30`}
        {...props}
      />
    )}
    {error && (
      <p className="text-red-400 text-xs flex items-center gap-1">
        <FiAlertCircle /> {error}
      </p>
    )}
  </div>
);

// Component: Selector dạng Chip/Button
const ChipSelector = ({ label, icon: Icon, options, value, onChange, name }) => (
  <div className="space-y-2">
    <label className="text-xs font-semibold uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
      {Icon && <Icon className="text-primaryColor" />} {label}
    </label>
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange({ target: { name, value: opt.value } })}
          className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 ${
            value === opt.value
              ? "bg-primaryColor text-black border-primaryColor shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]"
              : "bg-black/20 text-gray-400 border-white/5 hover:border-white/20 hover:text-white"
          }`}
        >
          {value === opt.value && <FiCheck size={12} />}
          {opt.label}
        </button>
      ))}
    </div>
  </div>
);

const UserFormModal = ({ isOpen, onClose, user = null, onSave }) => {
  const [formData, setFormData] = useState({
    username: "",
    name: "",
    email: "",
    role: "user",
    password: "",
    confirmPassword: "",
    avatar: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || "",
        name: user.name || "",
        email: user.email || "",
        role: user.role || "user",
        password: "",
        confirmPassword: "",
        avatar: user.avatar || "",
      });
    } else {
      setFormData({
        username: "",
        name: "",
        email: "",
        role: "user",
        password: "",
        confirmPassword: "",
        avatar: "",
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

    if (!formData.username.trim()) {
      newErrors.username = "Tên đăng nhập không được để trống";
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
        username: formData.username,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        avatar: formData.avatar || "",
      };

      // Chỉ gửi password nếu có thay đổi
      if (formData.password) {
        userData.password = formData.password;
      }

      await onSave(userData);
      onClose();
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || error?.message || "Có lỗi xảy ra khi lưu người dùng";
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-4xl h-[90vh] bg-black/50 rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/10 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                user ? "bg-blue-500/20 text-blue-400" : "bg-primaryColor/20 text-primaryColor"
              }`}
            >
              {user ? <FiUser size={24} /> : <FiUsers size={24} />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {user ? "Cập Nhật Thông Tin Người Dùng" : "Thêm Người Dùng Mới"}
              </h2>
              <p className="text-xs text-gray-400">Điền đầy đủ thông tin bên dưới.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <form id="userForm" onSubmit={handleSubmit} className="space-y-8">
            {errors.submit && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 flex items-center gap-3 text-red-200">
                <FiAlertCircle size={20} /> <span>{errors.submit}</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6">
              {/* LEFT COLUMN */}
              <div className="flex flex-col gap-5">
                {/* 1. Core Info */}
                <div className="bg-black/10 rounded-xl p-5 border border-white/5 space-y-4">
                  <h3 className="text-white font-bold flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                    <FiUser className="text-primaryColor" /> Thông Tin Cơ Bản
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      label="Tên Đăng Nhập *"
                      name="username"
                      icon={FiUser}
                      value={formData.username}
                      onChange={handleChange}
                      error={errors.username}
                      placeholder="Nhập tên đăng nhập..."
                    />
                    <FormField
                      label="Họ Tên"
                      name="name"
                      icon={FiUser}
                      value={formData.name}
                      onChange={handleChange}
                      error={errors.name}
                      placeholder="Nhập họ tên..."
                    />
                    <FormField
                      label="Email *"
                      name="email"
                      type="email"
                      icon={FiMail}
                      value={formData.email}
                      onChange={handleChange}
                      error={errors.email}
                      placeholder="email@example.com"
                    />
                    <FormField
                      label="Avatar URL"
                      name="avatar"
                      icon={FiUser}
                      value={formData.avatar}
                      onChange={handleChange}
                      placeholder="https://..."
                    />
                  </div>
                </div>

                {/* 2. Password Section */}
                <div className="bg-black/10 rounded-xl p-5 border border-white/5 space-y-4">
                  <h3 className="text-white font-bold flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                    <FiLock className="text-primaryColor" />{" "}
                    {user ? "Đổi Mật Khẩu (Để trống nếu không đổi)" : "Mật Khẩu"}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      label={user ? "Mật Khẩu Mới" : "Mật Khẩu *"}
                      name="password"
                      type="password"
                      icon={FiLock}
                      value={formData.password}
                      onChange={handleChange}
                      error={errors.password}
                      placeholder="••••••••"
                    />
                    <FormField
                      label={user ? "Xác Nhận Mật Khẩu Mới" : "Xác Nhận Mật Khẩu *"}
                      name="confirmPassword"
                      type="password"
                      icon={FiLock}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      error={errors.confirmPassword}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-5">
                  <div className="bg-black/10 rounded-xl p-5 border border-white/5 h-full flex flex-col">
                    <h3 className="text-white font-bold flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                      <FiShield className="text-primaryColor" /> Vai Trò & Quyền
                    </h3>
                    <div className="space-y-6 flex-1">
                      <ChipSelector
                        label="Vai Trò"
                        icon={FiShield}
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        options={[
                          { value: "user", label: "User" },
                          { value: "premium", label: "Premium" },
                          { value: "admin", label: "Admin" },
                        ]}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-black/20 border-t border-white/10 flex justify-end gap-3 z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 rounded-xl text-gray-400 font-medium hover:bg-white/5 hover:text-white transition-all"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            form="userForm"
            disabled={isSubmitting}
            className="px-8 py-3 rounded-xl bg-primaryColor text-black font-bold shadow-lg shadow-primaryColor/20 hover:shadow-primaryColor/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              "Đang xử lý..."
            ) : (
              <>
                <FiSave size={20} /> <span>{user ? "Lưu Thay Đổi" : "Tạo Người Dùng Mới"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserFormModal;
