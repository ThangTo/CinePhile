import apiRequest from "./utils/apiRequest";

const questService = {
  /**
   * Lấy tất cả nhiệm vụ với tiến độ hiện tại của user
   * @returns {Promise<Object>} { data: { daily: {...}, weekly: {...} } }
   */
  getQuests: () =>
    apiRequest("/quests", {
      requiresAuth: true,
    }),

  /**
   * Lấy summary nhẹ cho sidebar badge
   * @returns {Promise<Object>} { data: { daily: { total, completed, claimed, claimedCoins }, weekly: {...} } }
   */
  getQuestSummary: () =>
    apiRequest("/quests/summary", {
      requiresAuth: true,
    }),

  /**
   * Nhận thưởng cho một nhiệm vụ
   * @param {string} questId
   * @returns {Promise<Object>}
   */
  claimReward: (questId) =>
    apiRequest(`/quests/${questId}/claim`, {
      method: "POST",
      requiresAuth: true,
    }),

  /**
   * Nhận thưởng hoàn thành (bonus khi làm hết tất cả nhiệm vụ)
   * @param {'daily'|'weekly'} type
   * @returns {Promise<Object>}
   */
  claimBonus: (type) =>
    apiRequest("/quests/claim-bonus", {
      method: "POST",
      data: { type },
      requiresAuth: true,
    }),
};

export default questService;
