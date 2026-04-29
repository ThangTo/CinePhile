import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import MovieTable from "components/admin/MovieTable";
import UserTable from "components/admin/UserTable";
import CommentTable from "components/admin/CommentTable";
import CastTable from "components/admin/CastTable";
import AdminSidebar from "components/admin/AdminSidebar";
import AdminOverviewTab from "components/admin/AdminOverviewTab";
import AdminNotificationTab from "components/admin/AdminNotificationTab";
import AdminSettingsTab from "components/admin/AdminSettingsTab";
import AdminViralClipsTab from "components/admin/AdminViralClipsTab";
import AdminMailboxTab from "components/admin/AdminMailboxTab";
import AdminTikTokTab from "components/admin/AdminTikTokTab";
import SettingsPricingTab from "components/admin/SettingsPricingTab";
import AdminQuestsTab from "components/admin/AdminQuestsTab";
import AdminSubtitlesTab from "components/admin/AdminSubtitlesTab";
import { ADMIN_TABS, ADMIN_MENU_ITEMS } from "constants/admin";

const AdminDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Lấy tab từ URL query parameter, mặc định là OVERVIEW
  const getTabFromURL = () => {
    const tabParam = searchParams.get("tab");
    // Validate tab từ URL
    const validTabs = Object.values(ADMIN_TABS);
    if (tabParam && validTabs.includes(tabParam)) {
      return tabParam;
    }
    return ADMIN_TABS.OVERVIEW;
  };

  const [activeTab, setActiveTab] = useState(getTabFromURL());

  // Đảm bảo URL được set khi component mount nếu chưa có tab trong URL
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (!tabParam) {
      setSearchParams({ tab: ADMIN_TABS.OVERVIEW }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Đồng bộ activeTab với URL khi URL thay đổi (ví dụ: back/forward button)
  useEffect(() => {
    const tabFromURL = getTabFromURL();
    setActiveTab(tabFromURL);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Hàm để chuyển tab và cập nhật URL
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };

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
            <UserTable />
          </div>
        );
      case ADMIN_TABS.CASTS:
        return (
          <div className="animate-fade-in">
            <h1 className="text-2xl font-bold text-white mb-6">Quản Lý Diễn Viên</h1>
            <CastTable />
          </div>
        );
      case ADMIN_TABS.COMMENTS:
        return (
          <div className="animate-fade-in">
            <h1 className="text-2xl font-bold text-white mb-6">Quản Lý Bình Luận</h1>
            <CommentTable />
          </div>
        );
      case ADMIN_TABS.VIRAL_CLIPS:
        return (
          <div className="animate-fade-in">
            <AdminViralClipsTab />
          </div>
        );
      case ADMIN_TABS.TIKTOK:
        return (
          <div className="animate-fade-in">
            <AdminTikTokTab />
          </div>
        );
      case ADMIN_TABS.NOTIFICATIONS:
        return <AdminNotificationTab />;
      case ADMIN_TABS.MAILBOX:
        return (
          <div className="animate-fade-in">
            <h1 className="text-2xl font-bold text-white mb-4">Hộp Thư</h1>
            <AdminMailboxTab />
          </div>
        );
      case ADMIN_TABS.SUBTITLES:
        return <AdminSubtitlesTab />;
      case ADMIN_TABS.SETTINGS:
        return <AdminSettingsTab />;
      case ADMIN_TABS.PRICING:
        return <SettingsPricingTab />;
      case ADMIN_TABS.QUESTS:
        return <AdminQuestsTab />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-bgColor text-white font-sans flex overflow-hidden">
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        menuItems={ADMIN_MENU_ITEMS}
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

          {/* <div className="flex items-center gap-5">
            <button className="relative text-gray-400 hover:text-white transition-colors">
              <i className="fa-regular fa-bell text-xl"></i>
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                3
              </span>
            </button>
          </div> */}
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-gradient-to-b from-bgColor to-[#0f1014]">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
