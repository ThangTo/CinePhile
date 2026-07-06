const { complete } = require('./llm');

const SYSTEM_PROMPT = `You are a Content Moderation AI for CinePhine.
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
  try {
    const response = await complete({
      scope: 'MODERATION',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: content },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const rawText = response.content?.trim() || '{}';

    const jsonStr = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '');

    const result = JSON.parse(jsonStr);

    if (result.flag === 'safe') {
      return { flag: null, reason: null };
    }

    return {
      flag: result.flag,
      reason: result.reason || 'AI Flagged',
    };
  } catch (error) {
    console.error('Moderation AI failed:', error.message);
    return { flag: null, reason: null };
  }
}

module.exports = {
  checkComment,
};
