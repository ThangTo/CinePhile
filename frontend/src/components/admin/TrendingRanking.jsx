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
import { getOptimizedImageUrl } from "constants/imageSizes";

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

const AUDIO_LABELS = {
  vietsub: "Phụ đề",
  thuyetminh: "Thuyết minh",
  longtieng: "Lồng tiếng",
  unknown: "Khác",
};

const getAudioLabel = (audioType) => {
  if (!audioType) return "—";
  const key = audioType.toLowerCase().replace(/[_-]/g, '');
  return AUDIO_LABELS[key] || audioType;
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

/* ─── User Popup (mini table) ────────────────────────────────────── */
const UserViewerPopup = ({ viewers, episodeLabel, audioLabel, onClose }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    transition={{ duration: 0.15 }}
    className="absolute bottom-full mb-2 right-0 w-64 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
  >
    {/* Header */}
    <div className="px-3 py-2 border-b border-white/5 bg-black/30">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
        Tập {episodeLabel}
        {audioLabel && <span className="text-gray-600 ml-1">· {audioLabel}</span>}
      </p>
      <p className="text-[10px] text-gray-600 mt-0.5">Top viewers — thời gian xem</p>
    </div>
    {/* List */}
    <div className="max-h-48 overflow-y-auto custom-scrollbar">
      {viewers.length === 0 ? (
        <div className="px-3 py-4 text-center text-gray-600 text-xs italic">Chưa có user đăng nhập</div>
      ) : (
        viewers.map((v, i) => (
          <div
            key={v.userId || i}
            className="flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.03] transition-colors border-b border-white/[0.03] last:border-0"
          >
            <div className="w-7 h-7 rounded-full overflow-hidden border border-white/10 flex-shrink-0">
              {v.avatar ? (
                <img src={v.avatar} alt={v.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold">
                  {(v.name || "?").charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white truncate">{v.name}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-amber-400 font-medium">{fmtTime(v.watchMinutes)}</span>
                <span className="text-[10px] text-gray-600">·</span>
                <span className="text-[10px] text-blue-400">{v.viewCount || 1}x</span>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  </motion.div>
);

/* ─── Viewer Button ───────────────────────────────────────────────── */
const ViewerButton = ({ viewers, episodeLabel, audioLabel }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
          viewers.length > 0
            ? "bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20 cursor-pointer"
            : "bg-black/20 text-gray-600 border-white/5 cursor-default"
        }`}
      >
        <FiUsers size={10} />
        {viewers.length > 0 ? `${viewers.length} người` : "—"}
      </button>

      <AnimatePresence>
        {open && viewers.length > 0 && (
          <UserViewerPopup
            viewers={viewers}
            episodeLabel={episodeLabel}
            audioLabel={audioLabel}
            onClose={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Backdrop to close */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
};

/* ─── Episode Row ─────────────────────────────────────────────────── */
const EpisodeRow = ({ ep, audioFilter, episodeLabel }) => {
  // Show the primary variant (based on filter) or the first one
  const variant = audioFilter === 'all'
    ? ep.variants?.[0]
    : (ep.variants?.find(v => v.audioType === audioFilter) || ep.variants?.[0]);

  const label = episodeLabel || ep.episodeNum;
  const audioLabel = variant ? getAudioLabel(variant.audioType) : null;

  // For "all" filter, aggregate top viewers across variants
  const allViewers = audioFilter === 'all'
    ? (ep.variants || []).flatMap(v => v.topViewers || []).slice(0, 3)
    : (variant?.topViewers || []);

  return (
    <div className="grid grid-cols-[auto_1fr_auto] gap-3 items-center bg-white/[0.025] hover:bg-white/[0.05] border border-white/[0.04] rounded-xl px-3 py-2.5 transition-colors">
      {/* Episode number */}
      <div className="flex-shrink-0 text-center min-w-[44px]">
        <div className="text-[9px] font-bold text-gray-600 uppercase tracking-wider mb-0.5">Tập</div>
        <div className="text-white font-black text-base leading-none mt-1">{ep.episodeNum}</div>
        {audioFilter !== 'all' && audioLabel && (
          <div className="text-[9px] text-gray-500 mt-0.5 leading-tight">{audioLabel}</div>
        )}
      </div>

      {/* Stats */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <div className="flex items-center gap-1">
          <FiEye size={11} className="text-blue-400" />
          <span className="text-xs font-semibold text-blue-300">{fmtNum(ep.views)}</span>
          <span className="text-[10px] text-gray-500">lượt</span>
        </div>
        <div className="flex items-center gap-1">
          <FiClock size={11} className="text-amber-400" />
          <span className="text-xs font-semibold text-amber-300">{fmtTime(ep.watchMinutes)}</span>
        </div>
        <div className="flex items-center gap-1">
          <FiUsers size={11} className="text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-300">{fmtNum(ep.uniqueViewers)}</span>
        </div>
      </div>

      {/* Audio variants + viewers */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Show audio variant badges if multiple */}
        {ep.variants && ep.variants.length > 1 && audioFilter === 'all' && (
          <div className="flex gap-1">
            {ep.variants.map(v => (
              <span
                key={v.audioType}
                className="px-1.5 py-0.5 rounded text-[9px] font-bold border bg-white/5 text-gray-400 border-white/10"
                title={getAudioLabel(v.audioType)}
              >
                {getAudioLabel(v.audioType)}
              </span>
            ))}
          </div>
        )}

        <ViewerButton
          viewers={allViewers}
          episodeLabel={label}
          audioLabel={audioFilter !== 'all' ? audioLabel : null}
        />
      </div>
    </div>
  );
};

/* ─── Episode Drawer ─────────────────────────────────────────────── */
const EpisodeDrawer = ({ movie }) => {
  const episodes = movie.episodes || [];
  const audioTypes = movie.audioTypes || [];
  const topEp = movie.topEpisode;
  const hasEps = episodes.length > 0;

  const [audioFilter, setAudioFilter] = useState('all');

  const filteredEps = audioFilter === 'all'
    ? episodes
    : episodes.filter(ep =>
        ep.variants?.some(v => v.audioType === audioFilter)
      );

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className="mt-3 mx-1 rounded-xl border border-white/5 bg-black/20 backdrop-blur-sm overflow-hidden"
    >
      <div className="px-4 py-3 space-y-3">
        {/* ── Header: top stats summary ───────────────────────────── */}
        {hasEps && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-gray-500">Tổng view các tập</span>
              <span className="text-base font-extrabold text-white">
                {fmtNum(episodes.reduce((s, e) => s + e.views, 0))}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-gray-500">Tổng thời gian xem</span>
              <span className="text-base font-extrabold text-emerald-400">
                {movie.totalEpisodeWatchHours || 0}h
              </span>
            </div>
            {topEp && (
              <div className="flex flex-col gap-0.5 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-gray-500">Tập hot nhất</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-bold text-purple-300">
                    Tập {topEp.episodeNum}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {fmtNum(topEp.views)} lượt
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-purple-400 font-medium">
                    {getAudioLabel(topEp.audioType) || '—'}
                  </span>
                  {topEp.serverName && (
                    <span className="text-[10px] text-gray-600 truncate max-w-[80px]">
                      {topEp.serverName}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-[10px] text-amber-400">
                    <FiClock size={9} />
                    {fmtTime(topEp.watchMinutes)}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-blue-400">
                    <FiUsers size={9} />
                    {fmtNum(topEp.uniqueViewers)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Audio filter + episode list ─────────────────────────── */}
        {!hasEps ? (
          <div className="py-3 text-center text-gray-500 italic text-xs">
            Chưa có dữ liệu thống kê chi tiết cho các tập phim này.
          </div>
        ) : (
          <>
            {/* Audio filter pills */}
            {audioTypes.length > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-widest text-gray-600 font-bold">Chi tiết từng tập</p>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setAudioFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                      audioFilter === 'all'
                        ? "bg-white/10 text-white border-white/20"
                        : "bg-transparent text-gray-500 border-white/5 hover:border-white/10 hover:text-gray-300"
                    }`}
                  >
                    Tất cả
                  </button>
                  {audioTypes.map(at => (
                    <button
                      key={at}
                      onClick={() => setAudioFilter(at)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                        audioFilter === at
                          ? "bg-white/10 text-white border-white/20"
                          : "bg-transparent text-gray-500 border-white/5 hover:border-white/10 hover:text-gray-300"
                      }`}
                    >
                      {getAudioLabel(at)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {audioTypes.length <= 1 && (
              <p className="text-[10px] uppercase tracking-widest text-gray-600 font-bold">Chi tiết từng tập</p>
            )}

            {/* Episode rows */}
            <div className="flex flex-col gap-1.5 max-h-[380px] overflow-y-auto pr-0.5 custom-scrollbar">
              {filteredEps.length === 0 ? (
                <div className="py-3 text-center text-gray-600 italic text-xs">
                  Không có tập nào cho loại audio này.
                </div>
              ) : (
                filteredEps.map(ep => (
                  <EpisodeRow
                    key={`${ep.episodeNum}-${audioFilter}`}
                    ep={ep}
                    audioFilter={audioFilter}
                  />
                ))
              )}
            </div>
          </>
        )}
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
      <div className="absolute inset-0 bg-gradient-to-r from-rose-500/0 via-rose-500/[0.025] to-transparent
        opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div
        className="flex items-center gap-3 p-3.5 cursor-pointer"
        onClick={() => isSeries && setExpanded(v => !v)}
      >
        <div className="flex-shrink-0 w-9 text-center">
          <span className={`font-black ${getRankStyle(index + 1)}`}>#{index + 1}</span>
        </div>

        <div className="flex-shrink-0 w-12 h-[68px] rounded-xl overflow-hidden border border-white/10 shadow-lg">
          {movie.poster ? (
            <img
              src={getOptimizedImageUrl(movie.poster, "POSTER_THUMB") || movie.poster}
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

          <div className="flex flex-wrap gap-1.5 items-center">
            <Chip icon={FiEye} value={fmtNum(movie.views)} label="views" color="blue" />
            <Chip icon={FiUsers} value={fmtNum(movie.uniqueViewers)} label="khán giả" color="emerald" />
            <Chip icon={FiClock} value={fmtTime(movie.watchMinutes)} color="amber" />
            {movie.velocity > 0 && (
              <Chip icon={FiArrowUpRight} value={`${movie.velocity}/h`} color="rose" />
            )}
          </div>
        </div>

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

      <AnimatePresence>
        {expanded && <EpisodeDrawer movie={movie} />}
      </AnimatePresence>
    </motion.div>
  );
};

/* ─── Main ───────────────────────────────────────────────────────── */
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
      <div className="absolute top-0 right-0 w-72 h-72 bg-rose-500/8 rounded-full blur-[90px] -translate-y-1/3 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-56 h-56 bg-violet-500/8 rounded-full blur-[70px] translate-y-1/3 -translate-x-1/4 pointer-events-none" />

      <div className="relative z-10 p-6">
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
