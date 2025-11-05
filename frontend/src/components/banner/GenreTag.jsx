import React from "react";
import { Link } from "react-router-dom";
import { slugify } from "utils/slugify";

/**
 * Genre Tag Component - Displays a clickable genre tag
 * @param {Object} props
 * @param {string} props.genre - Genre name
 */
const GenreTag = ({ genre, className = "" }) => (
  <Link
    to={`/genre/${slugify(genre)}`}
    title={genre}
    className={`rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-gray-300 hover:text-primaryColor transition-colors ${className}`}
  >
    {genre}
  </Link>
);

export default GenreTag;
