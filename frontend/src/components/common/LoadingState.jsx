import React from "react";

/**
 * Full-screen loading state styled like AccountPage loading
 * @param {string} message - Loading message to display
 * @param {string} className - Additional classes
 */
const LoadingState = ({
  message = "Đang tải...",
  className = "min-h-screen bg-account-bg-primary text-account-text-primary",
}) => {
  return (
    <div className={`${className} flex items-center justify-center`}>
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-account-bg-tertiary border-t-account-accent rounded-full animate-spin mx-auto mb-4" />
        <div className="text-xl">{message}</div>
      </div>
    </div>
  );
};

/**
 * Inline loading spinner for sections/cards
 * Uses the same color scheme as AccountPage spinner
 * @param {string} message - Optional inline message
 * @param {string} className - Wrapper classes
 */
export const InlineSpinner = ({ message = "Đang tải...", className = "" }) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex items-center gap-3 text-account-text-primary">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-account-bg-tertiary border-t-account-accent" />
        {message && <span className="text-sm">{message}</span>}
      </div>
    </div>
  );
};

export default LoadingState;
