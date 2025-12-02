import { useCallback, useState } from "react";
import useAuth from "./useAuth";
import useToast from "./useToast";
import movieService from "services/movie.service";

/**
 * Shared hook để xử lý logic đánh giá phim.
 * Gộp chung:
 * - Kiểm tra đăng nhập
 * - Gửi request rateMovie
 * - Hiển thị toast thành công / lỗi
 * - Quản lý state đã rating & mở/đóng modal (tuỳ chọn)
 */
const useMovieRating = (movie) => {
  const { isAuthenticated, openAuthModal } = useAuth();
  const { success, warning } = useToast();

  const [isRating, setIsRating] = useState(false);
  const [userRating, setUserRating] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openRatingModal = useCallback(() => {
    if (!isAuthenticated) {
      openAuthModal("login");
      return;
    }
    setIsModalOpen(true);
  }, [isAuthenticated, openAuthModal]);

  const closeRatingModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const rateMovie = useCallback(
    async (ratingValue) => {
      if (!movie?.id) return;

      if (!isAuthenticated) {
        openAuthModal("login");
        return;
      }

      try {
        setIsRating(true);
        await movieService.rateMovie(movie.id, ratingValue);
        setUserRating(ratingValue);
        success("Đánh giá của bạn đã được ghi nhận!");
        setIsModalOpen(false);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error rating movie:", error);
        warning(error?.message || "Không thể gửi đánh giá. Vui lòng thử lại!");
      } finally {
        setIsRating(false);
      }
    },
    [movie?.id, isAuthenticated, openAuthModal, success, warning]
  );

  return {
    isRating,
    userRating,
    isModalOpen,
    openRatingModal,
    closeRatingModal,
    rateMovie,
  };
};

export default useMovieRating;
