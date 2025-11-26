import React, { useState, useEffect } from "react";
import SectionHeader from "components/common/SectionHeader";
import ScrollContainer from "components/common/ScrollContainer";
import MovieCard from "components/home-page/MovieCard";
import movieService from "services/movie.service";
import { InlineSpinner } from "components/common/LoadingState";

/**
 * Movie section with horizontal scrolling for ALL screen sizes
 * @param {Object} props
 * @param {string} props.title - Section title
 * @param {Array} props.movies - Array of movie objects (optional, fetches from API if not provided)
 * @param {string} props.sectionType - Type of section: 'trending' | 'newReleases'
 * @param {string} props.linkHref - Optional "View all" link
 */
const SectionRow = ({ title, movies, sectionType = "trending", linkHref = "#" }) => {
  const [allMovies, setAllMovies] = useState(movies || []);
  const [loading, setLoading] = useState(!movies);

  useEffect(() => {
    // If movies prop is provided, use it directly
    if (movies) {
      setAllMovies(movies);
      setLoading(false);
      return;
    }

    // Otherwise, fetch from API based on sectionType
    const fetchMovies = async () => {
      try {
        setLoading(true);
        let response;
        switch (sectionType) {
          case "trending":
            response = await movieService.getTrending(20);
            break;
          case "newReleases":
            response = await movieService.getNewReleases(20);
            break;
          default:
            response = await movieService.getAll({ limit: 20 });
        }
        setAllMovies(response.data || []);
      } catch (error) {
        console.error(`Error fetching ${sectionType} movies:`, error);
        setAllMovies([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, [sectionType, movies]);

  const displayMovies = allMovies;

  if (loading) {
    return (
      <section className="w-full py-2 sm:py-6 overflow-visible">
        <div className="px-4">
          <SectionHeader title={title} linkHref={linkHref} />
        </div>
        <InlineSpinner className="py-4" />
      </section>
    );
  }

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
                    width: "calc((100% - 60px) / 6)",
                    maxWidth: "300px",
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

