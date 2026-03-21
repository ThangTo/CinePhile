import React, { useState, useEffect } from "react";
import { statsAPI } from "../../services/admin.service";
import {
  FiActivity,
  FiUsers,
  FiClock,
  FiEye,
  FiArrowUpRight,
  FiFilm,
  FiZap,
  FiStar,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { BarSpinner } from "components/common/LoadingState";

/* ─── Helpers ────────────────────────────────────────────────────── */
const fmtNum = (n = 0) => Number(n).toLocaleString("vi-VN");

const fmtTime = (mins = 0) => {
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}g ${m}p` : `${h}g`;
  }
  return `${mins}p`;
};

const getRankStyle = (rank) => {
  if (rank === 1) return "text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.7)] text-2xl";
  if (rank === 2) return "text-gray-300 drop-shadow-[0_0_8px_rgba(209,213,219,0.5)] text-2xl";
  if (rank === 3) return "text-amber-500 drop-shadow-[0_0_8px_rgba(217,119,6,0.5)] text-xl";
  return "text-gray-600 text-lg";
};

/* ─── Stat Chip ──────────────────────────────────────────────────── */
const colorClasses = {
  blue: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  amber: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  rose: "bg-rose-500/10 text-rose-400 border-rose-500/30",
};

const Chip = ({ icon: Icon, value, label, color }) => (
  <div
    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border
      shadow-[0_0_10px_rgba(0,0,0,0.1)] ${colorClasses[color] || colorClasses.blue}`}
  >
    <Icon size={11} />
    <span>{value}</span>
    {label && <span className="text-gray-500 font-normal hidden lg:inline">{label}</span>}
  </div>
);

