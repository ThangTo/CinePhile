import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import userService from "services/user.service";
import { BarSpinner } from "components/common/LoadingState";
import Pagination from "components/common/Pagination";

const WatchlistSection = ({ user }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 8,
    totalPages: 1,
    total: 0,
  });

  const fetchData = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const response = await userService.getWatchlist({
        limit: pagination.limit,
        page,
      });
      const watchlistData = response?.data || [];
      const pag = response?.pagination || {};

      // Format data để hiển thị
      const formattedData = watchlistData.map((item) => {
        const movie = item.movieId || item.movie || {};

        return {
          id: item._id || item.id,
          movieId: movie._id || movie.id || item.movieId,
          title: movie.name || movie.title,
          englishTitle: movie.englishTitle || movie.original_name,
          poster: movie.poster_url || movie.poster || movie.thumb_url,
          rating: movie.rating || 0,
          year: movie.year || movie.releaseYear,
          addedAt: item.addedAt || item.createdAt,
          movie: movie,
        };
      });

      setItems(formattedData);
      setPagination((prev) => ({
        ...prev,
        page: pag.page || page,
        totalPages: pag.totalPages || prev.totalPages,
        total: pag.total || prev.total,
      }));
    } catch (fetchError) {
      console.error("Error loading watchlist data:", fetchError);
      setError("Không thể tải danh sách phim. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    fetchData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handlePageChange = (newPage) => {
    fetchData(newPage);
  };

  const handleWatch = (item) => {
    const movieId = item.movieId || item.id;
    if (!movieId) return;

    navigate(`/watch/${movieId}`);
  };

  const handleRemoveFromWatchlist = async (e, movie) => {
    e.stopPropagation(); // Ngăn chặn click event bubble lên parent div

    const targetMovieId = movie.movieId || movie.id;
    if (!targetMovieId) {
      return;
    }

    try {
      await userService.removeFromWatchlist(targetMovieId);

      // Remove item from local state
      setItems((prev) => prev.filter((item) => (item.movieId || item.id) !== targetMovieId));
      
      // Update pagination total
      setPagination((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
      }));
    } catch (error) {
      console.error("Error removing from watchlist:", error);
      setError("Không thể xóa phim khỏi danh sách. Vui lòng thử lại sau.");
    }
  };

  if (loading) {
    return (
      <div className="bg-account-bg-secondary rounded-2xl p-6 shadow-sm">
        <BarSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-account-bg-secondary rounded-2xl p-6 shadow-sm text-center text-account-text-secondary">
        {error}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-account-bg-secondary rounded-2xl p-6 shadow-sm text-center">
        <div className="text-5xl text-account-text-secondary mb-4">
          <i className="fa-solid fa-list" />
        </div>
        <h2 className="text-2xl font-semibold mb-2 text-account-text-primary">Danh sách trống</h2>
        <p className="text-account-text-secondary mb-6">
          Thêm phim vào danh sách để xem sau
        </p>
        <button
          className="bg-primaryColor hover:bg-hoverPrimaryColor text-primaryColorButtonText px-6 py-3 rounded-lg font-semibold transition-colors"
          onClick={() => navigate("/")}
        >
          Khám phá phim
        </button>
      </div>
    );
  }

  return (
    <div className="bg-account-bg-secondary rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-account-text-secondary">
            {pagination.total || items.length} phim trong danh sách
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map((item) => {
          const title = item.title || item.movie?.name || item.movie?.title || "Không có tiêu đề";
          const engTitle = item.englishTitle || item.movie?.englishTitle || item.movie?.original_name;
          const poster = item.poster || item.movie?.poster_url || item.movie?.thumb_url || "";
          const rating = item.rating || item.movie?.rating || 0;
          const year = item.year || item.movie?.year || item.movie?.releaseYear;

          return (
            <div
              key={item.movieId || item.id}
              className="bg-bgColor3 rounded-2xl p-4 shadow-lg border border-white/5 cursor-pointer hover:opacity-80 transition-all duration-300"
              onClick={() => handleWatch(item)}
            >
              <div className="relative rounded-2xl overflow-hidden">
                {poster ? (
                  <img
                    src={poster}
                    alt={title}
                    className="w-full aspect-[2/3] object-cover"
                    loading="lazy"
                    onError={(e) => {
                      e.target.src = "https://via.placeholder.com/300x450?text=No+Image";
                    }}
                  />
                ) : (
                  <div className="w-full aspect-[2/3] bg-gray-800 flex items-center justify-center">
                    <i className="fa-solid fa-image text-gray-600 text-4xl" />
                  </div>
                )}
                <button
                  onClick={(e) => handleRemoveFromWatchlist(e, item)}
                  className="absolute top-3 right-3 bg-black/60 hover:bg-red-600 text-white text-[10px] px-2 py-1 rounded-full transition-colors z-10"
                  aria-label="Xóa khỏi danh sách"
                  title="Xóa khỏi danh sách"
                >
                  <i className="fa-solid fa-xmark" />
                </button>
                {rating > 0 && (
                  <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <i className="fa-solid fa-star text-yellow-400" />
                    {rating.toFixed(1)}
                  </div>
                )}
              </div>

              <div className="mt-4 text-center">
                {year && (
                  <p className="text-[11px] text-account-text-secondary mb-1">{year}</p>
                )}
                <h3 className="text-white font-semibold line-clamp-2">{title}</h3>
                {engTitle && (
                  <p className="text-account-text-secondary text-sm line-clamp-1">{engTitle}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
            className="bg-bgColor3"
          />
        </div>
      )}
    </div>
  );
};

export default WatchlistSection;

