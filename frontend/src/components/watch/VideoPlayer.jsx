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

  // Auto-hide controls
  useEffect(() => {
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
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
      container
        .requestFullscreen()
        .then(() => {
          setIsFullscreen(true);
        })
        .catch((err) => {
          console.error("Error attempting to enable fullscreen:", err);
        });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  }, []);

  const handleSpeedChange = (speed) => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = speed;
    setPlaybackRate(speed);
    setShowSpeedMenu(false);
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
  };

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

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black rounded-lg overflow-hidden"
      style={{ aspectRatio: "16/9" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Actual Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full cursor-pointer"
        src={currentVideoUrl}
        onClick={handlePlayPause}
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
          <button className="w-24 h-24 bg-white/90 opacity-30 hover:bg-white rounded-full flex items-center justify-center transition-all transform hover:scale-110 shadow-2xl pointer-events-none">
            <i className="fa-solid fa-play text-black text-4xl ml-1.5" />
          </button>
        </div>
      )}

      {/* Video Controls Overlay */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 pt-20 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Progress Bar */}
        <div className="mb-4">
          <div
            className="group/seek w-full h-1 bg-white/30 rounded-full cursor-pointer hover:h-1.5 transition-all"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all duration-100 relative"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/seek:opacity-100 shadow-lg" />
            </div>
          </div>
          <div className="flex justify-between text-xs text-white mt-1.5 font-medium">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <Tooltip text={isPlaying ? "Tạm dừng (k)" : "Phát (k)"}>
              <button
                onClick={handlePlayPause}
                className="w-12 h-12 bg-white hover:bg-white/90 rounded-full flex items-center justify-center transition-all transform hover:scale-105 shadow-lg"
              >
                <i
                  className={`fa-solid ${isPlaying ? "fa-pause" : "fa-play"} text-black text-lg ${
                    !isPlaying && "ml-0.5"
                  }`}
                />
              </button>
            </Tooltip>

            {/* Skip Buttons */}
            <Tooltip text="Tua lại 10 giây">
              <button
                onClick={() => handleSkip(-10)}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-105"
              >
                <div className="relative">
                  <i className="fa-solid fa-rotate-left text-white text-base" />
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-white font-bold">
                    10
                  </span>
                </div>
              </button>
            </Tooltip>

            <Tooltip text="Tua tới 10 giây">
              <button
                onClick={() => handleSkip(10)}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-105"
              >
                <div className="relative">
                  <i className="fa-solid fa-rotate-right text-white text-base" />
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-white font-bold">
                    10
                  </span>
                </div>
              </button>
            </Tooltip>

            {/* Volume */}
            <div className="flex items-center gap-2 group/volume">
              <Tooltip text={isMuted ? "Bật tiếng" : "Tắt tiếng"}>
                <button onClick={toggleMute} className="hover:scale-110 transition-transform">
                  <i
                    className={`fa-solid ${
                      isMuted || volume === 0
                        ? "fa-volume-xmark"
                        : volume < 0.5
                        ? "fa-volume-low"
                        : "fa-volume-high"
                    } text-white text-xl`}
                  />
                </button>
              </Tooltip>
              <div className="relative w-0 group-hover/volume:w-24 h-1.5 transition-all duration-300">
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
                  className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Next Episode */}
            {episode.id < totalEpisodes && (
              <Tooltip text={`Xem tập ${episode.id + 1}`}>
                <button
                  onClick={handleNextEpisode}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-105"
                >
                  <i className="fa-solid fa-forward-step text-white text-base" />
                </button>
              </Tooltip>
            )}

            {/* Audio Selection */}
            <div className="relative">
              <Tooltip text={audioType === "subtitle" ? "Tiếng gốc" : "Lồng tiếng"}>
                <button
                  onClick={() => setShowAudioMenu(!showAudioMenu)}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-105"
                >
                  <i className="fa-solid fa-microphone text-white text-base" />
                </button>
              </Tooltip>
              {showAudioMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-md rounded-lg border border-white/20 overflow-hidden shadow-xl min-w-[140px]">
                  <button
                    onClick={() => handleAudioChange("subtitle")}
                    className={`w-full px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors text-left flex items-center justify-between ${
                      audioType === "subtitle" ? "bg-white/20" : ""
                    }`}
                  >
                    <span>Tiếng gốc</span>
                    {audioType === "subtitle" && (
                      <i className="fa-solid fa-check text-yellow-400 text-xs ml-2" />
                    )}
                  </button>
                  <button
                    onClick={() => handleAudioChange("dub")}
                    className={`w-full px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors text-left flex items-center justify-between ${
                      audioType === "dub" ? "bg-white/20" : ""
                    }`}
                  >
                    <span>Lồng tiếng</span>
                    {audioType === "dub" && (
                      <i className="fa-solid fa-check text-yellow-400 text-xs ml-2" />
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* CC */}
            <Tooltip text="Phụ đề">
              <button className="w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-105">
                <span className="text-white font-bold text-sm">CC</span>
              </button>
            </Tooltip>

            {/* Picture in Picture */}
            <Tooltip text="Thu nhỏ">
              <button
                onClick={handlePictureInPicture}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-105"
              >
                <i className="fa-solid fa-images text-white text-base" />
              </button>
            </Tooltip>

            {/* Speed Menu */}
            <div className="relative">
              <Tooltip text="Tốc độ phát">
                <button
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-105"
                >
                  <i className="fa-solid fa-gauge-high text-white text-base" />
                </button>
              </Tooltip>
              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-md rounded-lg border border-white/20 overflow-hidden shadow-xl min-w-[100px]">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => handleSpeedChange(speed)}
                      className={`w-full px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors text-left flex items-center justify-between ${
                        playbackRate === speed ? "bg-white/20" : ""
                      }`}
                    >
                      <span>{speed}x</span>
                      {playbackRate === speed && (
                        <i className="fa-solid fa-check text-yellow-400 text-xs ml-2" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quality */}
            <div className="relative">
              <Tooltip text="Chất lượng">
                <button
                  onClick={() => setShowQualityMenu(!showQualityMenu)}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm px-3.5 py-2.5 rounded-full transition-all hover:scale-105"
                >
                  <i className="fa-solid fa-cog text-white text-base" />
                  <span className="text-white text-sm font-medium">{quality}</span>
                </button>
              </Tooltip>
              {showQualityMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-md rounded-lg border border-white/20 overflow-hidden shadow-xl min-w-[120px]">
                  {["Auto", "1080p", "720p", "480p", "360p"].map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        setQuality(q);
                        setShowQualityMenu(false);
                      }}
                      className={`w-full px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors text-left flex items-center justify-between ${
                        quality === q ? "bg-white/20" : ""
                      }`}
                    >
                      <span>{q}</span>
                      {quality === q && (
                        <i className="fa-solid fa-check text-yellow-400 text-xs ml-2" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <Tooltip text={isFullscreen ? "Thoát toàn màn hình (f)" : "Toàn màn hình (f)"}>
              <button
                onClick={toggleFullscreen}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-105"
              >
                <i
                  className={`fa-solid ${
                    isFullscreen ? "fa-compress" : "fa-expand"
                  } text-white text-base`}
                />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
