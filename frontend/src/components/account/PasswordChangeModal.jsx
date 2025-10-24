import React, { useState } from "react";
import useToast from "../../hooks/useToast";
import { modalStyles, buttonStyles, formStyles } from "./shared-styles";

const PasswordChangeModal = ({ isGoogleLogin, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const { error } = useToast();

  const handleSubmit = (e) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      error("Mật khẩu mới không khớp!");
      return;
    }

    // TODO: Integrate with backend
    onSuccess(isGoogleLogin ? "Đặt mật khẩu thành công!" : "Thay đổi mật khẩu thành công!");
    onClose();
  };

  return (
    <div className={modalStyles.overlay} onClick={onClose}>
      <div className={modalStyles.content} onClick={(e) => e.stopPropagation()}>
        <div className={modalStyles.header}>
          <h3 className={modalStyles.headerTitle}>
            {isGoogleLogin ? "Đặt mật khẩu" : "Thay đổi mật khẩu"}
          </h3>
          <button className={modalStyles.close} onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={modalStyles.body}>
            {!isGoogleLogin && (
              <div className={formStyles.group}>
                <label className={formStyles.label}>Mật khẩu hiện tại</label>
                <input
                  type="password"
                  className={formStyles.control}
                  value={formData.currentPassword}
                  onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                  required
                />
              </div>
            )}
            <div className={formStyles.group}>
              <label className={formStyles.label}>Mật khẩu mới</label>
              <input
                type="password"
                className={formStyles.control}
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                minLength="6"
                required
              />
              <small className={formStyles.hint}>Tối thiểu 6 ký tự</small>
            </div>
            <div className={formStyles.group}>
              <label className={formStyles.label}>Xác nhận mật khẩu mới</label>
              <input
                type="password"
                className={formStyles.control}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
              />
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
            <button type="submit" className={`${buttonStyles.base} ${buttonStyles.primary}`}>
              {isGoogleLogin ? "Đặt mật khẩu" : "Đổi mật khẩu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordChangeModal;
