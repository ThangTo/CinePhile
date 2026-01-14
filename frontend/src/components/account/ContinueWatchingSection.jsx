import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import userService from "services/user.service";
import { BarSpinner } from "components/common/LoadingState";
import PaginationV2 from "components/common/PaginationV2";
import OptimizedImage from "components/common/OptimizedImage";

const ContinueWatchingSection = ({ user }) => {
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

      const response = await userService.getContinueWatching({
        limit: pagination.limit,
        page,
      });
      const historyData = response?.data || [];
      const pag = response?.pagination || {};

      // Format data để hiển thị
      const formattedData = historyData.map((item) => {
        const movie = item.movieId || {};
        const episode = item.episodeId || {};

        const episodeNumber = episode.episodeId || episode.episode || 1;
        const audioType = episode.audioType || null;

        return {
          id: item._id || item.id,
          movieId: movie._id || movie.id || item.movieId,
          title: movie.name || movie.title,
          englishTitle: movie.englishTitle,
          poster: movie.poster_url || movie.poster || movie.thumb_url,
          progress: item.progress || 0,
          watchTime: item.watchTime || 0,
          duration: item.duration || 0,
          durationMinutes: movie.durationMinutes || Math.floor((item.duration || 0) / 60),
          lastWatchedEpisode: episodeNumber,
          lastWatchedAudioType: audioType,
          lastWatchedAt: item.lastWatchedAt,
          movie: movie,
          episode: episode,
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
      console.error("Error loading continue watching data:", fetchError);
      setError("Không thể tải dữ liệu xem tiếp. Vui lòng thử lại sau.");
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

    const episode = item.lastWatchedEpisode || 1;
    const audioType = item.lastWatchedAudioType;
    const audioQuery = audioType ? `&audio=${encodeURIComponent(audioType)}` : "";
    const watchTime = item.watchTime || null;

    // Navigate với resumeTime trong location.state
    navigate(`/watch/${movieId}?ep=${episode}${audioQuery}`, {
      state: { resumeTime: watchTime },
    });
  };

  const handleDeleteProgress = async (e, movie) => {
    e.stopPropagation(); // Ngăn chặn click event bubble lên parent div

    const targetMovieId = movie.movieId || movie.id;
    if (!targetMovieId) {
      return;
    }

    try {
      await userService.deleteProgress(targetMovieId);

      // Remove item from local state
      setItems((prev) => prev.filter((item) => (item.movieId || item.id) !== targetMovieId));
    } catch (error) {
      console.error("Error deleting progress:", error);
      setError("Không thể xóa phim khỏi danh sách xem tiếp. Vui lòng thử lại sau.");
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
          <i className="fa-solid fa-play-circle" />
        </div>
        <h2 className="text-2xl font-semibold mb-2 text-account-text-primary">Chưa có phim nào</h2>
        <p className="text-account-text-secondary mb-6">
          Bắt đầu xem để xuất hiện danh sách tại đây
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
    <div className="bg-account-bg-secondary rounded-2xl p-3 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-account-text-secondary">
            {pagination.total || items.length} phim đang xem
          </p>
        </div>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex justify-center mb-6 sm:hidden">
          <PaginationV2
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
            isMobile={true}
          />
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-4">
        {items.map((item) => {
          const title = item.title || item.movie?.name || item.movie?.title || "Không có tiêu đề";
          const engTitle = item.englishTitle || item.movie?.englishTitle;
          const duration = item.durationMinutes || Math.floor((item.duration || 0) / 60) || 0;
          const progressPercent = Math.min(Math.max(item.progress || 0, 0), 100);
          const progressMinutes = Math.round((progressPercent / 100) * duration);
          const poster = item.poster || item.movie?.poster_url || item.movie?.thumb_url || "";

          return (
            <div
              key={`${item.movieId || item.id}-${item.lastWatchedEpisode || 0}`}
              className="bg-bgColor3 rounded-2xl p-4 shadow-lg border border-white/5 cursor-pointer hover:opacity-80 transition-all duration-300"
              onClick={() => handleWatch(item)}
            >
              <div className="relative rounded-2xl overflow-hidden">
                {poster ? (
                  <OptimizedImage
                    src={poster}
                    alt={title}
                    className="w-full aspect-[2/3] object-cover"
                    sizeKey="CARD_DETAIL"
                  />
                ) : (
                  <div className="w-full aspect-[2/3] bg-gray-800 flex items-center justify-center">
                    <i className="fa-solid fa-image text-gray-600 text-4xl" />
                  </div>
                )}
                <button
                  onClick={(e) => handleDeleteProgress(e, item)}
                  className="absolute top-3 right-3 bg-black/60 hover:bg-red-600 text-white text-[10px] px-2 py-1 rounded-full transition-colors z-10"
                  aria-label="Xóa khỏi danh sách xem tiếp"
                  title="Xóa khỏi danh sách xem tiếp"
                >
                  <i className="fa-solid fa-xmark" />
                </button>
                <div className="absolute bottom-0 left-6 right-6 h-1.5 bg-white/15 rounded-full">
                  <div
                    className="h-full bg-primaryColor rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 text-center">
                <p className="text-[11px] text-account-text-secondary mb-1">
                  Tập {item.lastWatchedEpisode || 1} · {progressMinutes}m / {duration}m
                </p>
                <h3 className="text-white font-semibold">{title}</h3>
                {engTitle && <p className="text-account-text-secondary text-sm">{engTitle}</p>}
              </div>
            </div>
          );
        })}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <PaginationV2
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
};

export default ContinueWatchingSection;
