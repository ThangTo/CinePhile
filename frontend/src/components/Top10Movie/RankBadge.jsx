import React from "react";

/**
 * Rank badge component with gradient text
 * @param {Object} props
 * @param {number} props.rank - Rank number
 * @param {string} props.size - Size variant: 'sm' | 'md' | 'lg'
 */
const RankBadge = ({ rank, size = "md" }) => {
  const sizeClasses = {
    sm: "text-[28px]",
    md: "text-[28px] lg:text-5xl",
    lg: "text-[28px] lg:text-6xl",
  };

  return (
    <div
      style={{
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
      }}
      className={`lg:py-4 px-2 text-primaryColor bg-gradient-to-r from-yellow-400 to-yellow-200 font-extrabold flex lg:items-center justify-center ${sizeClasses[size]} italic`}
    >
      {rank}
    </div>
  );
};

export default RankBadge;
