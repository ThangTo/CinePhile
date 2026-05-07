import { useState, useEffect } from "react";
import movieService from "services/movie.service";
import userService from "services/user.service";
import useAuth from "hooks/useAuth";
import { enrichMovieWithSeriesParts } from "utils/seriesGrouping";
import { pickPreferredAudioType } from "utils/episodeSelection";

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

        // If movie is hidden, set default tab to "cast" instead of "episodes"
        if (enriched.isHidden) {
          setActiveTab("cast");
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

  // Default to the preferred available audio variant.
  useEffect(() => {
    if (!movie || audioType) return;
    const defaultAudioType = pickPreferredAudioType(movie.episodes || []);
    if (defaultAudioType) {
      setAudioType(defaultAudioType);
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

    // Don't show resume modal for hidden movies
    if (movie?.isHidden) {
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
  }, [isAuthenticated, user, movie?.id, movie?._id, movie?.isHidden]);

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
