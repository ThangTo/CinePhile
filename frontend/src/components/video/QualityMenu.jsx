import React from "react";
import Tooltip from "../watch-page/Tooltip";

const QualityMenu = ({
  quality,
  qualityOptions,
  showQualityMenu,
  onToggleQualityMenu,
  onQualityChange,
  isPremium,
  isQualityPremium,
}) => {
  return (
    <div className="relative quality-menu-container">
      <Tooltip text="Chất lượng">
        <button
          onClick={onToggleQualityMenu}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm px-3 py-2 lg:px-3.5 lg:py-2.5 rounded-full transition-all hover:scale-105"
        >
          <span className="text-white text-xs lg:text-sm font-medium">{quality}</span>
          <i className="fa-solid fa-cog text-white text-sm lg:text-base" />
        </button>
      </Tooltip>
      <div
        className={`absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-md rounded-lg border border-white/20 overflow-hidden shadow-xl min-w-[140px] z-[130] origin-bottom-right transition-all duration-300 ease-out ${
          showQualityMenu
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-2 scale-95 pointer-events-none"
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
                  className={`w-full px-4 py-2 text-sm transition-colors flex items-center justify-end gap-2 text-right ${
                    isDisabled
                      ? "text-gray-500 cursor-not-allowed opacity-50"
                      : "text-white hover:bg-white/10"
                  } ${isSelected && !isDisabled ? "bg-white/20" : ""}`}
                  title={isDisabled ? "Yêu cầu tài khoản Premium để xem chất lượng này" : undefined}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-right">{q}</span>
                    {requiresPremium && (
                      <i
                        className={`fa-solid fa-crown text-xs ${
                          isPremium ? "text-yellow-400" : "text-gray-500"
                        }`}
                        title="Premium"
                      />
                    )}
                  </div>
                  {isSelected && !isDisabled && (
                    <i className="fa-solid fa-check text-primaryColor text-xs" />
                  )}
                </button>
              );
            })
          : null}
      </div>
    </div>
  );
};

export default QualityMenu;
