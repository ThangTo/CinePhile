import React, { useState, useRef, useEffect, useCallback } from "react";
import Tooltip from "./Tooltip";

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

  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  // Mock video URL - replace with actual API
  const currentVideoUrl =
    videoUrl ||
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Update video time
  useEffect(() => {
    const video = videoRef.current;
    // video.focus();
    if (!video) return;

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
  }, []);

  // Auto-hide controls (both playing and paused states)
  useEffect(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    if (!showControls) {
      return;
    }

    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying, showControls]);

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
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
  };

  const handleNextEpisode = () => {
    if (episode.id < totalEpisodes) {
      onEpisodeChange(episode.id + 1);
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
      className="relative w-full bg-black rounded-lg"
      style={{ aspectRatio: "16/9", maxWidth: "100%", height: "auto" }}
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
      <video
        ref={videoRef}
        className="w-full h-full cursor-pointer rounded-lg"
        src={currentVideoUrl}
        onClick={handlePlayPause}
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />

      {/* Background Poster Image*/}
      {!isPlaying && currentTime === 0 && movie?.bgImage && (
        <div className="absolute inset-0 z-[5] pointer-events-none">
          <img src={movie.bgImage} alt={movie.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/60" />
        </div>
      )}

      {/* Buffering Indicator */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white"></div>
        </div>
      )}

      {/* Center Play Button Overlay */}
      {!isPlaying && !isBuffering && (
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
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-2 md:p-3 lg:p-4 pt-12 md:pt-16 lg:pt-20 transition-opacity duration-300 z-20 pointer-events-none ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Progress Bar */}
        <div className="mb-2 md:mb-3 lg:mb-4 pointer-events-auto">
          <div
            className="group/seek w-full h-0.5 md:h-1 bg-white/30 rounded-full cursor-pointer hover:h-1 md:hover:h-1.5 transition-all"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all duration-100 relative"
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
            {episode?.id < totalEpisodes && (
              <div className="hidden md:block">
                <Tooltip text={`Xem tập ${episode.id + 1}`}>
                  <button
                    onClick={handleNextEpisode}
                    className="w-8 h-8 lg:w-10 lg:h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-105"
                  >
                    <i className="fa-solid fa-forward-step text-white text-sm lg:text-base" />
                  </button>
                </Tooltip>
              </div>
            )}

            {/* Next Episode - Mobile */}
            {episode?.id < totalEpisodes && (
              <div className="md:hidden">
                <Tooltip text={`Tập ${episode.id + 1}`}>
                  <button
                    onClick={handleNextEpisode}
                    className="w-7 h-7 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-105"
                  >
                    <i className="fa-solid fa-forward-step text-white text-xs" />
                  </button>
                </Tooltip>
              </div>
            )}

            {/* Audio Selection - Desktop/Tablet only */}
            <div className="hidden md:flex relative audio-menu-container">
              <Tooltip text={audioType === "subtitle" ? "Tiếng gốc" : "Lồng tiếng"}>
                <button
                  onClick={toggleAudioMenu}
                  className="w-8 h-8 lg:w-10 lg:h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-105"
                >
                  <i className="fa-solid fa-microphone text-white text-sm lg:text-base" />
                </button>
              </Tooltip>
              <div
                className={`absolute top-1/2 right-0 -translate-y-1/2 bg-black/90 backdrop-blur-md rounded-lg border border-white/20 overflow-hidden shadow-xl min-w-[140px] z-[130] origin-right transition-all duration-300 ease-out ${
                  showAudioMenu
                    ? "opacity-100 -translate-x-[calc(100%+0.75rem)] scale-100"
                    : "opacity-0 -translate-x-2 scale-95 pointer-events-none"
                }`}
              >
                <button
                  onClick={() => handleAudioChange("subtitle")}
                  className={`w-full px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors flex items-center justify-end gap-2 text-right ${
                    audioType === "subtitle" ? "bg-white/20" : ""
                  }`}
                >
                  <span className="text-right">Tiếng gốc</span>
                  {audioType === "subtitle" && (
                    <i className="fa-solid fa-check text-yellow-400 text-xs" />
                  )}
                </button>
                <button
                  onClick={() => handleAudioChange("dub")}
                  className={`w-full px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors flex items-center justify-end gap-2 text-right ${
                    audioType === "dub" ? "bg-white/20" : ""
                  }`}
                >
                  <span className="text-right">Lồng tiếng</span>
                  {audioType === "dub" && (
                    <i className="fa-solid fa-check text-yellow-400 text-xs" />
                  )}
                </button>
              </div>
            </div>

            {/* CC - Desktop/Tablet only */}
            <div className="hidden md:block">
              <Tooltip text="Phụ đề">
                <button className="w-8 h-8 lg:w-10 lg:h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-105">
                  <span className="text-white font-bold text-xs lg:text-sm">CC</span>
                </button>
              </Tooltip>
            </div>

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
                className={`absolute top-1/2 right-0 -translate-y-1/2 bg-black/90 backdrop-blur-md rounded-lg border border-white/20 overflow-hidden shadow-xl min-w-[120px] z-[130] origin-right transition-all duration-300 ease-out ${
                  showSpeedMenu
                    ? "opacity-100 -translate-x-[calc(100%+0.75rem)] scale-100"
                    : "opacity-0 -translate-x-2 scale-95 pointer-events-none"
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
                      <i className="fa-solid fa-check text-yellow-400 text-xs" />
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
                className={`absolute top-1/2 right-0 -translate-y-1/2 bg-black/90 backdrop-blur-md rounded-lg border border-white/20 overflow-hidden shadow-xl min-w-[140px] z-[130] origin-right transition-all duration-300 ease-out ${
                  showQualityMenu
                    ? "opacity-100 -translate-x-[calc(100%+0.75rem)] scale-100"
                    : "opacity-0 -translate-x-2 scale-95 pointer-events-none"
                }`}
              >
                {["Auto", "1080p", "720p", "480p", "360p"].map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setQuality(q);
                      setShowQualityMenu(false);
                      setShowMoreMenu(false);
                    }}
                    className={`w-full px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors flex items-center justify-end gap-2 text-right ${
                      quality === q ? "bg-white/20" : ""
                    }`}
                  >
                    <span className="text-right">{q}</span>
                    {quality === q && <i className="fa-solid fa-check text-yellow-400 text-xs" />}
                  </button>
                ))}
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
                        <span className="text-right">Âm thanh</span>
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
                      <button
                        onClick={() => handleAudioChange("subtitle")}
                        className={`w-full px-3 py-2 text-white text-xs hover:bg-white/10 transition-colors flex items-center justify-end gap-2 text-right ${
                          audioType === "subtitle" ? "bg-white/10" : ""
                        }`}
                      >
                        <span>Tiếng gốc</span>
                        {audioType === "subtitle" && (
                          <i className="fa-solid fa-check text-yellow-400 text-[10px]" />
                        )}
                      </button>
                      <button
                        onClick={() => handleAudioChange("dub")}
                        className={`w-full px-3 py-2 text-white text-xs hover:bg-white/10 transition-colors flex items-center justify-end gap-2 text-right ${
                          audioType === "dub" ? "bg-white/10" : ""
                        }`}
                      >
                        <span>Lồng tiếng</span>
                        {audioType === "dub" && (
                          <i className="fa-solid fa-check text-yellow-400 text-[10px]" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* CC */}
                  <button
                    onClick={() => setShowMoreMenu(false)}
                    className="w-full px-3 py-2 text-white hover:bg-white/10 transition-colors flex items-center justify-end gap-2 text-right"
                  >
                    <span className="text-right">Phụ đề</span>
                    <i className="fa-solid fa-closed-captioning text-base" />
                  </button>

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
                            <i className="fa-solid fa-check text-yellow-400 text-[10px]" />
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
                      {["Auto", "1080p", "720p", "480p", "360p"].map((q) => (
                        <button
                          key={q}
                          onClick={() => {
                            setQuality(q);
                            setShowQualityMenu(false);
                            setShowMoreMenu(false);
                          }}
                          className={`w-full px-3 py-2 text-white text-xs hover:bg-white/10 transition-colors flex items-center justify-end gap-2 text-right ${
                            quality === q ? "bg-white/10" : ""
                          }`}
                        >
                          <span>{q}</span>
                          {quality === q && (
                            <i className="fa-solid fa-check text-yellow-400 text-[10px]" />
                          )}
                        </button>
                      ))}
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
