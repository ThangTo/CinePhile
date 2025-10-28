import React from "react";
import { useNavigate } from "react-router-dom";
import RankBadge from "./RankBadge";
import ClippedPoster from "./ClippedPoster";
import WithHoverCard from "../common/WithHoverCard";

/**
 * Top 10 movie card with clipped poster and rank
 * Responsive width: adjusts based on screen size
 * @param {Object} props
 * @param {Object} props.movie - Movie data
 * @param {number} props.rank - Movie rank (1-10)
 */
const Top10Card = ({ movie, rank }) => {
  const navigate = useNavigate();
  const isOdd = rank % 2 === 0; // Alternate clipping direction

  const handleClick = () => {
    navigate(`/movie/${movie.id}`);
  };

  return (
    <WithHoverCard
      movie={movie}
      hoverPosition="-left-20 -top-4"
      className="relative flex-shrink-0 w-[90%] sm:w-[45%] md:w-[30%] lg:w-[16.5%] min-w-[200px] select-none cursor-pointer"
      onClick={handleClick}
    >
      <ClippedPoster src={movie.poster} alt={movie.title} isOdd={isOdd} />

      {/* Movie Info */}
      <div className="flex items-start gap-2 mt-1">
        <RankBadge rank={rank} />

        <div className="flex flex-col flex-1 min-w-0 pt-2 sm:pt-1">
          {/* Vietnamese Title */}
          <div className="text-white text-sm sm:text-base font-semibold line-clamp-1 leading-tight">
            {movie.title}
          </div>

          {/* English Title */}
          <div className="mt-0.5 text-gray-400 text-xs sm:text-sm line-clamp-1">
            {movie.englishTitle}
          </div>

          {/* Episode Info */}
          {movie.episode && (
            <div className="hidden sm:block mt-1 text-gray-500 text-[10px] text-xs line-clamp-1">
              {movie.episode}
            </div>
          )}

          {/* Rating & Quality Badges */}
          <div className="hidden sm:flex mt-1.5 items-center gap-1.5 flex-wrap">
            {movie.rating && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-[10px] font-semibold">
                <i className="fa-solid fa-star text-[8px]" />
                {movie.rating}
              </span>
            )}
            {movie.quality && (
              <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-[10px] font-semibold">
                {movie.quality}
              </span>
            )}
            {movie.ageRating && (
              <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-[10px] font-semibold">
                {movie.ageRating}
              </span>
            )}
          </div>
        </div>
      </div>
    </WithHoverCard>
  );
};

export default Top10Card;
