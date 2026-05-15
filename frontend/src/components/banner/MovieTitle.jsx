import React from "react";

/**
 * Movie Title Component - Displays movie title and subtitle
 * On large screens (lg+), shows logo if available, otherwise shows text title
 * On smaller screens, always shows text title
 * @param {Object} props
 * @param {string} props.title - Main movie title
 * @param {string} props.englishTitle - English title
 * @param {string} props.logo - Logo URL from TMDB (optional)
 */
const MovieTitle = ({ title, englishTitle, logo }) => (
  <>
    {/* Logo for large screens (lg+) - only if logo exists */}
    {logo && (
      <div className="hidden lg:block mb-4">
        <img
          src={logo}
          alt={title}
          className="max-h-40 xl:max-h-72 w-auto object-cover"
          onError={(e) => {
            // If logo fails to load, hide it and show text title instead
            e.target.style.display = "none";
            e.target.parentElement.style.display = "none";
          }}
        />
      </div>
    )}

    {/* Text title - always visible on small screens, visible on lg+ only if no logo */}
    <h1
      className={`text-2xl line-clamp-1 md:line-clamp-2 overflow-hidden sm:text-3xl font-bold md:mb-2 text-start lg:text-4xl pb-1 ${
        logo ? "lg:hidden" : ""
      }`}
    >
      {title}
    </h1>
    <h2 className="text-sm mt-1 line-clamp-1 overflow-hidden font-light text-primaryColor md:mb-2 text-start lg:text-md">
      {englishTitle}
    </h2>
  </>
);

export default MovieTitle;
