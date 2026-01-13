import React from "react";
import { Link } from "react-router-dom";

/**
 * Reusable section header with title and optional link
 * @param {Object} props
 * @param {string} props.title - Section title
 * @param {string} props.linkText - Link text (optional)
 * @param {string} props.linkHref - Link URL (optional)
 * @param {string} props.className - Additional classes
 */
const SectionHeader = ({ title, linkText, linkHref, isActive, className = "" }) => {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      <h3 className={`text-xl sm:text-2xl font-bold ${isActive ? "text-primaryColor" : ""}`}>
        {title}
      </h3>
      {linkText && linkHref && (
        <Link
          to={linkHref}
          className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors hidden sm:block"
        >
          {linkText} →
        </Link>
      )}
    </div>
  );
};

export default SectionHeader;
