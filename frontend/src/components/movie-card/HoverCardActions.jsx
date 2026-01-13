import React from "react";
import ActionButton from "components/banner/ActionButton";

/**
 * Hover Card Actions Component - Watch, Like, Add to List, Info buttons
 * Reuses ActionButton from BannerHome with custom primary button styling
 * @param {Object} props
 * @param {Function} props.onWatch - Watch button click handler
 * @param {Function} props.onLike - Like button click handler
 * @param {Function} props.onAddToList - Add to watchlist button click handler (optional)
 * @param {Function} props.onInfo - Info button click handler
 * @param {boolean} props.isFavorite - Whether the movie is favorited
 * @param {boolean} props.isHidden - Whether the movie is hidden (shows trailer instead)
 */
const HoverCardActions = ({
  onWatch,
  onLike,
  onAddToList,
  onInfo,
  isFavorite = false,
  isHidden = false,
}) => (
  <div className="flex gap-2">
    {/* Watch Now Button - Custom gradient style */}
    <button
      onClick={onWatch}
      className="flex-1 flex items-center justify-center gap-2 bg-primaryColor hover:bg-hoverPrimaryColor text-primaryColorButtonText font-semibold rounded-lg py-2.5 px-4 text-sm transition-all shadow-lg"
    >
      <i className={`fa-solid ${isHidden ? "fa-film" : "fa-play"} text-sm`} />
      <span className="text-sm">{isHidden ? "Xem Trailer" : "Xem ngay"}</span>
    </button>

    {/* Like Button - Reuse ActionButton */}
    <div className="flex items-center">
      <ActionButton
        icon="fa-heart"
        onClick={onLike}
        variant={isFavorite ? "favorite" : "default"}
        size="md"
        ariaLabel={isFavorite ? "Bỏ yêu thích" : "Yêu thích"}
        isFavorite={isFavorite}
      />
    </div>

    {/* Add to List Button - Reuse ActionButton (if handler provided) */}
    {onAddToList && (
      <div className="flex items-center">
        <ActionButton
          icon="fa-plus"
          onClick={onAddToList}
          variant="default"
          size="md"
          ariaLabel="Thêm vào danh sách"
        />
      </div>
    )}

    {/* Info Button - Reuse ActionButton */}
    <div className="flex items-center">
      <ActionButton
        icon="fa-info-circle"
        onClick={onInfo}
        variant="default"
        size="md"
        ariaLabel="Chi tiết"
      />
    </div>
  </div>
);

export default HoverCardActions;
