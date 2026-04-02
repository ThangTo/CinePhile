import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Line } from "react-chartjs-2";
import { statsAPI } from "services/admin.service";
import { BarSpinner } from "components/common/LoadingState";
import {
  FiCalendar,
  FiUsers,
  FiDatabase,
  FiRefreshCw,
  FiUserCheck,
} from "react-icons/fi";

const GRANULARITIES = [
  { key: "day",   label: "Theo Ngày" },
  { key: "week",  label: "Theo Tuần" },
  { key: "month", label: "Theo Tháng" },
  { key: "year",  label: "Theo Năm" },
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

function subtractDays(d, n) {
  const result = new Date(d);
  result.setDate(result.getDate() - n);
  return result;
}

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
      startOfWeek.setDate(nowVN.getDate() - ((nowVN.getDay() + 6) % 7));
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

function formatLabel(label, granularity) {
  if (!label) return "";
  if (granularity === "day") {
    const parts = label.split("-");
    return `${parts[2]}/${parts[1]}`;
  }
  if (granularity === "week") {
    const parts = label.split("-W");
    return `Tuần ${parts[1]}/${parts[0]?.slice(2)}`;
  }
  if (granularity === "month") {
    const [y, m] = label.split("-");
    return `Th${parseInt(m, 10)}/${y}`;
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
      <p className="text-lg font-bold text-white leading-tight">
        {value?.toLocaleString() ?? "—"}
      </p>
    </div>
  </div>
);

const AnalyticsUniqueChart = () => {
  const [granularity, setGranularity] = useState("month");
  const [dateRange, setDateRange] = useState(getDefaultRange("month"));
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
        const [uniqueRes, summaryRes] = await Promise.all([
          statsAPI.getUniqueVisits({
            granularity,
            from: dateRange.from,
            to: dateRange.to,
          }),
          statsAPI.getUniqueAnalyticsSummary(),
        ]);

        const rows = Array.isArray(uniqueRes)
          ? uniqueRes
          : uniqueRes?.data || [];

        setChartData(rows);
        setSummary(summaryRes?.summary || summaryRes || null);
      } catch (err) {
        console.error("AnalyticsUniqueChart error:", err);
        setError("Không thể tải dữ liệu unique visitors. Vui lòng thử lại.");
        setChartData([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [granularity, dateRange]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGranularityChange = (key) => {
    setGranularity(key);
    setDateRange(getDefaultRange(key));
  };

  const labels = useMemo(
    () => chartData.map((d) => formatLabel(d.label, granularity)),
    [chartData, granularity]
  );

  const lineChartData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: "Unique Visitors",
          data: chartData.map((d) => d.total),
          borderColor: "#10b981",
          backgroundColor: (ctx) => {
            const canvas = ctx.chart.ctx;
            const grad = canvas.createLinearGradient(0, 0, 0, 320);
            grad.addColorStop(0, "rgba(16, 185, 129, 0.35)");
            grad.addColorStop(1, "rgba(16, 185, 129, 0.0)");
            return grad;
          },
          borderWidth: 2.5,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: "#10b981",
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
              const labels = ["Unique", "Thành viên", "Khách"];
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

  // Granularity note
  const granularityNote = {
    day: "Unique visitors trong từng ngày",
    week: "Unique visitors thực sự trong từng tuần (SUNION Redis)",
    month: "Unique visitors thực sự trong từng tháng (SUNION Redis)",
    year: "Tổng unique theo tháng gộp lại theo năm",
  };

  return (
    <div className="bg-[#ffffff05] rounded-2xl border border-white/5 shadow-xl relative overflow-hidden">
      {/* Header glow — emerald */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] -translate-x-1/3 -translate-y-1/3 pointer-events-none" />

      {/* Card Header */}
      <div className="p-6 pb-4 border-b border-white/5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <FiUserCheck size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide">
                Người Dùng Unique
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {granularityNote[granularity]} · Cập nhật 23:55 mỗi ngày
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2 z-10">
            {/* Granularity Tabs */}
            <div className="flex bg-white/5 rounded-xl p-1 gap-1">
              {GRANULARITIES.map(({ key, label }) => (
                <button
                  key={key}
                  id={`unique-granularity-${key}`}
                  onClick={() => handleGranularityChange(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    granularity === key
                      ? "bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]"
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
                id="unique-date-from"
                value={dateRange.from}
                max={dateRange.to}
                onChange={(e) => setDateRange((r) => ({ ...r, from: e.target.value }))}
                className="bg-transparent text-xs text-gray-300 outline-none w-[110px] cursor-pointer"
              />
              <span className="text-gray-600 text-xs">→</span>
              <input
                type="date"
                id="unique-date-to"
                value={dateRange.to}
                min={dateRange.from}
                onChange={(e) => setDateRange((r) => ({ ...r, to: e.target.value }))}
                className="bg-transparent text-xs text-gray-300 outline-none w-[110px] cursor-pointer"
              />
            </div>

            <button
              id="unique-refresh-btn"
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
            icon={FiUserCheck}
            label="Unique/Tháng"
            value={summary.total}
            color="bg-emerald-500"
            tooltip="Tổng cộng unique visitors theo tháng. Mỗi tháng tính riêng — 1 người vào 2 tháng = 2."
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
            label="Tháng Ghi Nhận"
            value={summary.totalPeriods}
            color="bg-emerald-500"
          />
        </div>
      )}

      {summary?.oldestPeriod && (
        <p className="text-[10px] text-gray-600 px-6 pb-1 z-10 relative">
          Từ <span className="text-gray-400">{summary.oldestPeriod}</span>{" "}
          đến <span className="text-gray-400">{summary.newestPeriod}</span>
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
            <FiUserCheck size={40} className="mb-3 opacity-30" />
            <p className="text-sm">{error}</p>
            <button
              onClick={() => fetchData()}
              className="mt-3 px-4 py-1.5 text-xs bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors"
            >
              Thử lại
            </button>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[300px] flex flex-col items-center justify-center text-gray-500">
            <FiDatabase size={40} className="mb-3 opacity-30" />
            <p className="text-sm">Chưa có dữ liệu unique cho khoảng này</p>
            <p className="text-xs text-gray-600 mt-1">
              {granularity === "day"
                ? "Snapshot đầu tiên lúc 23:55 hôm nay"
                : "Dữ liệu tuần/tháng sẽ được tạo sau khi backend restart và snapshot chạy"}
            </p>
          </div>
        ) : (
          <>
            <div className="h-[300px] w-full">
              <Line data={lineChartData} options={lineChartOptions} />
            </div>

            {/* Data table for small count */}
            {chartData.length <= 14 && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-xs text-gray-400">
                  <thead>
                    <tr className="border-b border-white/5 text-gray-600 uppercase tracking-wider">
                      <th className="text-left py-2 pr-4">Thời Gian</th>
                      <th className="text-right pr-4">Unique</th>
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
                        <td className="text-right pr-4 text-emerald-400">
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

export default AnalyticsUniqueChart;
