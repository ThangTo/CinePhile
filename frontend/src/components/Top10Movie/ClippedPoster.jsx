import React, { useId } from "react";
import "../../styles/TopMovie.css";

// Polygon coordinates for clipped corners
const POLY_EVEN = `
94.239 100, 5.761 100, 4.826 99.95, 3.94 99.803, 3.113 99.569, 2.358 99.256,
1.687 98.87, 1.111 98.421, 0.643 97.915, 0.294 97.362, 0.075 96.768, 0 96.142,
0 3.858, 0.087 3.185, 0.338 2.552, 0.737 1.968, 1.269 1.442, 1.92 0.984,
2.672 0.602, 3.512 0.306, 4.423 0.105, 5.391 0.008, 6.4 0.024, 94.879 6.625,
95.731 6.732, 96.532 6.919, 97.272 7.178, 97.942 7.503, 98.533 7.887,
99.038 8.323, 99.445 8.805, 99.747 9.326, 99.935 9.88, 100 10.459, 100 96.142,
99.925 96.768, 99.706 97.362, 99.357 97.915, 98.889 98.421, 98.313 98.87,
97.642 99.256, 96.887 99.569, 96.06 99.803, 95.174 99.95, 94.239 100
`;

const POLY_ODD = `
5.761 100, 94.239 100, 95.174 99.95, 96.06 99.803, 96.887 99.569, 97.642 99.256,
98.313 98.87, 98.889 98.421, 99.357 97.915, 99.706 97.362, 99.925 96.768,
100 96.142, 100 3.858, 99.913 3.185, 99.662 2.552, 99.263 1.968, 98.731 1.442,
98.08 0.984, 97.328 0.602, 96.488 0.306, 95.577 0.105, 94.609 0.008, 93.6 0.024,
5.121 6.625, 4.269 6.732, 3.468 6.919, 2.728 7.178, 2.058 7.503, 1.467 7.887,
0.962 8.323, 0.555 8.805, 0.253 9.326, 0.065 9.88, 0 10.459, 0 96.142,
0.075 96.768, 0.294 97.362, 0.643 97.915, 1.111 98.421, 1.687 98.87,
2.358 99.256, 3.113 99.569, 3.94 99.803, 4.826 99.95, 5.761 100
`;

/**
 * Poster with clipped corner and gradient border
 * @param {Object} props
 * @param {string} props.src - Image source
 * @param {string} props.alt - Image alt text
 * @param {boolean} props.isOdd - Whether to clip left or right corner
 */
const ClippedPoster = ({ src, alt, isOdd = false }) => {
  const gradId = useId();

  return (
    <div className={`card ${isOdd ? "odd" : ""} aspect-[2/3]`}>
      <div className={`shape ${isOdd ? "is-odd" : "is-even"}`}>
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover pointer-events-none select-none"
          draggable="false"
        />

        {/* SVG gradient border */}
        <svg
          className="border-svg"
          viewBox="0 0 100 100"
          width="100%"
          height="100%"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`g-${gradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00b7ff" />
              <stop offset="100%" stopColor="#ff4dbf" />
            </linearGradient>
          </defs>

          <polygon
            className="poly"
            fill="none"
            stroke={`url(#g-${gradId})`}
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            points={isOdd ? POLY_ODD : POLY_EVEN}
          />
        </svg>
      </div>
    </div>
  );
};

export default ClippedPoster;
