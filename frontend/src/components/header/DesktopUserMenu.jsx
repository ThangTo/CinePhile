import React, { Suspense, lazy, useState } from "react";
import { Link } from "react-router-dom";
import { DESKTOP_MENU_ITEMS, DESKTOP_MENU_ITEM_CLASS } from "./constants";
import { useNotifications } from "contexts/NotificationContext";
import { isPremiumActive, getPremiumStatusText } from "utils/premiumUtils";
import PremiumAvatar from "components/common/PremiumAvatar";
import {
  getPrestigeContainerClassName,
  getUserPrestige,
  isUserPremiumDisplay,
} from "utils/userPrestige";

const NotificationPanel = lazy(() => import("components/notifications/NotificationPanel"));

const PrestigeBanner = ({ prestige }) => {
  if (!prestige?.isTopRank) {
    return null;
  }

  return (
    <div
      className={`mb-2 rounded-lg border p-2.5 ${prestige.topRankTier.surfaceClassName}`}
    >
      <div className={`flex items-center gap-2 text-sm font-bold ${prestige.topRankTier.textClassName}`}>
        <i className={`fa-solid ${prestige.topRankTier.icon}`} />
        <span>{prestige.topRankTier.title}</span>
      </div>
      <p className="mt-1 text-xs text-gray-300">Danh hiệu top {prestige.topRankTier.rank} hôm nay</p>
    </div>
  );
};

