import React from "react";
import InfoBadge from "components/banner/InfoBadge";
import { parseEpisodeNumber } from "utils/ultils";

const HoverCardInfo = ({ rating, ageRating, year, season, currentEpisode, totalEpisodes }) => {
  let currentEpNum = parseEpisodeNumber(currentEpisode);
  if (currentEpNum > totalEpisodes) {
    currentEpNum = totalEpisodes;
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* IMDb Rating - Reuse InfoBadge with custom styling */}
      {rating && (
        <div className="inline-flex">
          <InfoBadge label="IMDb" value={rating} isIMDb={true} />
        </div>
      )}

      {/* Age Rating */}
      {ageRating && (
        <span className="bg-gray-700 text-white px-2 py-1 rounded text-xs font-semibold border border-gray-600">
          {ageRating}
        </span>
      )}

      {/* Year */}
      {year && (
        <span className="bg-gray-700 text-white px-2 py-1 rounded text-xs font-semibold border border-gray-600">
          {year}
        </span>
      )}

      {/* Season */}
      {/* {season && (
        <span className="bg-gray-700 text-white px-2 py-1 rounded text-xs font-semibold border border-gray-600">
          Phần {season}
        </span>
      )} */}

      {/* Episode Count */}
      {totalEpisodes && (
        <span className="text-gray-300 text-xs">
          Tập {currentEpNum || 1}/{totalEpisodes}
        </span>
      )}
    </div>
  );
};

export default HoverCardInfo;
