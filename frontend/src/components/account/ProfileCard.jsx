import React, { useState } from "react";
import useToast from "../../hooks/useToast";
import ToastContainer from "../common/ToastContainer";
import { cardStyles, buttonStyles } from "./shared-styles";

const ProfileCard = ({ user, onUpdate }) => {
  const [isUploading, setIsUploading] = useState(false);
  const { toasts, removeToast, success, info } = useToast();

  const handleChangeAvatar = () => {
    // Create a file input dynamically
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        setIsUploading(true);
        // TODO: Upload to server
        // For now, use a temporary URL
        const reader = new FileReader();
        reader.onloadend = () => {
          // In production, this would be the URL from server
          // For demo, we'll keep the same avatar
          setIsUploading(false);
          info("Chức năng upload ảnh sẽ được tích hợp với backend!");
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleDeleteAvatar = () => {
    if (window.confirm("Bạn có chắc muốn xóa ảnh đại diện?")) {
      onUpdate({
        avatar:
          "https://www.dichvuinnhanh.com/wp-content/uploads/2024/12/chu-cun-khung-long-cute-a54f79c5.webp",
      });
      success("Đã xóa ảnh đại diện!");
    }
  };

  return (
    <div className={cardStyles.container}>
      <div className={cardStyles.header}>
        <h2 className={cardStyles.headerTitle}>Hồ sơ của tôi</h2>
      </div>
      <div className={cardStyles.body}>
        <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
          <div className="text-center">
            <img
              src={user.avatar || "https://i.pravatar.cc/150?img=68"}
              alt="Ảnh đại diện"
              className="w-[100px] h-[100px] rounded-full border-[3px] border-account-border mb-3 object-cover"
            />
            <div className="flex gap-2.5 justify-center">
              <button
                className={`${buttonStyles.base} ${buttonStyles.secondary}`}
                onClick={handleChangeAvatar}
                disabled={isUploading}
              >
                {isUploading ? "Đang tải..." : "Thay đổi ảnh"}
              </button>
              <button
                className={`${buttonStyles.base} ${buttonStyles.dangerOutline}`}
                onClick={handleDeleteAvatar}
                disabled={isUploading}
              >
                Xóa
              </button>
            </div>
          </div>
          <div>
            <h3 className="text-[22px] font-semibold m-0 mb-2">{user.username}</h3>
            <p className="text-base text-account-text-secondary m-0">{user.email}</p>
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default ProfileCard;
