const LLMService = require('./LLMService');

const llmService = new LLMService();

function complete(options) {
  return llmService.complete(options);
}

function stream(options) {
  return llmService.stream(options);
}

module.exports = {
  llmService,
  complete,
  stream,
};
