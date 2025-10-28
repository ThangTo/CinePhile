import { useState, useRef, useEffect } from "react";

/**
 * Custom hook for movie hover card logic
 * @param {number} showDelay - Delay before showing hover card (ms)
 * @param {number} hideDelay - Delay before hiding hover card (ms)
 * @returns {Object} Hook state and handlers
 */
export const useMovieHover = (showDelay = 500, hideDelay = 100) => {
  const [showHoverCard, setShowHoverCard] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const hoverTimeoutRef = useRef(null);
  const hideTimeoutRef = useRef(null);

  useEffect(() => {
    // Cleanup timeouts on unmount
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    // Clear any pending hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    // Show hover card after delay
    hoverTimeoutRef.current = setTimeout(() => {
      setShowHoverCard(true);
      setIsAnimating(true);
    }, showDelay);
  };

  const handleMouseLeave = () => {
    // Clear show timeout if mouse leaves before card appears
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    // Delay hiding to allow mouse to move to hover card
    hideTimeoutRef.current = setTimeout(() => {
      setIsAnimating(false);
      // Wait for animation to complete before removing from DOM
      setTimeout(() => {
        setShowHoverCard(false);
      }, 200);
    }, hideDelay);
  };

  return {
    showHoverCard,
    isAnimating,
    handleMouseEnter,
    handleMouseLeave,
  };
};
