import React from "react";

const StatusBadge = ({ status, currentEpisode, totalEpisodes, className = "" }) => {
  if (!totalEpisodes || totalEpisodes === 0) {
    return null;
  }

  let badgeContent = "";
  let badgeClass = "";

  if (status === "upcoming") {
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
      {status === "completed" || (currentEpisode > 0 && currentEpisode === totalEpisodes) ? (
        <i className="fa-solid fa-check" />
      ) : status === "upcoming" ? (
        <i className="fa-solid fa-clock" />
      ) : (
        <i className="fa-solid fa-spinner" />
      )}
      <span>{badgeContent}</span>
    </div>
  );
};

export default StatusBadge;
