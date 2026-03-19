const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

/**
 * Kiểm tra xem lỗi có phải do rate limit không.
 */
function isRateLimitError(error) {
  const errorMsg = error?.message?.toLowerCase() || '';
  const errorStr = JSON.stringify(error).toLowerCase();
  return (
    errorMsg.includes('rate limit') ||
    errorMsg.includes('quota') ||
    errorMsg.includes('429') ||
    errorStr.includes('rate_limit_exceeded') ||
    errorStr.includes('quota_exceeded') ||
    error?.status === 429 ||
    error?.statusCode === 429
  );
}

// Danh sách các mô hình ưu tiên sử dụng
const DEFAULT_FALLBACK_MODELS = [
  // 'qwen/qwen3-4b:free',
  // 'qwen/qwen3-next-80b-a3b-instruct:free',
  // 'qwen/qwen3-coder:free',
  // 'meta-llama/llama-3.3-70b-instruct:free',
  // 'meta-llama/llama-3.2-3b-instruct:free',
  // 'openai/gpt-oss-120b:free',
  // 'openai/gpt-oss-20b:free',
  // 'google/gemma-3-4b-it:free',
  // 'google/gemma-3-12b-it:free',
  // 'google/gemma-3-27b-it:free',
  // 'google/gemma-3n-e2b-it:free',
  // 'google/gemma-3n-e4b-it:free',
  'stepfun/step-3.5-flash:free',
  'arcee-ai/trinity-large-preview:free',
  'liquid/lfm-2.5-1.2b-thinking:free',
  'liquid/lfm-2.5-1.2b-instruct:free',
  'arcee-ai/trinity-mini:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'nvidia/nemotron-nano-12b-v2-vl:free',
  'nvidia/nemotron-nano-9b-v2:free',
  'z-ai/glm-4.5-air:free',
  'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
  'mistralai/mistral-small-3.1-24b-instruct:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
  // 'openai/gpt-4o-mini', // Fast and cheap
  // 'anthropic/claude-3.5-sonnet', // High quality
  'google/gemini-2.0-flash-exp', // Fast
  'meta-llama/llama-3.1-70b-instruct', // Open source
  'mistralai/mistral-large', // Good balance
  // 'openai/gpt-3.5-turbo', // Fallback
];

/**
 * Gọi API OpenRouter với cơ chế thử lại (fallback) tự động qua các model khác nhau nếu bị lỗi hoặc rate limit.
 * @param {Object} options 
 * @param {string} [options.model] - Model duy nhất nếu muốn ép cứng.
 * @param {string[]} [options.models] - Danh sách model tuỳ chọn (fallback). Nếu không chèn sẽ dùng DEFAULT_FALLBACK_MODELS.
 * @param {number} [options.timeoutMs] - Khung thời gian timeout của request.
 * @param {Array} options.messages - Messages gửi tới LLM.
 * @returns {Promise<Object>} Toàn bộ response body (JSON) được phân giải từ LLM.
 */
async function callOpenRouterWithFallback(options) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY chưa được cấu hình');
  }

  const modelsToTry = options.model
    ? [options.model]
    : options.models || DEFAULT_FALLBACK_MODELS;

  const { model, models, timeoutMs, ...bodyPayload } = options;

  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const controller = new AbortController();
      let timeoutId = null;

      if (timeoutMs) {
        timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      }

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:5001',
          'X-Title': 'CinePhine Platform',
        },
        body: JSON.stringify({
          model: modelName,
          ...bodyPayload,
        }),
        signal: controller.signal,
      });

      if (timeoutId) clearTimeout(timeoutId);

      const data = await res.json();

      if (!res.ok) {
        if (isRateLimitError({ message: data.error?.message, status: res.status })) {
          console.log(`[LLM] ⚠️ ${modelName} rate limited, trying next model...`);
          lastError = new Error(`Rate limit: ${data.error?.message}`);
          continue;
        }
        throw new Error(data.error?.message || 'OpenRouter API error');
      }

      console.log(`[LLM] ✅ OpenRouter succeeded with model: ${modelName}`);
      return data;
    } catch (error) {
      lastError = error;

      if (error.name === 'AbortError') {
        console.log(`[LLM] ⚠️ ${modelName} timed out, trying next model...`);
        if (modelsToTry.indexOf(modelName) < modelsToTry.length - 1) continue;
        throw error;
      }

      if (isRateLimitError(error) && modelsToTry.indexOf(modelName) < modelsToTry.length - 1) {
        console.log(`[LLM] ⚠️ ${modelName} rate limit / failed, trying next model...`);
        continue;
      }

      // Retry other generic failures if there are more models
      if (modelsToTry.indexOf(modelName) < modelsToTry.length - 1) {
        console.log(`[LLM] ⚠️ ${modelName} failed (${error.message}), trying next...`);
        continue;
      }
      
      // Last model failed
      throw error;
    }
  }

  throw lastError || new Error('All OpenRouter models failed');
}

module.exports = {
  isRateLimitError,
  callOpenRouterWithFallback,
  DEFAULT_FALLBACK_MODELS,
};
