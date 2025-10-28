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
  const displayMovies = movies || mockSectionMovies[sectionType] || [];

  return (
    <section className="w-full py-2 pl-4 sm:px-4 sm:py-6 overflow-visible">
      <SectionHeader title={title} linkHref={linkHref} />

      {/* Horizontal Scroll for ALL screen sizes - with extra space for hover card */}
      <div className="lg:-mt-4">
        <ScrollContainer gap="gap-1 sm:gap-3" showArrows={false}>
          {displayMovies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </ScrollContainer>
      </div>
    </section>
  );
};

export default SectionRow;
