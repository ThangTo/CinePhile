import React from "react";

/**
 * Reusable responsive grid container
 * @param {Object} props
 * @param {React.ReactNode} props.children - Grid items
 * @param {Object} props.cols - Number of columns per breakpoint
 * @param {string} props.gap - Gap between items (Tailwind class)
 * @param {string} props.className - Additional classes
 */
const ResponsiveGrid = ({
  children,
  cols = { base: 2, lg: 3, xl: 5 },
  gap = "gap-4",
  className = "",
}) => {
  const gridCols = `grid-cols-${cols.base} ${cols.md ? `md:grid-cols-${cols.md}` : ""} ${
    cols.lg ? `lg:grid-cols-${cols.lg}` : ""
  } ${cols.xl ? `xl:grid-cols-${cols.xl}` : ""}`;

  return <div className={`grid ${gridCols} ${gap} ${className}`}>{children}</div>;
};

export default ResponsiveGrid;
