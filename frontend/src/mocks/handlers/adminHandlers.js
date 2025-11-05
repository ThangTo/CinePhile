// ============================================================================
// Admin Handlers
// ============================================================================

import { http, HttpResponse, API_BASE } from "mocks/config";
import { delay, requireAuth } from "mocks/utils";
import { adminMockStorage } from "mocks/storage";
import { MOCK_CHART_DATA } from "mocks/data/adminMockData";

export const adminHandlers = [
  // ===== ADMIN MOVIES =====
  // GET /admin/movies - Get all movies
  http.get(`${API_BASE}/admin/movies`, async ({ request }) => {
    await delay(300);
    const authError = requireAuth(request);
    if (authError) return authError;

    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams);
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const search = params.search || params.q || "";

    let movies = [...adminMockStorage.movies];

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      movies = movies.filter(
        (m) =>
          m.title?.toLowerCase().includes(searchLower) ||
          m.englishTitle?.toLowerCase().includes(searchLower)
      );
    }

    // Pagination
    const start = (page - 1) * limit;
    const end = start + limit;

    return HttpResponse.json({
      data: movies.slice(start, end),
      pagination: {
        page,
        limit,
        total: movies.length,
        totalPages: Math.ceil(movies.length / limit),
      },
    });
  }),

  // GET /admin/movies/:id - Get movie by ID
  http.get(`${API_BASE}/admin/movies/:id`, async ({ params, request }) => {
    await delay(200);
    const authError = requireAuth(request);
    if (authError) return authError;

    const movie = adminMockStorage.movies.find((m) => m.id === Number(params.id));
    if (!movie) {
      return HttpResponse.json({ message: "Movie not found" }, { status: 404 });
    }
    return HttpResponse.json(movie);
  }),

  // POST /admin/movies - Create movie
  http.post(`${API_BASE}/admin/movies`, async ({ request }) => {
    await delay(500);
    const authError = requireAuth(request);
    if (authError) return authError;

    const movieData = await request.json();
    const newMovie = {
      ...movieData,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    adminMockStorage.movies.push(newMovie);
    return HttpResponse.json(newMovie, { status: 201 });
  }),

  // PUT /admin/movies/:id - Update movie
  http.put(`${API_BASE}/admin/movies/:id`, async ({ params, request }) => {
    await delay(500);
    const authError = requireAuth(request);
    if (authError) return authError;

    const movieData = await request.json();
    const index = adminMockStorage.movies.findIndex((m) => m.id === Number(params.id));

    if (index === -1) {
      return HttpResponse.json({ message: "Movie not found" }, { status: 404 });
    }

    adminMockStorage.movies[index] = {
      ...adminMockStorage.movies[index],
      ...movieData,
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json(adminMockStorage.movies[index]);
  }),

  // DELETE /admin/movies/:id - Delete movie
  http.delete(`${API_BASE}/admin/movies/:id`, async ({ params, request }) => {
    await delay(300);
    const authError = requireAuth(request);
    if (authError) return authError;

    const index = adminMockStorage.movies.findIndex((m) => m.id === Number(params.id));
    if (index === -1) {
      return HttpResponse.json({ message: "Movie not found" }, { status: 404 });
    }

    adminMockStorage.movies.splice(index, 1);
    return HttpResponse.json({ success: true, message: "Movie deleted successfully" });
  }),

  // GET /admin/movies/search - Search movies
  http.get(`${API_BASE}/admin/movies/search`, async ({ request }) => {
    await delay(200);
    const authError = requireAuth(request);
    if (authError) return authError;

    const url = new URL(request.url);
    const query = url.searchParams.get("q") || "";
    const page = Number(url.searchParams.get("page")) || 1;
    const limit = Number(url.searchParams.get("limit")) || 20;

    if (!query) {
      return HttpResponse.json({
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      });
    }

    const searchLower = query.toLowerCase();
    const filtered = adminMockStorage.movies.filter(
      (m) =>
        m.title?.toLowerCase().includes(searchLower) ||
        m.englishTitle?.toLowerCase().includes(searchLower)
    );

    const start = (page - 1) * limit;
    const end = start + limit;

    return HttpResponse.json({
      data: filtered.slice(start, end),
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
      },
    });
  }),

  // ===== ADMIN USERS =====
  // GET /admin/users - Get all users
  http.get(`${API_BASE}/admin/users`, async ({ request }) => {
    await delay(300);
    const authError = requireAuth(request);
    if (authError) return authError;

    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams);
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const search = params.search || params.q || "";

    let users = [...adminMockStorage.users];

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter(
        (u) =>
          u.name?.toLowerCase().includes(searchLower) ||
          u.email?.toLowerCase().includes(searchLower)
      );
    }

    // Pagination
    const start = (page - 1) * limit;
    const end = start + limit;

    return HttpResponse.json({
      data: users.slice(start, end),
      pagination: {
        page,
        limit,
        total: users.length,
        totalPages: Math.ceil(users.length / limit),
      },
    });
  }),

  // GET /admin/users/:id - Get user by ID
  http.get(`${API_BASE}/admin/users/:id`, async ({ params, request }) => {
    await delay(200);
    const authError = requireAuth(request);
    if (authError) return authError;

    const user = adminMockStorage.users.find((u) => u.id === Number(params.id));
    if (!user) {
      return HttpResponse.json({ message: "User not found" }, { status: 404 });
    }
    return HttpResponse.json(user);
  }),

  // POST /admin/users - Create user
  http.post(`${API_BASE}/admin/users`, async ({ request }) => {
    await delay(500);
    const authError = requireAuth(request);
    if (authError) return authError;

    const userData = await request.json();

    // Check email duplicate
    if (adminMockStorage.users.some((u) => u.email === userData.email)) {
      return HttpResponse.json({ message: "Email đã tồn tại" }, { status: 400 });
    }

    const newUser = {
      ...userData,
      id: Date.now(),
      joinDate: new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    adminMockStorage.users.push(newUser);
    return HttpResponse.json(newUser, { status: 201 });
  }),

  // PUT /admin/users/:id - Update user
  http.put(`${API_BASE}/admin/users/:id`, async ({ params, request }) => {
    await delay(500);
    const authError = requireAuth(request);
    if (authError) return authError;

    const userData = await request.json();
    const index = adminMockStorage.users.findIndex((u) => u.id === Number(params.id));

    if (index === -1) {
      return HttpResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Check email duplicate (excluding current user)
    if (
      userData.email &&
      adminMockStorage.users.some((u) => u.id !== Number(params.id) && u.email === userData.email)
    ) {
      return HttpResponse.json({ message: "Email đã tồn tại" }, { status: 400 });
    }

    adminMockStorage.users[index] = {
      ...adminMockStorage.users[index],
      ...userData,
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json(adminMockStorage.users[index]);
  }),

  // DELETE /admin/users/:id - Delete user
  http.delete(`${API_BASE}/admin/users/:id`, async ({ params, request }) => {
    await delay(300);
    const authError = requireAuth(request);
    if (authError) return authError;

    const index = adminMockStorage.users.findIndex((u) => u.id === Number(params.id));
    if (index === -1) {
      return HttpResponse.json({ message: "User not found" }, { status: 404 });
    }

    adminMockStorage.users.splice(index, 1);
    return HttpResponse.json({ success: true, message: "User deleted successfully" });
  }),

  // PATCH /admin/users/:id/toggle-status - Toggle user status
  http.patch(`${API_BASE}/admin/users/:id/toggle-status`, async ({ params, request }) => {
    await delay(200);
    const authError = requireAuth(request);
    if (authError) return authError;

    const index = adminMockStorage.users.findIndex((u) => u.id === Number(params.id));
    if (index === -1) {
      return HttpResponse.json({ message: "User not found" }, { status: 404 });
    }

    adminMockStorage.users[index].status =
      adminMockStorage.users[index].status === "active" ? "inactive" : "active";
    adminMockStorage.users[index].updatedAt = new Date().toISOString();

    return HttpResponse.json(adminMockStorage.users[index]);
  }),

  // ===== ADMIN STATS =====
  // GET /admin/stats - Get dashboard statistics
  http.get(`${API_BASE}/admin/stats`, async ({ request }) => {
    await delay(300);
    const authError = requireAuth(request);
    if (authError) return authError;

    const totalMovies = adminMockStorage.movies.length;
    const totalUsers = adminMockStorage.users.length;
    const totalViews = adminMockStorage.movies.reduce((sum, m) => sum + (m.views || 0), 0);
    const activeUsers = adminMockStorage.users.filter((u) => u.status === "active").length;

    return HttpResponse.json({
      totalMovies,
      totalUsers,
      totalViews,
      activeUsers,
      trends: {
        movies: "+12%",
        users: "+8%",
        views: "+24%",
        active: "+5%",
      },
    });
  }),

  // GET /admin/stats/charts/:type - Get chart data
  http.get(`${API_BASE}/admin/stats/charts/:type`, async ({ params, request }) => {
    await delay(200);
    const authError = requireAuth(request);
    if (authError) return authError;

    switch (params.type) {
      case "views":
        return HttpResponse.json(MOCK_CHART_DATA.weeklyViews);
      case "genres":
        return HttpResponse.json(MOCK_CHART_DATA.popularGenres);
      case "growth":
        return HttpResponse.json(MOCK_CHART_DATA.userGrowth);
      default:
        return HttpResponse.json({
          labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          data: [12, 19, 3, 5, 2, 3, 15],
        });
    }
  }),
];
