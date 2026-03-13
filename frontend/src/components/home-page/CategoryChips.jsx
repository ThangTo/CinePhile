import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import movieService from "services/movie.service";

const colors = [
  "from-indigo-500 to-blue-500",
  "from-purple-500 to-indigo-500",
  "from-emerald-500 to-cyan-500",
  "from-violet-500 to-fuchsia-500",
  "from-orange-500 to-rose-500",
  "from-amber-500 to-pink-500",
  "from-slate-600 to-slate-500",
];

const MAX_GENRES = 7; // Số lượng genres tối đa hiển thị

const CategoryChips = () => {
  const [genres, setGenres] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        setIsLoading(true);

        // Lấy top genres theo views từ movie service (public API)
        let displayGenres = null;
        try {
          const response = await movieService.getTopGenresByViews(MAX_GENRES);
          const topGenres = response?.genres || [];

          if (topGenres.length > 0) {
            displayGenres = topGenres.map((g) => ({
              name: g.name,
              slug: g.slug,
            }));
          }
        } catch (error) {
          console.log("Error fetching top genres, using fallback:", error);
        }

        // Nếu không lấy được top genres, fallback về filter options
        if (!displayGenres || displayGenres.length === 0) {
          const filterOptions = await movieService.getFilterOptions();
          const allGenres = filterOptions?.genres || [];
          displayGenres = allGenres.slice(0, MAX_GENRES);
        }

        setGenres(displayGenres);
      } catch (error) {
        console.error("Error fetching genres:", error);
        // Fallback to empty array on error
        setGenres([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGenres();
  }, []);

  // Hiển thị skeleton/loading state
  if (isLoading) {
    return (
      <section className="w-full py-6">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 px-4">Bạn đang quan tâm gì?</h2>
        <div className="sm:hidden overflow-x-auto scrollbar-hide px-4">
          <div className="flex gap-2 pb-2">
            {Array.from({ length: MAX_GENRES }).map((_, idx) => (
              <div
                key={idx}
                className="flex-shrink-0 w-[120px] h-[80px] rounded-xl bg-gray-700/30 animate-pulse"
              />
            ))}
          </div>
        </div>
        <div className="hidden sm:block px-4">
          <div className="grid grid-cols-3 lg:grid-cols-7 wrap gap-3">
            {Array.from({ length: MAX_GENRES }).map((_, idx) => (
              <div key={idx} className="h-32 rounded-xl bg-gray-700/30 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Không hiển thị nếu không có genres
  if (genres.length === 0) {
    return null;
  }

  return (
    <section className="w-full sm:py-6 py-2">
      <h2 className="text-xl sm:text-2xl font-bold mb-4 px-4">Bạn đang quan tâm gì?</h2>

      {/* Mobile: Horizontal Scroll */}
      <div className="sm:hidden overflow-x-auto scrollbar-hide px-4">
        <div className="flex gap-2 pb-2">
          {genres.map((genre, idx) => (
            <Link
              key={genre.slug}
              to={`/genre/${genre.slug}`}
              className={`relative flex flex-col items-center justify-center flex-shrink-0 w-[120px] rounded-xl p-4 text-white bg-gradient-to-br ${
                colors[idx % colors.length]
              } overflow-hidden`}
            >
              <div className="text-base font-semibold text-center">{genre.name}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Desktop: Grid */}
      <div className="hidden sm:block px-4">
        <div className="grid grid-cols-3 lg:grid-cols-7 wrap gap-3">
          {genres.map((genre, idx) => (
            <Link
              key={genre.slug}
              to={`/genre/${genre.slug}`}
              className={`flex flex-col items-start justify-end rounded-xl p-6 text-white bg-gradient-to-br hover:translate-y-[-5px] transition-all duration-300 ${
                colors[idx % colors.length]
              } overflow-hidden`}
            >
              <div className="text-xl font-bold">{genre.name}</div>
              <div className="mt-2 text-sm opacity-90">Xem chủ đề →</div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoryChips;
