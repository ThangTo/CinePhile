import apiRequest from "./utils/apiRequest";

/**
 * Health Service
 * Service để kiểm tra kết nối với backend
 */
const healthService = {
  /**
   * Health check - Kiểm tra backend còn hoạt động không
   * @returns {Promise<Object>} { success: true, message: "API is running", timestamp: "..." }
   */
  check: () => apiRequest("/health"),
};

export default healthService;
