import { useState, useEffect } from "react";
import movieService from "services/movie.service";

/**
 * Custom hook to fetch and manage movie detail data
 * @param {string} id - Movie ID
 * @returns {Object} - { movie, loading, error, activeTab, setActiveTab, audioType, setAudioType }
 */
const useMovieDetail = (id) => {
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("episodes");
  const [audioType, setAudioType] = useState(null);

  useEffect(() => {
    const fetchMovie = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch movie data from service (handles both mock and real API)
        const movieData = await movieService.getById(id);

        if (movieData) {
          setMovie(movieData);
        } else {
          setError(`Movie with ID ${id} not found`);
          console.error(`Movie with ID ${id} not found`);
        }
      } catch (err) {
        setError(err.message || "Error fetching movie");
        console.error("Error fetching movie:", err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchMovie();
    }
  }, [id]);

  // Đặt audioType mặc định theo tập đầu tiên (nếu có)
  useEffect(() => {
    if (!movie || audioType) return;
    const firstEp = (movie.episodes || [])[0];
    if (firstEp && firstEp.audioType) {
      setAudioType(firstEp.audioType);
    }
  }, [movie, audioType]);

  return {
    movie,
    loading,
    error,
    activeTab,
    setActiveTab,
    audioType,
    setAudioType,
  };
};

export default useMovieDetail;
