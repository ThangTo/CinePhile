import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import useToast from "../../hooks/useToast";
import useAuth from "../../hooks/useAuth";
import ToastContainer from "../common/ToastContainer";
import AuthModal from "../auth/AuthModal";
import RatingModal from "../watch/RatingModal";
import userService from "../../services/user.service";
import movieService from "../../services/movie.service";

const ActionButtons = ({ movie }) => {
  const navigate = useNavigate();
  const { toasts, removeToast, success, info, warning } = useToast();
  const { isAuthenticated, showAuthModal, authMode, openAuthModal, closeAuthModal, user } =
    useAuth();
  const [showRatingModal, setShowRatingModal] = useState(false);

  const handleAddFavorite = async () => {
    if (!isAuthenticated) {
      openAuthModal("login");
      return;
    }
    if (!user?.id) {
      warning("Không tìm thấy thông tin người dùng!");
      return;
    }
    try {
      await userService.addToFavorites(user.id, movie.id);
      success("Đã thêm vào danh sách yêu thích!");
    } catch (error) {
      warning(error.message || "Không thể thêm vào yêu thích. Vui lòng thử lại!");
      console.error("Error adding to favorites:", error);
    }
  };

  const handleRate = async (rating) => {
    if (!isAuthenticated) {
      openAuthModal("login");
      return;
    }
    try {
      await movieService.rateMovie(movie.id, rating);
      success("Đánh giá của bạn đã được ghi nhận!");
      setShowRatingModal(false);
    } catch (error) {
      warning(error.message || "Không thể gửi đánh giá. Vui lòng thử lại!");
      console.error("Error rating movie:", error);
    }
  };

  const handleAddToList = () => {
    if (!isAuthenticated) {
      openAuthModal("login");
      return;
    }
    success("Đã thêm vào danh sách!");
  };

  const handleShare = () => {
    info("Chức năng chia sẻ sẽ được tích hợp!");
  };

  const handleComment = () => {
    // Check window size to determine which section to scroll to
    const isDesktop = window.innerWidth >= 1024; // lg breakpoint
    console.log(isDesktop);
    const selector = isDesktop ? ".comments-section-desktop" : ".comments-section-mobile";
    const commentsSection = document.querySelector(selector);

    if (!commentsSection) {
      console.warn(`Comments section (${selector}) not found`);
      return;
    }

    // Get absolute position
    const elementPosition = commentsSection.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - 100;

    // Scroll to position
    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth",
    });
  };

  const handleOpenRateModal = () => {
    if (!isAuthenticated) {
      openAuthModal("login");
      return;
    }
    setShowRatingModal(true);
  };

  return (
    <>
      <div className="flex items-center justify-between gap-6 py-6 px-4">
        {/* Watch Now Button */}
        <div className="flex items-center justify-start gap-6">
          <button
            onClick={() => navigate(`/watch/${movie.id}?ep=1`)}
            className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-8 py-3 rounded-full font-semibold flex items-center gap-2 hover:from-yellow-300 hover:to-orange-400 transition-all shadow-lg"
          >
            <i className="fa-solid fa-play text-lg" />
            Xem Ngay
          </button>

          {/* Action Buttons */}
          <button
            onClick={handleAddFavorite}
            className="flex flex-col items-center gap-1 hover:text-yellow-400 transition-colors text-white"
          >
            <i className="fa-solid fa-heart text-2xl" />
            <span className="text-xs">Yêu thích</span>
          </button>

          <button
            onClick={handleAddToList}
            className="flex flex-col items-center gap-1 hover:text-yellow-400 transition-colors text-white"
          >
            <i className="fa-solid fa-plus text-2xl" />
            <span className="text-xs">Thêm vào</span>
          </button>

          <button
            onClick={handleShare}
            className="flex flex-col items-center gap-1 hover:text-yellow-400 transition-colors text-white"
          >
            <i className="fa-solid fa-paper-plane text-2xl" />
            <span className="text-xs">Chia sẻ</span>
          </button>

          <button
            onClick={handleComment}
            className="flex flex-col items-center gap-1 hover:text-yellow-400 transition-colors text-white"
          >
            <i className="fa-solid fa-comment text-2xl" />
            <span className="text-xs">Bình luận</span>
          </button>
        </div>

        <button
          onClick={handleOpenRateModal}
          className="bg-blue-600 hover:bg-blue-700 text-white lg:px-4 px-2 py-2 rounded-full flex items-center gap-2 font-semibold shadow-lg transition-all"
        >
          <i className="fa-solid fa-smile text-lg" />
          <span className="text-base">{parseFloat(movie.rating).toFixed(1)}</span>
          <span className="text-sm">Đánh giá</span>
        </button>
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <AuthModal isOpen={showAuthModal} onClose={closeAuthModal} initialMode={authMode} />
      <RatingModal
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        movie={movie}
        onRate={handleRate}
      />
    </>
  );
};

export default ActionButtons;
