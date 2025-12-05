import React, { useEffect, useState } from "react";
import OptimizedImage from "components/common/OptimizedImage";
import movieService from "services/movie.service";
import { BarSpinner } from "components/common/LoadingState";

const CastSection = ({ movie, layout = "default", title = true }) => {
  const [cast, setCast] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCast = async () => {
      if (!movie?.id) return;
      setLoading(true);
      setError(null);
      try {
        const res = await movieService.getCast(movie.id);
        const data = res?.data || res || [];
        setCast(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching cast:", err);
        setError(err.message || "Không thể tải danh sách diễn viên.");
        setCast([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCast();
  }, [movie?.id]);

  // Filter: chỉ lấy diễn viên có avatar
  const castWithAvatar = Array.isArray(cast)
    ? cast.filter((actor) => actor?.avatar && actor.avatar.trim() !== "")
    : [];

  const hasCastWithAvatar = castWithAvatar.length > 0;

  // Grid classes for different layouts
  const gridClass =
    layout === "vertical"
      ? "grid-cols-3"
      : layout === "detail"
      ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
      : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7";

  // Empty state component - hiển thị khi không có diễn viên có avatar
  const EmptyCastState = () => (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="relative mb-4">
        <div className="absolute -inset-4 bg-gradient-to-tr from-primaryColor/20 via-pink-500/10 to-cyan-400/10 rounded-full blur-xl opacity-80" />
        <div className="relative w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg">
          <i className="fa-solid fa-users text-3xl text-primaryColor" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">
        Thông tin diễn viên đang được cập nhật
      </h3>
      <p className="text-sm text-gray-400 text-center max-w-md">
        Chúng mình đang cập nhật thông tin và ảnh của diễn viên. Vui lòng quay lại sau nhé!
      </p>
    </div>
  );

  // Detail layout - card style with character name
  if (layout === "detail") {
    return (
      <div className="py-4">
        {title && <h3 className="text-xl font-bold mb-5 text-gray-100">Diễn viên</h3>}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <BarSpinner />
          </div>
        )}
        {!loading && error && <div className="text-red-400 text-sm text-center py-4">{error}</div>}
        {!loading && !error && !hasCastWithAvatar && <EmptyCastState />}

        {!loading && !error && hasCastWithAvatar && (
          <div className={`grid ${gridClass} gap-4`}>
            {castWithAvatar.map((actor, index) => (
              <div
                key={actor.id || index}
                className="bg-bgColor rounded-xl overflow-hidden transition-colors cursor-pointer"
              >
                {/* Actor Image */}
                <div className="aspect-[3/4] overflow-hidden bg-bgColor relative group">
                  <OptimizedImage
                    src={actor.avatar}
                    alt={actor.name || "Diễn viên"}
                    className="w-full h-full object-cover group-hover:opacity-80 transition-transform duration-300"
                    lazy={true}
                  />
                  <div className="absolute inset-0 z-0 bg-gradient-to-t from-bgColor via-bgColor/10 to-transparent" />
                </div>

                {/* Actor Info */}
                <div className="p-2 pt-1 text-center">
                  <div className="font-medium text-white text-sm mb-1 truncate">
                    {actor.name || "Không rõ"}
                  </div>
                  {actor.character && (
                    <div className="text-xs text-gray-400 truncate">{actor.character}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Default/Vertical layout - circular avatars
  return (
    <div>
      {title && <h3 className="text-xl font-bold mb-5 text-gray-100">Diễn viên:</h3>}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <BarSpinner />
        </div>
      )}
      {!loading && error && <div className="text-red-400 text-sm text-center py-4">{error}</div>}
      {!loading && !error && !hasCastWithAvatar && <EmptyCastState />}

      {!loading && !error && hasCastWithAvatar && (
        <div className={`grid ${gridClass} gap-6`}>
          {castWithAvatar.map((actor, index) => (
            <div key={actor.id || index} className="text-center">
              <div className="mx-auto mb-2 h-20 w-20 overflow-hidden rounded-full ring-1 ring-white/10 bg-bgColor2">
                <OptimizedImage
                  src={actor.avatar}
                  alt={actor.name || "Diễn viên"}
                  className="h-full w-full object-cover"
                  lazy={true}
                />
              </div>
              <div className="text-sm font-semibold text-gray-200">{actor.name || "Không rõ"}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CastSection;
