import React, { useState, useEffect, useCallback, useRef } from "react";
import PaginationV2 from "components/common/PaginationV2";
import apiRequest from "services/utils/apiRequest";
import { formatTimeAgo } from "utils/dateUtils";

const CATEGORIES = [
  { value: "", label: "Tất cả" },
  { value: "bug", label: "Báo lỗi" },
  { value: "suggestion", label: "Đề nghị phim" },
  { value: "feature_request", label: "Yêu cầu tính năng" },
  { value: "chat", label: "Trò chuyện" },
  { value: "other", label: "Khác" },
];

const STATUSES = [
  { value: "", label: "Tất cả" },
  { value: "open", label: "Đang mở" },
  { value: "replied", label: "Đã phản hồi" },
  { value: "closed", label: "Đã đóng" },
];

const STATUS_STYLE = {
  open: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  replied: { color: "#34d399", bg: "rgba(52,211,153,0.1)" },
  closed: { color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
};

const CAT_STYLE = {
  bug: { color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
  suggestion: { color: "#a78bfa", bg: "rgba(167,139,250,0.08)" },
  feature_request: { color: "#38bdf8", bg: "rgba(56,189,248,0.08)" },
  chat: { color: "#34d399", bg: "rgba(52,211,153,0.08)" },
  other: { color: "#94a3b8", bg: "rgba(148,163,184,0.08)" },
};

const AdminMailboxTab = () => {
  const [mailboxes, setMailboxes] = useState([]);
  const [selectedMailbox, setSelectedMailbox] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 20,
  });
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const messagesEndRef = useRef(null);

  const loadInbox = useCallback(
    async (page = 1, status = filterStatus, category = filterCategory) => {
      setIsLoading(true);
      try {
        const params = {
          page,
          limit: 20,
        };
        if (status) params.status = status;
        if (category) params.category = category;

        const data = await apiRequest("/mailbox/admin/inbox", {
          params,
          requiresAuth: true,
        });
        setMailboxes(data.mailboxes || []);
        setPagination(data.pagination || {});
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    },
    [filterStatus, filterCategory]
  );

  useEffect(() => {
    loadInbox(1);
  }, [loadInbox]);

  const openMailbox = async (mailbox) => {
    setIsDetailLoading(true);
    setSelectedMailbox(null);
    setReplyText("");
    try {
      const data = await apiRequest(`/mailbox/admin/${mailbox._id}`, {
        requiresAuth: true,
      });
      setSelectedMailbox(data.mailbox);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedMailbox]);

  const handleReply = async () => {
    if (!replyText.trim() || isReplying || !selectedMailbox) return;
    setIsReplying(true);
    try {
      const data = await apiRequest(
        `/mailbox/admin/${selectedMailbox._id}/reply`,
        {
          method: "POST",
          data: { content: replyText.trim() },
          requiresAuth: true,
        }
      );
      setSelectedMailbox(data.mailbox);
      // Update inbox list
      setMailboxes((prev) =>
        prev.map((m) =>
          m._id === data.mailbox._id
            ? { ...m, status: data.mailbox.status }
            : m
        )
      );
      setReplyText("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsReplying(false);
    }
  };

  const handleStatusChange = async (mailboxId, newStatus) => {
    try {
      const data = await apiRequest(`/mailbox/admin/${mailboxId}/status`, {
        method: "PUT",
        data: { status: newStatus },
        requiresAuth: true,
      });
      setMailboxes((prev) =>
        prev.map((m) => (m._id === mailboxId ? data.mailbox : m))
      );
      if (selectedMailbox?._id === mailboxId) {
        setSelectedMailbox(data.mailbox);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4">
      {/* Left: Inbox list */}
      <div className="w-80 shrink-0 flex flex-col">
        {/* Filters */}
        <div className="flex gap-2 mb-3">
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPagination((p) => ({ ...p, currentPage: 1 }));
            }}
            className="flex-1 bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300 outline-none focus:border-primaryColor/50"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value);
              setPagination((p) => ({ ...p, currentPage: 1 }));
            }}
            className="flex-1 bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300 outline-none focus:border-primaryColor/50"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-2" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>
          {isLoading ? (
            <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              Đang tải...
            </div>
          ) : mailboxes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-500 text-xs text-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-2 opacity-40">
                <rect width="20" height="16" x="2" y="4" rx="2"/>
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
              </svg>
              Không có tin nhắn nào
            </div>
          ) : (
            mailboxes.map((m) => {
              const lastMsg = m.messages?.[m.messages.length - 1];
              const user = m.userId;
              const catStyle = CAT_STYLE[m.category] || CAT_STYLE.other;
              const statStyle = STATUS_STYLE[m.status] || STATUS_STYLE.open;
              const isActive = selectedMailbox?._id === m._id;
              return (
                <button
                  key={m._id}
                  onClick={() => openMailbox(m)}
                  className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${
                    isActive
                      ? "bg-white/5 border-primaryColor/30"
                      : "bg-[#1a1a1a] border-white/5 hover:bg-white/5 hover:border-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-xs font-semibold truncate">
                      {user?.username || "—"}
                    </span>
                    <span
                      className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold shrink-0"
                      style={{ color: statStyle.color, background: statStyle.bg }}
                    >
                      {statStyle.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-medium"
                      style={{ color: catStyle.color, background: catStyle.bg }}
                    >
                      {CATEGORIES.find((c) => c.value === m.category)?.label || m.category}
                    </span>
                    {m.subject && (
                      <span className="text-gray-500 text-[10px] truncate">{m.subject}</span>
                    )}
                  </div>
                  {lastMsg && (
                    <p className="text-gray-500 text-[10px] truncate">
                      {lastMsg.direction === "sent" ? "👤" : "💬"} {lastMsg.content}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-gray-600 text-[9px]">
                      {formatTimeAgo(m.updatedAt)}
                    </span>
                    {m.unreadAdminReplies > 0 && (
                      <span className="w-4 h-4 rounded-full bg-primaryColor text-black text-[9px] font-bold flex items-center justify-center">
                        {m.unreadAdminReplies}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-3">
            <PaginationV2
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPageChange={(page) => loadInbox(page)}
            />
          </div>
        )}
      </div>

      {/* Right: Message detail */}
      <div className="flex-1 flex flex-col bg-[#131318] rounded-2xl border border-white/5 overflow-hidden">
        {!selectedMailbox ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="opacity-20 mb-3">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <p className="text-sm">Chọn một hộp thư để xem chi tiết</p>
          </div>
        ) : isDetailLoading ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
            Đang tải...
          </div>
        ) : (
          <>
            {/* Detail Header */}
            <div
              className="flex items-center justify-between px-6 py-4 shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div>
                <h3 className="text-white font-semibold text-sm">
                  {selectedMailbox.userId?.username || "—"}
                </h3>
                <p className="text-gray-500 text-xs">
                  {selectedMailbox.userId?.email || "—"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Status */}
                {["open", "replied", "closed"].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(selectedMailbox._id, s)}
                    className="px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all"
                    style={{
                      color:
                        selectedMailbox.status === s
                          ? STATUS_STYLE[s].color
                          : "#64748b",
                      background:
                        selectedMailbox.status === s
                          ? STATUS_STYLE[s].bg
                          : "transparent",
                      border: `1px solid ${
                        selectedMailbox.status === s
                          ? STATUS_STYLE[s].color + "40"
                          : "rgba(255,255,255,0.08)"
                      }`,
                    }}
                  >
                    {STATUS_STYLE[s].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>
              {selectedMailbox.messages?.map((msg, idx) => {
                const isAdminReply = msg.direction === "reply";
                const senderName = isAdminReply
                  ? "CinePhine"
                  : selectedMailbox.userId?.username || "User";
                return (
                  <div
                    key={msg._id || idx}
                    className={`flex flex-col gap-1 ${isAdminReply ? "items-end" : "items-start"}`}
                  >
                    <div className={`flex items-center gap-2 px-1 ${isAdminReply ? "flex-row-reverse" : ""}`}>
                      <span className="text-gray-400 text-xs font-medium">{senderName}</span>
                      <span className="text-gray-600 text-[10px]">{formatTimeAgo(msg.createdAt)}</span>
                    </div>
                    <div
                      className="max-w-[70%] px-4 py-3 rounded-2xl text-sm text-gray-200 leading-relaxed"
                      style={{
                        background: isAdminReply ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.04)",
                        border: isAdminReply ? "1px solid rgba(99,102,241,0.2)" : "1px solid rgba(255,255,255,0.08)",
                        borderRadius: isAdminReply ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply box */}
            <div
              className="shrink-0 p-4"
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="flex gap-2.5">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleReply();
                    }
                  }}
                  placeholder="Viết phản hồi..."
                  rows={1}
                  disabled={isReplying}
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-primaryColor/50 focus:bg-white/[0.07] resize-none max-h-[120px] leading-relaxed transition-all"
                  style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}
                />
                <button
                  onClick={handleReply}
                  disabled={!replyText.trim() || isReplying}
                  className="h-[46px] px-5 rounded-2xl bg-primaryColor hover:bg-hoverPrimaryColor text-black font-bold text-sm flex items-center gap-2 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {isReplying ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                      </svg>
                      Gửi
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminMailboxTab;
