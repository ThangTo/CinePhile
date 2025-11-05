import React from "react";

/**
 * Reusable loading state component
 * @param {string} message - Loading message to display
 * @param {string} className - Additional classes
 */
const LoadingState = ({
  message = "Đang tải...",
  className = "min-h-screen bg-[#0b1220] text-white",
}) => {
  return (
    <div className={`${className} flex items-center justify-center`}>
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primaryColor mb-4"></div>
        <div className="text-xl">{message}</div>
      </div>
    </div>
  );
};

export default LoadingState;
