// ============================================================================
// Auth Handlers
// ============================================================================

import { http, HttpResponse, API_BASE } from "mocks/config";
import { delay, generateMockToken, createMockUser, requireAuth } from "mocks/utils";
import { mockStorage } from "mocks/storage";

export const authHandlers = [
  // POST /auth/register
  http.post(`${API_BASE}/auth/register`, async ({ request }) => {
    await delay(300);
    const userData = await request.json();
    const { username, email, password } = userData || {};

    if (!username || !email || !password) {
      return HttpResponse.json({ message: "Vui lòng điền đầy đủ thông tin" }, { status: 400 });
    }

    const token = generateMockToken("mock-jwt");
    const refreshToken = generateMockToken("mock-refresh");
    const user = createMockUser({ username, email });

    // Update mock storage
    mockStorage.user = user;
    mockStorage.token = token;
    mockStorage.refreshToken = refreshToken;

    return HttpResponse.json({ user, token, refreshToken }, { status: 201 });
  }),

  // POST /auth/login
  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    await delay(300);
    const credentials = await request.json();
    const { email, password } = credentials || {};

    if (!email || !password) {
      return HttpResponse.json({ message: "Email hoặc mật khẩu không đúng" }, { status: 400 });
    }

    const token = generateMockToken("mock-jwt");
    const refreshToken = generateMockToken("mock-refresh");

    // Check if admin credentials
    const isAdmin = email === "admin@cinephile.com" && password === "admin123";

    let user;
    if (isAdmin) {
      // Return admin user
      user = {
        id: 1,
        username: "Admin",
        name: "Admin",
        email: "admin@cinephile.com",
        avatar: "https://i.pravatar.cc/150?img=68",
        premium: true,
        coins: 9999,
        watchlist: 0,
        hasPassword: true,
        loginMethod: "email",
        gender: "other",
        role: "admin", // ✅ Set role as admin
        createdAt: new Date().toISOString(),
      };
    } else {
      // Return normal user
      user = createMockUser({ email, username: email.split("@")[0] });
    }

    // Update mock storage
    mockStorage.user = user;
    mockStorage.token = token;
    mockStorage.refreshToken = refreshToken;

    return HttpResponse.json({ user, token, refreshToken });
  }),

  // POST /auth/logout
  http.post(`${API_BASE}/auth/logout`, async ({ request }) => {
    await delay(150);
    const authError = requireAuth(request);
    if (authError) return authError;

    return HttpResponse.json({ message: "Đăng xuất thành công" });
  }),

  // POST /auth/refresh-token
  http.post(`${API_BASE}/auth/refresh-token`, async ({ request }) => {
    await delay(200);
    const { refreshToken } = await request.json();
    const newToken = generateMockToken("mock-jwt");
    return HttpResponse.json({ token: newToken });
  }),

  // GET /auth/me - Get current user
  http.get(`${API_BASE}/auth/me`, async ({ request }) => {
    await delay(150);
    const authError = requireAuth(request);
    if (authError) return authError;

    // Note: We cannot access localStorage in Service Worker
    // So we rely on in-memory mockStorage.
    // If you reload the page, you will need to login again in mock mode.

    // Fallback to mockStorage (which should have the user from login)
    // or create new user (should not happen if login was successful)
    const user = mockStorage.user || createMockUser();
    return HttpResponse.json(user);
  }),

  // PUT /auth/profile - Update profile
  http.put(`${API_BASE}/auth/profile`, async ({ request }) => {
    await delay(300);
    const authError = requireAuth(request);
    if (authError) return authError;

    const updates = await request.json();
    const currentUser = mockStorage.user || createMockUser();
    const updatedUser = { ...currentUser, ...updates };
    mockStorage.user = updatedUser; // Update mock storage
    return HttpResponse.json(updatedUser);
  }),

  // PUT /auth/change-password
  http.put(`${API_BASE}/auth/change-password`, async ({ request }) => {
    await delay(300);
    const authError = requireAuth(request);
    if (authError) return authError;

    const passwords = await request.json();
    if (!passwords.oldPassword || !passwords.newPassword) {
      return HttpResponse.json({ message: "Vui lòng nhập đầy đủ mật khẩu" }, { status: 400 });
    }

    return HttpResponse.json({ message: "Đổi mật khẩu thành công" });
  }),

  // POST /auth/forgot-password
  http.post(`${API_BASE}/auth/forgot-password`, async ({ request }) => {
    await delay(300);
    const { email } = await request.json();
    if (!email) {
      return HttpResponse.json({ message: "Vui lòng nhập email" }, { status: 400 });
    }
    return HttpResponse.json({ message: "Email khôi phục đã được gửi" });
  }),

  // POST /auth/reset-password
  http.post(`${API_BASE}/auth/reset-password`, async ({ request }) => {
    await delay(300);
    const resetData = await request.json();
    if (!resetData.token || !resetData.newPassword) {
      return HttpResponse.json({ message: "Token hoặc mật khẩu không hợp lệ" }, { status: 400 });
    }
    return HttpResponse.json({ message: "Đặt lại mật khẩu thành công" });
  }),
];
