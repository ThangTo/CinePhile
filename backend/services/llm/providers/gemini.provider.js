const LLMProvider = require('./base.provider');

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

class GeminiProvider extends LLMProvider {
  constructor(name = 'gemini') {
    super();
    this._name = name;
  }

  get name() {
    return this._name;
  }

  buildUrl(config, model) {
    const normalizedBase = String(config.baseUrl || '').replace(/\/+$/, '');
    const normalizedModel = String(model || '').replace(/^models\//, '').replace(/^google\//, '');
    return `${normalizedBase}/models/${normalizedModel}:generateContent`;
  }

  buildBody(payload, _model) {
    return buildGeminiRequestBody(payload);
  }

  buildHeaders(config) {
    return {
      'x-goog-api-key': config.apiKey,
    };
  }

  parseResponse(rawData) {
    const mapped = mapGeminiResponseToChatCompletion(rawData);
    const content = mapped.choices?.[0]?.message?.content;
    const toolCalls = mapped.choices?.[0]?.message?.tool_calls || [];
    return {
      content,
      toolCalls,
      usage: mapped.usage,
      raw: rawData,
    };
  }
}

module.exports = GeminiProvider;
module.exports.buildGeminiRequestBody = buildGeminiRequestBody;
module.exports.mapMessagesToGemini = mapMessagesToGemini;
module.exports.mapToolsToGemini = mapToolsToGemini;
module.exports.mapToolChoiceToGemini = mapToolChoiceToGemini;
module.exports.buildGeminiGenerationConfig = buildGeminiGenerationConfig;
module.exports.mapGeminiResponseToChatCompletion = mapGeminiResponseToChatCompletion;
