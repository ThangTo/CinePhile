const {
  createChatCompletion,
  extractChatMessageContent,
} = require('./llmProvider.service');

function resolveProviderName(...values) {
  return String(values.find((value) => value !== undefined && value !== null && String(value).trim() !== '') || 'openrouter')
    .trim()
    .toLowerCase();
}

function getDefaultModerationModel(provider) {
  if (provider === 'gemini') return 'gemini-2.5-flash';
  if (provider === 'openai') return 'gpt-4o-mini';
  return 'openai/gpt-4o-mini';
}

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
  try {
    const provider = resolveProviderName(
      process.env.MODERATION_LLM_PROVIDER,
      process.env.LLM_PROVIDER,
      'openrouter',
    );
    const response = await createChatCompletion(
      {
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: content }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      },
      {
        scope: 'MODERATION',
        provider,
        defaultModel: getDefaultModerationModel(provider),
        title: 'CinePhile Moderator',
        timeoutMs: 15000,
      },
    );

    const rawText = extractChatMessageContent(response.data)?.trim() || '{}';
    
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
