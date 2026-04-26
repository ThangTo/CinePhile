import React from "react";
import { createPortal } from "react-dom";
import Tooltip from "../watch-page/Tooltip";

const MobileMoreMenu = ({
  audioOptions,
  audioType,
  currentAudioLabel,
  showAudioMenu,
  onToggleAudioMenu,
  onAudioChange,
  onPictureInPicture,
  playbackRate,
  showSpeedMenu,
  onToggleSpeedMenu,
  onSpeedChange,
  quality,
  qualityOptions,
  showQualityMenu,
  onToggleQualityMenu,
  onQualityChange,
  isPremium,
  isQualityPremium,
  showMoreMenu,
  onToggleMoreMenu,
  setShowMoreMenu,
  onDownload,
  // Subtitle
  showSubtitleMenu,
  onToggleSubtitleMenu,
  subtitleOptions,
  currentSubtitle,
  onSubtitleChange,
  isGeneratingSubtitle,
  subtitleProgress,
}) => {
  return (
    <div className="relative more-menu-container">
      <Tooltip text="Thêm tùy chọn">
        <button
          onClick={onToggleMoreMenu}
          className="w-7 h-7 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-105"
        >
          <i className="fa-solid fa-ellipsis-vertical text-white text-xs" />
        </button>
      </Tooltip>
      
      {showMoreMenu && createPortal(
        <div className="fixed inset-0 z-[10000005] flex items-end justify-center pointer-events-auto touch-auto more-menu-container">
          {/* Backdrop overlay */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setShowMoreMenu(false)}
          />
          
          <style>{`
            @keyframes slideUpModal {
              from { transform: translateY(100%); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}</style>
          
          {/* Bottom Sheet */}
          <div 
            className="relative w-full max-w-md bg-[#18181b] rounded-t-2xl overflow-hidden shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex flex-col max-h-[85vh] sm:max-h-[80vh] sm:rounded-2xl sm:mb-4"
            style={{ animation: 'slideUpModal 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
            onClick={(e) => e.stopPropagation()} // Prevent clicks inside from closing
          >
            {/* Grabber indicator */}
            <div className="w-full flex justify-center py-2 sm:hidden">
               <div className="w-12 h-1.5 bg-white/20 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3 pt-1 sm:pt-4 sm:pb-4 border-b border-white/10">
              <span className="text-white font-bold text-base sm:text-lg">Tùy chọn</span>
              <button 
                onClick={() => setShowMoreMenu(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>
            
            {/* Scrollable Content */}
            <div className="overflow-y-auto overflow-x-hidden custom-scrollbar flex-1 pb-6 overscroll-contain">
              
              {/* Audio Selection */}
              {audioOptions && audioOptions.length > 0 && (
                <div className="border-b border-white/5 audio-menu-container">
                  <button
                    onClick={onToggleAudioMenu}
                    className="w-full px-5 py-4 text-white hover:bg-white/5 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 md:gap-4">
                      <i className="fa-solid fa-microphone w-5 text-center text-white/70 text-base" />
                      <span className="text-[15px] font-medium">Âm thanh</span>
                    </div>
                    <div className="flex items-center gap-3 text-white/50">
                      <span className="text-xs sm:text-sm truncate max-w-[120px]">{currentAudioLabel}</span>
                      <i className={`fa-solid fa-chevron-down text-xs transition-transform ${showAudioMenu ? "rotate-180" : ""}`} />
                    </div>
                  </button>
                  
                  {showAudioMenu && (
                    <div className="bg-black/40 py-2">
                      {audioOptions.map((opt) => (
                        <button
                          key={opt.key}
                          onClick={() => {
                            onAudioChange(opt.key);
                            onToggleAudioMenu();
                          }}
                          className={`w-full px-14 py-3.5 text-sm sm:text-[15px] transition-colors flex items-center justify-between ${
                            audioType === opt.key ? "text-primaryColor bg-primaryColor/10 font-medium" : "text-white/80 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <span>{opt.label}</span>
                          {audioType === opt.key && <i className="fa-solid fa-check text-xs" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Subtitle */}
              {subtitleOptions && subtitleOptions.length > 0 && (
                <div className="border-b border-white/5 subtitle-menu-container">
                  <button
                    onClick={onToggleSubtitleMenu}
                    className="w-full px-5 py-4 text-white hover:bg-white/5 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 md:gap-4">
                      <i className="fa-solid fa-closed-captioning w-5 text-center text-white/70 text-base" />
                      <span className="text-[15px] font-medium">Phụ đề</span>
                    </div>
                    <div className="flex items-center gap-3 text-white/50">
                      <span className="text-xs sm:text-sm truncate max-w-[120px]">
                        {currentSubtitle ? subtitleOptions.find(o => o.key === currentSubtitle)?.label || "Tắt phụ đề" : "Tắt phụ đề"}
                      </span>
                      <i className={`fa-solid fa-chevron-down text-xs transition-transform ${showSubtitleMenu ? "rotate-180" : ""}`} />
                    </div>
                  </button>
                  
                  {showSubtitleMenu && (
                    <div className="bg-black/40 py-2">
                      {subtitleOptions.map((opt) => (
                        <button
                          key={opt.key || "off"}
                          onClick={() => {
                            onSubtitleChange(opt.key);
                            onToggleSubtitleMenu();
                          }}
                          className={`w-full px-14 py-3.5 text-sm sm:text-[15px] transition-colors flex items-center justify-between ${
                            currentSubtitle === opt.key ? "text-primaryColor bg-primaryColor/10 font-medium" : "text-white/80 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{opt.label}</span>
                            {isGeneratingSubtitle && opt.key === "ko" && (
                               <span className="text-gray-400 text-xs ml-2">({subtitleProgress}%)</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {isGeneratingSubtitle && opt.key === "ko" && (
                               <i className="fa-solid fa-spinner fa-spin text-gray-400 text-[10px]" />
                            )}
                            {currentSubtitle === opt.key && <i className="fa-solid fa-check text-xs" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Quality */}
              <div className="border-b border-white/5 quality-menu-container">
                <button
                  onClick={onToggleQualityMenu}
                  className="w-full px-5 py-4 text-white hover:bg-white/5 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 md:gap-4">
                    <i className="fa-solid fa-cog w-5 text-center text-white/70 text-base" />
                    <span className="text-[15px] font-medium">Chất lượng</span>
                  </div>
                  <div className="flex items-center gap-3 text-white/50">
                    <span className="text-xs sm:text-sm">{quality}</span>
                    <i className={`fa-solid fa-chevron-down text-xs transition-transform ${showQualityMenu ? "rotate-180" : ""}`} />
                  </div>
                </button>
                
                {showQualityMenu && Array.isArray(qualityOptions) && (
                  <div className="bg-black/40 py-2">
                    {qualityOptions.map((q) => {
                      const requiresPremium = isQualityPremium(q);
                      const isDisabled = requiresPremium && !isPremium;
                      const isSelected = quality === q;

                      return (
                        <button
                          key={q}
                          onClick={() => {
                            if (!isDisabled) {
                              onQualityChange(q);
                              onToggleQualityMenu();
                            }
                          }}
                          disabled={isDisabled}
                          className={`w-full px-14 py-3.5 text-sm sm:text-[15px] transition-colors flex items-center justify-between ${
                            isDisabled 
                              ? "text-gray-500 cursor-not-allowed opacity-50" 
                              : isSelected 
                                ? "text-primaryColor bg-primaryColor/10 font-medium" 
                                : "text-white/80 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{q}</span>
                            {requiresPremium && (
                              <i className={`fa-solid fa-crown text-[10px] ${isPremium ? "text-yellow-400" : "text-gray-500"}`} />
                            )}
                          </div>
                          {isSelected && !isDisabled && <i className="fa-solid fa-check text-xs" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Speed */}
              <div className="border-b border-white/5 speed-menu-container">
                <button
                  onClick={onToggleSpeedMenu}
                  className="w-full px-5 py-4 text-white hover:bg-white/5 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 md:gap-4">
                    <i className="fa-solid fa-gauge-high w-5 text-center text-white/70 text-base" />
                    <span className="text-[15px] font-medium">Tốc độ phát</span>
                  </div>
                  <div className="flex items-center gap-3 text-white/50">
                    <span className="text-xs sm:text-sm">{playbackRate}x</span>
                    <i className={`fa-solid fa-chevron-down text-xs transition-transform ${showSpeedMenu ? "rotate-180" : ""}`} />
                  </div>
                </button>
                
                {showSpeedMenu && (
                  <div className="bg-black/40 py-2">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => {
                          onSpeedChange(speed);
                          onToggleSpeedMenu();
                        }}
                        className={`w-full px-14 py-3.5 text-sm sm:text-[15px] transition-colors flex items-center justify-between ${
                          playbackRate === speed ? "text-primaryColor bg-primaryColor/10 font-medium" : "text-white/80 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <span>{speed}x {speed === 1 && "(Chuẩn)"}</span>
                        {playbackRate === speed && <i className="fa-solid fa-check text-xs" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Picture in Picture */}
              <button
                onClick={() => {
                  onPictureInPicture();
                  setShowMoreMenu(false);
                }}
                className="w-full px-5 py-4 text-white hover:bg-white/5 transition-colors flex items-center gap-3 md:gap-4 border-b border-white/5"
              >
                <i className="fa-solid fa-images w-5 text-center text-white/70 text-base" />
                <span className="text-[15px] font-medium">Thu nhỏ (PiP)</span>
              </button>

              {/* Download */}
              {onDownload && (
                <button
                  onClick={() => {
                    onDownload();
                    setShowMoreMenu(false);
                  }}
                  className="w-full px-5 py-4 text-white hover:bg-white/5 transition-colors flex items-center gap-3 md:gap-4"
                >
                  <i className="fa-solid fa-download w-5 text-center text-white/70 text-base" />
                  <span className="text-[15px] font-medium">Tải phim xuống</span>
                </button>
              )}
            </div>
            
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default MobileMoreMenu;