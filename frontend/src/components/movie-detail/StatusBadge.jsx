import React from "react";
import { parseEpisodeNumber } from "utils/ultils";

const StatusBadge = ({ status, currentEpisode, totalEpisodes, className = "" }) => {
  let currentEpNum = parseEpisodeNumber(currentEpisode);
  if (currentEpNum > totalEpisodes) {
    currentEpNum = totalEpisodes;
  }

  if (!totalEpisodes || totalEpisodes === 0) {
    return null;
  }

  let badgeContent = "";
  let badgeClass = "";

  if (status === "upcoming") {
    badgeContent = "Sắp ra mắt";
    badgeClass = "bg-purple-500/80 text-white";
  } else if (status === "completed" || (currentEpNum > 0 && currentEpNum === totalEpisodes)) {
    badgeContent = `Đã hoàn thành ${currentEpNum || totalEpisodes}/${totalEpisodes} tập`;
    badgeClass = "bg-green-500/80 text-white";
  } else if (status === "ongoing" && currentEpNum > 0 && currentEpNum < totalEpisodes) {
    badgeContent = `Đang cập nhật ${currentEpNum}/${totalEpisodes} tập`;
    badgeClass = "bg-orange-500/80 text-white";
  } else if (status === "ongoing" && totalEpisodes > 0) {
    // Fallback cho ongoing nhưng chưa có currentEpisode
    badgeContent = `Đang cập nhật ${currentEpNum || 0}/${totalEpisodes} tập`;
    badgeClass = "bg-orange-500/80 text-white";
  }

  if (!badgeContent) return null;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg ${badgeClass} ${className}`}
    >
      {status === "completed" || (currentEpNum > 0 && currentEpNum === totalEpisodes) ? (
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
