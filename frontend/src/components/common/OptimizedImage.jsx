import React, { useState, useEffect, useRef, useMemo } from "react";
import { preloadImage } from "utils/imagePreloader";
import { useSectionVisible } from "components/common/LazySection";
import imageCache from "utils/imageCache";
import { getOptimizedImageUrl } from "constants/imageSizes";

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
  fallbackSrcs = [],
  alt = "",
  className = "",
  placeholder = null,
  onLoad,
  onError,
  preloadOnHover = true,
  lazy = true,
  priority = false, // If true, load immediately without lazy loading
  sizeKey = null, // Use size key from constants (THUMBNAIL, CARD, DETAIL, BANNER, SIDEBAR)
  size = null, // Custom size (backward compatible)
  quality = null, // Custom quality (backward compatible)
  ...props
}) => {
  // Check if section is visible (from LazySection context)
  const sectionVisible = useSectionVisible();

  const allSrcs = useMemo(() => [src, ...(fallbackSrcs || [])].filter(Boolean), [src, fallbackSrcs]);
  const [currentSrcIndex, setCurrentSrcIndex] = useState(0);
  const activeSrc = allSrcs[currentSrcIndex] || null;

  // Reset index when root src changes
  useEffect(() => {
    setCurrentSrcIndex(0);
  }, [src]);

  // Generate optimized URL once using useMemo
  // Priority: sizeKey > size/quality (backward compatible)
  const optimizedUrl = useMemo(() => {
    if (!activeSrc) return null;

    if (sizeKey) {
      // Use standardized size from constants
      return getOptimizedImageUrl(activeSrc, sizeKey);
    } else {
      // Use custom size/quality (backward compatible)
      const finalSize = size || 400;
      const finalQuality = quality || 100;
      return `https://images.weserv.nl/?url=${activeSrc}&w=${finalSize}&q=${finalQuality}&output=webp`;
    }
  }, [activeSrc, sizeKey, size, quality]);

  // If lazy is false or priority is true, or section is visible, load immediately
  const shouldLoadImmediately = !lazy || priority || sectionVisible;
  const [imageSrc, setImageSrc] = useState(shouldLoadImmediately ? optimizedUrl : null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(shouldLoadImmediately);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority || sectionVisible || isInView || !optimizedUrl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            // Check cache before setting src
            if (imageCache.isCached(optimizedUrl)) {
              setIsLoaded(true);
            }
            setImageSrc(optimizedUrl);
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
  }, [lazy, priority, sectionVisible, optimizedUrl, isInView]);

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
  }, [preloadOnHover, imageSrc, isLoaded, optimizedUrl]);

  // Load image when src changes
  // For priority images, use native img onload instead of creating new Image object
  useEffect(() => {
    if (!imageSrc) return;

    // If priority, skip preloading with Image object - let native img tag handle it
    if (priority) {
      // For priority images, we'll rely on the img tag's onload event
      return;
    }

    // For non-priority images, preload to check if it loads successfully
    const img = new Image();
    img.onload = () => {
      setIsLoaded(true);
      if (onLoad) onLoad();
    };
    img.onerror = () => {
      if (currentSrcIndex < allSrcs.length - 1) {
        setCurrentSrcIndex((prev) => prev + 1);
      } else {
        setHasError(true);
        if (onError) onError();
      }
    };
    img.src = imageSrc;
  }, [imageSrc, onLoad, onError, priority]);

  // If lazy is false or priority is true, or section is visible, load immediately when src changes
  useEffect(() => {
    if (shouldLoadImmediately && optimizedUrl) {
      // Reset states when URL changes
      setIsLoaded(false);
      setHasError(false);

      // Check cache first - if cached, mark as loaded immediately
      const cached = imageCache.isCached(optimizedUrl);
      if (cached) {
        setIsLoaded(true);
      }

      setImageSrc(optimizedUrl);
      setIsInView(true);
    }
  }, [shouldLoadImmediately, optimizedUrl, sectionVisible]);

  // Re-check cache when imageSrc changes (in case image was preloaded after component mount)
  useEffect(() => {
    if (!imageSrc || hasError) return;

    // Always check cache first when imageSrc changes
    if (imageCache.isCached(imageSrc)) {
      setIsLoaded(true);
      return;
    }

    // If not in cache, check if image is already in browser cache
    // This handles the case where image was preloaded but not yet in our cache
    const testImg = new Image();
    let isHandled = false;

    // Set up load handler before setting src
    testImg.onload = () => {
      if (!isHandled && testImg.complete && testImg.naturalWidth > 0) {
        isHandled = true;
        setIsLoaded(true);
        imageCache.markAsLoaded(imageSrc);
      }
    };

    testImg.onerror = () => {
      // Image failed to load, don't mark as loaded
      isHandled = true;
      if (currentSrcIndex < allSrcs.length - 1) {
        setCurrentSrcIndex((prev) => prev + 1);
      }
    };

    testImg.src = imageSrc;

    // Check immediately if image is already in browser cache
    // Use requestAnimationFrame to check after browser has a chance to load from cache
    requestAnimationFrame(() => {
      if (!isHandled && testImg.complete && testImg.naturalWidth > 0) {
        isHandled = true;
        setIsLoaded(true);
        imageCache.markAsLoaded(imageSrc);
      }
    });
  }, [imageSrc, hasError]);

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
          {/* {placeholder || (
            <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          )} */}
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
          src={imageSrc}
          alt={alt}
          className={`${
            isLoaded ? "opacity-100" : "opacity-0"
          } transition-opacity duration-300 ${className}`}
          draggable="false"
          loading={priority ? "eager" : "lazy"}
          onLoad={(e) => {
            // Check if image was already loaded (from cache/preload)
            // If image.complete is true, it means it loaded instantly (from cache)
            if (e.target.complete && e.target.naturalWidth > 0) {
              setIsLoaded(true);
              // Mark as cached for future use
              if (imageSrc) {
                imageCache.markAsLoaded(imageSrc);
              }
              if (onLoad) onLoad();
            } else if (priority || !isLoaded) {
              setIsLoaded(true);
              // Mark as cached for future use
              if (imageSrc) {
                imageCache.markAsLoaded(imageSrc);
              }
              if (onLoad) onLoad();
            }
          }}
          onError={() => {
            if (currentSrcIndex < allSrcs.length - 1) {
              setCurrentSrcIndex((prev) => prev + 1);
              return;
            }
            setHasError(true);
            // Mark as failed to avoid retrying
            if (imageSrc) {
              imageCache.markAsFailed(imageSrc);
            }
            if (onError) onError();
          }}
        />
      )}
    </div>
  );
};

export default OptimizedImage;
