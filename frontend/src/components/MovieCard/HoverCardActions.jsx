import React from "react";
import ActionButton from "../BannerHome/ActionButton";

/**
 * Hover Card Actions Component - Watch, Like, Info buttons
 * Reuses ActionButton from BannerHome with custom primary button styling
 * @param {Object} props
 * @param {Function} props.onWatch - Watch button click handler
 * @param {Function} props.onLike - Like button click handler
 * @param {Function} props.onInfo - Info button click handler
 */
const HoverCardActions = ({ onWatch, onLike, onInfo, compact = false }) => (
  <div className="flex gap-2">
    {/* Watch Now Button - Custom gradient style */}
    <button
      onClick={onWatch}
      className={`flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-black font-semibold rounded-lg ${compact ? "py-2 px-3 text-xs" : "py-2.5 px-4"} transition-all shadow-lg`}
    >
      <i className={`fa-solid fa-play ${compact ? "text-xs" : "text-sm"}`} />
      <span className={`${compact ? "text-xs" : "text-sm"}`}>Xem ngay</span>
    </button>

    {/* Like Button - Reuse ActionButton */}
    <div className="flex items-center">
      <ActionButton
        icon="fa-heart"
        onClick={onLike}
        variant="default"
        size={compact ? "sm" : "md"}
        ariaLabel="Thích"
      />
    </div>

    {/* Info Button - Reuse ActionButton */}
    <div className="flex items-center">
      <ActionButton
        icon="fa-info-circle"
        onClick={onInfo}
        variant="default"
        size={compact ? "sm" : "md"}
        ariaLabel="Chi tiết"
      />
    </div>
  </div>
);

export default HoverCardActions;
