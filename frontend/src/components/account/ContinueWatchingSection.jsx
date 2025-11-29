import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import userService from "services/user.service";
import { InlineSpinner } from "components/common/LoadingState";
import {
  CONTINUE_WATCHING_MOCK,
  ENABLE_CONTINUE_WATCHING_MOCK,
} from "constants/continueWatchingMock";

const ContinueWatchingSection = ({ user }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const shouldUseMock = !!user && ENABLE_CONTINUE_WATCHING_MOCK;

    if (shouldUseMock) {
      setItems(CONTINUE_WATCHING_MOCK);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        let response;
        try {
          response = await userService.getContinueWatching({ limit: 30 });
        } catch (apiError) {
          console.warn("Continue watching endpoint unavailable, fallback to history");
          response = await userService.getHistory({ limit: 60 });
        }

        const historyData = response?.data || [];
        const continueWatching = historyData.filter(
          (item) => item.progress && item.progress > 0 && item.progress < 100
        );

        setItems(continueWatching);
      } catch (fetchError) {
        console.error("Error loading continue watching data:", fetchError);
        setError("Không thể tải dữ liệu xem tiếp. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleWatch = (item) => {
    const movieId = item.movieId || item.id;
    if (!movieId) return;

    const episode = item.lastWatchedEpisode || 1;
    navigate(`/watch/${movieId}?ep=${episode}`);
  };

  if (loading) {
    return (
      <div className="bg-account-bg-secondary rounded-2xl p-6 shadow-sm">
        <InlineSpinner />
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
    <div className="bg-account-bg-secondary rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-account-text-secondary">{items.length} phim đang xem</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map((item) => {
          const title = item.title || item.movie?.title;
          const engTitle = item.englishTitle || item.movie?.englishTitle;
          const duration = item.durationMinutes || item.movie?.durationMinutes || 69;
          const progressPercent = Math.min(Math.max(item.progress || 0, 0), 100);
          const progressMinutes = Math.round((progressPercent / 100) * duration);

          return (
            <div
              key={`${item.movieId || item.id}-${item.lastWatchedEpisode || 0}`}
              className="bg-bgColor4 rounded-2xl p-4 shadow-lg border border-white/5 cursor-pointer hover:opacity-80 transition-all duration-300"
              onClick={() => handleWatch(item)}
            >
              <div className="relative rounded-2xl overflow-hidden">
                <img
                  src={item.poster || item.movie?.poster}
                  alt={title}
                  className="w-full aspect-[2/3] object-cover"
                  loading="lazy"
                />
                <div className="absolute top-3 right-3 bg-black/60 text-white text-[10px] px-2 py-1 rounded-full">
                  <i className="fa-solid fa-xmark" />
                </div>
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
    </div>
  );
};

export default ContinueWatchingSection;
