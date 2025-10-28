import React from "react";
import InfoBadge from "../BannerHome/InfoBadge";

/**
 * Hover Card Info Component - Movie metadata badges
 * Reuses InfoBadge from BannerHome for IMDb rating
 * @param {Object} props
 * @param {string} props.rating - IMDb rating
 * @param {string} props.ageRating - Age rating (e.g. T16)
 * @param {string} props.year - Release year
 * @param {number} props.season - Season number (optional)
 * @param {number} props.currentEpisode - Current episode (optional)
 * @param {number} props.totalEpisodes - Total episodes (optional)
 */
const HoverCardInfo = ({ rating, ageRating, year, season, currentEpisode, totalEpisodes }) => (
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
    {season && (
      <span className="bg-gray-700 text-white px-2 py-1 rounded text-xs font-semibold border border-gray-600">
        Phần {season}
      </span>
    )}

    {/* Episode Count */}
    {totalEpisodes && (
      <span className="text-gray-300 text-xs">
        Tập {currentEpisode || 1}/{totalEpisodes}
      </span>
    )}
  </div>
);

export default HoverCardInfo;
