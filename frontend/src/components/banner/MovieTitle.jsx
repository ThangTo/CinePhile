import React from "react";

/**
 * Movie Title Component - Displays movie title and subtitle
 * @param {Object} props
 * @param {string} props.title - Main movie title
 * @param {string} props.englishTitle - English title
 */
const MovieTitle = ({ title, englishTitle }) => (
  <>
    <h1 className="text-2xl line-clamp-1 overflow-hidden sm:text-3xl font-bold md:mb-2 text-center lg:text-4xl">
      {title}
    </h1>
    <h2 className="text-sm mt-1 line-clamp-1 overflow-hidden font-light text-primaryColor md:mb-2 text-center lg:text-md">
      {englishTitle}
    </h2>
  </>
);

export default MovieTitle;
