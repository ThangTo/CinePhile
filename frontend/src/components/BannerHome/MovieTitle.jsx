import React from "react";

/**
 * Movie Title Component - Displays movie title and subtitle
 * Shows on mobile/tablet, hidden on desktop (logo is shown instead)
 * @param {Object} props
 * @param {string} props.title - Main movie title
 * @param {string} props.shortTitle - Short/English title
 */
const MovieTitle = ({ title, shortTitle }) => (
  <>
    <h1 className="text-2xl sm:text-3xl font-bold md:mb-2 lg:hidden">{title}</h1>
    <h2 className="text-sm mt-1 font-light text-primaryColor md:mb-2 lg:hidden">{shortTitle}</h2>
  </>
);

export default MovieTitle;
