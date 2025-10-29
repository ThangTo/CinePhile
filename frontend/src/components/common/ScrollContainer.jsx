import React, { useRef, useState, useEffect } from "react";

/**
 * Reusable horizontal scroll container with navigation arrows
 * @param {Object} props
 * @param {React.ReactNode} props.children - Items to display
 * @param {string} props.gap - Gap between items (Tailwind class)
 * @param {boolean} props.showArrows - Show navigation arrows on desktop
 * @param {string} props.className - Additional classes
 */
const ScrollContainer = ({ children, gap = "gap-4", showArrows = true, className = "" }) => {
  const scrollerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Function to check scroll position
  const checkScrollPosition = () => {
    const el = scrollerRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = Math.max(0, scrollWidth - clientWidth);
    // Tolerance to avoid float precision issues
    const isAtStart = scrollLeft <= 1;
    const isAtEnd = scrollLeft >= maxScroll - 1;

    setCanScrollLeft(!isAtStart);
    setCanScrollRight(!isAtEnd);
  };

  // Check scroll position on mount and when children change
  useEffect(() => {
    checkScrollPosition();
    // Also check after a delay to ensure DOM is fully rendered
    const timeout = setTimeout(checkScrollPosition, 100);
    return () => clearTimeout(timeout);
  }, [children]);

  // Listen to scroll events
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    el.addEventListener("scroll", checkScrollPosition);
    // Also check on resize
    window.addEventListener("resize", checkScrollPosition);

    return () => {
      el.removeEventListener("scroll", checkScrollPosition);
      window.removeEventListener("resize", checkScrollPosition);
    };
  }, []);

  const scrollByCard = (direction) => {
    const el = scrollerRef.current;
    if (!el) return;

    // Check if can scroll in this direction
    if (direction === 'left' && !canScrollLeft) return;
    if (direction === 'right' && !canScrollRight) return;

    // Get all children elements (movie cards)
    const children = Array.from(el.children);
    if (children.length === 0) return;

    // Get first child element to calculate card width
    const firstChild = children[0];
    if (!firstChild) return;

    // Get computed width of first card using getBoundingClientRect for accurate measurement
    const cardRect = firstChild.getBoundingClientRect();
    const cardWidth = cardRect.width;
    if (!cardWidth) return;
    
    // Get gap value from computed style (handles responsive gaps - 0)
    const computedStyle = window.getComputedStyle(el);
    // Try to get gap or columnGap (for flexbox, columnGap is used)
    const gapString = computedStyle.columnGap || computedStyle.gap || '0';
    const gapValue = parseFloat(gapString) || 0;
    
    // Scroll by card width + gap and CLAMP to bounds so no extra trailing space
    const scrollAmount = cardWidth + gapValue;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const target = direction === 'left'
      ? Math.max(0, el.scrollLeft - scrollAmount)
      : Math.min(maxScroll, el.scrollLeft + scrollAmount);
    
    el.scrollTo({ left: target, behavior: "smooth" });
    
    // Check position after scroll (with delay to account for smooth scroll)
    setTimeout(checkScrollPosition, 300);
  };

  return (
    <div className={`relative ${className}`}>
      <div
        ref={scrollerRef}
        className={`flex ${gap} overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing select-none lg:py-6`}
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
          overflowY: "visible",
        }}
        onMouseDown={(e) => {
          const el = e.currentTarget;
          el.style.cursor = "grabbing";
          const startX = e.pageX - el.offsetLeft;
          const scrollLeft = el.scrollLeft;

          const onMouseMove = (e) => {
            const x = e.pageX - el.offsetLeft;
            const walk = (x - startX) * 2; // Scroll speed multiplier
            el.scrollLeft = scrollLeft - walk;
          };

          const onMouseUp = () => {
            el.style.cursor = "grab";
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
          };

          document.addEventListener("mousemove", onMouseMove);
          document.addEventListener("mouseup", onMouseUp);
        }}
      >
        {children}
      </div>

      {showArrows && (
        <>
          {canScrollLeft && (
            <button
              onClick={() => scrollByCard('left')}
              className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full bg-white text-black shadow-lg hover:bg-gray-100 transition-colors z-20 cursor-pointer"
              aria-label="Scroll left"
            >
              <i className="fa-solid fa-chevron-left text-lg"></i>
            </button>
          )}
          {canScrollRight && (
            <button
              onClick={() => scrollByCard('right')}
              className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full bg-white text-black shadow-lg hover:bg-gray-100 transition-colors z-20 cursor-pointer"
              aria-label="Scroll right"
            >
              <i className="fa-solid fa-chevron-right text-lg"></i>
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default ScrollContainer;
