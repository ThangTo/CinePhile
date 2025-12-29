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
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

  const userDataRef = useRef({
    message: null,
    file: {
      data: null,
      mime_type: null,
    },
  });

  const chatHistoryRef = useRef([]);
  const initialInputHeightRef = useRef(null);
  const sessionIdRef = useRef(null);

  // Initialize sessionId for guest users
  useEffect(() => {
    // Tạo hoặc lấy sessionId từ localStorage
    let sessionId = localStorage.getItem("chatbot_sessionId");
    if (!sessionId) {
      // Tạo sessionId mới dựa trên timestamp và random
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("chatbot_sessionId", sessionId);
    }
    sessionIdRef.current = sessionId;
  }, []);

  // Initialize chat history with knowledge base (like in original code)
  useEffect(() => {
    const systemInstruction = getSystemInstruction();
    if (systemInstruction && chatHistoryRef.current.length === 0) {
      // Add knowledge as a model message at the start (like original chatbot)
      chatHistoryRef.current.push({
        role: "model",
        parts: [{ text: systemInstruction }],
      });
    }
  }, []);

  // Create message element with dynamic classes and return it
  const createMessageElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
  };

  const buildChatMetadata = () => {
    const pathname = window.location.pathname;
    const metadata = {
      page: pathname,
    };

    // Extract movieId from URL patterns: /movie/:id or /watch/:id
    const movieMatch = pathname.match(/\/(movie|watch)\/([a-f0-9]{24})/i);
    if (movieMatch && movieMatch[2]) {
      metadata.movieId = movieMatch[2];
    }

    return metadata;
  };

  // Generate bot response using API
  const generateBotResponse = async (incomingMessageDiv) => {
    const messageElement = incomingMessageDiv.querySelector(".message-text");
    // incoming message: message from user to bot (user message)
    chatHistoryRef.current.push({
      role: "user",
      parts: [
        { text: userDataRef.current.message },
        // ...(userDataRef.current.file.data ? [{ inline_data: userDataRef.current.file }] : []),
      ],
    });

    try {
      // Convert history from Gemini format to backend format {role, content}
      const historyForBackend = chatHistoryRef.current
        .filter((msg) => msg.role === "user" || msg.role === "model") // Chỉ lấy user và model messages
        .map((msg) => ({
          role: msg.role === "model" ? "assistant" : "user",
          content: msg.parts?.[0]?.text || msg.content || "",
        }))
        .filter((msg) => msg.content.trim().length > 0); // Loại bỏ messages rỗng

      // Build payload for API request
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
          credentials: "include", // để gửi cookie auth
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      const answerHTML = (data.answer || "").trim(); // Lấy phần HTML từ answer

      // Render HTML instead of plain text
      messageElement.innerHTML = answerHTML;

      // Add click handlers for movie links
      const movieLinks = messageElement.querySelectorAll(".chatbot-movie-link");
      movieLinks.forEach((link) => {
        link.addEventListener("click", (e) => {
          e.preventDefault();
          const href = link.getAttribute("href");
          if (href) {
            // Use React Router navigate to keep chatbot state
            navigate(href);
          }
        });
        // Add hover effect
        link.addEventListener("mouseenter", () => {
          link.style.color = "#2563eb";
        });
        link.addEventListener("mouseleave", () => {
          link.style.color = "#3b82f6";
        });
      });

      // Store plain text version for history (remove HTML tags)
      const plainText = messageElement.textContent || messageElement.innerText || "";
      chatHistoryRef.current.push({
        role: "model",
        parts: [{ text: plainText }],
      });
    } catch (error) {
      messageElement.innerText = error.message;
      messageElement.style.color = "#ff0000";
    } finally {
      userDataRef.current.file = {};
      incomingMessageDiv.classList.remove("thinking"); // remove thinking indicator
      if (chatBodyRef.current) {
        chatBodyRef.current.scrollTo({ behavior: "smooth", top: chatBodyRef.current.scrollHeight }); // scroll to bottom of chat body
      }
      // Reset sending state to allow new messages
      setIsSending(false);
    }
  };

  // Handle outgoing user message
  const handleOutgoingMessage = (e) => {
    e.preventDefault();

    // Prevent spam: disable if already sending
    if (isSending) {
      return;
    }

    // Get and validate message
    const message = messageInputRef.current.value.trim();
    
    // Prevent sending empty message
    if (!message || message.length === 0) {
      return;
    }

    // Set sending state to prevent multiple submissions
    setIsSending(true);

    userDataRef.current.message = message;
    messageInputRef.current.value = "";
    if (fileUploadWrapperRef.current) {
      fileUploadWrapperRef.current.classList.remove("file-uploaded");
    }
    if (messageInputRef.current) {
      messageInputRef.current.dispatchEvent(new Event("input"));
    }

    // Create and display user message
    const messageContent = `<div class="message-text"></div>
                            ${
                              userDataRef.current.file.data
                                ? `<img src="data:${userDataRef.current.file.mime_type};base64,${userDataRef.current.file.data}" class="attachment" />`
                                : ""
                            }`;

    const outgoingMessageDiv = createMessageElement(messageContent, "user-message");
    outgoingMessageDiv.querySelector(".message-text").innerText = userDataRef.current.message;
    if (chatBodyRef.current) {
      chatBodyRef.current.appendChild(outgoingMessageDiv);
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }

    // Simulate bot response with thinking indicator after a delay
    setTimeout(() => {
      const messageContent = `<svg class="bot-avatar" xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 1024 1024">
                    <path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z"></path>
                </svg>
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
      if (img) img.src = "#";
    }
    userDataRef.current.file = { data: null, mime_type: null };
    if (chatFormRef.current) chatFormRef.current.reset();
  };

  useEffect(() => {
    if (!messageInputRef.current) return;

    initialInputHeightRef.current = messageInputRef.current.scrollHeight;

    // Handle Enter key press for sending messages
    const handleKeyDown = (e) => {
      const userMessage = e.target.value.trim();
      // Prevent sending if already sending or message is empty
      if (e.key === "Enter" && userMessage && !e.shiftKey && window.innerWidth > 768 && !isSending) {
        handleOutgoingMessage(e);
      }
    };

    const handleInput = (e) => {
      if (messageInputRef.current) {
        const textarea = messageInputRef.current;
        const initialHeight = initialInputHeightRef.current;

        // Reset height to calculate scrollHeight
        textarea.style.height = `${initialHeight}px`;
        const newHeight = textarea.scrollHeight;
        textarea.style.height = `${newHeight}px`;

        // Toggle scrollbar class based on whether content exceeds 1 line
        const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight) || 20;
        const hasMultipleLines = newHeight > initialHeight + lineHeight / 2;

        if (hasMultipleLines) {
          textarea.classList.add("has-scroll");
        } else {
          textarea.classList.remove("has-scroll");
        }

        if (chatFormRef.current) {
          chatFormRef.current.style.borderRadius = newHeight > initialHeight ? "15px" : "32px";
        }
      }
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

  useEffect(() => {
    if (!fileInputRef.current) return;

    const handleFileChange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const validImageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!validImageTypes.includes(file.type)) {
        if (window.Swal && typeof window.Swal.fire === "function") {
          await window.Swal.fire({
            icon: "error",
            title: "Lỗi",
            text: "Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WEBP)",
            confirmButtonText: "OK",
          });
        } else {
          alert("Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WEBP)");
        }
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
        userDataRef.current.file = {
          data: base64String,
          mime_type: file.type,
        };
      };
      reader.readAsDataURL(file);
    };

    fileInputRef.current.addEventListener("change", handleFileChange);

    return () => {
      if (fileInputRef.current) {
        fileInputRef.current.removeEventListener("change", handleFileChange);
      }
    };
  }, []);

  useEffect(() => {
    if (!fileCancelButtonRef.current) return;

    const handleCancel = () => {
      resetFileInput();
    };

    fileCancelButtonRef.current.addEventListener("click", handleCancel);

    return () => {
      if (fileCancelButtonRef.current) {
        fileCancelButtonRef.current.removeEventListener("click", handleCancel);
      }
    };
  }, []);

  useEffect(() => {
    if (!sendMessageButtonRef.current) return;

    const handleSend = (e) => {
      handleOutgoingMessage(e);
    };

    sendMessageButtonRef.current.addEventListener("click", handleSend);

    // Update button disabled state
    if (sendMessageButtonRef.current) {
      sendMessageButtonRef.current.disabled = isSending;
      if (isSending) {
        sendMessageButtonRef.current.style.opacity = "0.5";
        sendMessageButtonRef.current.style.cursor = "not-allowed";
      } else {
        sendMessageButtonRef.current.style.opacity = "1";
        sendMessageButtonRef.current.style.cursor = "pointer";
      }
    }

    return () => {
      if (sendMessageButtonRef.current) {
        sendMessageButtonRef.current.removeEventListener("click", handleSend);
      }
    };
  }, [isSending]);

  useEffect(() => {
    if (!chatbotTogglerRef.current) return;

    const handleToggle = () => {
      setShowChatbot(!showChatbot);
    };

    chatbotTogglerRef.current.addEventListener("click", handleToggle);

    return () => {
      if (chatbotTogglerRef.current) {
        chatbotTogglerRef.current.removeEventListener("click", handleToggle);
      }
    };
  }, [showChatbot]);

  useEffect(() => {
    if (!closeChatbotRef.current) return;

    const handleClose = () => {
      setShowChatbot(false);
    };

    closeChatbotRef.current.addEventListener("click", handleClose);

    return () => {
      if (closeChatbotRef.current) {
        closeChatbotRef.current.removeEventListener("click", handleClose);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Wait for EmojiMart to load
    const initEmojiPicker = () => {
      if (!window.EmojiMart || !chatFormRef.current) {
        return;
      }

      try {
        // Remove existing picker if any
        const existingPicker = chatFormRef.current.querySelector("em-emoji-picker");
        if (existingPicker) {
          existingPicker.remove();
        }

        const emojiPicker = new window.EmojiMart.Picker({
          theme: "light",
          showSkinTones: "none",
          previewPosition: "none",
          onEmojiSelect: (emoji) => {
            if (messageInputRef.current) {
              const { selectionStart: start, selectionEnd: end } = messageInputRef.current;
              messageInputRef.current.setRangeText(emoji.native, start, end, "end");
              messageInputRef.current.focus();
            }
          },
          onClickOutside: (e) => {
            // Don't close if clicking on the emoji button itself
            if (e.target && e.target.id === "emoji-picker") {
              return;
            }
            // Close emoji picker when clicking outside
            setShowEmojiPicker(false);
          },
        });

        // Append to form container, not button (like in original code)
        if (chatFormRef.current && emojiPicker) {
          chatFormRef.current.appendChild(emojiPicker);
          setPicker(emojiPicker);
        }
      } catch (error) {
        console.error("Error initializing emoji picker:", error);
      }
    };

    // Try to initialize immediately
    if (window.EmojiMart && chatFormRef.current) {
      initEmojiPicker();
    } else {
      // Wait for EmojiMart to load
      const checkInterval = setInterval(() => {
        if (window.EmojiMart && chatFormRef.current) {
          clearInterval(checkInterval);
          initEmojiPicker();
        }
      }, 100);

      // Cleanup after 10 seconds if still not loaded
      setTimeout(() => {
        clearInterval(checkInterval);
      }, 10000);
    }

    return () => {
      // Cleanup will be handled by the picker state
    };
  }, [showChatbot]);

  // Cleanup picker on unmount
  useEffect(() => {
    return () => {
      if (picker) {
        try {
          picker.remove();
        } catch (error) {
          console.error("Error removing emoji picker:", error);
        }
      }
    };
  }, [picker]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      if (showChatbot) {
        document.body.classList.add("show-chatbot");
      } else {
        document.body.classList.remove("show-chatbot");
      }
    }
  }, [showChatbot]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      if (showEmojiPicker) {
        document.body.classList.add("show-emoji-picker");
      } else {
        document.body.classList.remove("show-emoji-picker");
      }
    }
  }, [showEmojiPicker]);

  // Handle emoji picker button click
  const handleEmojiClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowEmojiPicker((prev) => !prev);
  };

  // Handle file upload button click
  const handleFileUploadClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <>
      {/* Chatbot Toggler */}
      <button id="chatbot-toggler" ref={chatbotTogglerRef}>
        <span className="material-symbols-rounded">
          <svg
            className="chatbot-logo"
            xmlns="http://www.w3.org/2000/svg"
            width="50"
            height="50"
            viewBox="0 0 1024 1024"
          >
            <path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z" />
          </svg>
        </span>
        <span className="material-symbols-rounded">close</span>
      </button>
      <div className="chatbot-popup">
        {/* Chatbot Header */}
        <div className="chat-header">
          <div className="header-info">
            <svg
              className="chatbot-logo"
              xmlns="http://www.w3.org/2000/svg"
              width="50"
              height="50"
              viewBox="0 0 1024 1024"
            >
              <path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z" />
            </svg>
            <h2 className="logo-text">Chatbot</h2>
          </div>
          <button id="close-chatbot" className="material-symbols-rounded" ref={closeChatbotRef}>
            keyboard_arrow_down
          </button>
        </div>
        {/* Chatbot Body */}
        <div className="chat-body" ref={chatBodyRef}>
          <div className="message bot-message">
            <svg
              className="bot-avatar"
              xmlns="http://www.w3.org/2000/svg"
              width="50"
              height="50"
              viewBox="0 0 1024 1024"
            >
              <path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z" />
            </svg>
            <div className="message-text">
              {" "}
              Xin chào 👋
              <br /> Tôi là trợ lý AI của CinePhine! Tôi có thể giúp bạn:
              <br /> • Tìm hiểu về các tính năng của website
              <br /> • Hướng dẫn cách sử dụng
              <br /> • Tìm phim theo sở thích
              <br /> • Trả lời các câu hỏi về CinePhine
              <br />
              <br /> Bạn cần hỗ trợ gì hôm nay?{" "}
            </div>
          </div>
        </div>
        {/* Chatbot Footer */}
        <div className="chat-footer">
          <form action="#" className="chat-form" ref={chatFormRef} onSubmit={handleOutgoingMessage}>
            <textarea
              placeholder="Message..."
              className="message-input"
              ref={messageInputRef}
              required
              disabled={isSending}
            ></textarea>
            <div className="chat-controls">
              <button
                type="button"
                id="emoji-picker"
                className="material-symbols-outlined"
                ref={emojiPickerRef}
                onClick={handleEmojiClick}
              >
                sentiment_satisfied
              </button>
              <div className="file-upload-wrapper" ref={fileUploadWrapperRef}>
                <input
                  type="file"
                  id="file-input"
                  hidden
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/gif,image/webp"
                />
                <img src="#" alt="upload preview" />
                <button
                  type="button"
                  id="file-upload"
                  className="material-symbols-rounded"
                  onClick={handleFileUploadClick}
                >
                  attach_file
                </button>
                <button
                  type="button"
                  id="file-cancel"
                  className="material-symbols-rounded"
                  ref={fileCancelButtonRef}
                >
                  close
                </button>
              </div>
              <button
                type="submit"
                id="send-message"
                className="material-symbols-rounded"
                ref={sendMessageButtonRef}
              >
                arrow_upward
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default Chatbot;
