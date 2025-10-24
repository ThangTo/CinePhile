import React from "react";
import { useNavigate } from "react-router-dom";

const MovieCard = ({ movie }) => {
  const navigate = useNavigate();

  return (
    <div className="group relative rounded-lg overflow-hidden bg-[#0f172a] border border-white/10">
      <div className="aspect-[2/3] w-full overflow-hidden">
        <img
          src={movie.posterUrl}
          alt={movie.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      {/* Overlay bottom with title */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3">
        <h3 className="text-sm font-semibold text-white line-clamp-2">{movie.title}</h3>
        <p className="text-xs text-gray-300 mt-0.5">{movie.year}</p>
      </div>

      {/* Top-left badge */}
      <div className="absolute left-2 top-2">
        <span className="rounded bg-cyan-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
          HD
        </span>
      </div>

      {/* Hover actions */}
      <div className="absolute inset-0 hidden items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity duration-200 group-hover:flex group-hover:opacity-100">
        <button
          onClick={() => navigate(`/watch/${movie.id}?ep=1`)}
          className="rounded-full bg-cyan-500 hover:bg-cyan-400 text-white text-sm px-3 py-1.5"
        >
          Xem ngay
        </button>
        <button
          onClick={() => navigate(`/movie/${movie.id}`)}
          className="rounded-full bg-white/10 hover:bg-white/20 text-white text-sm px-3 py-1.5 border border-white/20"
        >
          Chi tiết
        </button>
      </div>
    </div>
  );
};

export default MovieCard;
