const OpenAICompatibleProvider = require('./providers/openai.provider');
const GeminiProvider = require('./providers/gemini.provider');
const { PROVIDER_PRESETS } = require('./config');

class ProviderRegistry {
  constructor() {
    this.providers = new Map();
  }

  register(name, provider) {
    this.providers.set(name, provider);
  }

  resolve(name) {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`LLM provider "${name}" is not registered. Available: ${[...this.providers.keys()].join(', ')}`);
    }
    return provider;
  }

  has(name) {
    return this.providers.has(name);
  }
}

const registry = new ProviderRegistry();

registry.register('openrouter', new OpenAICompatibleProvider('openrouter', PROVIDER_PRESETS.openrouter));
registry.register('openai', new OpenAICompatibleProvider('openai', PROVIDER_PRESETS.openai));
registry.register('compatible', new OpenAICompatibleProvider('compatible', PROVIDER_PRESETS.compatible));
registry.register('custom', new OpenAICompatibleProvider('custom', PROVIDER_PRESETS.custom));
registry.register('gemini', new GeminiProvider('gemini'));

module.exports = registry;
