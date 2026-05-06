const axios = require('axios');

const DEFAULT_PROVIDER = 'openrouter';
const DEFAULT_TIMEOUT_MS = 60000;
const CHAT_COMPLETIONS_PATH = '/chat/completions';

const PROVIDER_PRESETS = {
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKeyEnvNames: ['OPENROUTER_API_KEY'],
    endpointPath: CHAT_COMPLETIONS_PATH,
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    apiKeyEnvNames: ['OPENAI_API_KEY'],
    endpointPath: CHAT_COMPLETIONS_PATH,
  },
  compatible: {
    baseUrl: '',
    apiKeyEnvNames: [],
    endpointPath: CHAT_COMPLETIONS_PATH,
  },
  custom: {
    baseUrl: '',
    apiKeyEnvNames: [],
    endpointPath: CHAT_COMPLETIONS_PATH,
  },
};

function normalizeProviderName(provider) {
  const value = String(provider || DEFAULT_PROVIDER).trim().toLowerCase();
  if (['openai-compatible', 'openai_compatible', 'chat-completions'].includes(value)) {
    return 'compatible';
  }

  return value || DEFAULT_PROVIDER;
}

function providerEnvPrefix(provider) {
  return normalizeProviderName(provider)
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    return value;
  }

  return undefined;
}

function scopedEnv(env, scope, key) {
  const scopePrefix = scope ? `${String(scope).trim().toUpperCase()}_` : '';
  return firstNonEmpty(
    scopePrefix ? env[`${scopePrefix}${key}`] : undefined,
    env[key],
  );
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseModelList(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim())
      .filter(Boolean);
  }

  if (typeof value !== 'string') return [];

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueList(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeBaseUrl(baseUrl, provider) {
  const raw = String(baseUrl || '').trim();
  if (!raw) {
    throw new Error(`LLM base URL is not configured for provider "${provider}"`);
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch (_error) {
    throw new Error(`Invalid LLM base URL for provider "${provider}": ${raw}`);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`LLM base URL for provider "${provider}" must use http or https`);
  }

  return raw.replace(/\/+$/, '');
}

function buildChatCompletionUrl(baseUrl, endpointPath = CHAT_COMPLETIONS_PATH) {
  const normalizedBase = String(baseUrl || '').replace(/\/+$/, '');
  const normalizedPath = String(endpointPath || CHAT_COMPLETIONS_PATH).replace(/^\/+/, '');
  return `${normalizedBase}/${normalizedPath}`;
}

function parseJsonObject(value, label) {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    console.warn(`[LLM] Ignoring invalid ${label}: ${error.message}`);
    return {};
  }
}

function resolveProviderApiKey(env, scope, provider, preset) {
  const prefix = providerEnvPrefix(provider);
  const presetNames = preset.apiKeyEnvNames || [];

  return firstNonEmpty(
    scopedEnv(env, scope, 'LLM_API_KEY'),
    ...presetNames.map((name) => scopedEnv(env, scope, name)),
    env[`${prefix}_API_KEY`],
  );
}

function resolveProviderBaseUrl(env, scope, provider, preset) {
  const prefix = providerEnvPrefix(provider);
  return firstNonEmpty(
    scopedEnv(env, scope, 'LLM_BASE_URL'),
    env[`${prefix}_BASE_URL`],
    preset.baseUrl,
  );
}

