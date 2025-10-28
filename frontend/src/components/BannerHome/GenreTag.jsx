import React from "react";

/**
 * Genre Tag Component - Displays a clickable genre tag
 * @param {Object} props
 * @param {string} props.genre - Genre name
 */
const GenreTag = ({ genre, className = "" }) => (
  <a
    href={`/genre/${genre}`}
    title={genre}
    className={`rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-gray-300 hover:text-primaryColor transition-colors ${className}`}
  >
    {genre}
  </a>
);

export default GenreTag;
