import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import OptimizedImage from "components/common/OptimizedImage";
import movieService from "services/movie.service";
import { BarSpinner } from "components/common/LoadingState";

const CastSection = ({ movie, layout = "default", title = true }) => {
  const [cast, setCast] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

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

  // Filter: ưu tiên diễn viên có avatar, fallback dùng placeholder
  const castWithAvatar = Array.isArray(cast)
    ? cast.map((actor) => {
        const hasRealAvatar = actor?.avatar && actor.avatar.trim() !== "";
        return {
          ...actor,
          avatar: hasRealAvatar ? actor.avatar : "/placeholder-actor.svg",
          hasRealAvatar,
        };
      })
    : [];

  const hasCast = castWithAvatar.length > 0;

  // Số lượng cast hiển thị khi collapsed (chỉ trên mobile)
  const MOBILE_COLLAPSED_COUNT = 6;
  // Chỉ áp dụng collapse trên mobile (layout vertical và có nhiều hơn MOBILE_COLLAPSED_COUNT cast)
  // Trên desktop (lg breakpoint), luôn hiển thị đầy đủ
  const shouldShowToggle = layout === "vertical" && castWithAvatar.length > MOBILE_COLLAPSED_COUNT;
  // Chỉ áp dụng slice trên mobile khi collapsed, desktop luôn hiển thị đầy đủ
  const displayedCast =
    shouldShowToggle && !isExpanded
      ? castWithAvatar.slice(0, MOBILE_COLLAPSED_COUNT)
      : castWithAvatar;

  // Grid classes for different layouts
  const gridClass =
    layout === "vertical"
      ? "grid-cols-3"
      : layout === "detail"
        ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
        : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7";

  // Empty state component - hiển thị khi backend không trả về cast data
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
        {!loading && !error && !hasCast && <EmptyCastState />}

        {!loading && !error && hasCast && (
          <div className={`grid ${gridClass} gap-4`}>
            {castWithAvatar.map((actor, index) => (
              <Link
                key={`detail-${actor.id}-${index}`}
                to={actor.id ? `/cast/${actor.id}` : "#"}
                className="bg-bgColor rounded-xl overflow-hidden transition-colors cursor-pointer group"
              >
                {/* Actor Image */}
                <div className="aspect-[3/4] overflow-hidden bg-bgColor relative group">
                  {actor.hasRealAvatar ? (
                    <OptimizedImage
                      src={actor.avatar}
                      alt={actor.name}
                      className="w-full h-full object-cover"
                      lazy={true}
                      sizeKey="CARD"
                    />
                  ) : (
                    <img
                      src={actor.avatar}
                      alt=""
                      className="w-full h-full object-cover"
                      draggable="false"
                    />
                  )}
                  <div className="absolute inset-0 z-0 bg-gradient-to-t from-bgColor via-bgColor/10 to-transparent" />
                </div>

                {/* Actor Info */}
                <div className="p-2 pt-1 text-center">
                  <div className="font-medium text-white text-sm mb-1 truncate group-hover:text-primaryColor transition-colors">
                    {actor.name || "Không rõ"}
                  </div>
                  {actor.character && (
                    <div className="text-xs text-gray-400 line-clamp-2">{actor.character}</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Default/Vertical layout - circular avatars
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        {title && <h3 className="text-xl font-bold text-gray-100">Diễn viên:</h3>}
        {shouldShowToggle && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="lg:hidden flex items-center gap-1 text-sm text-primaryColor hover:text-primaryColor/80 transition-colors"
          >
            <span>
              {isExpanded
                ? "Thu gọn"
                : `Xem thêm (${castWithAvatar.length - MOBILE_COLLAPSED_COUNT})`}
            </span>
            <i className={`fa-solid fa-chevron-${isExpanded ? "up" : "down"} text-xs`} />
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <BarSpinner />
        </div>
      )}
      {!loading && error && <div className="text-red-400 text-sm text-center py-4">{error}</div>}
      {!loading && !error && !hasCast && <EmptyCastState />}

      {!loading && !error && hasCast && (
        <>
          {/* Mobile: Hiển thị với collapse */}
          <div className={`lg:hidden grid ${gridClass} gap-6 transition-all duration-300`}>
            {displayedCast.map((actor, index) => (
              <Link
                key={`mobile-${actor.id}-${index}`}
                to={actor.id ? `/cast/${actor.id}` : "#"}
                className="text-center hover:opacity-80 transition-opacity group"
              >
                <div className="mx-auto mb-2 h-20 w-20 overflow-hidden rounded-full ring-1 ring-white/10 bg-bgColor2">
                  {actor.hasRealAvatar ? (
                    <OptimizedImage
                      src={actor.avatar}
                      alt={actor.name}
                      className="h-full w-full object-cover"
                      lazy={true}
                      sizeKey="CARD"
                    />
                  ) : (
                    <img
                      src={actor.avatar}
                      alt=""
                      className="h-full w-full object-cover"
                      draggable="false"
                    />
                  )}
                </div>
                <div className="text-sm font-semibold text-gray-200">
                  {actor.name || "Không rõ"}
                </div>
              </Link>
            ))}
          </div>
          {/* Desktop: Luôn hiển thị đầy đủ */}
          <div className={`hidden lg:grid ${gridClass} gap-6`}>
            {castWithAvatar.map((actor, index) => (
              <Link
                key={`desktop-${actor.id}-${index}`}
                to={actor.id ? `/cast/${actor.id}` : "#"}
                className="text-center hover:opacity-80 transition-opacity group"
              >
                <div className="mx-auto mb-2 h-20 w-20 overflow-hidden rounded-full ring-1 ring-white/10 bg-bgColor2">
                  {actor.hasRealAvatar ? (
                    <OptimizedImage
                      src={actor.avatar}
                      alt={actor.name}
                      className="h-full w-full object-cover"
                      lazy={true}
                      sizeKey="CARD"
                    />
                  ) : (
                    <img
                      src={actor.avatar}
                      alt=""
                      className="h-full w-full object-cover"
                      draggable="false"
                    />
                  )}
                </div>
                <div className="text-sm font-semibold text-gray-200 transition-colors group-hover:text-primaryColor">
                  {actor.name || "Không rõ"}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default CastSection;