const PremiumBanner = ({ username, user }) => {
  const isPremium = isUserPremiumDisplay(user);

  if (isPremium) {
    const statusText = getPremiumStatusText(user) || "Premium đang hoạt động";
    return (
      <div className="bg-gradient-to-r from-primaryColor/20 to-hoverPrimaryColor/20 border border-primaryColor/30 rounded-lg p-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-primaryColor font-semibold text-sm flex items-center gap-1">
            <i className="fa-solid fa-crown" />
            {username} - Premium
          </span>
        </div>
        <p className="text-gray-300 text-xs">{statusText}</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-primaryColor/20 to-hoverPrimaryColor/20 border border-primaryColor/30 rounded-lg p-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-primaryColor font-semibold text-sm flex items-center gap-1">
          <i className="fa-solid fa-infinity" />
          {username}
        </span>
      </div>
      <p className="text-gray-300 text-xs mb-2">
        Nâng cấp tài khoản để có trải nghiệm đẳng cấp hơn.
      </p>
      <Link
        to="/premium"
        className="block w-full bg-gradient-to-r from-primaryColor to-hoverPrimaryColor hover:from-hoverPrimaryColor hover:to-primaryColor text-primaryColorButtonText font-semibold text-sm py-1.5 rounded-md transition-all text-center"
      >
        Nâng cấp ngay <i className="fa-solid fa-arrow-up" />
      </Link>
    </div>
  );
};

const UserStats = ({ coins }) => (
  <div className="flex items-center gap-4 mt-3 text-sm">
    <div className="flex items-center gap-2">
      <i className="fa-solid fa-coins text-yellow-400" />
      <span className="text-white font-semibold">{coins?.toLocaleString() || 0}</span>
      <span className="text-gray-400">coin</span>
    </div>
    <Link
      to="/recharge"
      className="ml-auto bg-white/5 hover:bg-white/10 text-gray-200 px-3 py-1 rounded-md text-xs transition-colors"
    >
      + Nạp
    </Link>
  </div>
);

const DesktopUserMenu = ({
  user,
  showUserMenu,
  onToggle,
  onLogout,
  menuRef,
  prestigeRank,
  prestige: providedPrestige,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const { unreadCount } = useNotifications();
  const bellButtonRef = React.useRef(null);
  const prestige = providedPrestige || getUserPrestige(user, prestigeRank);
  const isPremium = prestige.isPremium || isPremiumActive(user);
  const prestigeContainerClassName = getPrestigeContainerClassName(user, prestigeRank);

  return (
    <div className="hidden sm:hidden md:hidden lg:flex items-center gap-3 relative" ref={menuRef}>
      {/* Notification Bell */}
      <div className="relative">
        <button
          ref={bellButtonRef}
          onClick={() => {
            setShowNotifications(!showNotifications);
          }}
          className="relative p-2 text-gray-300 hover:text-white transition-colors"
        >
          <i className="fa-solid fa-bell text-xl" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
        {showNotifications && (
          <Suspense fallback={null}>
            <NotificationPanel
              onClose={() => setShowNotifications(false)}
              triggerRef={bellButtonRef}
            />
          </Suspense>
        )}
      </div>

      {/* User Avatar and Dropdown */}
      <div className="relative">
        <button
          onClick={onToggle}
          className={`relative flex items-center gap-2 rounded-full px-1 py-1 transition-opacity hover:opacity-90 ${
            prestige.hasPrestige ? `border border-white/10 ${prestigeContainerClassName}` : ""
          }`}
        >
          <PremiumAvatar
            src={user.avatar}
            alt={user.username}
            size="w-10 h-10"
            isPremium={isPremium}
            rank={prestigeRank}
          />
          {prestige.isTopRank && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold ${prestige.topRankTier.badgeClassName}`}
            >
              <i className={`fa-solid ${prestige.topRankTier.icon}`} />
              {prestige.topRankTier.shortTitle}
            </span>
          )}
          <i
            className={`fa-solid fa-chevron-down text-gray-300 text-sm transition-transform ${
              showUserMenu ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Dropdown Menu */}
        {showUserMenu && (
          <div
            className={`dropdown-menu absolute right-0 top-full mt-2 max-h-[calc(100dvh-var(--app-header-total-height)-var(--safe-bottom)-1rem)] w-72 overflow-x-hidden overflow-y-auto rounded-lg border border-white/10 bg-[#1e293b] shadow-xl z-50 ${prestigeContainerClassName}`}
          >
            {/* User Info Header */}
            <div className="p-4 border-b border-white/10 bg-gradient-to-br from-[#2d3b52] to-[#1e293b]">
              <Link
                to="/account?tabs=profile"
                onClick={onToggle}
                className="-m-2 mb-1 flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-white/5"
              >
                <PremiumAvatar
                  src={user.avatar}
                  alt={user.username}
                  size="w-12 h-12"
                  isPremium={isPremium}
                  rank={prestigeRank}
                />
                <div>
                  <div className={`font-semibold ${isPremium ? "text-primaryColor" : "text-white"}`}>
                    {user.username}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {prestige.isTopRank && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${prestige.topRankTier.badgeClassName}`}
                      >
                        <i className={`fa-solid ${prestige.topRankTier.icon}`} />
                        {prestige.topRankTier.shortTitle}
                      </span>
                    )}
                    {isPremium && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-primaryColor/40 bg-primaryColor/15 px-2 py-0.5 text-[10px] font-bold text-primaryColor">
                        <i className="fa-solid fa-crown" />
                        Premium
                      </span>
                    )}
                  </div>
                  <div className="text-gray-400 text-xs">{user.email}</div>
                </div>
              </Link>

              <PrestigeBanner prestige={prestige} />
              <PremiumBanner username={user.username} user={user} />
              <UserStats coins={user.coin} />
            </div>

            {/* Menu Items */}
            <div className="py-1">
              {/* Admin Panel Link (Only for admin) */}
              {user.role === "admin" && (
                <Link
                  to="/admin"
                  onClick={onToggle}
                  className="w-full flex items-center mt-[-4px] gap-3 px-4 py-2.5 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-y border-purple-500/20 text-purple-300 hover:bg-purple-500/20 transition-colors"
                >
                  <i className="fa-solid fa-shield-halved w-5 text-center" />
                  <span className="font-semibold">Admin Panel</span>
                  <i className="fa-solid fa-arrow-up-right-from-square ml-auto text-xs" />
                </Link>
              )}

              {DESKTOP_MENU_ITEMS.map((item) => (
                <Link
                  key={item.label}
                  to={`/account?tabs=${item.href}`}
                  className={
                    item.highlight
                      ? "flex items-center gap-3 px-4 py-2.5 text-primaryColor hover:bg-primaryColor/10 transition-colors"
                      : DESKTOP_MENU_ITEM_CLASS
                  }
                  onClick={onToggle}
                >
                  <i className={`fa-solid ${item.icon} w-5 text-center`} />
                  <span>{item.label}</span>
                </Link>
              ))}
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-500/10 transition-colors"
              >
                <i className="fa-solid fa-sign-out-alt w-5 text-center text-red-400" />
                <span className="text-red-400">Thoát</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DesktopUserMenu;
