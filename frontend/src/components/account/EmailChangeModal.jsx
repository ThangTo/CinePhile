import React, { useState } from "react";
import { modalStyles, buttonStyles, formStyles } from "./shared-styles";

const EmailChangeModal = ({ currentEmail, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    newEmail: "",
    password: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Integrate with backend
    onSuccess("Chức năng thay đổi email sẽ được tích hợp với backend!");
    onClose();
  };

  return (
    <div className={modalStyles.overlay} onClick={onClose}>
      <div className={modalStyles.content} onClick={(e) => e.stopPropagation()}>
        <div className={modalStyles.header}>
          <h3 className={modalStyles.headerTitle}>Thay đổi Email</h3>
          <button className={modalStyles.close} onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={modalStyles.body}>
            <div className={formStyles.group}>
              <label className={formStyles.label}>Email hiện tại</label>
              <input type="email" className={formStyles.control} value={currentEmail} disabled />
            </div>
            <div className={formStyles.group}>
              <label className={formStyles.label}>Email mới</label>
              <input
                type="email"
                className={formStyles.control}
                value={formData.newEmail}
                onChange={(e) => setFormData({ ...formData, newEmail: e.target.value })}
                required
              />
            </div>
            <div className={formStyles.group}>
              <label className={formStyles.label}>Mật khẩu hiện tại (để xác nhận)</label>
              <input
                type="password"
                className={formStyles.control}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
              Xác nhận
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmailChangeModal;
