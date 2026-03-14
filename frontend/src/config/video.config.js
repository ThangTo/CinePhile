/**
 * Video Player Configuration
 */

// Toggle: True to filter ads on backend proxy, False to filter ads on frontend client
export const USE_SERVER_ADBLOCK = process.env.REACT_APP_USE_SERVER_ADBLOCK || true;

/**
 * Danh sách domains KHÔNG CẦN proxy
 * Các domain này có CORS headers tốt, có thể phát trực tiếp từ browser
 */
export const BYPASS_PROXY_DOMAINS = [
  "opstream90.com",
  "opstream",
];

/**
 * Danh sách domains CẦN proxy
 * Các domain này block CORS, cần proxy để phát
 */
export const REQUIRE_PROXY_DOMAINS = [
  "phim1280.tv",
  "phimmoichillb.net",
];

/**
 * Check xem URL có cần proxy không
 * @param {string} url - M3U8 URL
 * @returns {boolean} - true nếu cần proxy, false nếu bypass
 */
export function shouldUseProxy(url) {
  if (!url) return false;

  // Check bypass list trước
  const shouldBypass = BYPASS_PROXY_DOMAINS.some((domain) => url.includes(domain));
  if (shouldBypass) {
    return false; // Không cần proxy
  }

  // Mặc định: dùng proxy cho an toàn
  return true;
}

/**
 * Get video source URL (with or without proxy)
 * @param {string} m3u8Url - Original M3U8 URL
 * @param {string} proxyEndpoint - Proxy API endpoint (/api/v1/movies/proxy-m3u8)
 * @returns {string} - Final URL to use
 */
export function getVideoSource(m3u8Url, proxyEndpoint) {
  if (!m3u8Url) return null;

  // Nếu sử dụng proxy lọc quảng cáo trên server hoặc CẦN proxy CORS, ta luôn gọi proxyEndpoint
  if (USE_SERVER_ADBLOCK || shouldUseProxy(m3u8Url)) {
    return `${proxyEndpoint}?url=${encodeURIComponent(m3u8Url)}`;
  }

  return m3u8Url; // Direct URL cho client xử lý tiếp theo nếu USE_SERVER_ADBLOCK=false
}
