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
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKeyEnvNames: ['GEMINI_API_KEY', 'GOOGLE_AI_API_KEY'],
    endpointPath: '',
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

function buildGeminiGenerateContentUrl(baseUrl, model) {
  const normalizedBase = String(baseUrl || '').replace(/\/+$/, '');
  const normalizedModel = String(model || '').replace(/^models\//, '').replace(/^google\//, '');
  return `${normalizedBase}/models/${normalizedModel}:generateContent`;
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
  const explicitModels = uniqueList(parseModelList(options.models));
  const model = firstNonEmpty(
    explicitModels[0],
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
  const models = explicitModels.length > 0
    ? explicitModels
    : uniqueList([model, ...fallbackModels]);
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

function normalizeContentParts(content) {
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return { text: part };
        if (part?.type === 'text') return { text: String(part.text || '') };
        if (part?.text) return { text: String(part.text) };
        return null;
      })
      .filter(Boolean);
  }

  return [{ text: String(content || '') }];
}

function mapMessagesToGemini(messages = []) {
  const systemParts = [];
  const contents = [];

  for (const message of messages) {
    const role = message?.role;
    const parts = normalizeContentParts(message?.content);
    if (parts.length === 0) continue;

    if (role === 'system') {
      systemParts.push(...parts);
      continue;
    }

    if (role === 'assistant') {
      contents.push({ role: 'model', parts });
      continue;
    }

    if (role === 'tool') {
      contents.push({ role: 'user', parts });
      continue;
    }

    contents.push({ role: 'user', parts });
  }

  return {
    ...(systemParts.length > 0 ? { systemInstruction: { parts: systemParts } } : {}),
    contents,
  };
}

function mapToolsToGemini(tools = []) {
  const functionDeclarations = tools
    .filter((tool) => tool?.type === 'function' && tool.function?.name)
    .map((tool) => ({
      name: tool.function.name,
      ...(tool.function.description ? { description: tool.function.description } : {}),
      ...(tool.function.parameters ? { parameters: tool.function.parameters } : {}),
    }));

  return functionDeclarations.length > 0 ? [{ functionDeclarations }] : undefined;
}

function mapToolChoiceToGemini(toolChoice) {
  if (!toolChoice || toolChoice === 'auto') {
    return { functionCallingConfig: { mode: 'AUTO' } };
  }

  if (toolChoice === 'none') {
    return { functionCallingConfig: { mode: 'NONE' } };
  }

  if (toolChoice === 'required') {
    return { functionCallingConfig: { mode: 'ANY' } };
  }

  const functionName = toolChoice?.function?.name;
  if (functionName) {
    return {
      functionCallingConfig: {
        mode: 'ANY',
        allowedFunctionNames: [functionName],
      },
    };
  }

  return { functionCallingConfig: { mode: 'AUTO' } };
}

function buildGeminiGenerationConfig(payload = {}) {
  const generationConfig = {};
  if (payload.temperature !== undefined) generationConfig.temperature = payload.temperature;
  if (payload.top_p !== undefined) generationConfig.topP = payload.top_p;
  if (payload.max_tokens !== undefined) generationConfig.maxOutputTokens = payload.max_tokens;
  if (payload.max_completion_tokens !== undefined) generationConfig.maxOutputTokens = payload.max_completion_tokens;
  if (payload.response_format?.type === 'json_object') {
    generationConfig.responseMimeType = 'application/json';
  }

  return generationConfig;
}

function buildGeminiRequestBody(payload = {}) {
  const messagePayload = mapMessagesToGemini(payload.messages || []);
  const tools = mapToolsToGemini(payload.tools || []);
  const generationConfig = buildGeminiGenerationConfig(payload);

  return {
    ...messagePayload,
    ...(Object.keys(generationConfig).length > 0 ? { generationConfig } : {}),
    ...(tools ? { tools } : {}),
    ...(tools && payload.tool_choice !== undefined ? { toolConfig: mapToolChoiceToGemini(payload.tool_choice) } : {}),
  };
}

function mapGeminiResponseToChatCompletion(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const content = parts
    .map((part) => part?.text || '')
    .join('');
  const toolCalls = parts
    .map((part, index) => {
      if (!part?.functionCall?.name) return null;
      return {
        id: part.functionCall.id || `gemini_call_${index}`,
        type: 'function',
        function: {
          name: part.functionCall.name,
          arguments: JSON.stringify(part.functionCall.args || {}),
        },
      };
    })
    .filter(Boolean);

  return {
    choices: [
      {
        message: {
          role: 'assistant',
          content,
          ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
        },
      },
    ],
    ...(data?.usageMetadata ? { usage: data.usageMetadata } : {}),
    provider_response: data,
  };
}

async function createChatCompletion(payload, options = {}) {
  const transport = options.transport || axios;
  const config = resolveChatProviderConfig(options);
  const { model: _payloadModel, ...bodyPayload } = payload || {};

  let lastError = null;
  for (const model of config.models) {
    const requestConfig = { ...config, model };
    const startedAt = Date.now();
    const isGemini = config.provider === 'gemini';
    const url = isGemini
      ? buildGeminiGenerateContentUrl(config.baseUrl, model)
      : buildChatCompletionUrl(config.baseUrl, config.endpointPath);
    const requestBody = isGemini
      ? buildGeminiRequestBody(bodyPayload)
      : {
          model,
          ...bodyPayload,
        };
    const headers = isGemini
      ? {
          'Content-Type': 'application/json',
          'x-goog-api-key': config.apiKey,
          ...config.headers,
        }
      : {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
          ...config.headers,
        };

    try {
      const response = await transport.post(
        url,
        requestBody,
        {
          headers,
          timeout: config.timeoutMs,
        },
      );

      return {
        data: isGemini ? mapGeminiResponseToChatCompletion(response.data) : response.data,
        rawData: response.data,
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
  buildGeminiGenerateContentUrl,
  createChatCompletion,
  extractChatMessageContent,
  formatLlmError,
  parseModelList,
  resolveChatProviderConfig,
};
