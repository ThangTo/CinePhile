import React from "react";
import InfoBadge from "components/banner/InfoBadge";

const HoverCardInfo = ({ rating, ageRating, year, season, currentEpisode, totalEpisodes }) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* IMDb Rating - Reuse InfoBadge with custom styling */}
      {rating > 0 && (
        <div className="inline-flex">
          <InfoBadge label="⭐" value={rating} isIMDb={true} />
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
          Tập {currentEpisode || 1}/{totalEpisodes}
        </span>
      )}
    </div>
  );
};

export default HoverCardInfo;
