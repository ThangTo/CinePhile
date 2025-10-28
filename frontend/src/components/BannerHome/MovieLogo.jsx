import React from "react";

/**
 * Movie Logo Component - Displays movie logo image
 * Hidden on mobile/tablet, shown on desktop
 * @param {Object} props
 * @param {string} props.logoImage - Logo image URL
 * @param {string} props.title - Movie title for alt text
 * @param {number} props.movieId - Movie ID for link
 */
const MovieLogo = ({ logoImage, title, movieId }) => (
  <div className="hidden lg:block justify-center items-center">
    <a href={`/movie/${movieId}`} title={title}>
      <img src={logoImage} alt={`${title} logo`} className="w-2/3 h-2/3 object-cover" />
    </a>
  </div>
);

export default MovieLogo;
