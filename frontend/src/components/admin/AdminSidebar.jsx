import React from "react";
import { ADMIN_MENU_ITEMS } from "../../constants/admin";

const AdminSidebar = ({ activeTab, setActiveTab, isOpen, setIsOpen }) => {
  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-gray-900 border-r border-white/10 transition-all duration-300 z-20 ${
        isOpen ? "w-64" : "w-20"
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-center border-b border-white/10">
        {isOpen ? (
          <h1 className="text-2xl font-bold text-primaryColor">CinePhile</h1>
        ) : (
          <i className="fa-solid fa-film text-2xl text-primaryColor"></i>
        )}
      </div>

      {/* Menu Items */}
      <nav className="p-4 space-y-2">
        {ADMIN_MENU_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all ${
              activeTab === item.id
                ? "bg-primaryColor text-black font-semibold"
                : "text-gray-300 hover:bg-white/10"
            }`}
          >
            <i className={`fa-solid ${item.icon} text-lg`}></i>
            {isOpen && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Logout */}
      <div className="absolute bottom-4 left-0 right-0 px-4">
        <button className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-all">
          <i className="fa-solid fa-sign-out-alt text-lg"></i>
          {isOpen && <span>Đăng Xuất</span>}
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;

