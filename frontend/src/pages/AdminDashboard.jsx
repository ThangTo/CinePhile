import React, { useState, useEffect, useMemo } from "react";
import StatCard from "components/admin/StatCard";
import { BarSpinner } from "components/common/LoadingState";
import MovieTable from "components/admin/MovieTable";
import UserTable from "components/admin/UserTable";
import AdminSidebar from "components/admin/AdminSidebar";
import { statsAPI } from "services/admin.service";
import { ADMIN_TABS } from "constants/admin";
import { Bar, Doughnut } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState(ADMIN_TABS.OVERVIEW);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [stats, setStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [viewsChart, setViewsChart] = useState({ labels: [], data: [], posters: [] });
  const [isLoadingChart, setIsLoadingChart] = useState(true);
  const [genresChart, setGenresChart] = useState({ labels: [], data: [] });
  const [isLoadingGenresChart, setIsLoadingGenresChart] = useState(true);

  // --- API CALLS ---
  useEffect(() => {
    const loadStats = async () => {
      setIsLoadingStats(true);
      try {
        const statsData = await statsAPI.getStats();
        setStats(statsData);
      } catch (err) {
        console.error("Không thể tải thống kê:", err);
        setStats({
          totalMovies: 0,
          totalUsers: 0,
          totalViews: 0,
          newUsers: 0,
          trends: { movies: 0, users: 0, views: 0, newUsers: 0 },
        });
      } finally {
        setIsLoadingStats(false);
      }
    };
    loadStats();
  }, []);

  useEffect(() => {
    const loadChart = async () => {
      setIsLoadingChart(true);
      try {
        const chartData = await statsAPI.getChartData("views");
        setViewsChart({
          labels: Array.isArray(chartData?.labels) ? chartData.labels : [],
          data: Array.isArray(chartData?.data) ? chartData.data : [],
          posters: Array.isArray(chartData?.posters) ? chartData.posters : [],
        });
      } catch (err) {
        setViewsChart({ labels: [], data: [], posters: [] });
      } finally {
        setIsLoadingChart(false);
      }
    };
    loadChart();
  }, []);

  useEffect(() => {
    const loadGenresChart = async () => {
      setIsLoadingGenresChart(true);
      try {
        const chartData = await statsAPI.getChartData("genres");
        setGenresChart({
          labels: Array.isArray(chartData?.labels) ? chartData.labels : [],
          data: Array.isArray(chartData?.data) ? chartData.data : [],
        });
      } catch (err) {
        setGenresChart({ labels: [], data: [] });
      } finally {
        setIsLoadingGenresChart(false);
      }
    };
    loadGenresChart();
  }, []);

  // --- CHART PLUGINS & OPTIONS ---

  const barPosterPlugin = useMemo(() => {
    const cache = new Map();
    return {
      id: "barPosterPlugin",
      afterDraw: (chart) => {
        const { ctx, chartArea, scales } = chart;
        if (!ctx || !chartArea || !scales.x) return;
        const posters = viewsChart?.posters || [];
        if (!posters.length) return;

        const size = 32;
        const radius = size / 2;
        const gap = 15;

        posters.forEach((src, index) => {
          if (!src) return;
          const centerX = scales.x.getPixelForValue(index);
          const centerY = chartArea.bottom + gap + radius;

          if (cache.has(src)) {
            const img = cache.get(src);
            if (img.complete && img.naturalWidth > 0) {
              try {
                ctx.save();
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();
                // Vẽ viền cho ảnh
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.drawImage(img, centerX - radius, centerY - radius, size, size);
                ctx.restore();
              } catch (e) {}
            }
          } else {
            const img = new Image();
            img.src = `https://images.weserv.nl/?url=${src}&w=200&q=80`;
            img.onload = () => chart.ctx && chart.draw();
            cache.set(src, img);
          }
        });
      },
    };
  }, [viewsChart]);

  const barChartData = useMemo(
    () => ({
      labels: viewsChart.labels,
      datasets: [
        {
          label: "Lượt xem",
          data: viewsChart.data,
          // Gradient giả lập bằng màu solid hiện đại
          backgroundColor: "#6366f1",
          hoverBackgroundColor: "#818cf8",
          borderRadius: 8, // Bo tròn đầu cột
          borderSkipped: false,
          barPercentage: 0.6,
          categoryPercentage: 0.8,
        },
      ],
    }),
    [viewsChart]
  );

  const barChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(17, 24, 39, 0.9)",
          titleColor: "#fff",
          bodyColor: "#ccc",
          padding: 12,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            label: (ctx) => `Result: ${ctx.raw?.toLocaleString()} views`,
          },
        },
      },
      scales: {
        x: {
          ticks: { display: false },
          grid: { display: false },
          border: { display: false },
        },
        y: {
          ticks: {
            color: "#6b7280",
            font: { size: 11 },
            callback: (value) => (value >= 1000 ? `${value / 1000}k` : value),
          },
          grid: {
            color: "rgba(255,255,255,0.03)",
            drawBorder: false,
          },
          border: { display: false },
        },
      },
      layout: { padding: { bottom: 60 } },
    }),
    []
  );

  const doughnutChartData = useMemo(
    () => ({
      labels: genresChart.labels,
      datasets: [
        {
          data: genresChart.data,
          backgroundColor: [
            "#6366f1",
            "#ec4899",
            "#10b981",
            "#f59e0b",
            "#3b82f6",
            "#8b5cf6",
            "#ef4444",
            "#14b8a6",
            "#f97316",
            "#64748b",
          ],
          borderWidth: 0,
          hoverOffset: 15,
        },
      ],
    }),
    [genresChart]
  );

  const doughnutChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: "75%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            usePointStyle: true,
            pointStyle: "circle",
            color: "#9ca3af",
            font: { size: 11 },
            padding: 15,
            boxWidth: 8,
          },
        },
        tooltip: {
          backgroundColor: "rgba(17, 24, 39, 0.9)",
          padding: 12,
          cornerRadius: 8,
          usePointStyle: true,
          callbacks: {
            labelPointStyle: (context) => {
              return {
                pointStyle: "circle",
                rotation: 0,
              };
            },
            label: (context) => {
              const value = context.parsed || 0;
              return ` ${context.label}: ${value} views`;
            },
          },
        },
      },
    }),
    []
  );

  // --- RENDER CONTENT ---
  const renderContent = () => {
    if (activeTab === ADMIN_TABS.OVERVIEW && (isLoadingStats || !stats)) {
      return (
        <div className="flex h-[80vh] items-center justify-center">
          <BarSpinner />
        </div>
      );
    }

    switch (activeTab) {
      case ADMIN_TABS.OVERVIEW:
        return (
          <div className="space-y-8 animate-fade-in">
            {/* 1. Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Tổng Quan</h1>
                <p className="text-gray-400 mt-1 text-sm">
                  Chào mừng trở lại, đây là tình hình hoạt động của CinePhine hôm nay.
                </p>
              </div>
              <div className="flex items-center gap-3 bg-bgColor3 border border-white/10 px-4 py-2 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-sm text-gray-300 font-medium">Hệ thống ổn định</span>
              </div>
            </div>

            {/* 2. Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                color="indigo"
                trend={stats.trends.users}
              />
              <StatCard
                title="Tổng Lượt Xem"
                value={stats.totalViews}
                icon="fa-eye"
                color="purple"
                trend={stats.trends.views}
              />
              <StatCard
                title="Người Dùng Mới"
                value={stats.newUsers}
                icon="fa-user-plus"
                color="emerald"
                trend={stats.trends.newUsers}
                suffix="(7 ngày)"
              />
            </div>

            {/* 3. Charts Section */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 bg-bgColor3 rounded-xl p-6 border border-white/10 shadow-lg shadow-primaryColor/5 relative overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-lg font-bold text-white">Top Phim Thịnh Hành</h3>
                    <p className="text-xs text-gray-400 mt-1">10 bộ phim có lượt xem cao nhất</p>
                  </div>
                </div>

                <div className="h-[350px] w-full">
                  {isLoadingChart ? (
                    <BarSpinner className="h-full" />
                  ) : viewsChart?.labels?.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      Chưa có dữ liệu
                    </div>
                  ) : (
                    <Bar
                      data={barChartData}
                      options={barChartOptions}
                      plugins={[barPosterPlugin]}
                    />
                  )}
                </div>
              </div>

              <div className="xl:col-span-1 bg-bgColor3 rounded-xl p-6 border border-white/10 shadow-lg shadow-primaryColor/5 flex flex-col relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">Phân Bố Thể Loại</h3>
                </div>

                <div className="flex-1 min-h-[300px] relative flex items-center justify-center">
                  {!isLoadingGenresChart && genresChart?.labels?.length > 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-12">
                      <span className="text-3xl font-bold text-white">{stats.totalMovies}</span>
                      <span className="text-xs text-gray-500 uppercase tracking-wider">Phim</span>
                    </div>
                  )}

                  {isLoadingGenresChart ? (
                    <BarSpinner className="h-full" />
                  ) : genresChart?.labels?.length === 0 ? (
                    <div className="text-center text-gray-500">
                      <i className="fa-solid fa-chart-pie text-4xl mb-2 opacity-50"></i>
                      <p>Chưa có dữ liệu</p>
                    </div>
                  ) : (
                    <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case ADMIN_TABS.MOVIES:
        return (
          <div className="animate-fade-in">
            <h1 className="text-2xl font-bold text-white mb-6">Quản Lý Phim</h1>
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
      {/* Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      {/* Main Content Wrapper */}
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
