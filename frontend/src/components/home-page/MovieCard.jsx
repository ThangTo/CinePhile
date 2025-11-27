import React from "react";
import { useNavigate } from "react-router-dom";
import WithHoverCard from "components/common/WithHoverCard";

const MovieCard = ({
  movie,
  hoverVisibleAt = "lg",
  hoverCardClass,
  hoverPosition = "-left-20 -top-4",
  compact = false,
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/movie/${movie.id}`);
  };

  return (
    <WithHoverCard
      movie={movie}
      hoverPosition={hoverPosition}
      // Let the parent grid control column sizing. Use full width inside grid cell.
      className="relative w-full overflow-visible"
      showHoverOn={hoverVisibleAt}
      hoverCardClass={hoverCardClass}
      compact={compact}
    >
      <div
        className="group bg-bgColor4 rounded-2xl p-4 shadow-lg border border-white/5 cursor-pointer transition-all duration-300 hover:border-primaryColor/60"
        onClick={handleClick}
      >
        <div className="relative rounded-2xl overflow-hidden">
          <img
            src={movie.posterUrl || movie.poster}
            alt={movie.title}
            className="w-full aspect-[2/3] object-cover transition-transform duration-300 group-hover:scale-105 pointer-events-none"
            draggable="false"
          />
          <div className="absolute left-2 top-1 z-10">
            <span className="rounded bg-cyan-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
              {movie.quality || "HD"}
            </span>
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-[11px] text-gray-400 mb-1">
            {movie.year || movie.releaseYear || "N/A"}
          </p>
          <h3 className="text-base font-semibold text-white line-clamp-2">{movie.title}</h3>
          {movie.englishTitle && (
            <p className="text-sm text-gray-400 mt-1 line-clamp-1">{movie.englishTitle}</p>
          )}
        </div>
      </div>
    </WithHoverCard>
  );
};

export default MovieCard;
