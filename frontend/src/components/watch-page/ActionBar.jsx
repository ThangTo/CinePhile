import React from "react";
import useAuth from "hooks/useAuth";
import userService from "services/user.service";
import useToast from "hooks/useToast";
import ToastContainer from "components/common/ToastContainer";

const ActionBar = ({ movie }) => {
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const { toasts, removeToast, success, warning } = useToast();

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

  const handleAddToList = async () => {
    if (!isAuthenticated) {
      openAuthModal("login");
      return;
    }
    if (!user?.id) {
      warning("Không tìm thấy thông tin người dùng!");
      return;
    }
    try {
      await userService.addToWatchlist(user.id, movie.id);
      success("Đã thêm vào danh sách!");
    } catch (error) {
      warning(error.message || "Không thể thêm vào danh sách. Vui lòng thử lại!");
      console.error("Error adding to watchlist:", error);
    }
  };

  return (
    <>
      <div className="bg-bgColor2/50 backdrop-blur-sm rounded-lg">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-center gap-3 md:gap-4">
            {/* Yêu thích */}
            <button
              onClick={handleAddFavorite}
              className="flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primaryColor/50 rounded-lg text-white transition-all duration-200 hover:scale-105"
            >
              <i className="fa-solid fa-heart text-sm md:text-base" />
              <span className="text-xs md:text-sm font-medium">Yêu thích</span>
            </button>

            {/* Thêm vào */}
            <button
              onClick={handleAddToList}
              className="flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primaryColor/50 rounded-lg text-white transition-all duration-200 hover:scale-105"
            >
              <i className="fa-solid fa-plus text-sm md:text-base" />
              <span className="text-xs md:text-sm font-medium">Thêm vào</span>
            </button>
          </div>
        </div>
      </div>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );
};

export default ActionBar;
