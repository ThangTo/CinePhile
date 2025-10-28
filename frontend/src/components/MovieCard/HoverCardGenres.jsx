import React from "react";
import GenreTag from "../BannerHome/GenreTag";

/**
 * Hover Card Genres Component - Movie genres list
 * Reuses GenreTag from BannerHome with hover card specific styling
 * @param {Object} props
 * @param {Array<string>} props.genres - Array of genre names
 */
const HoverCardGenres = ({ genres }) => {
  // Default genres if none provided
  const defaultGenres = ["Tình Cảm", "Hài", "Kỳ Ảo", "Lãng Mạn"];
  const displayGenres = genres && genres.length > 0 ? genres : defaultGenres;

  return (
    <div className="flex flex-wrap gap-1.5">
      {displayGenres.map((genre, idx) => (
        <div key={idx} className="inline-flex">
          <GenreTag genre={genre} />
        </div>
      ))}
    </div>
  );
};

export default HoverCardGenres;
