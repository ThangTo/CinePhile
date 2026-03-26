const axios = require('axios');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

/**
 * Analyze subtitle content with scene boundaries using LLM to identify viral moments.
 */
async function analyzeScenes(vttContent, sceneBoundaries = []) {
  console.log(`[LLM] Analyzing scenes from VTT content (${vttContent.length} chars)`);

  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  // Compress VTT by removing empty lines and structural headers
  const optimizedVtt = vttContent
    .split('\n')
    .filter(line => line.trim() !== '' && !line.startsWith('WEBVTT') && line.indexOf('-->') === -1)
    .join('\n'); // Wait, removing timestamps ('-->') means the LLM can't know timestamps! We MUST KEEP timestamps.

  // Let's re-optimize: just remove WEBVTT and completely blank lines.
  const cleanVtt = vttContent
    .split('\n')
    .filter(line => line.trim() !== '' && line.trim() !== 'WEBVTT')
    .join('\n');

  const sceneInfo = sceneBoundaries.length > 0 
    ? `\n\nVisual scene changes naturally occur at these seconds: ${sceneBoundaries.map(s => s.toFixed(1)).join(', ')}.`
    : '';

  const systemPrompt = `You are a professional video editor and social media content strategist.
Your task is to analyze movie subtitles and structural scene changes to identify exactly 3 potential viral moments.

Rules:
1. Each moment MUST be 30-60 seconds long.
2. Select exactly one moment for each category: Funny, Romantic, Action. If a category doesn't fit the movie perfectly, pick the closest scene (e.g., tense dialogue for Action).
3. Use the timestamps from the subtitles to determine start_time and end_time.
4. Try to align the start and end times with the natural visual scene changes provided (if any).
5. Output strict JSON with the following structure:
{
  "clips": [
    {
      "start_time": "HH:MM:SS",
      "end_time": "HH:MM:SS",
      "category": "Funny",
      "reason": "Why this is viral...",
      "score": 85
    }
  ]
}`;

  const userPrompt = `Subtitles (VTT format):\n${cleanVtt}${sceneInfo}`;

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
        max_tokens: 1500,
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

    let jsonStr = content.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error(`[LLM] Failed to parse LLM JSON: ${jsonStr}`);
      throw new Error(`LLM returned invalid JSON: ${parseErr.message}`);
    }

    const clips = Array.isArray(parsed) ? parsed : (parsed.clips || parsed.scenes || parsed.moments || Object.values(parsed)[0]);

    if (!Array.isArray(clips) || clips.length === 0) {
      throw new Error('LLM did not return a valid array of clips');
    }

    const validated = clips.map((clip, i) => {
      if (!clip.start_time || !clip.end_time || !clip.category) {
        throw new Error(`Clip ${i} missing required fields: ${JSON.stringify(clip)}`);
      }
      return {
        start_time: String(clip.start_time),
        end_time: String(clip.end_time),
        category: String(clip.category || clip.type),
        reason: String(clip.reason || 'N/A'),
        score: Number(clip.score || 0),
      };
    });

    console.log(`[LLM] Identified ${validated.length} viral clips`);
    return validated;
  } catch (error) {
    if (error.response) {
      console.error(`[LLM] API error: ${error.response.status}`, error.response.data);
    } else {
      console.error(`[LLM] Analysis failed: ${error.message}`);
    }
    throw error;
  }
}

module.exports = {
  analyzeScenes,
};
