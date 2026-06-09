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
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      <aside
        className={`fixed left-0 top-0 h-dvh bg-[#141414] border-r border-white/5 transition-all duration-300 z-40 shadow-2xl md:shadow-none ${
          isOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0 md:w-20"
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between pl-6 md:pl-8 pr-4 border-b border-white/5">
          {isOpen ? (
            <Link to="/" className="shrink-0 text-xl lg:text-2xl font-extrabold tracking-tight">
              <span className="text-white">Cine</span>
              <span className="text-primaryColor">Phine</span>
            </Link>
          ) : (
            <Link to="/" className="shrink-0 text-xl lg:text-2xl font-extrabold tracking-tight md:mx-auto md:pl-0">
              <i className="fa-solid fa-film text-2xl text-primaryColor"></i>
            </Link>
          )}
          
          {/* Mobile close button */}
          <button 
            className="md:hidden text-gray-400 hover:text-white"
            onClick={() => setIsOpen(false)}
          >
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>

        {/* Menu Items */}
        <nav className="p-3 space-y-1.5 h-[calc(100dvh-4rem-var(--safe-bottom))] overflow-y-auto overflow-x-hidden custom-scrollbar pb-8">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                // Auto close sidebar on mobile after clicking
                if (window.innerWidth < 768) {
                  setIsOpen(false);
                }
              }}
              className={`w-full flex items-center justify-start gap-4 px-3 py-3 rounded-xl transition-all group ${
                activeTab === item.id
                  ? "bg-primaryColor text-black font-bold shadow-md shadow-primaryColor/10"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
              title={!isOpen ? item.label : ""}
            >
              <i className={`fa-solid ${item.icon} text-lg w-6 text-center shrink-0 transition-transform group-hover:scale-110`}></i>
              {isOpen && <span className="whitespace-nowrap truncate">{item.label}</span>}
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default AdminSidebar;
