import React from "react";
import CastSection from "./CastSection";

const MovieInfo = ({ movie }) => {
  return (
    <section className="container mx-auto px-4 py-8">
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Poster */}
        <div className="lg:col-span-1">
          <div className="relative">
            <img
              src={movie.poster}
              alt={movie.title}
              className="w-full max-w-sm mx-auto rounded-lg shadow-2xl"
            />
            {movie.completed && (
              <div className="absolute -top-2 -left-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                <i className="fa-solid fa-check" />
                Đã hoàn thành: {movie.totalEpisodes} / {movie.totalEpisodes} tập
              </div>
            )}
          </div>
        </div>

        {/* Right: Movie Details */}
        <div className="lg:col-span-2">
          <h1 className="text-4xl font-bold mb-2">{movie.title}</h1>
          <h2 className="text-xl text-gray-300 mb-6">{movie.englishTitle}</h2>

          {/* Info Badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="bg-yellow-500 text-black px-3 py-1 rounded text-sm font-semibold">
              IMDb {movie.imdb}
            </span>
            <span className="bg-white text-black px-3 py-1 rounded text-sm font-semibold">
              {movie.ageRating}
            </span>
            <span className="bg-white text-black px-3 py-1 rounded text-sm font-semibold">
              {movie.year}
            </span>
            <span className="bg-white text-black px-3 py-1 rounded text-sm font-semibold">
              {movie.part}
            </span>
            <span className="bg-white text-black px-3 py-1 rounded text-sm font-semibold">
              {movie.episode}
            </span>
          </div>

          {/* Genres */}
          <div className="flex flex-wrap gap-2 mb-6">
            {movie.genres.map((genre, index) => (
              <span
                key={index}
                className="bg-gray-700 text-gray-200 px-3 py-1 rounded-full text-sm"
              >
                {genre}
              </span>
            ))}
          </div>

          {/* Synopsis */}
          <div className="mb-6">
            <h3 className="text-xl font-bold mb-3">Giới thiệu:</h3>
            <p className="text-gray-300 leading-relaxed">{movie.synopsis}</p>
          </div>

          {/* Movie Details */}
          <div className="space-y-2 text-sm mb-5">
            <div className="flex">
              <span className="font-semibold w-24">Thời lượng:</span>
              <span className="text-gray-300">{movie.duration}</span>
            </div>
            <div className="flex">
              <span className="font-semibold w-24">Quốc gia:</span>
              <span className="text-gray-300">{movie.country}</span>
            </div>
            <div className="flex">
              <span className="font-semibold w-24">Networks:</span>
              <span className="text-gray-300">{movie.networks}</span>
            </div>
            <div className="flex">
              <span className="font-semibold w-24">Sản xuất:</span>
              <span className="text-gray-300">{movie.production}</span>
            </div>
            <div className="flex">
              <span className="font-semibold w-24">Đạo diễn:</span>
              <span className="text-gray-300">{movie.director}</span>
            </div>
          </div>
          <CastSection movie={movie} />
        </div>
      </div>
    </section>
  );
};

export default MovieInfo;
