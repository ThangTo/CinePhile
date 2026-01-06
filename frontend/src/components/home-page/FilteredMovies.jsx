import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import MovieCard from "components/home-page/MovieCard";
import Pagination from "components/common/Pagination";
import MovieFilter from "components/common/MovieFilter";
import movieService from "services/movie.service";
import { buildSlugMap, slugify } from "utils/slugify";
import { GENRE_CATEGORIES, COUNTRY_CATEGORIES } from "components/header/constants";
import { BarSpinner } from "components/common/LoadingState";
import useFilterOptions from "hooks/useFilterOptions";
import EmptyState from "components/common/EmptyState";
import ErrorState from "components/common/ErrorState";
import { groupSeriesMovies } from "utils/seriesGrouping";
import LazySection from "components/common/LazySection";
import { preloadImages } from "utils/imagePreloader";
import imageCache from "utils/imageCache";
import apiCache from "utils/apiCache";
import { getOptimizedImageUrl } from "constants/imageSizes";

const PAGE_SIZE = 32;
const TYPE_FILTERS = {
  "phim-le": { api: "single", label: "Phim lẻ" },
  "phim-bo": { api: "series", label: "Phim bộ" },
  anime: { api: "hoathinh", label: "Anime" },
  tvshows: { api: "tvshows", label: "TV Shows" },
  // single: { api: "single", label: "Phim lẻ" },
  // series: { api: "series", label: "Phim bộ" },
  // hoathinh: { api: "hoathinh", label: "Anime" },
};

