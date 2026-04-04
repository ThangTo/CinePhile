import React, { createContext, useContext, useEffect, useRef, useCallback } from "react";

// ─── Registry: map effectId → canvas component factory ───────────────────────

// Each factory receives canvasRef and returns cleanup fn
// Return null for no-effect.
const EFFECT_REGISTRY = {};

/**
 * Register a cursor effect component factory.
 * @param {string} effectId - Unique effect identifier
 * @param {Function} factory - (canvasRef: RefObject<canvas>) => cleanupFn | null
 */
export const registerCursorEffect = (effectId, factory) => {
  EFFECT_REGISTRY[effectId] = factory;
};

/**
 * Unregister a cursor effect.
 */
export const unregisterCursorEffect = (effectId) => {
  delete EFFECT_REGISTRY[effectId];
};

export const getRegisteredEffectIds = () => Object.keys(EFFECT_REGISTRY);

// ─── Shared state across contexts ────────────────────────────────────────────

// true khi chuột đang ở trong EffectPreview canvas — global context sẽ bỏ qua mousemove
const isLocalActiveRef = { current: false };

// ─── Context ─────────────────────────────────────────────────────────────────

const CursorEffectContext = createContext(null);

export const CursorEffectProvider = ({ children, activeEffectId, canvasRef }) => {
  const cleanupRef = useRef(null);
  const rafRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const needsEmitRef = useRef(false);

  // ── Resize canvas to full viewport ───────────────────────────────────────

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }, [canvasRef]);

  // ── Start a new effect ───────────────────────────────────────────────────

  const startEffect = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const effectId = activeEffectId;
    if (!effectId || effectId === "none") return;

    const factory = EFFECT_REGISTRY[effectId];
    if (!factory) return;

    resizeCanvas();

    const ctx = {
      canvas: canvasRef.current,
      mouseRef,
      needsEmitRef,
      rafRef,
      resizeCanvas,
      registerAnimation: (fn) => {
        const loop = () => {
          fn();
          rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
      },
    };

    cleanupRef.current = factory(ctx) || null;
  }, [activeEffectId, canvasRef, resizeCanvas]);

  // ── Mount / switch / unmount ───────────────────────────────────────────────

  useEffect(() => {
    if (!activeEffectId || activeEffectId === "none") {
      // Cleanup
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      // Clear canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    startEffect();

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [activeEffectId, canvasRef, startEffect]);

  // ── Global resize ──────────────────────────────────────────────────────────

  useEffect(() => {
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  // ── Global mouse tracking (shared by all effects) ───────────────────────────

  useEffect(() => {
    const onMouseMove = (e) => {
      if (isLocalActiveRef.current) return;
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      needsEmitRef.current = true;
    };
    const onTouchMove = (e) => {
      const t = e.touches[0];
      mouseRef.current.x = t.clientX;
      mouseRef.current.y = t.clientY;
      needsEmitRef.current = true;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  return <CursorEffectContext.Provider value={{}}>{children}</CursorEffectContext.Provider>;
};

export const useCursorEffect = () => useContext(CursorEffectContext);

/**
 * Gọi từ EffectPreview khi chuột enter/leave local canvas.
 * Khi localActive = true, global context KHÔNG emit particles.
 */
export const setCursorLocalActive = (active) => {
  isLocalActiveRef.current = active;
};

export default CursorEffectContext;
