const axios = require('axios');
const { resolveChatProviderConfig, normalizeProviderName, scopedEnv, firstNonEmpty } = require('./config');
const { getTaskDefaults } = require('./tasks');
const registry = require('./registry');
const { createLlmError } = require('./errors');

function resolveProviderFromEnv(callerProvider, scope, env) {
  const activeEnv = env || process.env;
  return normalizeProviderName(
    firstNonEmpty(callerProvider, scopedEnv(activeEnv, scope, 'LLM_PROVIDER'), 'openrouter'),
  );
}

class LLMService {
  constructor(transport) {
    this.transport = transport || axios;
  }

  async complete({
    scope,
    provider,
    model,
    models,
    timeoutMs,
    messages,
    tools,
    tool_choice,
    response_format,
    temperature,
    max_tokens,
    fallbackModels,
    defaultModel,
    title,
    referer,
    headers,
    env,
    transport,
  } = {}) {
    const task = getTaskDefaults(scope);
    const resolvedProvider = resolveProviderFromEnv(provider, scope, env);

    const taskDefaultModels = task.openrouterFallback && resolvedProvider === 'openrouter'
      ? task.openrouterFallback
      : undefined;

    let taskDefaultModel;
    if (task.modelByProvider) {
      taskDefaultModel = task.modelByProvider[resolvedProvider];
      if (taskDefaultModel === undefined && taskDefaultModels && taskDefaultModels.length > 0) {
        taskDefaultModel = taskDefaultModels[0];
      }
      if (taskDefaultModel === undefined) {
        taskDefaultModel = task.modelByProvider.default;
      }
    }

    const config = resolveChatProviderConfig({
      env,
      scope,
      provider,
      model,
      models,
      timeoutMs: timeoutMs || task.timeoutMs,
      defaultModel: defaultModel || taskDefaultModel,
      fallbackModels: fallbackModels || taskDefaultModels,
      title: title || task.title,
      referer: referer || task.referer,
      headers,
    });

    const impl = registry.resolve(config.provider);

    const payload = {
      messages,
      ...(tools && { tools }),
      ...(tool_choice && { tool_choice }),
      ...(response_format && { response_format }),
      ...(temperature != null && { temperature }),
      ...(max_tokens && { max_tokens }),
    };

    const activeTransport = transport || this.transport;
    let lastError;

    for (const m of config.models) {
      try {
        const result = await impl.chat({ payload, config, model: m, transport: activeTransport });
        console.log(`[LLM] ok provider=${result.provider} model=${result.model}`);
        return result;
      } catch (err) {
        lastError = err;
        const isLast = config.models.indexOf(m) === config.models.length - 1;
        if (!isLast && err.isRetryable) {
          console.warn(`[LLM] ${err.message}; next model...`);
          continue;
        }
        throw err;
      }
    }

    throw lastError || new Error('LLM request failed');
  }

  async stream(options = {}) {
    const {
      scope,
      provider,
      model,
      models,
      timeoutMs,
      messages,
      tools,
      tool_choice,
      response_format,
      temperature,
      max_tokens,
      fallbackModels,
      defaultModel,
      title,
      referer,
      headers,
      env,
      transport,
      onToken,
    } = options;

    const task = getTaskDefaults(scope);
    const resolvedProvider = resolveProviderFromEnv(provider, scope, env);

    const taskDefaultModels = task.openrouterFallback && resolvedProvider === 'openrouter'
      ? task.openrouterFallback
      : undefined;

    let taskDefaultModel;
    if (task.modelByProvider) {
      taskDefaultModel = task.modelByProvider[resolvedProvider];
      if (taskDefaultModel === undefined && taskDefaultModels && taskDefaultModels.length > 0) {
        taskDefaultModel = taskDefaultModels[0];
      }
      if (taskDefaultModel === undefined) {
        taskDefaultModel = task.modelByProvider.default;
      }
    }

    const config = resolveChatProviderConfig({
      env,
      scope,
      provider,
      model,
      models,
      timeoutMs: timeoutMs || task.timeoutMs,
      defaultModel: defaultModel || taskDefaultModel,
      fallbackModels: fallbackModels || taskDefaultModels,
      title: title || task.title,
      referer: referer || task.referer,
      headers,
    });

    const impl = registry.resolve(config.provider);
    const payload = {
      messages,
      ...(tools && { tools }),
      ...(tool_choice && { tool_choice }),
      ...(response_format && { response_format }),
      ...(temperature != null && { temperature }),
      ...(max_tokens && { max_tokens }),
    };

    const activeTransport = transport || this.transport;
    let lastError;

    for (const m of config.models) {
      try {
        const result = await impl.streamChat({
          payload,
          config,
          model: m,
          transport: activeTransport,
          onToken,
        });
        console.log(`[LLM] stream ok provider=${result.provider} model=${result.model}`);
        return result;
      } catch (err) {
        lastError = err;
        const isLast = config.models.indexOf(m) === config.models.length - 1;
        if (!isLast && err.isRetryable && !err.hasPartialContent) {
          console.warn(`[LLM] ${err.message}; next stream model...`);
          continue;
        }
        throw err;
      }
    }

    throw lastError || new Error('LLM stream request failed');
  }
}

module.exports = LLMService;
