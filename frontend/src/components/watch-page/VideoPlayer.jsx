import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Hls from "hls.js";
import useAuth from "hooks/useAuth";
import userService from "services/user.service";
import movieService from "services/movie.service";
import VideoOverlays from "../video/VideoOverlays";
import VideoControls from "../video/VideoControls";
import useToast from "hooks/useToast";
import ToastContainer from "../common/ToastContainer";
import PremiumRequiredModal from "../common/PremiumRequiredModal";
import { isPremiumActive } from "utils/premiumUtils";
import { getVideoSource, USE_SERVER_ADBLOCK } from "config/video.config";

const HYBRID_PROXY_STORAGE_KEY = "cinephine_proxy_sources";
const PROXY_ESCALATION_THRESHOLD = 2;
const START_POSITION_BUDGET_MS = 1200;
const BUFFERING_INDICATOR_DELAY_MS = 400;

function getProxySources() {
  try {
    return JSON.parse(sessionStorage.getItem(HYBRID_PROXY_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function setProxySource(sourceDomain, needsProxy) {
  const sources = getProxySources();
  sources[sourceDomain] = needsProxy;
  sessionStorage.setItem(HYBRID_PROXY_STORAGE_KEY, JSON.stringify(sources));
}

function needsProxyForSource(sourceDomain) {
  const sources = getProxySources();
  return sources[sourceDomain] === true;
}

function extractDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function buildPlaybackSource(rawM3u8, proxyEndpoint, needsProxy) {
  const baseSource = getVideoSource(rawM3u8, proxyEndpoint);
  if (!baseSource) return null;

  if (!baseSource.startsWith(proxyEndpoint)) {
    return baseSource;
  }

  try {
    const playbackUrl = new URL(baseSource);
    playbackUrl.searchParams.set("mode", needsProxy ? "proxy" : "direct");
    return playbackUrl.toString();
  } catch {
    const separator = baseSource.includes("?") ? "&" : "?";
    return `${baseSource}${separator}mode=${needsProxy ? "proxy" : "direct"}`;
  }
}

function getHlsErrorUrl(data) {
  return (
    data?.context?.url ||
    data?.url ||
    data?.frag?.url ||
    data?.part?.url ||
    data?.networkDetails?.responseURL ||
    null
  );
}

const VideoPlayer = ({
  movie,
  episode,
  onEpisodeChange,
  videoUrl,
  totalEpisodes,
  audioType,
  onAudioTypeChange,
  resumeTime = null,
  onFirstPlay,
  viewHistoryIdRef,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.75);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [quality, setQuality] = useState("Auto");
  const [isBuffering, setIsBuffering] = useState(false);
  const [availableLevels, setAvailableLevels] = useState([]);
  const [currentActualQuality, setCurrentActualQuality] = useState(null);
  const [bufferedPercentage, setBufferedPercentage] = useState(0);
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadMinimized, setIsDownloadMinimized] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadTotalSegments, setDownloadTotalSegments] = useState(0);
  const [downloadCompletedSegments, setDownloadCompletedSegments] = useState(0);
  const [useProxyMode, setUseProxyMode] = useState(false);
  const [doubleTapInfo, setDoubleTapInfo] = useState(null); // { side, totalSeconds, id }

  const { user, openAuthModal } = useAuth();
  const isPremium = isPremiumActive(user);
  const isAdmin = user?.role === "admin";
  const isRegularUser = !isPremium && !isAdmin;

  const { toasts, showToast, removeToast } = useToast();

  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const bufferingTimeoutRef = useRef(null);
  const saveProgressIntervalRef = useRef(null);
  const hasAutoSeekedRef = useRef(false);
  const lastEpisodeIdRef = useRef(null);
  const lastTapRef = useRef({ time: 0 });
  const singleTapTimeoutRef = useRef(null);
  const doubleTapDismissRef = useRef(null);

  const hlsRef = useRef(null);
  const blobUrlRef = useRef(null);
  const downloadAbortControllerRef = useRef(null);
  const firstPlayFiredRef = useRef(false);
  const sourceDomainRef = useRef(null);
  const networkErrorCountRef = useRef(0);
  const lastPlaybackModeRef = useRef("direct");
  const lastPlaybackProgressRef = useRef(0);

  // Hybrid Proxy: Check if source needs proxy mode
  const hlsSource = useMemo(() => {
    let rawM3u8 = null;
    if (episode?.link_m3u8) {
      rawM3u8 = episode.link_m3u8;
    } else if (episode?.videoUrl && episode.videoUrl.includes(".m3u8")) {
      rawM3u8 = episode.videoUrl;
    } else if (videoUrl && videoUrl.includes(".m3u8")) {
      rawM3u8 = videoUrl;
    }

    if (rawM3u8) {
      const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000/api/v1";
      const domain = extractDomain(rawM3u8);
      sourceDomainRef.current = domain;

      const needsProxy = needsProxyForSource(domain) || useProxyMode;
      lastPlaybackModeRef.current = needsProxy ? "proxy" : "direct";

      return buildPlaybackSource(rawM3u8, `${apiUrl}/movies/proxy-m3u8`, needsProxy);
    }

    return null;
  }, [episode, videoUrl, useProxyMode]);

  const fileSource = useMemo(() => {
    const candidate = videoUrl || episode?.videoUrl;
    if (candidate && !candidate.includes(".m3u8") && !candidate.includes("embed")) {
      return candidate;
    }
    return null;
  }, [episode, videoUrl]);

  const embedSource = useMemo(() => {
    if (episode?.link_embed) return episode.link_embed;
    if (episode?.videoUrl && episode.videoUrl.includes("embed")) return episode.videoUrl;
    return null;
  }, [episode]);

  const hasNativePlayer = Boolean(hlsSource || fileSource);

  // Parse available audio options
  const audioOptions = useMemo(() => {
    const rawLang = (movie?.lang || "").toLowerCase();
    const parts = rawLang
      .split("+")
      .map((p) => p.trim())
      .filter(Boolean);

    const opts = [];
    const addIfNotExists = (key, label) => {
      if (!opts.some((o) => o.key === key)) {
        opts.push({ key, label });
      }
    };

    parts.forEach((part) => {
      if (part.includes("vietsub")) addIfNotExists("vietsub", "Vietsub");
      if (part.includes("thuyết minh") || part.includes("thuyet minh"))
        addIfNotExists("thuyet-minh", "Thuyết Minh");
      if (part.includes("lồng tiếng") || part.includes("long tieng"))
        addIfNotExists("long-tieng", "Lồng tiếng");
    });

    if (opts.length === 0) {
      addIfNotExists("vietsub", "Vietsub");
    }

    return opts;
  }, [movie]);

  const currentAudioLabel = audioOptions.find((o) => o.key === audioType)?.label || "Âm thanh";

  const resetNetworkRecoveryState = useCallback(() => {
    networkErrorCountRef.current = 0;
  }, []);

  const clearPendingBuffering = useCallback(() => {
    if (bufferingTimeoutRef.current) {
      clearTimeout(bufferingTimeoutRef.current);
      bufferingTimeoutRef.current = null;
    }
  }, []);

  // --- Logic Video Event Listeners (Giữ nguyên) ---
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hasNativePlayer) return;

    const updateBufferedPercentage = () => {
      if (video.buffered.length > 0) {
        const currentDuration = video.duration || duration;
        if (currentDuration > 0) {
          const bufferedEnd = video.buffered.end(video.buffered.length - 1);
          const bufferedPercent = (bufferedEnd / currentDuration) * 100;
          setBufferedPercentage(Math.min(100, Math.max(0, bufferedPercent)));
        }
      } else {
        setBufferedPercentage(0);
      }
    };

    const handleTimeUpdate = () => {
      const nextTime = video.currentTime;
      setCurrentTime(nextTime);
      updateBufferedPercentage();

      if (!video.paused && nextTime > lastPlaybackProgressRef.current + 0.05) {
        clearPendingBuffering();
        setIsBuffering(false);
      }

      lastPlaybackProgressRef.current = nextTime;
    };

    const handleDurationChange = () => {
      setDuration(video.duration);
      updateBufferedPercentage();
    };

    const handlePlay = () => {
      clearPendingBuffering();
      setIsBuffering(false);
      setIsPlaying(true);
      // Fire the first-play callback only once per component lifetime.
      if (!firstPlayFiredRef.current && onFirstPlay) {
        firstPlayFiredRef.current = true;
        onFirstPlay();
      }
    };
    const handlePause = () => {
      clearPendingBuffering();
      setIsBuffering(false);
      setIsPlaying(false);
    };
    const handleWaiting = () => {
      clearPendingBuffering();

      bufferingTimeoutRef.current = setTimeout(() => {
        const currentVideo = videoRef.current;
        if (!currentVideo || currentVideo.paused) return;

        let bufferedAhead = 0;
        const currentBuffered = currentVideo.buffered;
        for (let index = 0; index < currentBuffered.length; index += 1) {
          const start = currentBuffered.start(index);
          const end = currentBuffered.end(index);
          if (currentVideo.currentTime >= start && currentVideo.currentTime <= end) {
            bufferedAhead = end - currentVideo.currentTime;
            break;
          }
        }

        const isLikelyStillPlayingSmoothly = currentVideo.readyState >= 3 && bufferedAhead > 1;

        if (!isLikelyStillPlayingSmoothly) {
          setIsBuffering(true);
          setShowControls(true);
        }
      }, BUFFERING_INDICATOR_DELAY_MS);
    };
    const handleCanPlay = () => {
      clearPendingBuffering();
      setIsBuffering(false);
    };
    const handlePlaying = () => {
      clearPendingBuffering();
      setIsBuffering(false);
    };
    const handleSeekStart = () => {
      clearPendingBuffering();
      setIsBuffering(true);
      setShowControls(true);
    };
    const handleSeekEnd = () => {
      clearPendingBuffering();
      setIsBuffering(false);
    };
    const handleProgress = () => updateBufferedPercentage();

    const handleLeavePiP = () => {
      if (containerRef.current) {
        containerRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("stalled", handleWaiting);
    video.addEventListener("seeking", handleSeekStart);
    video.addEventListener("seeked", handleSeekEnd);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("loadeddata", handleCanPlay);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("progress", handleProgress);
    video.addEventListener("leavepictureinpicture", handleLeavePiP);

    return () => {
      clearPendingBuffering();
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("stalled", handleWaiting);
      video.removeEventListener("seeking", handleSeekStart);
      video.removeEventListener("seeked", handleSeekEnd);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("loadeddata", handleCanPlay);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("progress", handleProgress);
      video.removeEventListener("leavepictureinpicture", handleLeavePiP);
    };
  }, [clearPendingBuffering, hasNativePlayer, episode, duration, onFirstPlay]);

  const shouldEscalateToProxyMode = useCallback((data) => {
    const failedUrl = getHlsErrorUrl(data) || "";
    const statusCode = data?.response?.code ?? data?.response?.status ?? null;
    const errorDetails = String(data?.details || "").toLowerCase();
    const errText = [data?.response?.text, data?.reason, data?.msg, data?.details]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (failedUrl.includes("/proxy-ts")) {
      return false;
    }

    const looksBlocked =
      statusCode === 0 ||
      statusCode === 401 ||
      statusCode === 403 ||
      statusCode === 429 ||
      errText.includes("cors") ||
      errText.includes("access-control-allow-origin") ||
      (statusCode === 0 && errorDetails.includes("fragloaderror"));

    if (!looksBlocked) {
      networkErrorCountRef.current = 0;
      return false;
    }

    if (data?.fatal) {
      return true;
    }

    networkErrorCountRef.current += 1;
    return networkErrorCountRef.current >= PROXY_ESCALATION_THRESHOLD;
  }, []);

  useEffect(() => {
    if (!hasNativePlayer || !isBuffering) return;
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
  }, [hasNativePlayer, isBuffering]);

  useEffect(() => {
    resetNetworkRecoveryState();
    clearPendingBuffering();
    lastPlaybackProgressRef.current = 0;
  }, [hlsSource, resetNetworkRecoveryState, clearPendingBuffering]);

  // === HEARTBEAT: Gửi Watch Time mỗi 60 giây khi video đang phát ===
  useEffect(() => {
    if (!isPlaying || !movie) return;

    let isBufferingNow = false;
    const handleWaiting = () => {
      isBufferingNow = true;
    };
    const handleCanPlay = () => {
      isBufferingNow = false;
    };

    const video = videoRef.current;
    if (video) {
      video.addEventListener("waiting", handleWaiting);
      video.addEventListener("canplay", handleCanPlay);
    }

    const heartbeatInterval = setInterval(() => {
      if (isBufferingNow) return;

      const movieId = movie.id || movie._id || movie.slug;
      const vhId = viewHistoryIdRef?.current;
      if (movieId) {
        movieService.recordWatchTime(movieId, vhId, 60).catch(() => {});
      }
    }, 60000);

    return () => {
      clearInterval(heartbeatInterval);
      if (video) {
        video.removeEventListener("waiting", handleWaiting);
        video.removeEventListener("canplay", handleCanPlay);
      }
    };
  }, [isPlaying, movie, viewHistoryIdRef]);

  // Reset auto-play/seek state
  useEffect(() => {
    const currentEpisodeId = episode?._id || episode?.id;
    if (lastEpisodeIdRef.current !== currentEpisodeId) {
      hasAutoSeekedRef.current = false;
      setHasAutoPlayed(false);
      lastEpisodeIdRef.current = currentEpisodeId;
    }
  }, [episode?._id, episode?.id]);

  // === TỐI ƯU: Auto-play khi video sẵn sàng (không seek ở đây, startPosition lo) ===
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hasNativePlayer || hasAutoPlayed) return;

    const handleCanPlay = async () => {
      if (hasAutoPlayed) return;
      try {
        await video.play();
        setIsPlaying(true);
        setHasAutoPlayed(true);
      } catch (error) {
        console.error("Auto-play failed:", error);
      }
    };

    if (video.readyState >= 3) {
      handleCanPlay();
    } else {
      video.addEventListener("canplay", handleCanPlay);
    }

    return () => {
      video.removeEventListener("canplay", handleCanPlay);
    };
  }, [hasNativePlayer, hasAutoPlayed]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hasNativePlayer || !("mediaSession" in navigator)) return;

    const { mediaSession } = navigator;
    const currentEpisodeNumber = episode?.episode || episode?.episodeId || null;
    const episodeLabel = currentEpisodeNumber ? ` - Tap ${currentEpisodeNumber}` : "";

    const setActionHandler = (action, handler) => {
      try {
        mediaSession.setActionHandler(action, handler);
      } catch {}
    };

    const safeSeek = (targetTime) => {
      if (!Number.isFinite(targetTime)) return;
      const maxTime = Number.isFinite(video.duration) ? video.duration : targetTime;
      video.currentTime = Math.max(0, Math.min(maxTime, targetTime));
    };

    setActionHandler("play", async () => {
      try {
        await video.play();
      } catch {}
    });

    setActionHandler("pause", () => {
      video.pause();
    });

    setActionHandler("stop", () => {
      video.pause();
    });

    setActionHandler("seekbackward", (details) => {
      const offset = details?.seekOffset || 10;
      safeSeek(video.currentTime - offset);
    });

    setActionHandler("seekforward", (details) => {
      const offset = details?.seekOffset || 10;
      safeSeek(video.currentTime + offset);
    });

    setActionHandler("seekto", (details) => {
      if (typeof details?.seekTime !== "number") return;
      safeSeek(details.seekTime);
    });

    try {
      mediaSession.playbackState = isPlaying ? "playing" : "paused";
    } catch {}

    if (typeof window.MediaMetadata !== "undefined") {
      try {
        mediaSession.metadata = new window.MediaMetadata({
          title: `${movie?.name || movie?.title || "CinePhine"}${episodeLabel}`,
          artist: currentAudioLabel,
          album: "CinePhine",
        });
      } catch {}
    }

    return () => {
      setActionHandler("play", null);
      setActionHandler("pause", null);
      setActionHandler("stop", null);
      setActionHandler("seekbackward", null);
      setActionHandler("seekforward", null);
      setActionHandler("seekto", null);
    };
  }, [
    currentAudioLabel,
    episode?.episode,
    episode?.episodeId,
    hasNativePlayer,
    isPlaying,
    movie?.name,
    movie?.title,
  ]);

  // Save progress logic (Giữ nguyên)
  useEffect(() => {
    const movieId = movie?._id || movie?.id;
    if (!user || !movieId || !hasNativePlayer) return;

    let isBufferingNow = false;
    const handleWaiting = () => {
      isBufferingNow = true;
    };
    const handleCanPlay = () => {
      isBufferingNow = false;
    };

    const video = videoRef.current;
    if (video) {
      video.addEventListener("waiting", handleWaiting);
      video.addEventListener("canplay", handleCanPlay);
    }

    const saveProgress = async () => {
      if (isBufferingNow) return;

      const video = videoRef.current;
      if (!video || video.paused || !duration || duration <= 0) return;

      const watchTime = Math.floor(video.currentTime);
      if (watchTime < 5) return;

      try {
        const episodeId = episode?._id || episode?.id || null;
        await userService.saveProgress({
          movieId: movieId,
          episodeId: episodeId,
          watchTime: watchTime,
          duration: Math.floor(duration),
        });
      } catch (error) {}
    };

    saveProgressIntervalRef.current = setInterval(saveProgress, 30000);

    return () => {
      if (saveProgressIntervalRef.current) {
        clearInterval(saveProgressIntervalRef.current);
      }
      if (video) {
        video.removeEventListener("waiting", handleWaiting);
        video.removeEventListener("canplay", handleCanPlay);
      }
    };
  }, [user, movie?._id, movie?.id, episode?._id, episode?.id, duration, hasNativePlayer]);

  useEffect(() => {
    const video = videoRef.current;
    const movieId = movie?._id || movie?.id;
    if (!video || !user || !movieId || !hasNativePlayer) return;

    const handlePause = async () => {
      if (!duration || duration <= 0) return;
      const watchTime = Math.floor(video.currentTime);
      if (watchTime < 5) return;

      try {
        const episodeId = episode?._id || episode?.id || null;
        await userService.saveProgress({
          movieId: movieId,
          episodeId: episodeId,
          watchTime: watchTime,
          duration: Math.floor(duration),
        });
      } catch (error) {}
    };

    video.addEventListener("pause", handlePause);
    return () => {
      video.removeEventListener("pause", handlePause);
    };
  }, [user, movie?._id, movie?.id, episode?._id, episode?.id, duration, hasNativePlayer]);

  // 2. SỬA ĐỔI: Client-side HLS Fetching & Processing
  // TỐI ƯU: Fetch progress TRƯỚC → dùng startPosition để HLS load ĐÚNG CHỖ resume
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!hlsSource) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (fileSource) {
        video.src = fileSource;
      }
      return;
    }

    const initHlsPlayer = async () => {
      if (Hls.isSupported()) {
        // === BƯỚC 1: Chỉ KHỞI TẠO progress fetching (Không await để tranh thủ làm việc khác) ===
        const movieId = movie?._id || movie?.id;

        const currentKey = window.history.state?.key || window.location.pathname;
        const lastKey = sessionStorage.getItem("watchPageKey");
        const isReload = lastKey === currentKey;
        if (!isReload) {
          localStorage.removeItem("resumeTime");
          sessionStorage.setItem("watchPageKey", currentKey);
        }
        const resumeTimeRef = localStorage.getItem("resumeTime");

        let progressPromise;
        if (resumeTime === 0 && resumeTimeRef === null) {
          localStorage.setItem("resumeTime", "1");
          progressPromise = Promise.resolve(0);
        } else if (user && movieId) {
          progressPromise = userService
            .getProgress(movieId)
            .then((response) => {
              if (response?.success && response?.data) {
                const progress = response.data;
                if (progress.progress < 95 && progress.watchTime > 5) {
                  let matched = true;
                  if (episode?._id || episode?.id) {
                    const savedEpisodeId =
                      progress.episodeId?._id || progress.episodeId?.id || progress.episodeId;
                    const currentEpisodeId = episode._id || episode.id;
                    matched =
                      savedEpisodeId && savedEpisodeId.toString() === currentEpisodeId.toString();
                  }
                  if (matched) return Math.max(0, progress.watchTime - 3);
                }
              }
              return resumeTime !== null && resumeTime > 0 ? Math.max(0, resumeTime - 3) : -1;
            })
            .catch(() =>
              resumeTime !== null && resumeTime > 0 ? Math.max(0, resumeTime - 3) : -1
            );
        } else {
          progressPromise = Promise.resolve(
            resumeTime !== null && resumeTime > 0 ? Math.max(0, resumeTime - 3) : -1
          );
        }

        // === BƯỚC 2: Khởi tạo HLS NGAY LẬP TỨC ===
        const hls = new Hls({
          maxBufferLength: 90,
          maxMaxBufferLength: 180,
          backBufferLength: 90,
          maxBufferSize: 30 * 1000 * 1000,
          startFragPrefetch: true,
          autoStartLoad: false,
          lowLatencyMode: false,
          manifestLoadingTimeOut: 20000,
          fragLoadingTimeOut: 25000,
          manifestLoadingMaxRetry: 3,
          fragLoadingMaxRetry: 3,
          levelLoadingMaxRetry: 3,
        });

        try {
          console.log("🚀 Bắt đầu tải M3U8:", hlsSource, `mode=${lastPlaybackModeRef.current}`);

          if (USE_SERVER_ADBLOCK) {
            // Server proxy xử lý toàn bộ: lọc quảng cáo + adaptive bitrate
            // Chỉ cần truyền URL proxy trực tiếp cho HLS.js
            console.log("✅ Server-side Adblock Active");
            hls.loadSource(hlsSource);
          } else {
            // --- CHẠY LOGIC LỌC QUẢNG CÁO Ở CLIENT ---

            // 1. Fetch file gốc
            let currentUrl = hlsSource;
            let response = await fetch(currentUrl);
            let content = await response.text();

            // --- GIAI ĐOẠN 1: XỬ LÝ MASTER PLAYLIST ---
            if (content.includes("#EXT-X-STREAM-INF")) {
              console.log("⚠️ Phát hiện Master Playlist -> Đang tìm luồng chất lượng cao nhất...");

              const lines = content.split("\n");
              let maxBandwidth = 0;
              let bestUri = "";

              for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes("BANDWIDTH=")) {
                  const match = lines[i].match(/BANDWIDTH=(\d+)/);
                  const bandwidth = match ? parseInt(match[1]) : 0;

                  const nextLine = (lines[i + 1] || "").trim();
                  if (nextLine && !nextLine.startsWith("#") && bandwidth > maxBandwidth) {
                    maxBandwidth = bandwidth;
                    bestUri = nextLine;
                  }
                }
              }

              if (bestUri) {
                currentUrl = new URL(bestUri, currentUrl).toString();
                console.log("👉 Chuyển hướng sang Media Playlist:", currentUrl);

                response = await fetch(currentUrl);
                content = await response.text();
              }
            }

            // --- GIAI ĐOẠN 2: LỌC QUẢNG CÁO & REWRITE LINK ---
            const baseUrl = currentUrl.substring(0, currentUrl.lastIndexOf("/") + 1);
            const AD_KEYWORDS = ["/v7/", "/adjump/", "google", "ads", "doubleclick", "facebook"];
            const lines = content.split("\n");
            const cleanLines = [];
            let skipNext = false;

            for (let i = 0; i < lines.length; i++) {
              let line = lines[i].trim();
              if (!line) continue;

              if (line.startsWith("#EXTINF")) {
                let nextLine = (lines[i + 1] || "").trim();
                if (nextLine && !nextLine.startsWith("#")) {
                  const isAd = AD_KEYWORDS.some((k) => nextLine.includes(k));
                  if (isAd) {
                    console.log("🚫 Đã chặn 1 quảng cáo:", nextLine);
                    skipNext = true;
                    continue;
                  }
                }
              }

              if (skipNext) {
                skipNext = false;
                continue;
              }

              if (!line.startsWith("#")) {
                if (!line.startsWith("http")) {
                  line = new URL(line, baseUrl).toString();
                }
                if (line.includes("convertv7/")) {
                  line = line.replace("convertv7/", "");
                }
              }
              cleanLines.push(line);
            }

            const cleanM3u8Content = cleanLines.join("\n");

            // 3. Tạo Blob URL
            const blob = new Blob([cleanM3u8Content], { type: "application/vnd.apple.mpegurl" });

            if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
            blobUrlRef.current = URL.createObjectURL(blob);

            console.log("✅ Client-side Adblock Active (Blob Created)");
            hls.loadSource(blobUrlRef.current);
          }
        } catch (err) {
          console.error("❌ Lỗi xử lý M3U8:", err);
          // Fallback về link gốc (hlsSource) nếu lỗi, chấp nhận có ads
          hls.loadSource(hlsSource);
        }

        hls.attachMedia(video);
        hlsRef.current = hls;
        resetNetworkRecoveryState();

        // ... (Giữ nguyên phần Event Listeners bên dưới) ...
        hls.on(Hls.Events.MANIFEST_PARSED, async () => {
          const levels = hls.levels || [];
          setAvailableLevels(levels);
          if (levels.length > 0) {
            const currentLevel = hls.currentLevel >= 0 ? levels[hls.currentLevel] : levels[0];
            const actualHeight = currentLevel?.height || null;
            setCurrentActualQuality(actualHeight ? `${actualHeight}p` : null);
          }

          const normalizedProgressPromise = Promise.resolve(progressPromise)
            .then((value) => (typeof value === "number" ? value : -1))
            .catch(() => -1);

          const startPos = await Promise.race([
            normalizedProgressPromise,
            new Promise((resolve) => setTimeout(() => resolve(null), START_POSITION_BUDGET_MS)),
          ]);

          if (typeof startPos === "number") {
            console.log(
              `[VideoPlayer] Start load at position: ${startPos >= 0 ? `${startPos}s` : "default"}`
            );

            if (startPos >= 0) {
              hasAutoSeekedRef.current = true;
              video.currentTime = startPos;
              hls.startLoad(startPos);
            } else {
              hls.startLoad();
            }
            return;
          }

          console.log("[VideoPlayer] Start load immediately while waiting for resume position...");
          hls.startLoad();

          normalizedProgressPromise.then((lateStartPos) => {
            if (lateStartPos < 0 || hasAutoSeekedRef.current) return;
            if (video.seeking || video.currentTime > 5) return;

            hasAutoSeekedRef.current = true;
            video.currentTime = lateStartPos;
            console.log(`[VideoPlayer] Applied delayed resume position: ${lateStartPos}s`);
          });
        });

        // CORS Error Detection: Switch to proxy if CORS error detected
        hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
          const currentLevel = hls.levels[data.level];
          const actualHeight = currentLevel?.height || null;
          setCurrentActualQuality(actualHeight ? `${actualHeight}p` : null);
        });

        hls.on(Hls.Events.FRAG_LOADED, () => {
          resetNetworkRecoveryState();
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.warn("[VideoPlayer] HLS error:", {
            type: data.type,
            details: data.details,
            fatal: data.fatal,
            url: getHlsErrorUrl(data),
            code: data?.response?.code ?? data?.response?.status ?? null,
          });

          if (data.type === Hls.ErrorTypes.NETWORK_ERROR && shouldEscalateToProxyMode(data)) {
            const domain = sourceDomainRef.current;
            if (domain && !needsProxyForSource(domain) && lastPlaybackModeRef.current !== "proxy") {
              console.log(
                "[VideoPlayer] Escalating this source to proxy-ts mode after repeated blocked segment errors"
              );
              setProxySource(domain, true);
              setUseProxyMode(true);
              setShowControls(true);
              setIsBuffering(true);
              hls.destroy();
              return;
            }
          }

          if (!data.fatal) {
            return;
          }

          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            setIsBuffering(true);
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            hls.destroy();
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari Native
        try {
          // Với Safari, logic Drill down này phức tạp hơn vì Safari không hỗ trợ Blob URL tốt cho stream dài
          // Nên tạm thời fallback về source gốc
          video.src = hlsSource;
        } catch (e) {
          video.src = hlsSource;
        }
      }
    };

    initHlsPlayer();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      if (saveProgressIntervalRef.current) {
        clearInterval(saveProgressIntervalRef.current);
        saveProgressIntervalRef.current = null;
      }
    };
  }, [hlsSource, fileSource]);

  // --- Các helper function xử lý giao diện (Controls, Menu...) giữ nguyên ---

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (singleTapTimeoutRef.current) clearTimeout(singleTapTimeoutRef.current);
      if (doubleTapDismissRef.current) clearTimeout(doubleTapDismissRef.current);
      clearPendingBuffering();
    };
  }, [clearPendingBuffering]);

  // Clear double tap feedback animation after 800ms of no new taps
  useEffect(() => {
    if (doubleTapInfo) {
      if (doubleTapDismissRef.current) clearTimeout(doubleTapDismissRef.current);
      doubleTapDismissRef.current = setTimeout(() => setDoubleTapInfo(null), 800);
      return () => {
        if (doubleTapDismissRef.current) clearTimeout(doubleTapDismissRef.current);
      };
    }
  }, [doubleTapInfo]);

  useEffect(() => {
    if (isDraggingProgress) {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      setShowControls(true);
    } else {
      if (isPlaying && hasNativePlayer && !isBuffering) {
        const delay = isFullscreen ? 2000 : 3000;
        controlsTimeoutRef.current = setTimeout(() => {
          setShowControls(false);
          setShowMoreMenu(false);
          setShowSpeedMenu(false);
          setShowQualityMenu(false);
          setShowAudioMenu(false);
        }, delay);
      }
    }
  }, [isDraggingProgress, isPlaying, isFullscreen, hasNativePlayer, isBuffering]);

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
  };

  const handleVideoClick = (e) => {
    if (e.target.closest(".pointer-events-auto")) return;

    const now = Date.now();
    const timeDiff = now - lastTapRef.current.time;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const isLeftSide = clickX < rect.left + rect.width / 2;
    const side = isLeftSide ? "left" : "right";

    lastTapRef.current = { time: now };

    if (timeDiff < 300 && timeDiff > 0) {
      // === DOUBLE TAP — tua 10s, cộng dồn nếu tap liên tục ===
      if (singleTapTimeoutRef.current) clearTimeout(singleTapTimeoutRef.current);

      const seekAmount = isLeftSide ? -10 : 10;
      handleSkip(seekAmount);

      setDoubleTapInfo((prev) => {
        // Cộng dồn nếu cùng phía, reset nếu đổi phía
        const prevSeconds = prev && prev.side === side ? prev.totalSeconds : 0;
        return {
          side,
          totalSeconds: prevSeconds + 10,
          id: now, // key mới để trigger animation lại
        };
      });
      return;
    }

    // === SINGLE TAP — delay 200ms để phân biệt ===
    singleTapTimeoutRef.current = setTimeout(() => {
      if (showControls) {
        handlePlayPause();
      } else {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        const delay = isFullscreen ? 2000 : 3000;
        controlsTimeoutRef.current = setTimeout(() => {
          if (!isDraggingProgress && isPlaying && !isBuffering) setShowControls(false);
        }, delay);
      }
    }, 200);
  };

  const handleSeek = async (timeOrEvent) => {
    const video = videoRef.current;
    if (!video) return;
    let newTime;
    if (typeof timeOrEvent === "number") {
      newTime = timeOrEvent;
    } else if (timeOrEvent?.currentTarget) {
      const rect = timeOrEvent.currentTarget.getBoundingClientRect();
      const clickX = timeOrEvent.clientX - rect.left;
      newTime = (clickX / rect.width) * duration;
    } else return;

    if (isNaN(newTime) || newTime < 0) newTime = 0;
    else if (newTime > duration) newTime = duration;

    video.currentTime = newTime;

    const movieId = movie?._id || movie?.id;
    if (user && movieId && duration > 0) {
      try {
        const episodeId = episode?._id || episode?.id || null;
        await userService.saveProgress({
          movieId: movieId,
          episodeId: episodeId,
          watchTime: Math.floor(newTime),
          duration: Math.floor(duration),
        });
      } catch (error) {}
    }
  };

  const handleVolumeChange = (e) => {
    const video = videoRef.current;
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (video) {
      video.volume = newVolume;
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isMuted) {
      video.volume = volume;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  const handleSkip = (seconds) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seconds));
  };

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container) return;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (isIOS && video && video.webkitEnterFullscreen) {
        try {
          video.webkitEnterFullscreen();
          setIsFullscreen(true);
          return;
        } catch (err) {}
      }

      const requestFullscreen =
        container.requestFullscreen ||
        container.webkitRequestFullscreen ||
        container.mozRequestFullScreen ||
        container.msRequestFullscreen;

      if (requestFullscreen) {
        requestFullscreen
          .call(container)
          .then(() => {
            setIsFullscreen(true);
            if (window.screen?.orientation?.lock) {
              window.screen.orientation.lock("landscape").catch(() => {});
            }
          })
          .catch((err) => console.error(err));
      }
    } else {
      const exitFullscreen =
        document.exitFullscreen ||
        document.webkitExitFullscreen ||
        document.mozCancelFullScreen ||
        document.msExitFullscreen;

      if (exitFullscreen) {
        exitFullscreen
          .call(document)
          .then(() => {
            setIsFullscreen(false);
            if (window.screen?.orientation?.unlock) {
              window.screen.orientation.unlock();
            }
          })
          .catch((err) => console.error(err));
      }
    }
  }, []);

  const handleSpeedChange = (speed) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    setPlaybackRate(speed);
    setShowSpeedMenu(false);
    setShowMoreMenu(false);
  };

  const handlePictureInPicture = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMouseMove = () => {
    if (!hasNativePlayer) return;
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (!isDraggingProgress && !isBuffering) {
      const delay = isFullscreen ? 2000 : 3000;
      controlsTimeoutRef.current = setTimeout(() => {
        if (!isDraggingProgress && isPlaying) {
          setShowControls(false);
          setShowMoreMenu(false);
          setShowSpeedMenu(false);
          setShowQualityMenu(false);
          setShowAudioMenu(false);
        }
      }, delay);
    }
  };

  const handleNextEpisode = () => {
    const currentEpNumber = episode?.episode || episode?.episodeId || 1;
    if (currentEpNumber < totalEpisodes) {
      onEpisodeChange(currentEpNumber + 1);
    }
  };

  const handleAudioChange = (type) => {
    if (onAudioTypeChange) onAudioTypeChange(type);
    setShowAudioMenu(false);
    setShowMoreMenu(false);
  };

  const toggleAudioMenu = () => {
    setShowAudioMenu((prev) => {
      if (!prev) {
        setShowSpeedMenu(false);
        setShowQualityMenu(false);
      }
      return !prev;
    });
  };

  const toggleSpeedMenu = () => {
    setShowSpeedMenu((prev) => {
      if (!prev) {
        setShowAudioMenu(false);
        setShowQualityMenu(false);
      }
      return !prev;
    });
  };

  const toggleQualityMenu = () => {
    setShowQualityMenu((prev) => {
      if (!prev) {
        setShowAudioMenu(false);
        setShowSpeedMenu(false);
      }
      return !prev;
    });
  };

  const qualityOptions = useMemo(() => {
    const standardOptions = ["Auto", "1080p", "720p", "480p", "360p"];
    const levels = Array.isArray(availableLevels) ? availableLevels : [];
    if (levels.length > 0) {
      const heightsFromLevels = [...new Set(levels.map((l) => l?.height).filter(Boolean))].sort(
        (a, b) => b - a
      );
      const options = ["Auto"];
      heightsFromLevels.forEach((h) => {
        const label = `${h}p`;
        if (!options.includes(label)) options.push(label);
      });
      standardOptions.slice(1).forEach((opt) => {
        if (!options.includes(opt)) options.push(opt);
      });
      return options.sort((a, b) => {
        if (a === "Auto") return -1;
        if (b === "Auto") return 1;
        return parseInt(b) - parseInt(a);
      });
    }
    return standardOptions;
  }, [availableLevels]);

  const getLevelIndexForQuality = (qualityStr, levels) => {
    if (!levels || levels.length === 0 || qualityStr === "Auto") return -1;
    const targetHeight = parseInt(qualityStr.replace("p", ""), 10);
    if (isNaN(targetHeight)) return -1;
    let bestMatch = -1,
      minDiff = Infinity;
    for (let i = 0; i < levels.length; i++) {
      const level = levels[i];
      if (!level.height) continue;
      const diff = Math.abs(level.height - targetHeight);
      if (diff < minDiff) {
        minDiff = diff;
        bestMatch = i;
      }
    }
    return minDiff > 100 ? -1 : bestMatch;
  };

  const getMaxAllowedQuality = useCallback(() => {
    if (!availableLevels || availableLevels.length === 0) return null;
    const heightsFromLevels = [...availableLevels]
      .map((l) => l?.height)
      .filter(Boolean)
      .sort((a, b) => b - a);
    const sortedLevels = heightsFromLevels.length > 0 ? heightsFromLevels : [1080, 720, 480, 360];
    if (sortedLevels.length === 0) return null;
    if (isPremium || isAdmin) return sortedLevels[0];
    if (isRegularUser && sortedLevels.length > 1) {
      const maxRegularQuality = sortedLevels.find((h) => h <= 720) || sortedLevels[1];
      return maxRegularQuality;
    }
    return sortedLevels[0];
  }, [availableLevels, isPremium, isAdmin, isRegularUser]);

  const isQualityPremium = useCallback(
    (qualityStr) => {
      if (qualityStr === "Auto") return false;
      const height = parseInt(qualityStr.replace("p", ""), 10);
      if (isNaN(height) || isPremium || isAdmin) return false;
      return height > 720;
    },
    [isPremium, isAdmin]
  );

  const applyQualityLevel = useCallback(
    (hls, qualityStr) => {
      if (!hls || !hls.levels || hls.levels.length === 0) return;
      if (qualityStr === "Auto") {
        if (isAdmin || isPremium) hls.currentLevel = -1;
        else if (isRegularUser) {
          const level720Index = hls.levels.findIndex((l) => l?.height && l.height <= 720);
          hls.currentLevel = level720Index >= 0 ? level720Index : hls.levels.length - 1;
        } else hls.currentLevel = -1;
        if (hls.media && hls.media.readyState >= 2) hls.startLoad();
        return;
      }
      const levelIndex = getLevelIndexForQuality(qualityStr, hls.levels);
      if (levelIndex >= 0 && levelIndex < hls.levels.length) {
        const selectedLevel = hls.levels[levelIndex];
        const selectedHeight = selectedLevel?.height;
        if (isRegularUser && selectedHeight > 720) {
          const allowedLevelIndex = hls.levels.findIndex((l) => l?.height && l.height <= 720);
          hls.currentLevel = allowedLevelIndex >= 0 ? allowedLevelIndex : hls.levels.length - 1;
        } else {
          if (hls.currentLevel !== levelIndex) hls.currentLevel = levelIndex;
        }
        if (hls.media && hls.media.readyState >= 2) hls.startLoad();
      }
    },
    [isRegularUser, isAdmin, isPremium]
  );

  const handleQualityChange = (newQuality) => {
    if (isQualityPremium(newQuality) && !isPremium) {
      setShowPremiumModal(true);
      setShowQualityMenu(false);
      setShowMoreMenu(false);
      return;
    }
    setQuality(newQuality);
    setShowQualityMenu(false);
    setShowMoreMenu(false);
  };

  useEffect(() => {
    if (hlsRef.current && hlsRef.current.levels && availableLevels.length > 0) {
      applyQualityLevel(hlsRef.current, quality);
    }
  }, [quality, availableLevels.length, applyQualityLevel]);

  // ====================================================================
  // HEY TIMI - VOICE COMMAND EVENT LISTENERS
  // Lắng nghe các sự kiện giọng nói từ VoiceContext và điều khiển VideoPlayer
  // ====================================================================
  useEffect(() => {
    const onPlay = () => {
      const video = videoRef.current;
      if (video && video.paused) video.play().catch(() => {});
    };
    const onPause = () => {
      const video = videoRef.current;
      if (video && !video.paused) video.pause();
    };
    const onNextEp = () => handleNextEpisode();
    const onSeek = (e) => {
      const video = videoRef.current;
      if (!video) return;
      const seconds = e.detail?.seconds || 10;
      video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seconds));
    };
    const onFullscreen = () => toggleFullscreen();
    const onVolumeUp = () => {
      const video = videoRef.current;
      if (!video) return;
      const newVol = Math.min(1, video.volume + 0.1);
      video.volume = newVol;
      setVolume(newVol);
      setIsMuted(false);
    };
    const onVolumeDown = () => {
      const video = videoRef.current;
      if (!video) return;
      const newVol = Math.max(0, video.volume - 0.1);
      video.volume = newVol;
      setVolume(newVol);
      if (newVol === 0) setIsMuted(true);
    };
    const onMute = () => {
      const video = videoRef.current;
      if (video) {
        video.volume = 0;
        setIsMuted(true);
      }
    };
    const onUnmute = () => {
      const video = videoRef.current;
      if (video) {
        video.volume = volume;
        setIsMuted(false);
      }
    };
    const onDuckAudio = () => {
      const video = videoRef.current;
      if (video && !isMuted && video.volume > 0.05) {
        video.volume = 0.05;
      }
    };
    const onRestoreAudio = () => {
      const video = videoRef.current;
      if (video && !isMuted) {
        video.volume = volume;
      }
    };

    // === PHASE 4: Advanced Voice Commands ===
    const onChangeEpisode = (e) => {
      const epNum = e.detail?.episode_number;
      if (epNum && onEpisodeChange) {
        console.log(`[Timi] 🎬 Chuyển tới tập ${epNum}`);
        onEpisodeChange(epNum);
      }
    };
    const onChangeAudio = (e) => {
      const audioTypeVal = e.detail?.audio_type;
      if (audioTypeVal && onAudioTypeChange) {
        console.log(`[Timi] 🔊 Đổi âm thanh sang: ${audioTypeVal}`);
        onAudioTypeChange(audioTypeVal);
      }
    };
    const onMaxVolume = () => {
      const video = videoRef.current;
      if (video) {
        video.volume = 1;
        setVolume(1);
        setIsMuted(false);
      }
    };
    const onPrevEp = () => {
      const currentEpNumber = episode?.episode || episode?.episodeId || 1;
      if (currentEpNumber > 1 && onEpisodeChange) {
        onEpisodeChange(currentEpNumber - 1);
      }
    };

    window.addEventListener("VOICE_CMD_PLAY", onPlay);
    window.addEventListener("VOICE_CMD_PAUSE", onPause);
    window.addEventListener("VOICE_CMD_NEXT_EP", onNextEp);
    window.addEventListener("VOICE_CMD_PREV_EP", onPrevEp);
    window.addEventListener("VOICE_CMD_SEEK", onSeek);
    window.addEventListener("VOICE_CMD_FULLSCREEN", onFullscreen);
    window.addEventListener("VOICE_CMD_VOLUME_UP", onVolumeUp);
    window.addEventListener("VOICE_CMD_VOLUME_DOWN", onVolumeDown);
    window.addEventListener("VOICE_CMD_MUTE", onMute);
    window.addEventListener("VOICE_CMD_UNMUTE", onUnmute);
    window.addEventListener("VOICE_CMD_DUCK_AUDIO", onDuckAudio);
    window.addEventListener("VOICE_CMD_RESTORE_AUDIO", onRestoreAudio);
    window.addEventListener("VOICE_CMD_CHANGE_EPISODE", onChangeEpisode);
    window.addEventListener("VOICE_CMD_CHANGE_AUDIO", onChangeAudio);
    window.addEventListener("VOICE_CMD_MAX_VOLUME", onMaxVolume);

    return () => {
      window.removeEventListener("VOICE_CMD_PLAY", onPlay);
      window.removeEventListener("VOICE_CMD_PAUSE", onPause);
      window.removeEventListener("VOICE_CMD_NEXT_EP", onNextEp);
      window.removeEventListener("VOICE_CMD_PREV_EP", onPrevEp);
      window.removeEventListener("VOICE_CMD_SEEK", onSeek);
      window.removeEventListener("VOICE_CMD_FULLSCREEN", onFullscreen);
      window.removeEventListener("VOICE_CMD_VOLUME_UP", onVolumeUp);
      window.removeEventListener("VOICE_CMD_VOLUME_DOWN", onVolumeDown);
      window.removeEventListener("VOICE_CMD_MUTE", onMute);
      window.removeEventListener("VOICE_CMD_UNMUTE", onUnmute);
      window.removeEventListener("VOICE_CMD_DUCK_AUDIO", onDuckAudio);
      window.removeEventListener("VOICE_CMD_RESTORE_AUDIO", onRestoreAudio);
      window.removeEventListener("VOICE_CMD_CHANGE_EPISODE", onChangeEpisode);
      window.removeEventListener("VOICE_CMD_CHANGE_AUDIO", onChangeAudio);
      window.removeEventListener("VOICE_CMD_MAX_VOLUME", onMaxVolume);
    };
  }, [duration, volume, toggleFullscreen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDownloadMovie = useCallback(async () => {
    if (!user) {
      openAuthModal("login");
      return;
    }

    if (isDownloading) {
      showToast("Đang có một tiến trình tải phim, vui lòng đợi!", "warning");
      return;
    }

    let rawM3u8 = null;
    if (episode?.link_m3u8) {
      rawM3u8 = episode.link_m3u8;
    } else if (episode?.videoUrl && episode.videoUrl.includes(".m3u8")) {
      rawM3u8 = episode.videoUrl;
    } else if (videoUrl && videoUrl.includes(".m3u8")) {
      rawM3u8 = videoUrl;
    }

    if (!rawM3u8) {
      showToast("Không tìm thấy link tải phim!", "error");
      return;
    }

    setIsDownloading(true);
    setIsDownloadMinimized(false);
    setDownloadProgress(0);
    downloadAbortControllerRef.current = new AbortController();
    const signal = downloadAbortControllerRef.current.signal;

    showToast("Đang lấy thông tin các phân đoạn phim từ Server...", "info");

    try {
      const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000/api/v1";
      const movieNameStr = movie?.name || "Phim";
      const episodeStr = episode?.name ? ` - Tập ${episode.name}` : "";
      const baseFilename = `CinePhine - ${movieNameStr}${episodeStr}`;

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const supportsDirectDisk = !!window.showSaveFilePicker;

      if (isMobile || !supportsDirectDisk) {
        // --- NHÁNH 1: SERVER PROXY (Dành cho Mobile hoặc Desktop Firefox/HTTP) ---
        setIsDownloading(false);
        const reason = isMobile
          ? "thiết bị di động"
          : "Trình duyệt của bạn. (Chuyển tiếp qua máy chủ phụ trợ)";
        showToast(`Đang kết nối luồng tải MP4 dành riêng cho ${reason}...`, "info");

        const mobileDownloadUrl = `${apiUrl}/movies/download-mobile?url=${encodeURIComponent(rawM3u8)}&filename=${encodeURIComponent(baseFilename)}`;

        // Gõ cửa kiểm tra xem Server có full chỗ không (Pre-flight HEAD request)
        const checkRes = await fetch(mobileDownloadUrl, { method: "HEAD" });

        if (checkRes.status === 429) {
          showToast(
            "Server đang có quá nhiều (+3) giao dịch tải phim cùng lúc! Vui lòng thử lại sau vài phút.",
            "error"
          );
          return; // Hủy không tải
        } else if (!checkRes.ok) {
          throw new Error("Lỗi kết nối đến luồng tải phụ trợ. " + checkRes.status);
        }

        // Nếu còn slot, ra lệnh tải
        showToast(
          "Máy chủ đang rải luồng phim gốc. Trình duyệt của bạn sẽ từ từ nhặt lưu về máy ngay lập tức!",
          "success"
        );
        const a = document.createElement("a");
        a.href = mobileDownloadUrl;
        a.setAttribute("download", `${baseFilename}.mp4`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        // --- NHÁNH 2: DESKTOP NATIVE FILE SYSTEM (Chrome/Edge/Brave - Tối ưu đỉnh cao - 0% RAM & CPU) ---
        const response = await fetch(
          `${apiUrl}/movies/download?url=${encodeURIComponent(rawM3u8)}`
        );
        if (!response.ok) throw new Error("Lỗi khi lấy thông tin tải phim từ Server");

        const { segments } = await response.json();
        if (!segments || segments.length === 0)
          throw new Error("Không tìm thấy dữ liệu video stream hợp lệ");

        setDownloadTotalSegments(segments.length);
        setDownloadCompletedSegments(0);

        showToast(
          `Bắt đầu kéo ${segments.length} phân đoạn video xuống đĩa cứng (Bỏ qua RAM)...`,
          "info"
        );
        try {
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: `${baseFilename}.ts`,
            types: [{ description: "TS Video File", accept: { "video/mp2t": [".ts"] } }],
          });

          const writable = await fileHandle.createWritable();
          let completed = 0;

          for (let i = 0; i < segments.length; i += 4) {
            const batch = segments.slice(i, i + 4);
            const buffers = await Promise.all(
              batch.map(async (segUrl) => {
                const res = await fetch(segUrl, { signal });
                return await res.arrayBuffer();
              })
            );
            for (const buffer of buffers) {
              await writable.write(buffer);
              completed++;
              setDownloadCompletedSegments(completed);
              setDownloadProgress(Math.floor((completed / segments.length) * 100));
            }
          }
          await writable.close();
          showToast(`Đã lưu thành công phim vào máy của bạn!`, "success");
        } catch (err) {
          if (err.name !== "AbortError") throw err; // Chống lỗi khi user huỷ
        }
      }
    } catch (error) {
      if (error.name === "AbortError") return; // Bỏ qua lốc lỗi nếu người dùng chủ động huỷ
      console.error("Lỗi tải phim", error);
      showToast(
        error.message || "Có lỗi xảy ra trong quá trình tải. Giao thức bị từ chối.",
        "error"
      );
    } finally {
      setIsDownloading(false);
    }
  }, [user, episode, videoUrl, movie, showToast, openAuthModal, isDownloading]);

  const handleCancelDownload = useCallback(() => {
    if (downloadAbortControllerRef.current) {
      downloadAbortControllerRef.current.abort();
    }
    setIsDownloading(false);
    showToast("Tiến trình tải phim đã bị hủy.", "info");
  }, [showToast]);

  const blurAmount = useMemo(() => {
    if (quality === "Auto" || !currentActualQuality) return 0;
    const selectedHeight = parseInt(quality.replace("p", ""), 10);
    const actualHeight = parseInt(currentActualQuality.replace("p", ""), 10);
    if (isNaN(selectedHeight) || isNaN(actualHeight) || actualHeight <= selectedHeight) return 0;
    const diffPercent = ((actualHeight - selectedHeight) / actualHeight) * 100;
    if (diffPercent >= 60) return 2;
    if (diffPercent >= 40) return 1;
    if (diffPercent >= 20) return 0.5;
    return 0;
  }, [quality, currentActualQuality]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement;
      setIsFullscreen(!!isCurrentlyFullscreen);
      if (!isCurrentlyFullscreen && window.screen?.orientation?.unlock)
        window.screen.orientation.unlock();
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const video = videoRef.current;
      if (!video) return;
      if (
        ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName) ||
        document.activeElement.isContentEditable
      )
        return;
      if (["Space", "ArrowLeft", "ArrowRight", "KeyF", "KeyM", "KeyK"].includes(e.code))
        e.preventDefault();
      switch (e.code) {
        case "Space":
        case "KeyK":
          video.paused ? video.play() : video.pause();
          break;
        case "ArrowLeft":
          video.currentTime = Math.max(0, video.currentTime - 10);
          break;
        case "ArrowRight":
          video.currentTime = Math.min(duration, video.currentTime + 10);
          break;
        case "KeyF":
          toggleFullscreen();
          break;
        case "KeyM":
          toggleMute();
          break;
        default:
          break;
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [duration, toggleFullscreen, toggleMute]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showMoreMenu && !e.target.closest(".more-menu-container")) setShowMoreMenu(false);
      if (showSpeedMenu && !e.target.closest(".speed-menu-container")) setShowSpeedMenu(false);
      if (showQualityMenu && !e.target.closest(".quality-menu-container"))
        setShowQualityMenu(false);
      if (showAudioMenu && !e.target.closest(".audio-menu-container")) setShowAudioMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMoreMenu, showSpeedMenu, showQualityMenu, showAudioMenu]);

  useEffect(() => {
    if (!showMoreMenu) {
      setShowAudioMenu(false);
      setShowSpeedMenu(false);
      setShowQualityMenu(false);
    }
  }, [showMoreMenu]);

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black rounded-lg aspect-[16/9] max-w-full touch-none"
      style={{ cursor: isFullscreen && !showControls ? "none" : "default" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        if (isPlaying && !isBuffering) setShowControls(false);
        setShowMoreMenu(false);
        setShowSpeedMenu(false);
        setShowQualityMenu(false);
        setShowAudioMenu(false);
      }}
      onTouchStart={(e) => {
        if (e.target.closest(".pointer-events-auto")) e.stopPropagation();
      }}
    >
      {hasNativePlayer ? (
        <video
          ref={videoRef}
          className="w-full h-full rounded-lg"
          src={!hlsSource ? fileSource : undefined}
          onClick={handleVideoClick}
          playsInline
          webkit-playsinline="true"
          x5-playsinline="true"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            cursor: isFullscreen && !showControls ? "none" : "pointer",
            filter: blurAmount > 0 ? `blur(${blurAmount}px)` : "none",
            transition: "filter 0.3s ease-in-out",
            WebkitTouchCallout: "none",
            WebkitUserSelect: "none",
            touchAction: "manipulation",
          }}
        />
      ) : embedSource ? (
        <iframe
          src={embedSource}
          title="Movie player"
          allow="autoplay; fullscreen"
          allowFullScreen
          className="w-full h-full rounded-lg border-0"
          style={{ minHeight: 360 }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white text-sm text-center px-4">
          Chưa có nguồn phát cho tập phim này. Vui lòng thử tập khác hoặc quay lại sau.
        </div>
      )}

      {/* ═══ Double Tap Seek Overlay ═══ */}
      {doubleTapInfo && (
        <div
          key={doubleTapInfo.id}
          className="absolute top-0 bottom-0 left-0 right-0 pointer-events-none overflow-hidden z-40"
        >
          {/* Radial glow background — chỉ hiện ở phía tua */}
          <div
            className="absolute top-0 bottom-0 w-1/2"
            style={{
              [doubleTapInfo.side === "left" ? "left" : "right"]: 0,
              background:
                doubleTapInfo.side === "left"
                  ? "radial-gradient(ellipse at 25% 50%, rgba(255,255,255,0.07) 0%, transparent 65%)"
                  : "radial-gradient(ellipse at 75% 50%, rgba(255,255,255,0.07) 0%, transparent 65%)",
            }}
          />

          {/* Ripple circle — neo vào cạnh ngoài */}
          <div
            className="absolute animate-ripple rounded-full bg-white/[0.07]"
            style={{
              width: 130,
              height: 130,
              top: "calc(50% - 65px)",
              [doubleTapInfo.side === "left" ? "left" : "right"]: "8%",
            }}
          />

          {/* Glass indicator — cố định gần cạnh ngoài */}
          <div
            className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 animate-fade-in-up"
            style={{
              [doubleTapInfo.side === "left" ? "left" : "right"]: "16%",
            }}
          >
            {/* Animated seek chevrons */}
            <div
              className={`flex items-center gap-[2px] ${
                doubleTapInfo.side === "left" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {[0, 1, 2].map((i) => (
                <svg
                  key={i}
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-white"
                  style={{
                    animation: `seekChevron 0.6s ease-in-out ${i * 0.1}s infinite`,
                    opacity: 0.4 + i * 0.3,
                  }}
                >
                  <path
                    d={doubleTapInfo.side === "left" ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"}
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ))}
            </div>

            {/* Seconds label */}
            <span className="text-white text-sm font-bold tabular-nums drop-shadow-lg">
              {doubleTapInfo.totalSeconds} giây
            </span>
          </div>
        </div>
      )}

      <VideoOverlays
        hasNativePlayer={hasNativePlayer}
        isBuffering={isBuffering}
        isPlaying={isPlaying}
        movie={movie}
        currentTime={currentTime}
        onPlayPause={handlePlayPause}
      />

      <VideoControls
        showControls={showControls}
        isBuffering={isBuffering}
        hasNativePlayer={hasNativePlayer}
        currentTime={currentTime}
        duration={duration}
        bufferedPercentage={bufferedPercentage}
        onSeek={handleSeek}
        videoRef={videoRef}
        onDragStateChange={setIsDraggingProgress}
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        onSkip={handleSkip}
        volume={volume}
        isMuted={isMuted}
        onVolumeChange={handleVolumeChange}
        onToggleMute={toggleMute}
        episode={episode}
        totalEpisodes={totalEpisodes}
        onNextEpisode={handleNextEpisode}
        audioOptions={audioOptions}
        audioType={audioType}
        currentAudioLabel={currentAudioLabel}
        showAudioMenu={showAudioMenu}
        onToggleAudioMenu={toggleAudioMenu}
        onAudioChange={handleAudioChange}
        playbackRate={playbackRate}
        showSpeedMenu={showSpeedMenu}
        onToggleSpeedMenu={toggleSpeedMenu}
        onSpeedChange={handleSpeedChange}
        quality={quality}
        qualityOptions={qualityOptions}
        showQualityMenu={showQualityMenu}
        onToggleQualityMenu={toggleQualityMenu}
        onQualityChange={handleQualityChange}
        isPremium={isPremium}
        isQualityPremium={isQualityPremium}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        onPictureInPicture={handlePictureInPicture}
        showMoreMenu={showMoreMenu}
        onToggleMoreMenu={() => setShowMoreMenu(!showMoreMenu)}
        setShowMoreMenu={setShowMoreMenu}
        onDownload={handleDownloadMovie}
        isDownloading={isDownloading}
        downloadProgress={downloadProgress}
        isDownloadMinimized={isDownloadMinimized}
        onToggleDownloadMinimize={() => setIsDownloadMinimized(!isDownloadMinimized)}
      />

      {/* Download Progress Overlay */}
      {isDownloading && (
        <div
          className={`absolute z-50 bg-black/85 p-6 flex flex-col items-center justify-center border border-white/10 min-w-[320px] backdrop-blur-xl shadow-2xl transition-all duration-500 ease-in-out origin-bottom
            ${
              isDownloadMinimized
                ? "left-1/2 top-full -translate-x-1/2 -translate-y-[120px] scale-50 opacity-0 pointer-events-none rounded-full"
                : "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 scale-100 opacity-100 rounded-xl"
            }`}
        >
          <button
            onClick={() => setIsDownloadMinimized(true)}
            className="absolute top-3 right-4 text-white/40 hover:text-white transition-colors"
            title="Thu nhỏ tiến trình"
          >
            <i className="fa-solid fa-compress text-lg"></i>
          </button>
          <div className="text-white text-lg font-bold mb-4 flex items-center gap-3">
            <i className="fa-solid fa-cloud-arrow-down text-primaryColor md:text-xl relative">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primaryColor opacity-20 animate-ping inset-0"></span>
            </i>
            Đang ghép nối phim...
          </div>
          <div className="w-full bg-white/10 rounded-full h-3 mb-3 relative overflow-hidden">
            <div
              className="bg-primaryColor h-3 rounded-full transition-all duration-300 relative"
              style={{ width: `${downloadProgress}%` }}
            >
              <div className="absolute top-0 right-0 bottom-0 left-0 bg-white/20 animate-pulse"></div>
            </div>
          </div>
          <div className="text-white text-sm font-medium mb-1">
            {downloadProgress}% ({downloadCompletedSegments}/{downloadTotalSegments} đoạn vỡ)
          </div>
          <div className="text-white/50 text-xs mt-2 text-center leading-relaxed">
            Vui lòng <span className="text-yellow-400">không đóng tab</span> trình duyệt <br /> cho
            đến khi tiến trình đạt 100%.
          </div>
          <button
            onClick={handleCancelDownload}
            className="mt-4 px-5 py-2 bg-red-600/80 hover:bg-red-500 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            Hủy Tải
          </button>
        </div>
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <PremiumRequiredModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
    </div>
  );
};

export default VideoPlayer;
