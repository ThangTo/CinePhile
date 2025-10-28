import React from "react";

/**
 * Reusable section header with title and optional link
 * @param {Object} props
 * @param {string} props.title - Section title
 * @param {string} props.linkText - Link text (optional)
 * @param {string} props.linkHref - Link URL (optional)
 * @param {string} props.className - Additional classes
 */
const SectionHeader = ({ title, linkText, linkHref, className = "" }) => {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      <h3 className="text-xl sm:text-2xl font-bold">{title}</h3>
      {linkText && linkHref && (
        <a
          href={linkHref}
          className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors hidden sm:block"
        >
          {linkText} →
        </a>
      )}
    </div>
  );
};

export default SectionHeader;
