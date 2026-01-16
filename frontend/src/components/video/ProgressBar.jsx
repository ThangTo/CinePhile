import React, { useState, useRef, useEffect } from "react";
import { formatTime } from "utils/ultils";

// CONFIG: Tăng kích thước thumbnail tại đây
// THUMB_WIDTH backend = 350px → Scale 1.0x = 350px hiển thị (không scale, hiển thị đúng kích thước gốc)
const THUMBNAIL_SCALE = 1.0;

const ProgressBar = ({ currentTime, duration, bufferedPercentage, onSeek, videoRef, episode }) => {
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [thumbnailData, setThumbnailData] = useState(null);
  const progressBarRef = useRef(null);

  // Parse VTT file to get thumbnail coordinates (Logic giữ nguyên)
  useEffect(() => {
    const loadThumbnailData = async () => {
      if (!episode?.thumbnail_vtt || !episode?.thumbnail_sprite) {
        setThumbnailData(null);
        return;
      }

      try {
        const response = await fetch(episode.thumbnail_vtt);
        const vttText = await response.text();
        const lines = vttText.split("\n");
        const thumbnails = [];

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.includes("-->")) {
            const [startTime, endTime] = line.split("-->").map((t) => t.trim());
            const coordLine = lines[i + 1]?.trim();

            if (coordLine && coordLine.includes("#xywh=")) {
              const coordMatch = coordLine.match(/#xywh=(\d+),(\d+),(\d+),(\d+)/);
              if (coordMatch) {
                const [, x, y, w, h] = coordMatch;
                thumbnails.push({
                  start: parseVTTTime(startTime),
                  end: parseVTTTime(endTime),
                  x: parseInt(x),
                  y: parseInt(y),
                  w: parseInt(w),
                  h: parseInt(h),
                });
              }
            }
          }
        }
        setThumbnailData({
          sprite: episode.thumbnail_sprite,
          thumbnails,
        });
      } catch (error) {
        console.error("❌ [Thumbnail] Error loading thumbnail data:", error);
        setThumbnailData(null);
      }
    };

    loadThumbnailData();
  }, [episode?.thumbnail_vtt, episode?.thumbnail_sprite]);

  const parseVTTTime = (timeStr) => {
    const parts = timeStr.split(":");
    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);
    const seconds = parseFloat(parts[2]);
    return hours * 3600 + minutes * 60 + seconds;
  };

  const getThumbnailForTime = (time) => {
    if (!thumbnailData || !thumbnailData.thumbnails) return null;
    return thumbnailData.thumbnails.find((t) => time >= t.start && time < t.end);
  };

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

  const currentThumbnail = hoverTime !== null ? getThumbnailForTime(hoverTime) : null;

  return (
    <div className="mb-2 pointer-events-auto relative select-none">
      {/* Thanh Progress Bar Chính */}
      <div
        ref={progressBarRef}
        className="group/seek w-full h-1 bg-white/20 rounded-full cursor-pointer hover:h-1.5 transition-all duration-200 relative overflow-visible flex items-center"
        onClick={onSeek}
        onMouseMove={handleProgressHover}
        onMouseLeave={handleProgressLeave}
      >
        {/* Buffered portion */}
        <div
          className="absolute left-0 h-full bg-white/30 rounded-full transition-all duration-200"
          style={{ width: `${bufferedPercentage}%` }}
        />

        {/* Current progress */}
        <div
          className="h-full bg-gradient-to-r from-primaryColor to-red-500 rounded-full transition-all duration-100 relative z-10"
          style={{
            width: `${duration ? (currentTime / duration) * 100 : 0}%`,
          }}
        >
          {/* Nút tròn (Seek Handle) */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/seek:opacity-100 scale-0 group-hover/seek:scale-100 transition-all duration-200 shadow-[0_0_10px_rgba(255,255,255,0.5)] z-20" />
        </div>

        {/* --- KHU VỰC TOOLTIP & THUMBNAIL --- */}
        {hoverTime !== null && (
          <div
            className="absolute bottom-full mb-4 z-[100] pointer-events-none transition-transform duration-75 ease-out will-change-transform"
            style={{
              left: `${hoverPosition}%`,
              transform:
                hoverPosition < 10
                  ? `translateX(0)`
                  : hoverPosition > 90
                  ? `translateX(-100%)`
                  : `translateX(-50%)`,
            }}
          >
            {currentThumbnail && thumbnailData ? (
              // === Giao diện Thumbnail có ảnh (Đã phóng to) ===
              <div className="flex flex-col items-center">
                {/* Khung viền ngoài */}
                <div className="bg-black/80 backdrop-blur-sm p-1.5 rounded-xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.5)] ring-1 ring-white/5">
                  <div
                    className="relative overflow-hidden rounded-lg bg-black"
                    // Tính toán kích thước khung chứa dựa trên Scale Factor
                    style={{
                      width: `${currentThumbnail.w * THUMBNAIL_SCALE}px`,
                      height: `${currentThumbnail.h * THUMBNAIL_SCALE}px`,
                    }}
                  >
                    {/* Ảnh Sprite (Giữ kích thước gốc nhưng phóng to bằng transform scale) */}
                    <div
                      className="absolute top-0 left-0 origin-top-left will-change-transform"
                      style={{
                        width: `${currentThumbnail.w}px`,
                        height: `${currentThumbnail.h}px`,
                        backgroundImage: `url(${thumbnailData.sprite})`,
                        backgroundPosition: `-${currentThumbnail.x}px -${currentThumbnail.y}px`,
                        backgroundRepeat: "no-repeat",
                        transform: `scale(${THUMBNAIL_SCALE})`, // Phóng to ảnh tại đây
                      }}
                    />

                    {/* Lớp phủ gradient và Text thời gian (nằm đè lên trên ảnh để không bị vỡ nét) */}
                    <div className="absolute inset-0 z-10 flex flex-col justify-end">
                      <div className="h-1/2 w-full bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                      <div className="absolute bottom-0 w-full text-center">
                        <span className="text-white font-bold text-base tracking-wider drop-shadow-md font-mono">
                          {formatTime(hoverTime)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mũi tên trỏ xuống */}
                <div
                  className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-transparent border-t-white/20 mt-[-1px] relative z-10"
                  style={{
                    transform:
                      hoverPosition < 10
                        ? `translateX(-140px)`
                        : hoverPosition > 90
                        ? `translateX(140px)`
                        : `none`,
                  }}
                >
                  <div className="absolute -top-[9px] -left-[8px] w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-transparent border-t-black/80"></div>
                </div>
              </div>
            ) : (
              // === Giao diện Fallback (Chỉ hiện giờ) ===
              <div className="flex flex-col items-center">
                <div className="bg-white text-black px-3 py-1 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.3)] border border-white/50">
                  <span className="font-bold text-xs tracking-wide">{formatTime(hoverTime)}</span>
                </div>
                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white mt-1"></div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hiển thị thời gian video 2 bên */}
      <div className="hidden md:flex justify-between items-center text-xs font-medium text-gray-400 mt-2 select-none">
        <span className="text-white">{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
};

export default ProgressBar;
