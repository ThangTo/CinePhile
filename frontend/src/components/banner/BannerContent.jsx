import React from "react";
import { MovieTitle, MovieInfo, GenreList, MovieDescription, ActionButtons } from "./index";

/**
 * Banner Content Component - Main content container for banner
 * @param {Object} props
 * @param {Object} props.movieData - Movie data object
 * @param {Array} props.infoBadges - Info badges configuration
 * @param {Array} props.actionButtons - Action buttons configuration
 */
const BannerContent = ({ movieData, infoBadges, actionButtons }) => (
  <div className="absolute inset-0 flex justify-center items-center mt-16 sm:block z-10 w-full mx-auto px-4 py-8 sm:mt-28 md:mt-0">
    <div className="max-w-2xl flex flex-col justify-center items-center sm:items-start py-12 sm:py-10 pb-4 px-4 md:px-8 md:py-4 md:pb-10 md:justify-end md:h-full">
      {/* Movie Title - Flexible on desktop, pushes up if too long */}
      <div className="md:flex-1 md:flex md:flex-col md:justify-end flex flex-col sm:items-start items-center md:min-h-0">
        <MovieTitle
          title={movieData.title}
          englishTitle={movieData.englishTitle}
          logo={movieData.images?.logo}
        />
      </div>

      {/* Fixed position content on desktop */}
      <div className="md:flex-shrink-0 flex flex-col md:items-start">
        {/* Info Badges */}
        <MovieInfo badges={infoBadges} />

        {/* Genre Tags */}
        <GenreList genres={movieData.genres} />

        {/* Description */}
        <MovieDescription description={movieData.description} />

        {/* Action Buttons */}
        <ActionButtons buttons={actionButtons} />
      </div>
    </div>
  </div>
);

export default BannerContent;
