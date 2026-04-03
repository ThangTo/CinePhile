import React from "react";
import { getAvatarUrlByKey, handleAvatarError } from "utils/avatarUtils";

/**
 * PremiumAvatar — wraps any avatar image with premium visual enhancements.
 *
 * Props:
 *   src        — avatar URL
 *   alt        — alt text
 *   size       — Tailwind size class, e.g. "w-10 h-10" (default: "w-10 h-10")
 *   isPremium  — boolean, controls premium glow + crown (default: false)
 *   className  — extra classes for the wrapper div
 *   imgClass   — extra classes for the <img> element
 */
const PremiumAvatar = ({
  src,
  alt = "Avatar",
  size = "w-10 h-10",
  isPremium = false,
  className = "",
  imgClass = "",
}) => {
  const resolvedSrc = src || getAvatarUrlByKey(alt);

  if (isPremium) {
    return (
      <div className={`relative inline-flex shrink-0 ${className}`}>
        {/* Animated glow ring */}
        <div
          className={`absolute inset-0 ${size} rounded-full`}
          style={{
            background:
              "conic-gradient(from 0deg, #ffd875, #fde68a, #fbbf24, #f59e0b, #ffd875)",
            padding: "2px",
            animation: "premiumGlow 2.5s ease-in-out infinite",
          }}
        />
        {/* Inner dark circle */}
        <div
          className={`relative ${size} rounded-full overflow-hidden`}
          style={{ background: "#111" }}
        >
          <img
            src={resolvedSrc}
            alt={alt}
            className={`w-full h-full object-cover ${imgClass}`}
            onError={handleAvatarError}
          />
          {/* Crown badge — floats over bottom-right */}
          <div
            className="absolute -bottom-1 -right-1 flex items-center justify-center animate-crown-float"
            style={{
              filter: "drop-shadow(0 0 4px rgba(255,216,117,0.8))",
            }}
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px]"
              style={{
                background: "linear-gradient(135deg, #fde68a, #f59e0b)",
                border: "1.5px solid rgba(255,216,117,0.8)",
              }}
            >
              <i className="fa-solid fa-crown text-yellow-900" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Non-premium — clean avatar with subtle ring
  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      <img
        src={resolvedSrc}
        alt={alt}
        className={`${size} rounded-full object-cover ring-2 ring-white/10 ${imgClass}`}
        onError={handleAvatarError}
      />
    </div>
  );
};

export default PremiumAvatar;
