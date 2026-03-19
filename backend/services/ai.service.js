const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { tempFilePath } = require('./videoProcessing.service');

// ─── Configuration ──────────────────────────────────────────────────────────
// Self-hosted Whisper (faster-whisper-server) running locally via Docker
const WHISPER_API_URL = process.env.WHISPER_API_URL || 'http://localhost:8000';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

/**
 * Speech-to-Text using self-hosted Whisper (OpenAI-compatible API).
 *
 * Sends the .mp3 file to the local faster-whisper-server and receives
 * a .vtt subtitle file back.
 *
 * @param {string} audioPath - Absolute path to the .mp3 file
 * @param {Function} [onProgress] - Callback for simulated percentage (0-100)
 * @returns {Promise<string>} - Path to the generated .vtt file
 */
async function speechToText(audioPath, onProgress) {
  console.log(`[AI] Starting speech-to-text for: ${audioPath}`);

  const FormData = (await import('form-data')).default;
  const form = new FormData();

  form.append('file', fs.createReadStream(audioPath));
  form.append('model', 'Systran/faster-whisper-large-v3');
  form.append('response_format', 'vtt');
  form.append('language', 'vi'); // Vietnamese primary, Whisper auto-detects bilingual

  // Whisper HTTP API doesn't stream progress natively.
  // We simulate a living connection by incrementing percent slowly (1% / 3s).
  let progressVal = 0;
  const progressInterval = setInterval(() => {
    progressVal += 1;
    if (progressVal > 99) progressVal = 99;
    if (onProgress) onProgress(progressVal);
  }, 3000);

  try {
    const response = await axios.post(
      `${WHISPER_API_URL}/v1/audio/transcriptions`,
      form,
      {
        headers: {
          ...form.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 0, // Disabled. Long movies can take hours!
      },
    );

    clearInterval(progressInterval);
    if (onProgress) onProgress(100);

    // Response is the raw VTT text
    const vttContent = typeof response.data === 'string'
      ? response.data
      : response.data.text || JSON.stringify(response.data);

    // Save to temp .vtt file
    const vttPath = tempFilePath('.vtt');
    fs.writeFileSync(vttPath, vttContent, 'utf-8');

    console.log(`[AI] VTT subtitle generated: ${vttPath}`);
    return vttPath;
  } catch (error) {
    clearInterval(progressInterval);
    const errMsg = error.response
      ? `${error.response.status} — ${JSON.stringify(error.response.data)}`
      : error.message;
    console.error(`[AI] Speech-to-text failed: ${errMsg}`);
    throw new Error(`Speech-to-text failed: ${errMsg}`);
  }
}

/**
 * Analyze subtitle content with an LLM to identify viral moments.
 *
 * Sends the VTT text to OpenRouter and asks the LLM to pick 3 potential
 * viral clips (Funny, Romantic, Action) of 30–60 seconds each.
 *
 * @param {string} vttContent - Raw VTT subtitle text
 * @returns {Promise<Array<{start_time: string, end_time: string, category: string, reason: string}>>}
 */
async function analyzeScenes(vttContent) {
  console.log(`[AI] Analyzing scenes from VTT content (${vttContent.length} chars)`);

  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const systemPrompt = `You are a professional video editor and social media content strategist.
Your task is to analyze movie/show subtitles and identify exactly 3 potential viral moments.

Rules:
- Each moment must be 30–60 seconds long.
- You must identify one moment for each category: Funny, Romantic, Action.
- Use the timestamps from the subtitles to determine start_time and end_time.
- Return ONLY a valid JSON array with no additional text, markdown, or explanation.

Output format (strict JSON array):
[
  {
    "start_time": "HH:MM:SS",
    "end_time": "HH:MM:SS",
    "category": "Funny",
    "reason": "Brief explanation of why this moment is viral-worthy"
  },
  {
    "start_time": "HH:MM:SS",
    "end_time": "HH:MM:SS",
    "category": "Romantic",
    "reason": "Brief explanation"
  },
  {
    "start_time": "HH:MM:SS",
    "end_time": "HH:MM:SS",
    "category": "Action",
    "reason": "Brief explanation"
  }
]`;

  const userPrompt = `Here are the subtitles (VTT format) from a movie. Analyze them and identify 3 viral moments:\n\n${vttContent}`;

  try {
    const response = await axios.post(
      `${OPENROUTER_BASE_URL}/chat/completions`,
      {
        model: 'google/gemini-2.0-flash-001',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://cinephine.app',
          'X-Title': 'CinePhine Viral Clip Generator',
        },
        timeout: 60000,
      },
    );

    const content = response.data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('LLM returned empty response');
    }

    // Parse JSON — handle potential markdown wrapping
    let jsonStr = content.trim();
    // Strip markdown code fences if present
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    let scenes;
    try {
      const parsed = JSON.parse(jsonStr);
      // Handle both direct array and {scenes: [...]} wrapper
      scenes = Array.isArray(parsed) ? parsed : (parsed.scenes || parsed.moments || parsed.clips || Object.values(parsed)[0]);
    } catch (parseErr) {
      console.error(`[AI] Failed to parse LLM JSON: ${jsonStr}`);
      throw new Error(`LLM returned invalid JSON: ${parseErr.message}`);
    }

    if (!Array.isArray(scenes) || scenes.length === 0) {
      throw new Error('LLM did not return a valid array of scenes');
    }

    // Validate each scene has required fields
    const validated = scenes.map((scene, i) => {
      if (!scene.start_time || !scene.end_time || !scene.category) {
        throw new Error(`Scene ${i} missing required fields: ${JSON.stringify(scene)}`);
      }
      return {
        start_time: scene.start_time,
        end_time: scene.end_time,
        category: scene.category,
        reason: scene.reason || 'N/A',
      };
    });

    console.log(`[AI] Identified ${validated.length} viral scenes`);
    return validated;
  } catch (error) {
    if (error.response) {
      console.error(`[AI] LLM API error: ${error.response.status}`, error.response.data);
    } else {
      console.error(`[AI] Scene analysis failed: ${error.message}`);
    }
    throw error;
  }
}

module.exports = {
  speechToText,
  analyzeScenes,
};
