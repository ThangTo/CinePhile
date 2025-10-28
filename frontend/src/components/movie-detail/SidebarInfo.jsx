import React from "react";
import CastSection from "./CastSection";
import { GenreTag, MovieInfo } from "../BannerHome/index";
import { useBannerConfig } from "../BannerHome/useBannerConfig";

const SidebarInfo = ({ movie }) => {
  const { infoBadges } = useBannerConfig(movie);

  return (
    <div className="space-y-6 px-16 pb-16">
      {/* Poster */}
      <div className="relative w-48">
        <div className="aspect-[2/3] rounded-xl overflow-hidden shadow-2xl ring-2 ring-white/10">
          <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" />
        </div>
        {movie.completed && (
          <div className="absolute -top-2 -right-2 bg-green-500 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 shadow-lg">
            <i className="fa-solid fa-check" />
            Hoàn thành
          </div>
        )}
      </div>

      {/* Movie Title */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">{movie.title}</h1>
        <h2 className="text-base text-primaryColor">{movie.englishTitle}</h2>
      </div>

      {/* Info Badges */}
      <MovieInfo badges={infoBadges} className="justify-start" />

      {/* Genres */}
      {movie.genres && movie.genres.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Thể loại:</h3>
          <div className="flex flex-wrap gap-2">
            {movie.genres.map((genre, idx) => (
              <GenreTag key={idx} genre={genre} className="text-xs" />
            ))}
          </div>
        </div>
      )}

      {/* Synopsis */}
      {movie.synopsis && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Giới thiệu:</h3>
          <p className="text-gray-300 text-sm leading-relaxed">{movie.synopsis}</p>
        </div>
      )}

      {/* Movie Details */}
      <div className="space-y-2 text-sm border-t border-white/10 pt-4">
        {movie.duration && (
          <div className="flex">
            <span className="font-semibold text-gray-400 w-28">Thời lượng:</span>
            <span className="text-gray-300">{movie.duration}</span>
          </div>
        )}
        {movie.country && (
          <div className="flex">
            <span className="font-semibold text-gray-400 w-28">Quốc gia:</span>
            <span className="text-gray-300">{movie.country}</span>
          </div>
        )}
        {movie.networks && (
          <div className="flex">
            <span className="font-semibold text-gray-400 w-28">Networks:</span>
            <span className="text-gray-300">{movie.networks}</span>
          </div>
        )}
        {(movie.production || movie.studios) && (
          <div className="flex">
            <span className="font-semibold text-gray-400 w-28">Sản xuất:</span>
            <span className="text-gray-300">{movie.production || movie.studios}</span>
          </div>
        )}
        {movie.director && (
          <div className="flex">
            <span className="font-semibold text-gray-400 w-28">Đạo diễn:</span>
            <span className="text-gray-300">{movie.director}</span>
          </div>
        )}
        {movie.status && (
          <div className="flex">
            <span className="font-semibold text-gray-400 w-28">Trạng thái:</span>
            <span className="text-green-400">{movie.status}</span>
          </div>
        )}
      </div>

      {/* Cast */}
      {movie.cast && movie.cast.length > 0 && (
        <div className="border-t border-white/10 pt-6">
          <CastSection movie={movie} layout="vertical" />
        </div>
      )}
    </div>
  );
};

export default SidebarInfo;
