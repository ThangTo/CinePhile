import React, { useState, useEffect, useRef, useCallback } from "react";
import { viralClipAPI } from "services/viralClip.service";
import { movieAPI } from "services/admin.service";
import { fetchEpisodes } from "services/movie.service";
import {
  FiZap,
  FiPlay,
  FiSearch,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiLoader,
  FiRefreshCw,
  FiMusic,
  FiFilm,
  FiScissors,
  FiTrendingUp,
  FiAlertCircle,
} from "react-icons/fi";

// ─── Status Badge ──────────────────────────────────────────────────────────
const StatusBadge = ({ state }) => {
  const config = {
    completed: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      border: "border-emerald-500/20",
      icon: FiCheckCircle,
      label: "Hoàn thành",
    },
    failed: {
      bg: "bg-red-500/10",
      text: "text-red-400",
      border: "border-red-500/20",
      icon: FiXCircle,
      label: "Thất bại",
    },
    active: {
      bg: "bg-amber-500/10",
      text: "text-amber-400",
      border: "border-amber-500/20",
      icon: FiLoader,
      label: "Đang xử lý",
    },
    waiting: {
      bg: "bg-blue-500/10",
      text: "text-blue-400",
      border: "border-blue-500/20",
      icon: FiClock,
      label: "Đang chờ",
    },
    delayed: {
      bg: "bg-purple-500/10",
      text: "text-purple-400",
      border: "border-purple-500/20",
      icon: FiClock,
      label: "Trì hoãn",
    },
  };

  const c = config[state] || config.waiting;
  const Icon = c.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${c.bg} ${c.text} ${c.border}`}
    >
      <Icon size={12} className={state === "active" ? "animate-spin" : ""} />
      {c.label}
    </span>
  );
};

// ─── Category Badge ────────────────────────────────────────────────────────
const CategoryBadge = ({ category }) => {
  const config = {
    Funny: { bg: "bg-yellow-500/10", text: "text-yellow-400", emoji: "😂" },
    Romantic: { bg: "bg-pink-500/10", text: "text-pink-400", emoji: "💕" },
    Action: { bg: "bg-orange-500/10", text: "text-orange-400", emoji: "💥" },
  };

  const c = config[category] || {
    bg: "bg-gray-500/10",
    text: "text-gray-400",
    emoji: "🎬",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${c.bg} ${c.text}`}
    >
      <span>{c.emoji}</span>
      {category}
    </span>
  );
};

// ─── Progress Bar ──────────────────────────────────────────────────────────
const ProgressBar = ({ progress = 0, state }) => {
  const color =
    state === "completed"
      ? "bg-emerald-500"
      : state === "failed"
        ? "bg-red-500"
        : "bg-amber-500";

  return (
    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
      <div
        className={`h-full ${color} rounded-full transition-all duration-500 ease-out`}
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
    </div>
  );
};

