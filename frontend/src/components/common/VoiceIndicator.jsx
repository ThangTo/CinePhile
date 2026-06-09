import React, { useState } from "react";
import { useVoice } from "contexts/VoiceContext";

// ====================================================================
// VOICE INDICATOR - Trạng thái trợ lý Timi (góc dưới trái)
// Thiết kế Glassmorphism sang trọng, màu chủ đạo primaryColor
// ====================================================================

const VoiceIndicator = () => {
  const {
    isEnabled,
    isModelLoaded,
    isListeningWake,
    isListeningCommand,
    isThinking,
    lastTranscript,
    voiceError,
    showOnboardingAgain,
  } = useVoice();

  const [showTooltip, setShowTooltip] = useState(true);
  const safeFloatingStyle = {
    bottom: "calc(var(--safe-bottom) + 5.75rem)",
    left: "calc(var(--safe-left) + 1.25rem)",
  };

  // Không hiện gì nếu Timi đã tắt
  if (!isEnabled) return null;

  // 1. Trạng thái: Đang tải model
  if (!isModelLoaded && !voiceError) {
    return (
      <div
        style={safeFloatingStyle}
        className="fixed z-[10000001] flex items-center gap-3 bg-bgColor2/80 backdrop-blur-xl text-primaryColor/70 text-xs px-5 py-3 rounded-full border border-primaryColor/20 shadow-lg animate-pulse"
      >
        <i className="fa-solid fa-robot text-sm drop-shadow-md" />
        <span className="font-medium">Timi đang khởi động...</span>
      </div>
    );
  }

  // 2. Trạng thái: Có lỗi
  if (voiceError) {
    return (
      <div
        style={safeFloatingStyle}
        className="fixed z-[10000001] flex items-center gap-3 bg-red-950/60 backdrop-blur-xl text-red-400 text-xs px-5 py-3 rounded-full border border-red-500/20 shadow-lg"
      >
        <i className="fa-solid fa-triangle-exclamation text-sm drop-shadow-md" />
        <span className="font-medium">{voiceError}</span>
      </div>
    );
  }

  // 3. Trạng thái: Đang lắng nghe lệnh trực tiếp
  if (isListeningCommand) {
    return (
      <div
        style={safeFloatingStyle}
        className="fixed z-[10000001] flex items-center gap-4 bg-bgColor2/90 backdrop-blur-xl text-gray-100 text-sm px-6 py-3.5 rounded-full border border-primaryColor/40 shadow-[0_0_25px_rgba(var(--primary-color-rgb),0.2)] animate-[scaleIn_0.3s_ease-out]"
      >
        {/* Khối icon mic phát sáng */}
        <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-primaryColor/15 border border-primaryColor/30">
          <i className="fa-solid fa-microphone text-primaryColor text-sm animate-pulse drop-shadow-sm" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primaryColor opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primaryColor shadow-[0_0_8px_currentColor]" />
          </span>
        </div>
        
        {/* Text hiển thị */}
        <div className="flex flex-col">
          <span className="font-bold text-primaryColor tracking-wide">Timi đang nghe...</span>
          {lastTranscript && (
            <span className="text-[11px] text-gray-300 mt-0.5 max-w-[220px] truncate italic">
              "{lastTranscript}"
            </span>
          )}
        </div>
      </div>
    );
  }

  // 4. Trạng thái: AI đang suy nghĩ (gọi LLM)
  if (isThinking) {
    return (
      <div
        style={safeFloatingStyle}
        className="fixed z-[10000001] flex items-center gap-4 bg-bgColor2/90 backdrop-blur-xl text-gray-100 text-sm px-6 py-3.5 rounded-full border border-primaryColor/40 shadow-[0_0_25px_rgba(var(--primary-color-rgb),0.2)] animate-[scaleIn_0.3s_ease-out]"
      >
        <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-primaryColor/15 border border-primaryColor/30">
          <i className="fa-solid fa-brain text-primaryColor text-sm animate-pulse drop-shadow-sm" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-primaryColor tracking-wide">Timi đang suy nghĩ...</span>
          {lastTranscript && (
            <span className="text-[11px] text-gray-300 mt-0.5 max-w-[220px] truncate italic">
              "{lastTranscript}"
            </span>
          )}
        </div>
      </div>
    );
  }

  // 5. Trạng thái: Bình thường (lắng nghe Wake Word)
  if (isListeningWake) {
    return (
      <div style={safeFloatingStyle} className="fixed z-[10000001] flex items-center gap-3">
        {/* Indicator chính */}
        <div className="flex items-center gap-3 bg-bgColor2/80 backdrop-blur-xl text-gray-400 text-xs px-5 py-3 rounded-full border border-white/10 shadow-lg hover:bg-bgColor/90 hover:text-gray-200 hover:border-primaryColor/30 transition-all duration-300 cursor-default group">
          <i className="fa-solid fa-robot text-sm group-hover:text-primaryColor transition-colors drop-shadow-sm" />
          
          <span className="hidden group-hover:inline transition-all font-medium">
            Nói "Hey Timi" để ra lệnh
          </span>
          
          {/* Sóng âm mượt mà (Wave Animation) thay thế màu xanh lá cũ */}
          <div className="group-hover:hidden flex items-end gap-1 h-3">
            <div className="w-1 bg-primaryColor/60 rounded-full animate-[soundWave_1.2s_ease-in-out_infinite] h-2 shadow-[0_0_4px_currentColor]" />
            <div className="w-1 bg-primaryColor/60 rounded-full animate-[soundWave_1.2s_ease-in-out_infinite_0.2s] h-3 shadow-[0_0_4px_currentColor]" />
            <div className="w-1 bg-primaryColor/60 rounded-full animate-[soundWave_1.2s_ease-in-out_infinite_0.4s] h-1.5 shadow-[0_0_4px_currentColor]" />
          </div>
        </div>

        {/* Tooltip tính năng mới (Hiện mỗi khi load) */}
        {showTooltip && (
          <div className="absolute -top-14 left-0 bg-bgColor2/80 border border-primaryColor/30 text-primaryColor px-4 py-2.5 rounded-xl text-[11px] backdrop-blur-xl shadow-[0_0_15px_rgba(var(--primary-color-rgb),0.2)] animate-[scaleIn_0.4s_ease-out] whitespace-nowrap flex items-center gap-3">
            <span className="font-medium tracking-wide flex items-center">
              <i className="fa-solid fa-wand-magic-sparkles mr-2 drop-shadow-sm" />
              Timi AI! Thử trò chuyện tự nhiên nhé
            </span>
            <button 
              onClick={() => setShowTooltip(false)} 
              className="text-primaryColor/50 hover:text-primaryColor hover:bg-white/5 w-5 h-5 rounded-full flex items-center justify-center transition-all"
            >
              <i className="fa-solid fa-xmark text-[10px]" />
            </button>
            {/* Arrow */}
            <div className="absolute -bottom-[5px] left-6 w-2.5 h-2.5 bg-bgColor2 border-b border-r border-primaryColor/30 rotate-45 shadow-[2px_2px_4px_rgba(0,0,0,0.2)]" />
          </div>
        )}

        {/* Nút ? (xem lại hướng dẫn) */}
        <button
          onClick={() => showOnboardingAgain()}
          className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 backdrop-blur-md text-gray-400 hover:bg-primaryColor/15 hover:text-primaryColor hover:border-primaryColor/40 transition-all text-[11px] font-bold border border-white/10 shadow-sm"
          title="Xem hướng dẫn sử dụng Timi"
        >
          ?
        </button>
      </div>
    );
  }

  return null;
};

export default VoiceIndicator;
