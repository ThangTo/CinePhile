import React, { useState } from "react";
import useToast from "hooks/useToast";
import ToastContainer from "components/common/ToastContainer";
import { cardStyles, buttonStyles } from "./shared-styles";
import { isPremiumActive } from "utils/premiumUtils";
import PremiumAvatar from "components/common/PremiumAvatar";
import { normalizeAvatarFile } from "utils/avatarUtils";
import { getPrestigeContainerClassName, getUserPrestige } from "utils/userPrestige";

const MAX_AVATAR_SIZE_MB = 5;

const ProfileCard = ({ user, onUpdate, prestigeRank }) => {
  const [isUploading, setIsUploading] = useState(false);
  const { toasts, removeToast, success, error } = useToast();
  const premiumActive = isPremiumActive(user);
  const prestige = getUserPrestige(user, prestigeRank);
  const isPremium = premiumActive || prestige.isPremium;

  const handleChangeAvatar = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (file.size > MAX_AVATAR_SIZE_MB * 1024 * 1024) {
        error(`Vui lòng chọn ảnh nhỏ hơn ${MAX_AVATAR_SIZE_MB}MB`);
        return;
      }

      setIsUploading(true);

      try {
        const normalizedAvatarFile = await normalizeAvatarFile(file);
        const formData = new FormData();
        formData.append("avatar", normalizedAvatarFile);

        await onUpdate(formData);
        success("Cập nhật ảnh đại diện thành công!");
      } catch (uploadError) {
        console.error("Error updating avatar:", uploadError);
        error("Không thể cập nhật ảnh đại diện. Vui lòng thử lại!");
      } finally {
        setIsUploading(false);
      }
    };

    input.click();
  };

  return (
    <div
      className={`${cardStyles.container} ${
        prestige.hasPrestige ? "relative shadow-[0_24px_70px_rgba(243,191,26,0.12)]" : ""
      } ${getPrestigeContainerClassName(user, prestigeRank)}`}
    >
      {prestige.isTopRank && (
        <div
          className={`flex items-center gap-2 border-b border-white/10 px-6 py-2.5 text-xs font-bold ${prestige.topRankTier.textClassName}`}
        >
          <i className={`fa-solid ${prestige.topRankTier.icon}`} />
          <span>{prestige.topRankTier.title}</span>
        </div>
      )}
      <div className={cardStyles.header}>
        <h2 className={cardStyles.headerTitle}>Hồ sơ của tôi</h2>
      </div>
      <div className={cardStyles.body}>
        <div className="flex flex-col items-center justify-center gap-6 text-center md:flex-row md:justify-start md:text-left">
          <div className="text-center">
            <PremiumAvatar
              src={user.avatar}
              alt={user.username || "Ảnh đại diện"}
              size="w-[100px] h-[100px]"
              isPremium={isPremium}
              rank={prestigeRank}
              className={`mb-3 ${prestige.hasPrestige ? "scale-105" : ""}`}
            />
            <div className="flex justify-center gap-2.5">
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
            <h3
              className={`m-0 mb-2 flex items-center justify-center gap-2 text-[22px] font-semibold md:justify-start ${
                isPremium ? "text-primaryColor" : "text-white"
              }`}
            >
              {user.username}
              {prestige.isTopRank && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${prestige.topRankTier.badgeClassName}`}
                >
                  <i className={`fa-solid ${prestige.topRankTier.icon} text-[9px]`} />
                  <span>{prestige.topRankTier.shortTitle}</span>
                </span>
              )}
              {isPremium && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primaryColor to-hoverPrimaryColor px-2 py-0.5 text-xs font-bold text-primaryColorButtonText shadow-sm">
                  <i className="fa-solid fa-crown text-[9px]" />
                  <span>Premium</span>
                </span>
              )}
            </h3>
            <p className="m-0 text-base text-account-text-secondary">{user.email}</p>
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default ProfileCard;
