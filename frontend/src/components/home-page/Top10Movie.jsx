import React, { useState, useEffect } from "react";
import SectionHeader from "components/common/SectionHeader";
import ScrollContainer from "components/common/ScrollContainer";
import Top10Card from "components/top-movie/Top10Card";
import movieService from "services/movie.service";

/**
 * Top 10 Movies Section
 * Always displays in horizontal scroll layout for all screen sizes
 */
const Top10Movie = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTop10 = async () => {
      try {
        setLoading(true);
        const response = await movieService.getTopRated(10);
        setMovies(response.data || []);
      } catch (error) {
        console.error("Error fetching top 10 movies:", error);
        setMovies([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTop10();
  }, []);

  if (loading) {
    return (
      <section className="w-full py-2 sm:py-6">
        <SectionHeader title="Top 10 phim bộ hôm nay" linkHref="/top10" className="px-4" />
        <div className="pl-4 sm:px-4 py-2 text-white text-center">Đang tải...</div>
      </section>
    );
  }

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
