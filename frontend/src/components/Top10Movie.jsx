import React from "react";
import SectionHeader from "./common/SectionHeader";
import ScrollContainer from "./common/ScrollContainer";
import Top10Card from "./Top10Movie/Top10Card";
import { mockTop10Movies, formatEpisodeInfo } from "../data/mockData";

/**
 * Top 10 Movies Section
 * Always displays in horizontal scroll layout for all screen sizes
 */
const Top10Movie = () => {
  // Transform mock data to include formatted episode info
  const movies = mockTop10Movies.map((movie) => ({
    ...movie,
    episode: formatEpisodeInfo(movie),
  }));

  return (
    <section className="w-full py-2 sm:py-6">
      <SectionHeader title="Top 10 phim bộ hôm nay" linkHref="/top10" className="px-4" />

      {/* Horizontal Scroll for ALL screen sizes */}
      <div className="pl-4 sm:px-4 py-2 ">
        <ScrollContainer gap="gap-1 sm:gap-3" showArrows={false}>
          {movies.map((movie, idx) => (
            <Top10Card key={movie.id} movie={movie} rank={idx + 1} />
          ))}
        </ScrollContainer>
      </div>
    </section>
  );
};

export default Top10Movie;
