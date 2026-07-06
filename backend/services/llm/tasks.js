const { DEFAULT_FALLBACK_MODELS, DEFAULT_FREE_FALLBACK_MODELS } = require('./models');

const TASKS = {
  TIMI: {
    modelByProvider: {
      gemini: 'gemini-2.5-flash',
      openai: 'gpt-4o-mini',
      default: 'google/gemini-2.5-flash',
    },
    openrouterFallback: DEFAULT_FREE_FALLBACK_MODELS,
    timeoutMs: 10000,
    title: 'CinePhine Timi Assistant',
  },
  CHATBOT: {
    modelByProvider: {
      gemini: 'gemini-2.5-flash',
      openai: 'gpt-4o-mini',
      default: undefined,
    },
    openrouterFallback: DEFAULT_FALLBACK_MODELS,
    title: 'CinePhine Chatbot',
  },
  CHATBOT_INTENT: {
    modelByProvider: {
      gemini: 'gemini-2.5-flash',
      openai: 'gpt-4o-mini',
      default: 'openai/gpt-4o-mini',
    },
    title: 'CinePhine Chatbot Intent',
  },
  VIRAL: {
    modelByProvider: {
      default: 'google/gemini-2.0-flash-001',
    },
    timeoutMs: 60000,
    title: 'CinePhine Viral Clip Generator',
  },
  MODERATION: {
    modelByProvider: {
      gemini: 'gemini-2.5-flash',
      openai: 'gpt-4o-mini',
      default: 'openai/gpt-4o-mini',
    },
    timeoutMs: 15000,
    title: 'CinePhine Moderator',
  },
  TRENDING: {
    modelByProvider: {
      gemini: 'gemini-2.5-flash',
      openai: 'gpt-4o-mini',
      default: 'google/gemini-2.0-flash-001',
    },
    timeoutMs: 30000,
    referer: 'https://cinephine.io.vn',
    title: 'CinePhine Trending Pipeline',
  },
};

function getTaskDefaults(scope) {
  if (!scope) return {};
  const task = TASKS[scope.toUpperCase()];
  if (!task) return {};
  return { ...task };
}

module.exports = {
  TASKS,
  getTaskDefaults,
};
