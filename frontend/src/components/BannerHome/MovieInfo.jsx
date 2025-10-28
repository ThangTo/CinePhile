import React from "react";
import InfoBadge from "./InfoBadge";

/**
 * Movie Info Component - Displays movie information badges
 * @param {Object} props
 * @param {Array} props.badges - Array of badge objects with { label, value, isIMDb }
 */
const MovieInfo = ({ badges, className = "justify-center" }) => (
  <div className={`mt-3 sm:mt-2 lg:mt-5 flex flex-wrap item-center gap-2 ${className}`}>
    {badges.map((badge, idx) => (
      <InfoBadge key={idx} label={badge.label} value={badge.value} isIMDb={badge.isIMDb} />
    ))}
  </div>
);

export default MovieInfo;
