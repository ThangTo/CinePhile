import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import useAuth from "hooks/useAuth";
import mailboxService from "services/mailbox.service";
import { isPremiumActive } from "utils/premiumUtils";
import { formatTimeAgo } from "utils/dateUtils";

const CATEGORIES = [
  {
    value: "bug",
    label: "Báo lỗi",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m8 2 1.88 1.88M14.12 3.88 16 2M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
        <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" />
        <path d="M12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H2M6 17H3M17.47 9c1.93-.2 3.53-1.9 3.53-4M18 13h4M18 17h3" />
      </svg>
    ),
    color: "#ef4444",
    bgColor: "rgba(239,68,68,0.08)",
    borderColor: "rgba(239,68,68,0.2)",
  },
  {
    value: "suggestion",
    label: "Đề nghị phim",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
        <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
      </svg>
    ),
    color: "#a78bfa",
    bgColor: "rgba(167,139,250,0.08)",
    borderColor: "rgba(167,139,250,0.2)",
  },
  {
    value: "feature_request",
    label: "Yêu cầu tính năng",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2a10 10 0 1 0 10 10H12V2Z" />
        <path d="M12 2a10 10 0 0 1 10 10" />
        <path d="M12 12 2 12" />
        <path d="M20 12v10" />
        <path d="m17 20.66-1-1.73" />
        <path d="M11 10.27 7 3.34" />
        <path d="m20.66 17-1.73-1" />
        <path d="m3.34 7 1.73 1" />
        <path d="M14 12h8" />
        <path d="M17 18.66 19.5 21" />
        <path d="M3 6v8" />
      </svg>
    ),
    color: "#38bdf8",
    bgColor: "rgba(56,189,248,0.08)",
    borderColor: "rgba(56,189,248,0.2)",
  },
  {
    value: "chat",
    label: "Trò chuyện",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    color: "#34d399",
    bgColor: "rgba(52,211,153,0.08)",
    borderColor: "rgba(52,211,153,0.2)",
  },
  {
    value: "other",
    label: "Khác",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
        <circle cx="5" cy="12" r="1" />
      </svg>
    ),
    color: "#94a3b8",
    bgColor: "rgba(148,163,184,0.06)",
    borderColor: "rgba(148,163,184,0.15)",
  },
];

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]));

