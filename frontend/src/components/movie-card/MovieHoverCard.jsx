import React from "react";
import { useNavigate } from "react-router-dom";
import HoverCardHeader from "./HoverCardHeader";
import HoverCardActions from "./HoverCardActions";
import HoverCardInfo from "./HoverCardInfo";
import HoverCardGenres from "./HoverCardGenres";

/**
 * Movie Hover Card Component - Detailed movie information on hover
 * Reuses components from BannerHome for consistency
 * @param {Object} props
 * @param {Object} props.movie - Movie data
 */
const MovieHoverCard = ({ movie, hoverClass = "w-[400px]", compact = false }) => {
  const navigate = useNavigate();

  // Handler functions
  const handleWatch = (e) => {
    e.stopPropagation();
    navigate(`/watch/${movie.id}?ep=1`);
  };
  const handleLike = (e) => {
    e.stopPropagation();
    navigate(`/movie/${movie.id}`);
  };
  const handleInfo = (e) => {
    e.stopPropagation();
    navigate(`/movie/${movie.id}`);
  };
  const handleHeaderClick = (e) => {
    e.stopPropagation();
    navigate(`/movie/${movie.id}`);
  };

  return (
    <div className={`${hoverClass} h-full pb-2 rounded-xl overflow-hidden bg-gray-800 shadow-2xl`}>
      {/* Header with backdrop and title */}
      <HoverCardHeader
        backdropUrl={movie.backdropUrl || movie.posterUrl || movie.poster}
        title={movie.title}
        subtitle={movie.subtitle || movie.englishTitle}
        compact={compact}
        onClick={handleHeaderClick}
      />

      {/* Content */}
      <div className={`${compact ? "p-3 space-y-2" : "p-4 space-y-3"}`}>
        {/* Action Buttons */}
        <HoverCardActions onWatch={handleWatch} onLike={handleLike} onInfo={handleInfo} compact={compact} />

        {/* Movie Info Badges */}
        <HoverCardInfo
          rating={movie.rating}
          ageRating={movie.ageRating}
          year={movie.year}
          season={movie.season}
          currentEpisode={movie.currentEpisode}
          totalEpisodes={movie.totalEpisodes}
        />

        {/* Genres */}
        <HoverCardGenres genres={movie.genres} />
      </div>
    </div>
  );
};

export default MovieHoverCard;
