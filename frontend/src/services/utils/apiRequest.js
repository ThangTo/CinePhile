import http from "lib/axios";

/**
 * API Request Helper
 * Wrapper cho axios http với hỗ trợ meta.requiresAuth
 *
 * @param {string} endpoint - API endpoint path
 * @param {Object} options - Request options
 * @param {string} options.method - HTTP method (GET, POST, PUT, DELETE)
 * @param {Object} options.params - Query parameters
 * @param {Object} options.data - Request body data
 * @param {Object} options.headers - Custom headers
 * @param {boolean} options.requiresAuth - Whether to include auth token
 * @returns {Promise<any>} Response data
 */
export default async function apiRequest(
  endpoint,
  { method = "GET", params, data, headers = {}, requiresAuth = false } = {}
) {
  const res = await http.request({
    url: endpoint,
    method,
    params,
    data,
    headers,
    meta: { requiresAuth },
  });
  return res.data;
}
