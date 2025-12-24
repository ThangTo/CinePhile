import React, { useState } from "react";
import MovieTable from "components/admin/MovieTable";
import UserTable from "components/admin/UserTable";
import CommentTable from "components/admin/CommentTable";
import AdminSidebar from "components/admin/AdminSidebar";
import AdminOverviewTab from "components/admin/AdminOverviewTab";
import AdminNotificationTab from "components/admin/AdminNotificationTab";
import { ADMIN_TABS } from "constants/admin";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState(ADMIN_TABS.OVERVIEW);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const renderContent = () => {
    switch (activeTab) {
      case ADMIN_TABS.OVERVIEW:
        return <AdminOverviewTab />;
      case ADMIN_TABS.MOVIES:
        return (
          <div className="animate-fade-in">
            <MovieTable />
          </div>
        );
      case ADMIN_TABS.USERS:
        return (
          <div className="animate-fade-in">
            <h1 className="text-2xl font-bold text-white mb-6">Quản Lý Người Dùng</h1>
            <UserTable />
          </div>
        );
      case ADMIN_TABS.COMMENTS:
        return (
          <div className="animate-fade-in">
            <h1 className="text-2xl font-bold text-white mb-6">Quản Lý Bình Luận</h1>
            <CommentTable />
          </div>
        );
      case ADMIN_TABS.NOTIFICATIONS:
        return <AdminNotificationTab />;
      case ADMIN_TABS.SETTINGS:
        return (
          <div className="animate-fade-in">
            <h1 className="text-2xl font-bold text-white mb-6">Cài Đặt</h1>
            <div className="bg-bgColor3 rounded-xl p-8 border border-white/10 text-center">
              <i className="fa-solid fa-gear text-4xl text-gray-600 mb-4"></i>
              <p className="text-gray-400">Tính năng đang được phát triển</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-bgColor text-white font-sans flex overflow-hidden">
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          isSidebarOpen ? "ml-64" : "ml-20"
        }`}
      >
        <header className="bg-bgColor/80 backdrop-blur-md border-b border-white/5 h-16 flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
            >
              <i className={`fa-solid ${isSidebarOpen ? "fa-indent" : "fa-outdent"} text-xl`}></i>
            </button>
            <span className="text-sm text-gray-500 hidden sm:inline-block">
              Admin / <span className="text-white capitalize">{activeTab}</span>
            </span>
          </div>

          <div className="flex items-center gap-5">
            <button className="relative text-gray-400 hover:text-white transition-colors">
              <i className="fa-regular fa-bell text-xl"></i>
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                3
              </span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-gradient-to-b from-bgColor to-[#0f1014]">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
