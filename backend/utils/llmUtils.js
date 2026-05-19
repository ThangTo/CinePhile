const { createChatCompletion } = require('../services/llmProvider.service');

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

const DEFAULT_FALLBACK_MODELS = [
  'deepseek/deepseek-v4-flash:free',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  'minimax/minimax-m2.5:free',
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
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
  // 'openai/gpt-4o-mini',
  // 'anthropic/claude-3.5-sonnet',
  'google/gemini-2.0-flash-exp',
  'meta-llama/llama-3.1-70b-instruct',
  'mistralai/mistral-large',
  // 'openai/gpt-3.5-turbo',
];

const DEFAULT_FREE_FALLBACK_MODELS = DEFAULT_FALLBACK_MODELS.filter((model) => model.endsWith(':free'));

function normalizeModelList(models) {
  if (!models) return [];
  const rawModels = Array.isArray(models) ? models : String(models).split(',');
  return rawModels
    .map((model) => String(model || '').trim())
    .filter(Boolean);
}

function uniqueModelList(models) {
  return [...new Set(normalizeModelList(models))];
}

function resolveModelsToTry(options = {}) {
  const configuredModels = normalizeModelList(options.models);
  if (configuredModels.length > 0) {
    return uniqueModelList([options.model, ...configuredModels]);
  }

  if (options.model) {
    return [options.model];
  }

  return DEFAULT_FALLBACK_MODELS;
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    return value;
  }

  return undefined;
}

function scopedEnv(scope, key) {
  const scopePrefix = scope ? `${String(scope).trim().toUpperCase()}_` : '';
  return firstNonEmpty(
    scopePrefix ? process.env[`${scopePrefix}${key}`] : undefined,
    process.env[key],
  );
}

function hasConfiguredModels(scope) {
  return Boolean(
    scopedEnv(scope, 'LLM_MODEL') ||
    scopedEnv(scope, 'LLM_FALLBACK_MODELS'),
  );
}

function resolveRequestedProvider(options = {}) {
  return String(firstNonEmpty(
    options.provider,
    scopedEnv(options.scope, 'LLM_PROVIDER'),
    'openrouter',
  )).trim().toLowerCase();
}

async function callLlmWithFallback(options = {}) {
  const {
    model,
    models,
    timeoutMs,
    transport,
    provider,
    scope,
    defaultModel,
    fallbackModels,
    ...bodyPayload
  } = options;

  const requestedProvider = resolveRequestedProvider(options);
  const explicitModels = normalizeModelList(models);
  const modelsToTry = explicitModels.length > 0 || model
    ? resolveModelsToTry({ model, models: explicitModels })
    : requestedProvider === 'openrouter' && !hasConfiguredModels(scope)
      ? DEFAULT_FALLBACK_MODELS
      : [];

  const response = await createChatCompletion(bodyPayload, {
    provider,
    scope,
    ...(modelsToTry.length > 0 ? { models: modelsToTry } : {}),
    ...(model ? { model } : {}),
    ...(defaultModel ? { defaultModel } : {}),
    ...(fallbackModels ? { fallbackModels } : {}),
    ...(timeoutMs ? { timeoutMs } : {}),
    ...(transport ? { transport } : {}),
  });

  console.log(`[LLM] succeeded with provider=${response.provider} model=${response.model}`);
  return response.data;
}

const callOpenRouterWithFallback = callLlmWithFallback;

module.exports = {
  isRateLimitError,
  callLlmWithFallback,
  callOpenRouterWithFallback,
  DEFAULT_FALLBACK_MODELS,
  DEFAULT_FREE_FALLBACK_MODELS,
  normalizeModelList,
  resolveModelsToTry,
};
