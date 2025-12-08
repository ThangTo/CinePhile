import { useState, useEffect } from "react";
import movieService from "services/movie.service";
import userService from "services/user.service";
import useAuth from "hooks/useAuth";
import { enrichMovieWithSeriesParts } from "utils/seriesGrouping";

/**
 * Custom hook to fetch and manage movie detail data
 * @param {string} id - Movie ID
 * @returns {Object} - { movie, loading, error, activeTab, setActiveTab, audioType, setAudioType, savedProgress, showResumeModal, setShowResumeModal }
 */
const useMovieDetail = (id) => {
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("episodes");
  const [audioType, setAudioType] = useState(null);
  const [savedProgress, setSavedProgress] = useState(null);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    const fetchMovie = async () => {
      setLoading(true);
      setError(null);

      try {
        const movieData = await movieService.getById(id);
        const enriched = await enrichMovieWithSeriesParts(movieData);

        if (!enriched) {
          setError(`Movie with ID ${id} not found`);
          console.error(`Movie with ID ${id} not found`);
          setLoading(false);
          return;
        }

        setMovie(enriched);
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

  // Load watch progress and auto-show modal when movie is loaded
  useEffect(() => {
    const movieId = movie?.id || movie?._id;
    if (!isAuthenticated || !user || !movieId) {
      setSavedProgress(null);
      setShowResumeModal(false);
      return;
    }

    const loadProgress = async () => {
      try {
        const response = await userService.getProgress(movieId);
        if (response?.success && response?.data) {
          const progress = response.data;
          // Chỉ hiển thị resume nếu progress < 95% (chưa xem xong) và watchTime > 5
          if (progress.progress < 95 && progress.watchTime > 5) {
            setSavedProgress(progress);
            setShowResumeModal(true); // Tự động hiển thị modal
          } else {
            setSavedProgress(null);
            setShowResumeModal(false);
          }
        } else {
          setSavedProgress(null);
          setShowResumeModal(false);
        }
      } catch (error) {
        console.error("Failed to load watch progress:", error);
        setSavedProgress(null);
        setShowResumeModal(false);
      }
    };

    loadProgress();
  }, [isAuthenticated, user, movie?.id, movie?._id]);

  return {
    movie,
    loading,
    error,
    activeTab,
    setActiveTab,
    audioType,
    setAudioType,
    savedProgress,
    showResumeModal,
    setShowResumeModal,
  };
};

export default useMovieDetail;
