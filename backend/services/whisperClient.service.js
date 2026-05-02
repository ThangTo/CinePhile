const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const Settings = require('../models/Settings');

const LOCAL_WHISPER_API_URL = process.env.WHISPER_API_URL || 'http://localhost:8000';
const DEFAULT_WHISPER_MODEL = process.env.WHISPER_MODEL || 'Systran/faster-whisper-small';
const LOCAL_WHISPER_TIMEOUT_MS = Number.parseInt(process.env.WHISPER_LOCAL_TIMEOUT_MS, 10) || 1800000;
const REMOTE_WHISPER_TIMEOUT_MS = Number.parseInt(process.env.WHISPER_REMOTE_TIMEOUT_MS, 10) || 1800000;
const MAX_ERROR_BODY_LENGTH = 500;

function normalizeRemoteWhisperUrl(rawUrl) {
  const value = String(rawUrl || '').trim();
  if (!value) return '';

  let parsed;
  try {
    parsed = new URL(value);
  } catch (_error) {
    throw new Error('Invalid Whisper URL');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Whisper URL must use http or https');
  }

  parsed.hash = '';
  parsed.search = '';
  return parsed.toString().replace(/\/+$/, '');
}

function normalizeTranscriptionLanguage(language) {
  const value = String(language || '').trim();
  if (!value) return null;

  const lowerValue = value.toLowerCase();
  if (['auto', 'detect', 'source', 'original'].includes(lowerValue)) {
    return null;
  }

  if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/i.test(value)) {
    return null;
  }

  return value;
}

function getLanguageCacheKey(language) {
  return normalizeTranscriptionLanguage(language) || 'auto';
}

function getPrompt(previousText = '') {
  const defaultPrompt =
    'This is a movie subtitle. Keep it concise and sync with dialogue. Ignore background noise and music.';
  return previousText ? `${defaultPrompt} Previous context: ${previousText}` : defaultPrompt;
}

function getResponsePreview(data) {
  if (data == null) return '';

  const raw = typeof data === 'string' ? data : JSON.stringify(data);
  return raw.length > MAX_ERROR_BODY_LENGTH
    ? `${raw.slice(0, MAX_ERROR_BODY_LENGTH)}...`
    : raw;
}

function formatWhisperError(error, provider, endpoint) {
  const providerLabel = provider
    ? `${provider.type || 'unknown'} Whisper at ${provider.baseUrl || 'unknown-url'}`
    : 'Whisper';

  if (error.response) {
    const bodyPreview = getResponsePreview(error.response.data);
    return [
      `${providerLabel} ${endpoint} returned HTTP ${error.response.status}`,
      bodyPreview ? `Response: ${bodyPreview}` : '',
    ].filter(Boolean).join('. ');
  }

  if (error.code) {
    return `${providerLabel} ${endpoint} failed with ${error.code}: ${error.message}`;
  }

  return `${providerLabel} ${endpoint} failed: ${error.message || String(error)}`;
}

async function getConfiguredRemoteWhisperUrl() {
  if (String(process.env.WHISPER_FORCE_LOCAL || '').toLowerCase() === 'true') {
    return '';
  }

  try {
    const setting = await Settings.findOne({ key: 'colab_whisper_url' });
    return normalizeRemoteWhisperUrl(setting?.value || '');
  } catch (error) {
    console.warn(`[WhisperClient] Ignoring invalid remote Whisper URL: ${error.message}`);
    return '';
  }
}

async function getWhisperProvider() {
  const remoteUrl = await getConfiguredRemoteWhisperUrl();
  if (remoteUrl) {
    return {
      type: 'remote',
      baseUrl: remoteUrl,
      timeout: REMOTE_WHISPER_TIMEOUT_MS,
    };
  }

  return {
    type: 'local',
    baseUrl: normalizeRemoteWhisperUrl(LOCAL_WHISPER_API_URL),
    timeout: LOCAL_WHISPER_TIMEOUT_MS,
  };
}

async function transcribeWithRemoteProvider(audioPath, provider, options = {}) {
  const form = new FormData();
  const language = normalizeTranscriptionLanguage(options.language);

  form.append('file', fs.createReadStream(audioPath));
  if (language) {
    form.append('language', language);
  }
  if (options.previousText) {
    form.append('prompt', getPrompt(options.previousText));
  }

  let response;
  try {
    response = await axios.post(`${provider.baseUrl}/transcribe`, form, {
      headers: {
        ...form.getHeaders(),
        'ngrok-skip-browser-warning': '69420',
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: provider.timeout,
    });
  } catch (error) {
    if (![404, 405].includes(error.response?.status)) {
      throw new Error(formatWhisperError(error, provider, '/transcribe'));
    }

    return transcribeWithOpenAiCompatibleProvider(audioPath, provider, options, {
      'ngrok-skip-browser-warning': '69420',
    });
  }

  if (typeof response.data === 'string') {
    return response.data;
  }

  if (response.data?.success && response.data?.vtt) {
    return response.data.vtt;
  }

  if (response.data?.vtt) {
    return response.data.vtt;
  }

  if (response.data?.text) {
    return response.data.text;
  }

  throw new Error(response.data?.error || 'Remote Whisper returned an unsupported response');
}

async function transcribeWithOpenAiCompatibleProvider(audioPath, provider, options = {}, extraHeaders = {}) {
  const form = new FormData();
  const language = normalizeTranscriptionLanguage(options.language);

  form.append('file', fs.createReadStream(audioPath));
  form.append('model', options.model || DEFAULT_WHISPER_MODEL);
  form.append('response_format', options.responseFormat || 'vtt');
  form.append('temperature', '0');
  form.append('prompt', getPrompt(options.previousText));
  if (language) {
    form.append('language', language);
  }

  let response;
  try {
    response = await axios.post(`${provider.baseUrl}/v1/audio/transcriptions`, form, {
      headers: { ...form.getHeaders(), ...extraHeaders },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: provider.timeout,
      responseType: 'text',
      transformResponse: [(data) => data],
    });
  } catch (error) {
    throw new Error(formatWhisperError(error, provider, '/v1/audio/transcriptions'));
  }

  return typeof response.data === 'string'
    ? response.data
    : response.data.text || JSON.stringify(response.data);
}

async function transcribeAudioFile(audioPath, options = {}) {
  const provider = options.provider || await getWhisperProvider();

  if (provider.type === 'remote') {
    return transcribeWithRemoteProvider(audioPath, provider, options);
  }

  return transcribeWithOpenAiCompatibleProvider(audioPath, provider, options);
}

module.exports = {
  getConfiguredRemoteWhisperUrl,
  getLanguageCacheKey,
  getWhisperProvider,
  formatWhisperError,
  normalizeRemoteWhisperUrl,
  normalizeTranscriptionLanguage,
  transcribeAudioFile,
};
