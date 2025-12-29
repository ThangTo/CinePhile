import React, { useEffect, useMemo, useState } from "react";
import { BarSpinner } from "components/common/LoadingState";
import { statsAPI } from "services/admin.service";
import { Bar, Doughnut } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";
import {
  FiActivity,
  FiUsers,
  FiEye,
  FiFilm,
  FiTrendingUp,
  FiPieChart,
  FiBarChart2,
  FiArrowUp,
  FiArrowDown,
} from "react-icons/fi";

Chart.register(...registerables);

const DashboardCard = ({ title, value, icon: Icon, color, trend, suffix }) => (
  <div className="relative overflow-hidden rounded-2xl bg-[#ffffff05] border border-white/5 p-6 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-[#ffffff08] group">
    {/* Background Glow */}
    <div
      className={`absolute -right-6 -top-6 h-24 w-24 rounded-full ${color} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`}
    />

    <div className="flex justify-between items-start">
      <div className="z-10">
        <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-white tracking-tight">
          {value?.toLocaleString() || 0}
        </h3>
      </div>
      <div
        className={`p-3 rounded-xl ${color} bg-opacity-10 text-white shadow-inner border border-white/5`}
      >
        <Icon size={24} />
      </div>
    </div>

    {/* Trend Section */}
    <div className="mt-4 flex items-center gap-2 text-sm">
      <span
        className={`flex items-center gap-1 font-semibold ${
          trend >= 0 ? "text-green-400" : "text-red-400"
        }`}
      >
        {trend >= 0 ? <FiArrowUp /> : <FiArrowDown />}
        {Math.abs(trend)}%
      </span>
      <span className="text-gray-500 text-xs">{suffix || "so với tuần trước"}</span>
    </div>
  </div>
);

const AdminOverviewTab = () => {
  const [stats, setStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [viewsChart, setViewsChart] = useState({ labels: [], data: [], posters: [] });
  const [isLoadingChart, setIsLoadingChart] = useState(true);
  const [genresChart, setGenresChart] = useState({ labels: [], data: [] });
  const [isLoadingGenresChart, setIsLoadingGenresChart] = useState(true);

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
          // Update màu sắc hiện đại hơn (Gradient giả lập bằng màu solid sáng)
          backgroundColor: "#F59E0B",
          hoverBackgroundColor: "#FCD34D",
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.5,
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
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          titleColor: "#fff",
          bodyColor: "#ccc",
          padding: 12,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            label: (ctx) => `Kết quả: ${ctx.raw?.toLocaleString()} lượt xem`,
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
            font: { size: 11, family: "'Inter', sans-serif" },
            callback: (value) => (value >= 1000 ? `${value / 1000}k` : value),
          },
          grid: {
            color: "rgba(255,255,255,0.05)", // Grid nhạt hơn
            drawBorder: false,
            borderDash: [5, 5], // Grid nét đứt
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
          borderColor: "#111827", // Viền trùng màu nền để tạo khoảng cách
          borderWidth: 2,
          hoverOffset: 10,
        },
      ],
    }),
    [genresChart]
  );

  const doughnutChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: "80%", // Vòng tròn mỏng hơn
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            usePointStyle: true,
            pointStyle: "circle",
            color: "#9ca3af",
            font: { size: 11, family: "'Inter', sans-serif" },
            padding: 20,
            boxWidth: 8,
          },
        },
        tooltip: {
          backgroundColor: "rgba(0, 0, 0, 0.9)",
          padding: 12,
          cornerRadius: 8,
          usePointStyle: true,
          callbacks: {
            labelPointStyle: () => ({
              pointStyle: "circle",
              rotation: 0,
            }),
            label: (context) => {
              const value = context.parsed || 0;
              return ` ${context.label}: ${value} phim`;
            },
          },
        },
      },
    }),
    []
  );

  if (isLoadingStats || !stats) {
    return (
      <div className="flex h-[80vh] items-center justify-center w-full">
        <BarSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-10 w-full">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <FiActivity className="text-primaryColor" />
            Dashboard
          </h1>
          <p className="text-gray-400 mt-2 text-sm max-w-lg">
            {/* Tổng quan hiệu suất vận hành của hệ thống CinePhine. Dữ liệu được cập nhật theo thời
            gian thực. */}
          </p>
        </div>
        <div className="flex items-center gap-3 bg-[#ffffff05] border border-white/10 px-4 py-2 rounded-full shadow-lg">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-xs text-green-400 font-bold uppercase tracking-wider">
            Hệ thống sẵn sàng
          </span>
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard
          title="Tổng Phim"
          value={stats.totalMovies}
          icon={FiFilm}
          color="bg-blue-500"
          trend={stats.trends.movies}
        />
        <DashboardCard
          title="Người Dùng"
          value={stats.totalUsers}
          icon={FiUsers}
          color="bg-indigo-500"
          trend={stats.trends.users}
        />
        <DashboardCard
          title="Lượt Xem"
          value={stats.totalViews}
          icon={FiEye}
          color="bg-purple-500"
          trend={stats.trends.views}
        />
        <DashboardCard
          title="Đăng Ký Mới"
          value={stats.newUsers}
          icon={FiTrendingUp}
          color="bg-emerald-500"
          trend={stats.trends.newUsers}
          suffix="(7 ngày qua)"
        />
      </div>

      {/* 3. Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Bar Chart Container */}
        <div className="xl:col-span-2 bg-[#ffffff05] rounded-2xl p-6 border border-white/5 shadow-xl flex flex-col relative overflow-hidden group">
          {/* Decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primaryColor/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

          <div className="flex items-center justify-between mb-6 z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primaryColor/10 rounded-lg text-primaryColor">
                <FiBarChart2 size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Top Phim Thịnh Hành</h3>
                <p className="text-xs text-gray-500">Dựa trên lượt xem cao nhất</p>
              </div>
            </div>
          </div>

          <div className="h-[350px] w-full z-10">
            {isLoadingChart ? (
              <div className="h-full flex items-center justify-center">
                <BarSpinner />
              </div>
            ) : viewsChart?.labels?.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
                <FiBarChart2 size={48} className="mb-2" />
                <span>Chưa có dữ liệu thống kê</span>
              </div>
            ) : (
              <Bar data={barChartData} options={barChartOptions} plugins={[barPosterPlugin]} />
            )}
          </div>
        </div>

        {/* Doughnut Chart Container */}
        <div className="xl:col-span-1 bg-[#ffffff05] rounded-2xl p-6 border border-white/5 shadow-xl flex flex-col relative overflow-hidden">
          <div className="flex items-center justify-between mb-2 z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-500/10 rounded-lg text-pink-500">
                <FiPieChart size={20} />
              </div>
              <h3 className="text-lg font-bold text-white">Thể Loại Phổ Biến</h3>
            </div>
          </div>

          <div className="flex-1 min-h-[300px] relative flex items-center justify-center z-10">
            {/* Center Text */}
            {!isLoadingGenresChart && genresChart?.labels?.length > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-14">
                <span className="text-4xl font-extrabold text-white">{stats.totalMovies}</span>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                  Phim
                </span>
              </div>
            )}

            {isLoadingGenresChart ? (
              <div className="h-full flex items-center justify-center">
                <BarSpinner />
              </div>
            ) : genresChart?.labels?.length === 0 ? (
              <div className="text-center text-gray-500 opacity-50 flex flex-col items-center">
                <FiPieChart size={48} className="mb-2" />
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
};

export default AdminOverviewTab;
