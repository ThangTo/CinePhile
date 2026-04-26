import React from "react";
import Tooltip from "../watch-page/Tooltip";

const SubtitleMenu = ({
  subtitleOptions = [],
  currentSubtitle,
  showSubtitleMenu,
  onToggleSubtitleMenu,
  onSubtitleChange,
  isGenerating,
  generatingProgress = 0,
}) => {
  const safeProgress = Math.max(0, Math.min(100, Number(generatingProgress) || 0));

  return (
    <div className="relative subtitle-menu-container">
      <Tooltip text={isGenerating ? `Đang tạo phụ đề ${safeProgress}%` : "Phụ đề (Tạo bởi AI nên có thể có sai sót)"}>
        <button
          onClick={onToggleSubtitleMenu}
          className={`w-8 h-8 lg:w-10 lg:h-10 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-105 relative ${
            isGenerating
              ? "bg-white/10 animate-pulse"
              : currentSubtitle
                ? "bg-white/20 hover:bg-white/30"
                : "bg-white/10 hover:bg-white/20"
          }`}
        >
          {isGenerating ? (
            <>
              <i className="fa-solid fa-spinner fa-spin text-white text-sm lg:text-base" />
              <span className="absolute -top-1 -right-2 text-[9px] lg:text-[10px] px-1 py-0.5 rounded bg-primaryColor text-white font-semibold">
                {safeProgress}%
              </span>
            </>
          ) : (
            <i
              className={`fa-solid fa-closed-captioning text-sm lg:text-base ${
                currentSubtitle ? "text-primaryColor" : "text-white"
              }`}
            />
          )}
        </button>
      </Tooltip>

      <div
        className={`absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-md rounded-lg border border-white/20 overflow-hidden shadow-xl min-w-[200px] z-[130] origin-bottom-right transition-all duration-300 ease-out ${
          showSubtitleMenu
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-2 scale-95 pointer-events-none"
        }`}
      >
        <div className="px-4 py-2 text-sm text-white border-b border-white/10">
          {isGenerating ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span>Đang tạo phụ đề Tiếng Hàn</span>
                <span className="text-primaryColor font-semibold">{safeProgress}%</span>
              </div>
              <div className="w-full h-1.5 rounded bg-white/20 overflow-hidden">
                <div
                  className="h-full bg-primaryColor transition-all duration-500"
                  style={{ width: `${safeProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <span>Phụ đề Tiếng Hàn</span>
              <span className="text-[10px] text-gray-400 italic">(Tạo bởi AI, có thể có sai sót)</span>
            </div>
          )}
        </div>

        {subtitleOptions.map((opt) => (
          <button
            key={String(opt.key)}
            onClick={() => onSubtitleChange(opt.key)}
            disabled={isGenerating}
            className={`w-full px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors flex items-center justify-end gap-2 text-right disabled:opacity-50 ${
              currentSubtitle === opt.key ? "bg-white/20" : ""
            }`}
          >
            <span className="text-right">{opt.label}</span>
            {currentSubtitle === opt.key && (
              <i className="fa-solid fa-check text-primaryColor text-xs" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SubtitleMenu;
