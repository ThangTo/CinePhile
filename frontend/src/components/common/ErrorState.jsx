import React from "react";

/**
 * Reusable error state component
 * @param {string} message - Error message to display
 * @param {string} className - Additional classes
 * @param {Function} onRetry - Optional retry callback
 */
const ErrorState = ({
  message = "Không tìm thấy nội dung",
  className = "min-h-dvh bg-bgColor text-white",
  onRetry,
}) => {
  return (
    <div className={`${className} flex items-center justify-center`}>
      <div className="text-center">
        <i className="fa-solid fa-exclamation-circle text-6xl mb-4 text-red-500 opacity-50"></i>
        <div className="text-xl mb-4">{message}</div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-2 bg-primaryColor text-black rounded-full font-semibold hover:bg-primaryColor/80 transition-colors"
          >
            Thử lại
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorState;
