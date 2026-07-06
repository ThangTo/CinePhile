const test = require('node:test');
const assert = require('node:assert/strict');

const { handleChatStream } = require('./chat.service');

test('handleChatStream streams tokens, returns formatted answer, and saves history', async () => {
  const emitted = [];
  const saved = [];
  const fakeChat = {
    messages: [],
    addMessage: async (role, content) => {
      saved.push({ role, content });
    },
    save: async () => {},
  };
  const fakeChatModel = {
    findOrCreateSession: async () => fakeChat,
  };

  const result = await handleChatStream({
    userId: null,
    message: 'Xin chao',
    history: [],
    metadata: { page: '/' },
    sessionId: 'session-a',
    onToken: (token) => emitted.push(token),
    chatModel: fakeChatModel,
    llmStream: async function* () {
      yield { content: 'Xin ' };
      yield { content: 'chao' };
    },
  });

  assert.deepEqual(emitted, ['Xin ', 'chao']);
  assert.match(result.answer, /Xin chao/);
  assert.equal(result.plainText, 'Xin chao');
  assert.deepEqual(saved, [
    { role: 'user', content: 'Xin chao' },
    { role: 'assistant', content: 'Xin chao' },
  ]);
});
