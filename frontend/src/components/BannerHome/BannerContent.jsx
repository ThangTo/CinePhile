import React from "react";
import MovieTitle from "./MovieTitle";
import MovieLogo from "./MovieLogo";
import MovieInfo from "./MovieInfo";
import GenreList from "./GenreList";
import MovieDescription from "./MovieDescription";
import ActionButtons from "./ActionButtons";

/**
 * Banner Content Component - Main content container for banner
 * @param {Object} props
 * @param {Object} props.movieData - Movie data object
 * @param {Array} props.infoBadges - Info badges configuration
 * @param {Array} props.actionButtons - Action buttons configuration
 */
const BannerContent = ({ movieData, infoBadges, actionButtons }) => (
  <div className="absolute inset-0 sm:relative flex justify-center items-center mt-16 sm:block z-10 w-full mx-auto px-4 py-8 sm:mt-28 md:mt-16">
    <div className="max-w-3xl flex flex-col justify-center items-center sm:items-start py-12 pb-4 px-4 lg:px-8 lg:py-12">
      {/* Movie Title - Mobile/Tablet */}
      <MovieTitle title={movieData.title} shortTitle={movieData.shortTitle} />

      {/* Movie Logo - Desktop */}
      <MovieLogo logoImage={movieData.logoImage} title={movieData.title} movieId={movieData.id} />

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
);

export default BannerContent;
