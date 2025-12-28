import { useEffect, useRef, useState } from "react";

/**
 * Hook to detect when an element enters the viewport
 * @param {Object} options - IntersectionObserver options
 * @param {string|number} options.rootMargin - Margin around root (e.g., '100px' or '50%')
 * @param {number} options.threshold - Threshold for intersection (0-1)
 * @param {boolean} options.triggerOnce - Only trigger once when element enters viewport
 * @returns {[React.RefObject, boolean]} - [ref, isIntersecting]
 */
const useIntersectionObserver = ({
  rootMargin = "100px",
  threshold = 0.01,
  triggerOnce = true,
} = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // If already intersected and triggerOnce is true, don't observe again
    if (hasIntersected && triggerOnce) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsIntersecting(true);
            if (triggerOnce) {
              setHasIntersected(true);
              observer.unobserve(element);
            }
          } else if (!triggerOnce) {
            setIsIntersecting(false);
          }
        });
      },
      {
        rootMargin,
        threshold,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [rootMargin, threshold, triggerOnce, hasIntersected]);

  return [elementRef, isIntersecting || hasIntersected];
};

export default useIntersectionObserver;
