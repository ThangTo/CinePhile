import React from "react";
import SectionHeader from "./common/SectionHeader";
import ScrollContainer from "./common/ScrollContainer";
import MovieCard from "./MovieCard";
import { mockSectionMovies } from "../data/mockData";

/**
 * Movie section with horizontal scrolling for ALL screen sizes
 * @param {Object} props
 * @param {string} props.title - Section title
 * @param {Array} props.movies - Array of movie objects (optional, uses mock data if not provided)
 * @param {string} props.sectionType - Type of section for mock data: 'trending' | 'newReleases'
 * @param {string} props.linkHref - Optional "View all" link
 */
const SectionRow = ({ title, movies, sectionType = "trending", linkHref = "#" }) => {
  // Use provided movies or fallback to mock data
  const allMovies = movies || mockSectionMovies[sectionType] || [];
  // Show all movies but in groups of 6
  const displayMovies = allMovies;

  return (
    <section className="w-full py-2 sm:py-6 overflow-visible">
      <div className="px-4">
        <SectionHeader title={title} linkHref={linkHref} />
      </div>

      {/* Mobile: Horizontal Scroll */}
      <div className="lg:hidden pl-4">
        <ScrollContainer gap="gap-2" showArrows={false}>
          {displayMovies.map((movie) => (
            <div key={movie.id} className="flex-shrink-0 w-[140px] sm:w-[160px]">
              <MovieCard movie={movie} />
            </div>
          ))}
        </ScrollContainer>
      </div>

      {/* Desktop: Horizontal scroll with arrows - 6 movies visible at once */}
      <div className="hidden lg:block lg:-mt-4">
        <div className="max-w-[1920px] mx-auto">
          <div className="relative px-4">
            <ScrollContainer gap="gap-3" showArrows={true}>
              {displayMovies.map((movie, index) => (
                <div 
                  key={movie.id} 
                  className="flex-shrink-0" 
                  style={{ 
                    // 6 cards with 5 gaps (gap-3 = 0.75rem = 12px each)
                    // (100% - 5 * 12px) / 6 = width per card
                    width: 'calc((100% - 60px) / 6)',
                    maxWidth: '300px'
                  }}
                >
                  <MovieCard movie={movie} />
                </div>
              ))}
            </ScrollContainer>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SectionRow;
