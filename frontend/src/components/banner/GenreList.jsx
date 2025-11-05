import React from "react";
import GenreTag from "./GenreTag";

/**
 * Genre List Component - Displays list of genre tags
 * Hidden on mobile, shown on desktop
 * @param {Object} props
 * @param {Array<string>} props.genres - Array of genre names
 */
const GenreList = ({ genres }) => (
  <div className="hidden sm:mt-2 lg:mt-4 sm:flex flex-wrap gap-2">
    {genres.map((genre) => (
      <GenreTag key={genre} genre={genre} />
    ))}
  </div>
);

export default GenreList;
