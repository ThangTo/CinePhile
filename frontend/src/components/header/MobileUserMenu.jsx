import React from "react";
import { Link } from "react-router-dom";
import { USER_MENU_ITEMS, MOBILE_MENU_ITEM_CLASS } from "./constants";

const UserInfoCard = ({ user }) => (
  <div className="bg-gradient-to-br from-[#4a5a7f] to-[#3b4d6f] rounded-xl p-4 mb-4">
    <div className="flex items-center gap-3 mb-3">
      <img
        src={user.avatar || "https://i.pravatar.cc/150?img=68"}
        alt={user.username}
        className="w-12 h-12 rounded-full object-cover border-2 border-white/30"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-white font-semibold">{user.username}</span>
          <i className="fa-solid fa-infinity text-primaryColor text-sm" />
        </div>
        <p className="text-gray-300 text-xs">
          Nâng cấp tài khoản Cinx để có trải nghiệm đẳng cấp hơn.
        </p>
      </div>
    </div>
    <button className="w-full bg-gradient-to-r from-primaryColor to-hoverPrimaryColor hover:from-hoverPrimaryColor hover:to-primaryColor text-primaryColorButtonText font-semibold text-sm py-2 rounded-lg transition-all flex items-center justify-center gap-2">
      Nâng cấp ngay
      <i className="fa-solid fa-arrow-up rotate-45" />
    </button>
  </div>
);

const MobileUserMenu = ({ user, onLogout, onOpenAuth, onClose }) => {
  return (
    <>
      {user ? (
        <div className="mb-4">
          <UserInfoCard user={user} />

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
                className={MOBILE_MENU_ITEM_CLASS}
                onClick={onClose}
              >
                <i className={`fa-solid ${item.icon} w-5 text-center`} />
                <span>{item.label}</span>
              </Link>
            ))}
            <button onClick={onLogout} className={MOBILE_MENU_ITEM_CLASS}>
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
