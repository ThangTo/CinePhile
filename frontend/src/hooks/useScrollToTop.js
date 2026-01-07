import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * Hook để tự động scroll lên đầu trang khi dependencies thay đổi
 *
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Bật/tắt scroll (default: true)
 * @param {string} options.behavior - Scroll behavior: "smooth" | "auto" | "instant" (default: "smooth")
 * @param {number} options.top - Vị trí scroll top (default: 0)
 * @param {number} options.left - Vị trí scroll left (default: 0)
 * @param {boolean} options.scrollOnPathname - Scroll khi pathname thay đổi (default: true)
 * @param {Array} options.dependencies - Array các dependencies để trigger scroll (default: [])
 * @param {boolean} options.skipInitialMount - Bỏ qua scroll khi component mount lần đầu (default: true)
 * @returns {void}
 *
 * @example
 * // Scroll khi pathname thay đổi (default behavior)
 * useScrollToTop();
 *
 * // Scroll khi page thay đổi
 * useScrollToTop({ scrollOnPathname: false, dependencies: [page] });
 *
 * // Scroll khi cả pathname và page thay đổi
 * useScrollToTop({ dependencies: [page] });
 *
 * // Scroll với instant behavior
 * useScrollToTop({ behavior: "instant" });
 */
const useScrollToTop = (options = {}) => {
  const {
    enabled = true,
    behavior = "smooth",
    top = 0,
    left = 0,
    scrollOnPathname = true,
    dependencies = [],
    skipInitialMount = true,
  } = options;

  const { pathname } = useLocation();
  const prevPathnameRef = useRef(pathname);
  const prevDepsRef = useRef(dependencies);
  const isInitialMountRef = useRef(true);

  // Handle pathname changes
  useEffect(() => {
    if (!enabled || !scrollOnPathname) return;

    const pathnameChanged = prevPathnameRef.current !== pathname;

    // Skip scroll on initial mount if enabled
    if (skipInitialMount && isInitialMountRef.current) {
      isInitialMountRef.current = false;
      prevPathnameRef.current = pathname;
      return;
    }

    // Scroll if pathname changed
    if (pathnameChanged) {
      // Use requestAnimationFrame to ensure DOM has updated before scrolling
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const scrollOptions = { top, left, behavior };
          window.scrollTo(scrollOptions);
          if (document.documentElement) {
            document.documentElement.scrollTo(scrollOptions);
          }
          // Force scroll position after a short delay to ensure it sticks
          if (behavior === "smooth") {
            setTimeout(() => {
              window.scrollTo({ top, left, behavior: "auto" });
              if (document.documentElement) {
                document.documentElement.scrollTop = top;
                document.documentElement.scrollLeft = left;
              }
            }, 100);
          }
        });
      });
      prevPathnameRef.current = pathname;
    }
  }, [enabled, behavior, top, left, scrollOnPathname, pathname, skipInitialMount]);

  // Handle dependency changes
  useEffect(() => {
    if (!enabled || dependencies.length === 0) return;

    // Check if any dependency changed
    const depsChanged = dependencies.some((dep, index) => dep !== prevDepsRef.current[index]);

    // Skip scroll on initial mount if enabled
    if (skipInitialMount && isInitialMountRef.current) {
      isInitialMountRef.current = false;
      prevDepsRef.current = [...dependencies];
      return;
    }

    // Scroll if dependencies changed
    if (depsChanged) {
      // Use requestAnimationFrame to ensure DOM has updated before scrolling
      requestAnimationFrame(() => {
        // Double RAF to ensure layout is complete
        requestAnimationFrame(() => {
          // Try scrolling both window and documentElement for better compatibility
          const scrollOptions = { top, left, behavior };
          window.scrollTo(scrollOptions);
          // Also try documentElement for some browsers
          if (document.documentElement) {
            document.documentElement.scrollTo(scrollOptions);
          }
          // Force scroll position after a short delay to ensure it sticks
          // This handles cases where smooth scroll gets interrupted
          if (behavior === "smooth") {
            setTimeout(() => {
              window.scrollTo({ top, left, behavior: "auto" });
              if (document.documentElement) {
                document.documentElement.scrollTop = top;
                document.documentElement.scrollLeft = left;
              }
            }, 100);
          }
        });
      });
      prevDepsRef.current = [...dependencies];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, behavior, top, left, skipInitialMount, ...dependencies]);
};

export default useScrollToTop;
