import React from "react";
import { useNavigate } from "react-router-dom";
import WithHoverCard from "./common/WithHoverCard";

const MovieCard = ({ movie, hoverVisibleAt = "lg", hoverCardClass, hoverPosition = "-left-20 -top-4", compact = false }) => {
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
        className="group relative rounded-lg overflow-visible bg-[#0f172a] border border-white/10 select-none cursor-pointer transition-all hover:border-primaryColor/50"
        onClick={handleClick}
      >
        <div className="aspect-[2/3] w-full overflow-hidden rounded-lg">
          <img
            src={movie.posterUrl || movie.poster}
            alt={movie.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 pointer-events-none"
            draggable="false"
          />
        </div>

        {/* Overlay bottom with title */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 rounded-b-lg">
          <h3 className="text-sm font-semibold text-white line-clamp-2">{movie.title}</h3>
          <p className="text-xs text-gray-300 mt-0.5">{movie.year}</p>
        </div>

        {/* Top-left badge */}
        <div className="absolute left-2 top-2 z-10">
          <span className="rounded bg-cyan-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
            {movie.quality || "HD"}
          </span>
        </div>
      </div>
    </WithHoverCard>
  );
};

export default MovieCard;
