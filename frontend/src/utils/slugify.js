/**
 * String utilities for URL slugification
 */

/**
 * Convert Vietnamese string to URL-safe slug
 * Removes accents, special characters, converts to lowercase
 * 
 * @param {string} str - String to slugify
 * @returns {string} URL-safe slug
 * 
 * @example
 * slugify("Hành Động") // "hanh-dong"
 * slugify("Trung Quốc") // "trung-quoc"
 */
export const slugify = (str = "") =>
  String(str)
    .normalize("NFD") // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, "") // Remove accent marks
    .replace(/[^a-zA-Z0-9\s-]/g, "") // Keep only alphanumeric, spaces, hyphens
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-"); // Replace spaces with hyphens

/**
 * Convert slug back to Title Case
 * 
 * @param {string} slug - Slug to convert
 * @returns {string} Title case string
 * 
 * @example
 * toTitleCase("hanh-dong") // "Hanh Dong"
 */
export const toTitleCase = (slug = "") =>
  slug
    .split("-")
    .filter(Boolean)
    .map((word) => (word.length ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");

/**
 * Build slug -> label map from array of items with href
 * 
 * @param {Array} items - Array of {href, label} objects
 * @returns {Map} Map of slug -> label
 */
export const buildSlugMap = (items = []) => {
  const map = new Map();
  items.forEach((item) => {
    if (!item.href) return;
    const parts = item.href.split("/");
    const slug = parts[parts.length - 1];
    if (slug && item.label) {
      map.set(slug, item.label);
    }
  });
  return map;
};

