/**
 * EXAMPLES: Using WithHoverCard in different scenarios
 * This file demonstrates various use cases for the WithHoverCard component
 */

import React from "react";
import WithHoverCard from "./WithHoverCard";

// ============================================
// EXAMPLE 1: Simple Movie Card
// ============================================
export const SimpleMovieCard = ({ movie }) => {
  return (
    <WithHoverCard movie={movie}>
      <div className="rounded-lg overflow-hidden bg-gray-900">
        <img src={movie.posterUrl} alt={movie.title} className="w-full" />
      </div>
    </WithHoverCard>
  );
};

// ============================================
// EXAMPLE 2: Card with Custom Position
// ============================================
export const CustomPositionCard = ({ movie }) => {
  return (
    <WithHoverCard movie={movie} hoverPosition="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      <div className="rounded-lg overflow-hidden bg-gray-900 border border-white/10">
        <img src={movie.posterUrl} alt={movie.title} />
        <div className="p-3">
          <h3 className="text-white font-semibold">{movie.title}</h3>
        </div>
      </div>
    </WithHoverCard>
  );
};

// ============================================
// EXAMPLE 3: Card with Fast Hover Response
// ============================================
export const FastHoverCard = ({ movie }) => {
  return (
    <WithHoverCard
      movie={movie}
      showDelay={200} // Show faster (200ms instead of 500ms)
      hideDelay={50} // Hide faster
    >
      <div className="rounded-lg overflow-hidden bg-gray-900">
        <img src={movie.posterUrl} alt={movie.title} />
      </div>
    </WithHoverCard>
  );
};

// ============================================
// EXAMPLE 4: Grid Layout with Multiple Cards
// ============================================
export const MovieGrid = ({ movies }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 overflow-visible">
      {movies.map((movie) => (
        <WithHoverCard key={movie.id} movie={movie} hoverPosition="-left-20 -top-4">
          <div className="rounded-lg overflow-hidden bg-gray-900 border border-white/10">
            <div className="aspect-[2/3]">
              <img src={movie.posterUrl} alt={movie.title} className="w-full h-full object-cover" />
            </div>
          </div>
        </WithHoverCard>
      ))}
    </div>
  );
};

// ============================================
// EXAMPLE 5: Horizontal Scroll Container
// ============================================
export const HorizontalScrollCards = ({ movies }) => {
  return (
    <div className="overflow-x-auto scrollbar-hide pb-80 overflow-visible">
      <div className="flex gap-4">
        {movies.map((movie) => (
          <WithHoverCard key={movie.id} movie={movie} hoverPosition="-left-20 -top-4">
            <div className="shrink-0 w-[200px] rounded-lg overflow-hidden bg-gray-900">
              <img src={movie.posterUrl} alt={movie.title} className="w-full" />
            </div>
          </WithHoverCard>
        ))}
      </div>
    </div>
  );
};

// ============================================
// EXAMPLE 6: Card with Additional Content
// ============================================
export const DetailedMovieCard = ({ movie }) => {
  return (
    <WithHoverCard movie={movie}>
      <div className="rounded-lg overflow-hidden bg-gray-900 border border-white/10">
        <div className="relative aspect-[2/3]">
          <img src={movie.posterUrl} alt={movie.title} className="w-full h-full object-cover" />

          {/* Quality Badge */}
          <div className="absolute top-2 left-2">
            <span className="bg-cyan-500 text-white text-xs px-2 py-1 rounded">
              {movie.quality || "HD"}
            </span>
          </div>

          {/* Gradient Overlay */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
            <h3 className="text-white font-semibold text-sm line-clamp-2">{movie.title}</h3>
            <p className="text-gray-300 text-xs">{movie.year}</p>
          </div>
        </div>
      </div>
    </WithHoverCard>
  );
};

// ============================================
// EXAMPLE 7: Position Based on Index
// ============================================
export const DynamicPositionCards = ({ movies }) => {
  const getPosition = (index, total) => {
    // First card: position right
    if (index === 0) return "-left-4 -top-4";

    // Last card: position left
    if (index === total - 1) return "-right-4 -top-4";

    // Middle cards: center
    return "-left-20 -top-4";
  };

  return (
    <div className="flex gap-4 overflow-visible">
      {movies.map((movie, index) => (
        <WithHoverCard
          key={movie.id}
          movie={movie}
          hoverPosition={getPosition(index, movies.length)}
        >
          <div className="shrink-0 w-[200px] rounded-lg overflow-hidden bg-gray-900">
            <img src={movie.posterUrl} alt={movie.title} />
          </div>
        </WithHoverCard>
      ))}
    </div>
  );
};

// ============================================
// EXAMPLE 8: With Custom Styling
// ============================================
export const StyledMovieCard = ({ movie }) => {
  return (
    <WithHoverCard movie={movie} showDelay={300} hideDelay={100}>
      <div className="group relative rounded-xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-950 border border-white/20 shadow-lg hover:shadow-2xl transition-shadow">
        <div className="aspect-[2/3] relative">
          <img
            src={movie.posterUrl}
            alt={movie.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />

          {/* Overlay Effects */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
        </div>

        <div className="p-4">
          <h3 className="text-white font-bold text-base line-clamp-1">{movie.title}</h3>
          <p className="text-gray-400 text-sm mt-1">{movie.year}</p>

          <div className="flex items-center gap-2 mt-2">
            {movie.rating && (
              <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-1 rounded">
                ⭐ {movie.rating}
              </span>
            )}
            {movie.quality && (
              <span className="bg-cyan-500/20 text-cyan-400 text-xs px-2 py-1 rounded">
                {movie.quality}
              </span>
            )}
          </div>
        </div>
      </div>
    </WithHoverCard>
  );
};