const FilteredMovies = ({ pageType = "genre" }) => {
  const { slug } = useParams();
  const raw = decodeURIComponent(slug || "");
  const requestedKey = slugify(raw);
  const { options: filterOptions } = useFilterOptions();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({});
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [error, setError] = useState(null);

  useEffect(() => {
    setPage(1);
    setFilters({}); // Reset filters when route changes
  }, [requestedKey]);

  useEffect(() => {
    const fetchFilteredMovies = async () => {
      if (!requestedKey) return;
      setLoading(true);
      setError(null);
      try {
        // Build params with filters
        const params = {
          page,
          limit: PAGE_SIZE,
          ...(filters.genres?.length && { genres: filters.genres.join(",") }),
          ...(filters.countries?.length && { countries: filters.countries.join(",") }),
          ...(filters.year && { year: filters.year }),
          ...(filters.yearFrom && { yearFrom: filters.yearFrom }),
          ...(filters.yearTo && { yearTo: filters.yearTo }),
          ...(filters.quality && { quality: filters.quality }),
          ...(filters.type && { type: filters.type }),
          ...(filters.subType && { subType: filters.subType }),
          ...(filters.ageRating && { ageRating: filters.ageRating }),
          ...(filters.status && { status: filters.status }),
          ...(filters.ratingMin && { ratingMin: filters.ratingMin }),
          ...(filters.ratingMax && { ratingMax: filters.ratingMax }),
          ...(filters.sort && { sort: filters.sort }),
          ...(filters.lang && { lang: filters.lang }),
        };
        let endpoint;
        let key = requestedKey;
        let effectiveKey = requestedKey;

        // Determine endpoint and key
        if (pageType === "genre") {
          endpoint = "getByGenre";
          key = requestedKey;
        } else if (pageType === "country") {
          endpoint = "getByCountry";
          key = requestedKey;
        } else if (pageType === "type") {
          const typeMeta = TYPE_FILTERS[requestedKey];
          if (!typeMeta) {
            throw new Error("Loại phim không hợp lệ");
          }
          endpoint = "getByType";
          effectiveKey = typeMeta.api;
          key = effectiveKey;
        } else {
          endpoint = "getAll";
          key = `${pageType}:${requestedKey}`;
        }

        // Generate cache key
        const cacheKey = apiCache.generateKey(endpoint, key, params);

        // Check cache first
        let response = apiCache.get(cacheKey);
        if (response) {
          // Use cached data
          let moviesData = response?.data || [];
          const paginationData = response?.pagination ||
            response?.data?.pagination || {
              page,
              totalPages: 1,
              total: moviesData.length,
              limit: PAGE_SIZE,
            };

          moviesData = groupSeriesMovies(moviesData);

          setMovies(moviesData);
          setPagination({
            page: paginationData.page || page,
            totalPages: paginationData.totalPages || 1,
            total: paginationData.total || moviesData.length,
          });
          setLoading(false);
          return;
        }

        // Check if request is pending
        const pendingRequest = apiCache.getPending(cacheKey);
        if (pendingRequest) {
          // Wait for pending request
          response = await pendingRequest;
        } else {
          // Make new request
          let requestPromise;
          if (pageType === "genre") {
            requestPromise = movieService.getByGenre(requestedKey, params);
          } else if (pageType === "country") {
            requestPromise = movieService.getByCountry(requestedKey, params);
          } else if (pageType === "type") {
            requestPromise = movieService.getByType(effectiveKey, params);
          } else {
            requestPromise = movieService.getAll({ ...params, [pageType]: requestedKey });
          }

          // Store pending request
          apiCache.setPending(cacheKey, requestPromise);
          response = await requestPromise;

          // Cache the response
          apiCache.set(cacheKey, response);
        }

        let moviesData = response?.data || [];
        const paginationData = response?.pagination ||
          response?.data?.pagination || {
            page,
            totalPages: 1,
            total: moviesData.length,
            limit: PAGE_SIZE,
          };

        // Group multi-part series into single card with parts metadata
        moviesData = groupSeriesMovies(moviesData);

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
  }, [requestedKey, pageType, page, filters]);

  // Preload images for next page after current page is loaded
  useEffect(() => {
    if (
      loading ||
      !movies.length ||
      !pagination.totalPages ||
      pagination.page >= pagination.totalPages
    ) {
      return;
    }

    const preloadNextPage = async () => {
      try {
        const nextPage = pagination.page + 1;
        const params = { page: nextPage, limit: PAGE_SIZE };
        let endpoint;
        let key = requestedKey;
        let effectiveKey = requestedKey;

        // Determine endpoint and key
        if (pageType === "genre") {
          endpoint = "getByGenre";
          key = requestedKey;
        } else if (pageType === "country") {
          endpoint = "getByCountry";
          key = requestedKey;
        } else if (pageType === "type") {
          const typeMeta = TYPE_FILTERS[requestedKey];
          if (!typeMeta) return;
          endpoint = "getByType";
          effectiveKey = typeMeta.api;
          key = effectiveKey;
        } else {
          endpoint = "getAll";
          key = `${pageType}:${requestedKey}`;
        }

        // Generate cache key
        const cacheKey = apiCache.generateKey(endpoint, key, params);

        // Check cache first
        let response = apiCache.get(cacheKey);
        if (response) {
          // Use cached data
          const nextPageMovies = response?.data || [];
          if (nextPageMovies.length === 0) return;

          // Generate optimized poster URLs for next page movies using standardized size
          // Use THUMBNAIL size to match MovieCard compact mode
          const posterUrls = nextPageMovies
            .map((movie) => {
              if (!movie.poster) return null;
              return getOptimizedImageUrl(movie.poster, "THUMBNAIL");
            })
            .filter((url) => url && !imageCache.isCached(url));

          if (posterUrls.length > 0) {
            await preloadImages(posterUrls, { batchSize: 5 });
          }
          return;
        }

        // Check if request is pending
        const pendingRequest = apiCache.getPending(cacheKey);
        if (pendingRequest) {
          // Wait for pending request
          response = await pendingRequest;
        } else {
          // Make new request
          let requestPromise;
          if (pageType === "genre") {
            requestPromise = movieService.getByGenre(requestedKey, params);
          } else if (pageType === "country") {
            requestPromise = movieService.getByCountry(requestedKey, params);
          } else if (pageType === "type") {
            requestPromise = movieService.getByType(effectiveKey, params);
          } else {
            requestPromise = movieService.getAll({ ...params, [pageType]: requestedKey });
          }

          // Store pending request
          apiCache.setPending(cacheKey, requestPromise);
          response = await requestPromise;

          // Cache the response
          apiCache.set(cacheKey, response);
        }

        const nextPageMovies = response?.data || [];
        if (nextPageMovies.length === 0) return;

        // Generate optimized poster URLs for next page movies using standardized size
        // Use THUMBNAIL size to match MovieCard compact mode
        const posterUrls = nextPageMovies
          .map((movie) => {
            if (!movie.poster) return null;
            return getOptimizedImageUrl(movie.poster, "THUMBNAIL");
          })
          .filter((url) => url && !imageCache.isCached(url)); // Only preload if not cached

        if (posterUrls.length > 0) {
          // Preload in batches to avoid overwhelming the browser
          // Images will be automatically marked in cache by preloadImage
          await preloadImages(posterUrls, { batchSize: 5 });
        }
      } catch (err) {
        // Silently fail - preloading is optional
        console.debug("Failed to preload next page images:", err);
      }
    };

    // Wait a bit before preloading to ensure current page images are prioritized
    const timeoutId = setTimeout(() => {
      preloadNextPage();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [loading, movies, pagination, requestedKey, pageType]);

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

  const handlePageChange = (newPage) => {
    setPage(newPage);
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
          {(() => {
            if (pageType === "type") {
              // Check filter type to determine title
              if (filters.type === "series") return "Tổng hợp phim bộ";
              if (filters.type === "single") return "Tổng hợp phim lẻ";
              if (filters.type === "hoathinh") return "Tổng hợp Anime";
              if (filters.type === "tvshows") return "Tổng hợp TV Shows";
              return `Tổng hợp ${displayLabel}`;
            }
            return `Phim ${displayLabel}`;
          })()}
        </h1>

        {/* Movie Filter */}
        <div className="mb-6">
          <MovieFilter
            filters={filters}
            onFilterChange={(newFilters) => {
              setFilters(newFilters);
              setPage(1); // Reset to page 1 when filters change
            }}
            options={{
              showAdvanced: true,
              compact: false,
              pageType,
              slug: requestedKey,
              navigateOnApply: true,
            }}
          />
        </div>

        {error ? (
          <ErrorState message={error} />
        ) : movies.length === 0 ? (
          <EmptyState title={emptyText} iconClassName="fa-film" />
        ) : (
          <LazySection rootMargin="100px" minHeight="400px">
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                {movies.map((movie) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    hoverVisibleAt="md"
                    hoverCardClass="w-[400px] max-h-[400px] overflow-hidden"
                    compact
                  />
                ))}
              </div>
              {pagination.totalPages > 1 && (
                <Pagination
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          </LazySection>
        )}
      </main>
    </div>
  );
};

export default FilteredMovies;
