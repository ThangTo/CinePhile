import React from "react";
import { useNavigate } from "react-router-dom";
import useToast from "../../hooks/useToast";
import useAuth from "../../hooks/useAuth";
import ToastContainer from "../common/ToastContainer";
import AuthModal from "../auth/AuthModal";

const ActionButtons = ({ movie }) => {
  const navigate = useNavigate();
  const { toasts, removeToast, success, info } = useToast();
  const { isAuthenticated, showAuthModal, authMode, openAuthModal, closeAuthModal } = useAuth();

  const handleAddFavorite = () => {
    if (!isAuthenticated) {
      openAuthModal("login");
      return;
    }
    success("Đã thêm vào danh sách yêu thích!");
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
    const commentsSection = document.querySelector(".comments-section");
    if (commentsSection) {
      commentsSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleRate = () => {
    if (!isAuthenticated) {
      openAuthModal("login");
      return;
    }
    info("Chức năng đánh giá sẽ được tích hợp!");
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
          onClick={handleRate}
          className="bg-blue-600 hover:bg-blue-700 text-white lg:px-4 px-2 py-2 rounded-full flex items-center gap-2 font-semibold shadow-lg transition-all"
        >
          <i className="fa-solid fa-smile text-lg" />
          <span className="text-base">{parseFloat(movie.rating).toFixed(1)}</span>
          <span className="text-sm">Đánh giá</span>
        </button>
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <AuthModal isOpen={showAuthModal} onClose={closeAuthModal} initialMode={authMode} />
    </>
  );
};

export default ActionButtons;
