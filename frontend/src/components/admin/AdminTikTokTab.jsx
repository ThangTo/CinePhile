import React, { useState, useEffect, useRef } from "react";
import Hls from "hls.js";
import {
  CheckCircle2,
  Clock3,
  Download,
  Film,
  PlayCircle,
  RotateCcw,
  Scissors,
  Search,
  Sparkles,
  TimerReset,
  Video,
} from "lucide-react";
import { movieAPI } from "services/admin.service";
import movieService from "services/movie.service";
import { BarSpinner } from "components/common/LoadingState";
import useToast from "hooks/useToast";

const clampProgress = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(100, Math.max(0, number));
};

const formatProgressPercent = (value) => {
  const progress = clampProgress(value);
  return Number.isInteger(progress) ? `${progress}%` : `${progress.toFixed(1)}%`;
};

const createProgressJobId = () => {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `tiktok_${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

const AdminTikTokTab = () => {
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [movies, setMovies] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [selectedEpisode, setSelectedEpisode] = useState(null);

  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const progressPollRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [, setCurrentTime] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState(null);

  const apiBaseUrl = process.env.REACT_APP_API_URL || "http://localhost:5000/api/v1";
  const apiOrigin = apiBaseUrl.replace(/\/api\/v1\/?$/, "");
  const clipDuration = Math.max(0, endTime - startTime);
  const isClipSelectionValid = Number.isFinite(clipDuration) && clipDuration > 0;
  const selectedMovieTitle = selectedMovie?.name || selectedMovie?.title || "Chưa chọn phim";
  const selectedMovieSubtitle =
    selectedMovie?.origin_name || selectedMovie?.original_title || "Chưa có tên gốc";
  const selectedMoviePoster =
    selectedMovie?.thumb_url || selectedMovie?.poster_url || selectedMovie?.poster;
  const startPercent = duration > 0 ? clampProgress((startTime / duration) * 100) : 0;
  const endPercent = duration > 0 ? clampProgress((endTime / duration) * 100) : 0;
  const selectionWidthPercent = Math.max(0, endPercent - startPercent);

  useEffect(() => {
    return () => {
      if (progressPollRef.current) {
        clearInterval(progressPollRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setMovies([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await movieAPI.getAll({ search: searchQuery });
        setMovies(res.data || []);
      } catch (error) {
        console.error("Search error", error);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    if (!selectedMovie) {
      setEpisodes([]);
      setSelectedEpisode(null);
      return;
    }

    const loadEpisodes = async () => {
      try {
        const data = await movieService.getEpisodes(selectedMovie._id || selectedMovie.id);
        const eps = data?.data || data || [];
        setEpisodes(eps);
        if (eps.length > 0) {
          setSelectedEpisode(eps[0]);
        }
      } catch (error) {
        console.error("Error loading episodes", error);
      }
    };

    loadEpisodes();
  }, [selectedMovie]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedEpisode) return;

    const hlsSource = selectedEpisode.link_m3u8 || selectedEpisode.videoUrl;

    if (Hls.isSupported() && hlsSource) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls();
      hls.loadSource(hlsSource);
      hls.attachMedia(video);
      hlsRef.current = hls;
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsSource;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [selectedEpisode]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setEndTime(videoRef.current.duration);
    }
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return "00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const setTimeFromPlayer = (type) => {
    if (!videoRef.current) return;

    if (type === "start") {
      setStartTime(videoRef.current.currentTime);
      if (videoRef.current.currentTime > endTime) {
        setEndTime(videoRef.current.duration);
      }
    } else {
      setEndTime(videoRef.current.currentTime);
      if (videoRef.current.currentTime < startTime) {
        setStartTime(0);
      }
    }
  };

  const handleDownload = async () => {
    if (!selectedMovie || !selectedEpisode) return;
    const selectedDuration = Math.ceil(endTime - startTime);

    if (!Number.isFinite(selectedDuration) || selectedDuration <= 0) {
      showToast("Vui lòng chọn đoạn clip hợp lệ", "error");
      return;
    }

    setIsProcessing(true);
    setProgressMsg("Đang chuẩn bị...");
    setProgressPercent(1);
    setDownloadUrl(null);
    const jobId = createProgressJobId();
    let hasSettled = false;
    let stopProgressPolling = () => {};

    try {
      let token = null;
      try {
        const authStorage = require("lib/auth-storage");
        token = authStorage.getToken();
      } catch (e) {
        token =
          localStorage.getItem("accessToken") ||
          sessionStorage.getItem("accessToken") ||
          localStorage.getItem("token");
      }

      const headers = {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const applyProgressEvent = (data) => {
        if (hasSettled) return;

        const eventType =
          data.type ||
          (data.status === "completed"
            ? "complete"
            : data.status === "failed"
              ? "error"
              : "progress");

        if (Number.isFinite(Number(data.percent))) {
          setProgressPercent(clampProgress(data.percent));
        }

        if (data.message) {
          setProgressMsg(data.message);
        }

        if (eventType === "complete") {
          hasSettled = true;
          stopProgressPolling();
          setIsProcessing(false);
          setProgressPercent(100);
          setProgressMsg("Hoàn tất!");
          setDownloadUrl(data.url);
          showToast("Tạo clip thành công!", "success");
        } else if (eventType === "error") {
          hasSettled = true;
          stopProgressPolling();
          setIsProcessing(false);
          setProgressMsg(`Loi: ${data.error || data.message}`);
          showToast(data.error || data.message, "error");
        }
      };

      const pollProgress = async () => {
        try {
          const statusResponse = await fetch(
            `${apiBaseUrl}/admin/tiktok/download-segment/status/${encodeURIComponent(jobId)}`,
            {
              method: "GET",
              headers: token ? { Authorization: `Bearer ${token}` } : {},
              credentials: "include",
            }
          );

          if (!statusResponse.ok) return;

          const statusData = await statusResponse.json();
          if (statusData?.job) {
            applyProgressEvent(statusData.job);
          }
        } catch {
          // SSE is still the primary channel; polling is a fallback.
        }
      };

      stopProgressPolling = () => {
        if (progressPollRef.current) {
          clearInterval(progressPollRef.current);
          progressPollRef.current = null;
        }
      };

      stopProgressPolling();
      progressPollRef.current = setInterval(pollProgress, 1500);

      const responsePromise = fetch(`${apiBaseUrl}/admin/tiktok/download-segment`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          jobId,
          movieId: selectedMovie._id || selectedMovie.id,
          episodeId: selectedEpisode._id || selectedEpisode.id,
          startTime: Math.floor(startTime),
          duration: selectedDuration,
        }),
      });

      pollProgress();
      const response = await responsePromise;

      if (!response.ok) {
        throw new Error("Không thể kết nối đến server");
      }

      if (!response.body) {
        throw new Error("Server không hỗ trợ stream tiến trình");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      const processSseBlock = (block) => {
        const dataStr = block
          .split(/\r?\n/)
          .map((line) => line.trimStart())
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n");

        if (!dataStr.trim()) return;

        try {
          applyProgressEvent(JSON.parse(dataStr));
        } catch (e) {
          console.error("Error parsing SSE JSON:", e);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (buffer.trim()) {
            processSseBlock(buffer);
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() || "";
        blocks.forEach(processSseBlock);
      }

      await pollProgress();
      if (!hasSettled) {
        stopProgressPolling();
      }
    } catch (error) {
      console.error(error);
      stopProgressPolling();
      if (!hasSettled) {
        setIsProcessing(false);
        setProgressMsg("Đã xảy ra lỗi hệ thống.");
        setProgressPercent(0);
        showToast("Lỗi hệ thống", "error");
      }
    }
  };

  return (
    <div className="p-6 text-gray-100">
      <div className="mb-6 overflow-hidden rounded-lg border border-white/10 bg-[#10131b]">
        <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primaryColor text-black">
              <Scissors size={24} strokeWidth={2.4} />
            </div>
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-white">TikTok Clip Studio</h1>
                <span className="inline-flex items-center gap-1 rounded-full border border-primaryColor/30 bg-primaryColor/10 px-2.5 py-1 text-xs font-medium text-primaryColor">
                  <Sparkles size={14} />
                  Manual mode
                </span>
              </div>
              <p className="max-w-2xl text-sm leading-6 text-gray-400">
                Chọn phim, preview tập, kéo mốc cắt và tải clip về máy trước khi bước sang caption
                và lịch đăng tự động.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-right">
            <div className="rounded-lg border border-white/10 bg-black/20 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-gray-500">Tap</div>
              <div className="mt-1 font-mono text-lg text-white">{episodes.length}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-gray-500">Độ dài</div>
              <div className="mt-1 font-mono text-lg text-white">{formatTime(clipDuration)}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-gray-500">Trạng thái</div>
              <div className="mt-1 text-sm font-semibold text-primaryColor">
                {isProcessing ? "Đang tạo" : downloadUrl ? "Sẵn sàng" : "Nhập liệu"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <aside className="xl:col-span-4">
          <div className="rounded-lg border border-white/10 bg-bgColor2">
            <div className="border-b border-white/10 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-white">Nguồn phim</h2>
                  <p className="mt-1 text-xs text-gray-500">Tìm phim và chọn tập cần cắt.</p>
                </div>
                <Film className="text-primaryColor" size={20} />
              </div>

              <label className="relative block">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                  size={18}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm tên phim..."
                  className="h-11 w-full rounded-lg border border-white/10 bg-[#0d1017] px-10 text-sm text-white outline-none transition-colors placeholder:text-gray-600 focus:border-primaryColor"
                />
              </label>
            </div>

            {movies.length > 0 && !selectedMovie && (
              <div className="max-h-[360px] overflow-y-auto p-2">
                {movies.map((m) => {
                  const poster = m.thumb_url || m.poster_url || m.poster;
                  return (
                    <button
                      key={m._id || m.id}
                      type="button"
                      onClick={() => setSelectedMovie(m)}
                      className="flex w-full items-center gap-3 rounded-lg border border-transparent p-2 text-left transition-colors hover:border-primaryColor/30 hover:bg-white/5"
                    >
                      {poster ? (
                        <img src={poster} alt="" className="h-16 w-11 rounded-md object-cover" />
                      ) : (
                        <div className="flex h-16 w-11 items-center justify-center rounded-md bg-white/5 text-gray-500">
                          <Film size={18} />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-white">
                          {m.name || m.title}
                        </div>
                        <div className="truncate text-xs text-gray-500">
                          {m.origin_name || m.original_title || "No original title"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedMovie && (
              <div className="p-4">
                <div className="flex gap-4 rounded-lg border border-primaryColor/30 bg-primaryColor/10 p-3">
                  {selectedMoviePoster ? (
                    <img
                      src={selectedMoviePoster}
                      alt=""
                      className="h-28 w-20 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex h-28 w-20 items-center justify-center rounded-md bg-black/30 text-gray-500">
                      <Film size={24} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 truncate text-base font-semibold text-white">
                      {selectedMovieTitle}
                    </div>
                    <div className="line-clamp-2 text-xs leading-5 text-gray-400">
                      {selectedMovieSubtitle}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMovie(null);
                        setSearchQuery("");
                        setDownloadUrl(null);
                        setProgressPercent(0);
                      }}
                      className="mt-4 inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-red-400/50 hover:text-red-300"
                    >
                      <RotateCcw size={14} />
                      Đổi phim
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="border-t border-white/10 p-4">
              <label className="mb-2 block text-sm font-medium text-gray-300">Tập phim</label>
              <select
                className="h-11 w-full rounded-lg border border-white/10 bg-[#0d1017] px-3 text-sm text-white outline-none transition-colors focus:border-primaryColor disabled:cursor-not-allowed disabled:text-gray-600"
                disabled={episodes.length === 0}
                onChange={(e) => {
                  const ep = episodes.find((x) => (x._id || x.id) === e.target.value);
                  setSelectedEpisode(ep);
                }}
                value={selectedEpisode?._id || selectedEpisode?.id || ""}
              >
                {episodes.length === 0 ? (
                  <option>Chưa có tập</option>
                ) : (
                  episodes.map((ep) => (
                    <option key={ep._id || ep.id} value={ep._id || ep.id}>
                      Tap {ep.episode || ep.episodeId} - {ep.serverName || "Mac dinh"}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </aside>

        <main className="xl:col-span-8">
          <div className="rounded-lg border border-white/10 bg-bgColor2">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-primaryColor">
                  <Video size={18} />
                </div>
                <div>
                  <h2 className="font-semibold text-white">Preview và timeline</h2>
                  <p className="text-xs text-gray-500">
                    Kéo mốc bắt đầu / kết thúc để chọn đoạn cần tải.
                  </p>
                </div>
              </div>
              <span className="hidden rounded-full border border-white/10 px-3 py-1 text-xs text-gray-400 sm:inline-flex">
                {selectedEpisode ? "HLS preview" : "Chờ nguồn phim"}
              </span>
            </div>

            {!selectedEpisode ? (
              <div className="flex min-h-[520px] items-center justify-center p-6">
                <div className="text-center text-gray-500">
                  <PlayCircle className="mx-auto mb-3 text-gray-600" size={42} />
                  <div className="text-sm">Chọn phim và tập để bắt đầu preview.</div>
                </div>
              </div>
            ) : (
              <div className="space-y-5 p-4">
                <div className="overflow-hidden rounded-lg border border-white/10 bg-black">
                  <div className="relative aspect-video">
                    <video
                      ref={videoRef}
                      controls
                      className="h-full w-full"
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleLoadedMetadata}
                      crossOrigin="anonymous"
                    />
                    <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white">
                      {selectedMovieTitle}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-[#0d1017] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                      <Clock3 size={17} className="text-primaryColor" />
                      Vùng cắt clip
                    </div>
                    <div className="font-mono text-sm text-primaryColor">
                      {formatTime(clipDuration)}
                    </div>
                  </div>
                  <div className="relative h-3 rounded-full bg-white/10">
                    <div
                      className="absolute top-0 h-3 rounded-full bg-primaryColor"
                      style={{ left: `${startPercent}%`, width: `${selectionWidthPercent}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between font-mono text-xs text-gray-500">
                    <span>{formatTime(0)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-white/10 bg-[#0d1017] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-gray-500">Start</div>
                        <div className="mt-1 font-mono text-2xl text-white">
                          {formatTime(startTime)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTimeFromPlayer("start")}
                        className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:border-primaryColor/50 hover:text-primaryColor"
                      >
                        <TimerReset size={15} />
                        Lấy mốc
                      </button>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={duration}
                      step={1}
                      value={startTime}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setStartTime(val);
                        if (val > endTime) setEndTime(val);
                        if (videoRef.current) videoRef.current.currentTime = val;
                      }}
                      className="w-full accent-primaryColor"
                    />
                  </div>

                  <div className="rounded-lg border border-white/10 bg-[#0d1017] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-gray-500">End</div>
                        <div className="mt-1 font-mono text-2xl text-white">
                          {formatTime(endTime)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTimeFromPlayer("end")}
                        className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:border-primaryColor/50 hover:text-primaryColor"
                      >
                        <TimerReset size={15} />
                        Lấy mốc
                      </button>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={duration}
                      step={1}
                      value={endTime}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setEndTime(val);
                        if (val < startTime) setStartTime(val);
                        if (videoRef.current) videoRef.current.currentTime = val;
                      }}
                      className="w-full accent-primaryColor"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-4 rounded-lg border border-primaryColor/20 bg-primaryColor/10 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-sm font-semibold text-white">
                        Clip output:{" "}
                        <span className="font-mono text-primaryColor">
                          {formatTime(clipDuration)}
                        </span>
                      </div>
                      {!isClipSelectionValid && (
                        <span className="rounded-full border border-red-400/30 bg-red-500/10 px-2.5 py-1 text-xs text-red-300">
                          Chọn lại mốc thời gian
                        </span>
                      )}
                    </div>

                    {isProcessing && (
                      <div className="mt-3 flex items-start gap-3 text-sm text-gray-300">
                        <BarSpinner size={16} />
                        <div className="min-w-[240px] max-w-lg flex-1">
                          <div className="mb-1 flex items-center justify-between gap-3">
                            <span className="truncate">{progressMsg || "Đang xử lý..."}</span>
                            <span className="font-mono text-primaryColor tabular-nums">
                              {formatProgressPercent(progressPercent)}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-black/30">
                            <div
                              className="h-full rounded-full bg-primaryColor transition-[width] duration-300"
                              style={{ width: `${clampProgress(progressPercent)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {!isProcessing && downloadUrl && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-green-400">
                        <CheckCircle2 size={17} />
                        Đã tạo clip thành công.
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {downloadUrl && !isProcessing && (
                      <a
                        href={
                          downloadUrl.startsWith("http")
                            ? downloadUrl
                            : `${apiOrigin}${downloadUrl}`
                        }
                        download
                        className="inline-flex h-11 items-center gap-2 rounded-lg bg-green-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-green-500"
                      >
                        <Download size={18} />
                        Tải xuống
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={handleDownload}
                      disabled={isProcessing || !isClipSelectionValid}
                      className={`inline-flex h-11 items-center gap-2 rounded-lg px-5 text-sm font-semibold transition-colors ${
                        isProcessing || !isClipSelectionValid
                          ? "cursor-not-allowed bg-gray-700 text-gray-400"
                          : "bg-primaryColor text-black hover:bg-primaryColor/90"
                      }`}
                    >
                      <Scissors size={18} />
                      {isProcessing ? "Đang tạo clip" : "Tạo clip"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminTikTokTab;
