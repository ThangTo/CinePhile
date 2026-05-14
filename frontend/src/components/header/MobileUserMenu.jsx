import React from "react";
import { Link } from "react-router-dom";
import { USER_MENU_ITEMS, MOBILE_MENU_ITEM_CLASS } from "./constants";
import { isPremiumActive } from "utils/premiumUtils";
import PremiumAvatar from "components/common/PremiumAvatar";
import {
  getPrestigeContainerClassName,
  getUserPrestige,
  isUserPremiumDisplay,
} from "utils/userPrestige";

const MobilePrestigeBanner = ({ prestige }) => {
  if (!prestige?.isTopRank) {
    return null;
  }

  return (
    <div
      className={`mt-3 rounded-xl border px-3 py-2.5 ${prestige.topRankTier.surfaceClassName}`}
    >
      <div className={`flex items-center justify-between gap-3 ${prestige.topRankTier.textClassName}`}>
        <div className="flex min-w-0 items-center gap-2">
          <i className={`fa-solid ${prestige.topRankTier.icon} shrink-0`} />
          <span className="truncate text-sm font-bold">{prestige.topRankTier.title}</span>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${prestige.topRankTier.badgeClassName}`}
        >
          #{prestige.topRankTier.rank}
        </span>
      </div>
    </div>
  );
};

const UserInfoCard = ({ user, prestigeRank, prestige: providedPrestige }) => {
  const prestige = providedPrestige || getUserPrestige(user, prestigeRank);
  const isPremium = prestige.isPremium || isPremiumActive(user) || isUserPremiumDisplay(user);

  return (
    <div
      className={`mb-4 rounded-xl border border-white/10 bg-gradient-to-br from-[#4a5a7f] to-[#3b4d6f] p-4 ${getPrestigeContainerClassName(
        user,
        prestigeRank
      )}`}
    >
      <div className="flex items-center gap-3 mb-3">
        <PremiumAvatar
          src={user.avatar}
          alt={user.username}
          size="w-12 h-12"
          isPremium={isPremium}
          rank={prestigeRank}
        />
        <div className="flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="text-white font-semibold">{user.username}</span>
            {prestige.isTopRank && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${prestige.topRankTier.badgeClassName}`}
              >
                <i className={`fa-solid ${prestige.topRankTier.icon}`} />
                {prestige.topRankTier.shortTitle}
              </span>
            )}
            {isPremium ? (
              <i className="fa-solid fa-crown text-primaryColor text-sm" />
            ) : (
              <i className="fa-solid fa-infinity text-primaryColor text-sm" />
            )}
          </div>
          {prestige.isTopRank && (
            <p className="text-gray-300 text-xs">
              {prestige.topRankTier.title} trên bảng xếp hạng
            </p>
          )}
          <p className={`text-gray-300 text-xs ${prestige.isTopRank ? "hidden" : ""}`}>
            {isPremium
              ? "Bạn đang sử dụng tài khoản Premium"
              : "Nâng cấp tài khoản để có trải nghiệm đẳng cấp hơn."}
          </p>
        </div>
      </div>
      <MobilePrestigeBanner prestige={prestige} />
      {!isPremium && (
        <Link
          to="/premium"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primaryColor to-hoverPrimaryColor py-2 text-sm font-semibold text-primaryColorButtonText transition-all hover:from-hoverPrimaryColor hover:to-primaryColor"
        >
          Nâng cấp ngay
          <i className="fa-solid fa-arrow-up rotate-45" />
        </Link>
      )}
    </div>
  );
};

const UserStats = ({ coins }) => (
  <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/20">
    <div className="flex items-center gap-2">
      <i className="fa-solid fa-coins text-primaryColor text-sm" />
      <span className="text-white font-semibold">Số dư</span>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-white font-bold">{(coins || 0).toLocaleString()}</span>
      <span className="text-gray-400 text-sm">coin</span>
      <Link
        to="/recharge"
        className="ml-2 bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-full text-xs font-semibold transition-colors"
      >
        + Nạp
      </Link>
    </div>
  </div>
);

const MobileUserMenu = ({ user, onLogout, onOpenAuth, onClose, prestigeRank, prestige }) => {
  return (
    <>
      {user ? (
        <div className="mb-4">
          <UserInfoCard user={user} prestigeRank={prestigeRank} prestige={prestige} />
          <UserStats coins={user.coin} />

          {/* Admin Panel (Only for admin) */}
          {user.role === "admin" && (
            <Link
              to="/admin"
              onClick={onClose}
              className="mb-3 flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-600/30 to-pink-600/30 border border-purple-500/30 rounded-lg text-purple-300 font-semibold transition-all hover:from-purple-600/40 hover:to-pink-600/40"
            >
              <i className="fa-solid fa-shield-halved text-lg" />
              <span>Admin Panel</span>
              <i className="fa-solid fa-arrow-up-right-from-square ml-auto text-xs" />
            </Link>
          )}

          {/* Menu Items */}
          <div className="grid grid-cols-2 gap-2 mb-4 pb-4 border-b border-white/20">
            {USER_MENU_ITEMS.map((item) => (
              <Link
                key={item.label}
                to={`/account?tabs=${item.href}`}
                className={
                  item.highlight
                    ? "flex items-center border border-primaryColor/40 gap-3 px-3 py-2.5 text-primaryColor hover:bg-primaryColor/10 rounded-lg transition-colors"
                    : MOBILE_MENU_ITEM_CLASS
                }
                onClick={onClose}
              >
                <i className={`fa-solid ${item.icon} w-5 text-center`} />
                <span>{item.label}</span>
              </Link>
            ))}
            <button
              onClick={onLogout}
              className="flex items-center !border-red-500/40 gap-3 px-3 py-2.5 text-red-400 hover:!bg-red-500/10 rounded-lg transition-colors"
            >
              <i className="fa-solid fa-sign-out-alt w-5 text-center" />
              <span>Thoát</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-4 pb-4 border-b border-white/10">
          <button
            onClick={() => {
              onOpenAuth("login");
              onClose();
            }}
            className="w-full bg-white rounded-full p-2 flex items-center justify-center gap-3 transition-colors"
          >
            <i className="fa-solid fa-user text-[#3b4d6f] text-xl" />
            <span className="text-[#3b4d6f] font-semibold">Đăng nhập</span>
          </button>
        </div>
      )}
    </>
  );
};

export default MobileUserMenu;
