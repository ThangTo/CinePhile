import React, { useState, useRef, useEffect, useCallback } from "react";

import { formatTime } from "utils/ultils";

// CONFIG

const SCALE_DESKTOP = 0.8;

const SCALE_MOBILE = 0.4;

const ProgressBar = ({
  currentTime,
  duration,
  bufferedPercentage,
  onSeek,
  videoRef,
  episode,
  onDragStateChange,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const [dragTime, setDragTime] = useState(0);

  const [seekingTime, setSeekingTime] = useState(null); // Giữ vị trí seek cho đến khi video seek xong

  const [hoverTime, setHoverTime] = useState(null);

  const [hoverPosition, setHoverPosition] = useState(0);

  const [thumbnailData, setThumbnailData] = useState(null);

  const [currentScale, setCurrentScale] = useState(SCALE_DESKTOP);

  const [isMobile, setIsMobile] = useState(false);

  // Khởi tạo null để tránh lỗi undefined ban đầu

  const progressBarRef = useRef(null);
  const lastDragClientXRef = useRef(null);

  // Reset seekingTime khi currentTime thay đổi (video đã seek xong)

  useEffect(() => {
    if (seekingTime !== null) {
      // Kiểm tra nếu currentTime đã gần với seekingTime (trong khoảng 0.5s)

      if (Math.abs(currentTime - seekingTime) < 0.5) {
        setSeekingTime(null);
      }
    }
  }, [currentTime, seekingTime]);

  // 1. Resize Handler

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setCurrentScale(mobile ? SCALE_MOBILE : SCALE_DESKTOP);
    };

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 2. Load VTT Data

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

        const parseVTTTime = (timeStr) => {
          if (!timeStr) return 0;

          const parts = timeStr.split(":");

          if (parts.length < 3) return 0;

          const hours = parseInt(parts[0]);

          const minutes = parseInt(parts[1]);

          const seconds = parseFloat(parts[2]);

          return hours * 3600 + minutes * 60 + seconds;
        };

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

        setThumbnailData({ sprite: episode.thumbnail_sprite, thumbnails });
      } catch (error) {
        console.error("❌ Error loading thumbnail:", error);
      }
    };

    loadThumbnailData();
  }, [episode?.thumbnail_vtt, episode?.thumbnail_sprite]);

  const getThumbnailForTime = (time) => {
    if (!thumbnailData?.thumbnails) return null;

    return thumbnailData.thumbnails.find((t) => time >= t.start && time < t.end);
  };

  // 3. LOGIC TÍNH TOÁN AN TOÀN (CRITICAL FIX)

  const calculateProgress = useCallback(
    (clientX) => {
      // 🛡️ LỚP BẢO VỆ 1: Kiểm tra Ref

      const bar = progressBarRef.current;

      if (!bar) {
        // Nếu không tìm thấy thanh bar, trả về null để các hàm gọi biết mà dừng lại

        return null;
      }

      // 🛡️ LỚP BẢO VỆ 2: Kiểm tra Duration

      if (!Number.isFinite(clientX)) {
        return null;
      }

      if (!duration || isNaN(duration) || duration === 0) {
        return { time: 0, percent: 0 };
      }

      // Lấy tọa độ an toàn

      const rect = bar.getBoundingClientRect();

      const x = clientX - rect.left;

      const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));

      const time = (percent / 100) * duration;

      return { time, percent };
    },

    [duration]
  );

  // --- HANDLERS ---

  const preventTouchScroll = useCallback((e) => {
    if (e.cancelable) {
      e.preventDefault();
    }
  }, []);

  const getEventClientX = useCallback((e, fallback = null) => {
    if (e.touches && e.touches.length > 0) return e.touches[0].clientX;
    if (e.changedTouches && e.changedTouches.length > 0) return e.changedTouches[0].clientX;
    if (Number.isFinite(e.clientX)) return e.clientX;
    return fallback;
  }, []);

  const handleDragStart = (e) => {
    // Chặn sự kiện lan truyền để tránh conflict

    e.stopPropagation();
    preventTouchScroll(e);

    // 🛡️ Kiểm tra ref trước khi bắt đầu drag

    if (!progressBarRef.current) {
      console.warn("[ProgressBar] Ref not available on drag start");

      return;
    }

    // Haptic feedback trên mobile (rung nhẹ)
    if (isMobile && navigator.vibrate) {
      navigator.vibrate(10); // Rung 10ms
    }

    setIsDragging(true);

    // Thông báo cho parent component (VideoPlayer) rằng đang kéo
    if (onDragStateChange) {
      onDragStateChange(true);
    }

    const clientX = getEventClientX(e);
    lastDragClientXRef.current = clientX;

    const result = calculateProgress(clientX);

    if (result) {
      setDragTime(result.time);

      setHoverTime(result.time);

      setHoverPosition(result.percent);
    }
  };

  useEffect(() => {
    const handleDragMove = (e) => {
      if (!isDragging) return;

      preventTouchScroll(e);

      const clientX = getEventClientX(e, lastDragClientXRef.current);
      lastDragClientXRef.current = clientX;

      const result = calculateProgress(clientX);

      if (result) {
        setDragTime(result.time);

        setHoverTime(result.time);

        setHoverPosition(result.percent);
      }
    };

    const handleDragEnd = (e) => {
      if (!isDragging) return;

      preventTouchScroll(e);

      const clientX = getEventClientX(e, lastDragClientXRef.current);

      const result = calculateProgress(clientX);

      // Nếu tính toán thành công thì mới Seek

      if (result) {
        // Giữ vị trí mới cho đến khi video seek xong

        setSeekingTime(result.time);

        onSeek(result.time);
      }

      setIsDragging(false);
      lastDragClientXRef.current = null;

      setHoverTime(null);

      // Thông báo cho parent component rằng đã kéo xong
      if (onDragStateChange) {
        onDragStateChange(false);
      }
    };

    const handleDragCancel = (e) => {
      if (!isDragging) return;

      preventTouchScroll(e);

      const result = calculateProgress(lastDragClientXRef.current);

      if (result) {
        setSeekingTime(result.time);
        onSeek(result.time);
      }

      setIsDragging(false);
      lastDragClientXRef.current = null;
      setHoverTime(null);

      if (onDragStateChange) {
        onDragStateChange(false);
      }
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleDragMove);

      window.addEventListener("mouseup", handleDragEnd);

      window.addEventListener("touchmove", handleDragMove, { passive: false });

      window.addEventListener("touchend", handleDragEnd, { passive: false });

      window.addEventListener("touchcancel", handleDragCancel, { passive: false });
    }

    return () => {
      window.removeEventListener("mousemove", handleDragMove);

      window.removeEventListener("mouseup", handleDragEnd);

      window.removeEventListener("touchmove", handleDragMove);

      window.removeEventListener("touchend", handleDragEnd);

      window.removeEventListener("touchcancel", handleDragCancel);
    };
  }, [isDragging, calculateProgress, getEventClientX, preventTouchScroll, onDragStateChange, onSeek]);

  // Hover Handler

  const handleProgressHover = (e) => {
    if (isDragging) return;

    // 🛡️ Kiểm tra ref trước khi hover
    if (!progressBarRef.current) return;
    const result = calculateProgress(e.clientX);

    if (result) {
      setHoverTime(result.time);
      setHoverPosition(result.percent);
    }
  };

  const handleProgressLeave = () => {
    if (isDragging) return;
    setHoverTime(null);
    setHoverPosition(0);
  };

  const handleClick = (e) => {
    e.stopPropagation(); // Ngăn event bubbling

    // 🛡️ Kiểm tra ref trước khi sử dụng
    if (!progressBarRef.current) {
      console.warn("[ProgressBar] Ref not available on click");
      return;
    }

    const result = calculateProgress(e.clientX);

    if (result) {
      // Giữ vị trí mới cho đến khi video seek xong
      setSeekingTime(result.time);
      onSeek(result.time);
    }
  };

  // Tính toán displayTime: ưu tiên dragTime > seekingTime > currentTime

  const displayTime = isDragging ? dragTime : seekingTime !== null ? seekingTime : currentTime;
  const displayPercent = duration ? (displayTime / duration) * 100 : 0;
  const currentThumbnail = hoverTime !== null ? getThumbnailForTime(hoverTime) : null;

  return (
    <div className="mb-2 pointer-events-auto relative select-none touch-none" style={{ touchAction: "none" }}>
      <div
        ref={progressBarRef}
        className={`group/seek w-full bg-white/20 rounded-full cursor-pointer transition-all duration-200 relative flex items-center
          ${isMobile ? "h-2 py-1" : "h-1 hover:h-1.5 py-1"}
        `}
        style={{ touchAction: "none" }}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        onMouseMove={handleProgressHover}
        onMouseLeave={handleProgressLeave}
        onClick={handleClick}
      >
        {/* Background Bar */}

        <div
          className={`absolute w-full bg-white/20 rounded-full transition-all top-1/2 -translate-y-1/2 pointer-events-none
          ${isMobile ? "h-2" : "h-1 group-hover/seek:h-1.5"}
        `}
        >
          <div
            className="absolute left-0 h-full bg-white/30 rounded-full"
            style={{ width: `${bufferedPercentage}%` }}
          />
        </div>

        {/* Active Progress Bar */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 bg-gradient-to-r from-primaryColor to-red-500 rounded-full pointer-events-none z-10
            ${isMobile ? "h-2" : "h-1 group-hover/seek:h-1.5"}
          `}
          style={{ width: `${displayPercent}%` }}
        >
          {/* Nút Tròn (Seek Handle) - Luôn hiển thị trên mobile khi controls hiện */}
          <div
            className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 bg-white rounded-full transition-transform duration-200 shadow-[0_0_10px_rgba(255,255,255,0.5)] z-20 

              ${
                isMobile
                  ? "w-5 h-5 opacity-100 scale-100" // Mobile: luôn hiển thị, to hơn để dễ chạm
                  : `w-3 h-3 md:w-4 md:h-4 ${
                      isDragging
                        ? "scale-150 opacity-100"
                        : "opacity-0 group-hover/seek:opacity-100 scale-0 group-hover/seek:scale-100"
                    }`
              }

            `}
          />
        </div>

        {/* --- TOOLTIP & THUMBNAIL --- */}

        {hoverTime !== null && (
          <div
            className="absolute bottom-full mb-4 z-[100] pointer-events-none transition-transform duration-75 ease-out will-change-transform"
            style={{
              left: `${hoverPosition}%`,
              transform:
                currentThumbnail && thumbnailData
                  ? hoverPosition < 10
                    ? `translateX(0)` // Rìa trái: không dịch
                    : hoverPosition > 90
                      ? `translateX(-100%)` // Rìa phải: dịch hết sang trái
                      : `translateX(-50%)` // Giữa: căn giữa
                  : `translateX(-50%)`,
            }}
          >
            {currentThumbnail && thumbnailData ? (
              <div className="flex flex-col items-center">
                <div className="bg-black/80 backdrop-blur-sm p-0.5 md:p-1 rounded-xl border border-white/10 shadow-lg ring-1 ring-white/5">
                  <div
                    className="relative overflow-hidden rounded-lg bg-black"
                    style={{
                      width: `${currentThumbnail.w * currentScale}px`,
                      height: `${currentThumbnail.h * currentScale}px`,
                    }}
                  >
                    <div
                      className="absolute top-0 left-0 origin-top-left"
                      style={{
                        width: `${currentThumbnail.w}px`,
                        height: `${currentThumbnail.h}px`,
                        backgroundImage: `url(${thumbnailData.sprite})`,
                        backgroundPosition: `-${currentThumbnail.x}px -${currentThumbnail.y}px`,
                        backgroundRepeat: "no-repeat",
                        transform: `scale(${currentScale})`,
                      }}
                    />

                    <div className="absolute inset-0 z-10 flex flex-col justify-end">
                      <div className="h-1/2 w-full bg-gradient-to-t from-black/90 to-transparent" />

                      <div className="absolute bottom-0 w-full text-center pb-0 md:pb-1">
                        <span className="text-white font-bold text-[10px] md:text-sm font-mono drop-shadow-md">
                          {formatTime(hoverTime)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mũi tên trỏ xuống - dịch chuyển theo vị trí */}

                <div
                  className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-white/20 mt-[-1px] relative"
                  style={{
                    // Dịch mũi tên ngược lại để luôn trỏ đúng vị trí hover

                    transform:
                      hoverPosition < 10
                        ? `translateX(-${(currentThumbnail.w * currentScale) / 2 - 10}px)` // Rìa trái
                        : hoverPosition > 90
                          ? `translateX(${(currentThumbnail.w * currentScale) / 2 - 10}px)` // Rìa phải
                          : `none`, // Giữa
                  }}
                >
                  <div className="absolute -top-[7px] -left-[6px] w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-black/80"></div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="bg-white text-black px-2 py-1 rounded-md shadow-lg border border-white/50 text-xs font-bold">
                  {formatTime(hoverTime)}
                </div>

                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white mt-1"></div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="hidden md:flex justify-between items-center text-xs font-medium text-gray-400 mt-0 px-1 select-none">
        <span className="text-white">{formatTime(displayTime)}</span>

        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
};

export default ProgressBar;
