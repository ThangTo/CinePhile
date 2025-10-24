import React, { useState } from "react";
import useToast from "../../hooks/useToast";
import ToastContainer from "../common/ToastContainer";
import { cardStyles, buttonStyles, formStyles } from "./shared-styles";

const AccountInfoCard = ({ user, onUpdate }) => {
  const [formData, setFormData] = useState({
    username: user.username || "",
    gender: user.gender || "other",
  });
  const [isChanged, setIsChanged] = useState(false);
  const { toasts, removeToast, success } = useToast();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setIsChanged(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate(formData);
    setIsChanged(false);
    success("Cập nhật thông tin thành công!");
  };

  return (
    <div className={cardStyles.container}>
      <div className={cardStyles.header}>
        <h2 className={cardStyles.headerTitle}>Thông tin tài khoản</h2>
      </div>
      <div className={cardStyles.body}>
        <form onSubmit={handleSubmit}>
          <div className={formStyles.group}>
            <label htmlFor="username" className={formStyles.label}>
              Tên hiển thị
            </label>
            <input
              type="text"
              id="username"
              name="username"
              className={formStyles.control}
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>
          <div className={formStyles.group}>
            <label className={formStyles.label}>Giới tính</label>
            <div className="flex gap-5">
              <label className="flex items-center cursor-pointer text-account-text-primary font-normal">
                <input
                  type="radio"
                  name="gender"
                  value="male"
                  checked={formData.gender === "male"}
                  onChange={handleChange}
                  className="mr-2 accent-account-accent cursor-pointer"
                />
                Nam
              </label>
              <label className="flex items-center cursor-pointer text-account-text-primary font-normal">
                <input
                  type="radio"
                  name="gender"
                  value="female"
                  checked={formData.gender === "female"}
                  onChange={handleChange}
                  className="mr-2 accent-account-accent cursor-pointer"
                />
                Nữ
              </label>
              <label className="flex items-center cursor-pointer text-account-text-primary font-normal">
                <input
                  type="radio"
                  name="gender"
                  value="other"
                  checked={formData.gender === "other"}
                  onChange={handleChange}
                  className="mr-2 accent-account-accent cursor-pointer"
                />
                Không xác định
              </label>
            </div>
          </div>
        </form>
      </div>
      <div className={cardStyles.footer}>
        <button
          type="submit"
          className={`${buttonStyles.base} ${buttonStyles.primary}`}
          onClick={handleSubmit}
          disabled={!isChanged}
        >
          Cập nhật thông tin
        </button>
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default AccountInfoCard;
