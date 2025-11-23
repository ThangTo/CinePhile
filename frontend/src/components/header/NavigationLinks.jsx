import React from "react";
import { GENRE_CATEGORIES, COUNTRY_CATEGORIES } from "./constants";
import DropdownMenu from "./DropdownMenu";

/**
 * Navigation Links Component - Flexible navigation for mobile and desktop
 * @param {Object} props
 * @param {string} props.className - Additional classes
 * @param {boolean} props.isMobile - Mobile or desktop layout
 */
const NavigationLinks = ({ className = "", isMobile = false }) => {
  const links = [
    { label: "Phim Lẻ", href: "/phim-le", type: "link" },
    { label: "Phim Bộ", href: "/phim-bo", type: "link" },
    { label: "Thể loại", type: "dropdown", items: GENRE_CATEGORIES },
    { label: "Quốc gia", type: "dropdown", items: COUNTRY_CATEGORIES },
    { label: "Xem Chung", href: "/xem-chung", type: "link" },
  ];

  // Mobile: Grid layout with dropdowns
  if (isMobile) {
    return (
      <div className={`grid grid-cols-2 gap-2 font-medium ${className}`}>
        {links.map((link) =>
          link.type === "dropdown" ? (
            <DropdownMenu key={link.label} label={link.label} items={link.items} isMobile={true} />
          ) : (
            <a
              key={link.label}
              href={link.href}
              className="block text-white hover:text-hoverLinkColor transition-colors py-2"
            >
              {link.label}
            </a>
          )
        )}
      </div>
    );
  }

  // Desktop: Horizontal layout with hover dropdowns
  return (
    <nav className={className}>
      {links.map((link) =>
        link.type === "dropdown" ? (
          <DropdownMenu key={link.label} label={link.label} items={link.items} isMobile={false} />
        ) : (
          <a
            key={link.label}
            href={link.href}
            className="text-white hover:text-primaryColor transition-colors"
          >
            {link.label}
          </a>
        )
      )}
    </nav>
  );
};

export default NavigationLinks;
