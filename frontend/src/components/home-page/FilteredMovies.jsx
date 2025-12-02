import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import MovieCard from "components/home-page/MovieCard";
import Pagination from "components/common/Pagination";
import movieService from "services/movie.service";
import { buildSlugMap, slugify } from "utils/slugify";
import { GENRE_CATEGORIES, COUNTRY_CATEGORIES } from "components/header/constants";
import { BarSpinner } from "components/common/LoadingState";
import useFilterOptions from "hooks/useFilterOptions";
import EmptyState from "components/common/EmptyState";
import ErrorState from "components/common/ErrorState";

const PAGE_SIZE = 32;
const TYPE_FILTERS = {
  "phim-le": { api: "single", label: "Phim lẻ" },
  "phim-bo": { api: "series", label: "Phim bộ" },
  single: { api: "single", label: "Phim lẻ" },
  series: { api: "series", label: "Phim bộ" },
};

const FilteredMovies = ({ pageType = "genre" }) => {
  const { slug } = useParams();
  const raw = decodeURIComponent(slug || "");
  const requestedKey = slugify(raw);
  const { options: filterOptions } = useFilterOptions();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [error, setError] = useState(null);

  useEffect(() => {
    setPage(1);
  }, [requestedKey]);

  useEffect(() => {
    const fetchFilteredMovies = async () => {
      if (!requestedKey) return;
      setLoading(true);
      setError(null);
      try {
        const params = { page, limit: PAGE_SIZE };
        let response;
        let effectiveKey = requestedKey;

        if (pageType === "genre") {
          response = await movieService.getByGenre(requestedKey, params);
        } else {
          if (pageType === "country") {
            response = await movieService.getByCountry(requestedKey, params);
          } else if (pageType === "type") {
            const typeMeta = TYPE_FILTERS[requestedKey];
            if (!typeMeta) {
              throw new Error("Loại phim không hợp lệ");
            }
            effectiveKey = typeMeta.api;
            response = await movieService.getByType(effectiveKey, params);
          } else {
            response = await movieService.getAll({ ...params, [pageType]: requestedKey });
          }
        }

        const moviesData = response?.data || [];
        const paginationData = response?.pagination ||
          response?.data?.pagination || {
            page,
            totalPages: 1,
            total: moviesData.length,
            limit: PAGE_SIZE,
          };

        setMovies(moviesData);
        setPagination({
          page: paginationData.page || page,
          totalPages: paginationData.totalPages || 1,
          total: paginationData.total || moviesData.length,
        });
      } catch (err) {
        console.error("Error fetching filtered movies:", err);
        setError("Không thể tải danh sách phim. Vui lòng thử lại sau.");
        setMovies([]);
        setPagination({ page: 1, totalPages: 1, total: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchFilteredMovies();
  }, [requestedKey, pageType, page]);

  const headerLabelMap = React.useMemo(() => {
    return {
      genre: buildSlugMap(GENRE_CATEGORIES),
      country: buildSlugMap(COUNTRY_CATEGORIES),
    };
  }, []);

  const cachedLabelMap = useMemo(() => {
    if (pageType === "genre") {
      const entries = filterOptions.genres;
      return new Map(
        entries.map((item) => [item.slug || slugify(item.name || ""), item.name || item.slug])
      );
    }
    if (pageType === "country") {
      const entries = filterOptions.countries;
      return new Map(
        entries.map((item) => [item.slug || slugify(item.name || ""), item.name || item.slug])
      );
    }
    if (pageType === "type") {
      return new Map(Object.entries(TYPE_FILTERS).map(([slugKey, meta]) => [slugKey, meta.label]));
    }
    return new Map();
  }, [filterOptions, pageType]);

  const displayLabel =
    cachedLabelMap.get(requestedKey) ||
    (pageType === "genre"
      ? headerLabelMap.genre.get(requestedKey)
      : pageType === "country"
      ? headerLabelMap.country.get(requestedKey)
      : TYPE_FILTERS[requestedKey]?.label) ||
    requestedKey.replace(/-/g, " ");

  const handlePrev = () => {
    setPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNext = () => {
    setPage((prev) => Math.min(prev + 1, pagination.totalPages || prev + 1));
  };

  const emptyText =
    pageType === "genre"
      ? "Không tìm thấy phim cho thể loại này."
      : pageType === "country"
      ? "Không tìm thấy phim cho quốc gia này."
      : "Không tìm thấy phim cho loại này.";

  if (loading) {
    return (
      <div className="min-h-screen bg-bgColor text-white flex items-center justify-center">
        <BarSpinner />
      </div>
    );
  }

  return (
    <div className="bg-bgColor">
      <main className="w-full mx-auto px-4 py-20">
        <h1 className="text-fluid-2xl leading-fluid-tight font-bold text-white mb-6 pl-4">
          {pageType === "type" ? `Tổng hợp ${displayLabel}` : `Phim ${displayLabel}`}
        </h1>

        {error ? (
          <ErrorState message={error} />
        ) : movies.length === 0 ? (
          <EmptyState title={emptyText} iconClassName="fa-film" />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {movies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  hoverVisibleAt="md"
                  hoverCardClass="w-[300px] max-h-[360px] overflow-hidden"
                  compact
                />
              ))}
            </div>
            {pagination.totalPages > 1 && (
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
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