function resolveChatProviderConfig(options = {}) {
  const env = options.env || process.env;
  const scope = options.scope || '';
  const provider = normalizeProviderName(
    firstNonEmpty(options.provider, scopedEnv(env, scope, 'LLM_PROVIDER'), DEFAULT_PROVIDER),
  );
  const preset = PROVIDER_PRESETS[provider] || {
    baseUrl: '',
    apiKeyEnvNames: [],
    endpointPath: CHAT_COMPLETIONS_PATH,
  };

  const apiKey = firstNonEmpty(options.apiKey, resolveProviderApiKey(env, scope, provider, preset));
  if (!apiKey) {
    throw new Error(`LLM API key is not configured for provider "${provider}"`);
  }

  const baseUrl = normalizeBaseUrl(
    firstNonEmpty(options.baseUrl, resolveProviderBaseUrl(env, scope, provider, preset)),
    provider,
  );
  const endpointPath = firstNonEmpty(
    options.endpointPath,
    scopedEnv(env, scope, 'LLM_ENDPOINT_PATH'),
    preset.endpointPath,
    CHAT_COMPLETIONS_PATH,
  );
  const model = firstNonEmpty(
    options.model,
    scopedEnv(env, scope, 'LLM_MODEL'),
    options.defaultModel,
  );
  if (!model) {
    throw new Error(`LLM model is not configured for provider "${provider}"`);
  }

  const fallbackModels = uniqueList(parseModelList(firstNonEmpty(
    options.fallbackModels,
    scopedEnv(env, scope, 'LLM_FALLBACK_MODELS'),
  )));
  const models = uniqueList([model, ...fallbackModels]);
  const timeoutMs = parsePositiveInteger(
    firstNonEmpty(options.timeoutMs, scopedEnv(env, scope, 'LLM_TIMEOUT_MS')),
    DEFAULT_TIMEOUT_MS,
  );

  const referer = firstNonEmpty(
    options.referer,
    scopedEnv(env, scope, 'LLM_HTTP_REFERER'),
    env.CLIENT_URL,
  );
  const title = firstNonEmpty(
    options.title,
    scopedEnv(env, scope, 'LLM_APP_TITLE'),
    'CinePhine Platform',
  );

  const extraHeaders = {
    ...parseJsonObject(scopedEnv(env, scope, 'LLM_HEADERS_JSON'), 'LLM_HEADERS_JSON'),
    ...(options.headers || {}),
  };
  const headers = {
    ...(provider === 'openrouter' && referer ? { 'HTTP-Referer': referer } : {}),
    ...(provider === 'openrouter' && title ? { 'X-Title': title } : {}),
    ...extraHeaders,
  };

  return {
    provider,
    baseUrl,
    endpointPath,
    apiKey,
    model,
    models,
    timeoutMs,
    headers,
  };
}

function extractProviderErrorMessage(data) {
  if (!data) return '';
  if (typeof data === 'string') return data;
  if (data.error?.message) return data.error.message;
  if (data.message) return data.message;
  if (data.detail) return typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);

  try {
    return JSON.stringify(data);
  } catch (_error) {
    return String(data);
  }
}

function formatLlmError(error, config) {
  const provider = config.provider || 'unknown';
  const model = config.model || 'unknown';

  if (error.response) {
    const status = error.response.status;
    const detail = extractProviderErrorMessage(error.response.data);
    return `[LLM:${provider}/${model}] HTTP ${status}${detail ? `: ${detail}` : ''}`;
  }

  if (error.code === 'ECONNABORTED') {
    return `[LLM:${provider}/${model}] request timed out`;
  }

  return `[LLM:${provider}/${model}] ${error.message || 'request failed'}`;
}

function isRetryableLlmError(error) {
  const status = error.response?.status || error.status || error.statusCode;
  if (!status) return true;
  if ([401, 402, 403, 404].includes(status)) return false;
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

function createLlmError(error, config) {
  const message = formatLlmError(error, config);
  const wrapped = new Error(message);
  wrapped.cause = error;
  wrapped.provider = config.provider;
  wrapped.model = config.model;
  wrapped.status = error.response?.status || error.status || error.statusCode;
  wrapped.isRetryable = isRetryableLlmError(error);
  return wrapped;
}

function extractChatMessageContent(data) {
  const content = data?.choices?.[0]?.message?.content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        return part?.text || '';
      })
      .join('');
  }

  return content;
}

async function createChatCompletion(payload, options = {}) {
  const transport = options.transport || axios;
  const config = resolveChatProviderConfig(options);
  const url = buildChatCompletionUrl(config.baseUrl, config.endpointPath);
  const { model: _payloadModel, ...bodyPayload } = payload || {};

  let lastError = null;
  for (const model of config.models) {
    const requestConfig = { ...config, model };
    const startedAt = Date.now();

    try {
      const response = await transport.post(
        url,
        {
          model,
          ...bodyPayload,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`,
            ...config.headers,
          },
          timeout: config.timeoutMs,
        },
      );

      return {
        data: response.data,
        provider: config.provider,
        model,
        durationMs: Date.now() - startedAt,
      };
    } catch (error) {
      const wrapped = createLlmError(error, requestConfig);
      lastError = wrapped;

      const isLastModel = config.models.indexOf(model) === config.models.length - 1;
      if (!isLastModel && wrapped.isRetryable) {
        console.warn(`[LLM] ${wrapped.message}; trying next model...`);
        continue;
      }

      throw wrapped;
    }
  }

  throw lastError || new Error('LLM request failed');
}

module.exports = {
  buildChatCompletionUrl,
  createChatCompletion,
  extractChatMessageContent,
  formatLlmError,
  parseModelList,
  resolveChatProviderConfig,
};
