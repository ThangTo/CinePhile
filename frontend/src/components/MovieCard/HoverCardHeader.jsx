import React from "react";

/**
 * Hover Card Header Component - Backdrop image with title overlay
 * @param {Object} props
 * @param {string} props.backdropUrl - Backdrop image URL
 * @param {string} props.title - Movie title
 * @param {string} props.subtitle - Movie subtitle/English title
 * @param {Function} props.onClick - Click handler (optional)
 */
const HoverCardHeader = ({ backdropUrl, title, subtitle, onClick }) => (
  <div
    className="relative h-[225px] w-full overflow-hidden cursor-pointer hover:brightness-110 transition-all"
    onClick={onClick}
  >
    <img src={backdropUrl} alt={title} className="h-full w-full object-cover" draggable="false" />
    {/* Gradient overlay */}
    <div className="absolute inset-0 bg-gradient-to-t from-gray-800 via-gray-700/10 to-transparent" />

    {/* Title overlay on image */}
    <div className="absolute inset-x-0 bottom-0 px-4 pb-3">
      <h3 className="text-xl font-bold text-white mb-1 drop-shadow-lg line-clamp-2">{title}</h3>
      {subtitle && <p className="text-sm text-yellow-400 font-semibold">{subtitle}</p>}
    </div>
  </div>
);

export default HoverCardHeader;
