import React from "react";
import Tooltip from "../watch-page/Tooltip";

const AudioMenu = ({
  audioOptions,
  audioType,
  currentAudioLabel,
  showAudioMenu,
  onToggleAudioMenu,
  onAudioChange,
}) => {
  return (
    <div className="relative audio-menu-container">
      <Tooltip text={currentAudioLabel}>
        <button
          onClick={onToggleAudioMenu}
          className="w-8 h-8 lg:w-10 lg:h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-105"
        >
          <i className="fa-solid fa-microphone text-white text-sm lg:text-base" />
        </button>
      </Tooltip>
      <div
        className={`absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-md rounded-lg border border-white/20 overflow-hidden shadow-xl min-w-[140px] z-[130] origin-bottom-right transition-all duration-300 ease-out ${
          showAudioMenu
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-2 scale-95 pointer-events-none"
        }`}
      >
        {audioOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => onAudioChange(opt.key)}
            className={`w-full px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors flex items-center justify-end gap-2 text-right ${
              audioType === opt.key ? "bg-white/20" : ""
            }`}
          >
            <span className="text-right">{opt.label}</span>
            {audioType === opt.key && <i className="fa-solid fa-check text-primaryColor text-xs" />}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AudioMenu;
