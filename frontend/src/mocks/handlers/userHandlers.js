// ============================================================================
// User Handlers
// ============================================================================

import { http, HttpResponse, API_BASE } from "mocks/config";
import { delay, requireAuth, createMockUser } from "mocks/utils";
import { mockStorage } from "mocks/storage";

export const userHandlers = [
  // GET /users/:id - Get user profile
  http.get(`${API_BASE}/users/:id`, async ({ request }) => {
    await delay(200);
    const authError = requireAuth(request);
    if (authError) return authError;

    return HttpResponse.json(mockStorage.user || createMockUser());
  }),

  // PUT /users/:id - Update user profile
  http.put(`${API_BASE}/users/:id`, async ({ request }) => {
    await delay(300);
    const authError = requireAuth(request);
    if (authError) return authError;

    const updates = await request.json();
    const currentUser = mockStorage.user || createMockUser();
    const updatedUser = { ...currentUser, ...updates };
    mockStorage.user = updatedUser; // Update mock storage
    return HttpResponse.json(updatedUser);
  }),

  // POST /users/:id/favorites - Add to favorites
  http.post(`${API_BASE}/users/:id/favorites`, async ({ request }) => {
    await delay(200);
    const authError = requireAuth(request);
    if (authError) return authError;

    return HttpResponse.json({ message: "Added to favorites" });
  }),

  // DELETE /users/:id/favorites/:movieId
  http.delete(`${API_BASE}/users/:id/favorites/:movieId`, async ({ request }) => {
    await delay(200);
    const authError = requireAuth(request);
    if (authError) return authError;

    return HttpResponse.json({ message: "Removed from favorites" });
  }),

  // GET /users/:id/favorites
  http.get(`${API_BASE}/users/:id/favorites`, async ({ request }) => {
    await delay(200);
    const authError = requireAuth(request);
    if (authError) return authError;

    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page")) || 1;
    const limit = Number(url.searchParams.get("limit")) || 20;

    return HttpResponse.json({
      data: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    });
  }),

  // POST /users/:id/watchlist
  http.post(`${API_BASE}/users/:id/watchlist`, async ({ request }) => {
    await delay(200);
    const authError = requireAuth(request);
    if (authError) return authError;

    return HttpResponse.json({ message: "Added to watchlist" });
  }),

  // DELETE /users/:id/watchlist/:movieId
  http.delete(`${API_BASE}/users/:id/watchlist/:movieId`, async ({ request }) => {
    await delay(200);
    const authError = requireAuth(request);
    if (authError) return authError;

    return HttpResponse.json({ message: "Removed from watchlist" });
  }),

  // GET /users/:id/watchlist
  http.get(`${API_BASE}/users/:id/watchlist`, async ({ request }) => {
    await delay(200);
    const authError = requireAuth(request);
    if (authError) return authError;

    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page")) || 1;
    const limit = Number(url.searchParams.get("limit")) || 20;

    return HttpResponse.json({
      data: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    });
  }),

  // GET /users/:id/history
  http.get(`${API_BASE}/users/:id/history`, async ({ request }) => {
    await delay(200);
    const authError = requireAuth(request);
    if (authError) return authError;

    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page")) || 1;
    const limit = Number(url.searchParams.get("limit")) || 20;

    return HttpResponse.json({
      data: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    });
  }),
];
