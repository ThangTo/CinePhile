import React, { useState, useRef } from "react";

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return "00:00";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};

const ProgressBar = ({ currentTime, duration, bufferedPercentage, onSeek, videoRef }) => {
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverPosition, setHoverPosition] = useState(0);
  const progressBarRef = useRef(null);

  const handleProgressHover = (e) => {
    const video = videoRef?.current;
    const currentDuration = duration || video?.duration || 0;
    if (!currentDuration || currentDuration <= 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const hoverX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (hoverX / rect.width) * 100));
    const time = (percent / 100) * currentDuration;

    setHoverTime(time);
    setHoverPosition(percent);
  };

  const handleProgressLeave = () => {
    setHoverTime(null);
    setHoverPosition(0);
  };

  return (
    <div className="mb-2 pointer-events-auto relative">
      <div
        ref={progressBarRef}
        className="group/seek w-full h-1 bg-white/30 rounded-full cursor-pointer hover:h-1 md:hover:h-1.5 transition-all relative overflow-visible"
        onClick={onSeek}
        onMouseMove={handleProgressHover}
        onMouseLeave={handleProgressLeave}
      >
        {/* Buffered portion - phần video đã tải (nền mờ) */}
        <div
          className="absolute left-0 top-0 h-full bg-white/20 rounded-full transition-all duration-100"
          style={{ width: `${bufferedPercentage}%` }}
        />

        {/* Current progress (phía trên buffered) */}
        <div
          className="h-full bg-gradient-to-r from-primaryColor to-hoverPrimaryColor rounded-full transition-all duration-100 relative z-10"
          style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 md:w-2.5 md:h-2.5 lg:w-3 lg:h-3 bg-white rounded-full opacity-0 group-hover/seek:opacity-100 shadow-lg" />
        </div>

        {/* Hover indicator */}
        {hoverTime !== null && (
          <>
            <div
              className="absolute top-1/2 -translate-y-1/2 w-0.5 md:w-1 h-3 md:h-4 bg-white/60 rounded-full z-[100]"
              style={{ left: `${hoverPosition}%`, transform: "translate(-50%, -50%)" }}
            />
            {/* Tooltip showing time */}
            <div
              className="absolute bottom-full mb-2 bg-black/90 text-white text-xs px-2 py-1 rounded pointer-events-none z-[100] whitespace-nowrap"
              style={{
                left: `${hoverPosition}%`,
                transform:
                  hoverPosition < 10
                    ? "translateX(0)"
                    : hoverPosition > 90
                    ? "translateX(-100%)"
                    : "translateX(-50%)",
              }}
            >
              {formatTime(hoverTime)}
              <div
                className="absolute top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90"
                style={{
                  left:
                    hoverPosition < 10 ? "8px" : hoverPosition > 90 ? "calc(100% - 8px)" : "50%",
                  transform: hoverPosition < 10 || hoverPosition > 90 ? "none" : "translateX(-50%)",
                }}
              />
            </div>
          </>
        )}
      </div>
      <div className="flex justify-between text-[10px] md:text-xs text-white mt-1 md:mt-1.5 font-medium">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
};

export default ProgressBar;
