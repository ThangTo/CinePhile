import React from "react";

/**
 * Reusable Dropdown Grid Component
 * Displays items in a responsive grid layout
 * @param {Object} props
 * @param {Array} props.items - Array of items { label, href }
 * @param {number} props.columns - Number of columns (default: 4)
 * @param {Function} props.onItemClick - Optional callback when item is clicked
 * @param {string} props.className - Additional classes
 */
const DropdownGrid = ({ items, columns = 4, onItemClick, className = "" }) => {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-2 ${className}`}>
      {items.map((item) => (
        <a
          key={item.label}
          href={item.href}
          title={item.label}
          onClick={onItemClick}
          className="rounded-md bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-colors flex items-center justify-center p-2 text-sm text-gray-200 hover:text-primaryColor whitespace-nowrap overflow-hidden text-ellipsis"
        >
          {item.label}
        </a>
      ))}
    </div>
  );
};

export default DropdownGrid;
