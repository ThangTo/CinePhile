import apiRequest from "./utils/apiRequest";

const cursorEffectService = {
  /**
   * Lấy danh sách hiệu ứng kèm trạng thái owned/equipped
   * @returns {Promise<Array>}
   */
  getEffects: () =>
    apiRequest(`/cursor-effects`, {
      requiresAuth: true,
    }),

  /**
   * Mua hiệu ứng bằng coin
   * @param {string} effectId
   * @returns {Promise<Object>}
   */
  purchase: (effectId) =>
    apiRequest(`/cursor-effects/purchase`, {
      method: "POST",
      data: { effectId },
      requiresAuth: true,
    }),

  /**
   * Trang bị hiệu ứng
   * @param {string} effectId
   * @returns {Promise<Object>}
   */
  equip: (effectId) =>
    apiRequest(`/cursor-effects/equip`, {
      method: "POST",
      data: { effectId },
      requiresAuth: true,
    }),
};

export default cursorEffectService;
