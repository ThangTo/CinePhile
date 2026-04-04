import React from "react";
import { useNavigate } from "react-router-dom";
import RankBadge from "./RankBadge";
import ClippedPoster from "./ClippedPoster";
import MovieViewsTag from "components/common/MovieViewsTag";
import WithHoverCard from "components/common/WithHoverCard";

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
      className="relative flex-shrink-0 w-[50%] sm:w-[30%] md:w-[20%] lg:w-[16.5%] min-w-[100px] select-none cursor-pointer"
      onClick={handleClick}
    >
      <ClippedPoster
        src={movie.poster}
        fallbackSrcs={[movie.backgroundImage, movie.thumb_url, movie.poster_url]}
        alt={movie.title}
        isOdd={isOdd}
      />

      <div className="mt-1 flex items-start gap-2">
        <RankBadge rank={rank} />

        <div className="flex min-w-0 flex-1 flex-col pt-2 sm:pt-1">
          <div className="line-clamp-1 text-sm font-semibold leading-tight text-white sm:text-base">
            {movie.title}
          </div>

          <div className="mt-0.5 line-clamp-1 text-xs text-gray-400">{movie.englishTitle}</div>

          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            <MovieViewsTag movie={movie} compact variant="soft" />

            {movie.episode && (
              <div className="hidden line-clamp-1 text-[10px] text-gray-500 sm:block">
                {movie.episode}
              </div>
            )}

            <div className="hidden items-center gap-1.5 flex-wrap sm:flex">
              {movie.rating > 0 && (
                <span className="inline-flex items-center gap-0.5 rounded bg-primaryColor/20 px-1.5 py-0.5 text-[10px] font-semibold text-primaryColor">
                  <i className="fa-solid fa-star text-[8px]" />
                  {movie.rating.toFixed(1)}
                </span>
              )}
              {movie.quality && (
                <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-400">
                  {movie.quality}
                </span>
              )}
              {movie.totalEpisodes === 1 &&
              (movie.currentEpisode === 1 ||
                movie.currentEpisode === "1" ||
                movie.currentEpisode === "Full") ? (
                <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-orange-400">
                  Full
                </span>
              ) : movie.totalEpisodes > 1 && movie.currentEpisode ? (
                <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-orange-400">
                  Tập {movie.currentEpisode}
                </span>
              ) : null}
              {movie.ageRating && (
                <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-red-400">
                  {movie.ageRating}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </WithHoverCard>
  );
};

export default Top10Card;
