import React from "react";

const normalizeViewCount = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const getMovieViewCount = (movie, views) =>
  normalizeViewCount(views ?? movie?.views ?? movie?.viewCount);

const formatCompactViewCount = (value) => {
  const count = normalizeViewCount(value);

  if (count >= 1_000_000_000) {
    const billions = count / 1_000_000_000;
    return `${billions >= 10 ? billions.toFixed(0) : billions.toFixed(1).replace(/\.0$/, "")}B`;
  }

  if (count >= 1_000_000) {
    const millions = count / 1_000_000;
    return `${millions >= 10 ? millions.toFixed(0) : millions.toFixed(1).replace(/\.0$/, "")}M`;
  }

  if (count >= 1_000) {
    const thousands = count / 1_000;
    return `${thousands >= 10 ? thousands.toFixed(0) : thousands.toFixed(1).replace(/\.0$/, "")}K`;
  }

  return count.toLocaleString("vi-VN");
};

const VARIANT_CLASS_NAMES = {
  overlay:
    "border border-none bg-primaryColor text-black shadow-[0_12px_30px_rgba(245,158,11,0.34)]",
  soft: "border border-black bg-primaryColor text-black shadow-[0_8px_20px_rgba(245,158,11,0.24)]",
};

const ICON_WRAPPER_CLASS_NAMES = {
  // overlay: "bg-black/16 text-black ring-1 ring-black",
  soft: "bg-black/14 text-black",
};

const MovieViewsTag = ({
  movie,
  views,
  compact = false,
  variant = "overlay",
  className = "",
  showLabel = false,
}) => {
  const count = getMovieViewCount(movie, views);
  const displayValue = formatCompactViewCount(count);
  const sizeClassName = compact ? "gap-1 px-2 py-0.5 text-[10px]" : "gap-1.5 px-2 py-1 text-[11px]";
  const iconClassName = compact ? "h-4 min-w-4 text-[9px]" : "h-[18px] min-w-[18px] text-[10px]";
  const variantClassName = VARIANT_CLASS_NAMES[variant] || VARIANT_CLASS_NAMES.overlay;
  const iconWrapperClassName =
    ICON_WRAPPER_CLASS_NAMES[variant] || ICON_WRAPPER_CLASS_NAMES.overlay;

  return (
    <span
      title={`${count.toLocaleString("vi-VN")} lượt xem`}
      aria-label={`${count.toLocaleString("vi-VN")} lượt xem`}
      className={`inline-flex items-center rounded-xl font-bold leading-none tracking-[0.03em] ${sizeClassName} ${variantClassName} ${className}`}
    >
      <span
        className={`inline-flex items-center justify-center rounded-full ${iconClassName} ${iconWrapperClassName}`}
      >
        <i className="fa-solid fa-eye" />
      </span>
      <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
        {showLabel ? `${displayValue} lượt` : displayValue}
      </span>
    </span>
  );
};

export default MovieViewsTag;
