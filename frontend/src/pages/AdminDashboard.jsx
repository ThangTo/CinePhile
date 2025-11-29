import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StatCard from "components/admin/StatCard";
import { BarSpinner } from "components/common/LoadingState";
import MovieTable from "components/admin/MovieTable";
import UserTable from "components/admin/UserTable";
import AdminSidebar from "components/admin/AdminSidebar";
import { statsAPI } from "services/admin.service";
import { ADMIN_TABS } from "constants/admin";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(ADMIN_TABS.OVERVIEW);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [stats, setStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Load stats from API
  useEffect(() => {
    const loadStats = async () => {
      setIsLoadingStats(true);
      try {
        const statsData = await statsAPI.getStats();
        setStats(statsData);
      } catch (err) {
        console.error("Không thể tải thống kê:", err);
        // Fallback to default stats
        setStats({
          totalMovies: 0,
          totalUsers: 0,
          totalViews: 0,
          activeUsers: 0,
          trends: { movies: "0%", users: "0%", views: "0%", active: "0%" },
        });
      } finally {
        setIsLoadingStats(false);
      }
    };
    loadStats();
  }, []);

  const renderContent = () => {
    // Show loading state for overview
    if (activeTab === "overview" && (isLoadingStats || !stats)) {
      return <BarSpinner className="min-h-[400px]" />;
    }

    switch (activeTab) {
      case "overview":
        return (
          <div>
            <h1 className="text-fluid-2xl font-bold text-white mb-6">Dashboard Overview</h1>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Tổng Phim"
                value={stats.totalMovies}
                icon="fa-film"
                color="blue"
                trend={stats.trends.movies}
              />
              <StatCard
                title="Người Dùng"
                value={stats.totalUsers}
                icon="fa-users"
                color="green"
                trend={stats.trends.users}
              />
              <StatCard
                title="Lượt Xem"
                value={stats.totalViews}
                icon="fa-eye"
                color="purple"
                trend={stats.trends.views}
              />
              <StatCard
                title="Online"
                value={stats.activeUsers}
                icon="fa-circle"
                color="yellow"
                trend={stats.trends.activeUsers}
              />
            </div>

            {/* Charts placeholder */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-800 rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">Lượt Xem Theo Tuần</h3>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <i className="fa-solid fa-chart-line text-4xl"></i>
                  <span className="ml-4">Biểu đồ sẽ hiển thị ở đây</span>
                </div>
              </div>
              <div className="bg-gray-800 rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">Thể Loại Phổ Biến</h3>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <i className="fa-solid fa-chart-pie text-4xl"></i>
                  <span className="ml-4">Biểu đồ sẽ hiển thị ở đây</span>
                </div>
              </div>
            </div>
          </div>
        );

      case "movies":
        return (
          <div>
            <h1 className="text-fluid-2xl font-bold text-white mb-6">Quản Lý Phim</h1>
            <MovieTable />
          </div>
        );

      case "users":
        return (
          <div>
            <h1 className="text-fluid-2xl font-bold text-white mb-6">Quản Lý Người Dùng</h1>
            <UserTable />
          </div>
        );

      case "settings":
        return (
          <div>
            <h1 className="text-fluid-2xl font-bold text-white mb-6">Cài Đặt</h1>
            <div className="bg-gray-800 rounded-xl p-6 border border-white/10">
              <p className="text-gray-300">Trang cài đặt hệ thống</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-bgColor flex">
      {/* Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? "ml-64" : "ml-20"}`}>
        {/* Top Bar */}
        <div className="bg-gray-800 border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-white hover:text-primaryColor transition-colors"
          >
            <i className="fa-solid fa-bars text-xl"></i>
          </button>

          <div className="flex items-center gap-4">
            <button className="text-white hover:text-primaryColor transition-colors relative">
              <i className="fa-solid fa-bell text-xl"></i>
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                3
              </span>
            </button>
            <button
              onClick={() => navigate("/")}
              className="text-white hover:text-primaryColor transition-colors"
            >
              <i className="fa-solid fa-home text-xl"></i>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6">{renderContent()}</div>
      </div>
    </div>
  );
};

export default AdminDashboard;
