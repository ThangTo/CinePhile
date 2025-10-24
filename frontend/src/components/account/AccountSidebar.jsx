import React from "react";
import { Link, useLocation } from "react-router-dom";

const AccountSidebar = ({ user, onLogout }) => {
  const location = useLocation();

  const navItems = [
    { path: "/favorites", icon: "fa-heart", label: "Yêu thích" },
    { path: "/watchlist", icon: "fa-list", label: "Danh sách" },
    { path: "/continue-watching", icon: "fa-play", label: "Xem tiếp" },
    { path: "/notifications", icon: "fa-bell", label: "Thông báo" },
    { path: "/account", icon: "fa-user", label: "Tài khoản" },
  ];

  return (
    <nav className="w-full md:w-[250px] mt-[50px] ml-[20px] rounded-2xl bg-account-bg-secondary min-h-auto md:min-h-screen p-6 flex flex-col border-r-0 md:border-r border-b md:border-b-0 border-account-border md:sticky md:top-0 md:h-screen">
      <div className="flex-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center px-4 py-3 rounded-lg mb-2 font-medium no-underline transition-all ${
              location.pathname === item.path
                ? "bg-account-bg-tertiary text-account-accent"
                : "text-account-text-secondary hover:bg-account-bg-tertiary hover:text-account-text-primary"
            }`}
          >
            <i className={`fas ${item.icon} w-5 text-center mr-3`}></i>
            {item.label}
          </Link>
        ))}
      </div>

      <div className="mt-auto border-t border-account-border pt-5">
        <div className="flex items-center mb-4">
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
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center text-account-text-secondary bg-transparent border-none py-2.5 font-medium cursor-pointer w-full text-sm transition-colors hover:text-[#ff6b6b]"
        >
          <i className="fas fa-sign-out-alt mr-3"></i> Thoát
        </button>
      </div>
    </nav>
  );
};

export default AccountSidebar;
