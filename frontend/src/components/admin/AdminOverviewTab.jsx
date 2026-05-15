import React, { Suspense, lazy, useEffect, useMemo, useState, useRef } from "react";
import { BarSpinner } from "components/common/LoadingState";
import { statsAPI } from "services/admin.service";
import { getOptimizedImageUrl } from "constants/imageSizes";
import {
  FiActivity,
  FiUsers,
  FiEye,
  FiFilm,
  FiTrendingUp,
  FiPieChart,
  FiBarChart2,
  FiGlobe,
  FiMonitor,
  FiClock,
  FiSmartphone,
  FiTarget
} from "react-icons/fi";

const AdminChart = lazy(() => import("./AdminChart"));
const AnalyticsMap = lazy(() => import("./AnalyticsMap"));
const TrendingRanking = lazy(() => import("./TrendingRanking"));
const AnalyticsHistoryChart = lazy(() => import("./AnalyticsHistoryChart"));
const AnalyticsUniqueChart = lazy(() => import("./AnalyticsUniqueChart"));

function ChartFallback() {
  return (
    <div className="h-full flex items-center justify-center">
      <BarSpinner />
    </div>
  );
}

function ChartSlot({ type, ...props }) {
  return (
    <Suspense fallback={<ChartFallback />}>
      <AdminChart type={type} {...props} />
    </Suspense>
  );
}

function useDeferredMount(timeout = 1800) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      setIsReady(true);
      return undefined;
    }

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(() => setIsReady(true), { timeout });
      return () => {
        if ("cancelIdleCallback" in window) {
          window.cancelIdleCallback(idleId);
        }
      };
    }

    const timerId = window.setTimeout(() => setIsReady(true), Math.min(timeout, 1200));
    return () => window.clearTimeout(timerId);
  }, [timeout]);

  return isReady;
}

function DeferredAdminSection({ children, minHeight = "min-h-[320px]" }) {
  const isReady = useDeferredMount();
  const fallback = (
    <div className={`${minHeight} flex items-center justify-center`}>
      <BarSpinner />
    </div>
  );

  if (!isReady) return fallback;

  return <Suspense fallback={fallback}>{children}</Suspense>;
}

