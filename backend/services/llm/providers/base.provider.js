const { createLlmError } = require('../errors');

class LLMProvider {
  get name() {
    throw new Error('abstract');
  }

  buildUrl(config, model) {
    throw new Error('abstract');
  }

  buildBody(payload, model) {
    throw new Error('abstract');
  }

  buildHeaders(config) {
    throw new Error('abstract');
  }

  parseResponse(rawData) {
    throw new Error('abstract');
  }

  async chat({ payload, config, model, transport }) {
    const url = this.buildUrl(config, model);
    const body = this.buildBody(payload, model);
    const headers = {
      'Content-Type': 'application/json',
      ...this.buildHeaders(config),
      ...config.headers,
    };
    const startedAt = Date.now();
    try {
      const res = await transport.post(url, body, { headers, timeout: config.timeoutMs });
      return {
        ...this.parseResponse(res.data),
        provider: this.name,
        model,
        durationMs: Date.now() - startedAt,
      };
    } catch (err) {
      throw createLlmError(err, { provider: this.name, model });
    }
  }

  async streamChat() {
    throw new Error(`LLM provider "${this.name}" does not support streaming`);
  }
}

module.exports = LLMProvider;
