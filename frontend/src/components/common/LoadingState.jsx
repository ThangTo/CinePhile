import React from "react";

/**
 * Full-screen loading state styled like AccountPage loading
 * @param {string} message - Loading message to display
 * @param {string} className - Additional classes
 */
const LoadingState = ({
  message = "Đang tải...",
  className = "min-h-dvh bg-account-bg-primary text-account-text-primary",
}) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className="flex items-center justify-center gap-1.5 h-8">
        <div className="w-1.5 h-6 bg-account-accent rounded-full animate-bounce" />

        <div
          className="w-1.5 h-8 bg-account-accent rounded-full animate-bounce"
          style={{ animationDelay: "-0.2s" }}
        />

        <div
          className="w-1.5 h-6 bg-account-accent rounded-full animate-bounce"
          style={{ animationDelay: "-0.4s" }}
        />
      </div>

      {/* Message */}
      {/* {message && <span className="text-sm text-account-text-primary font-medium">{message}</span>} */}
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

export const BarSpinner = ({ message = "Đang xử lý...", className = "" }) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className="flex items-center justify-center gap-1.5 h-8">
        <div className="w-1.5 h-6 bg-account-accent rounded-full animate-bounce" />

        <div
          className="w-1.5 h-8 bg-account-accent rounded-full animate-bounce"
          style={{ animationDelay: "-0.2s" }}
        />

        <div
          className="w-1.5 h-6 bg-account-accent rounded-full animate-bounce"
          style={{ animationDelay: "-0.4s" }}
        />
      </div>

      {/* Message */}
      {/* {message && <span className="text-sm text-account-text-primary font-medium">{message}</span>} */}
    </div>
  );
};

export default LoadingState;
