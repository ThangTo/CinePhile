import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "styles/Chatbot.css";
import { getSystemInstruction } from "constants/chatbotKnowledge";

const Chatbot = () => {
  const navigate = useNavigate();
  const chatBodyRef = useRef(null);
  const messageInputRef = useRef(null);
  const sendMessageButtonRef = useRef(null);
  const fileInputRef = useRef(null);
  const fileUploadWrapperRef = useRef(null);
  const fileCancelButtonRef = useRef(null);
  const chatbotTogglerRef = useRef(null);
  const closeChatbotRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const chatFormRef = useRef(null);

  const [showChatbot, setShowChatbot] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [picker, setPicker] = useState(null);
  const [isSending, setIsSending] = useState(false);

  // Api setup
  const API_KEY = process.env.REACT_APP_API_KEY_GEMINI || "";
  // eslint-disable-next-line no-unused-vars
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

  const userDataRef = useRef({
    message: null,
    file: { data: null, mime_type: null },
  });

  const chatHistoryRef = useRef([]);
  const initialInputHeightRef = useRef(null);
  const sessionIdRef = useRef(null);

  useEffect(() => {
    let sessionId = localStorage.getItem("chatbot_sessionId");
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("chatbot_sessionId", sessionId);
    }
    sessionIdRef.current = sessionId;
  }, []);

  useEffect(() => {
    const systemInstruction = getSystemInstruction();
    if (systemInstruction && chatHistoryRef.current.length === 0) {
      chatHistoryRef.current.push({ role: "model", parts: [{ text: systemInstruction }] });
    }
  }, []);

  const createMessageElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
  };

  const buildChatMetadata = () => {
    const pathname = window.location.pathname;
    const metadata = { page: pathname };
    const movieMatch = pathname.match(/\/(movie|watch)\/([a-f0-9]{24})/i);
    if (movieMatch && movieMatch[2]) {
      metadata.movieId = movieMatch[2];
    }
    return metadata;
  };

  const generateBotResponse = async (incomingMessageDiv) => {
    const messageElement = incomingMessageDiv.querySelector(".message-text");
    chatHistoryRef.current.push({
      role: "user",
      parts: [{ text: userDataRef.current.message }],
    });

    try {
      const historyForBackend = chatHistoryRef.current
        .filter((msg) => msg.role === "user" || msg.role === "model")
        .map((msg) => ({
          role: msg.role === "model" ? "assistant" : "user",
          content: msg.parts?.[0]?.text || msg.content || "",
        }))
        .filter((msg) => msg.content.trim().length > 0);

      const payload = {
        message: userDataRef.current.message,
        history: historyForBackend,
        metadata: buildChatMetadata(),
        sessionId: sessionIdRef.current,
      };

      const res = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000/api/v1"}/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      const answerHTML = (data.answer || "").trim();
      messageElement.innerHTML = answerHTML;

      const movieLinks = messageElement.querySelectorAll(".chatbot-movie-link");
      movieLinks.forEach((link) => {
        link.addEventListener("click", (e) => {
          e.preventDefault();
          const href = link.getAttribute("href");
          if (href) navigate(href);
        });
      });

      const plainText = messageElement.textContent || messageElement.innerText || "";
      chatHistoryRef.current.push({ role: "model", parts: [{ text: plainText }] });
    } catch (error) {
      messageElement.innerText = error.message;
      messageElement.style.color = "#ff4d4d";
    } finally {
      userDataRef.current.file = {};
      incomingMessageDiv.classList.remove("thinking");
      if (chatBodyRef.current) {
        chatBodyRef.current.scrollTo({ behavior: "smooth", top: chatBodyRef.current.scrollHeight });
      }
      setIsSending(false);
    }
  };

  const handleOutgoingMessage = (e) => {
    e.preventDefault();
    if (isSending) return;

    const message = messageInputRef.current.value.trim();
    if (!message && !userDataRef.current.file.data) return;

    setIsSending(true);
    userDataRef.current.message = message || "Gửi một ảnh";
    messageInputRef.current.value = "";
    messageInputRef.current.style.height = "auto";

    // Reset file UI
    if (fileUploadWrapperRef.current) {
      fileUploadWrapperRef.current.classList.remove("file-uploaded");
    }

    const messageContent = `<div class="message-text"></div>
    ${
      userDataRef.current.file.data
        ? `<div class="attachment-wrapper"><img src="data:${userDataRef.current.file.mime_type};base64,${userDataRef.current.file.data}" class="attachment" /></div>`
        : ""
    }`;

    const outgoingMessageDiv = createMessageElement(messageContent, "user-message");
    outgoingMessageDiv.querySelector(".message-text").innerText = userDataRef.current.message;

    if (chatBodyRef.current) {
      chatBodyRef.current.appendChild(outgoingMessageDiv);
      chatBodyRef.current.scrollTo({ behavior: "smooth", top: chatBodyRef.current.scrollHeight });
    }

    setTimeout(() => {
      // SVG AVATAR CŨ (Đã style lại màu sắc)
      const messageContent = `
        <div class="bot-avatar-container">
            <svg class="bot-avatar" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
                <path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z" />
            </svg>
        </div>
        <div class="message-text">
            <div class="thinking-indicator">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>
        </div>`;

      const incomingMessageDiv = createMessageElement(messageContent, "bot-message", "thinking");
      if (chatBodyRef.current) {
        chatBodyRef.current.appendChild(incomingMessageDiv);
        chatBodyRef.current.scrollTo({ behavior: "smooth", top: chatBodyRef.current.scrollHeight });
      }
      generateBotResponse(incomingMessageDiv);
    }, 600);
  };

  const resetFileInput = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (fileUploadWrapperRef.current) {
      fileUploadWrapperRef.current.classList.remove("file-uploaded");
      const img = fileUploadWrapperRef.current.querySelector("img");
      if (img) img.src = "";
    }
    userDataRef.current.file = { data: null, mime_type: null };
  };

  // --- EVENT LISTENERS ---
  useEffect(() => {
    if (!messageInputRef.current) return;
    initialInputHeightRef.current = messageInputRef.current.scrollHeight;

    const handleKeyDown = (e) => {
      const userMessage = e.target.value.trim();
      const hasFile = userDataRef.current.file.data !== null;
      if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 768 && !isSending) {
        if (userMessage || hasFile) {
          handleOutgoingMessage(e);
        } else {
          e.preventDefault();
        }
      }
    };

    const handleInput = (e) => {
      const textarea = messageInputRef.current;
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    };

    messageInputRef.current.addEventListener("keydown", handleKeyDown);
    messageInputRef.current.addEventListener("input", handleInput);

    return () => {
      if (messageInputRef.current) {
        messageInputRef.current.removeEventListener("keydown", handleKeyDown);
        messageInputRef.current.removeEventListener("input", handleInput);
      }
    };
  }, [isSending]);

  // File Change
  useEffect(() => {
    if (!fileInputRef.current) return;
    const handleFileChange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const validImageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!validImageTypes.includes(file.type)) {
        alert("Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WEBP)");
        resetFileInput();
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        if (fileUploadWrapperRef.current) {
          const img = fileUploadWrapperRef.current.querySelector("img");
          if (img) img.src = e.target.result;
          fileUploadWrapperRef.current.classList.add("file-uploaded");
        }
        const base64String = e.target.result.split(",")[1];
        userDataRef.current.file = { data: base64String, mime_type: file.type };
        if (messageInputRef.current) messageInputRef.current.focus();
      };
      reader.readAsDataURL(file);
    };
    fileInputRef.current.addEventListener("change", handleFileChange);
    return () => {
      if (fileInputRef.current)
        fileInputRef.current.removeEventListener("change", handleFileChange);
    };
  }, []);

  // Cancel File
  useEffect(() => {
    if (!fileCancelButtonRef.current) return;
    const handleCancel = (e) => {
      e.preventDefault();
      resetFileInput();
    };
    fileCancelButtonRef.current.addEventListener("click", handleCancel);
    return () => {
      if (fileCancelButtonRef.current)
        fileCancelButtonRef.current.removeEventListener("click", handleCancel);
    };
  }, []);

  // Các useEffect khác (Send, Toggle, Close) giữ nguyên
  useEffect(() => {
    if (!sendMessageButtonRef.current) return;
    const handleSend = (e) => handleOutgoingMessage(e);
    sendMessageButtonRef.current.addEventListener("click", handleSend);
    return () => {
      if (sendMessageButtonRef.current)
        sendMessageButtonRef.current.removeEventListener("click", handleSend);
    };
  }, [isSending]);

  useEffect(() => {
    if (!chatbotTogglerRef.current) return;
    const handleToggle = () => setShowChatbot(!showChatbot);
    chatbotTogglerRef.current.addEventListener("click", handleToggle);
    return () => {
      if (chatbotTogglerRef.current)
        chatbotTogglerRef.current.removeEventListener("click", handleToggle);
    };
  }, [showChatbot]);

  useEffect(() => {
    if (!closeChatbotRef.current) return;
    const handleClose = () => setShowChatbot(false);
    closeChatbotRef.current.addEventListener("click", handleClose);
    return () => {
      if (closeChatbotRef.current)
        closeChatbotRef.current.removeEventListener("click", handleClose);
    };
  }, []);

  // Emoji Picker - Fix z-index
  useEffect(() => {
    if (typeof window === "undefined") return;
    const initEmojiPicker = () => {
      if (!window.EmojiMart || !chatFormRef.current) return;
      try {
        const existingPicker = chatFormRef.current.querySelector("em-emoji-picker");
        if (existingPicker) existingPicker.remove();

        const emojiPicker = new window.EmojiMart.Picker({
          theme: "dark",
          showSkinTones: "none",
          previewPosition: "none",
          navPosition: "bottom",
          perLine: 8,
          onEmojiSelect: (emoji) => {
            if (messageInputRef.current) {
              const { selectionStart: start, selectionEnd: end } = messageInputRef.current;
              messageInputRef.current.setRangeText(emoji.native, start, end, "end");
              messageInputRef.current.focus();
            }
          },
          onClickOutside: (e) => {
            if (e.target && e.target.id === "emoji-picker") return;
            setShowEmojiPicker(false);
          },
        });

        // Append to popup container
        const popup = document.querySelector(".chatbot-popup");
        if (popup && emojiPicker) {
          popup.appendChild(emojiPicker);
          setPicker(emojiPicker);
        }
      } catch (error) {
        console.error("Error initializing emoji picker:", error);
      }
    };

    if (window.EmojiMart && chatFormRef.current) {
      initEmojiPicker();
    } else {
      const checkInterval = setInterval(() => {
        if (window.EmojiMart && chatFormRef.current) {
          clearInterval(checkInterval);
          initEmojiPicker();
        }
      }, 100);
      setTimeout(() => clearInterval(checkInterval), 10000);
    }
    return () => {};
  }, [showChatbot]);

  useEffect(() => {
    return () => {
      if (picker)
        try {
          picker.remove();
        } catch (e) {}
    };
  }, [picker]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.classList.toggle("show-chatbot", showChatbot);
      document.body.classList.toggle("show-emoji-picker", showEmojiPicker);
    }
  }, [showChatbot, showEmojiPicker]);

  const handleEmojiClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowEmojiPicker((prev) => !prev);
  };
  const handleFileUploadClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (fileInputRef.current) fileInputRef.current.click();
  };

  return (
    <>
      <button id="chatbot-toggler" ref={chatbotTogglerRef} className={showChatbot ? "active" : ""}>
        <span className="material-symbols-rounded icon-open">
          <svg className="chatbot-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
            <path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z" />
          </svg>
        </span>
        <span className="material-symbols-rounded icon-close">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </span>
      </button>

      <div className="chatbot-popup">
        {/* Header */}
        <div className="chat-header">
          <div className="header-info">
            <div className="bot-logo-wrapper">
              <svg className="bot-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
                <path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z" />
              </svg>
            </div>
            <div className="header-text">
              <h2 className="logo-text">CinePhine AI</h2>
              <span className="logo-status">Luôn sẵn sàng hỗ trợ bạn</span>
            </div>
          </div>
          <button id="close-chatbot" ref={closeChatbotRef}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        </div>

        {/* Chat Body */}
        <div className="chat-body" ref={chatBodyRef}>
          <div className="message bot-message">
            <div className="bot-avatar-container">
              {/* SVG Avatar cũ */}
              <svg
                className="bot-avatar"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 1024 1024"
              >
                <path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z" />
              </svg>
            </div>
            <div className="message-text">
              Xin chào! 👋 <br />
              Tôi là trợ lý AI của CinePhine. Tôi có thể giúp bạn tìm phim, gợi ý nội dung hay giải
              đáp thắc mắc.
              <br />
              Bạn đang muốn xem gì hôm nay?
            </div>
          </div>
        </div>

        {/* Chat Footer */}
        <div className="chat-footer">
          {/* File Upload Preview Area - Đặt ở đây để đẩy input xuống */}
          <div className="file-upload-preview" ref={fileUploadWrapperRef}>
            <div className="preview-container">
              <img src="" alt="preview" />
              <button type="button" className="cancel-file-btn" ref={fileCancelButtonRef}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>

          <form action="#" className="chat-form" ref={chatFormRef} onSubmit={handleOutgoingMessage}>
            <div className="chat-controls">
              <button
                type="button"
                id="emoji-picker"
                ref={emojiPickerRef}
                onClick={handleEmojiClick}
                title="Emoji"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                  <line x1="9" y1="9" x2="9.01" y2="9"></line>
                  <line x1="15" y1="9" x2="15.01" y2="9"></line>
                </svg>
              </button>
              <button
                type="button"
                id="file-upload"
                onClick={handleFileUploadClick}
                title="Gửi ảnh"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
              </button>
              <input
                type="file"
                id="file-input"
                hidden
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/gif,image/webp"
              />
            </div>

            <textarea
              placeholder="Nhập tin nhắn..."
              className="message-input"
              ref={messageInputRef}
              rows={1}
              disabled={isSending}
            ></textarea>

            <button type="submit" id="send-message" ref={sendMessageButtonRef} disabled={isSending}>
              {isSending ? (
                <div className="spinner"></div>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default Chatbot;
