import React from "react";
import Tooltip from "../watch-page/Tooltip";
import AudioMenu from "./AudioMenu";
import SpeedMenu from "./SpeedMenu";
import QualityMenu from "./QualityMenu";

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
      {showMoreMenu && (
        <div className="absolute bottom-full right-0 mb-2 bg-black/85 backdrop-blur-md rounded-lg shadow-xl min-w-[140px] z-[200] text-xs">
          {/* Audio Selection */}
          {audioOptions.length > 0 && (
            <div className="audio-menu-container relative text-right">
              <button
                onClick={onToggleAudioMenu}
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
                    onClick={() => onAudioChange(opt.key)}
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

          {/* Picture in Picture */}
          <button
            onClick={() => {
              onPictureInPicture();
              setShowMoreMenu(false);
            }}
            className="w-full px-3 py-2 text-white hover:bg-white/10 transition-colors flex items-center justify-end gap-2 text-right"
          >
            <span className="text-right">Thu nhỏ</span>
            <i className="fa-solid fa-images text-base" />
          </button>

          {/* Download */}
          {onDownload && (
            <button
              onClick={() => {
                onDownload();
                setShowMoreMenu(false);
              }}
              className="w-full px-3 py-2 text-white hover:bg-white/10 transition-colors flex items-center justify-end gap-2 text-right"
            >
              <span className="text-right">Tải phim gốc</span>
              <i className="fa-solid fa-download text-base" />
            </button>
          )}

          {/* Speed */}
          <div className="speed-menu-container relative text-right">
            <button
              onClick={onToggleSpeedMenu}
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
                  onClick={() => onSpeedChange(speed)}
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
              onClick={onToggleQualityMenu}
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
                        onClick={() => !isDisabled && onQualityChange(q)}
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
  );
};

export default MobileMoreMenu;
