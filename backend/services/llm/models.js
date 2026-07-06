const DEFAULT_FALLBACK_MODELS = [
  'deepseek/deepseek-v4-flash:free',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  'minimax/minimax-m2.5:free',
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
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
  'google/gemini-2.0-flash-exp',
  'meta-llama/llama-3.1-70b-instruct',
  'mistralai/mistral-large',
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

module.exports = {
  DEFAULT_FALLBACK_MODELS,
  DEFAULT_FREE_FALLBACK_MODELS,
  normalizeModelList,
  uniqueModelList,
  resolveModelsToTry,
};
