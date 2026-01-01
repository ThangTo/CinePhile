import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import WithHoverCard from "components/common/WithHoverCard";
import OptimizedImage from "components/common/OptimizedImage";
import { preloadImage } from "utils/imagePreloader";
import { getOptimizedImageUrl } from "constants/imageSizes";

const MovieCard = ({
  movie,
  hoverVisibleAt = "lg",
  hoverCardClass,
  hoverPosition = "-left-20 -top-4",
  compact = false,
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/movie/${movie.id}`);
  };

  // Preload hover card image when card enters viewport (not just on hover)
  useEffect(() => {
    if (!movie) return;

    const cardElement = document.querySelector(`[data-movie-id="${movie.id}"]`);
    if (!cardElement) return;

    // Preload hover card image when card enters viewport
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Preload hover card background image with DETAIL size
            const bgImage = movie.backgroundImage || movie.posterUrl || movie.poster;
            if (bgImage) {
              const optimizedUrl = getOptimizedImageUrl(bgImage, "DETAIL");
              if (optimizedUrl) {
                preloadImage(optimizedUrl).catch(() => {});
              }
            }
            observer.disconnect(); // Only preload once
          }
        });
      },
      { rootMargin: "200px" } // Preload 200px before entering viewport
    );

    observer.observe(cardElement);
    return () => observer.disconnect();
  }, [movie]);

  // Preload detail page images when hovering over card
  useEffect(() => {
    if (!movie) return;

    const cardElement = document.querySelector(`[data-movie-id="${movie.id}"]`);
    if (!cardElement) return;

    const handleMouseEnter = () => {
      // Preload background and poster for detail page using standardized sizes
      const bgImage = movie.bgImage || movie.backgroundImage || movie.poster;
      if (bgImage) {
        // Preload with BANNER size
        const optimizedBg = getOptimizedImageUrl(bgImage, "BANNER");
        if (optimizedBg) preloadImage(optimizedBg).catch(() => {});
      }
      if (movie.poster) {
        // Preload with DETAIL size
        const optimizedPoster = getOptimizedImageUrl(movie.poster, "DETAIL");
        if (optimizedPoster) preloadImage(optimizedPoster).catch(() => {});
      }
    };

    cardElement.addEventListener("mouseenter", handleMouseEnter);
    return () => {
      cardElement.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, [movie]);

  return (
    <WithHoverCard
      movie={movie}
      hoverPosition={hoverPosition}
      // Let the parent grid control column sizing. Use full width inside grid cell.
      className="relative w-full overflow-visible"
      showHoverOn={hoverVisibleAt}
      hoverCardClass={hoverCardClass}
      compact={compact}
    >
      <div
        data-movie-id={movie.id}
        className={`group bg-bgColor4 rounded-2xl ${
          compact ? "p-2" : "p-4"
        } shadow-lg border border-white/5 cursor-pointer transition-all duration-300 hover:border-primaryColor/60`}
        onClick={handleClick}
      >
        <div className="relative rounded-2xl overflow-hidden">
          <OptimizedImage
            src={movie.poster}
            alt={movie.title}
            className="w-full aspect-[2/3] object-cover transition-transform duration-300 group-hover:scale-105 pointer-events-none"
            preloadOnHover={true}
            lazy={true}
            priority={false}
            sizeKey={compact ? "THUMBNAIL" : "CARD"}
          />
          <div className="absolute left-2 top-1 z-10">
            <span className="rounded bg-cyan-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
              {movie.quality || "HD"}
            </span>
          </div>
        </div>

        <div className={`${compact ? "mt-2" : "mt-4"} text-center`}>
          {!compact && <p className="text-[10px] text-gray-400 mb-1">{movie.year || "N/A"}</p>}
          <h3
            className={`${
              compact ? "text-sm" : "text-base"
            } font-semibold text-white line-clamp-1 `}
          >
            {movie.title}
          </h3>
          {movie.englishTitle && (
            <p className={`${compact ? "text-xs" : "text-sm"} text-gray-400 mt-1 line-clamp-1`}>
              {movie.englishTitle}
            </p>
          )}
        </div>
      </div>
    </WithHoverCard>
  );
};

export default MovieCard;
