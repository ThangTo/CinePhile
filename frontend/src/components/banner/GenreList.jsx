import React from "react";
import GenreTag from "./GenreTag";

/**
 * Genre List Component - Displays list of genre tags
 * Hidden on mobile, shown on desktop
 * @param {Object} props
 * @param {Array<string>} props.genres - Array of genre names
 */
const GenreList = ({ genres }) => {
  // Remove duplicates to avoid React key warnings
  const uniqueGenres = [...new Set(genres)];

  return (
    <div className="hidden sm:mt-2 lg:mt-4 sm:flex flex-wrap gap-2">
      {uniqueGenres.map((genre, index) => (
        <GenreTag key={`${genre}-${index}`} genre={genre} />
      ))}
    </div>
  );
};

export default GenreList;
