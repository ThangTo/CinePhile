import React, { Suspense, lazy, useState, useEffect, useCallback, useMemo } from "react";
import { statsAPI } from "services/admin.service";
import { BarSpinner } from "components/common/LoadingState";
import {
  FiCalendar,
  FiTrendingUp,
  FiUsers,
  FiEye,
  FiDatabase,
  FiRefreshCw,
  FiClock,
} from "react-icons/fi";

const AdminChart = lazy(() => import("./AdminChart"));

const GRANULARITIES = [
  { key: "day",   label: "Theo Ngày",   icon: FiCalendar },
  { key: "week",  label: "Theo Tuần",   icon: FiClock },
  { key: "month", label: "Theo Tháng",  icon: FiTrendingUp },
  { key: "year",  label: "Theo Năm",    icon: FiDatabase },
];

// Helper: format a Date to 'YYYY-MM-DD' using VN timezone via Intl
function toVNDateStr(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

// Helper: subtract days from today in VN timezone
function subtractDays(d, n) {
  const result = new Date(d);
  result.setDate(result.getDate() - n);
  return result;
}

// Default date ranges for each granularity
function getDefaultRange(granularity) {
  const nowVN = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" })
  );
  const today = toVNDateStr(nowVN);

  switch (granularity) {
    case "day":
      return { from: toVNDateStr(subtractDays(nowVN, 29)), to: today };
    case "week": {
      const startOfWeek = new Date(nowVN);
      startOfWeek.setDate(nowVN.getDate() - ((nowVN.getDay() + 6) % 7)); // Monday
      const from11WeeksAgo = new Date(startOfWeek);
      from11WeeksAgo.setDate(startOfWeek.getDate() - 77);
      return { from: toVNDateStr(from11WeeksAgo), to: today };
    }
    case "month": {
      const d = new Date(nowVN);
      d.setMonth(d.getMonth() - 11, 1);
      return { from: toVNDateStr(d), to: today };
    }
    case "year": {
      const d = new Date(nowVN);
      d.setFullYear(d.getFullYear() - 4, 0, 1);
      return { from: toVNDateStr(d), to: today };
    }
    default:
      return { from: toVNDateStr(subtractDays(nowVN, 29)), to: today };
  }
}

// Format label for display
function formatLabel(label, granularity) {
  if (!label) return "";
  if (granularity === "day") {
    // "2026-03-15" → "15/03"
    const parts = label.split("-");
    return `${parts[2]}/${parts[1]}`;
  }
  if (granularity === "week") {
    // "2026-W12" → "T12/26"
    const parts = label.split("-W");
    return `Tuần ${parts[1]}/${parts[0]?.slice(2)}`;
  }
  if (granularity === "month") {
    // "2026-03" → "Th3/2026"
    const [y, m] = label.split("-");
    return `Th${parseInt(m, 10)}/${y}`;
  }
  if (granularity === "year") {
    return label;
  }
  return label;
}

const SummaryBadge = ({ icon: Icon, label, value, color, tooltip }) => (
  <div
    className={`flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 border border-white/5 ${
      tooltip ? "cursor-help" : ""
    }`}
    title={tooltip || undefined}
  >
    <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
      <Icon size={16} className={color.replace("bg-", "text-")} />
    </div>
    <div>
      <p className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1">
        {label}
        {tooltip && <span className="text-gray-600">ⓘ</span>}
      </p>
      <p className="text-lg font-bold text-white leading-tight">{value?.toLocaleString() ?? "—"}</p>
    </div>
  </div>
);

