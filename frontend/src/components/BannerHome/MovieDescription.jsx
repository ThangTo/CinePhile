import React from "react";

/**
 * Movie Description Component - Displays movie description
 * Hidden on mobile, shown on desktop
 * @param {Object} props
 * @param {string} props.description - Movie description text
 */
const MovieDescription = ({ description }) => (
  <p className="md:mt-6 text-gray-300 md:text-sm hidden md:block">{description}</p>
);

export default MovieDescription;
