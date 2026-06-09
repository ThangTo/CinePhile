import React, { useState, useRef } from "react";
import DropdownGrid from "./DropdownGrid";
import { Link } from "react-router-dom";

/**
 * Reusable Dropdown Menu Component
 * Works for both mobile and desktop with different layouts
 * @param {Object} props
 * @param {string} props.label - Dropdown trigger label
 * @param {Array} props.items - Array of dropdown items { label, href }
 * @param {boolean} props.isMobile - Mobile or desktop layout
 * @param {string} props.className - Additional classes for trigger
 */
const DropdownMenu = ({ label, items, isMobile = false, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Desktop: Hover-based dropdown with ::after arrow
  if (!isMobile) {
    return (
      <div className="relative group">
        <Link
          to="/"
          className={`text-white hover:text-primaryColor transition-colors flex items-center gap-1 ${className}`}
          onClick={(e) => e.preventDefault()}
        >
          <span>{label}</span>
          <i className="fa-solid fa-chevron-down text-[10px] transition-transform duration-200 group-hover:rotate-180" />
        </Link>

        {/* Desktop Dropdown */}
        <div className="absolute left-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
          <div className="bg-bgColor4 xl:block hidden backdrop-blur-sm rounded-xl shadow-2xl border border-white/10 p-4 w-[min(90vw,48rem)] max-h-[60vh] overflow-y-auto overflow-x-hidden overscroll-contain pretty-scroll">
            <DropdownGrid items={items} columns={4} />
          </div>
          <div className="bg-bgColor4 lg:block xl:hidden backdrop-blur-sm rounded-xl shadow-2xl border border-white/10 p-4 w-[min(90vw,32rem)] max-h-[80vh] overflow-y-auto overflow-x-hidden overscroll-contain pretty-scroll">
            <DropdownGrid items={items} columns={3} />
          </div>
        </div>
      </div>
    );
  }

  // Mobile: Click-based dropdown
  return (
    <>
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center justify-start w-full text-white hover:text-hoverLinkColor transition-colors py-2 ${className}`}
        >
          <span>{label}</span>
          <i
            className={`fa-solid fa-chevron-down text-xs ml-2 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {/* Mobile Dropdown - Fixed positioning outside container */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="fixed top-[var(--app-header-total-height)] left-0 right-0 mx-2 sm:mx-4 bg-bgColor4 backdrop-blur-md rounded-xl shadow-2xl border border-white/20 p-4 max-h-[calc(100dvh-var(--app-header-total-height)-var(--safe-bottom)-1rem)] overflow-y-auto pretty-scroll animate-slideDown"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/10">
              <h3 className="text-white font-semibold">{label}</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors p-1"
                aria-label="Close"
              >
                <i className="fa-solid fa-times text-xl" />
              </button>
            </div>
            <DropdownGrid items={items} columns={2} onItemClick={() => setIsOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
};

export default DropdownMenu;
