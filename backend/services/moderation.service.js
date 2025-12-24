// ============================================
// ENVIRONMENT VARIABLES
// ============================================
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const SYSTEM_PROMPT = `You are a Content Moderation AI for CinePhile.
Your task is to analyze user comments and detect violations.

CATEGORIES:
- "spam": Advertising, repetitive content, nonsense, unrelated links.
- "toxic": Hate speech, harassment, insults, offensive language.
- "spoiler": Revealing major plot points without warning.
- "safe": None of the above.

OUTPUT FORMAT:
Return ONLY a valid JSON object. Do not include markdown formatting (\\\`\\\`\\\`json ... \\\`\\\`\\\`).
{
  "flag": "safe" | "spam" | "toxic" | "spoiler",
  "reason": "Short explanation in Vietnamese" (null if safe)
}

EXAMPLE:
Input: "Phim như hạch, diễn viên ngu vãi"
Output: { "flag": "toxic", "reason": "Ngôn từ xúc phạm, thô tục" }
`;

async function checkComment(content) {
  if (!OPENROUTER_API_KEY) {
    console.warn('OPENROUTER_API_KEY not configured, skipping AI moderation');
    return { flag: null, reason: null };
  }

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.CLIENT_URL || 'https://cinephile.app',
        'X-Title': 'CinePhile Moderator',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini', // Fast and cheap model
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: content }
        ],
        temperature: 0.1, // Low temperature for consistent classification
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || 'OpenRouter API error');
    }

    const data = await res.json();
    const rawText = data.choices?.[0]?.message?.content?.trim() || '{}';
    
    // Clean up if AI returns markdown code block despite instructions
    const jsonStr = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    
    const result = JSON.parse(jsonStr);

    if (result.flag === 'safe') {
      return { flag: null, reason: null };
    }

    return {
      flag: result.flag,
      reason: result.reason || 'AI Flagged'
    };

  } catch (error) {
    console.error('Moderation AI failed:', error.message);
    // Fail accept - allow comment if AI fails, or maybe 'pending' depends on policy.
    // For now, return null (safe) to avoid blocking users due to technical errors
    return { flag: null, reason: null };
  }
}

module.exports = {
  checkComment
};
