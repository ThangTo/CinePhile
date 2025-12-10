import React, { useState, useEffect, useRef } from "react";
import { preloadImage } from "utils/imagePreloader";

/**
 * Optimized Image Component
 * Features:
 * - Lazy loading with Intersection Observer
 * - Preload on hover
 * - Loading placeholder
 * - Error handling
 * - Smooth fade-in animation
 */
const OptimizedImage = ({
  src,
  alt = "",
  className = "",
  placeholder = null,
  onLoad,
  onError,
  preloadOnHover = true,
  lazy = true,
  priority = false, // If true, load immediately without lazy loading
  size = 400,
  quality = 100,
  ...props
}) => {
  // If lazy is false or priority is true, load immediately
  const shouldLoadImmediately = !lazy || priority;
  const [imageSrc, setImageSrc] = useState(shouldLoadImmediately ? src : null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(shouldLoadImmediately);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            setImageSrc(src);
            if (observerRef.current) {
              observerRef.current.disconnect();
            }
          }
        });
      },
      {
        rootMargin: "50px", // Start loading 50px before image enters viewport
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
      observerRef.current = observer;
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [lazy, priority, src, isInView]);

  // Preload on hover
  useEffect(() => {
    if (!preloadOnHover || !imageSrc || isLoaded) return;

    const element = imgRef.current?.parentElement;
    if (!element) return;

    const handleMouseEnter = () => {
      preloadImage(imageSrc).catch(() => {
        // Silently fail if preload fails
      });
    };

    element.addEventListener("mouseenter", handleMouseEnter);
    return () => {
      element.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, [preloadOnHover, imageSrc, isLoaded]);

  // Load image when src changes
  useEffect(() => {
    if (!imageSrc) return;

    const img = new Image();
    img.onload = () => {
      setIsLoaded(true);
      if (onLoad) onLoad();
    };
    img.onerror = () => {
      setHasError(true);
      if (onError) onError();
    };
    img.src = imageSrc;
  }, [imageSrc, onLoad, onError]);

  // If lazy is false or priority is true, load immediately when src changes
  useEffect(() => {
    if (shouldLoadImmediately && src) {
      setImageSrc(src);
      setIsInView(true);
    }
  }, [shouldLoadImmediately, src]);

  // Separate container props from image props
  const { containerClassName, ...restProps } = props;

  return (
    <div
      ref={imgRef}
      className={`relative w-full h-full ${containerClassName ? "" : "overflow-hidden"} ${
        containerClassName || ""
      }`}
      {...restProps}
    >
      {/* Placeholder or loading state */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 animate-pulse flex items-center justify-center">
          {placeholder || (
            <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          )}
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
          <div className="text-gray-500 text-sm text-center px-2">
            <i className="fa-solid fa-image text-2xl mb-2 block" />
            <span>Không thể tải ảnh</span>
          </div>
        </div>
      )}

      {/* Actual image */}
      {imageSrc && (
        <img
          src={`https://images.weserv.nl/?url=${imageSrc}&w=${size}&q=${quality}`}
          alt={alt}
          className={`${isLoaded ? "opacity-100" : "opacity-0"} ${className}`}
          draggable="false"
          loading={priority ? "eager" : "lazy"}
        />
      )}
    </div>
  );
};

export default OptimizedImage;
