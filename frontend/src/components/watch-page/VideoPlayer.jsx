import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Tooltip from "./Tooltip";
import Hls from "hls.js";
import useAuth from "hooks/useAuth";

const VideoPlayer = ({
  movie,
  episode,
  onEpisodeChange,
  videoUrl,
  totalEpisodes,
  audioType,
  onAudioTypeChange,
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

  // Check premium status
  const { user } = useAuth();
  const isPremium =
    user?.isPremium === true || user?.premium === true || user?.subscription === "premium";

  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

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

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Update video time
  useEffect(() => {
    const video = videoRef.current;
    // video.focus();
    if (!video || !hasNativePlayer) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsBuffering(true);
    const handleCanPlay = () => setIsBuffering(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("canplay", handleCanPlay);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("canplay", handleCanPlay);
    };
  }, [hasNativePlayer, episode]);

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
        enableWorker: true,
        lowLatencyMode: true,
        // Cấu hình để có thể điều khiển quality
        abrEwmaDefaultEstimate: 500000, // Bitrate estimate (500kbps)
        maxBufferLength: 30, // Max buffer length in seconds
        maxMaxBufferLength: 60,
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

  const handleSeek = (e) => {
    const video = videoRef.current;
    if (!video) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    video.currentTime = newTime;
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

  // Helper: Check if quality requires premium
  const isQualityPremium = (qualityStr) => {
    if (qualityStr === "Auto") return false;
    const height = parseInt(qualityStr.replace("p", ""), 10);
    // 1080p và cao hơn yêu cầu premium
    return height >= 1080;
  };

  // Apply quality level to HLS instance
  const applyQualityLevel = useCallback((hls, qualityStr) => {
    if (!hls) {
      console.warn("⚠️ HLS instance not available");
      return;
    }
    if (!hls.levels || hls.levels.length === 0) {
      console.warn("⚠️ HLS levels not loaded yet");
      return;
    }

    if (qualityStr === "Auto") {
      hls.currentLevel = -1; // Auto
      // Force reload để áp dụng ngay
      if (hls.media && hls.media.readyState >= 2) {
        hls.startLoad();
      }
      return;
    }

    const levelIndex = getLevelIndexForQuality(qualityStr, hls.levels);
    if (levelIndex >= 0 && levelIndex < hls.levels.length) {
      const previousLevel = hls.currentLevel;

      // Chỉ đổi nếu level khác
      if (previousLevel !== levelIndex) {
        hls.currentLevel = levelIndex;
        // Force reload để áp dụng quality mới ngay lập tức
        if (hls.media && hls.media.readyState >= 2) {
          hls.startLoad();
        }
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
      console.warn("⚠️ Chất lượng này yêu cầu tài khoản Premium");
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

      {/* Background Poster Image*/}
      {hasNativePlayer && !isPlaying && currentTime === 0 && movie?.backgroundImage && (
        <div className="absolute inset-0 z-[5] pointer-events-none">
          <img
            src={movie.backgroundImage}
            alt={movie.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/60" />
        </div>
      )}

      {/* Buffering Indicator */}
      {hasNativePlayer && isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white"></div>
        </div>
      )}

      {/* Center Play Button Overlay */}
      {hasNativePlayer && !isPlaying && !isBuffering && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer z-10"
          onClick={handlePlayPause}
        >
          <button className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-white/90 opacity-30 hover:bg-white rounded-full flex items-center justify-center transition-all transform hover:scale-110 shadow-2xl pointer-events-none">
            <i className="fa-solid fa-play text-black text-xl md:text-2xl lg:text-4xl ml-0.5 md:ml-1 lg:ml-1.5" />
          </button>
        </div>
      )}

      {/* Video Controls Overlay */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/50 to-transparent p-2 md:p-3 lg:p-4 pt-12 md:pt-16 lg:pt-20 transition-opacity duration-300 z-20 pointer-events-none ${
          showControls && hasNativePlayer ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Progress Bar */}
        <div className="mb-2 pointer-events-auto">
          <div
            className="group/seek w-full h-0.5 md:h-1 bg-white/30 rounded-full cursor-pointer hover:h-1 md:hover:h-1.5 transition-all"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-gradient-to-r from-primaryColor to-hoverPrimaryColor rounded-full transition-all duration-100 relative"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 md:w-2.5 md:h-2.5 lg:w-3 lg:h-3 bg-white rounded-full opacity-0 group-hover/seek:opacity-100 shadow-lg" />
            </div>
          </div>
          <div className="flex justify-between text-[10px] md:text-xs text-white mt-1 md:mt-1.5 font-medium">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between gap-2 md:gap-3 pointer-events-auto">
          <div className="flex items-center gap-2 md:gap-3">
            {/* Play/Pause */}
            <Tooltip text={isPlaying ? "Tạm dừng (k)" : "Phát (k)"}>
              <button
                onClick={handlePlayPause}
                className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 bg-white hover:bg-white/90 rounded-full flex items-center justify-center transition-all transform hover:scale-105 shadow-lg"
              >
                <i
                  className={`fa-solid ${
                    isPlaying ? "fa-pause" : "fa-play"
                  } text-black text-xs md:text-sm lg:text-lg ${!isPlaying && "ml-0.5"}`}
                />
              </button>
            </Tooltip>

            {/* Skip Buttons */}
            <Tooltip text="Tua lại 10 giây">
              <button
                onClick={() => handleSkip(-10)}
                className="w-7 h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-105"
              >
                <div className="relative">
                  <i className="fa-solid fa-rotate-left text-white text-xs md:text-sm lg:text-base" />
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] md:text-[9px] lg:text-[10px] text-white font-bold">
                    10
                  </span>
                </div>
              </button>
            </Tooltip>

            <Tooltip text="Tua tới 10 giây">
              <button
                onClick={() => handleSkip(10)}
                className="w-7 h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-105"
              >
                <div className="relative">
                  <i className="fa-solid fa-rotate-right text-white text-xs md:text-sm lg:text-base" />
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] md:text-[9px] lg:text-[10px] text-white font-bold">
                    10
                  </span>
                </div>
              </button>
            </Tooltip>

            {/* Volume */}
            <div className="flex items-center gap-1 md:gap-2 group/volume">
              <Tooltip text={isMuted ? "Bật tiếng" : "Tắt tiếng"}>
                <button onClick={toggleMute} className="hover:scale-110 transition-transform">
                  <i
                    className={`fa-solid ${
                      isMuted || volume === 0
                        ? "fa-volume-xmark"
                        : volume < 0.5
                        ? "fa-volume-low"
                        : "fa-volume-high"
                    } text-white text-sm md:text-base lg:text-xl`}
                  />
                </button>
              </Tooltip>
              <div className="relative w-0 group-hover/volume:w-16 md:group-hover/volume:w-20 lg:group-hover/volume:w-24 h-1 md:h-1.5 transition-all duration-300">
                <div className="absolute inset-0 bg-white/30 rounded-lg" />
                <div
                  className="absolute inset-y-0 left-0 bg-white rounded-lg"
                  style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 md:[&::-webkit-slider-thumb]:w-3 md:[&::-webkit-slider-thumb]:h-3 lg:[&::-webkit-slider-thumb]:w-3.5 lg:[&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:h-2.5 md:[&::-moz-range-thumb]:w-3 md:[&::-moz-range-thumb]:h-3 lg:[&::-moz-range-thumb]:w-3.5 lg:[&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            {/* Desktop/Tablet (md+): Show all buttons individually */}
            {/* Next Episode - Desktop/Tablet only */}
            {(() => {
              const currentEpNumber = episode?.episode || episode?.episodeId || 1;
              return currentEpNumber < totalEpisodes ? (
                <div className="hidden md:block">
                  <Tooltip text={`Xem tập ${currentEpNumber + 1}`}>
                    <button
                      onClick={handleNextEpisode}
                      className="w-8 h-8 lg:w-10 lg:h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-105"
                    >
                      <i className="fa-solid fa-forward-step text-white text-sm lg:text-base" />
                    </button>
                  </Tooltip>
                </div>
              ) : null;
            })()}

            {/* Next Episode - Mobile */}
            {(() => {
              const currentEpNumber = episode?.episode || episode?.episodeId || 1;
              return currentEpNumber < totalEpisodes ? (
                <div className="md:hidden">
                  <Tooltip text={`Tập ${currentEpNumber + 1}`}>
                    <button
                      onClick={handleNextEpisode}
                      className="w-7 h-7 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-105"
                    >
                      <i className="fa-solid fa-forward-step text-white text-xs" />
                    </button>
                  </Tooltip>
                </div>
              ) : null;
            })()}

            {/* Audio Selection - Desktop/Tablet only */}
            {audioOptions.length > 0 && (
              <div className="hidden md:flex relative audio-menu-container">
                <Tooltip text={currentAudioLabel}>
                  <button
                    onClick={toggleAudioMenu}
                    className="w-8 h-8 lg:w-10 lg:h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-105"
                  >
                    <i className="fa-solid fa-microphone text-white text-sm lg:text-base" />
                  </button>
                </Tooltip>
                <div
                  className={`absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-md rounded-lg border border-white/20 overflow-hidden shadow-xl min-w-[140px] z-[130] origin-bottom-right transition-all duration-300 ease-out ${
                    showAudioMenu
                      ? "opacity-100 translate-y-0 scale-100"
                      : "opacity-0 translate-y-2 scale-95 pointer-events-none"
                  }`}
                >
                  {audioOptions.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => handleAudioChange(opt.key)}
                      className={`w-full px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors flex items-center justify-end gap-2 text-right ${
                        audioType === opt.key ? "bg-white/20" : ""
                      }`}
                    >
                      <span className="text-right">{opt.label}</span>
                      {audioType === opt.key && (
                        <i className="fa-solid fa-check text-primaryColor text-xs" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* CC - Desktop/Tablet only */}
            {/* <div className="hidden md:block">
              <Tooltip text="Phụ đề">
                <button className="w-8 h-8 lg:w-10 lg:h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-105">
                  <span className="text-white font-bold text-xs lg:text-sm">CC</span>
                </button>
              </Tooltip>
            </div> */}

            {/* Picture in Picture - Desktop/Tablet only */}
            <div className="hidden md:block">
              <Tooltip text="Thu nhỏ">
                <button
                  onClick={handlePictureInPicture}
                  className="w-8 h-8 lg:w-10 lg:h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-105"
                >
                  <i className="fa-solid fa-images text-white text-sm lg:text-base" />
                </button>
              </Tooltip>
            </div>

            {/* Speed Menu - Desktop/Tablet only */}
            <div className="hidden md:flex relative speed-menu-container">
              <Tooltip text="Tốc độ phát">
                <button
                  onClick={toggleSpeedMenu}
                  className="w-8 h-8 lg:w-10 lg:h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-105"
                >
                  <i className="fa-solid fa-gauge-high text-white text-sm lg:text-base" />
                </button>
              </Tooltip>
              <div
                className={`absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-md rounded-lg border border-white/20 overflow-hidden shadow-xl min-w-[120px] z-[130] origin-bottom-right transition-all duration-300 ease-out ${
                  showSpeedMenu
                    ? "opacity-100 translate-y-0 scale-100"
                    : "opacity-0 translate-y-2 scale-95 pointer-events-none"
                }`}
              >
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => handleSpeedChange(speed)}
                    className={`w-full px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors flex items-center justify-end gap-2 text-right ${
                      playbackRate === speed ? "bg-white/20" : ""
                    }`}
                  >
                    <span className="text-right">{speed}x</span>
                    {playbackRate === speed && (
                      <i className="fa-solid fa-check text-primaryColor text-xs" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality - Desktop/Tablet only */}
            <div className="hidden md:flex relative quality-menu-container">
              <Tooltip text="Chất lượng">
                <button
                  onClick={toggleQualityMenu}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm px-3 py-2 lg:px-3.5 lg:py-2.5 rounded-full transition-all hover:scale-105"
                >
                  <span className="text-white text-xs lg:text-sm font-medium">{quality}</span>
                  <i className="fa-solid fa-cog text-white text-sm lg:text-base" />
                </button>
              </Tooltip>
              <div
                className={`absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-md rounded-lg border border-white/20 overflow-hidden shadow-xl min-w-[140px] z-[130] origin-bottom-right transition-all duration-300 ease-out ${
                  showQualityMenu
                    ? "opacity-100 translate-y-0 scale-100"
                    : "opacity-0 translate-y-2 scale-95 pointer-events-none"
                }`}
              >
                {Array.isArray(qualityOptions)
                  ? qualityOptions.map((q) => {
                      const requiresPremium = isQualityPremium(q);
                      const isDisabled = requiresPremium && !isPremium;
                      const isSelected = quality === q;

                      return (
                        <button
                          key={q}
                          onClick={() => !isDisabled && handleQualityChange(q)}
                          disabled={isDisabled}
                          className={`w-full px-4 py-2 text-sm transition-colors flex items-center justify-end gap-2 text-right ${
                            isDisabled
                              ? "text-gray-500 cursor-not-allowed opacity-50"
                              : "text-white hover:bg-white/10"
                          } ${isSelected && !isDisabled ? "bg-white/20" : ""}`}
                          title={
                            isDisabled
                              ? "Yêu cầu tài khoản Premium để xem chất lượng này"
                              : undefined
                          }
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-right">{q}</span>
                            {requiresPremium && (
                              <i
                                className={`fa-solid fa-crown text-xs ${
                                  isPremium ? "text-yellow-400" : "text-gray-500"
                                }`}
                                title="Premium"
                              />
                            )}
                          </div>
                          {isSelected && !isDisabled && (
                            <i className="fa-solid fa-check text-primaryColor text-xs" />
                          )}
                        </button>
                      );
                    })
                  : null}
              </div>
            </div>

            {/* Fullscreen - Always visible */}
            <Tooltip text={isFullscreen ? "Thoát toàn màn hình (f)" : "Toàn màn hình (f)"}>
              <button
                onClick={toggleFullscreen}
                className="w-7 h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-105"
              >
                <i
                  className={`fa-solid ${
                    isFullscreen ? "fa-compress" : "fa-expand"
                  } text-white text-xs md:text-sm lg:text-base`}
                />
              </button>
            </Tooltip>

            {/* More Menu (3 dots) - Mobile only (sm and below) */}
            <div className="relative more-menu-container md:hidden">
              <Tooltip text="Thêm tùy chọn">
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="w-7 h-7 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-105"
                >
                  <i className="fa-solid fa-ellipsis-vertical text-white text-xs" />
                </button>
              </Tooltip>
              {showMoreMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-black/85 backdrop-blur-md rounded-lg shadow-xl min-w-[140px] z-[200] text-xs">
                  {/* Audio Selection */}
                  {audioOptions.length > 0 && (
                    <div className="audio-menu-container relative text-right">
                      <button
                        onClick={toggleAudioMenu}
                        className="w-full px-3 py-2 text-white hover:bg-white/10 transition-colors flex items-center justify-between gap-3 text-right"
                      >
                        <i
                          className={`fa-solid fa-chevron-left text-xs transition-transform ${
                            showAudioMenu ? "-rotate-180" : ""
                          }`}
                        />
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-right">{currentAudioLabel}</span>
                          <i className="fa-solid fa-microphone text-base" />
                        </div>
                      </button>
                      <div
                        className={`absolute top-8 right-3 -translate-y-1/2 bg-black/85 rounded-lg border border-white/10 min-w-[120px] shadow-lg origin-right transition-all duration-300 ease-out ${
                          showAudioMenu
                            ? "opacity-100 -translate-x-[calc(100%+0.5rem)] scale-100"
                            : "opacity-0 -translate-x-2 scale-95 pointer-events-none"
                        }`}
                      >
                        {audioOptions.map((opt) => (
                          <button
                            key={opt.key}
                            onClick={() => handleAudioChange(opt.key)}
                            className={`w-full px-3 py-2 text-white text-xs hover:bg-white/10 transition-colors flex items-center justify-end gap-2 text-right ${
                              audioType === opt.key ? "bg-white/10" : ""
                            }`}
                          >
                            <span>{opt.label}</span>
                            {audioType === opt.key && (
                              <i className="fa-solid fa-check text-primaryColor text-[10px]" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CC */}
                  {/* <button
                    onClick={() => setShowMoreMenu(false)}
                    className="w-full px-3 py-2 text-white hover:bg-white/10 transition-colors flex items-center justify-end gap-2 text-right"
                  >
                    <span className="text-right">Phụ đề</span>
                    <i className="fa-solid fa-closed-captioning text-base" />
                  </button> */}

                  {/* Picture in Picture */}
                  <button
                    onClick={() => {
                      handlePictureInPicture();
                      setShowMoreMenu(false);
                    }}
                    className="w-full px-3 py-2 text-white hover:bg-white/10 transition-colors flex items-center justify-end gap-2 text-right"
                  >
                    <span className="text-right">Thu nhỏ</span>
                    <i className="fa-solid fa-images text-base" />
                  </button>

                  {/* Speed */}
                  <div className="speed-menu-container relative text-right">
                    <button
                      onClick={toggleSpeedMenu}
                      className="w-full px-3 py-2 text-white hover:bg-white/10 transition-colors flex items-center justify-between gap-3 text-right"
                    >
                      <i
                        className={`fa-solid fa-chevron-left text-xs transition-transform ${
                          showSpeedMenu ? "-rotate-180" : ""
                        }`}
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-right">Tốc độ: {playbackRate}x</span>
                        <i className="fa-solid fa-gauge-high text-base" />
                      </div>
                    </button>
                    <div
                      className={`absolute top-8 right-3 -translate-y-1/2 bg-black/85 rounded-lg border border-white/10 min-w-[120px] shadow-lg origin-right transition-all duration-300 ease-out ${
                        showSpeedMenu
                          ? "opacity-100 -translate-x-[calc(100%+0.5rem)] scale-100"
                          : "opacity-0 -translate-x-2 scale-95 pointer-events-none"
                      }`}
                    >
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                        <button
                          key={speed}
                          onClick={() => handleSpeedChange(speed)}
                          className={`w-full px-3 py-2 text-white text-xs hover:bg-white/10 transition-colors flex items-center justify-end gap-2 text-right ${
                            playbackRate === speed ? "bg-white/10" : ""
                          }`}
                        >
                          <span>{speed}x</span>
                          {playbackRate === speed && (
                            <i className="fa-solid fa-check text-primaryColor text-[10px]" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quality */}
                  <div className="quality-menu-container relative text-right">
                    <button
                      onClick={toggleQualityMenu}
                      className="w-full px-3 py-2 text-white hover:bg-white/10 transition-colors flex items-center justify-between gap-3 text-right"
                    >
                      <i
                        className={`fa-solid fa-chevron-left text-xs transition-transform ${
                          showQualityMenu ? "-rotate-180" : ""
                        }`}
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-right">Chất lượng: {quality}</span>
                        <i className="fa-solid fa-cog text-base" />
                      </div>
                    </button>
                    <div
                      className={`absolute top-8 right-3 -translate-y-1/2 bg-black/85 rounded-lg border border-white/10 min-w-[120px] shadow-lg origin-right transition-all duration-300 ease-out ${
                        showQualityMenu
                          ? "opacity-100 -translate-x-[calc(100%+0.5rem)] scale-100"
                          : "opacity-0 -translate-x-2 scale-95 pointer-events-none"
                      }`}
                    >
                      {Array.isArray(qualityOptions)
                        ? qualityOptions.map((q) => {
                            const requiresPremium = isQualityPremium(q);
                            const isDisabled = requiresPremium && !isPremium;
                            const isSelected = quality === q;

                            return (
                              <button
                                key={q}
                                onClick={() => !isDisabled && handleQualityChange(q)}
                                disabled={isDisabled}
                                className={`w-full px-3 py-2 text-xs transition-colors flex items-center justify-end gap-2 text-right ${
                                  isDisabled
                                    ? "text-gray-500 cursor-not-allowed opacity-50"
                                    : "text-white hover:bg-white/10"
                                } ${isSelected && !isDisabled ? "bg-white/10" : ""}`}
                                title={isDisabled ? "Yêu cầu tài khoản Premium" : undefined}
                              >
                                <div className="flex items-center gap-1.5">
                                  <span>{q}</span>
                                  {requiresPremium && (
                                    <i
                                      className={`fa-solid fa-crown text-[10px] ${
                                        isPremium ? "text-yellow-400" : "text-gray-500"
                                      }`}
                                    />
                                  )}
                                </div>
                                {isSelected && !isDisabled && (
                                  <i className="fa-solid fa-check text-primaryColor text-[10px]" />
                                )}
                              </button>
                            );
                          })
                        : null}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
