import React from "react";
import { Link } from "react-router-dom";
import { DESKTOP_MENU_ITEMS, DESKTOP_MENU_ITEM_CLASS } from "./constants";

const PremiumBanner = ({ username }) => (
  <div className="bg-gradient-to-r from-primaryColor/20 to-hoverPrimaryColor/20 border border-primaryColor/30 rounded-lg p-2.5">
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-primaryColor font-semibold text-sm flex items-center gap-1">
        <i className="fa-solid fa-infinity" />
        {username}
      </span>
    </div>
    <p className="text-gray-300 text-xs mb-2">
      Nâng cấp tài khoản Cinx để có trải nghiệm đẳng cấp hơn.
    </p>
    <button className="w-full bg-gradient-to-r from-primaryColor to-hoverPrimaryColor hover:from-hoverPrimaryColor hover:to-primaryColor text-primaryColorButtonText font-semibold text-sm py-1.5 rounded-md transition-all">
      Nâng cấp ngay <i className="fa-solid fa-arrow-up" />
    </button>
  </div>
);

const DesktopUserMenu = ({ user, showUserMenu, onToggle, onLogout, menuRef }) => {
  return (
    <div className="hidden sm:hidden md:hidden lg:flex items-center gap-3 relative" ref={menuRef}>
      {/* Notification Bell */}
      <button className="relative p-2 text-gray-300 hover:text-white transition-colors">
        <i className="fa-solid fa-bell text-xl" />
      </button>

      {/* User Avatar and Dropdown */}
      <div className="relative">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <img
            src={user.avatar || "https://i.pravatar.cc/150?img=68"}
            alt={user.username}
            className="w-10 h-10 rounded-full object-cover border-2 border-white/20"
          />
          <i
            className={`fa-solid fa-chevron-down text-gray-300 text-sm transition-transform ${
              showUserMenu ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Dropdown Menu */}
        {showUserMenu && (
          <div className="dropdown-menu absolute right-0 top-full mt-2 w-64 bg-[#1e293b] rounded-lg shadow-xl border border-white/10 overflow-hidden z-50">
            {/* User Info Header */}
            <div className="p-4 border-b border-white/10 bg-gradient-to-br from-[#2d3b52] to-[#1e293b]">
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={user.avatar || "https://i.pravatar.cc/150?img=68"}
                  alt={user.username}
                  className="w-12 h-12 rounded-full object-cover border-2 border-cyan-400/50"
                />
                <div>
                  <div className="text-white font-semibold">{user.username}</div>
                  <div className="text-gray-400 text-xs">{user.email}</div>
                </div>
              </div>

              <PremiumBanner username={user.username} />
            </div>

            {/* Menu Items */}
            <div className="py-1">
              {/* Admin Panel Link (Only for admin) */}
              {user.role === "admin" && (
                <Link
                  to="/admin"
                  onClick={onToggle}
                  className="w-full flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-y border-purple-500/20 text-purple-300 hover:bg-purple-500/20 transition-colors"
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
                  className={DESKTOP_MENU_ITEM_CLASS}
                  onClick={onToggle}
                >
                  <i className={`fa-solid ${item.icon} w-5 text-center`} />
                  <span>{item.label}</span>
                </Link>
              ))}
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <i className="fa-solid fa-sign-out-alt w-5 text-center" />
                <span>Thoát</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DesktopUserMenu;
