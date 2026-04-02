import { useState, useRef, useEffect } from "react";

// Global state to track active hover card and close others
let activeHoverCardRef = null;

/**
 * Custom hook for movie hover card logic
 * @param {number} showDelay - Delay before showing hover card (ms) - set to 0 for instant
 * @param {number} hideDelay - Delay before hiding hover card (ms) - set to 0 for instant
 * @returns {Object} Hook state and handlers
 */
export const useMovieHover = (showDelay = 0, hideDelay = 0) => {
  const [showHoverCard, setShowHoverCard] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const hoverTimeoutRef = useRef(null);
  const hideTimeoutRef = useRef(null);
  const instanceRef = useRef({ close: null });

  // Set up close function
  useEffect(() => {
    instanceRef.current.close = () => {
      // Clear all timeouts
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }

      // Close immediately
      setIsAnimating(false);
      setShowHoverCard(false);

      // Clear active reference if this was the active one
      if (activeHoverCardRef === instanceRef.current) {
        activeHoverCardRef = null;
      }
    };
  }, []);

  useEffect(() => {
    const currentInstance = instanceRef.current;
    // Cleanup timeouts on unmount
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);

      // Clear active reference if this was the active one
      if (activeHoverCardRef === currentInstance) {
        activeHoverCardRef = null;
      }
    };
  }, []);

  const handleMouseEnter = () => {
    // Close any other active hover card immediately
    if (activeHoverCardRef && activeHoverCardRef !== instanceRef.current) {
      activeHoverCardRef.close?.();
    }

    // Clear any pending hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    // Show hover card (with optional delay)
    if (showDelay > 0) {
      hoverTimeoutRef.current = setTimeout(() => {
        activeHoverCardRef = instanceRef.current;
        setShowHoverCard(true);
        setIsAnimating(true);
      }, showDelay);
    } else {
      // Instant show
      activeHoverCardRef = instanceRef.current;
      setShowHoverCard(true);
      setIsAnimating(true);
    }
  };

  const handleMouseLeave = () => {
    // Clear show timeout if mouse leaves before card appears
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    // Hide immediately (no delay)
    if (hideDelay > 0) {
      hideTimeoutRef.current = setTimeout(() => {
        if (activeHoverCardRef === instanceRef.current) {
          activeHoverCardRef = null;
        }
        setIsAnimating(false);
        setShowHoverCard(false);
      }, hideDelay);
    } else {
      // Instant hide
      if (activeHoverCardRef === instanceRef.current) {
        activeHoverCardRef = null;
      }
      setIsAnimating(false);
      setShowHoverCard(false);
    }
  };

  return {
    showHoverCard,
    isAnimating,
    handleMouseEnter,
    handleMouseLeave,
  };
};
