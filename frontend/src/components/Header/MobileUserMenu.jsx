import React from "react";
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
          <i className="fa-solid fa-infinity text-yellow-400 text-sm" />
        </div>
        <p className="text-gray-300 text-xs">
          Nâng cấp tài khoản Cinx để có trải nghiệm đẳng cấp hơn.
        </p>
      </div>
    </div>
    <button className="w-full bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-black font-semibold text-sm py-2 rounded-lg transition-all flex items-center justify-center gap-2">
      Nâng cấp ngay
      <i className="fa-solid fa-arrow-up rotate-45" />
    </button>
  </div>
);

const UserStats = ({ coins }) => (
  <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/20">
    <div className="flex items-center gap-2">
      <i className="fa-solid fa-film text-gray-300 text-sm" />
      <span className="text-white font-semibold">Số dư</span>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-white font-bold">{coins || 0}</span>
      <i className="fa-solid fa-coins text-yellow-400" />
      <button className="ml-2 bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-full text-xs font-semibold transition-colors">
        + Nạp
      </button>
    </div>
  </div>
);

const MobileUserMenu = ({ user, onLogout, onOpenAuth, onClose }) => {
  return (
    <>
      {user ? (
        <div className="mb-4">
          <UserInfoCard user={user} />
          <UserStats coins={user.coins} />

          {/* Menu Items */}
          <div className="grid grid-cols-2 gap-2 mb-4 pb-4 border-b border-white/20">
            {USER_MENU_ITEMS.map((item) => (
              <a key={item.label} href={item.href} className={MOBILE_MENU_ITEM_CLASS}>
                <i className={`fa-solid ${item.icon} w-5 text-center`} />
                <span>{item.label}</span>
              </a>
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
