import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useMovieHover } from "../../hooks/useMovieHover";
import MovieHoverCard from "../MovieCard/MovieHoverCard";

const WithHoverCard = ({
  children,
  movie,
  className = "relative flex-shrink-0",
  hoverPosition = "-left-20 -top-4",
  showDelay = 1000,
  hideDelay = 100,
  viewportPaddingLeft = 16,
  viewportPaddingRight = 34,
  onClick,
  // showHoverOn: Tailwind breakpoint name where hover popup becomes visible (e.g., 'md' or 'lg').
  // If set to 'none' the popup will always be visible (no hidden class).
  showHoverOn = "lg",
  // hoverCardClass: class applied to the hover card container (controls width/size).
  hoverCardClass = "w-[400px]",
  // compact: render a denser/smaller hover content to fit small cards
  compact = false,
}) => {
  const { showHoverCard, isAnimating, handleMouseEnter, handleMouseLeave } = useMovieHover(
    showDelay,
    hideDelay
  );

  const wrapperRef = useRef(null);
  const hoverShellRef = useRef(null);

  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // cờ để biết con trỏ đang nằm trong wrapper (đang hover thật sự)
  const isPointerInsideRef = useRef(false);

  // rAF lock để gộp nhiều sự kiện vào 1 frame
  const rafIdRef = useRef(null);

  const computeAndClamp = () => {
    if (!wrapperRef.current || !hoverShellRef.current) return;

    const shellRect = hoverShellRef.current.getBoundingClientRect();
    const vw = window.innerWidth;

    const overflowLeft = viewportPaddingLeft - shellRect.left;
    const overflowRight = shellRect.right - (vw - viewportPaddingRight);

    let dx = 0;
    if (overflowLeft > 0) dx += overflowLeft;
    if (overflowRight > 0) dx -= overflowRight;

    // làm tròn để tránh sub-pixel gây nhấp nháy
    dx = Math.round(dx);

    setOffset((prev) => (prev.x !== dx ? { x: dx, y: 0 } : prev));
  };

  const scheduleCompute = () => {
    if (rafIdRef.current != null) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      computeAndClamp();
    });
  };

  // Khi hover card vừa hiện: đo 1 lần
  useLayoutEffect(() => {
    if (!showHoverCard) {
      setOffset({ x: 0, y: 0 });
      return;
    }
    scheduleCompute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHoverCard, hoverPosition, movie]);

  // Resize: cho phép tính lại nhưng gộp bằng rAF và debounce nhẹ
  useEffect(() => {
    if (!showHoverCard) return;

    let debounceTimer = null;
    const onResize = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        scheduleCompute();
      }, 80);
    };

    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      clearTimeout(debounceTimer);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHoverCard]);

  useEffect(() => {
    if (!showHoverCard) return;

    const onScroll = () => {
      if (isPointerInsideRef.current) return;
      scheduleCompute();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHoverCard]);

  const onEnter = (e) => {
    isPointerInsideRef.current = true;
    handleMouseEnter(e);
  };
  const onLeave = (e) => {
    isPointerInsideRef.current = false;
    handleMouseLeave(e);
  };

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{ zIndex: showHoverCard ? 10000 : 1 }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      {children}

      {showHoverCard && (
        <div
          ref={hoverShellRef}
          className={`absolute ${hoverPosition} pointer-events-auto ${
            showHoverOn === "none" ? "block" : `hidden ${showHoverOn}:block`
          }`}
          style={{
            zIndex: 9999,
            transform: `translate(${offset.x}px, ${offset.y}px)`,
            transformOrigin: "center center",
          }}
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
        >
            <div className={isAnimating ? "animate-pop-up" : "opacity-0"}>
              <MovieHoverCard movie={movie} hoverClass={hoverCardClass} compact={compact} />
            </div>
        </div>
      )}
    </div>
  );
};

export default WithHoverCard;