const STATUS_CONFIG = {
  open: { label: "Đang mở", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  replied: { label: "Đã phản hồi", color: "#34d399", bg: "rgba(52,211,153,0.1)" },
  closed: { label: "Đã đóng", color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
};

const PREMIUM_THEME = {
  glow: "#f6d365",
  glowSoft: "rgba(246,211,101,0.16)",
  glowStrong: "rgba(246,211,101,0.28)",
  border: "rgba(246,211,101,0.18)",
  borderStrong: "rgba(246,211,101,0.28)",
  surface: "rgba(30, 25, 18, 0.78)",
  surfaceSoft: "rgba(255, 244, 214, 0.06)",
  text: "#fff7e2",
};

const sortMailboxesByCategory = (mailboxes) => {
  const orderMap = CATEGORIES.reduce((acc, cat, i) => {
    acc[cat.value] = i;
    return acc;
  }, {});
  return [...mailboxes].sort((a, b) => {
    const orderA = orderMap[a.category] ?? 99;
    const orderB = orderMap[b.category] ?? 99;
    return orderA - orderB;
  });
};

const MailboxModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [mailboxes, setMailboxes] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("chat");
  const [subjectDrafts, setSubjectDrafts] = useState({});
  const [messageDrafts, setMessageDrafts] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [mobileShowSidebar, setMobileShowSidebar] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const mailboxMap = useMemo(
    () =>
      mailboxes.reduce((acc, m) => {
        acc[m.category] = m;
        return acc;
      }, {}),
    [mailboxes]
  );

  const activeMailbox = mailboxMap[selectedCategory] || null;
  const activeMessages = useMemo(() => activeMailbox?.messages || [], [activeMailbox]);
  const unreadCount = mailboxes.reduce((t, m) => t + (m.unreadAdminReplies || 0), 0);
  const activeCategoryConfig = CATEGORY_MAP[selectedCategory] || CATEGORIES[4];
  const activeSubject = activeMailbox?.subject || subjectDrafts[selectedCategory] || "";
  const activeInputText = messageDrafts[selectedCategory] || "";
  const isPremiumUser = isPremiumActive(user);
  const premiumCategoryIconColor =
    isPremiumUser && activeCategoryConfig.value === "other"
      ? PREMIUM_THEME.glow
      : activeCategoryConfig.color;

  const updateMailbox = useCallback((nextMailbox) => {
    setMailboxes((prev) => {
      const filtered = prev.filter((m) => m.category !== nextMailbox.category);
      return sortMailboxesByCategory([...filtered, nextMailbox]);
    });
  }, []);

  const markCategoryAsReadLocally = useCallback((category) => {
    setMailboxes((prev) =>
      prev.map((m) =>
        m.category === category
          ? {
              ...m,
              unreadAdminReplies: 0,
              messages: (m.messages || []).map((msg) =>
                msg.direction === "reply" ? { ...msg, isRead: true } : msg
              ),
            }
          : m
      )
    );
  }, []);

  const loadMailboxes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await mailboxService.getMyMailbox();
      const nextMailboxes = sortMailboxesByCategory(data.mailboxes || []);
      setMailboxes(nextMailboxes);
      setSubjectDrafts((prev) => {
        const next = { ...prev };
        nextMailboxes.forEach((m) => {
          if (m.subject) next[m.category] = m.subject;
        });
        return next;
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) loadMailboxes();
  }, [isOpen, loadMailboxes]);

  // Reset mobile sidebar view when closing
  useEffect(() => {
    if (!isOpen) setMobileShowSidebar(false);
  }, [isOpen]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeMessages, selectedCategory]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
  }, [activeInputText, selectedCategory]);

  useEffect(() => {
    if (!activeMailbox) return;
    const hasUnread =
      (activeMailbox.unreadAdminReplies || 0) > 0 ||
      (activeMailbox.messages || []).some((m) => m.direction === "reply" && !m.isRead);
    if (!hasUnread) return;
    markCategoryAsReadLocally(activeMailbox.category);
    mailboxService.markRepliesAsRead(activeMailbox.category).catch(() => {});
  }, [activeMailbox, markCategoryAsReadLocally]);

  const handleSubjectChange = (value) => {
    setSubjectDrafts((prev) => ({ ...prev, [selectedCategory]: value }));
  };

  const handleInputChange = (value) => {
    setMessageDrafts((prev) => ({ ...prev, [selectedCategory]: value }));
  };

  const handleSend = async () => {
    const text = activeInputText.trim();
    if (!text || isSending) return;
    setIsSending(true);
    setError(null);
    handleInputChange("");
    try {
      const data = await mailboxService.sendMessage({
        content: text,
        category: selectedCategory,
        subject: activeSubject.trim(),
      });
      updateMailbox(data.mailbox);
      setSubjectDrafts((prev) => ({
        ...prev,
        [selectedCategory]: data.mailbox.subject || activeSubject.trim(),
      }));
    } catch (err) {
      setError(err.message);
      handleInputChange(text);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
    setMobileShowSidebar(false);
  };

  /* ─── Shared styles ─── */
  const frameStyle = isPremiumUser
    ? {
        background: `linear-gradient(180deg, ${PREMIUM_THEME.surfaceSoft} 0%, rgba(16,18,28,0.92) 18%, ${PREMIUM_THEME.surface} 100%)`,
        backdropFilter: "blur(42px)",
        WebkitBackdropFilter: "blur(42px)",
        border: `1px solid ${PREMIUM_THEME.borderStrong}`,
        boxShadow: `0 25px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 0 40px ${PREMIUM_THEME.glowSoft}`,
      }
    : {
        background: "rgba(16,18,28,0.88)",
        backdropFilter: "blur(40px)",
        WebkitBackdropFilter: "blur(40px)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 25px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset",
      };

  if (!isOpen) return null;

  /* ─── Sidebar content (reused for desktop sidebar + mobile drawer) ─── */
  const renderSidebarContent = () => (
    <div className="flex flex-col h-full">
      <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-widest px-2 mb-2 hidden md:block">
        Chọn chủ đề
      </p>
      <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-widest px-2 mb-2 md:hidden">
        Hộp thư
      </p>
      <div
        className="flex-1 overflow-y-auto space-y-1"
        style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent" }}
      >
        {CATEGORIES.map((cat) => {
          const mailbox = mailboxMap[cat.value];
          const isActive = selectedCategory === cat.value;
          const catUnread = mailbox?.unreadAdminReplies || 0;
          const msgPreview = mailbox
            ? mailbox.subject || `${mailbox.messages?.length || 0} tin nhắn`
            : "Chưa có cuộc trò chuyện";

          return (
            <button
              key={cat.value}
              onClick={() => handleCategorySelect(cat.value)}
              className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200"
              style={{
                background: isActive ? cat.bgColor : "transparent",
                border: `1px solid ${isActive ? cat.borderColor : "transparent"}`,
                color: isActive ? cat.color : "#64748b",
                boxShadow:
                  isPremiumUser && isActive
                    ? `0 10px 28px rgba(0,0,0,0.16), 0 0 0 1px ${PREMIUM_THEME.border} inset`
                    : "none",
              }}
            >
              <span className="mt-0.5 shrink-0">{cat.icon}</span>
              {/* Label + preview: hidden on mobile tab bar */}
              <span className="min-w-0 flex-1 hidden md:inline-flex flex-col">
                <span className="text-xs font-medium truncate">{cat.label}</span>
                <span className="text-[10px] mt-0.5 truncate text-gray-500">{msgPreview}</span>
              </span>
              {catUnread > 0 ? (
                <span
                  className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                  style={{ background: cat.color }}
                >
                  {catUnread > 9 ? "9+" : catUnread}
                </span>
              ) : isActive ? (
                <div
                  className="ml-auto mt-1 w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: cat.color, boxShadow: `0 0 6px ${cat.color}` }}
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );

  /* ─── Chat area content ─── */
  const renderChatArea = () => (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Error */}
      {error && (
        <div className="mx-4 mt-3 px-4 py-2 rounded-xl text-xs text-red-400 bg-red-500/10 border border-red-500/20 flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400/60 hover:text-red-400"
          >
            ×
          </button>
        </div>
      )}

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(255,255,255,0.1) transparent",
          background: isPremiumUser
            ? "linear-gradient(180deg, rgba(246,211,101,0.04) 0%, rgba(255,255,255,0.015) 22%, transparent 100%)"
            : "transparent",
        }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full gap-2 text-gray-500 text-sm py-8">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Đang tải hộp thư...
          </div>
        ) : activeMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8 px-4">
            <div
              className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4"
              style={{
                background: isPremiumUser
                  ? "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(246,211,101,0.1) 100%)"
                  : activeCategoryConfig.bgColor,
                border: isPremiumUser
                  ? `1px solid ${PREMIUM_THEME.border}`
                  : `1px solid ${activeCategoryConfig.borderColor}`,
                boxShadow: isPremiumUser ? `0 12px 30px ${PREMIUM_THEME.glowSoft}` : "none",
              }}
            >
              <span style={{ color: premiumCategoryIconColor }}>{activeCategoryConfig.icon}</span>
            </div>
            <h3 className="text-white font-semibold text-base mb-1">Bắt đầu cuộc trò chuyện</h3>
            <p className="text-gray-500 text-xs leading-relaxed max-w-xs">
              Bạn có thể gửi báo lỗi, đề nghị phim,
              <br />
              yêu cầu tính năng hoặc trò chuyện tự do.
            </p>
          </div>
        ) : (
          activeMessages.map((message, index) => {
            const isUser = message.direction === "sent";
            const senderName = message.senderId?.username || (isUser ? "Bạn" : "CinePhine");
            const msgCatConfig = isUser
              ? activeCategoryConfig
              : {
                  color: "#f59e0b",
                  bgColor: "rgba(245,158,11,0.08)",
                  borderColor: "rgba(245,158,11,0.2)",
                };

            return (
              <div
                key={message._id || index}
                className={`flex gap-2.5 w-full animate-[fadeIn_0.25s_ease-out] ${isUser ? "flex-row-reverse" : ""}`}
              >
                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-2xl flex items-center justify-center text-xs font-bold shrink-0 mt-1"
                  style={{
                    background: isUser
                      ? isPremiumUser
                        ? "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(246,211,101,0.16) 100%)"
                        : "rgba(99,102,241,0.15)"
                      : isPremiumUser
                        ? "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(246,211,101,0.12) 100%)"
                        : msgCatConfig.bgColor,
                    border: isUser
                      ? isPremiumUser
                        ? `1px solid ${PREMIUM_THEME.border}`
                        : "1px solid rgba(99,102,241,0.3)"
                      : isPremiumUser
                        ? `1px solid ${PREMIUM_THEME.border}`
                        : `1px solid ${msgCatConfig.borderColor}`,
                    color: isUser
                      ? isPremiumUser
                        ? PREMIUM_THEME.glow
                        : "#818cf8"
                      : isPremiumUser
                        ? PREMIUM_THEME.glow
                        : msgCatConfig.color,
                  }}
                >
                  {isUser ? (
                    senderName.charAt(0).toUpperCase()
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  )}
                </div>

                <div
                  className={`flex flex-col gap-1 max-w-[75%] ${isUser ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`flex items-center gap-2 px-1 ${isUser ? "flex-row-reverse" : ""}`}
                  >
                    <span className="text-gray-400 text-[10px] font-medium">{senderName}</span>
                    <span className="text-gray-600 text-[10px]">
                      {formatTimeAgo(message.createdAt)}
                    </span>
                    {!message.isRead && !isUser && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    )}
                  </div>
                  <div
                    className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
                    style={{
                      background: isPremiumUser
                        ? isUser
                          ? "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(246,211,101,0.16) 45%, rgba(99,102,241,0.14) 100%)"
                          : "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(246,211,101,0.06) 100%)"
                        : isUser
                          ? "rgba(99,102,241,0.12)"
                          : "rgba(255,255,255,0.04)",
                      border: isPremiumUser
                        ? `1px solid ${isUser ? PREMIUM_THEME.borderStrong : PREMIUM_THEME.border}`
                        : isUser
                          ? "1px solid rgba(99,102,241,0.2)"
                          : "1px solid rgba(255,255,255,0.08)",
                      color: isPremiumUser ? PREMIUM_THEME.text : "#e2e8f0",
                      borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    }}
                  >
                    {message.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div
        className="shrink-0 px-4 pt-3 pb-4"
        style={{
          background: isPremiumUser
            ? "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(246,211,101,0.05) 100%)"
            : "rgba(255,255,255,0.02)",
          borderTop: isPremiumUser
            ? `1px solid ${PREMIUM_THEME.border}`
            : "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {!activeMailbox && selectedCategory !== "chat" && (
          <input
            type="text"
            placeholder="Tiêu đề ngắn (tuỳ chọn)..."
            value={activeSubject}
            onChange={(e) => handleSubjectChange(e.target.value)}
            maxLength={200}
            className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-all duration-200 mb-2.5"
            style={{
              background: isPremiumUser
                ? "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(246,211,101,0.07) 100%)"
                : "rgba(255,255,255,0.05)",
              border: `1px solid ${isPremiumUser ? PREMIUM_THEME.border : "rgba(255,255,255,0.1)"}`,
              boxShadow: isPremiumUser ? "0 10px 24px rgba(0,0,0,0.12)" : "none",
            }}
          />
        )}
        <div
          className="flex items-end gap-2.5 rounded-2xl px-3 py-2.5"
          style={{
            background: isPremiumUser
              ? "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(246,211,101,0.08) 58%, rgba(17,24,39,0.34) 100%)"
              : "rgba(255,255,255,0.05)",
            border: `1px solid ${isPremiumUser ? PREMIUM_THEME.border : "rgba(255,255,255,0.1)"}`,
            boxShadow: isPremiumUser
              ? "0 0 0 1px rgba(255,255,255,0.03) inset, 0 16px 30px rgba(0,0,0,0.16)"
              : "none",
          }}
        >
          <textarea
            ref={textareaRef}
            value={activeInputText}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Nhắn tin cho mục ${activeCategoryConfig.label.toLowerCase()}...`}
            rows={1}
            disabled={isSending}
            className="flex-1 bg-transparent border-none outline-none text-sm resize-none max-h-[140px] leading-relaxed placeholder-gray-500"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(255,255,255,0.1) transparent",
              color: isPremiumUser ? PREMIUM_THEME.text : "#e2e8f0",
            }}
          />
          <button
            onClick={handleSend}
            disabled={!activeInputText.trim() || isSending}
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: activeInputText.trim()
                ? isPremiumUser
                  ? "linear-gradient(135deg, #f6d365 0%, #f59e0b 100%)"
                  : `linear-gradient(135deg, ${activeCategoryConfig.color}, ${activeCategoryConfig.color}cc)`
                : isPremiumUser
                  ? "rgba(246,211,101,0.12)"
                  : "rgba(255,255,255,0.08)",
              boxShadow: activeInputText.trim()
                ? isPremiumUser
                  ? `0 8px 24px ${PREMIUM_THEME.glowSoft}`
                  : `0 4px 20px ${activeCategoryConfig.color}40`
                : "none",
              border: isPremiumUser ? `1px solid ${PREMIUM_THEME.border}` : "none",
            }}
          >
            {isSending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-gray-600 text-[10px] text-center mt-2">
          Nhấn <kbd className="bg-white/5 px-1.5 py-0.5 rounded text-gray-500">Enter</kbd> để gửi
        </p>
      </div>
    </div>
  );

  /* ─── Modal content ─── */
  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backdropFilter: "blur(8px)" }}
    >
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* ── Desktop: full max-w + sidebar + chat ── */}
      <div
        className="relative hidden md:flex flex-col w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-3xl"
        style={frameStyle}
      >
        {isPremiumUser && (
          <>
            <div
              className="pointer-events-none absolute inset-x-10 top-0 h-24 opacity-90 blur-3xl"
              style={{
                background: `radial-gradient(circle, ${PREMIUM_THEME.glowSoft} 0%, rgba(246,211,101,0.08) 45%, transparent 75%)`,
              }}
            />
            <div
              className="pointer-events-none absolute -right-16 top-16 h-40 w-40 rounded-full blur-3xl opacity-60"
              style={{
                background: `radial-gradient(circle, rgba(251,191,36,0.18) 0%, rgba(246,211,101,0.08) 45%, transparent 75%)`,
              }}
            />
          </>
        )}

        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={
            isPremiumUser
              ? {
                  background: `linear-gradient(135deg, rgba(255,255,255,0.05) 0%, ${PREMIUM_THEME.surfaceSoft} 45%, rgba(246,211,101,0.08) 100%)`,
                  borderBottom: `1px solid ${PREMIUM_THEME.border}`,
                }
              : {
                  background: "rgba(255,255,255,0.03)",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }
          }
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{
                background: isPremiumUser
                  ? "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(246,211,101,0.14) 100%)"
                  : activeCategoryConfig.bgColor,
                border: isPremiumUser
                  ? `1px solid ${PREMIUM_THEME.border}`
                  : `1px solid ${activeCategoryConfig.borderColor}`,
                boxShadow: isPremiumUser
                  ? "0 10px 28px rgba(0,0,0,0.2), 0 0 18px rgba(246,211,101,0.12)"
                  : "none",
              }}
            >
              <span style={{ color: premiumCategoryIconColor }}>{activeCategoryConfig.icon}</span>
            </div>
            <div>
              <h2 className="text-white font-bold text-base leading-tight flex items-center gap-2">
                Hộp thư CinePhine
                {isPremiumUser && (
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.18em]"
                    style={{
                      color: PREMIUM_THEME.glow,
                      background: "rgba(246,211,101,0.1)",
                      border: `1px solid ${PREMIUM_THEME.border}`,
                      boxShadow: "0 0 16px rgba(246,211,101,0.1)",
                    }}
                  >
                    Premium
                  </span>
                )}
                {unreadCount > 0 && (
                  <span
                    className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                    style={{
                      background: isPremiumUser
                        ? "linear-gradient(135deg, #f6d365 0%, #fbbf24 100%)"
                        : activeCategoryConfig.color,
                      color: isPremiumUser ? "#201406" : "#ffffff",
                      boxShadow: isPremiumUser ? `0 8px 20px ${PREMIUM_THEME.glowSoft}` : "none",
                    }}
                  >
                    {unreadCount} mới
                  </span>
                )}
              </h2>
              <p className="text-gray-500 text-xs mt-0.5">
                {activeMailbox
                  ? `Chủ đề: ${activeMailbox.subject || activeCategoryConfig.label}`
                  : `Chủ đề: ${activeCategoryConfig.label}`}
              </p>
            </div>
          </div>
          {activeMailbox?.status && (
            <div
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                color: STATUS_CONFIG[activeMailbox.status]?.color || "#94a3b8",
                background: STATUS_CONFIG[activeMailbox.status]?.bg || "transparent",
                border: `1px solid ${STATUS_CONFIG[activeMailbox.status]?.color || "#94a3b8"}40`,
              }}
            >
              {STATUS_CONFIG[activeMailbox.status]?.label}
            </div>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200"
          >
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
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body: sidebar + chat */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Sidebar */}
          <div
            className="w-52 shrink-0 overflow-y-auto py-4 px-3"
            style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}
          >
            {renderSidebarContent()}
          </div>
          {/* Chat */}
          {renderChatArea()}
        </div>
      </div>

      {/* ── Mobile: full-screen with tab bar + chat ── */}
      <div
        className="relative flex flex-col w-full h-[80vh] max-h-[100dvh] overflow-hidden rounded-3xl md:hidden"
        style={frameStyle}
      >
        {/* Premium glow */}
        {isPremiumUser && (
          <>
            <div
              className="pointer-events-none absolute inset-x-10 top-0 h-24 opacity-90 blur-3xl"
              style={{
                background: `radial-gradient(circle, ${PREMIUM_THEME.glowSoft} 0%, transparent 75%)`,
              }}
            />
          </>
        )}

        {/* Mobile Header */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={
            isPremiumUser
              ? {
                  background: `linear-gradient(135deg, rgba(255,255,255,0.05) 0%, ${PREMIUM_THEME.surfaceSoft} 45%, rgba(246,211,101,0.08) 100%)`,
                  borderBottom: `1px solid ${PREMIUM_THEME.border}`,
                }
              : {
                  background: "rgba(255,255,255,0.03)",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }
          }
        >
          <div className="flex items-center gap-2.5">
            {/* Back / hamburger button */}
            <button
              onClick={() => setMobileShowSidebar(true)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            {/* Category icon */}
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{
                background: isPremiumUser
                  ? `linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(246,211,101,0.14) 100%)`
                  : activeCategoryConfig.bgColor,
                border: isPremiumUser
                  ? `1px solid ${PREMIUM_THEME.border}`
                  : `1px solid ${activeCategoryConfig.borderColor}`,
              }}
            >
              <span
                style={{
                  color: premiumCategoryIconColor,
                  transform: "scale(0.9)",
                  display: "flex",
                }}
              >
                {activeCategoryConfig.icon}
              </span>
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm leading-tight flex items-center gap-1.5">
                {activeCategoryConfig.label}
                {unreadCount > 0 && (
                  <span
                    className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                    style={{
                      background: isPremiumUser
                        ? "linear-gradient(135deg, #f6d365 0%, #fbbf24 100%)"
                        : activeCategoryConfig.color,
                      color: isPremiumUser ? "#201406" : "#ffffff",
                    }}
                  >
                    {unreadCount}
                  </span>
                )}
              </h2>
              {activeMailbox?.status && (
                <span
                  className="text-[10px]"
                  style={{ color: STATUS_CONFIG[activeMailbox.status]?.color || "#94a3b8" }}
                >
                  {STATUS_CONFIG[activeMailbox.status]?.label}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Mobile Chat — full width */}
        {renderChatArea()}

        {/* Mobile Sidebar Drawer */}
        {mobileShowSidebar && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10 bg-black/60 md:hidden"
              onClick={() => setMobileShowSidebar(false)}
            />
            {/* Drawer */}
            <div
              className="fixed inset-y-0 left-0 z-20 w-72 max-w-[85vw] flex flex-col overflow-hidden rounded-r-3xl md:hidden"
              style={{
                background: isPremiumUser
                  ? `linear-gradient(180deg, ${PREMIUM_THEME.surfaceSoft} 0%, rgba(16,18,28,0.96) 18%, ${PREMIUM_THEME.surface} 100%)`
                  : "rgba(16,18,28,0.96)",
                backdropFilter: "blur(40px)",
                WebkitBackdropFilter: "blur(40px)",
                border: `1px solid ${isPremiumUser ? PREMIUM_THEME.borderStrong : "rgba(255,255,255,0.08)"}`,
                borderLeft: "none",
                boxShadow: "20px 0 60px rgba(0,0,0,0.5)",
              }}
            >
              {/* Drawer Header */}
              <div
                className="flex items-center justify-between px-4 py-3 shrink-0"
                style={
                  isPremiumUser
                    ? { borderBottom: `1px solid ${PREMIUM_THEME.border}` }
                    : { borderBottom: "1px solid rgba(255,255,255,0.06)" }
                }
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(246,211,101,0.12) 100%)`,
                      border: `1px solid ${isPremiumUser ? PREMIUM_THEME.border : "rgba(255,255,255,0.1)"}`,
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#fffdf7"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect width="20" height="16" x="2" y="4" rx="3" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </div>
                  <span className="text-white font-semibold text-sm">Hộp thư CinePhine</span>
                </div>
                <button
                  onClick={() => setMobileShowSidebar(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              {/* Category list */}
              <div
                className="flex-1 overflow-y-auto py-3 px-3 space-y-1"
                style={{
                  scrollbarWidth: "thin",
                  scrollbarColor: "rgba(255,255,255,0.08) transparent",
                }}
              >
                {CATEGORIES.map((cat) => {
                  const mailbox = mailboxMap[cat.value];
                  const isActive = selectedCategory === cat.value;
                  const catUnread = mailbox?.unreadAdminReplies || 0;
                  const msgPreview = mailbox
                    ? mailbox.subject || `${mailbox.messages?.length || 0} tin nhắn`
                    : "Chưa có cuộc trò chuyện";
                  return (
                    <button
                      key={cat.value}
                      onClick={() => handleCategorySelect(cat.value)}
                      className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200"
                      style={{
                        background: isActive ? cat.bgColor : "transparent",
                        border: `1px solid ${isActive ? cat.borderColor : "transparent"}`,
                        color: isActive ? cat.color : "#64748b",
                      }}
                    >
                      <span className="mt-0.5 shrink-0">{cat.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-medium truncate">{cat.label}</span>
                        <span className="block text-[10px] mt-0.5 truncate text-gray-500">
                          {msgPreview}
                        </span>
                      </span>
                      {catUnread > 0 ? (
                        <span
                          className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                          style={{ background: cat.color }}
                        >
                          {catUnread > 9 ? "9+" : catUnread}
                        </span>
                      ) : isActive ? (
                        <div
                          className="ml-auto mt-1 w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: cat.color, boxShadow: `0 0 6px ${cat.color}` }}
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default MailboxModal;
