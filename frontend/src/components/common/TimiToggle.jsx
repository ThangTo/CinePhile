import React, { useState, useEffect, useRef } from "react";
import { useVoice } from "contexts/VoiceContext";

// ====================================================================
// TIMI TOGGLE - Nút bật/tắt trợ lý giọng nói trên Header
// Thiết kế Glassmorphism sang trọng, màu chủ đạo primaryColor
// ====================================================================

const TimiToggle = () => {
  const { isEnabled, toggleVoice, isModelLoaded } = useVoice();
  const [showPromo, setShowPromo] = useState(false);
  const toggleRef = useRef(null);

  // Hiển thị promo card mỗi khi load trang (nếu bề mặt Timi chưa được bật)
  useEffect(() => {
    if (!isEnabled) {
      // Delay nhỏ để tránh flash
      const timer = setTimeout(() => setShowPromo(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDismissPromo = () => {
    setShowPromo(false);
  };

  const handleTryNow = () => {
    setShowPromo(false);
    toggleVoice(true);
  };

  return (
    <div className="relative" ref={toggleRef}>
      {/* ====== TOGGLE BUTTON ====== */}
      <button
        onClick={() => toggleVoice()}
        className={`
          relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
          transition-all duration-300 border backdrop-blur-md
          ${isEnabled
            ? "bg-primaryColor/15 border-primaryColor/30 text-primaryColor shadow-lg shadow-primaryColor/10"
            : "bg-bgColor/50 border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-200"
          }
        `}
        title={isEnabled ? "Tắt trợ lý Timi" : "Bật trợ lý Timi"}
      >
        <i className={`fa-solid fa-robot text-sm ${isEnabled ? "text-primaryColor drop-shadow-md" : "text-gray-400"}`} />
        <span className="hidden sm:inline">Timi</span>

        {/* Toggle dot */}
        <div className={`
          w-8 h-4 rounded-full relative transition-colors duration-300 border
          ${isEnabled ? "bg-primaryColor/30 border-primaryColor/50" : "bg-white/10 border-white/5"}
        `}>
          <div className={`
            absolute top-[1px] w-3 h-3 rounded-full transition-all duration-300 shadow-sm
            ${isEnabled
              ? "left-[17px] bg-primaryColor shadow-[0_0_8px_currentColor]" // Cục dot phát sáng nhẹ
              : "left-[2px] bg-gray-400"
            }
          `} />
        </div>

        {/* Loading pulse khi đang tải model */}
        {isEnabled && !isModelLoaded && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primaryColor opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-primaryColor" />
          </span>
        )}
      </button>

      {/* ====== PROMO TOOLTIP CARD ====== */}
      {showPromo && (
        <div className="absolute top-full right-0 mt-3 z-[100002] animate-[fadeIn_0.4s_ease-out]">
          
          {/* Mũi tên chỉ lên (kết nối với button) */}
          <div className="absolute -top-2 right-6 w-4 h-4 bg-bgColor2/90 border-t border-l border-white/10 rotate-45 rounded-sm backdrop-blur-xl z-0" />

          {/* Main Card Container */}
          <div className="relative w-[300px] bg-bgColor2/90 backdrop-blur-xl rounded-2xl sm:p-4 p-3.5 shadow-2xl shadow-black/60 border border-white/10 overflow-hidden z-10">
            
            {/* Decorative glows (Hiệu ứng ánh sáng sang trọng) */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-primaryColor/15 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-primaryColor/10 rounded-full blur-2xl pointer-events-none" />

            {/* Close button */}
            <button
              onClick={handleDismissPromo}
              className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-gray-400 hover:bg-white/20 hover:text-white transition-colors text-xs z-20"
            >
              <i className="fa-solid fa-xmark" />
            </button>

            {/* Content */}
            <div className="relative z-10">
              {/* Badge */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primaryColor/10 border border-primaryColor/20 text-primaryColor text-[10px] font-bold uppercase tracking-wider mb-3 shadow-inner">
                <i className="fa-solid fa-sparkles text-[8px]" />
                Tính năng mới
              </span>

              <h3 className="text-gray-100 font-bold text-base leading-snug mb-2 flex items-center gap-2">
                <i className="fa-solid fa-brain text-primaryColor"></i>
                Trợ lý Timi AI
              </h3>
              
              <p className="text-gray-300 text-xs leading-relaxed sm:mb-5 mb-2">
                Trợ lý đã được nâng cấp với <span className="text-primaryColor font-semibold">AI thông minh</span>! Trò chuyện tìm phim, chuyển tập, thao tác tự nhiên như người thật mà không cần chạm tay vào chuột!
              </p>

              {/* CTA Button */}
              <button
                onClick={handleTryNow}
                className="w-full py-2.5 rounded-xl bg-primaryColor/15 border border-primaryColor/30 text-primaryColor font-bold text-sm transition-all duration-300 shadow-lg shadow-primaryColor/5 hover:bg-primaryColor hover:text-gray-900 hover:shadow-primaryColor/20 active:scale-95 flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-microphone" />
                Thử ngay!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimiToggle;