import React, { Suspense, lazy, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AdminSidebar from "components/admin/AdminSidebar";
import { ADMIN_TABS, ADMIN_MENU_ITEMS } from "constants/admin";

const MovieTable = lazy(() => import("components/admin/MovieTable"));
const UserTable = lazy(() => import("components/admin/UserTable"));
const CommentTable = lazy(() => import("components/admin/CommentTable"));
const CastTable = lazy(() => import("components/admin/CastTable"));
const AdminOverviewTab = lazy(() => import("components/admin/AdminOverviewTab"));
const AdminNotificationTab = lazy(() => import("components/admin/AdminNotificationTab"));
const AdminSettingsTab = lazy(() => import("components/admin/AdminSettingsTab"));
const AdminViralClipsTab = lazy(() => import("components/admin/AdminViralClipsTab"));
const AdminMailboxTab = lazy(() => import("components/admin/AdminMailboxTab"));
const AdminTikTokTab = lazy(() => import("components/admin/AdminTikTokTab"));
const SettingsPricingTab = lazy(() => import("components/admin/SettingsPricingTab"));
const AdminQuestsTab = lazy(() => import("components/admin/AdminQuestsTab"));
const AdminSubtitlesTab = lazy(() => import("components/admin/AdminSubtitlesTab"));
const AdminPlaybackTab = lazy(() => import("components/admin/AdminPlaybackTab"));
const AdminHlsLabTab = lazy(() => import("components/admin/AdminHlsLabTab"));

function AdminTabLoading() {
  return (
    <div className="min-h-[360px] flex items-center justify-center">
      <div className="flex items-center justify-center gap-1.5 h-8" aria-label="Loading">
        <div className="w-1.5 h-6 bg-primaryColor rounded-full animate-bounce" />
        <div
          className="w-1.5 h-8 bg-primaryColor rounded-full animate-bounce"
          style={{ animationDelay: "-0.2s" }}
        />
        <div
          className="w-1.5 h-6 bg-primaryColor rounded-full animate-bounce"
          style={{ animationDelay: "-0.4s" }}
        />
      </div>
    </div>
  );
}

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
      case ADMIN_TABS.PLAYBACK:
        return <AdminPlaybackTab />;
      case ADMIN_TABS.HLS_LAB:
        return <AdminHlsLabTab />;
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
    <div className="min-h-dvh bg-bgColor text-white font-sans flex overflow-hidden">
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        menuItems={ADMIN_MENU_ITEMS}
      />

      <div
        className={`flex-1 flex flex-col transition-all duration-300 w-full ${
          isSidebarOpen ? "md:ml-64" : "md:ml-20"
        }`}
      >
        <header className="bg-[#0a0a0c] border-b border-white/5 h-16 flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
          <div className="flex items-center gap-3 md:gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
            >
              <i className={`fa-solid ${isSidebarOpen ? "fa-indent" : "fa-bars"} md:${isSidebarOpen ? "fa-indent" : "fa-outdent"} text-xl`}></i>
            </button>
            <span className="text-sm font-medium text-gray-400 hidden sm:inline-block bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
              <i className="fa-solid fa-shield-halved text-primaryColor mr-2"></i>
              Admin Control Panel / <span className="text-white capitalize">{activeTab}</span>
            </span>
            <span className="text-base font-bold text-white sm:hidden capitalize">
              {activeTab}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#0a0a0c]">
          <div className="max-w-[1600px] mx-auto">
            <Suspense fallback={<AdminTabLoading />}>{renderContent()}</Suspense>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