const DashboardCard = ({ title, value, icon: Icon, color, weekly, suffix }) => (
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

    {/* Trend Section (Now absolute numbers) */}
    <div className="mt-4 flex flex-col gap-1 text-[11px]">
      <div className="flex items-center justify-between">
         <span className="text-gray-500">Tuần này:</span>
         <span className="text-green-400 font-bold">+{weekly?.current?.toLocaleString() || 0}</span>
      </div>
      <div className="flex items-center justify-between">
         <span className="text-gray-500">Tuần trước:</span>
         <span className="text-blue-400 font-bold">+{weekly?.last?.toLocaleString() || 0}</span>
      </div>
      {suffix && <span className="text-gray-600 italic mt-1">{suffix}</span>}
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
  const [watchTimeChart, setWatchTimeChart] = useState({ labels: [], data: [] });
  const [isLoadingWatchTime, setIsLoadingWatchTime] = useState(true);

  // New Data Sources (Phase 10.3)
  const [peakHoursChart, setPeakHoursChart] = useState({ labels: [], data: [] });
  const [isLoadingPeak, setIsLoadingPeak] = useState(true);
  const [devicesChart, setDevicesChart] = useState({ labels: [], data: [] });
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);
  const [globalRetention, setGlobalRetention] = useState(0);

  // Realtime Analytics States
  const [activeUsersHistory, setActiveUsersHistory] = useState([]);
  const [currentActiveUsers, setCurrentActiveUsers] = useState({ total: 0, guests: 0, users: 0 });
  const [visitsStats, setVisitsStats] = useState({ 
    today: { total: 0, guestCount: 0, userCount: 0 }, 
    week: { total: 0, guestCount: 0, userCount: 0 }, 
    month: { total: 0, guestCount: 0, userCount: 0 } 
  });
  const activeUsersHistoryRef = useRef([]); // To keep track inside setInterval

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

    const loadWatchTimeChart = async () => {
      setIsLoadingWatchTime(true);
      try {
        const chartData = await statsAPI.getChartData("watch-time-trend");
        setWatchTimeChart({
          labels: Array.isArray(chartData?.labels) ? chartData.labels : [],
          data: Array.isArray(chartData?.data) ? chartData.data : [],
        });
      } catch (err) {
        setWatchTimeChart({ labels: [], data: [] });
      } finally {
        setIsLoadingWatchTime(false);
      }
    };
    loadWatchTimeChart();

    const loadAdvancedStats = async () => {
      try {
        const [peak, dev, ret] = await Promise.all([
          statsAPI.getChartData("peak-hours").catch(() => null),
          statsAPI.getChartData("devices").catch(() => null),
          statsAPI.getChartData("retention-overview").catch(() => null),
        ]);
        if (peak) setPeakHoursChart({ labels: peak.labels || [], data: peak.data || [] });
        if (dev) setDevicesChart({ labels: dev.labels || [], data: dev.data || [] });
        if (ret) setGlobalRetention(ret.retentionRate || 0);
      } catch (err) {
        console.error("Advanced Stats Error:", err);
      } finally {
        setIsLoadingPeak(false);
        setIsLoadingDevices(false);
      }
    };
    loadAdvancedStats();

    // Fetch Visits stats on mount
    const loadVisits = async () => {
      try {
        const vStats = await statsAPI.getRealtimeVisits();
        setVisitsStats({
          today: vStats?.today || { total: 0, guestCount: 0, userCount: 0 },
          week: vStats?.week || { total: 0, guestCount: 0, userCount: 0 },
          month: vStats?.month || { total: 0, guestCount: 0, userCount: 0 },
        });
      } catch (err) {
        console.error("Failed to load visit stats", err);
      }
    };
    loadVisits();

    // Poll Realtime Active Users every 5 seconds
    const pollActiveUsers = async () => {
      try {
        const countData = await statsAPI.getRealtimeActiveUsers();
        // Handle both older format (number) and new format (object) safely
        const total = countData?.count?.total ?? countData?.count ?? countData ?? 0;
        const guests = countData?.count?.guestCount ?? 0;
        const users = countData?.count?.userCount ?? 0;
        
        setCurrentActiveUsers({ total, guests, users });
        
        const now = new Date();
        const timeLabel = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        
        activeUsersHistoryRef.current = [
          ...activeUsersHistoryRef.current,
          { time: timeLabel, total, guests, users }
        ];

        // Keep last 12 points (60 seconds worth of data)
        if (activeUsersHistoryRef.current.length > 12) {
          activeUsersHistoryRef.current.shift();
        }
        
        setActiveUsersHistory([...activeUsersHistoryRef.current]);
      } catch (err) {
        console.error("Polling error", err);
      }
    };

    pollActiveUsers(); // Initial fetch
    const intervalId = setInterval(pollActiveUsers, 5000);
    
    return () => clearInterval(intervalId);
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
            // Use standardized SIDEBAR size for consistency
            img.src = getOptimizedImageUrl(src, "SIDEBAR") || src;
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

  const watchTimeLineData = useMemo(
    () => ({
      labels: watchTimeChart.labels,
      datasets: [
        {
          label: "Tổng thời gian xem (phút)",
          data: watchTimeChart.data,
          borderColor: "#f59e0b", // amber-500
          backgroundColor: (context) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 300);
            // Gradient fill mượt mà, sang trọng
            gradient.addColorStop(0, "rgba(245, 158, 11, 0.4)");
            gradient.addColorStop(1, "rgba(245, 158, 11, 0.0)");
            return gradient;
          },
          borderWidth: 3,
          tension: 0.4, // Đường cong mềm mại
          fill: true,
          pointBackgroundColor: "#f59e0b",
          pointBorderColor: "#fff",
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: "#f59e0b",
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    }),
    [watchTimeChart]
  );

  const watchTimeLineOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          titleColor: "#fff",
          bodyColor: "#f59e0b",
          padding: 12,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            label: (ctx) => {
              const minutes = ctx.raw || 0;
              if (minutes >= 60) {
                const h = Math.floor(minutes / 60);
                const m = minutes % 60;
                return ` ${h} giờ ${m} phút`;
              }
              return ` ${minutes} phút`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false, drawBorder: false },
          ticks: { color: "#6b7280", font: { size: 11, family: "'Inter', sans-serif" } },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(255,255,255,0.05)",
            borderDash: [5, 5],
            drawBorder: false,
          },
          ticks: {
            color: "#6b7280",
            font: { size: 11, family: "'Inter', sans-serif" },
            callback: (value) => (value >= 1000 ? `${value / 1000}k` : value),
          },
        },
      },
      interaction: {
        intersect: false,
        mode: "index",
      },
    }),
    []
  );

  // Peak Hours Configuration
  const peakHoursLineData = useMemo(() => ({
    labels: peakHoursChart.labels,
    datasets: [{
      label: "Lượt Xem",
      data: peakHoursChart.data,
      borderColor: "#10b981", // emerald-500
      backgroundColor: (context) => {
        const ctx = context.chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, "rgba(16, 185, 129, 0.4)");
        gradient.addColorStop(1, "rgba(16, 185, 129, 0.0)");
        return gradient;
      },
      borderWidth: 3,
      tension: 0.4,
      fill: true,
      pointBackgroundColor: "#10b981",
      pointBorderColor: "#fff",
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
    }]
  }), [peakHoursChart]);

  const peakHoursLineOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        titleColor: "#fff",
        bodyColor: "#10b981",
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: (ctx) => `Lượng Khách Điểm Danh: ${ctx.raw} lượt xem`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#6b7280", font: { size: 10, family: "'Inter', sans-serif" } },
      },
      y: {
        grid: { color: "rgba(255,255,255,0.05)", drawBorder: false, borderDash: [5, 5] },
        ticks: { color: "#6b7280", font: { size: 11, family: "'Inter', sans-serif" } },
      },
    },
    interaction: { mode: "index", intersect: false },
  }), []);

  // Devices Configuration
  const devicesDoughnutData = useMemo(() => ({
    labels: devicesChart.labels,
    datasets: [{
      data: devicesChart.data,
      backgroundColor: ["#3b82f6", "#f43f5e", "#10b981", "#64748b"], // Blue, Rose, Emerald, Slate
      borderColor: "#111827",
      borderWidth: 3,
      hoverOffset: 8,
    }]
  }), [devicesChart]);

  if (isLoadingStats || !stats) {
    return (
      <div className="flex h-[80vh] items-center justify-center w-full">
        <BarSpinner />
      </div>
    );
  }

  // Realtime line chart data
  const realtimeLineData = {
    labels: activeUsersHistory.map(d => d.time),
    datasets: [
      {
        label: "Tổng online",
        data: activeUsersHistory.map(d => d.total),
        borderColor: "#10b981", // emerald-500
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        borderWidth: 2,
        tension: 0.4, // smooth line
        fill: true,
        pointBackgroundColor: "#10b981",
        pointBorderColor: "#fff",
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: "#10b981",
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: "Thành viên",
        data: activeUsersHistory.map(d => d.users),
        borderColor: "#3b82f6", // blue-500
        backgroundColor: "rgba(59, 130, 246, 0.0)",
        borderWidth: 2,
        borderDash: [5, 5],
        tension: 0.4,
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
      {
        label: "Khách",
        data: activeUsersHistory.map(d => d.guests),
        borderColor: "#6b7280", // gray-500
        backgroundColor: "rgba(107, 114, 128, 0.0)",
        borderWidth: 2,
        borderDash: [5, 5],
        tension: 0.4,
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 4,
      }
    ]
  };

  const realtimeLineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(0,0,0,0.8)",
        titleColor: "#fff",
        bodyColor: "#10b981",
        padding: 10,
        boxPadding: 4,
        usePointStyle: true,
        callbacks: {
          label: (ctx) => `${ctx.raw} online`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false, drawBorder: false },
        ticks: { color: "#6b7280", font: { size: 10 } }
      },
      y: {
        beginAtZero: true,
        grid: { color: "rgba(255,255,255,0.05)", borderDash: [5, 5] },
        ticks: { color: "#6b7280", font: { size: 10 }, stepSize: 1 }
      }
    },
    animation: {
      duration: 500, // Smooth transition for realtime feel
    }
  };

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
          weekly={stats.weekly?.movies}
        />
        <DashboardCard
          title="Người Dùng"
          value={stats.totalUsers}
          icon={FiUsers}
          color="bg-indigo-500"
          weekly={stats.weekly?.users}
        />
        <DashboardCard
          title="Lượt Xem"
          value={stats.totalViews}
          icon={FiEye}
          color="bg-purple-500"
          weekly={stats.weekly?.views}
        />
        <DashboardCard
          title="Đang Trực Tuyến"
          value={stats.onlineNow}
          icon={FiActivity}
          color="bg-emerald-500"
          weekly={stats.weekly?.online}
          suffix="Lượt truy cập tuần"
        />
      </div>

      {/* Realtime Traffic View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#ffffff05] rounded-2xl p-6 border border-white/5 shadow-xl flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="flex items-center justify-between mb-4 z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                <FiActivity size={20} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Lưu lượng truy cập (Realtime)</h3>
                <div className="flex items-center gap-4 mt-1">
                  <p className="text-xs text-emerald-400 font-medium tracking-wide">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
                    {currentActiveUsers.total || 0} ĐANG TRỰC TUYẾN
                  </p>
                  <p className="text-xs text-gray-500 font-medium tracking-wide">
                    <span className="text-blue-400">{currentActiveUsers.users || 0} Thành viên</span>
                    <span className="mx-2">•</span>
                    <span className="text-gray-400">{currentActiveUsers.guests || 0} Khách</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="h-[250px] w-full z-10 mt-2">
            <ChartSlot type="line" data={realtimeLineData} options={realtimeLineOptions} />
          </div>
        </div>

        {/* Visits Summary */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="bg-[#ffffff05] flex-1 rounded-2xl p-4 lg:p-5 border border-white/5 shadow-xl flex items-center gap-4 relative overflow-hidden">
            <div className="p-4 bg-blue-500/10 rounded-xl text-blue-400 z-10">
              <FiMonitor size={28} />
            </div>
            <div className="z-10 w-full pr-2">
              <p className="text-sm text-gray-400">Truy cập hôm nay</p>
              <h4 className="text-2xl font-bold text-white">{visitsStats.today.total?.toLocaleString() || 0}</h4>
              <div className="flex justify-between items-center w-full mt-1 text-[11px] font-medium">
                <span className="text-blue-400">{visitsStats.today.userCount?.toLocaleString() || 0} TV</span>
                <span className="text-gray-500">{visitsStats.today.guestCount?.toLocaleString() || 0} Khách</span>
              </div>
            </div>
          </div>
          <div className="bg-[#ffffff05] flex-1 rounded-2xl p-4 lg:p-5 border border-white/5 shadow-xl flex items-center gap-4 relative overflow-hidden">
            <div className="p-4 bg-purple-500/10 rounded-xl text-purple-400 z-10">
              <FiGlobe size={28} />
            </div>
            <div className="z-10 w-full pr-2">
              <p className="text-sm text-gray-400">Trong tuần này</p>
              <h4 className="text-2xl font-bold text-white">{visitsStats.week.total?.toLocaleString() || 0}</h4>
              <div className="flex justify-between items-center w-full mt-1 text-[11px] font-medium">
                <span className="text-purple-400">{visitsStats.week.userCount?.toLocaleString() || 0} TV</span>
                <span className="text-gray-500">{visitsStats.week.guestCount?.toLocaleString() || 0} Khách</span>
              </div>
            </div>
          </div>
          <div className="bg-[#ffffff05] flex-1 rounded-2xl p-4 lg:p-5 border border-white/5 shadow-xl flex items-center gap-4 relative overflow-hidden">
            <div className="p-4 bg-pink-500/10 rounded-xl text-pink-400 z-10">
              <FiBarChart2 size={28} />
            </div>
            <div className="z-10 w-full pr-2">
              <p className="text-sm text-gray-400">Trong tháng này</p>
              <h4 className="text-2xl font-bold text-white">{visitsStats.month.total?.toLocaleString() || 0}</h4>
              <div className="flex justify-between items-center w-full mt-1 text-[11px] font-medium">
                <span className="text-pink-400">{visitsStats.month.userCount?.toLocaleString() || 0} TV</span>
                <span className="text-gray-500">{visitsStats.month.guestCount?.toLocaleString() || 0} Khách</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Analytics Chart */}
      <div className="w-full">
        <DeferredAdminSection minHeight="min-h-[420px]">
          <AnalyticsHistoryChart />
        </DeferredAdminSection>
      </div>

      <div className="w-full">
        <DeferredAdminSection minHeight="min-h-[420px]">
          <AnalyticsUniqueChart />
        </DeferredAdminSection>
      </div>

      <DeferredAdminSection minHeight="min-h-[420px]">
        <TrendingRanking />
      </DeferredAdminSection>

      {/* 2.5 Watch Time Trend */}
      <div className="bg-[#ffffff05] rounded-2xl p-6 border border-white/5 shadow-xl flex flex-col relative overflow-hidden group w-full">
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="flex items-center justify-between mb-6 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <FiTrendingUp size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide">Xu Hướng Thời Lượng Xem</h3>
              <p className="text-xs text-gray-500">Tổng thời gian tương tác thực tế trong 7 ngày qua</p>
            </div>
          </div>
        </div>

        <div className="h-[280px] w-full z-10">
          {isLoadingWatchTime ? (
            <div className="h-full flex items-center justify-center">
              <BarSpinner />
            </div>
          ) : watchTimeChart?.labels?.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
              <FiTrendingUp size={48} className="mb-2" />
              <span>Chưa có dữ liệu thống kê tuần này</span>
            </div>
          ) : (
               <ChartSlot type="line" data={watchTimeLineData} options={watchTimeLineOptions} />
          )}
        </div>
      </div>

      {/* 2.6 ADVANCED ANALYTICS (Phase 10.3) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
        {/* Peak Hours Heatmap */}
        <div className="xl:col-span-1 lg:col-span-2 bg-[#ffffff05] rounded-2xl p-6 border border-white/5 shadow-xl flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[80px] -translate-y-1/2 -translate-x-1/2 pointer-events-none" />
          <div className="flex items-center gap-3 mb-6 z-10">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <FiClock size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide">Khung Giờ Vàng</h3>
              <p className="text-xs text-gray-500">Mật độ xem phân bổ theo 24 giờ</p>
            </div>
          </div>
          <div className="h-[200px] w-full z-10">
            {isLoadingPeak ? (
               <div className="h-full flex items-center justify-center"><BarSpinner /></div>
            ) : peakHoursChart?.labels?.length === 0 ? (
               <div className="h-full flex items-center justify-center text-gray-500 opacity-50">Không có dữ liệu 24h</div>
            ) : (
               <ChartSlot type="line" data={peakHoursLineData} options={peakHoursLineOptions} />
            )}
          </div>
        </div>

        {/* Device Split */}
        <div className="bg-[#ffffff05] rounded-2xl p-6 border border-white/5 shadow-xl flex flex-col relative overflow-hidden">
          <div className="flex items-center gap-3 mb-2 z-10">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
              <FiSmartphone size={20} />
            </div>
            <h3 className="text-lg font-bold text-white tracking-wide">Thiết Bị & Nền Tảng</h3>
          </div>
          <div className="flex-1 min-h-[200px] relative flex items-center justify-center z-10">
            {isLoadingDevices ? (
              <BarSpinner />
            ) : devicesChart?.labels?.length === 0 ? (
              <span className="text-gray-500">Chưa có dữ liệu nền tảng</span>
            ) : (
              <ChartSlot type="doughnut" data={devicesDoughnutData} options={doughnutChartOptions} />
            )}
          </div>
        </div>

        {/* Global Retention Rate */}
        <div className="bg-[#ffffff05] rounded-2xl p-6 border border-white/5 shadow-xl flex flex-col items-center justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-[100px]" />
          
          <div className="z-10 text-center flex flex-col items-center gap-4">
            <div className="p-4 bg-purple-500/20 rounded-2xl text-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
              <FiTarget size={40} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-widest uppercase mb-2">Tỷ Lệ Giữ Chân</h3>
              <p className="text-xs text-gray-400 max-w-[200px] mx-auto leading-relaxed">
                Là tỷ số Thời Lượng Xem thực tế trên Thời Gian Phim quy định trung bình toàn rạp.
              </p>
            </div>
            <div className="relative mt-2">
              <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">
                {globalRetention}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2.8 Map Section */}
      <div className="w-full">
        <DeferredAdminSection minHeight="min-h-[460px]">
          <AnalyticsMap />
        </DeferredAdminSection>
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
              <ChartSlot type="bar" data={barChartData} options={barChartOptions} plugins={[barPosterPlugin]} />
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
              <ChartSlot type="doughnut" data={doughnutChartData} options={doughnutChartOptions} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOverviewTab;
