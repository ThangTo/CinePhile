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

function isRateLimitError(error) {
  const errorMsg = error?.message?.toLowerCase() || '';
  const errorStr = JSON.stringify(error).toLowerCase();
  return (
    errorMsg.includes('rate limit') ||
    errorMsg.includes('quota') ||
    errorMsg.includes('429') ||
    errorStr.includes('rate_limit_exceeded') ||
    errorStr.includes('quota_exceeded') ||
    error?.status === 429 ||
    error?.statusCode === 429
  );
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

module.exports = {
  createLlmError,
  isRetryableLlmError,
  isRateLimitError,
  formatLlmError,
  extractProviderErrorMessage,
};
