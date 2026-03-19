import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import http from "../lib/axios";
import { io } from "socket.io-client";

// ====================================================================
// HEY TIMI - VOICE ASSISTANT CONTEXT (v7 - WebSocket + Deepgram Streaming)
// ====================================================================

const VoiceContext = createContext();

const MODEL_URL = process.env.REACT_APP_MODEL_URL || "https://teachablemachine.withgoogle.com/models/EdvGvkVEl/";
const WAKE_WORD_THRESHOLD = process.env.REACT_APP_WAKE_WORD_THRESHOLD || 0.85;
const WAKE_WORD_LABEL = process.env.REACT_APP_WAKE_WORD_LABEL || "Class 2";
const COMMAND_TIMEOUT = process.env.REACT_APP_COMMAND_TIMEOUT || 7000;
const WAKE_COOLDOWN = process.env.REACT_APP_WAKE_COOLDOWN || 5000;
const MAX_SPEECH_FAILURES = process.env.REACT_APP_MAX_SPEECH_FAILURES || 3;
const LS_KEY_ENABLED = process.env.REACT_APP_LS_KEY_ENABLED || "timi_enabled";

export const VoiceProvider = ({ children }) => {
  // ============ TOGGLE STATE ============
  const [isEnabled, setIsEnabled] = useState(() => {
    try { return localStorage.getItem(LS_KEY_ENABLED) === "true"; } catch { return false; }
  });
  const [showOnboarding, setShowOnboarding] = useState(false);

  // ============ VOICE STATE ============
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isListeningWake, setIsListeningWake] = useState(false);
  const [isListeningCommand, setIsListeningCommand] = useState(false);
  const [lastTranscript, setLastTranscript] = useState("");
  const [voiceError, setVoiceError] = useState(null);
  const [isThinking, setIsThinking] = useState(false);
  const [socketConnection, setSocketConnection] = useState(null);

  // Refs
  const recognizerRef = useRef(null);
  const speechRecRef = useRef(null);
  const isProcessingRef = useRef(false);
  const cooldownRef = useRef(false);
  const speechFailCountRef = useRef(0);
  const handleWakeWordRef = useRef(null);
  const currentAudioRef = useRef(null);

  // Conversation Memory: lưu tối đa 6 tin nhắn gần nhất (3 cặp user+assistant)
  const conversationHistoryRef = useRef([]);

  // Khởi tạo Audio lưu trữ cố định để bypass luật Autoplay của trình duyệt
  const [ttsAudioPlayer] = useState(() => typeof Audio !== "undefined" ? new Audio() : null);
  const audioContextUnlockedRef = useRef(false);

  // ============ TOGGLE FUNCTION ============
  const toggleVoice = useCallback((forceValue) => {
    const newVal = forceValue !== undefined ? forceValue : !isEnabled;
    setIsEnabled(newVal);
    try { localStorage.setItem(LS_KEY_ENABLED, String(newVal)); } catch {}

    // Unlock Audio Context (Bypass browser autoplay policy by playing silent audio on user click)
    if (newVal && !audioContextUnlockedRef.current && ttsAudioPlayer) {
      // 0.1s silent wav base64
      ttsAudioPlayer.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
      ttsAudioPlayer.play().then(() => {
        audioContextUnlockedRef.current = true;
      }).catch(() => {});
    }

    // Nếu đây là lần đầu bật (chưa xem onboarding)
    if (newVal) {
      try {
        if (!localStorage.getItem("timi_onboarding_seen")) {
          setShowOnboarding(true);
        }
      } catch {}
    }
  }, [isEnabled]);

  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
    try { localStorage.setItem("timi_onboarding_seen", "true"); } catch {}
  }, []);

  const showOnboardingAgain = useCallback(() => {
    setShowOnboarding(true);
  }, []);

  // ============ PHÁT ÂM THANH TING ============
  const playTing = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") ctx.resume().catch(() => {});

      const playNote = (freq, start, dur) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.3, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
        osc.start(start);
        osc.stop(start + dur);
      };

      const now = ctx.currentTime;
      playNote(880, now, 0.15);
      playNote(1175, now + 0.12, 0.2);
      setTimeout(() => ctx.close().catch(() => {}), 1000);
    } catch (e) {
      console.warn("[Timi] Ting error:", e.message);
    }
  }, []);

  // ============ TTS: TIMI NÓI PHẢN HỒI ============
  const speakReply = useCallback((text, audioUrl) => {
    if (!text || typeof text !== "string") return;
    try {
      window.speechSynthesis.cancel(); // Dừng giọng ngầm định cũ nếu có
      if (ttsAudioPlayer) {
        ttsAudioPlayer.pause();
        ttsAudioPlayer.currentTime = 0;
      }

      if (audioUrl && ttsAudioPlayer) {
        // Dùng API Voice chất lượng cao đã unlock
        ttsAudioPlayer.src = audioUrl;
        ttsAudioPlayer.play().catch(err => {
          console.warn("[Timi] Trình duyệt chặn tự động phát Audio:", err);
          // Fallback
          const utter = new SpeechSynthesisUtterance(text);
          utter.lang = "vi-VN";
          utter.rate = 1.1;
          window.speechSynthesis.speak(utter);
        });
      } else {
        // Dự phòng: WebSpeech cổ điển
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = "vi-VN";
        utter.rate = 1.1;
        utter.pitch = 1.0;
        window.speechSynthesis.speak(utter);
      }
    } catch (e) {
      console.warn("[Timi] TTS error:", e.message);
    }
  }, []);

  // ============ EXECUTE COMMANDS (SHARED LOGIC) ============
  const executeCommands = useCallback((data) => {
    if (data.success && data.commands && data.commands.length > 0) {
      for (const cmd of data.commands) {
        if (cmd.action === "VOICE_CMD_NAVIGATE") {
          const dest = cmd.payload?.destination;
          const query = cmd.payload?.search_query;
          if (dest === "HOME") window.location.href = "/";
          else if (dest === "SEARCH" && query) window.location.href = `/search?q=${encodeURIComponent(query)}`;
          else if (dest === "SEARCH") window.location.href = "/search";
          else if (dest === "PROFILE") window.location.href = "/account";
        } else if (cmd.action === "VOICE_CMD_NAVIGATE_TO_WATCH") {
          const { id, ep, audio } = cmd.payload || {};
          if (id) {
            let url = `/watch/${id}`;
            const params = [];
            if (ep) params.push(`ep=${ep}`);
            if (audio) params.push(`audio=${encodeURIComponent(audio)}`);
            if (params.length > 0) url += '?' + params.join('&');
            window.location.href = url;
          }
        } else if (cmd.action === "VOICE_CMD_SEEK_TO") {
          const targetTime = cmd.payload?.time;
          if (targetTime !== undefined) {
            const v = document.querySelector("video");
            if (v) v.currentTime = targetTime;
          }
        } else if (cmd.action === "VOICE_CMD_SCROLL") {
          const direction = cmd.payload?.direction;
          const scrollAmount = window.innerHeight * 0.7;
          if (direction === "UP") window.scrollBy({ top: -scrollAmount, behavior: "smooth" });
          else if (direction === "DOWN") window.scrollBy({ top: scrollAmount, behavior: "smooth" });
        } else if (cmd.action === "VOICE_CMD_REFRESH_DATA") {
          setTimeout(() => window.location.reload(), 2000);
        } else if (cmd.action === "VOICE_CMD_CHANGE_EPISODE") {
          window.dispatchEvent(new CustomEvent("VOICE_CMD_CHANGE_EPISODE", { detail: { episode_number: cmd.payload?.episode_number } }));
        } else if (cmd.action === "VOICE_CMD_CHANGE_AUDIO") {
          window.dispatchEvent(new CustomEvent("VOICE_CMD_CHANGE_AUDIO", { detail: { audio_type: cmd.payload?.audio_type } }));
        } else if (cmd.action === "VOICE_CMD_MAX_VOLUME") {
          window.dispatchEvent(new CustomEvent("VOICE_CMD_MAX_VOLUME"));
        } else if (cmd.action === "VOICE_CMD_NEXT_EPISODE") {
          window.dispatchEvent(new CustomEvent("VOICE_CMD_NEXT_EP"));
        } else if (cmd.action === "VOICE_CMD_PREV_EPISODE") {
          window.dispatchEvent(new CustomEvent("VOICE_CMD_PREV_EP"));
        } else if (cmd.payload) {
          window.dispatchEvent(new CustomEvent(cmd.action, { detail: cmd.payload }));
        } else {
          window.dispatchEvent(new CustomEvent(cmd.action));
        }
      }
    }
  }, []);

  // ============ XỬ LÝ LỆNH QUA HTTP FALLBACK ============
  const processCommandHTTP = useCallback(async (transcript) => {
    const text = transcript.trim();
    if (!text || text.length < 2) return false;

    console.log("[Timi] 🧠 [HTTP Fallback] Gửi tới AI:", text);
    setIsThinking(true);

    try {
      const videoEl = document.querySelector("video");
      const uiContext = {
        current_path: window.location.pathname,
        is_video_playing: window.location.pathname.includes('/watch'),
        video_duration: videoEl?.duration ? Math.floor(videoEl.duration) : null,
      };

      const resp = await http.post("/ai/command", {
        transcript: text,
        context: uiContext,
        history: conversationHistoryRef.current,
      }, { timeout: 30000 });

      const data = resp.data;
      console.log("[Timi] 🤖 AI Response:", data);

      executeCommands(data);

      if (data.reply) {
        speakReply(data.reply, data.audioUrl);
        setLastTranscript(data.reply);
      }

      conversationHistoryRef.current.push({ role: 'user', content: text });
      if (data.reply) conversationHistoryRef.current.push({ role: 'assistant', content: data.reply });
      if (conversationHistoryRef.current.length > 6) {
        conversationHistoryRef.current = conversationHistoryRef.current.slice(-6);
      }

      return data.success;
    } catch (err) {
      console.error("[Timi] AI fetch error:", err);
      speakReply("Xin lỗi, Timi đang bị lỗi kết nối.");
      return false;
    } finally {
      setIsThinking(false);
    }
  }, [speakReply, executeCommands]);

  // ============ RESET TRẠNG THÁI ============
  const resetState = useCallback(() => {
    isProcessingRef.current = false;
    setIsListeningCommand(false);
    setLastTranscript("");
    window.dispatchEvent(new CustomEvent("VOICE_CMD_RESTORE_AUDIO"));
  }, []);

  // ============ KHỞI ĐỘNG LẠI TFJS WAKE WORD ============
  const startWakeWordListening = useCallback(async () => {
    const rec = recognizerRef.current;
    if (!rec) return;

    await new Promise((r) => setTimeout(r, 1500));

    try {
      try {
        if (rec.isListening()) {
          try { 
            const p = rec.stopListening();
            if (p && p.catch) p.catch(() => {});
          } catch (e) {}
          await new Promise((r) => setTimeout(r, 300));
        }
      } catch (e) {}

      await rec.listen(
        (result) => {
          if (handleWakeWordRef.current) handleWakeWordRef.current(result);
        },
        {
          includeSpectrogram: false,
          probabilityThreshold: 0.5,
          invokeCallbackOnNoiseAndUnknown: false,
          overlapFactor: 0.5,
        }
      );
      setIsListeningWake(true);
      console.log("[Timi] 🎧 Đang lắng nghe 'Hey Timi'...");
    } catch (err) {
      console.error("[Timi] Lỗi khởi động TFJS:", err);
    }
  }, []);

  // ============ WEB SPEECH STT (CLASSIC) ============
  const startCommandListeningFallback = useCallback(() => {
    if (speechFailCountRef.current >= MAX_SPEECH_FAILURES) {
      setVoiceError("Speech API không khả dụng. Hãy dùng Chrome và kiểm tra mạng.");
      setTimeout(() => setVoiceError(null), 8000);
      resetState();
      startWakeWordListening();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      speechFailCountRef.current = MAX_SPEECH_FAILURES;
      setVoiceError("Trình duyệt không hỗ trợ (hãy dùng Chrome).");
      setTimeout(() => setVoiceError(null), 8000);
      resetState();
      startWakeWordListening();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "vi-VN";
    recognition.continuous = false; // Tắt continuous để tránh việc STT tự động sửa lỗi sai (vd: Trục Ngọc -> trùng Ngọc) khi người dùng ngưng nói
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    speechRecRef.current = recognition;

    let timeoutId = null;
    let hasReset = false;
    let finalTranscript = "";

    const doReset = () => {
      if (hasReset) return;
      hasReset = true;
      clearTimeout(timeoutId);
      resetState();
      startWakeWordListening();
    };

    // Khi speech kết thúc, gửi transcript cuối cùng tới AI
    const sendToAI = async () => {
      if (finalTranscript.trim()) {
        setLastTranscript(finalTranscript.trim());
        await processCommandHTTP(finalTranscript);
      }
    };

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        transcript += event.results[i][0].transcript;
      }
      const trimmed = transcript.trim();
      if (trimmed) {
        finalTranscript = trimmed;
        setLastTranscript(trimmed);
      }
    };

    recognition.onerror = (event) => {
      console.warn("[Timi] Speech Error:", event.error);
      if (event.error === "network") {
        speechFailCountRef.current += 1;
        setVoiceError("Lỗi kết nối giọng nói. Hãy kiểm tra mạng hoặc dùng Chrome.");
      } else if (event.error === "not-allowed") {
        speechFailCountRef.current = MAX_SPEECH_FAILURES;
        setVoiceError("Mic bị chặn. Hãy cho phép truy cập.");
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        setVoiceError(`Lỗi giọng nói: ${event.error}`);
      }
      setTimeout(() => setVoiceError(null), 5000);
      doReset();
    };

    recognition.onend = async () => {
      // Gửi tới AI khi mic kết thúc
      speechFailCountRef.current = 0;
      await sendToAI();
      doReset();
    };

    try {
      recognition.start();
      setIsListeningCommand(true);
      console.log("[Timi] 🎙️ Đang nghe lệnh...");
      timeoutId = setTimeout(() => {
        try { if (speechRecRef.current) speechRecRef.current.stop(); } catch (e) {}
      }, COMMAND_TIMEOUT);
    } catch (err) {
      speechFailCountRef.current += 1;
      doReset();
    }
  }, [processCommandHTTP, resetState, startWakeWordListening]);

  // ============ WAKE WORD HANDLER ============
  const handleWakeWord = useCallback(
    (result) => {
      if (isProcessingRef.current || cooldownRef.current) return;

      const { scores } = result;
      const rec = recognizerRef.current;
      if (!rec) return;

      const labels = rec.wordLabels();
      const wakeIdx = labels.indexOf(WAKE_WORD_LABEL);
      if (wakeIdx === -1) return;

      const wakeScore = scores[wakeIdx];

      if (wakeScore > WAKE_WORD_THRESHOLD) {
        console.log(`[Timi] 🔔 DETECTED! Score: ${(wakeScore * 100).toFixed(1)}%`);
        isProcessingRef.current = true;
        cooldownRef.current = true;
        setTimeout(() => { cooldownRef.current = false; }, WAKE_COOLDOWN);

        setTimeout(() => {
          if (isProcessingRef.current) {
            console.warn("[Timi] Watchdog reset!");
            resetState();
            startWakeWordListening();
          }
        }, 25000);

        window.dispatchEvent(new CustomEvent("VOICE_CMD_DUCK_AUDIO"));

        try {
          if (rec.isListening()) {
            try { 
              const p = rec.stopListening();
              if (p && p.catch) p.catch(() => {});
            } catch (e) {}
            setIsListeningWake(false);
          }
        } catch (e) {}

        if (speechFailCountRef.current < MAX_SPEECH_FAILURES) playTing();

        // KÍCH HOẠT NHẬN DIỆN GIỌNG NÓI CHÍNH (WEB SPEECH API)
        setTimeout(() => {
          startCommandListeningFallback();
        }, 700);
      }
    },
    [playTing, startCommandListeningFallback, resetState, startWakeWordListening]
  );

  useEffect(() => {
    handleWakeWordRef.current = handleWakeWord;
  }, [handleWakeWord]);

  // ============ KHỞI TẠO / HUỶ TFJS MODEL (LAZY LOAD — chỉ khi isEnabled) ============
  useEffect(() => {
    if (!isEnabled) {
      // TẮT: Dọn dẹp mọi thứ
      if (recognizerRef.current) {
        try {
          if (recognizerRef.current.isListening()) {
            try { 
              const p = recognizerRef.current.stopListening();
              if (p && p.catch) p.catch(() => {});
            } catch (e) {}
          }
        } catch (e) {}
        recognizerRef.current = null;
      }
      if (speechRecRef.current) {
        try { speechRecRef.current.abort(); } catch (e) {}
        speechRecRef.current = null;
      }
      setIsModelLoaded(false);
      setIsListeningWake(false);
      setIsListeningCommand(false);
      setLastTranscript("");
      setVoiceError(null);
      isProcessingRef.current = false;
      cooldownRef.current = false;
      speechFailCountRef.current = 0;
      console.log("[Timi] 🔴 Timi đã tắt.");
      return;
    }

    // BẬT: Lazy-load model
    let isMounted = true;

    const initModel = async () => {
      try {
        const tf = await import("@tensorflow/tfjs");
        const speechCommands = await import("@tensorflow-models/speech-commands");

        console.log("[Timi] Đang tải model...");

        const recognizer = speechCommands.create(
          "BROWSER_FFT",
          null,
          MODEL_URL + "model.json",
          MODEL_URL + "metadata.json"
        );

        await recognizer.ensureModelLoaded();
        console.log("[Timi] ✅ Model loaded! Labels:", recognizer.wordLabels());

        if (!isMounted) return;
        recognizerRef.current = recognizer;
        setIsModelLoaded(true);

        await recognizer.listen(
          (result) => {
            if (handleWakeWordRef.current) handleWakeWordRef.current(result);
          },
          {
            includeSpectrogram: false,
            probabilityThreshold: 0.5,
            invokeCallbackOnNoiseAndUnknown: false,
            overlapFactor: 0.5,
          }
        );

        if (isMounted) {
          setIsListeningWake(true);
          console.log("[Timi] 🎧 Đang lắng nghe 'Hey Timi'...");
        }
      } catch (err) {
        console.error("[Timi] ❌ Init error:", err);
        if (isMounted) {
          if (err.name === 'NotFoundError' || err.message.includes('NotFound')) {
            setVoiceError("Không tìm thấy Microphone! Vui lòng cắm Mic vào máy tính.");
          } else if (err.name === 'NotAllowedError' || err.message.includes('NotAllowed')) {
            setVoiceError("Mic bị chặn. Vui lòng cấp quyền Microphone trên trình duyệt.");
          } else {
            setVoiceError("Không thể tải Voice Model. Lỗi: " + err.message);
          }
        }
      }
    };

    initModel();

    return () => {
      isMounted = false;
      try {
        if (recognizerRef.current && recognizerRef.current.isListening()) {
          try { 
            const p = recognizerRef.current.stopListening();
            if (p && p.catch) p.catch(() => {});
          } catch (e) {}
        }
      } catch (e) {}
      try { speechRecRef.current?.abort(); } catch (e) {}
    };
  }, [isEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // ============ CONTEXT VALUE ============
  return (
    <VoiceContext.Provider
      value={{
        isEnabled,
        isModelLoaded,
        isListeningWake,
        isListeningCommand,
        isThinking,
        lastTranscript,
        voiceError,
        showOnboarding,
        toggleVoice,
        dismissOnboarding,
        showOnboardingAgain,
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoice = () => {
  const context = useContext(VoiceContext);
  if (!context) throw new Error("useVoice phải dùng trong VoiceProvider");
  return context;
};

export default VoiceContext;
