import React from "react";

const StatusBadge = ({
  status,
  currentEpisode,
  totalEpisodes,
  isHidden = false,
  className = "",
}) => {
  if (!totalEpisodes || totalEpisodes === 0) {
    return null;
  }

  let badgeContent = "";
  let badgeClass = "";

  // If movie is hidden, always show "Sắp ra mắt" regardless of actual status
  if (isHidden) {
    badgeContent = "Sắp ra mắt";
    badgeClass = "bg-purple-500/80 text-white";
  } else if (status === "upcoming") {
    badgeContent = "Sắp ra mắt";
    badgeClass = "bg-purple-500/80 text-white";
  } else if (status === "completed" || (currentEpisode > 0 && currentEpisode === totalEpisodes)) {
    badgeContent =
      currentEpisode > 1
        ? `Đã hoàn thành ${currentEpisode}/${totalEpisodes} tập`
        : `Đã hoàn thành `;
    badgeClass = "bg-green-500/80 text-white";
  } else if (status === "ongoing" && currentEpisode > 0 && currentEpisode < totalEpisodes) {
    badgeContent =
      currentEpisode > 1 ? `Đang cập nhật ${currentEpisode}/${totalEpisodes} tập` : `Đang cập nhật`;
    badgeClass = "bg-orange-500/80 text-white";
  } else if (status === "ongoing" && totalEpisodes > 0) {
    // Fallback cho ongoing nhưng chưa có currentEpisode
    badgeContent =
      currentEpisode > 1
        ? `Đang cập nhật ${currentEpisode || 0}/${totalEpisodes} tập`
        : `Đang cập nhật`;
    badgeClass = "bg-orange-500/80 text-white";
  }

  if (!badgeContent) return null;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg ${badgeClass} ${className}`}
    >
      {isHidden || status === "upcoming" ? (
        <i className="fa-solid fa-clock" />
      ) : status === "completed" || (currentEpisode > 0 && currentEpisode === totalEpisodes) ? (
        <i className="fa-solid fa-check" />
      ) : (
        <i className="fa-solid fa-spinner" />
      )}
      <span>{badgeContent}</span>
    </div>
  );
};

export default StatusBadge;
