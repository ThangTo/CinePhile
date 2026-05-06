import React from "react";
import { ADMIN_MENU_ITEMS } from "constants/admin";
import { Link } from "react-router-dom";

const AdminSidebar = ({
  activeTab,
  setActiveTab,
  isOpen,
  setIsOpen,
  menuItems = ADMIN_MENU_ITEMS,
}) => {
  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-bgColor4 border-r border-white/10 transition-all duration-300 z-20 ${
        isOpen ? "w-64" : "w-20"
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-start pl-8 border-b border-white/10">
        {isOpen ? (
          <Link to="/" className="shrink-0 text-xl lg:text-2xl font-extrabold tracking-tight">
            <span className="text-white">Cine</span>
            <span className="text-cyan-400">Phine</span>
          </Link>
        ) : (
          <Link to="/" className="shrink-0 text-xl lg:text-2xl font-extrabold tracking-tight">
            <i className="fa-solid fa-film text-2xl text-primaryColor"></i>
          </Link>
        )}
      </div>

      {/* Menu Items */}
      <nav className="p-2 space-y-2 h-[calc(100vh-4rem)] overflow-y-auto overflow-x-hidden custom-scrollbar pb-8">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center justify-start gap-4 px-4 py-3 rounded-lg transition-all ${
              activeTab === item.id
                ? "bg-primaryColor text-black font-semibold"
                : "text-gray-300 hover:bg-white/10"
            }`}
          >
            <i className={`fa-solid ${item.icon} text-lg w-6 text-center shrink-0`}></i>
            {isOpen && <span className="whitespace-nowrap truncate">{item.label}</span>}
          </button>
        ))}
      </nav>
    </aside>
  );
};

export default AdminSidebar;
