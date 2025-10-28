/**
 * BannerHome Component Exports
 * Central export point for all BannerHome related components
 */

// Main component
export { default } from "../BannerHome";

// Sub-components (for advanced usage)
export { default as BannerBackground } from "./BannerBackground";
export { default as BannerContent } from "./BannerContent";
export { default as InfoBadge } from "./InfoBadge";
export { default as GenreTag } from "./GenreTag";
export { default as ActionButton } from "./ActionButton";
export { default as MovieTitle } from "./MovieTitle";
export { default as MovieLogo } from "./MovieLogo";
export { default as MovieInfo } from "./MovieInfo";
export { default as GenreList } from "./GenreList";
export { default as MovieDescription } from "./MovieDescription";
export { default as ActionButtons } from "./ActionButtons";

// Custom hook
export { useBannerConfig } from "./useBannerConfig";

// Note: defaultBannerMovie is now exported from src/data/mockData.js for centralization
