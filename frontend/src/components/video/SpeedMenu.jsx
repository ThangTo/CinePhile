import React from "react";
import Tooltip from "../watch-page/Tooltip";

const SpeedMenu = ({ playbackRate, showSpeedMenu, onToggleSpeedMenu, onSpeedChange }) => {
  return (
    <div className="relative speed-menu-container">
      <Tooltip text="Tốc độ phát">
        <button
          onClick={onToggleSpeedMenu}
          className="w-8 h-8 lg:w-10 lg:h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-105"
        >
          <i className="fa-solid fa-gauge-high text-white text-sm lg:text-base" />
        </button>
      </Tooltip>
      <div
        className={`absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-md rounded-lg border border-white/20 overflow-hidden shadow-xl min-w-[120px] z-[130] origin-bottom-right transition-all duration-300 ease-out ${
          showSpeedMenu
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-2 scale-95 pointer-events-none"
        }`}
      >
        {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
          <button
            key={speed}
            onClick={() => onSpeedChange(speed)}
            className={`w-full px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors flex items-center justify-end gap-2 text-right ${
              playbackRate === speed ? "bg-white/20" : ""
            }`}
          >
            <span className="text-right">{speed}x</span>
            {playbackRate === speed && (
              <i className="fa-solid fa-check text-primaryColor text-xs" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SpeedMenu;
