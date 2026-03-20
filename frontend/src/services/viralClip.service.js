import apiRequest from "./utils/apiRequest";

// ============================================================================
// Viral Clips Service - API calls for viral clip generation
// ============================================================================

export const viralClipAPI = {
  /**
   * Generate viral clips from a movie's HLS stream or DB record.
   *
   * @param {Object} params
   * @param {string} params.movieId - Movie ID
   * @param {string} [params.m3u8Url] - HLS stream URL (fallback)
   * @param {number} [params.episodeId] - Episode number
   * @param {string} [params.audioType] - Server/Audio type (vietsub, etc)
   * @param {string} [params.bgMusicUrl] - Background music URL
   * @param {File} [params.bgmFile] - Uploaded background music file
   * @param {string} [params.bgmStartTime] - BGM start time (e.g. 00:15)
   * @param {number} [params.bgmDuration] - BGM & Clip duration (e.g. 15)
   * @returns {Promise<Object>}
   */
  async generate(params) {
    const formData = new FormData();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        formData.append(key, params[key]);
      }
    });

    return apiRequest("/generate-viral-clips", {
      method: "POST",
      data: formData,
      requiresAuth: true,
      timeout: 600000,
      // NOTE: Do not set Content-Type header. Axios automatically sets multipart/form-data with boundary.
      headers: { "Content-Type": "multipart/form-data" }
    });
  },

  /**
   * Get the status of an analysis job (audio extraction -> stt -> llm).
   *
   * @param {string|number} jobId - Bull queue job ID
   * @returns {Promise<Object>} { success, job: { id, state, progress, data, result, ... } }
   */
  async getAnalysisJobStatus(jobId) {
    return apiRequest(`/viral-clips/analysis-job/${jobId}`, {
      method: "GET",
      requiresAuth: true,
    });
  },

  /**
   * Get the status of a specific clip rendering job.
   *
   * @param {string|number} jobId - Bull queue job ID
   * @returns {Promise<Object>} { success, job: { id, state, progress, data, result, ... } }
   */
  async getJobStatus(jobId) {
    return apiRequest(`/viral-clips/job/${jobId}`, {
      method: "GET",
      requiresAuth: true,
    });
  },
};
