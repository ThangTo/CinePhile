import React from "react";
import ActionButton from "./ActionButton";

/**
 * Action Buttons Component - Displays action buttons (play, favorite, info)
 * Hidden on mobile, shown on desktop
 * @param {Object} props
 * @param {Array} props.buttons - Array of button configs with { icon, variant, size, onClick, ariaLabel }
 */
const ActionButtons = ({ buttons }) => (
  <div className="hidden mt-6 sm:flex items-center gap-4">
    {buttons.map((button, idx) => (
      <ActionButton
        key={idx}
        icon={button.icon}
        variant={button.variant}
        size={button.size}
        onClick={button.onClick}
        ariaLabel={button.ariaLabel}
      />
    ))}
  </div>
);

export default ActionButtons;
