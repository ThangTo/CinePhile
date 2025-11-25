import React, { useState, useRef, useEffect, useCallback } from "react";
import Tooltip from "./Tooltip";
import Hls from "hls.js";

const formatTime = (time) => {
  if (!time) return "00:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
};

const VideoPlayer = ({
  movie,
  episode,
  onEpisodeChange,
  videoUrl,
  totalEpisodes,
  audioType,
  onAudioTypeChange,
}) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hlsRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  // --- STATE ---
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

  // --- HLS LOGIC ---
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
    }

    if (videoUrl) {
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
        hls.loadSource(videoUrl);
        hls.attachMedia(video);
        hlsRef.current = hls;
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = videoUrl;
      } else {
        video.src = videoUrl;
      }
    }

    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
    };
  }, [videoUrl]);

  // --- EVENTS ---
  useEffect(() => {
    const video = videoRef.current;
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

  // --- AUTO HIDE CONTROLS ---
  useEffect(() => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (!showControls) return;
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying, showControls]);

  // --- HANDLERS ---
  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    video.paused ? video.play() : video.pause();
  };

  const handleSeek = (e) => {
    const video = videoRef.current;
    if (!video) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    video.currentTime = newTime;
    setCurrentTime(newTime);
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
      video.volume = volume || 0.5;
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
      if (container.requestFullscreen) container.requestFullscreen();
      else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const handleSpeedChange = (speed) => {
    const video = videoRef.current;
    if (video) video.playbackRate = speed;
    setPlaybackRate(speed);
    setShowSpeedMenu(false);
    setShowMoreMenu(false);
  };

  const handleNextEpisode = () => {
    if (episode && episode.id < totalEpisodes) onEpisodeChange(episode.id + 1);
  };

  // --- RENDER ---
  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black rounded-lg group"
      style={{ aspectRatio: "16/9" }}
      onMouseMove={() => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      }}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="w-full h-full cursor-pointer rounded-lg"
        onClick={handlePlayPause}
        playsInline
      />

      {/* Poster Image */}
      {!isPlaying && currentTime === 0 && movie?.bgImage && (
        <div className="absolute inset-0 z-[5] pointer-events-none">
          <img src={movie.bgImage} alt={movie.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40" />
        </div>
      )}

      {/* Loading Spinner */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent"></div>
        </div>
      )}

      {/* Play Button Overlay */}
      {!isPlaying && !isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer z-10" onClick={handlePlayPause}>
          <button className="text-white text-6xl opacity-80 hover:scale-110 transition-transform">
            <i className="fa-solid fa-circle-play"></i>
          </button>
        </div>
      )}

      {/* Controls Bar */}
      <div className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent transition-opacity duration-300 z-20 ${showControls ? "opacity-100" : "opacity-0"}`}>
        {/* Progress Bar */}
        <div className="mb-4 cursor-pointer group/seek" onClick={handleSeek}>
          <div className="w-full h-1 bg-white/30 rounded-full relative">
            <div className="h-full bg-yellow-500 rounded-full absolute" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}></div>
          </div>
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            <button onClick={handlePlayPause}>
              <i className={`fa-solid ${isPlaying ? "fa-pause" : "fa-play"} text-xl`}></i>
            </button>
            <button onClick={() => handleSkip(-10)} className="text-sm"><i className="fa-solid fa-rotate-left"></i> 10</button>
            <button onClick={() => handleSkip(10)} className="text-sm"><i className="fa-solid fa-rotate-right"></i> 10</button>
            
            <div className="flex items-center gap-2 group/vol">
              <button onClick={toggleMute}>
                <i className={`fa-solid ${isMuted || volume === 0 ? "fa-volume-xmark" : "fa-volume-high"}`}></i>
              </button>
              <input type="range" min="0" max="1" step="0.1" value={isMuted ? 0 : volume} onChange={handleVolumeChange} className="w-20 h-1 accent-white cursor-pointer" />
            </div>
            
            <span className="text-xs font-mono">{formatTime(currentTime)} / {formatTime(duration)}</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Speed Button */}
            <div className="relative">
              <button onClick={() => setShowSpeedMenu(!showSpeedMenu)} className="text-sm font-bold">{playbackRate}x</button>
              {showSpeedMenu && (
                <div className="absolute bottom-8 right-0 bg-black/90 rounded p-2 flex flex-col gap-1 min-w-[60px]">
                  {[0.5, 1, 1.5, 2].map(rate => (
                    <button key={rate} onClick={() => handleSpeedChange(rate)} className="hover:text-yellow-400 text-xs py-1">{rate}x</button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={toggleFullscreen}>
              <i className={`fa-solid ${isFullscreen ? "fa-compress" : "fa-expand"}`}></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;