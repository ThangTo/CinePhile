const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');
const { callOpenRouterWithFallback } = require('../utils/llmUtils');
const { generateTtsAudio } = require('../utils/ttsUtils');
const {
  executeToolCalls,
  getSystemPrompt,
  TOOLS,
  LLM_MODELS,
  REQUEST_TIMEOUT,
} = require('../controllers/ai.controller');

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

/**
 * Khởi tạo Socket.IO server và gắn vào HTTP server
 * @param {import('http').Server} httpServer
 */
function initVoiceSocket(httpServer) {
  if (!DEEPGRAM_API_KEY) {
    console.warn('[VoiceSocket] ⚠️ DEEPGRAM_API_KEY chưa được cấu hình → WebSocket voice disabled');
    return null;
  }

  const allowedOrigins = [
    process.env.CLIENT_URL,
    process.env.CLIENT_URL_LOCAL || 'http://localhost:5001',
  ].filter(Boolean);

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
          cb(null, true);
        } else {
          cb(new Error('CORS blocked'));
        }
      },
      credentials: true,
    },
    path: '/voice-ws',
    transports: ['websocket', 'polling'],
    maxHttpBufferSize: 1e6, // 1MB max cho audio chunks
  });

  // ====================================================================
  // MIDDLEWARE: Xác thực JWT từ handshake
  // ====================================================================
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = { id: decoded.id || decoded._id, role: decoded.role };
      } catch {
        socket.user = null;
      }
    } else {
      socket.user = null;
    }
    next();
  });

  // ====================================================================
  // CONNECTION HANDLER
  // ====================================================================
  io.on('connection', (socket) => {
    console.log(`[VoiceSocket] ✅ Client connected: ${socket.id} | User: ${socket.user?.id || 'GUEST'}`);

    let deepgramConnection = null;
    let deepgramReady = false;        // Flag: Deepgram đã Open chưa?
    let audioBuffer = [];             // Buffer chứa chunks gửi trước khi Open
    let keepAliveInterval = null;     // Interval gửi keepAlive cho Deepgram
    let chunkCount = 0;               // Đếm debug
    let conversationHistory = [];
    let currentContext = {};

    // Hàm cleanup Deepgram
    const cleanupDeepgram = () => {
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
      }
      if (deepgramConnection) {
        try { deepgramConnection.finish(); } catch {}
        deepgramConnection = null;
      }
      deepgramReady = false;
      audioBuffer = [];
      chunkCount = 0;
    };

    socket.on('start_stream', (data) => {
      const context = data?.context || {};
      const nativeSR = data?.nativeSR || 16000;
      currentContext = context;
      console.log(`[VoiceSocket] 🎤 Starting Deepgram stream for ${socket.id} | SR: ${nativeSR}`);

      // Cleanup previous
      cleanupDeepgram();

      try {
        const deepgram = createClient(DEEPGRAM_API_KEY);
        deepgramConnection = deepgram.listen.live({
          model: 'nova-2',
          language: 'vi',
          smart_format: true,
          interim_results: true,
          vad_events: true,
          endpointing: 500,
        });

        deepgramConnection.on(LiveTranscriptionEvents.Open, () => {
          console.log(`[VoiceSocket] 🟢 Deepgram OPEN for ${socket.id} | Buffered chunks: ${audioBuffer.length}`);
          deepgramReady = true;

          // Flush buffer (gửi audio đã nhận trước khi Deepgram sẵn sàng)
          for (const chunk of audioBuffer) {
            try { deepgramConnection.send(chunk); } catch {}
          }
          audioBuffer = [];

          // KeepAlive: gửi tín hiệu định kỳ giữ connection sống
          keepAliveInterval = setInterval(() => {
            if (deepgramConnection) {
              try { deepgramConnection.keepAlive(); } catch {}
            }
          }, 5000);

          socket.emit('stt_ready');
        });

        deepgramConnection.on(LiveTranscriptionEvents.Transcript, async (dgResponse) => {
          const alt = dgResponse.channel?.alternatives?.[0];
          if (!alt) return;

          const transcript = alt.transcript;
          if (!transcript || transcript.trim().length === 0) return;

          const isFinal = dgResponse.is_final;

          // Gửi interim / final về client
          socket.emit('stt_result', {
            transcript,
            is_final: isFinal,
            confidence: alt.confidence,
          });

          console.log(`[VoiceSocket] 📝 ${isFinal ? 'FINAL' : 'interim'}: "${transcript}"`);

          // Chỉ xử lý khi là final transcript
          if (isFinal && transcript.trim().length > 1) {
            // Đóng Deepgram stream
            cleanupDeepgram();

            // Xử lý lệnh qua LLM pipeline
            await processTranscript(socket, transcript.trim(), { ...currentContext }, conversationHistory);
          }
        });

        deepgramConnection.on(LiveTranscriptionEvents.Error, (err) => {
          console.error(`[VoiceSocket] ❌ Deepgram Error:`, err.message || err);
          socket.emit('stt_error', { message: 'Lỗi nhận diện giọng nói' });
          cleanupDeepgram();
        });

        deepgramConnection.on(LiveTranscriptionEvents.Close, () => {
          console.log(`[VoiceSocket] 🔴 Deepgram CLOSED for ${socket.id} | Chunks received: ${chunkCount}`);
          deepgramReady = false;
        });

      } catch (err) {
        console.error('[VoiceSocket] Failed to create Deepgram connection:', err.message);
        socket.emit('stt_error', { message: 'Không thể kết nối dịch vụ nhận diện giọng nói' });
      }
    });

    // ------------------------------------------------------------------
    // EVENT: audio_chunk — Nhận audio binary từ mic của client
    // ------------------------------------------------------------------
    socket.on('audio_chunk', (audioData) => {
      chunkCount++;
      if (chunkCount <= 3 || chunkCount % 50 === 0) {
        console.log(`[VoiceSocket] 🔊 Chunk #${chunkCount} | Size: ${audioData?.byteLength || audioData?.length || 0} bytes | DG Ready: ${deepgramReady}`);
      }

      if (!deepgramConnection) return;

      // Đảm bảo dữ liệu là Buffer (Socket.IO có thể gửi ArrayBuffer)
      const buffer = Buffer.isBuffer(audioData) ? audioData : Buffer.from(audioData);

      if (deepgramReady) {
        try { deepgramConnection.send(buffer); } catch {}
      } else {
        // Buffer chunk nếu Deepgram chưa sẵn sàng (tối đa 20 chunks ~ 5s audio)
        if (audioBuffer.length < 20) {
          audioBuffer.push(buffer);
        }
      }
    });

    // ------------------------------------------------------------------
    // EVENT: stop_stream — Client yêu cầu dừng stream
    // ------------------------------------------------------------------
    socket.on('stop_stream', () => {
      cleanupDeepgram();
    });

    // ------------------------------------------------------------------
    // DISCONNECT
    // ------------------------------------------------------------------
    socket.on('disconnect', (reason) => {
      console.log(`[VoiceSocket] 🔌 Client disconnected: ${socket.id} | Reason: ${reason}`);
      cleanupDeepgram();
      conversationHistory = [];
    });

    // ==================================================================
    // PROCESS TRANSCRIPT — Core LLM + TTS pipeline
    // ==================================================================
    async function processTranscript(sock, transcript, context, history) {
      try {
        sock.emit('timi_thinking', true);

        context._transcript = transcript;

        const messages = [
          { role: 'system', content: getSystemPrompt(context, sock.user) },
        ];
        if (history.length > 0) {
          messages.push(...history.slice(-6));
        }
        messages.push({ role: 'user', content: transcript });

        const data = await callOpenRouterWithFallback({
          models: LLM_MODELS,
          timeoutMs: REQUEST_TIMEOUT,
          messages,
          tools: TOOLS,
          tool_choice: 'auto',
          max_tokens: 150,
          temperature: 0.3,
        });

        const choice = data.choices?.[0];
        if (!choice) {
          sock.emit('timi_response', { success: false, commands: [], reply: 'Timi không kết nối được AI.' });
          sock.emit('timi_thinking', false);
          return;
        }

        const toolCalls = choice.message?.tool_calls || [];
        const { commands, directReply } = await executeToolCalls(toolCalls, sock.user, context);
        const reply = directReply || choice.message?.content || (commands.length > 0 ? 'Dạ xong rồi ạ!' : 'Mình không hiểu ý bạn!');

        const audioUrl = await generateTtsAudio(reply);

        history.push({ role: 'user', content: transcript });
        history.push({ role: 'assistant', content: reply });
        if (history.length > 6) {
          conversationHistory = history.slice(-6);
        }

        sock.emit('timi_response', {
          success: commands.length > 0 || !!directReply,
          commands,
          reply,
          audioUrl,
        });

      } catch (err) {
        console.error('[VoiceSocket] LLM pipeline error:', err.message);
        sock.emit('timi_response', {
          success: false,
          commands: [],
          reply: 'Xin lỗi, Timi gặp lỗi hệ thống.',
        });
      } finally {
        sock.emit('timi_thinking', false);
      }
    }
  });

  console.log('[VoiceSocket] 🎙️ Voice WebSocket server initialized on path /voice-ws');
  return io;
}

module.exports = { initVoiceSocket };
