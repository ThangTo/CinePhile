import React from "react";

/**
 * Info Badge Component - Displays movie information badges
 * @param {Object} props
 * @param {string} props.label - Badge label
 * @param {string} props.value - Badge value (optional)
 * @param {boolean} props.isIMDb - Whether this is an IMDb badge (special styling)
 */
const InfoBadge = ({ label, value, isIMDb = false }) => {
  const formattedValue = isIMDb && value ? parseFloat(value).toFixed(1) : value;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md lg:rounded-lg bg-white/20 px-1 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs text-gray-200 ${
        isIMDb
          ? "border-[2px] border-primaryColor text-primaryColor"
          : "border-[1.5px] border-white"
      }`}
    >
      {label}
      {value && <strong className="ml-1 text-white">{formattedValue}</strong>}
    </span>
  );
};

export default InfoBadge;
