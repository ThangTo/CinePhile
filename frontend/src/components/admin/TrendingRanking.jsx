import React, { useState, useEffect } from "react";
import { statsAPI } from "../../services/admin.service";
import { FiTrendingUp, FiActivity, FiUsers, FiClock, FiEye, FiArrowUpRight } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { BarSpinner } from "components/common/LoadingState";

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

  const formatWatchTime = (minutes) => {
    if (!minutes) return "0 phút";
    if (minutes >= 60) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return `${h} giờ ${m} phút`;
    }
    return `${minutes} phút`;
  };

  return (
    <div className="bg-[#ffffff05] rounded-2xl p-6 border border-white/5 shadow-xl flex flex-col relative overflow-hidden group w-full mb-8">
      {/* Thẩm mỹ Glassmorphism / Backdrop effects */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/4 pointer-events-none" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 z-10 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-500/10 rounded-xl text-rose-500 shadow-[0_0_20px_rgba(243,24,96,0.2)]">
            <FiActivity size={24} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-wide">Top Phim Thịnh Hành</h3>
            <p className="text-xs text-gray-400 mt-1">Sắp xếp theo tổng thời lượng tương tác</p>
          </div>
        </div>

        {/* Timeframe Filter Buttons */}
        <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTimeframe(tab.id)}
              className={`relative px-5 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all duration-300 ${
                timeframe === tab.id
                  ? "text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {timeframe === tab.id && (
                <motion.div
                  layoutId="activeTabTrending"
                  className="absolute inset-0 bg-rose-500/20 shadow-[0_0_15px_rgba(243,24,96,0.2)] border border-rose-500/50 rounded-lg"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="z-10 w-full min-h-[350px]">
        {isLoading ? (
          <div className="h-[350px] flex items-center justify-center">
            <BarSpinner />
          </div>
        ) : movies.length === 0 ? (
          <div className="h-[350px] flex flex-col items-center justify-center text-gray-500 opacity-50">
            <FiActivity size={48} className="mb-3" />
            <p>Chưa có dữ liệu thống kê cho {tabs.find((t) => t.id === timeframe)?.label}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <AnimatePresence>
              {movies.map((movie, index) => (
                <motion.div
                  layout
                  key={movie.movieId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, type: "spring" }}
                  className="group relative flex items-center gap-4 bg-white/[0.02] border border-white/5 hover:border-rose-500/30 hover:bg-white/[0.05] p-3 rounded-2xl transition-all duration-300 cursor-default shadow-sm hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden"
                >
                  {/* Subtle hover glow inside the card */}
                  <div className="absolute inset-0 bg-gradient-to-r from-rose-500/0 via-rose-500/[0.02] to-rose-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                  {/* Rank Badge */}
                  <div className="flex-shrink-0 w-10 flex flex-col items-center justify-center">
                    <span
                      className={`text-xl font-extrabold ${
                        index === 0
                          ? "text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]"
                          : index === 1
                          ? "text-gray-300 drop-shadow-[0_0_8px_rgba(209,213,219,0.5)]"
                          : index === 2
                          ? "text-amber-600 drop-shadow-[0_0_8px_rgba(217,119,6,0.4)]"
                          : "text-gray-500"
                      }`}
                    >
                      #{index + 1}
                    </span>
                  </div>

                  {/* Poster */}
                  <div className="w-12 h-16 md:w-14 md:h-20 rounded-lg overflow-hidden flex-shrink-0 border border-white/10 shadow-md">
                    {movie.poster ? (
                      <img
                        src={movie.poster}
                        alt={movie.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                        <FiEye className="text-gray-600" />
                      </div>
                    )}
                  </div>

                  {/* Movie Info */}
                  <div className="flex-1 min-w-0 pr-4">
                    <h4 className="text-sm md:text-base font-bold text-white truncate drop-shadow-sm group-hover:text-rose-100 transition-colors">
                      {movie.name}
                    </h4>
                    
                    {/* Metrics Grid */}
                    <div className="flex flex-wrap items-center gap-3 md:gap-5 mt-2">
                      <div className="flex items-center gap-1.5 text-xs text-blue-400 font-medium bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/10">
                        <FiEye size={12} />
                        <span>{movie.views.toLocaleString()} View</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/10">
                        <FiUsers size={12} />
                        <span>{movie.uniqueViewers.toLocaleString()} Khán giả</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-amber-500 font-semibold bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                        <FiClock size={12} />
                        <span>{formatWatchTime(movie.watchMinutes)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Trending Badge (Velocity) */}
                  <div className="hidden md:flex flex-shrink-0 flex-col items-end justify-center pr-2">
                    {movie.isTrending && (
                      <div className="flex items-center gap-1.5 text-[10px] uppercase font-black text-rose-500 tracking-wider bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/30 animate-pulse shadow-[0_0_15px_rgba(243,24,96,0.3)]">
                        <FiArrowUpRight size={14} className="animate-bounce" /> Hot Rate
                      </div>
                    )}
                    {movie.velocity > 0 && (
                      <div className="text-[10px] text-gray-500 font-medium mt-1">
                        Tốc độ: {movie.velocity} view/h
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrendingRanking;
