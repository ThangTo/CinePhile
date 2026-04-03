import apiRequest from "services/utils/apiRequest";

const mailboxService = {
  getMyMailbox: async () =>
    apiRequest("/mailbox", {
      requiresAuth: true,
    }),

  getUnreadCount: async () =>
    apiRequest("/mailbox/unread-count", {
      requiresAuth: true,
    }),

  markRepliesAsRead: async (category) =>
    apiRequest("/mailbox/messages/read", {
      method: "PUT",
      data: category ? { category } : undefined,
      requiresAuth: true,
    }),

  sendMessage: async ({ content, category, subject }) =>
    apiRequest("/mailbox/messages", {
      method: "POST",
      data: { content, category, subject },
      requiresAuth: true,
    }),
};

export default mailboxService;
