import React from "react";
import { Link, useLocation } from "react-router-dom";
import { isPremiumActive, getPremiumStatusText } from "utils/premiumUtils";

const DEFAULT_TAB = "profile";

const navItems = [
  {
    tab: "favorites",
    icon: "fa-heart",
    label: "Yêu thích",
  },
  {
    tab: "watchlist",
    icon: "fa-list",
    label: "Danh sách",
  },
  {
    tab: "continue-watching",
    icon: "fa-play",
    label: "Xem tiếp",
  },
  {
    tab: "notifications",
    icon: "fa-bell",
    label: "Thông báo",
  },
  {
    tab: "profile",
    icon: "fa-user",
    label: "Tài khoản",
  },
];

const AccountSidebar = ({ user, onLogout }) => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const queryTab = searchParams.get("tabs");
  const activeTab = queryTab || DEFAULT_TAB;

  return (
    <nav className="w-[90%] md:w-[250px] mt-[50px] md:ml-[20px] mx-auto rounded-2xl bg-account-bg-secondary min-h-auto md:min-h-screen p-6 flex flex-col border-r-0 md:border-r border-b md:border-b-0 border-account-border md:sticky md:top-0 md:h-screen">
      <div className="flex-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.tab;
          return (
            <Link
              key={item.tab}
              to={`/account?tabs=${item.tab}`}
              className={`flex items-center px-4 py-3 rounded-lg mb-2 font-medium no-underline transition-all ${
                isActive
                  ? "bg-account-bg-tertiary text-account-accent"
                  : "text-account-text-secondary hover:bg-account-bg-tertiary hover:text-account-text-primary"
              }`}
            >
              <i className={`fas ${item.icon} w-5 text-center mr-3`}></i>
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Premium Link */}
      <Link
        to="/premium"
        className={`flex flex-col px-4 py-3 rounded-lg mb-2 font-medium no-underline transition-all ${
          isPremiumActive(user)
            ? "bg-gradient-to-r from-primaryColor to-hoverPrimaryColor text-black"
            : "bg-primaryColor/20 text-primaryColor hover:bg-primaryColor/30 border border-primaryColor/50"
        }`}
      >
        <div className="flex items-center">
          <i
            className={`fas ${isPremiumActive(user) ? "fa-crown" : "fa-star"} w-5 text-center`}
          ></i>
          <span className={`ml-1 ${isPremiumActive(user) ? "font-bold" : ""}`}>
            {isPremiumActive(user) ? "Premium" : "Nâng Cấp Premium"}
          </span>
        </div>
        {isPremiumActive(user) && (
          <span className="text-xs mt-1 opacity-90">{getPremiumStatusText(user)}</span>
        )}
      </Link>

      <div className="mt-auto border-t border-account-border pt-5">
        <div className="md:flex items-center mb-4 hidden">
          <img
            src={user.avatar || "https://i.pravatar.cc/150?img=68"}
            alt={user.username}
            className="w-10 h-10 rounded-full mr-3 object-cover"
          />
          <div className="overflow-hidden">
            <div className="font-semibold text-account-text-primary whitespace-nowrap overflow-hidden text-ellipsis">
              {user.username}
            </div>
            <div className="text-xs text-account-text-secondary whitespace-nowrap overflow-hidden text-ellipsis">
              {user.email.length > 15 ? user.email.substring(0, 15) + "..." : user.email}
            </div>
            {user.coin !== undefined && (
              <div className="text-xs text-primaryColor mt-1 flex items-center gap-1">
                <i className="fa-solid fa-coins"></i>
                {user.coin.toLocaleString()} coin
              </div>
            )}
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex pl-5 md:pl-1 items-center text-account-text-secondary bg-transparent border-none py-2.5 font-medium cursor-pointer w-full text-sm transition-colors hover:text-[#ff6b6b]"
        >
          <i className="fas fa-sign-out-alt mr-3"></i> Thoát
        </button>
      </div>
    </nav>
  );
};

export default AccountSidebar;
