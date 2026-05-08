import React, { useState, useEffect, useCallback, useMemo } from "react";
import PaginationV2 from "components/common/PaginationV2";
import { playbackAPI } from "services/admin.service";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";

const PERIOD_OPTIONS = [
  { value: "day", label: "Theo ngày" },
  { value: "week", label: "Theo tuần" },
  { value: "month", label: "Theo tháng" },
];

const getBatchStateColor = (state) => {
  switch (state) {
    case "completed":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
    case "completed_with_errors":
      return "border-yellow-400/20 bg-yellow-400/10 text-yellow-300";
    case "running":
      return "border-blue-400/20 bg-blue-400/10 text-blue-300";
    case "failed":
      return "border-red-400/20 bg-red-400/10 text-red-300";
    case "skipped":
      return "border-gray-400/20 bg-gray-400/10 text-gray-300";
    default:
      return "border-white/10 bg-white/5 text-gray-300";
  }
};

const getBatchResultColor = (resultType) => {
  switch (resultType) {
    case "detected":
      return "text-emerald-300";
    case "no_match":
      return "text-gray-300";
    case "failed":
      return "text-red-300";
    case "completed":
      return "text-blue-300";
    default:
      return "text-gray-400";
  }
};

const formatBatchDateTime = (value) => {
  if (!value) return "Chưa có";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Không hợp lệ";

  return date.toLocaleString("vi-VN", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatBatchDuration = (durationMs) => {
  const seconds = Math.max(0, Math.round((Number(durationMs) || 0) / 1000));
  if (!seconds) return "0s";
  const minutes = Math.floor(seconds / 60);
  const remainSeconds = seconds % 60;
  if (!minutes) return `${remainSeconds}s`;
  return `${minutes}m ${remainSeconds}s`;
};

const getPriorityLabel = (prioritySource) => {
  switch (prioritySource) {
    case "recent_views":
      return "User xem hôm trước";
    case "banner":
      return "Banner";
    case "total_views":
      return "Lượt xem cao";
    case "backlog":
      return "Tồn đọng";
    default:
      return prioritySource || "Không rõ";
  }
};

const getBatchId = (batch) => batch?.batchId || batch?._id || batch?.id;
const getMovieKey = (movie) => movie?.movieId || movie?._id || movie?.id || `${movie?.order || ""}-${movie?.movieName || ""}`;

const AdminBatchAnalytics = () => {
  // Stats State
  const [period, setPeriod] = useState("day");
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState("");

  // History State
  const [batches, setBatches] = useState([]);
  const [historyPagination, setHistoryPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Selected Batch for details
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchMovies, setBatchMovies] = useState([]);
  const [moviePagination, setMoviePagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loadingMovies, setLoadingMovies] = useState(false);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    setStatsError("");
    try {
      const result = await playbackAPI.getIntroBatchStats({ period, limit: 14 });
      setStats(result);
    } catch (err) {
      setStatsError(err.message || "Không tải được thống kê batch");
    } finally {
      setLoadingStats(false);
    }
  }, [period]);

  const loadHistory = useCallback(async (page = 1) => {
    setLoadingHistory(true);
    try {
      const result = await playbackAPI.getIntroBatches({
        page,
        limit: historyPagination.limit,
      });
      setBatches(result.items || result.data || []);
      setHistoryPagination(result.pagination || { page, limit: historyPagination.limit, total: 0, totalPages: 0 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  }, [historyPagination.limit]);

  const loadBatchMovies = useCallback(async (batchId, page = 1) => {
    setLoadingMovies(true);
    try {
      const result = await playbackAPI.getIntroBatchMovies(batchId, {
        page,
        limit: moviePagination.limit,
      });
      setBatchMovies(result.items || result.data || []);
      setMoviePagination(result.pagination || { page, limit: moviePagination.limit, total: 0, totalPages: 0 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMovies(false);
    }
  }, [moviePagination.limit]);

  useEffect(() => {
    loadStats();
    loadHistory(1);
  }, [loadStats, loadHistory]);

  const handleSelectBatch = (batch) => {
    const batchId = getBatchId(batch);
    if (getBatchId(selectedBatch) === batchId) {
      setSelectedBatch(null);
    } else {
      setSelectedBatch(batch);
      loadBatchMovies(batchId, 1);
    }
  };

  const chartData = useMemo(() => {
    if (!stats?.groups) return [];
    return stats.groups.map(g => ({
      name: g.label || g.key || g._id,
      success: g.detectedMovies,
      failed: g.failedMovies,
      noMatch: g.noMatchMovies,
      total: g.totalMovies
    })).reverse();
  }, [stats]);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Stats Dashboard */}
      <div className="rounded-xl border border-white/5 bg-[#1a1a1a] shadow-lg p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <i className="fa-solid fa-chart-line text-primaryColor"></i>
              Thống Kê Nhận Diện AI
            </h2>
            <p className="text-sm text-gray-400 mt-1">Tổng quan về hiệu suất chạy Background Job</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="h-10 rounded-lg border border-white/10 bg-black/50 px-4 text-sm text-white outline-none focus:border-primaryColor"
            >
              {PERIOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              onClick={loadStats}
              disabled={loadingStats}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-black/50 text-gray-400 hover:bg-white/10 hover:text-white transition-all"
            >
              <i className={`fa-solid fa-rotate-right ${loadingStats ? "fa-spin" : ""}`}></i>
            </button>
          </div>
        </div>

        {statsError ? (
          <div className="text-red-400 text-sm bg-red-400/10 p-4 rounded-lg border border-red-400/20">{statsError}</div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="rounded-xl border border-white/5 bg-black/30 p-4 flex flex-col justify-center relative overflow-hidden">
                <span className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mb-1 z-10">Tổng Phim Đã Quét</span>
                <span className="text-2xl font-black text-white z-10">{stats?.totals?.totalMovies || 0}</span>
                <i className="fa-solid fa-film absolute -right-2 -bottom-2 text-5xl text-white/5 z-0"></i>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex flex-col justify-center relative overflow-hidden">
                <span className="text-emerald-400/80 text-[11px] font-bold uppercase tracking-wider mb-1 z-10">Tỷ lệ Thành Công</span>
                <span className="text-2xl font-black text-emerald-400 z-10">
                  {stats?.totals?.totalMovies ? Math.round(((stats.totals.detectedMovies || 0) / stats.totals.totalMovies) * 100) : 0}%
                </span>
                <i className="fa-solid fa-check-circle absolute -right-2 -bottom-2 text-5xl text-emerald-500/10 z-0"></i>
              </div>
              <div className="rounded-xl border border-gray-500/20 bg-gray-500/5 p-4 flex flex-col justify-center relative overflow-hidden">
                <span className="text-gray-400/80 text-[11px] font-bold uppercase tracking-wider mb-1 z-10">Tỷ lệ Không Khớp</span>
                <span className="text-2xl font-black text-gray-300 z-10">
                  {stats?.totals?.totalMovies ? Math.round(((stats.totals.noMatchMovies || 0) / stats.totals.totalMovies) * 100) : 0}%
                </span>
                <i className="fa-solid fa-ban absolute -right-2 -bottom-2 text-5xl text-gray-500/10 z-0"></i>
              </div>
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex flex-col justify-center relative overflow-hidden">
                <span className="text-red-400/80 text-[11px] font-bold uppercase tracking-wider mb-1 z-10">Tỷ lệ Lỗi (Failed)</span>
                <span className="text-2xl font-black text-red-400 z-10">
                  {stats?.totals?.totalMovies ? Math.round(((stats.totals.failedMovies || 0) / stats.totals.totalMovies) * 100) : 0}%
                </span>
                <i className="fa-solid fa-triangle-exclamation absolute -right-2 -bottom-2 text-5xl text-red-500/10 z-0"></i>
              </div>
            </div>

            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="name" stroke="#ffffff50" fontSize={12} tickMargin={10} />
                  <YAxis stroke="#ffffff50" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1a1a1a", borderColor: "#ffffff20", borderRadius: "8px" }}
                    itemStyle={{ fontSize: "13px", fontWeight: "bold" }}
                    labelStyle={{ color: "#888", marginBottom: "4px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                  <Bar dataKey="success" name="Thành công" stackId="a" fill="#34d399" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="noMatch" name="Không khớp" stackId="a" fill="#9ca3af" />
                  <Bar dataKey="failed" name="Lỗi" stackId="a" fill="#f87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      {/* History List */}
      <div className="rounded-xl border border-white/5 bg-[#1a1a1a] shadow-lg overflow-hidden">
        <div className="border-b border-white/5 bg-white/5 px-6 py-4 flex items-center justify-between">
          <h3 className="font-bold text-white flex items-center gap-2">
            <i className="fa-solid fa-clock-rotate-left text-blue-400"></i>
            Lịch sử Quét (Batch History)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/5 bg-black/40 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-6 py-4">Thời gian</th>
                <th className="px-6 py-4">Trigger</th>
                <th className="px-6 py-4 text-center">Tổng Phim</th>
                <th className="px-6 py-4 text-center">Thành Công</th>
                <th className="px-6 py-4 text-center">Thời lượng</th>
                <th className="px-6 py-4 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loadingHistory ? (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center text-gray-500">
                    <i className="fa-solid fa-circle-notch fa-spin text-2xl mb-2 text-primaryColor"></i>
                    <p>Đang tải lịch sử...</p>
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center text-gray-500">
                    Chưa có lịch sử quét.
                  </td>
                </tr>
              ) : (
                batches.map((batch) => {
                  const batchId = getBatchId(batch);
                  const isSelected = getBatchId(selectedBatch) === batchId;
                  return (
                    <React.Fragment key={batchId}>
                      <tr 
                        onClick={() => handleSelectBatch(batch)}
                        className={`cursor-pointer transition-colors ${isSelected ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"}`}
                      >
                        <td className="px-6 py-4 text-gray-300">
                          <div className="font-medium">{formatBatchDateTime(batch.startedAt)}</div>
                          <div className="text-xs text-gray-500 mt-0.5">Mẫu: {Math.round((Number(batch.options?.sampleSeconds) || 0) / 60) || 0}m</div>
                        </td>
                        <td className="px-6 py-4 text-gray-400">
                          <span className="uppercase text-xs border border-white/10 px-2 py-0.5 rounded bg-black/30">
                            {batch.trigger || "manual"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-white">{batch.totalMovies || 0}</td>
                        <td className="px-6 py-4 text-center font-bold text-emerald-400">{batch.detectedMovies || 0}</td>
                        <td className="px-6 py-4 text-center text-gray-400">{formatBatchDuration(batch.durationMs)}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border ${getBatchStateColor(batch.state)}`}>
                            {batch.state}
                          </span>
                        </td>
                      </tr>
                      {isSelected && (
                        <tr>
                          <td colSpan="6" className="p-0 border-t-0">
                            <div className="bg-black/50 p-6 border-b border-white/5 animate-fade-in">
                              <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                <i className="fa-solid fa-list-check text-primaryColor"></i>
                                Chi tiết phim trong Batch
                              </h4>
                              <div className="rounded-lg border border-white/5 bg-[#121212] overflow-hidden">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-white/5 text-gray-400 border-b border-white/5 uppercase">
                                    <tr>
                                      <th className="px-4 py-3">Tên Phim</th>
                                      <th className="px-4 py-3">Ưu Tiên</th>
                                      <th className="px-4 py-3">Kết quả</th>
                                      <th className="px-4 py-3 text-center">Tập (Tìm/Mẫu)</th>
                                      <th className="px-4 py-3 text-right">Time</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-white/5">
                                    {loadingMovies ? (
                                      <tr><td colSpan="5" className="p-8 text-center text-gray-500"><i className="fa-solid fa-spin fa-circle-notch"></i></td></tr>
                                    ) : batchMovies.length === 0 ? (
                                      <tr><td colSpan="5" className="p-8 text-center text-gray-500">Không có phim nào.</td></tr>
                                    ) : (
                                      batchMovies.map((movie) => (
                                        <tr key={getMovieKey(movie)} className="hover:bg-white/[0.02]">
                                          <td className="px-4 py-2.5 font-medium text-white">{movie.movieName || "Không rõ tên"}</td>
                                          <td className="px-4 py-2.5 text-gray-400">{getPriorityLabel(movie.prioritySource)}</td>
                                          <td className="px-4 py-2.5">
                                            <span className={`font-bold uppercase ${getBatchResultColor(movie.resultType)}`}>
                                              {movie.resultType}
                                            </span>
                                          </td>
                                          <td className="px-4 py-2.5 text-center text-gray-300">
                                            {(movie.detectedEpisodes || 0) + (movie.inferredEpisodes || 0)}/{movie.sampledEpisodes || 0}
                                          </td>
                                          <td className="px-4 py-2.5 text-right text-gray-400">{formatBatchDuration(movie.durationMs)}</td>
                                        </tr>
                                      ))
                                    )}
                                  </tbody>
                                </table>
                              </div>
                              <div className="mt-4 flex justify-between items-center text-xs text-gray-500">
                                <span>Tổng {moviePagination.total} phim</span>
                                <PaginationV2
                                  page={moviePagination.page}
                                  totalPages={Math.max(1, moviePagination.totalPages || 1)}
                                  onPageChange={(page) => loadBatchMovies(batchId, page)}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col items-center justify-between gap-4 bg-black/40 px-6 py-4 sm:flex-row">
          <span className="text-sm font-medium text-gray-400">
            Tổng cộng <span className="text-white font-bold">{historyPagination.total}</span> lượt chạy
          </span>
          <PaginationV2
            page={historyPagination.page}
            totalPages={Math.max(1, historyPagination.totalPages || 1)}
            onPageChange={(page) => loadHistory(page)}
          />
        </div>
      </div>
    </div>
  );
};

export default AdminBatchAnalytics;
