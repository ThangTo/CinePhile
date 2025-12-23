import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Hls from "hls.js";
import useAuth from "hooks/useAuth";
import userService from "services/user.service";
import VideoOverlays from "../video/VideoOverlays";
import VideoControls from "../video/VideoControls";
import useToast from "hooks/useToast";
import ToastContainer from "../common/ToastContainer";
import PremiumRequiredModal from "../common/PremiumRequiredModal";

const VideoPlayer = ({
  movie,
  episode,
  onEpisodeChange,
  videoUrl,
  totalEpisodes,
  audioType,
  onAudioTypeChange,
  resumeTime = null,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.75);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [quality, setQuality] = useState("Auto");
  const [isBuffering, setIsBuffering] = useState(false);
  const [availableLevels, setAvailableLevels] = useState([]);
  const [currentActualQuality, setCurrentActualQuality] = useState(null); // Chất lượng thực tế đang phát
  const [bufferedPercentage, setBufferedPercentage] = useState(0); // Phần trăm video đã buffered
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false); // Đánh dấu đã auto-play chưa
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // Check user role and premium status
  const { user } = useAuth();
  const isPremium =
    user?.isPremium === true || user?.premium === true || user?.subscription === "premium";
  const isAdmin = user?.role === "admin";
  const isRegularUser = !isPremium && !isAdmin;
  
  const { toasts, showToast, removeToast } = useToast();


  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const saveProgressIntervalRef = useRef(null);
  const hasAutoSeekedRef = useRef(false); // Đánh dấu đã auto-seek chưa
  const lastEpisodeIdRef = useRef(null); // Lưu episode ID cuối cùng để detect thay đổi

  const hlsRef = useRef(null);

  const hlsSource = useMemo(() => {
    if (episode?.link_m3u8) return episode.link_m3u8;
    if (episode?.videoUrl && episode.videoUrl.includes(".m3u8")) return episode.videoUrl;
    if (videoUrl && videoUrl.includes(".m3u8")) return videoUrl;
    return null;
  }, [episode, videoUrl]);

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

  // Parse available audio options from movie.lang (e.g. "Vietsub+Thuyết Minh+Lồng Tiếng")
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

    // Nếu lang trống hoặc không parse được, mặc định có Vietsub
    if (opts.length === 0) {
      addIfNotExists("vietsub", "Vietsub");
    }

    return opts;
  }, [movie]);

  const currentAudioLabel = audioOptions.find((o) => o.key === audioType)?.label || "Âm thanh";

  // Update video time and buffered percentage
  useEffect(() => {
    const video = videoRef.current;
    // video.focus();
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
      setCurrentTime(video.currentTime);
      // Update buffered percentage mỗi khi time update
      updateBufferedPercentage();
    };

    const handleDurationChange = () => {
      setDuration(video.duration);
      // Update buffered when duration changes
      updateBufferedPercentage();
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => {
      setIsBuffering(true);
    };

    const handleCanPlay = () => setIsBuffering(false);

    const handleProgress = () => {
      // Update buffered percentage on progress (khi có thêm data được load)
      updateBufferedPercentage();
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("progress", handleProgress);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("progress", handleProgress);
    };
  }, [hasNativePlayer, episode, duration]);

  // Reset auto-play/seek state when episode changes
  useEffect(() => {
    const currentEpisodeId = episode?._id || episode?.id;
    if (lastEpisodeIdRef.current !== currentEpisodeId) {
      hasAutoSeekedRef.current = false;
      setHasAutoPlayed(false);
      lastEpisodeIdRef.current = currentEpisodeId;
    }
  }, [episode?._id, episode?.id]);

  // Load progress and auto-seek when video is ready
  useEffect(() => {
    const video = videoRef.current;
    const movieId = movie?._id || movie?.id;
    if (!video || !hasNativePlayer || hasAutoPlayed || !user || !movieId) return;

    let shouldSeek = false;
    let seekTime = 0;

    const loadProgressAndSeek = async () => {
      try {
        // Ưu tiên resumeTime từ location.state (từ ContinueWatching)
        if (resumeTime && resumeTime > 0) {
          shouldSeek = true;
          seekTime = Math.max(0, resumeTime - 3); // Seek về trước 3 giây
        } else {
          // Nếu không có từ location.state, load từ backend
          const response = await userService.getProgress(movieId);
          if (response?.success && response?.data) {
            const progress = response.data;

            // Chỉ auto-seek nếu progress < 95% và watchTime > 5
            if (progress.progress < 95 && progress.watchTime > 5) {
              // Kiểm tra episode nếu có (cho series)
              if (episode?._id || episode?.id) {
                const savedEpisodeId =
                  progress.episodeId?._id || progress.episodeId?.id || progress.episodeId;
                const currentEpisodeId = episode._id || episode.id;
                if (savedEpisodeId && savedEpisodeId.toString() === currentEpisodeId.toString()) {
                  shouldSeek = true;
                  seekTime = Math.max(0, progress.watchTime - 3);
                }
              } else {
                // Phim lẻ, không cần check episode
                shouldSeek = true;
                seekTime = Math.max(0, progress.watchTime - 3);
              }
            }
          }
        }
      } catch (error) {
        console.error("Failed to load progress for auto-seek:", error);
      }
    };

    const handleCanPlayThrough = async () => {
      // Load progress trước
      await loadProgressAndSeek();

      // Auto-seek nếu cần
      if (shouldSeek && !hasAutoSeekedRef.current) {
        video.currentTime = seekTime;
        setCurrentTime(seekTime);
        hasAutoSeekedRef.current = true;
      }

      // Auto-play video
      try {
        await video.play();
        setIsPlaying(true);
        setHasAutoPlayed(true);
      } catch (error) {
        console.error("Auto-play failed:", error);
        // Một số browser chặn auto-play, không sao
      }
    };

    // Nếu video đã sẵn sàng, thực hiện ngay
    if (video.readyState >= 3) {
      // HAVE_FUTURE_DATA hoặc cao hơn
      handleCanPlayThrough();
    } else {
      video.addEventListener("canplaythrough", handleCanPlayThrough);
    }

    return () => {
      video.removeEventListener("canplaythrough", handleCanPlayThrough);
    };
  }, [
    hasNativePlayer,
    resumeTime,
    hasAutoPlayed,
    user,
    movie?._id,
    movie?.id,
    episode?._id,
    episode?.id,
  ]);

  // Auto-save progress periodically
  useEffect(() => {
    const movieId = movie?._id || movie?.id;
    if (!user || !movieId || !hasNativePlayer) return;

    const saveProgress = async () => {
      const video = videoRef.current;
      if (!video || video.paused || !duration || duration <= 0) return;

      const watchTime = Math.floor(video.currentTime);
      // Chỉ lưu nếu đã xem ít nhất 5 giây
      if (watchTime < 5) return;

      try {
        const episodeId = episode?._id || episode?.id || null;

        await userService.saveProgress({
          movieId: movieId,
          episodeId: episodeId,
          watchTime: watchTime,
          duration: Math.floor(duration),
        });

        console.log("[Resume Watch] Progress saved successfully");
      } catch (error) {
        console.error("[Resume Watch] Failed to save progress:", error);
      }
    };

    // Lưu mỗi 15 giây
    saveProgressIntervalRef.current = setInterval(saveProgress, 15000);

    return () => {
      if (saveProgressIntervalRef.current) {
        clearInterval(saveProgressIntervalRef.current);
      }
    };
  }, [user, movie?._id, movie?.id, episode?._id, episode?.id, duration, hasNativePlayer]);

  // Save progress on pause
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
      } catch (error) {
        console.error("[Resume Watch] Failed to save progress on pause:", error);
      }
    };

    video.addEventListener("pause", handlePause);
    return () => {
      video.removeEventListener("pause", handlePause);
    };
  }, [user, movie?._id, movie?.id, episode?._id, episode?.id, duration, hasNativePlayer]);

  // Initialize HLS / regular sources when episode changes
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

    if (Hls.isSupported()) {
      const hls = new Hls({
        // --- CHIẾN THUẬT BUFFER CHO MẠNG LAG ---

        // 1. Tăng bộ nhớ đệm lên mức cao (mặc định chỉ 30s)
        // Nếu mạng rớt 1 phút, user vẫn xem được nhờ buffer này.
        maxBufferLength: 60,
        maxMaxBufferLength: 120, // Cho phép buffer tới 2 phút video

        // 2. Tải trước đoạn video (Start Fragment)
        // Giúp video chạy nhanh hơn khi vừa bấm play
        startFragPrefetch: true,

        // 3. Cấu hình Timeout (Rất quan trọng với link phim lậu/crawl)
        // Mặc định Hls.js đợi rất ngắn, server phim lag chút là nó báo lỗi ngay.
        // Ta tăng thời gian chờ lên để nó "kiên nhẫn" tải cho xong.
        manifestLoadingTimeOut: 20000, // Chờ file m3u8 tối đa 20s
        fragLoadingTimeOut: 25000, // Chờ file .ts tối đa 25s

        // 4. Số lần thử lại nếu lỗi (Retry)
        manifestLoadingMaxRetry: 5, // Thử lại 5 lần nếu lỗi kết nối
        fragLoadingMaxRetry: 5,
        levelLoadingMaxRetry: 5,
      });

      hls.loadSource(hlsSource);
      hls.attachMedia(video);
      hlsRef.current = hls;

      // Lắng nghe khi manifest được load để lấy danh sách levels
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const levels = hls.levels || [];
        setAvailableLevels(levels);

        // Set chất lượng thực tế ban đầu
        if (hls.currentLevel >= 0 && hls.currentLevel < levels.length) {
          const currentLevel = levels[hls.currentLevel];
          const actualHeight = currentLevel?.height || null;
          setCurrentActualQuality(actualHeight ? `${actualHeight}p` : null);
        } else if (levels.length > 0) {
          // Nếu đang ở Auto mode, lấy level đầu tiên làm mặc định
          const firstLevel = levels[0];
          const actualHeight = firstLevel?.height || null;
          setCurrentActualQuality(actualHeight ? `${actualHeight}p` : null);
        }
      });

      // Lắng nghe khi có fragment được load để đảm bảo video sẵn sàng
      hls.on(Hls.Events.FRAG_LOADED, () => {
        // Video đã có data, có thể phát được
        setIsBuffering(false);
      });

      // Lắng nghe khi level thay đổi
      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        const currentLevel = hls.levels[data.level];
        const actualHeight = currentLevel?.height || null;
        setCurrentActualQuality(actualHeight ? `${actualHeight}p` : null);
      });

      // Lắng nghe lỗi và tự động recover
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error("HLS Network Error, attempting recovery...");
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error("HLS Media Error, attempting recovery...");
              hls.recoverMediaError();
              break;
            default:
              console.error("HLS Fatal Error:", data);
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari native HLS - không hỗ trợ quality control qua JS
      video.src = hlsSource;
      console.warn("Safari native HLS - Quality control không khả dụng");
    } else {
      console.warn("Trình duyệt không hỗ trợ phát HLS, sẽ dùng link nhúng nếu có.");
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      // Cleanup progress saving interval
      if (saveProgressIntervalRef.current) {
        clearInterval(saveProgressIntervalRef.current);
        saveProgressIntervalRef.current = null;
      }
    };
  }, [hlsSource, fileSource]);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  const handleSeek = async (e) => {
    const video = videoRef.current;
    if (!video) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    video.currentTime = newTime;

    // Lưu progress khi seek
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
      } catch (error) {
        console.error("[Resume Watch] Failed to save progress on seek:", error);
      }
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
    if (!container) return;

    if (!document.fullscreenElement) {
      // Try different fullscreen APIs for cross-browser support
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

            // On mobile, try to lock orientation to landscape for better viewing
            if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
              window.screen.orientation.lock("landscape").catch((err) => {
                // Orientation lock may fail on some devices, ignore error
                console.log("Orientation lock not supported or failed:", err);
              });
            }
          })
          .catch((err) => {
            console.error("Error attempting to enable fullscreen:", err);
          });
      }
    } else {
      // Exit fullscreen
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

            // Unlock orientation when exiting fullscreen
            if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
              window.screen.orientation.unlock();
            }
          })
          .catch((err) => {
            console.error("Error attempting to exit fullscreen:", err);
          });
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
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.error("PiP error:", err);
    }
  };

  const handleMouseMove = () => {
    if (!hasNativePlayer) return;

    setShowControls(true);

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    const delay = isFullscreen ? 2000 : 3000; // 2s khi fullscreen, 3s bình thường

    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
      // Ẩn luôn các menu phụ khi auto-hide
      setShowMoreMenu(false);
      setShowSpeedMenu(false);
      setShowQualityMenu(false);
      setShowAudioMenu(false);
    }, delay);
  };

  const handleNextEpisode = () => {
    const currentEpNumber = episode?.episode || episode?.episodeId || 1;
    if (currentEpNumber < totalEpisodes) {
      onEpisodeChange(currentEpNumber + 1);
    }
  };

  const handleAudioChange = (type) => {
    if (onAudioTypeChange) {
      onAudioTypeChange(type);
    }
    setShowAudioMenu(false);
    setShowMoreMenu(false);
  };

  const toggleAudioMenu = () => {
    setShowAudioMenu((prev) => {
      const next = !prev;
      if (next) {
        setShowSpeedMenu(false);
        setShowQualityMenu(false);
      }
      return next;
    });
  };

  const toggleSpeedMenu = () => {
    setShowSpeedMenu((prev) => {
      const next = !prev;
      if (next) {
        setShowAudioMenu(false);
        setShowQualityMenu(false);
      }
      return next;
    });
  };

  const toggleQualityMenu = () => {
    setShowQualityMenu((prev) => {
      const next = !prev;
      if (next) {
        setShowAudioMenu(false);
        setShowSpeedMenu(false);
      }
      return next;
    });
  };

  // Helper: Build quality options list (luôn có đầy đủ options)
  const qualityOptions = useMemo(() => {
    const standardOptions = ["Auto", "1080p", "720p", "480p", "360p"];

    // Đảm bảo availableLevels là array
    const levels = Array.isArray(availableLevels) ? availableLevels : [];

    // Nếu có available levels, merge với standard options và loại bỏ duplicate
    if (levels.length > 0) {
      const heightsFromLevels = [...new Set(levels.map((l) => l?.height).filter(Boolean))].sort(
        (a, b) => b - a
      );

      const options = ["Auto"];
      heightsFromLevels.forEach((h) => {
        const label = `${h}p`;
        if (!options.includes(label)) {
          options.push(label);
        }
      });

      // Thêm các standard options nếu chưa có
      standardOptions.slice(1).forEach((opt) => {
        if (!options.includes(opt)) {
          options.push(opt);
        }
      });

      const sorted = options.sort((a, b) => {
        if (a === "Auto") return -1;
        if (b === "Auto") return 1;
        const heightA = parseInt(a.replace("p", ""), 10) || 0;
        const heightB = parseInt(b.replace("p", ""), 10) || 0;
        return heightB - heightA;
      });

      // Đảm bảo luôn trả về array
      return Array.isArray(sorted) ? sorted : standardOptions;
    }

    // Fallback: luôn trả về standardOptions
    return Array.isArray(standardOptions) ? standardOptions : ["Auto", "720p", "480p", "360p"];
  }, [availableLevels]);

  // Helper: Map quality string to HLS level index
  const getLevelIndexForQuality = (qualityStr, levels) => {
    if (!levels || levels.length === 0) {
      console.warn("⚠️ No HLS levels available");
      return -1;
    }
    if (qualityStr === "Auto") return -1;

    const targetHeight = parseInt(qualityStr.replace("p", ""), 10);
    if (isNaN(targetHeight)) {
      console.warn(`⚠️ Invalid quality string: ${qualityStr}`);
      return -1;
    }

    // Tìm level có height gần nhất với target
    let bestMatch = -1;
    let minDiff = Infinity;

    for (let i = 0; i < levels.length; i++) {
      const level = levels[i];
      if (!level.height) continue;

      const diff = Math.abs(level.height - targetHeight);
      if (diff < minDiff) {
        minDiff = diff;
        bestMatch = i;
      }
    }

    // Nếu chênh lệch quá lớn (> 100px), không match
    if (minDiff > 100) {
      console.warn(`⚠️ No level found close to ${targetHeight}px (min diff: ${minDiff}px)`);
      return -1;
    }

    return bestMatch;
  };

  // Helper: Get maximum allowed quality based on user role
  const getMaxAllowedQuality = useCallback(() => {
    if (!availableLevels || availableLevels.length === 0) return null;

    // Sort levels by height descending
    // const sortedLevels = [...availableLevels]
    //   .map((l) => l?.height)
    //   .filter(Boolean)
    //   .sort((a, b) => b - a);
    const sortedLevels = [1080, 720, 480, 360];

    if (sortedLevels.length === 0) return null;

    const highestQuality = sortedLevels[0];

    // Premium và Admin: có thể xem chất lượng cao nhất
    if (isPremium || isAdmin) {
      return highestQuality;
    }

    // User thường: chỉ xem được chất lượng thấp hơn 1 bậc
    if (isRegularUser && sortedLevels.length > 1) {
      return sortedLevels[1]; // Bậc thứ 2 (thấp hơn cao nhất 1 bậc)
    }

    // Fallback: nếu chỉ có 1 level, user thường vẫn xem được
    return sortedLevels[0];
  }, [availableLevels, isPremium, isAdmin, isRegularUser]);

  // Helper: Check if quality requires premium
  const isQualityPremium = useCallback(
    (qualityStr) => {
      if (qualityStr === "Auto") return false;
      const height = parseInt(qualityStr.replace("p", ""), 10);
      if (isNaN(height)) return false;

      const maxAllowed = getMaxAllowedQuality();
      if (!maxAllowed) return false;

      // console.log(isAdmin + " " + isPremium + " " + maxAllowed + " " + height);

      // Premium và Admin: có thể xem tất cả
      if (isPremium || isAdmin) return false;

      // User thường: chỉ xem được chất lượng <= maxAllowed
      return height > maxAllowed;
    },
    [getMaxAllowedQuality, isPremium, isAdmin]
  );

  // Apply quality level to HLS instance
  const applyQualityLevel = useCallback((hls, qualityStr) => {
    // Get max allowed quality for validation
    const maxAllowed = getMaxAllowedQuality();
    if (!hls) {
      console.warn("⚠️ HLS instance not available");
      return;
    }
    if (!hls.levels || hls.levels.length === 0) {
      console.warn("⚠️ HLS levels not loaded yet");
      return;
    }

    if (qualityStr === "Auto") {
      // Auto mode logic based on user role
      const maxAllowed = getMaxAllowedQuality();

      if (isAdmin) {
        // Admin: chất lượng cao nhất
        hls.currentLevel = -1; // Auto (HLS sẽ chọn cao nhất)
      } else if (isPremium) {
        // Premium: chất lượng cao nhất
        hls.currentLevel = -1; // Auto
      } else if (isRegularUser && maxAllowed) {
        // User thường: chất lượng cao nhất có thể nhưng thấp hơn premium 1 bậc
        const levelIndex = hls.levels.findIndex((l) => l?.height === maxAllowed);
        if (levelIndex >= 0) {
          hls.currentLevel = levelIndex;
        } else {
          hls.currentLevel = -1; // Fallback to auto
        }
      } else {
        // Fallback: auto
        hls.currentLevel = -1;
      }

      // Force reload để áp dụng ngay
      if (hls.media && hls.media.readyState >= 2) {
        hls.startLoad();
      }
      return;
    }

    const levelIndex = getLevelIndexForQuality(qualityStr, hls.levels);
    if (levelIndex >= 0 && levelIndex < hls.levels.length) {
      const selectedLevel = hls.levels[levelIndex];
      const selectedHeight = selectedLevel?.height;

      // Validate: User thường không được xem chất lượng cao hơn maxAllowed
      if (isRegularUser && maxAllowed && selectedHeight > maxAllowed) {
        console.warn(
          `⚠️ User thường không thể xem chất lượng ${selectedHeight}p, giới hạn là ${maxAllowed}p`
        );
        // Tìm level phù hợp với maxAllowed
        const allowedLevelIndex = hls.levels.findIndex((l) => l?.height === maxAllowed);
        if (allowedLevelIndex >= 0) {
          hls.currentLevel = allowedLevelIndex;
        } else {
          hls.currentLevel = -1; // Fallback to auto
        }
      } else {
        const previousLevel = hls.currentLevel;
        // Chỉ đổi nếu level khác
        if (previousLevel !== levelIndex) {
          hls.currentLevel = levelIndex;
        }
      }

      // Force reload để áp dụng quality mới ngay lập tức
      if (hls.media && hls.media.readyState >= 2) {
        hls.startLoad();
      }
    } else {
      console.warn(`⚠️ Could not find matching level for ${qualityStr}, keeping current level`);
      // Nếu không tìm được level matching, vẫn cập nhật currentActualQuality từ level hiện tại
      if (hls.currentLevel >= 0 && hls.currentLevel < hls.levels.length) {
        const currentLevel = hls.levels[hls.currentLevel];
        const actualHeight = currentLevel?.height || null;
        setCurrentActualQuality(actualHeight ? `${actualHeight}p` : null);
      }
    }
  }, []);

  // Handle quality change
  const handleQualityChange = (newQuality) => {
    // Check premium requirement
    if (isQualityPremium(newQuality) && !isPremium) {
      setShowPremiumModal(true);
      setShowQualityMenu(false);
      setShowMoreMenu(false);
      return;
    }

    setQuality(newQuality);
    setShowQualityMenu(false);
    setShowMoreMenu(false);

    // Apply quality change to HLS if available
    if (hlsRef.current) {
      if (hlsRef.current.levels && hlsRef.current.levels.length > 0) {
        applyQualityLevel(hlsRef.current, newQuality);
      } else {
        console.warn("⚠️ HLS levels not ready, will apply when ready");
      }
    } else {
      console.warn("⚠️ HLS instance not available");
    }
  };

  // Update quality when HLS instance changes
  useEffect(() => {
    if (hlsRef.current && hlsRef.current.levels && availableLevels.length > 0) {
      applyQualityLevel(hlsRef.current, quality);
    }
  }, [quality, availableLevels.length, applyQualityLevel]);

  // Tính toán độ blur dựa trên sự chênh lệch chất lượng
  // Logic: Nếu chất lượng thực tế > chất lượng đã chọn → làm mờ để "giả lập" chất lượng thấp hơn
  const blurAmount = useMemo(() => {
    if (quality === "Auto" || !currentActualQuality) return 0;

    const selectedHeight = parseInt(quality.replace("p", ""), 10);
    const actualHeight = parseInt(currentActualQuality.replace("p", ""), 10);

    if (isNaN(selectedHeight) || isNaN(actualHeight)) return 0;
    if (actualHeight <= selectedHeight) return 0; // Không cần blur nếu chất lượng thực tế <= chất lượng đã chọn

    // Tính độ chênh lệch phần trăm (khi actualHeight > selectedHeight)
    const diffPercent = ((actualHeight - selectedHeight) / actualHeight) * 100;

    // Áp dụng blur dựa trên độ chênh lệch:
    // - Chênh lệch 20-40%: blur nhẹ (0.5px)
    // - Chênh lệch 40-60%: blur vừa (1px)
    // - Chênh lệch >60%: blur mạnh (2px)
    if (diffPercent >= 60) return 2;
    if (diffPercent >= 40) return 1;
    if (diffPercent >= 20) return 0.5;
    return 0;
  }, [quality, currentActualQuality]);

  // Handle fullscreen changes (e.g., user presses ESC or rotates screen)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement;

      setIsFullscreen(!!isCurrentlyFullscreen);

      // If exited fullscreen, unlock orientation
      if (
        !isCurrentlyFullscreen &&
        window.screen &&
        window.screen.orientation &&
        window.screen.orientation.unlock
      ) {
        window.screen.orientation.unlock();
      }
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const video = videoRef.current;
      if (!video) return;

      // Ignore shortcuts if user is typing in an input/textarea
      const activeElement = document.activeElement;
      const isTyping =
        activeElement.tagName === "INPUT" ||
        activeElement.tagName === "TEXTAREA" ||
        activeElement.isContentEditable;

      if (isTyping) return;

      // Prevent default behavior for handled keys
      if (["Space", "ArrowLeft", "ArrowRight", "KeyF", "KeyM", "KeyK"].includes(e.code)) {
        e.preventDefault();
      }

      switch (e.code) {
        case "Space":
        case "KeyK":
          if (video.paused) {
            video.play();
          } else {
            video.pause();
          }
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
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [duration, toggleFullscreen, toggleMute]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showMoreMenu && !e.target.closest(".more-menu-container")) {
        setShowMoreMenu(false);
      }
      if (showSpeedMenu && !e.target.closest(".speed-menu-container")) {
        setShowSpeedMenu(false);
      }
      if (showQualityMenu && !e.target.closest(".quality-menu-container")) {
        setShowQualityMenu(false);
      }
      if (showAudioMenu && !e.target.closest(".audio-menu-container")) {
        setShowAudioMenu(false);
      }
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
      className="relative w-full bg-black rounded-lg aspect-[16/9] max-w-full"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        if (isPlaying) setShowControls(false);
        setShowMoreMenu(false);
        setShowSpeedMenu(false);
        setShowQualityMenu(false);
        setShowAudioMenu(false);
      }}
    >
      {/* Actual Video Element */}
      {hasNativePlayer ? (
        <video
          ref={videoRef}
          className="w-full h-full cursor-pointer rounded-lg"
          src={!hlsSource ? fileSource : undefined}
          onClick={handlePlayPause}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            filter: blurAmount > 0 ? `blur(${blurAmount}px)` : "none",
            transition: "filter 0.3s ease-in-out",
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

      {/* Video Overlays (Poster, Buffering, Play Button) */}
      <VideoOverlays
        hasNativePlayer={hasNativePlayer}
        isBuffering={isBuffering}
        isPlaying={isPlaying}
        movie={movie}
        currentTime={currentTime}
        onPlayPause={handlePlayPause}
      />

      {/* Video Controls Overlay */}
      <VideoControls
        showControls={showControls}
        hasNativePlayer={hasNativePlayer}
        // Progress Bar
        currentTime={currentTime}
        duration={duration}
        bufferedPercentage={bufferedPercentage}
        onSeek={handleSeek}
        videoRef={videoRef}
        // Play/Pause
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        // Skip
        onSkip={handleSkip}
        // Volume
        volume={volume}
        isMuted={isMuted}
        onVolumeChange={handleVolumeChange}
        onToggleMute={toggleMute}
        // Next Episode
        episode={episode}
        totalEpisodes={totalEpisodes}
        onNextEpisode={handleNextEpisode}
        // Audio
        audioOptions={audioOptions}
        audioType={audioType}
        currentAudioLabel={currentAudioLabel}
        showAudioMenu={showAudioMenu}
        onToggleAudioMenu={toggleAudioMenu}
        onAudioChange={handleAudioChange}
        // Speed
        playbackRate={playbackRate}
        showSpeedMenu={showSpeedMenu}
        onToggleSpeedMenu={toggleSpeedMenu}
        onSpeedChange={handleSpeedChange}
        // Quality
        quality={quality}
        qualityOptions={qualityOptions}
        showQualityMenu={showQualityMenu}
        onToggleQualityMenu={toggleQualityMenu}
        onQualityChange={handleQualityChange}
        isPremium={isPremium}
        isQualityPremium={isQualityPremium}
        // Fullscreen
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        // Picture in Picture
        onPictureInPicture={handlePictureInPicture}
        // Mobile More Menu
        showMoreMenu={showMoreMenu}
        onToggleMoreMenu={() => setShowMoreMenu(!showMoreMenu)}
        setShowMoreMenu={setShowMoreMenu}
      />
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <PremiumRequiredModal 
        isOpen={showPremiumModal} 
        onClose={() => setShowPremiumModal(false)} 
      />
    </div>
  );
};

export default VideoPlayer;
