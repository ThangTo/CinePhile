import React from "react";
// import CastSection  from './CastSection'

const MovieInfoBrief = ({ movie, activeEp }) => {
  return (
    <div className="lg:col-span-8 m-[6px] pb-[30px] border-b-2 border-borderColor">
      <div className="mt-6 grid gap-6 lg:grid-cols-8">
        {/* Poster */}
        <div className="lg:col-span-1">
          <img
            src={movie.poster}
            alt={movie.title}
            className="w-full aspect-[2/3] object-cover rounded-lg shadow-lg"
          />
        </div>

        <div className="lg:col-span-4">
          {/* Tiêu đề */}
          <h1 className="text-2xl font-bold mb-2">{movie.title}</h1>
          <h2 className="text-l text-primaryColor mb-4">{movie.englishTitle}</h2>

          {/* Dòng badge */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="bg-yellow-500 text-black px-3 py-1 rounded text-xs font-semibold">
              IMDb {movie.imdb}
            </span>
            <span className="bg-white text-black px-3 py-1 rounded text-xs font-semibold">
              {movie.ageRating}
            </span>
            <span className="bg-white text-black px-3 py-1 rounded text-xs font-semibold">
              {movie.year}
            </span>
            <span className="bg-white text-black px-3 py-1 rounded text-xs font-semibold">
              {movie.part}
            </span>
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
          <p className="text-gray-300 leading-relaxed text-sm">{movie.synopsis}</p>
          <a
            href={`/movie/${movie.id}`}
            className="text-primaryColor hover:text-hoverPrimaryColor text-sm mt-2 inline-block mt-6"
          >
            Thông tin phim &gt;
          </a>
        </div>
      </div>
      <div className="lg:col-span-4"></div>
    </div>
  );
};

export default MovieInfoBrief;
