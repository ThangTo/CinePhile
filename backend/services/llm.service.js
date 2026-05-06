const {
  createChatCompletion,
  extractChatMessageContent,
} = require('./llmProvider.service');

const VIRAL_LLM_DEFAULT_MODEL = 'google/gemini-2.0-flash-001';

/**
 * Analyze subtitle content with scene boundaries using LLM to identify viral moments.
 */
async function analyzeScenes(vttContent, sceneBoundaries = [], options = {}) {
  console.log(`[LLM] Analyzing scenes from VTT content (${vttContent.length} chars)`);

  // Keep timestamps so the LLM can return exact clip boundaries.
  const cleanVtt = vttContent
    .split('\n')
    .filter(line => line.trim() !== '' && line.trim() !== 'WEBVTT')
    .join('\n');

  const sceneInfo = sceneBoundaries.length > 0 
    ? `\n\nVisual scene changes naturally occur at these seconds: ${sceneBoundaries.map(s => s.toFixed(1)).join(', ')}.`
    : '';

  const systemPrompt = `You are a professional short-form video editor and social media content strategist.
Your task is to analyze movie subtitles and structural scene changes to identify the strongest 3-5 potential viral moments.

Rules:
1. Each moment should usually be 20-90 seconds long. Prefer 30-60 seconds when the scene allows it.
2. Pick moments with a clear hook in the first 3 seconds, emotional payoff, tension, surprise, romance, comedy, conflict, or a memorable quote.
3. Do not force fixed categories. Choose accurate categories such as Funny, Romantic, Action, Suspense, Drama, Twist, Emotional, or Quote.
4. Use subtitle timestamps for start_time and end_time. Align starts/ends with visual scene changes when possible.
5. Avoid exposition-only scenes, silent scenes, or scenes that need too much missing context.
6. Prefer clips that can stand alone on TikTok/Reels with burned-in subtitles.
7. Output strict JSON with the following structure:
{
  "clips": [
    {
      "start_time": "HH:MM:SS",
      "end_time": "HH:MM:SS",
      "category": "Funny",
      "reason": "Why this is viral and what the hook is...",
      "score": 85
    }
  ]
}`;

  const userPrompt = `Subtitles (VTT format):\n${cleanVtt}${sceneInfo}`;

  try {
    const chatCompletion = options.chatCompletion || createChatCompletion;
    const response = await chatCompletion(
      {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      },
      {
        scope: 'VIRAL',
        defaultModel: VIRAL_LLM_DEFAULT_MODEL,
        title: 'CinePhine Viral Clip Generator',
        timeoutMs: 60000,
        ...(options.providerOptions || {}),
      },
    );

    console.log(
      `[LLM] Provider ${response.provider} model ${response.model} responded in ${response.durationMs}ms`
    );

    const content = extractChatMessageContent(response.data);
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
    })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

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
