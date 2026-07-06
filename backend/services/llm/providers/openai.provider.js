const LLMProvider = require('./base.provider');
const { CHAT_COMPLETIONS_PATH } = require('../config');

class OpenAICompatibleProvider extends LLMProvider {
  constructor(name, preset = {}) {
    super();
    this._name = name;
    this.preset = preset;
  }

  get name() {
    return this._name;
  }

  buildUrl(config, model) {
    const normalizedBase = String(config.baseUrl || '').replace(/\/+$/, '');
    const endpointPath = this.preset.endpointPath || config.endpointPath || CHAT_COMPLETIONS_PATH;
    const normalizedPath = String(endpointPath).replace(/^\/+/, '');
    return `${normalizedBase}/${normalizedPath}`;
  }

  buildBody(payload, model) {
    return { model, ...payload };
  }

  buildHeaders(config) {
    const headers = {
      Authorization: `Bearer ${config.apiKey}`,
    };
    if (this._name === 'openrouter') {
      const referer = config.headers?.['HTTP-Referer'];
      const title = config.headers?.['X-Title'];
      if (referer) headers['HTTP-Referer'] = referer;
      if (title) headers['X-Title'] = title;
    }
    return headers;
  }

  parseResponse(rawData) {
    const content = rawData?.choices?.[0]?.message?.content;
    const toolCalls = rawData?.choices?.[0]?.message?.tool_calls || [];
    const usage = rawData?.usage;
    return {
      content: Array.isArray(content)
        ? content.map((part) => (typeof part === 'string' ? part : part?.text || '')).join('')
        : content,
      toolCalls,
      usage,
      raw: rawData,
    };
  }

  async streamChat({ payload, config, model, transport, onToken }) {
    const url = this.buildUrl(config, model);
    const body = { ...this.buildBody(payload, model), stream: true };
    const headers = {
      'Content-Type': 'application/json',
      ...this.buildHeaders(config),
      ...config.headers,
    };
    const startedAt = Date.now();
    let content = '';

    try {
      const res = await transport.post(url, body, {
        headers,
        timeout: config.timeoutMs,
        responseType: 'stream',
      });

      let buffer = '';
      for await (const chunk of normalizeStreamChunks(res.data)) {
        buffer += chunk;
        const frames = buffer.split(/\r?\n\r?\n/);
        buffer = frames.pop() || '';

        for (const frame of frames) {
          const token = parseOpenAIStreamFrame(frame);
          if (!token) continue;
          content += token;
          if (onToken) onToken(token);
        }
      }

      if (buffer.trim()) {
        const token = parseOpenAIStreamFrame(buffer);
        if (token) {
          content += token;
          if (onToken) onToken(token);
        }
      }

      return {
        content,
        toolCalls: [],
        usage: undefined,
        raw: undefined,
        provider: this.name,
        model,
        durationMs: Date.now() - startedAt,
      };
    } catch (err) {
      const wrapped = require('../errors').createLlmError(err, { provider: this.name, model });
      wrapped.hasPartialContent = content.length > 0;
      throw wrapped;
    }
  }
}

async function* normalizeStreamChunks(data) {
  if (!data) return;
  if (typeof data === 'string' || Buffer.isBuffer(data)) {
    yield data.toString();
    return;
  }
  if (Array.isArray(data)) {
    for (const chunk of data) {
      yield chunk.toString();
    }
    return;
  }
  if (typeof data[Symbol.asyncIterator] === 'function') {
    for await (const chunk of data) {
      yield chunk.toString();
    }
    return;
  }
  if (typeof data[Symbol.iterator] === 'function') {
    for (const chunk of data) {
      yield chunk.toString();
    }
  }
}

function parseOpenAIStreamFrame(frame) {
  const lines = String(frame || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('data:'));

  let content = '';
  for (const line of lines) {
    const payload = line.slice(5).trim();
    if (!payload || payload === '[DONE]') continue;
    try {
      const data = JSON.parse(payload);
      content += data?.choices?.[0]?.delta?.content || data?.choices?.[0]?.text || '';
    } catch (_error) {
      // Ignore malformed provider chunks; later valid chunks can still complete the response.
    }
  }
  return content;
}

module.exports = OpenAICompatibleProvider;
module.exports.parseOpenAIStreamFrame = parseOpenAIStreamFrame;
