import React, { useState } from "react";
import { modalStyles, buttonStyles, formStyles } from "./shared-styles";
import authService from "services/auth.service";

const PasswordChangeModal = ({ onClose, onSuccess, onError }) => {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  // Validation functions
  const validateCurrentPassword = (value) => {
    if (!value.trim()) {
      return "Vui lòng nhập mật khẩu hiện tại";
    }
    return "";
  };

  const validateNewPassword = (value, currentPassword) => {
    if (!value.trim()) {
      return "Vui lòng nhập mật khẩu mới";
    }
    if (value.length < 6) {
      return "Mật khẩu phải có ít nhất 6 ký tự";
    }
    if (value === currentPassword) {
      return "Mật khẩu mới phải khác mật khẩu hiện tại";
    }
    return "";
  };

  const validateConfirmPassword = (value, newPassword) => {
    if (!value.trim()) {
      return "Vui lòng xác nhận mật khẩu mới";
    }
    if (value !== newPassword) {
      return "Mật khẩu xác nhận không khớp";
    }
    return "";
  };

  // Validate entire form
  const validateForm = () => {
    const newErrors = {
      currentPassword: validateCurrentPassword(formData.currentPassword),
      newPassword: validateNewPassword(formData.newPassword, formData.currentPassword),
      confirmPassword: validateConfirmPassword(formData.confirmPassword, formData.newPassword),
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some((err) => err !== "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all fields
    if (!validateForm()) {
      if (onError) {
        onError("Vui lòng kiểm tra lại thông tin đã nhập");
      }
      return;
    }

    try {
      setIsLoading(true);
      await authService.changePassword({
        oldPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      onSuccess("Thay đổi mật khẩu thành công!");
      onClose();
    } catch (err) {
      const errorMessage =
        err?.message || err?.response?.data?.message || "Có lỗi xảy ra. Vui lòng thử lại.";
      console.error("Change password error:", err);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={modalStyles.overlay} onClick={onClose}>
      <div className={modalStyles.content} onClick={(e) => e.stopPropagation()}>
        <div className={modalStyles.header}>
          <h3 className={modalStyles.headerTitle}>Thay đổi mật khẩu</h3>
          <button className={modalStyles.close} onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={modalStyles.body}>
            <div className={formStyles.group}>
              <label className={formStyles.label}>Mật khẩu hiện tại</label>
              <div className="relative">
                <input
                  type={showPassword.currentPassword ? "text" : "password"}
                  className={`${formStyles.control} pr-10 ${
                    errors.currentPassword ? "border-red-500" : ""
                  }`}
                  value={formData.currentPassword}
                  onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-account-text-secondary hover:text-account-text-primary transition-colors"
                  onClick={() =>
                    setShowPassword({
                      ...showPassword,
                      currentPassword: !showPassword.currentPassword,
                    })
                  }
                >
                  <i
                    className={`fas ${showPassword.currentPassword ? "fa-eye-slash" : "fa-eye"}`}
                  ></i>
                </button>
              </div>
              {errors.currentPassword && (
                <small className={formStyles.error}>{errors.currentPassword}</small>
              )}
            </div>
            <div className={formStyles.group}>
              <label className={formStyles.label}>Mật khẩu mới</label>
              <div className="relative">
                <input
                  type={showPassword.newPassword ? "text" : "password"}
                  className={`${formStyles.control} pr-10 ${
                    errors.newPassword ? "border-red-500" : ""
                  }`}
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-account-text-secondary hover:text-account-text-primary transition-colors"
                  onClick={() =>
                    setShowPassword({
                      ...showPassword,
                      newPassword: !showPassword.newPassword,
                    })
                  }
                >
                  <i className={`fas ${showPassword.newPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                </button>
              </div>
              {errors.newPassword ? (
                <small className={formStyles.error}>{errors.newPassword}</small>
              ) : (
                <small className={formStyles.hint}>Tối thiểu 6 ký tự</small>
              )}
            </div>
            <div className={formStyles.group}>
              <label className={formStyles.label}>Xác nhận mật khẩu mới</label>
              <div className="relative">
                <input
                  type={showPassword.confirmPassword ? "text" : "password"}
                  className={`${formStyles.control} pr-10 ${
                    errors.confirmPassword ? "border-red-500" : ""
                  }`}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-account-text-secondary hover:text-account-text-primary transition-colors"
                  onClick={() =>
                    setShowPassword({
                      ...showPassword,
                      confirmPassword: !showPassword.confirmPassword,
                    })
                  }
                >
                  <i
                    className={`fas ${showPassword.confirmPassword ? "fa-eye-slash" : "fa-eye"}`}
                  ></i>
                </button>
              </div>
              {errors.confirmPassword && (
                <small className={formStyles.error}>{errors.confirmPassword}</small>
              )}
            </div>
          </div>
          <div className={modalStyles.footer}>
            <button
              type="button"
              className={`${buttonStyles.base} ${buttonStyles.secondary}`}
              onClick={onClose}
            >
              Hủy
            </button>

            {isLoading ? (
              <button
                type="button"
                className={`${buttonStyles.base} ${buttonStyles.primary}`}
                disabled
              >
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Đang thay đổi mật khẩu...
              </button>
            ) : (
              <button
                type="submit"
                className={`${buttonStyles.base} ${buttonStyles.primary}`}
                disabled={isLoading}
              >
                Đổi mật khẩu
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordChangeModal;
