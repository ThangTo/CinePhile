import React, { useState } from "react";
import CommentInput from "./CommentInput";
import CommentsList from "./CommentsList";
import useToast from "../../hooks/useToast";
import useAuth from "../../hooks/useAuth";
import ToastContainer from "../common/ToastContainer";
import AuthModal from "../auth/AuthModal";

const CommentsSection = ({ movie }) => {
  const [activeView, setActiveView] = useState("comments"); // "comments" or "ratings"
  const [commentText, setCommentText] = useState("");
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const { toasts, removeToast, success, warning } = useToast();
  const { isAuthenticated, showAuthModal, authMode, openAuthModal, closeAuthModal } = useAuth();

  const handleSubmitComment = () => {
    if (!isAuthenticated) {
      openAuthModal("login");
      return;
    }
    if (!commentText.trim()) {
      warning("Vui lòng nhập nội dung bình luận!");
      return;
    }
    // TODO: Integrate with backend
    success("Bình luận của bạn đã được gửi!");
    setCommentText("");
  };

  const handleLike = (commentId) => {
    if (!isAuthenticated) {
      openAuthModal("login");
      return;
    }
    success("Đã thích bình luận!");
  };

  const handleDislike = (commentId) => {
    if (!isAuthenticated) {
      openAuthModal("login");
      return;
    }
    warning("Đã bỏ thích bình luận!");
  };

  const handleReply = (commentId) => {
    if (!isAuthenticated) {
      openAuthModal("login");
      return;
    }
    warning("Chức năng trả lời đang được phát triển!");
  };

  const handleMore = (commentId) => {
    if (!isAuthenticated) {
      openAuthModal("login");
      return;
    }
    warning("Thêm tùy chọn...");
  };

  // Limit comments to 10 initially
  const displayedComments = showAllComments ? movie.comments : movie.comments.slice(0, 10);

  const hasMoreComments = movie.comments.length > 10;

  return (
    <>
      <section className="px-4 py-16 lg:py-8 comments-section">
        {/* Header - Toggle Buttons */}
        <div className="mb-6">
          {/* Mobile: Full width buttons */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => setActiveView("comments")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                activeView === "comments"
                  ? "bg-bgColor3 text-white border-2 border-white/20"
                  : "bg-bgColor/50 text-gray-400 border-2 border-transparent"
              }`}
            >
              <i className="fa-solid fa-comment" />
              <span>Bình luận ({movie.comments.length})</span>
            </button>

            <button
              onClick={() => setActiveView("ratings")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                activeView === "ratings"
                  ? "bg-bgColor3 text-white border-2 border-white/20"
                  : "bg-bgColor/50 text-gray-400 border-2 border-transparent"
              }`}
            >
              <i className="fa-solid fa-star" />
              <span>Đánh giá</span>
            </button>
          </div>

          {/* Desktop: Compact toggle */}
          <div className="hidden lg:flex items-center gap-4">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-comment text-2xl text-white" />
              <span className="text-2xl font-semibold text-white">Bình luận</span>
              <span className="text-2xl font-semibold text-white">({movie.comments.length})</span>
            </div>
            <div className="inline-flex items-center bg-bgColor rounded-lg p-1 border border-white/10">
              <button
                onClick={() => setActiveView("comments")}
                className={`px-2 py-1 rounded-md font-medium transition-all text-sm ${
                  activeView === "comments"
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Bình luận
              </button>
              <button
                onClick={() => setActiveView("ratings")}
                className={`px-2 py-1 rounded-md font-medium transition-all text-sm ${
                  activeView === "ratings"
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Đánh giá
              </button>
            </div>
          </div>
        </div>

        {/* Comment Input */}
        {activeView === "comments" && (
          <CommentInput
            commentText={commentText}
            setCommentText={setCommentText}
            isSpoiler={isSpoiler}
            setIsSpoiler={setIsSpoiler}
            onSubmit={handleSubmitComment}
            isAuthenticated={isAuthenticated}
            onOpenAuth={openAuthModal}
          />
        )}

        {/* Comments List */}
        {activeView === "comments" && (
          <CommentsList
            comments={displayedComments}
            onLike={handleLike}
            onDislike={handleDislike}
            onReply={handleReply}
            onMore={handleMore}
            showAll={showAllComments}
            onShowMore={() => setShowAllComments(true)}
            hasMore={hasMoreComments}
            className="pt-4 lg:pt-0 space-y-3 lg:space-y-4"
          />
        )}

        {/* Ratings View (Placeholder) */}
        {activeView === "ratings" && (
          <div className="text-center py-12 text-gray-400">
            <i className="fa-solid fa-star text-4xl mb-4 opacity-50" />
            <p>Chức năng đánh giá đang được phát triển...</p>
          </div>
        )}
      </section>

      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={closeAuthModal} initialMode={authMode} />
    </>
  );
};

export default CommentsSection;