const AnalyticsHistoryChart = () => {
  const [granularity, setGranularity] = useState("day");
  const [dateRange, setDateRange] = useState(getDefaultRange("day"));
  const [chartData, setChartData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);

      try {
        const [historicalRes, summaryRes] = await Promise.all([
          statsAPI.getHistoricalVisits({
            granularity,
            from: dateRange.from,
            to: dateRange.to,
          }),
          statsAPI.getAnalyticsSummary(),
        ]);

        // Handle both { data: [...] } and direct array forms
        const rows = Array.isArray(historicalRes)
          ? historicalRes
          : historicalRes?.data || [];

        setChartData(rows);
        setSummary(summaryRes?.summary || summaryRes || null);
      } catch (err) {
        console.error("AnalyticsHistoryChart error:", err);
        setError("Không thể tải dữ liệu lịch sử. Vui lòng thử lại.");
        setChartData([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [granularity, dateRange]
  );

  // Refetch when granularity or date range changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // When granularity changes, reset date range
  const handleGranularityChange = (key) => {
    setGranularity(key);
    setDateRange(getDefaultRange(key));
  };

  // Chart.js datasets
  const labels = useMemo(
    () => chartData.map((d) => formatLabel(d.label, granularity)),
    [chartData, granularity]
  );

  const lineChartData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: "Tổng truy cập",
          data: chartData.map((d) => d.total),
          borderColor: "#6366f1",
          backgroundColor: (ctx) => {
            const canvas = ctx.chart.ctx;
            const grad = canvas.createLinearGradient(0, 0, 0, 320);
            grad.addColorStop(0, "rgba(99, 102, 241, 0.35)");
            grad.addColorStop(1, "rgba(99, 102, 241, 0.0)");
            return grad;
          },
          borderWidth: 2.5,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: "#6366f1",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: chartData.length <= 31 ? 4 : 2,
          pointHoverRadius: 6,
        },
        {
          label: "Thành viên",
          data: chartData.map((d) => d.userCount),
          borderColor: "#3b82f6",
          backgroundColor: "transparent",
          borderWidth: 2,
          borderDash: [5, 5],
          tension: 0.4,
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 5,
        },
        {
          label: "Khách",
          data: chartData.map((d) => d.guestCount),
          borderColor: "#6b7280",
          backgroundColor: "transparent",
          borderWidth: 1.5,
          borderDash: [3, 4],
          tension: 0.4,
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 5,
        },
      ],
    }),
    [labels, chartData]
  );

  const lineChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "top",
          align: "end",
          labels: {
            color: "#9ca3af",
            font: { size: 11, family: "'Inter', sans-serif" },
            usePointStyle: true,
            pointStyle: "circle",
            padding: 16,
            boxWidth: 8,
          },
        },
        tooltip: {
          backgroundColor: "rgba(0,0,0,0.85)",
          titleColor: "#fff",
          bodyColor: "#d1d5db",
          padding: 12,
          cornerRadius: 8,
          displayColors: true,
          callbacks: {
            title: (items) => {
              if (!items.length) return "";
              const idx = items[0].dataIndex;
              return chartData[idx]?.label || items[0].label;
            },
            label: (ctx) => {
              const labels = ["Tổng", "Thành viên", "Khách"];
              return ` ${labels[ctx.datasetIndex] ?? ctx.dataset.label}: ${ctx.raw?.toLocaleString()}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false, drawBorder: false },
          ticks: {
            color: "#6b7280",
            font: { size: 10, family: "'Inter', sans-serif" },
            maxRotation: 45,
            minRotation: 0,
            maxTicksLimit: 20,
          },
        },
        y: {
          beginAtZero: true,
          grid: { color: "rgba(255,255,255,0.05)", borderDash: [5, 5], drawBorder: false },
          ticks: {
            color: "#6b7280",
            font: { size: 10, family: "'Inter', sans-serif" },
            callback: (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v),
          },
        },
      },
      interaction: { mode: "index", intersect: false },
    }),
    [chartData]
  );

  return (
    <div className="bg-[#ffffff05] rounded-2xl border border-white/5 shadow-xl relative overflow-hidden">
      {/* Header glow */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[100px] -translate-x-1/3 -translate-y-1/3 pointer-events-none" />

      {/* Card Header */}
      <div className="p-6 pb-4 border-b border-white/5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <FiTrendingUp size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide">Lịch Sử Lưu Lượng Truy Cập</h3>
              <p className="text-xs text-gray-500 mt-0.5">Dữ liệu lâu dài từ MongoDB · Cập nhật 23:55 mỗi ngày</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2 z-10">
            {/* Granularity Tabs */}
            <div className="flex bg-white/5 rounded-xl p-1 gap-1">
              {GRANULARITIES.map(({ key, label }) => (
                <button
                  key={key}
                  id={`analytics-granularity-${key}`}
                  onClick={() => handleGranularityChange(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    granularity === key
                      ? "bg-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Date Range */}
            <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-1.5 border border-white/5">
              <FiCalendar size={13} className="text-gray-500" />
              <input
                type="date"
                id="analytics-date-from"
                value={dateRange.from}
                max={dateRange.to}
                onChange={(e) => setDateRange((r) => ({ ...r, from: e.target.value }))}
                className="bg-transparent text-xs text-gray-300 outline-none w-[110px] cursor-pointer"
              />
              <span className="text-gray-600 text-xs">→</span>
              <input
                type="date"
                id="analytics-date-to"
                value={dateRange.to}
                min={dateRange.from}
                onChange={(e) => setDateRange((r) => ({ ...r, to: e.target.value }))}
                className="bg-transparent text-xs text-gray-300 outline-none w-[110px] cursor-pointer"
              />
            </div>

            {/* Refresh button */}
            <button
              id="analytics-refresh-btn"
              onClick={() => fetchData(true)}
              disabled={isRefreshing}
              className="p-2 bg-white/5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all border border-white/5 disabled:opacity-50"
              title="Làm mới"
            >
              <FiRefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* All-Time Summary Badges */}
      {summary && (
        <div className="px-6 pt-4 pb-2 grid grid-cols-2 sm:grid-cols-4 gap-3 z-10 relative">
          <SummaryBadge
            icon={FiEye}
            label="Tổng Lượt/Ngày"
            value={summary.total}
            color="bg-indigo-500"
            tooltip="Tổng cộng lượt truy cập theo từng ngày (Daily Sessions). Khác với Unique Visitors — cùng 1 người vào 3 ngày khác nhau = 3 lượt."
          />
          <SummaryBadge
            icon={FiUsers}
            label="Thành Viên"
            value={summary.userCount}
            color="bg-blue-500"
          />
          <SummaryBadge
            icon={FiUsers}
            label="Khách"
            value={summary.guestCount}
            color="bg-gray-500"
          />
          <SummaryBadge
            icon={FiDatabase}
            label="Ngày Ghi Nhận"
            value={summary.totalDays}
            color="bg-emerald-500"
          />
        </div>
      )}

      {summary?.oldestDate && (
        <p className="text-[10px] text-gray-600 px-6 pb-1 z-10 relative">
          Từ <span className="text-gray-400">{summary.oldestDate}</span>{" "}
          đến <span className="text-gray-400">{summary.newestDate}</span>
        </p>
      )}

      {/* Chart Area */}
      <div className="px-6 pb-6 pt-2 z-10 relative">
        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center">
            <BarSpinner />
          </div>
        ) : error ? (
          <div className="h-[300px] flex flex-col items-center justify-center text-gray-500">
            <FiTrendingUp size={40} className="mb-3 opacity-30" />
            <p className="text-sm">{error}</p>
            <button
              onClick={() => fetchData()}
              className="mt-3 px-4 py-1.5 text-xs bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition-colors"
            >
              Thử lại
            </button>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[300px] flex flex-col items-center justify-center text-gray-500">
            <FiDatabase size={40} className="mb-3 opacity-30" />
            <p className="text-sm">Chưa có dữ liệu trong khoảng thời gian này</p>
            <p className="text-xs text-gray-600 mt-1">
              Snapshot đầu tiên sẽ được tạo tự động lúc 23:55 hôm nay
            </p>
          </div>
        ) : (
          <>
            <div className="h-[300px] w-full">
              <Suspense fallback={<div className="h-full flex items-center justify-center"><BarSpinner /></div>}>
                <AdminChart type="line" data={lineChartData} options={lineChartOptions} />
              </Suspense>
            </div>

            {/* Data table for small counts */}
            {chartData.length <= 14 && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-xs text-gray-400">
                  <thead>
                    <tr className="border-b border-white/5 text-gray-600 uppercase tracking-wider">
                      <th className="text-left py-2 pr-4">Thời Gian</th>
                      <th className="text-right pr-4">Tổng</th>
                      <th className="text-right pr-4">Thành Viên</th>
                      <th className="text-right">Khách</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...chartData].reverse().map((row, i) => (
                      <tr
                        key={row.label}
                        className={`border-b border-white/[0.03] ${
                          i === 0 ? "text-white font-semibold" : ""
                        }`}
                      >
                        <td className="py-1.5 pr-4">{row.label}</td>
                        <td className="text-right pr-4 text-indigo-400">
                          {row.total?.toLocaleString()}
                        </td>
                        <td className="text-right pr-4 text-blue-400">
                          {row.userCount?.toLocaleString()}
                        </td>
                        <td className="text-right text-gray-500">
                          {row.guestCount?.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AnalyticsHistoryChart;
