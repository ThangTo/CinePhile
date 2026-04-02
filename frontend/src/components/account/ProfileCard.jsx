import React, { useState } from "react";
import useToast from "hooks/useToast";
import ToastContainer from "components/common/ToastContainer";
import { cardStyles, buttonStyles } from "./shared-styles";
import { isPremiumActive } from "utils/premiumUtils";
import PremiumAvatar from "components/common/PremiumAvatar";

const MAX_AVATAR_SIZE_MB = 5;

const ProfileCard = ({ user, onUpdate }) => {
  const [isUploading, setIsUploading] = useState(false);
  const { toasts, removeToast, success, error } = useToast();

  const handleChangeAvatar = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > MAX_AVATAR_SIZE_MB * 1024 * 1024) {
        error(`Vui lòng chọn ảnh nhỏ hơn ${MAX_AVATAR_SIZE_MB}MB`);
        return;
      }

      setIsUploading(true);

      try {
        const reader = new FileReader();

        reader.onloadend = async () => {
          try {
            const avatarDataUrl = reader.result;

            // Gửi lên server thông qua onUpdate
            await onUpdate({ avatar: avatarDataUrl });
            success("Cập nhật ảnh đại diện thành công!");
          } catch (err) {
            console.error("Error updating avatar:", err);
            error("Không thể cập nhật ảnh đại diện. Vui lòng thử lại!");
          } finally {
            setIsUploading(false);
          }
        };

        reader.readAsDataURL(file);
      } catch (err) {
        console.error("Error reading avatar file:", err);
        error("Không thể đọc file ảnh. Vui lòng thử lại!");
        setIsUploading(false);
      }
    };

    input.click();
  };

  return (
    <div className={cardStyles.container}>
      <div className={cardStyles.header}>
        <h2 className={cardStyles.headerTitle}>Hồ sơ của tôi</h2>
      </div>
      <div className={cardStyles.body}>
        <div className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-6 text-center md:text-left">
          <div className="text-center">
            <PremiumAvatar
              src={user.avatar}
              alt="Ảnh đại diện"
              size="w-[100px] h-[100px]"
              isPremium={isPremiumActive(user)}
              className={`mb-3 ${isPremiumActive(user) ? "scale-105" : ""}`}
            />
            <div className="flex gap-2.5 justify-center">
              <button
                className={`${buttonStyles.base} ${buttonStyles.secondary}`}
                onClick={handleChangeAvatar}
                disabled={isUploading}
              >
                {isUploading ? "Đang tải..." : "Thay đổi ảnh"}
              </button>
            </div>
          </div>
          <div className="pb-6">
            <h3 className={`text-[22px] font-semibold m-0 mb-2 flex items-center justify-center md:justify-start gap-2 ${
              isPremiumActive(user) ? "text-primaryColor" : "text-white"
            }`}>
              {user.username}
              {isPremiumActive(user) && (
                <span className="inline-flex items-center gap-1 bg-gradient-to-r from-primaryColor to-hoverPrimaryColor text-primaryColorButtonText px-2 py-0.5 rounded-full text-xs font-bold shadow-sm">
                  <i className="fa-solid fa-crown text-[9px]" />
                  <span>Premium</span>
                </span>
              )}
            </h3>
            <p className="text-base text-account-text-secondary m-0">{user.email}</p>
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default ProfileCard;
