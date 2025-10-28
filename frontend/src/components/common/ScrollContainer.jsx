import React, { useRef } from "react";

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

  const scrollBy = (delta) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <div className={`relative ${className}`}>
      <div
        ref={scrollerRef}
        className={`flex ${gap} overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing select-none lg:py-6 pr-[50px] `}
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
          <button
            onClick={() => scrollBy(-400)}
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/15 transition-colors"
            aria-label="Scroll left"
          >
            ‹
          </button>
          <button
            onClick={() => scrollBy(400)}
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/15 transition-colors"
            aria-label="Scroll right"
          >
            ›
          </button>
        </>
      )}
    </div>
  );
};

export default ScrollContainer;
