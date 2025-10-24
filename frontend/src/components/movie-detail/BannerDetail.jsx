import React from "react";
import { useNavigate } from "react-router-dom";
import useToast from "../../hooks/useToast";
import ToastContainer from "../common/ToastContainer";

const HeroBanner = ({ movie }) => {
  const navigate = useNavigate();
  const { toasts, removeToast, success, info } = useToast();

  const handleAddFavorite = () => {
    success("Đã thêm vào danh sách yêu thích!");
  };

  const handleAddToList = () => {
    success("Đã thêm vào danh sách!");
  };

  const handleShare = () => {
    info("Chức năng chia sẻ sẽ được tích hợp!");
  };

  const handleComment = () => {
    // Scroll to comments section
    const commentsSection = document.querySelector(".comments-section");
    if (commentsSection) {
      commentsSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      <section className="relative h-[600px] overflow-hidden">
        <div className="absolute inset-0">
          <img src={movie.bgImage} alt={movie.title} className="w-full h-full object-cover" />
          <div
            className="absolute inset-x-0 top-0 h-28 z-10 pointer-events-none
                bg-gradient-to-b from-[#0b1220]/85 via-[#0b1220]/40 to-transparent"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b1220] via-[#0b1220]/40 to-transparent" />
        </div>

        {/* Action Bar - Centered at bottom */}
        <div className="absolute bottom-16 left-0 right-0">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center gap-8">
              <button
                onClick={() => navigate(`/watch/${movie.id}?ep=1`)}
                className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-9 py-4 rounded-full font-semibold flex items-center gap-2 hover:from-yellow-300 hover:to-orange-400 transition-all shadow-lg"
              >
                <i className="fa-solid fa-play text-xl" />
                Xem Ngay
              </button>

              <button
                onClick={handleAddFavorite}
                className="flex flex-col items-center gap-1 hover:text-yellow-400 transition-colors"
              >
                <i className="fa-solid fa-heart text-2xl" />
                <span className="text-xs">Yêu thích</span>
              </button>

              <button
                onClick={handleAddToList}
                className="flex flex-col items-center gap-1 hover:text-yellow-400 transition-colors"
              >
                <i className="fa-solid fa-plus text-2xl" />
                <span className="text-xs">Thêm vào</span>
              </button>

              <button
                onClick={handleShare}
                className="flex flex-col items-center gap-1 hover:text-yellow-400 transition-colors"
              >
                <i className="fa-solid fa-paper-plane text-2xl" />
                <span className="text-xs">Chia sẻ</span>
              </button>

              <button
                onClick={handleComment}
                className="flex flex-col items-center gap-1 hover:text-yellow-400 transition-colors"
              >
                <i className="fa-solid fa-comment text-2xl" />
                <span className="text-xs">Bình luận</span>
              </button>
            </div>
          </div>
        </div>

        {/* Rating Badge - Bottom Right */}
        <div className="absolute bottom-16 right-8">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full flex items-center gap-2 font-semibold shadow-lg transition-all">
            <i className="fa-solid fa-smile text-xl" />
            <span className="text-lg">{parseFloat(movie.rating).toFixed(1)}</span>
            <span className="text-sm">Đánh giá</span>
          </button>
        </div>
      </section>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );
};

export default HeroBanner;
