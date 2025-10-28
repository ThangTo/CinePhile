import React from "react";

/**
 * Banner Background Component - Displays background image with gradient overlays
 * @param {Object} props
 * @param {string} props.backgroundImage - Background image URL
 * @param {string} props.title - Movie title for alt text
 */
const BannerBackground = ({
  backgroundImage,
  title,
  classNameOverlay = "from-bgColor via-bgColor/10 to-transparent",
  overlayTop = false,
  overlayLeft = false,
  className = "sm:absolute",
}) => (
  <>
    {/* Background image */}
    <div className={`relative inset-0 z-0 ${className}`}>
      <img
        src={backgroundImage}
        alt={title}
        className="h-full w-full object-cover object-right aspect-[16/9]"
      />
      <div className={`absolute inset-0 z-0 bg-gradient-to-t  ${classNameOverlay}`} />
      {overlayTop && (
        <div className={`absolute inset-0 z-0 bg-gradient-to-b ${classNameOverlay}`} />
      )}
    </div>

    {/* Gradient overlays for desktop */}
    {overlayLeft && (
      <div className="hidden sm:block absolute inset-0 z-0 bg-gradient-to-r from-bgColor/90 via-bgColor/10 to-transparent" />
    )}
    <div className="hidden sm:block absolute inset-0 z-0 bg-gradient-to-t from-bgColor via-bgColor/10 to-transparent" />
  </>
);

export default BannerBackground;
