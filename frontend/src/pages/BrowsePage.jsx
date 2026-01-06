import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import MovieCard from "components/home-page/MovieCard";
import Pagination from "components/common/Pagination";
import MovieFilter from "components/common/MovieFilter";
import { BarSpinner } from "components/common/LoadingState";
import EmptyState from "components/common/EmptyState";
import ErrorState from "components/common/ErrorState";
import movieService from "services/movie.service";
import { groupSeriesMovies } from "utils/seriesGrouping";
import { FiFilter } from "react-icons/fi";

const PAGE_SIZE = 32;

const BrowsePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse filters and search query from URL params
  const parseFiltersFromURL = () => {
    const filters = {};
    const genres = searchParams.get("genres");
    const countries = searchParams.get("countries");
    const year = searchParams.get("year");
    const yearFrom = searchParams.get("yearFrom");
    const yearTo = searchParams.get("yearTo");
    const quality = searchParams.get("quality");
    const type = searchParams.get("type");
    const ageRating = searchParams.get("ageRating");
    const status = searchParams.get("status");
    const ratingMin = searchParams.get("ratingMin");
    const ratingMax = searchParams.get("ratingMax");
    const sort = searchParams.get("sort");
    const lang = searchParams.get("lang");

    if (genres) filters.genres = genres.split(",").filter(Boolean);
    if (countries) filters.countries = countries.split(",").filter(Boolean);
    if (year) filters.year = year;
    if (yearFrom) filters.yearFrom = yearFrom;
    if (yearTo) filters.yearTo = yearTo;
    if (quality) filters.quality = quality;
    if (type) filters.type = type;
    if (ageRating) filters.ageRating = ageRating;
    if (status) filters.status = status;
    if (ratingMin) filters.ratingMin = ratingMin;
    if (ratingMax) filters.ratingMax = ratingMax;
    if (sort) filters.sort = sort;
    if (lang) filters.lang = lang;

    return filters;
  };

  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(parseInt(searchParams.get("page")) || 1);
  const [filters, setFilters] = useState(parseFiltersFromURL);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [error, setError] = useState(null);

  // Update filters and search query when URL params change
  useEffect(() => {
    const newFilters = parseFiltersFromURL();
    const newSearchQuery = searchParams.get("q") || "";
    setFilters(newFilters);
    setSearchQuery(newSearchQuery);
    setPage(parseInt(searchParams.get("page")) || 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    const fetchMovies = async () => {
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
          ...(filters.ageRating && { ageRating: filters.ageRating }),
          ...(filters.status && { status: filters.status }),
          ...(filters.ratingMin && { ratingMin: filters.ratingMin }),
          ...(filters.ratingMax && { ratingMax: filters.ratingMax }),
          ...(filters.sort && { sort: filters.sort }),
          ...(filters.lang && { lang: filters.lang }),
        };

        // If there's a search query, use search API; otherwise use getAll
        const response = searchQuery
          ? await movieService.search(searchQuery, params)
          : await movieService.getAll(params);

        let moviesData = response?.data || [];
        const paginationData = response?.pagination || {
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
      } catch (err) {
        setError("Không thể tải danh sách phim. Vui lòng thử lại sau.");
        setMovies([]);
        setPagination({ page: 1, totalPages: 1, total: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, [page, filters, searchQuery]);

  const handlePageChange = (newPage) => {
    setPage(newPage);
    // Update URL with new page
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", newPage.toString());
    setSearchParams(newParams);
  };

  const handleFilterChange = (newFilters) => {
    // Update URL with new filters
    const newParams = new URLSearchParams();

    // Preserve search query if exists
    if (searchQuery) {
      newParams.set("q", searchQuery);
    }

    if (newFilters.genres?.length) newParams.set("genres", newFilters.genres.join(","));
    if (newFilters.countries?.length) newParams.set("countries", newFilters.countries.join(","));
    if (newFilters.year) newParams.set("year", newFilters.year);
    if (newFilters.yearFrom) newParams.set("yearFrom", newFilters.yearFrom);
    if (newFilters.yearTo) newParams.set("yearTo", newFilters.yearTo);
    if (newFilters.quality) newParams.set("quality", newFilters.quality);
    if (newFilters.type) newParams.set("type", newFilters.type);
    if (newFilters.ageRating) newParams.set("ageRating", newFilters.ageRating);
    if (newFilters.status) newParams.set("status", newFilters.status);
    if (newFilters.ratingMin) newParams.set("ratingMin", newFilters.ratingMin);
    if (newFilters.ratingMax) newParams.set("ratingMax", newFilters.ratingMax);
    if (newFilters.sort) newParams.set("sort", newFilters.sort);
    if (newFilters.lang) newParams.set("lang", newFilters.lang);

    // Reset to page 1 when filters change
    newParams.set("page", "1");

    setSearchParams(newParams);
    setPage(1);
  };

  if (loading && movies.length === 0) {
    return (
      <div className="min-h-screen bg-bgColor text-white flex items-center justify-center">
        <BarSpinner />
      </div>
    );
  }

  return (
    <div className="bg-bgColor">
      <main className="w-full mx-auto px-4 py-20">
        <h1 className="text-fluid-2xl leading-fluid-tight font-bold text-white mb-6 pl-4 flex items-center gap-3">
          <FiFilter className="text-primaryColor" size={28} />
          Duyệt tìm
        </h1>

        {/* Movie Filter */}
        <div className="mb-6">
          <MovieFilter
            filters={filters}
            onFilterChange={handleFilterChange}
            options={{ compact: false, navigateOnApply: false, searchQuery }}
          />
        </div>

        {error ? (
          <ErrorState message={error} />
        ) : movies.length === 0 ? (
          <EmptyState
            className="min-h-[500px]"
            title="Không tìm thấy kết quả phù hợp"
            message="Chúng mình không tìm thấy phim nào khớp với bộ lọc của bạn. Hãy thử điều chỉnh lại các tiêu chí lọc nhé."
            iconClassName="fa-film"
          />
        ) : (
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
        )}
      </main>
    </div>
  );
};

export default BrowsePage;
