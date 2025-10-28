import React from "react";

/**
 * Action Button Component - Reusable circular button with icon
 * @param {Object} props
 * @param {string} props.icon - FontAwesome icon class (e.g. "fa-play")
 * @param {Function} props.onClick - Click handler
 * @param {string} props.variant - Button style variant: "primary" | "default"
 * @param {string} props.size - Button size: "sm" | "md" | "lg"
 * @param {string} props.ariaLabel - Accessibility label
 */
const ActionButton = ({ icon, onClick, variant = "default", size = "md", ariaLabel }) => {
  const sizeClasses = {
    sm: "h-10 w-10",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  };

  const variantClasses = {
    primary:
      "bg-amber-400 text-black opacity-80 shadow-md transition-all duration-300 hover:shadow-[0_0_25px_5px_rgba(250,204,21,0.8)] hover:scale-105",
    default:
      "bg-white/10 text-white hover:bg-white/20 hover:text-primaryColor border border-white/15 transition-all duration-300",
  };

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-full ${sizeClasses[size]} ${variantClasses[variant]}`}
      aria-label={ariaLabel}
    >
      <i className={`fa-solid ${icon} ${size === "lg" ? "text-xl" : ""}`} />
    </button>
  );
};

export default ActionButton;