// ─── Step Indicator (Pipeline Progress) ────────────────────────────────────
const PipelineSteps = ({ analysisProgress }) => {
  // Map progress (0-100) from AnalysisQueue to visual steps:
  // 10-39: Extracting audio (Step 0)
  // 40-69: STT Whisper (Step 1)
  // 70-89: LLM Analysis (Step 2)
  // 90-100: Render queue (Step 3)
  
  let currentStep = -1;
  if (analysisProgress > 0 && analysisProgress < 40) currentStep = 0;
  else if (analysisProgress >= 40 && analysisProgress < 70) currentStep = 1;
  else if (analysisProgress >= 70 && analysisProgress < 90) currentStep = 2;
  else if (analysisProgress >= 90) currentStep = 3;

  const steps = [
    { icon: FiMusic, label: "Trích xuất audio" },
    { icon: FiScissors, label: "Tạo phụ đề (Whisper)" },
    { icon: FiTrendingUp, label: "Phân tích AI" },
    { icon: FiZap, label: "Hàng đợi render" },
  ];

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-center gap-1 w-full">
        {steps.map((step, i) => {
          const isActive = i === currentStep;
          const isDone = currentStep !== -1 && i < currentStep;
          const Icon = step.icon;

          return (
            <React.Fragment key={i}>
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 ${
                  isDone
                    ? "bg-emerald-500/10 text-emerald-400"
                    : isActive
                      ? "bg-amber-500/10 text-amber-400 animate-pulse border border-amber-500/20"
                      : "bg-white/5 text-gray-500"
                }`}
              >
                {isDone ? (
                  <FiCheckCircle size={14} />
                ) : isActive ? (
                  <FiLoader size={14} className="animate-spin" />
                ) : (
                  <Icon size={14} />
                )}
                <span className="hidden xl:inline">{step.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`flex-1 h-px ${isDone ? "bg-emerald-500/30" : "bg-white/10"}`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
      
      {currentStep !== -1 && (
        <div className="flex items-center gap-3">
           <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.min(analysisProgress, 100)}%` }}
              />
           </div>
           <span className="text-xs font-mono text-amber-400 font-bold">{analysisProgress}%</span>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════
const AdminViralClipsTab = () => {
  // Form state
  const [movieSearch, setMovieSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [m3u8Url, setM3u8Url] = useState("");
  
  // Episode Selection State
  const [episodes, setEpisodes] = useState([]);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState("");
  const [selectedAudio, setSelectedAudio] = useState("");

  // BGM State
  const [bgMusicSource, setBgMusicSource] = useState("url"); // 'url' or 'file'
  const [bgMusicUrl, setBgMusicUrl] = useState("");
  const [bgmFile, setBgmFile] = useState(null);
  const [bgmStartTime, setBgmStartTime] = useState("0");
  const [bgmDuration, setBgmDuration] = useState("");

  // Pipeline state
  const [isGenerating, setIsGenerating] = useState(false);
  const [pipelineError, setPipelineError] = useState(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  // Jobs state
  const [jobs, setJobs] = useState([]);
  const [isPolling, setIsPolling] = useState(false);
  const pollIntervalRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // ── Movie Search (debounced) ─────────────────────────────────────────
  useEffect(() => {
    if (!movieSearch.trim() || movieSearch.length < 2) {
      setSearchResults([]);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const result = await movieAPI.search(movieSearch, { limit: 8 });
        setSearchResults(result?.data || result || []);
      } catch (err) {
        console.error("Search failed:", err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [movieSearch]);

  // ── Select Movie ─────────────────────────────────────────────────────
  const handleSelectMovie = async (movie) => {
    setSelectedMovie(movie);
    setMovieSearch("");
    setSearchResults([]);
    setM3u8Url("");
    setEpisodes([]);
    setSelectedEpisodeId("");
    setSelectedAudio("");

    try {
      const eps = await fetchEpisodes(movie.id || movie._id);
      setEpisodes(eps);
      if (eps.length > 0) {
        setSelectedEpisodeId(eps[0].episode || eps[0].episodeId || "");
        // Fallback to various server naming conventions
        setSelectedAudio(eps[0].audioType || eps[0].serverName || "");
      }
    } catch (err) {
      console.error("Failed to fetch episodes:", err);
    }
  };

  // ── Generate ─────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!selectedMovie || (!m3u8Url && !selectedEpisodeId)) return;

    setIsGenerating(true);
    setPipelineError(null);
    setJobs([]);
    setAnalysisProgress(0);

    try {
      // Set to 10 immediately to trigger visual "Extracting audio" step
      setAnalysisProgress(10);

      const res = await viralClipAPI.generate({
        movieId: selectedMovie.id || selectedMovie._id,
        episodeId: selectedEpisodeId || undefined,
        audioType: selectedAudio || undefined,
        m3u8Url: m3u8Url || undefined,
        bgMusicUrl: bgMusicSource === "url" ? bgMusicUrl : undefined,
        bgmFile: bgMusicSource === "file" ? bgmFile : undefined,
        bgmStartTime: bgmStartTime || undefined,
        bgmDuration: bgmDuration || undefined,
      });

      if (res.success && res.analysisJobId) {
        startAnalysisPolling(res.analysisJobId);
      } else if (res.success && res.jobs) {
        // Fallback for older version
        setJobs(
          res.jobs.map((j) => ({
            ...j,
            state: "waiting",
            progress: 0,
          }))
        );
        startPolling(res.jobs.map((j) => j.jobId));
      } else {
        setPipelineError(res.error || "Không thể tạo clip");
        setIsGenerating(false);
      }
    } catch (err) {
      const msg =
        err?.response?.data?.details ||
        err?.response?.data?.error ||
        err.message;
      setPipelineError(msg);
      setIsGenerating(false);
    }
  };

  // ── Polling for Analysis Job ─────────────────────────────────────────
  const startAnalysisPolling = useCallback(
    (jobId) => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      setIsPolling(true);

      const poll = async () => {
        try {
          const res = await viralClipAPI.getAnalysisJobStatus(jobId);
          if (res.success && res.job) {
            setAnalysisProgress(res.job.progress || 0);

            if (res.job.state === "completed") {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
              
              if (res.job.result && res.job.result.length > 0) {
                 setJobs(res.job.result.map((j) => ({ ...j, state: "waiting", progress: 0 })));
                 startPolling(res.job.result.map((j) => j.jobId));
              } else {
                 setIsPolling(false);
                 setIsGenerating(false);
                 setPipelineError("Không tìm thấy cảnh nào phù hợp.");
              }
            } else if (res.job.state === "failed") {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
              setIsPolling(false);
              setPipelineError(res.job.error || "Lỗi khi phân tích dữ liệu AI");
              setIsGenerating(false);
            }
          }
        } catch (e) {
          console.error("Polling analysis job failed", e);
        }
      };

      poll();
      pollIntervalRef.current = setInterval(poll, 3000);
    },
    // We intentionally don't include startPolling in the dependency array
    // directly if it causes issues, but it should be fine. We can reference it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ── Polling for Job Status ───────────────────────────────────────────
  const startPolling = useCallback(
    (jobIds) => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

      setIsPolling(true);

      const poll = async () => {
        let allDone = true;

        for (const jobId of jobIds) {
          try {
            const res = await viralClipAPI.getJobStatus(jobId);
            if (res.success && res.job) {
              setJobs((prev) =>
                prev.map((j) =>
                  String(j.jobId) === String(jobId)
                    ? {
                        ...j,
                        state: res.job.state,
                        progress: res.job.progress || 0,
                        result: res.job.result,
                        failedReason: res.job.failedReason,
                        attemptsMade: res.job.attemptsMade,
                      }
                    : j
                )
              );

              if (!["completed", "failed"].includes(res.job.state)) {
                allDone = false;
              }
            }
          } catch {
            allDone = false;
          }
        }

        if (allDone) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
          setIsPolling(false);
        }
      };

      poll(); // Immediate first poll
      pollIntervalRef.current = setInterval(poll, 3000);
    },
    []
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // ── Stats Summary ────────────────────────────────────────────────────
  const completedCount = jobs.filter((j) => j.state === "completed").length;
  const failedCount = jobs.filter((j) => j.state === "failed").length;
  const processingCount = jobs.filter((j) =>
    ["active", "waiting", "delayed"].includes(j.state)
  ).length;

  return (
    <div className="space-y-8 animate-fade-in pb-10 w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <FiZap className="text-amber-400" />
            Tạo Viral Clips
          </h1>
          <p className="text-gray-400 mt-2 text-sm max-w-lg">
            Tự động trích xuất audio, tạo phụ đề bằng AI, phân tích cảnh viral
            và render clip ngắn từ phim.
          </p>
        </div>
        {isPolling && (
          <div className="flex items-center gap-3 bg-[#ffffff05] border border-white/10 px-4 py-2 rounded-full shadow-lg">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
            <span className="text-xs text-amber-400 font-bold uppercase tracking-wider">
              Đang xử lý...
            </span>
          </div>
        )}
      </div>

      {/* ── Input Form ─────────────────────────────────────────────────── */}
      <div className="bg-[#ffffff05] rounded-2xl p-6 border border-white/5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 z-10 relative">
          {/* Movie Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <FiFilm size={14} />
              Chọn phim
            </label>

            {selectedMovie ? (
              <div className="flex items-center gap-3 bg-[#ffffff08] border border-white/10 rounded-xl p-3">
                {selectedMovie.poster_url && (
                  <img
                    src={selectedMovie.poster_url}
                    alt=""
                    className="w-10 h-14 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {selectedMovie.name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {selectedMovie.origin_name || selectedMovie.year}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedMovie(null);
                    setM3u8Url("");
                  }}
                  className="text-gray-400 hover:text-red-400 transition-colors p-1"
                >
                  <FiXCircle size={18} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <FiSearch
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                  size={16}
                />
                <input
                  type="text"
                  value={movieSearch}
                  onChange={(e) => setMovieSearch(e.target.value)}
                  placeholder="Tìm kiếm phim theo tên..."
                  className="w-full bg-[#ffffff08] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
                />

                {/* Search Dropdown */}
                {(searchResults.length > 0 || isSearching) && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1b23] border border-white/10 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto">
                    {isSearching ? (
                      <div className="flex items-center justify-center py-4">
                        <FiLoader
                          className="animate-spin text-gray-400"
                          size={20}
                        />
                      </div>
                    ) : (
                      searchResults.map((movie, index) => (
                        <button
                          key={movie.id || movie._id || index}
                          onClick={() => handleSelectMovie(movie)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left"
                        >
                          {movie.poster_url && (
                            <img
                              src={movie.poster_url}
                              alt=""
                              className="w-8 h-12 rounded object-cover flex-shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm text-white truncate">
                              {movie.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {movie.origin_name} • {movie.year}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Episode & Audio Selection */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <FiPlay size={14} />
                  Chọn Tập
                </label>
                <select
                  value={selectedEpisodeId}
                  onChange={(e) => setSelectedEpisodeId(e.target.value)}
                  className="w-full bg-[#ffffff08] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-all appearance-none"
                  disabled={!selectedMovie || episodes.length === 0}
                >
                  <option value="" disabled className="bg-[#1a1b23] text-gray-400">
                    -- Chọn Tập --
                  </option>
                  {[...new Set(episodes.map(e => e.episode || e.episodeId))].filter(Boolean).map((epId) => (
                    <option key={epId} value={epId} className="bg-[#1a1b23]">
                      Tập {epId}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <FiCheckCircle size={14} />
                  Audio / Server
                </label>
                <select
                  value={selectedAudio}
                  onChange={(e) => setSelectedAudio(e.target.value)}
                  className="w-full bg-[#ffffff08] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-all appearance-none"
                  disabled={!selectedEpisodeId}
                >
                  <option value="" disabled className="bg-[#1a1b23] text-gray-400">
                    -- Chọn Audio --
                  </option>
                  {episodes
                    .filter(e => String(e.episode || e.episodeId) === String(selectedEpisodeId))
                    .map((ep, idx) => (
                      <option key={idx} value={ep.audioType || ep.serverName} className="bg-[#1a1b23]">
                        {ep.audioType || ep.serverName || "Mặc định"}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* M3U8 URL Fallback */}
            {!selectedEpisodeId && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <FiAlertCircle size={14} className="text-amber-400" />
                  URL HLS Dự Phòng (.m3u8)
                </label>
                <input
                  type="url"
                  value={m3u8Url}
                  onChange={(e) => setM3u8Url(e.target.value)}
                  placeholder="https://example.com/stream.m3u8"
                  className="w-full bg-[#ffffff08] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
                />
              </div>
            )}
          </div>

          {/* Background Music Configuration */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <FiMusic size={14} />
                  Nhạc nền (BGM)
                </label>
                <div className="flex bg-[#ffffff08] rounded-lg border border-white/10 p-0.5">
                  <button
                    onClick={() => setBgMusicSource("url")}
                    className={`px-3 py-1 text-xs rounded-md transition-all ${
                      bgMusicSource === "url" ? "bg-amber-500 text-black font-semibold" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    URL
                  </button>
                  <button
                    onClick={() => setBgMusicSource("file")}
                    className={`px-3 py-1 text-xs rounded-md transition-all ${
                      bgMusicSource === "file" ? "bg-amber-500 text-black font-semibold" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Upload File
                  </button>
                </div>
              </div>

              {bgMusicSource === "url" ? (
                <input
                  type="url"
                  value={bgMusicUrl}
                  onChange={(e) => setBgMusicUrl(e.target.value)}
                  placeholder="https://example.com/music.mp3"
                  className="w-full bg-[#ffffff08] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-all"
                />
              ) : (
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setBgmFile(e.target.files[0])}
                  className="w-full bg-[#ffffff08] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-300 file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-500/10 file:text-amber-400 hover:file:bg-amber-500/20 transition-all"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-400">Bắt đầu từ (giây)</label>
                <input
                  type="number"
                  min="0"
                  value={bgmStartTime}
                  onChange={(e) => setBgmStartTime(e.target.value)}
                  placeholder="0"
                  className="w-full bg-[#ffffff08] border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-400">Độ dài (giây - để trống dùng mặc định cảnh AI)</label>
                <input
                  type="number"
                  min="5"
                  value={bgmDuration}
                  onChange={(e) => setBgmDuration(e.target.value)}
                  placeholder="Ví dụ: 15"
                  className="w-full bg-[#ffffff08] border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex items-end lg:col-span-2 mt-4 border-t border-white/5 pt-6">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !selectedMovie || (!m3u8Url && !selectedEpisodeId)}
              className={`w-full md:w-auto px-10 flex items-center justify-center gap-3 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                isGenerating || !selectedMovie || (!m3u8Url && !selectedEpisodeId)
                  ? "bg-white/5 text-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:from-amber-400 hover:to-orange-400 hover:shadow-lg hover:shadow-amber-500/20"
              }`}
            >
              {isGenerating ? (
                <>
                  <FiLoader className="animate-spin" size={18} />
                  Đang xử lý pipeline...
                </>
              ) : (
                <>
                  <FiZap size={18} />
                  Tạo Viral Clips
                </>
              )}
            </button>
          </div>
        </div>

        {/* Pipeline Steps Indicator */}
        {isGenerating && analysisProgress > 0 && (
          <div className="mt-6 z-10 relative">
            <PipelineSteps analysisProgress={analysisProgress} />
          </div>
        )}

        {/* Error */}
        {pipelineError && (
          <div className="mt-4 flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4 z-10 relative">
            <FiAlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-sm font-semibold text-red-400">
                Pipeline thất bại
              </p>
              <p className="text-xs text-red-300/80 mt-1">{pipelineError}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Jobs Table ──────────────────────────────────────────────────── */}
      {jobs.length > 0 && (
        <div className="space-y-4">
          {/* Stats Bar */}
          <div className="flex items-center gap-6 text-sm">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FiScissors className="text-amber-400" />
              Kết quả ({jobs.length} clips)
            </h2>
            <div className="flex items-center gap-4 ml-auto text-xs">
              {completedCount > 0 && (
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <FiCheckCircle size={14} />
                  {completedCount} hoàn thành
                </span>
              )}
              {processingCount > 0 && (
                <span className="flex items-center gap-1.5 text-amber-400">
                  <FiLoader size={14} className="animate-spin" />
                  {processingCount} đang xử lý
                </span>
              )}
              {failedCount > 0 && (
                <span className="flex items-center gap-1.5 text-red-400">
                  <FiXCircle size={14} />
                  {failedCount} thất bại
                </span>
              )}
              {isPolling && (
                <button
                  onClick={() => startPolling(jobs.map((j) => j.jobId))}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Refresh"
                >
                  <FiRefreshCw size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Job Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {jobs.map((job) => (
              <div
                key={job.jobId}
                className="relative bg-[#ffffff05] rounded-2xl border border-white/5 overflow-hidden shadow-lg hover:bg-[#ffffff08] transition-all duration-300 group"
              >
                {/* Header */}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <CategoryBadge category={job.category} />
                    <StatusBadge state={job.state} />
                  </div>

                  {/* Time Range */}
                  <div className="flex items-center gap-2 text-sm text-gray-300 mb-2">
                    <FiClock size={14} className="text-gray-500" />
                    <span className="font-mono">
                      {job.start_time} → {job.end_time}
                    </span>
                  </div>

                  {/* Reason */}
                  {job.reason && (
                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                      {job.reason}
                    </p>
                  )}

                  {/* Failed Reason */}
                  {job.failedReason && (
                    <p className="text-xs text-red-400/80 mt-2 line-clamp-2">
                      ❌ {job.failedReason}
                    </p>
                  )}

                  {/* Job ID */}
                  <p className="text-[10px] text-gray-600 mt-3 font-mono">
                    Job #{job.jobId}
                    {job.attemptsMade > 0 && (
                      <span className="ml-2">
                        • Thử lần {job.attemptsMade}
                      </span>
                    )}
                  </p>
                </div>

                {/* Progress Bar at bottom */}
                <ProgressBar progress={job.progress} state={job.state} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {jobs.length === 0 && !isGenerating && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-3xl bg-amber-500/10 flex items-center justify-center mb-6">
            <FiZap size={32} className="text-amber-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">
            Chưa có clip nào
          </h3>
          <p className="text-sm text-gray-500 max-w-md">
            Chọn một bộ phim và nhập URL HLS stream để bắt đầu tạo viral clips
            tự động bằng AI.
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminViralClipsTab;
