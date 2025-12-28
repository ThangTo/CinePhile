import React, { useState } from "react";
import { Link } from "react-router-dom";
import OptimizedImage from "components/common/OptimizedImage";
// import CastSection  from './CastSection'

const MovieInfoBrief = ({ movie, activeEp }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <div className="lg:col-span-8 m-[6px] pb-[30px] border-b-2 border-borderColor">
      <div className="mt-6 grid gap-6 lg:grid-cols-8">
        {/* Poster */}
        <div className="lg:col-span-1">
          <Link to={`/movie/${movie.id}`}>
            <OptimizedImage
              src={movie.poster}
              alt={movie.title}
              className="w-full aspect-[2/3] object-cover rounded-lg shadow-lg hover:opacity-90 transition-opacity"
              priority={true}
              size="150"
            />
          </Link>
        </div>

        <div className="lg:col-span-4">
          {/* Tiêu đề */}
          <h1 className="text-2xl font-bold mb-2">{movie.title}</h1>
          <h2 className="text-l text-primaryColor mb-4">{movie.englishTitle}</h2>

          {/* Dòng badge */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="bg-primaryColor text-primaryColorButtonText px-3 py-1 rounded text-xs font-semibold">
              IMDb {movie.imdb}
            </span>
            <span className="bg-white text-black px-3 py-1 rounded text-xs font-semibold">
              {movie.ageRating}
            </span>
            <span className="bg-white text-black px-3 py-1 rounded text-xs font-semibold">
              {movie.year}
            </span>
            {/* <span className="bg-white text-black px-3 py-1 rounded text-xs font-semibold">
              {movie.part}
            </span> */}
            <span className="bg-white text-black px-3 py-1 rounded text-xs font-semibold">
              Tập {activeEp}
            </span>
          </div>

          {/* Thể loại */}
          <div className="flex flex-wrap gap-2 mb-6">
            {movie.genres?.map((g, i) => (
              <span
                key={`${g}-${i}`}
                className="bg-gray-700 text-gray-200 px-3 py-1 rounded-full text-xs"
              >
                {g}
              </span>
            ))}
          </div>

          {/* Pill hoàn thành */}
          {movie.completed && (
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-600/20 text-emerald-300 px-3 py-1 text-xs">
              <i className="fa-solid fa-check" />
              <span>
                Đã hoàn thành: {movie.totalEpisodes} / {movie.totalEpisodes} tập
              </span>
            </div>
          )}
        </div>

        {/* Tóm tắt + link “Thông tin phim >” */}
        <div className="lg:col-span-3">
          <div>
            <p className={`text-gray-300 ${isExpanded ? "" : "line-clamp-3"}`}>
              {movie.description}
            </p>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm text-primaryColor hover:text-hoverPrimaryColor mt-1 underline cursor-pointer"
            >
              {isExpanded ? "Thu gọn" : "Xem thêm"}
            </button>
          </div>
          <Link
            to={`/movie/${movie.id}`}
            className="text-primaryColor hover:text-hoverPrimaryColor text-sm inline-block mt-2"
          >
            Thông tin phim &gt;
          </Link>
        </div>
      </div>
      <div className="lg:col-span-4"></div>
    </div>
  );
};

export default MovieInfoBrief;
