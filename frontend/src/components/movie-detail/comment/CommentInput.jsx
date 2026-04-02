import React from "react";
import useAuth from "hooks/useAuth";
import { isPremiumActive } from "utils/premiumUtils";
import PremiumAvatar from "components/common/PremiumAvatar";

const CommentInput = ({
  commentText,
  setCommentText,
  // isSpoiler,
  // setIsSpoiler,
  onSubmit,
  isAuthenticated,
  onOpenAuth,
  isSubmitting = false,
}) => {
  const { user } = useAuth();

  return (
    <>
      {!isAuthenticated && (
        <div className="mb-3">
          <p className="text-sm text-gray-400">
            Vui lòng{" "}
            <button
              onClick={() => onOpenAuth("login")}
              className="text-primaryColor font-medium hover:underline transition-all"
            >
              đăng nhập
            </button>{" "}
            để tham gia bình luận.
          </p>
        </div>
      )}

      <div className="bg-bgColor3 backdrop-blur-sm p-4 rounded-xl mb-6 border border-white/10">
        {/* User Identity Header */}
        {isAuthenticated && user && (
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
            <PremiumAvatar
              src={user.avatar}
              alt={user.username || "User"}
              size="w-10 h-10"
              isPremium={isPremiumActive(user)}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${isPremiumActive(user) ? "text-primaryColor" : "text-white"}`}>
                  {user.username || "Người dùng"}
                </span>
                {isPremiumActive(user) && (
                  <span className="inline-flex items-center gap-1 bg-gradient-to-r from-primaryColor to-hoverPrimaryColor text-primaryColorButtonText px-2 py-0.5 rounded-full text-xs font-bold shadow-sm">
                    <i className="fa-solid fa-crown text-[9px]" />
                    <span>Premium</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">Bình luận với tên {user.username}</p>
            </div>
          </div>
        )}

        {/* Textarea */}
        <div className="relative">
          <textarea
            placeholder="Viết bình luận"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            maxLength={1000}
            className="w-full h-32 text-white p-3 rounded-lg border resize-none focus:border-primaryColor focus:outline-none transition-colors placeholder:text-gray-500 bg-bgColor border-gray-700"
          />
          <span className="absolute top-2 right-3 text-xs text-gray-400">
            {commentText.length} / 1000
          </span>
        </div>

        <div className="flex items-center justify-end mt-3">
          {/* <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-sm text-gray-400">Tiết lộ?</span>
            <input
              type="checkbox"
              className="peer sr-only"
              checked={isSpoiler}
              onChange={(e) => setIsSpoiler(e.target.checked)}
            />
            <span className="relative inline-block h-5 w-9 rounded-full transition-colors duration-300 peer-checked:bg-primaryColor/70 after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-md after:transition-transform after:duration-300 after:ease-in-out peer-checked:after:translate-x-4 bg-white/20" />
          </label> */}

          <div className="flex items-center gap-3">
            <button
              onClick={onSubmit}
              disabled={isSubmitting || !commentText.trim()}
              className={`font-medium px-5 py-2 rounded-lg flex items-center gap-2 transition-all ${
                isSubmitting || !commentText.trim()
                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                  : "bg-primaryColor hover:bg-primaryColor/90 text-black hover:scale-105"
              }`}
            >
              {isSubmitting ? (
                <>
                  <span>Đang gửi...</span>
                  <i className="fa-solid fa-spinner fa-spin text-sm" />
                </>
              ) : (
                <>
                  <span>Gửi</span>
                  <i className="fa-solid fa-paper-plane text-sm" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default CommentInput;