/* ─── Episode Drawer ─────────────────────────────────────────────── */
const EpisodeDrawer = ({ movie }) => {
  const hasStats = movie.topEpisode || movie.totalEpisodeViews > 0;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className="mt-3 mx-1 rounded-xl border border-white/5 bg-black/20 backdrop-blur-sm overflow-hidden"
    >
      <div className="px-4 py-3">
        <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-3">
          📺 Thống kê theo tập
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {!hasStats ? (
            <div className="col-span-full py-2 text-center text-gray-500 italic text-xs">
              Chưa có dữ liệu thống kê chi tiết cho các tập phim này.
            </div>
          ) : (
            <>
              {/* Total Episode Views */}
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-gray-500">Tổng view các tập</span>
                <span className="text-base font-extrabold text-white">
                  {fmtNum(movie.totalEpisodeViews)}
                </span>
              </div>

              {/* Total Episode Watch Time */}
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-gray-500">Tổng thời gian xem tập</span>
                <span className="text-base font-extrabold text-emerald-400">
                  {movie.totalEpisodeWatchHours || 0}h
                </span>
              </div>

              {/* Top Episode */}
              {movie.topEpisode && (
                <div className="flex flex-col gap-0.5 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-gray-500">Tập được xem nhiều nhất</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm font-bold text-purple-300">
                      Tập {movie.topEpisode.episodeNum}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {fmtNum(movie.topEpisode.views)} lượt
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-[10px] text-blue-400">
                      <FiUsers size={9} />
                      {fmtNum(movie.topEpisode.uniqueViewers)} người duy nhất
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-amber-400">
                      <FiClock size={9} />
                      {fmtTime(movie.topEpisode.watchMinutes)}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/* ─── Movie Row ──────────────────────────────────────────────────── */
const MovieRow = ({ movie, index }) => {
  const [expanded, setExpanded] = useState(false);
  const isSeries = 
    movie.type === 'series' || 
    movie.type === 'tvshows' || 
    movie.type === 'hoathinh' || 
    (movie.totalEpisodes || 0) > 1;

  return (
    <motion.div
      layout
      key={movie.movieId}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.28, delay: index * 0.04 }}
      className={`group relative bg-white/[0.025] border border-white/[0.06]
        hover:border-rose-500/30 hover:bg-white/[0.04]
        rounded-2xl transition-all duration-300
        shadow-sm hover:shadow-[0_6px_30px_rgba(0,0,0,0.35)] overflow-hidden`}
    >
      {/* Subtle gradient hover glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-rose-500/0 via-rose-500/[0.025] to-transparent
        opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div
        className="flex items-center gap-3 p-3.5 cursor-pointer"
        onClick={() => isSeries && setExpanded((v) => !v)}
      >
        {/* Rank */}
        <div className="flex-shrink-0 w-9 text-center">
          <span className={`font-black ${getRankStyle(index + 1)}`}>
            #{index + 1}
          </span>
        </div>

        {/* Poster */}
        <div className="flex-shrink-0 w-12 h-[68px] rounded-xl overflow-hidden border border-white/10 shadow-lg">
          {movie.poster ? (
            <img
              src={movie.poster}
              alt={movie.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full bg-white/5 flex items-center justify-center">
              <FiFilm className="text-gray-600" size={18} />
            </div>
          )}
        </div>

        {/* Info & Metrics */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-sm font-bold text-white truncate group-hover:text-rose-100 transition-colors">
              {movie.name}
            </h4>
            {isSeries && (
              <span className="hidden sm:inline text-[9px] uppercase tracking-wider px-1.5 py-0.5
                bg-purple-500/15 text-purple-400 border border-purple-500/20 rounded-md font-bold flex-shrink-0">
                Series
              </span>
            )}
            {movie.isTrending && (
              <span className="hidden md:flex items-center gap-1 text-[9px] uppercase tracking-wider px-1.5 py-0.5
                bg-rose-500/15 text-rose-400 border border-rose-500/25 rounded-md font-black flex-shrink-0 animate-pulse">
                <FiZap size={9} /> Hot
              </span>
            )}
          </div>

          {/* Chips */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <Chip icon={FiEye} value={fmtNum(movie.views)} label="views" color="blue" />
            <Chip icon={FiUsers} value={fmtNum(movie.uniqueViewers)} label="khán giả" color="emerald" />
            <Chip icon={FiClock} value={fmtTime(movie.watchMinutes)} color="amber" />
            {movie.velocity > 0 && (
              <Chip icon={FiArrowUpRight} value={`${movie.velocity}/h`} color="rose" />
            )}
          </div>
        </div>

        {/* Expand hint for series */}
        {isSeries && (
          <div className="flex-shrink-0 hidden sm:flex items-center">
            <motion.div
              animate={{ rotate: expanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-gray-600 group-hover:text-rose-400 transition-colors"
            >
              <FiStar size={14} />
            </motion.div>
          </div>
        )}
      </div>

      {/* Expandable Episode Drawer */}
      <AnimatePresence>
        {expanded && <EpisodeDrawer movie={movie} />}
      </AnimatePresence>
    </motion.div>
  );
};

/* ─── Main Component ─────────────────────────────────────────────── */
const TrendingRanking = () => {
  const [timeframe, setTimeframe] = useState("today");
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      setIsLoading(true);
      try {
        const data = await statsAPI.getTrendingMovies(timeframe);
        setMovies(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch trending movies:", error);
        setMovies([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTrending();
  }, [timeframe]);

  const tabs = [
    { id: "today", label: "Hôm Nay" },
    { id: "week", label: "Tuần Này" },
    { id: "month", label: "Tháng Này" },
  ];

  return (
    <div className="relative bg-[#ffffff04] rounded-2xl border border-white/[0.06] shadow-2xl overflow-hidden w-full mb-8">
      {/* Ambient glows */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-rose-500/8 rounded-full blur-[90px] -translate-y-1/3 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-56 h-56 bg-violet-500/8 rounded-full blur-[70px] translate-y-1/3 -translate-x-1/4 pointer-events-none" />

      {/* Glass inner surface */}
      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-7">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-rose-500/20 to-rose-500/5 rounded-xl
              shadow-[0_0_24px_rgba(244,63,94,0.25)] border border-rose-500/20">
              <FiActivity size={22} className="text-rose-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-wide">Top Phim Thịnh Hành</h3>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Phim bộ: nhấn để xem thống kê từng tập
              </p>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex items-center bg-black/40 backdrop-blur-md p-1 rounded-xl border border-white/[0.06]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTimeframe(tab.id)}
                className={`relative px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 ${
                  timeframe === tab.id
                    ? "text-white"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                }`}
              >
                {timeframe === tab.id && (
                  <motion.div
                    layoutId="activeTrendingTab"
                    className="absolute inset-0 bg-gradient-to-r from-rose-500/25 to-rose-600/15
                      border border-rose-500/40 rounded-lg shadow-[0_0_16px_rgba(244,63,94,0.2)]"
                    transition={{ type: "spring", stiffness: 340, damping: 28 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="min-h-[320px]">
          {isLoading ? (
            <div className="h-80 flex items-center justify-center">
              <BarSpinner />
            </div>
          ) : movies.length === 0 ? (
            <div className="h-80 flex flex-col items-center justify-center gap-3 text-gray-600 opacity-60">
              <FiActivity size={44} />
              <p className="text-sm font-medium">Chưa có dữ liệu cho khoảng thời gian này</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              <AnimatePresence mode="popLayout">
                {movies.map((movie, index) => (
                  <MovieRow key={movie.movieId?.toString()} movie={movie} index={index} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrendingRanking;
