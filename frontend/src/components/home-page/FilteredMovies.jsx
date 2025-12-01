import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import MovieCard from "components/home-page/MovieCard";
import Pagination from "components/common/Pagination";
import usePagination from "hooks/usePagination";
import movieService from "services/movie.service";
import { buildSlugMap, slugify } from "utils/slugify";
import { GENRE_CATEGORIES, COUNTRY_CATEGORIES } from "components/header/constants";
import { BarSpinner } from "components/common/LoadingState";

const FilteredMovies = ({ pageType = "genre" }) => {
  const { slug } = useParams();
  const raw = decodeURIComponent(slug || "");
  const [allMovies, setAllMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllMovies = async () => {
      try {
        setLoading(true);
        const [top10, trending, newReleases] = await Promise.all([
          movieService.getTopRated(10),
          movieService.getTrending(20),
          movieService.getNewReleases(20),
        ]);
        const combined = [
          ...(top10.data || []),
          ...(trending.data || []),
          ...(newReleases.data || []),
        ];
        setAllMovies(combined);
      } catch (error) {
        console.error("Error fetching movies:", error);
        setAllMovies([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAllMovies();
  }, []);

  const headerLabelMap = React.useMemo(() => {
    return {
      genre: buildSlugMap(GENRE_CATEGORIES),
      country: buildSlugMap(COUNTRY_CATEGORIES),
    };
  }, []);

  const labelMap = React.useMemo(() => {
    const map = new Map();
    if (pageType === "genre") {
      allMovies.forEach((m) => {
        (m.genres || []).forEach((g) => {
          const key = slugify(g);
          if (!map.has(key)) map.set(key, g);
        });
      });
    } else if (pageType === "country") {
      allMovies.forEach((m) => {
        const c = m.country;
        if (!c) return;
        const key = slugify(c);
        if (!map.has(key)) map.set(key, c);
      });
    }
    return map;
  }, [allMovies, pageType]);

  const requestedKey = slugify(raw);
  const displayLabel =
    labelMap.get(requestedKey) ||
    (pageType === "genre"
      ? headerLabelMap.genre.get(requestedKey)
      : headerLabelMap.country.get(requestedKey)) ||
    requestedKey.replace(/-/g, " ");

  const filtered = React.useMemo(() => {
    if (pageType === "genre") {
      return allMovies.filter((m) => {
        if (!m.genres || !Array.isArray(m.genres)) return false;
        return m.genres.some((g) => slugify(g) === requestedKey);
      });
    }
    return allMovies.filter((m) => slugify(m.country || "") === requestedKey);
  }, [allMovies, requestedKey, pageType]);

  const {
    page,
    totalPages,
    paginatedData: paginatedMovies,
    handlePrev,
    handleNext,
  } = usePagination(filtered, 24);

  const emptyText =
    pageType === "genre"
      ? "Không tìm thấy phim cho thể loại này."
      : "Không tìm thấy phim cho quốc gia này.";

  if (loading) {
    return <BarSpinner />;
  }

  return (
    <div className="bg-bgColor">
      <main className="w-full mx-auto px-4 py-20">
        <h1 className="text-fluid-2xl leading-fluid-tight font-bold text-white mb-6 pl-4">
          Phim {displayLabel}
        </h1>

        {filtered.length === 0 ? (
          <p className="text-gray-300">{emptyText}</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {paginatedMovies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  hoverVisibleAt="md"
                  hoverCardClass="w-[300px] max-h-[360px] overflow-hidden"
                  compact
                />
              ))}
            </div>
            {totalPages > 1 && (
              <Pagination
                page={page}
                totalPages={totalPages}
                onPrev={handlePrev}
                onNext={handleNext}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default FilteredMovies;
