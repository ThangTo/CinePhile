import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import useToast from "../../hooks/useToast";

/**
 * Custom hook to generate banner configuration
 * Handles navigation and toast notifications
 * @param {Object} movieData - Movie data object
 * @returns {Object} { infoBadges, actionButtons }
 */
export const useBannerConfig = (movieData) => {
  const navigate = useNavigate();
  const { success } = useToast();

  // Info badges configuration
  const infoBadges = useMemo(
    () => [
      { label: "IMDb", value: movieData.imdb, isIMDb: true },
      { label: movieData.ageRating },
      { label: movieData.year },
      { label: movieData.duration },
      { label: movieData.quality },
    ],
    [movieData]
  );

  // Action buttons configuration
  const actionButtons = useMemo(
    () => [
      {
        icon: "fa-play",
        variant: "primary",
        size: "lg",
        onClick: () => navigate(`/watch/${movieData.id}?ep=1`),
        ariaLabel: "Play movie",
      },
      {
        icon: "fa-heart",
        variant: "default",
        size: "md",
        onClick: () => success("Đã thêm vào danh sách yêu thích!"),
        ariaLabel: "Add to favorites",
      },
      {
        icon: "fa-circle-info",
        variant: "default",
        size: "md",
        onClick: () => navigate(`/movie/${movieData.id}`),
        ariaLabel: "Movie details",
      },
    ],
    [movieData.id, navigate, success]
  );

  return { infoBadges, actionButtons };
};
