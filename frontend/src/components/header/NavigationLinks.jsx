import React from "react";
import { GENRE_CATEGORIES, COUNTRY_CATEGORIES } from "./constants";
import DropdownMenu from "./DropdownMenu";
import useMovieTaxonomies from "hooks/useMovieTaxonomies";
import { Link } from "react-router-dom";

/**
 * Navigation Links Component - Flexible navigation for mobile and desktop
 * @param {Object} props
 * @param {string} props.className - Additional classes
 * @param {boolean} props.isMobile - Mobile or desktop layout
 */
const NavigationLinks = ({ className = "", isMobile = false }) => {
  const { genres, countries } = useMovieTaxonomies();
  const genreItems = genres.length ? genres : GENRE_CATEGORIES;
  const countryItems = countries.length ? countries : COUNTRY_CATEGORIES;

  const links = [
    { label: "Phim Lẻ", href: "/type/phim-le", type: "link" },
    { label: "Phim Bộ", href: "/type/phim-bo", type: "link" },
    { label: "Thể loại", type: "dropdown", items: genreItems },
    { label: "Quốc gia", type: "dropdown", items: countryItems },
  ];

  // Mobile: Grid layout with dropdowns
  if (isMobile) {
    return (
      <div className={`grid grid-cols-2 gap-2 font-medium ${className}`}>
        {links.map((link) =>
          link.type === "dropdown" ? (
            <DropdownMenu key={link.label} label={link.label} items={link.items} isMobile={true} />
          ) : (
            <Link
              key={link.label}
              to={link.href}
              className="block text-white hover:text-hoverLinkColor transition-colors py-2"
            >
              {link.label}
            </Link>
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
          <Link
            key={link.label}
            to={link.href}
            className="text-white hover:text-primaryColor transition-colors"
          >
            {link.label}
          </Link>
        )
      )}
    </nav>
  );
};

export default NavigationLinks;
