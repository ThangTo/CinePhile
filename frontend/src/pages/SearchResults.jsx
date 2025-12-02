import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import MovieCard from "components/home-page/MovieCard";
import Pagination from "components/common/Pagination";
import { BarSpinner } from "components/common/LoadingState";
import EmptyState from "components/common/EmptyState";
import ErrorState from "components/common/ErrorState";
import movieService from "services/movie.service";
import { groupSeriesMovies } from "utils/seriesGrouping";

const PAGE_SIZE = 24;

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const query = (searchParams.get("q") || "").trim();

  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    setPage(1);
  }, [query]);

  useEffect(() => {
    const fetchResults = async () => {
      if (!query) {
        setMovies([]);
        setPagination({ page: 1, totalPages: 1, total: 0 });
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const params = { page, limit: PAGE_SIZE };
        const response = await movieService.search(query, params);
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
        console.error("Error fetching search results:", err);
        setError("Không thể tải kết quả tìm kiếm. Vui lòng thử lại sau.");
        setMovies([]);
        setPagination({ page: 1, totalPages: 1, total: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query, page]);

  const handlePrev = () => {
    setPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNext = () => {
    setPage((prev) => Math.min(prev + 1, pagination.totalPages || prev + 1));
  };

  if (!query) {
    return (
      <div className="min-h-screen bg-bgColor text-white flex items-center justify-center">
        <p className="text-gray-300 text-sm md:text-base">
          Vui lòng nhập từ khóa tìm kiếm ở thanh tìm kiếm phía trên.
        </p>
      </div>
    );
  }

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
          Toàn bộ kết quả cho từ khóa <span className="text-primaryColor">&quot;{query}&quot;</span>
        </h1>

        {error ? (
          <ErrorState message={error} />
        ) : movies.length === 0 ? (
          <EmptyState
            title="Không tìm thấy kết quả phù hợp"
            message={`Chúng mình không tìm thấy phim nào khớp với từ khóa "${query}". Hãy thử dùng từ khóa khác ngắn gọn hơn, hoặc kiểm tra lại chính tả nhé.`}
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

export default SearchResults;
