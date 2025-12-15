// ============================================================================
// Movie Handlers
// ============================================================================

import { http, HttpResponse, API_BASE } from "mocks/config";
import {
  mockTop10Movies,
  mockSectionMovies,
  getMovieDetail,
  getMovieComments,
  formatEpisodeInfo,
} from "mocks/data/mockData";
import { delay, requireAuth } from "mocks/utils";

export const movieHandlers = [
  // GET /movies - Get all movies with filters
  http.get(`${API_BASE}/movies`, async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams);

    // Get all movies
    let allMovies = [...mockTop10Movies];
    if (mockSectionMovies.trending) allMovies.push(...mockSectionMovies.trending);
    if (mockSectionMovies.newReleases) allMovies.push(...mockSectionMovies.newReleases);

    // Apply filters
    if (params.genre) {
      allMovies = allMovies.filter((m) => m.genres && m.genres.some((g) => g === params.genre));
    }
    if (params.country) {
      allMovies = allMovies.filter((m) => m.country === params.country);
    }
    if (params.year) {
      allMovies = allMovies.filter((m) => m.year === Number(params.year));
    }

    // Pagination
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const start = (page - 1) * limit;
    const end = start + limit;

    return HttpResponse.json({
      data: allMovies.slice(start, end),
      pagination: {
        page,
        limit,
        total: allMovies.length,
        totalPages: Math.ceil(allMovies.length / limit),
      },
    });
  }),

  // GET /movies/:id - Get movie by ID
  http.get(`${API_BASE}/movies/:id`, async ({ params }) => {
    await delay(200);
    const movie = getMovieDetail(params.id);
    if (!movie) {
      return HttpResponse.json(
        { message: `Movie with ID ${params.id} not found` },
        { status: 404 }
      );
    }
    return HttpResponse.json(movie);
  }),

  // GET /movies/trending/now - Get trending movies
  http.get(`${API_BASE}/movies/trending/now`, async ({ request }) => {
    await delay(250);
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit")) || 10;
    const trending = mockSectionMovies.trending || [];
    return HttpResponse.json({
      data: trending.slice(0, limit),
    });
  }),

  // GET /movies/top/rated - Get top rated movies
  http.get(`${API_BASE}/movies/top/rated`, async ({ request }) => {
    await delay(250);
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit")) || 10;
    const sorted = [...mockTop10Movies].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    return HttpResponse.json({
      data: sorted.slice(0, limit).map((movie) => ({
        ...movie,
        episode: formatEpisodeInfo(movie),
      })),
    });
  }),

  // GET /movies/new/releases - Get new releases
  http.get(`${API_BASE}/movies/new/releases`, async ({ request }) => {
    await delay(250);
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit")) || 10;
    const newReleases = mockSectionMovies.newReleases || [];
    return HttpResponse.json({
      data: newReleases.slice(0, limit),
    });
  }),

  // GET /movies/genre/:genre - Get movies by genre
  http.get(`${API_BASE}/movies/genre/:genre`, async ({ params, request }) => {
    await delay(300);
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);

    // Get all movies
    let allMovies = [...mockTop10Movies];
    if (mockSectionMovies.trending) allMovies.push(...mockSectionMovies.trending);
    if (mockSectionMovies.newReleases) allMovies.push(...mockSectionMovies.newReleases);

    // Filter by genre
    const filtered = allMovies.filter((m) => m.genres && m.genres.some((g) => g === params.genre));

    // Pagination
    const page = Number(queryParams.page) || 1;
    const limit = Number(queryParams.limit) || 20;
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

  // GET /movies/search/query - Search movies
  http.get(`${API_BASE}/movies/search/query`, async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const query = url.searchParams.get("q");
    const page = Number(url.searchParams.get("page")) || 1;
    const limit = Number(url.searchParams.get("limit")) || 20;

    if (!query) {
      return HttpResponse.json({
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      });
    }

    // Get all movies
    let allMovies = [...mockTop10Movies];
    if (mockSectionMovies.trending) allMovies.push(...mockSectionMovies.trending);
    if (mockSectionMovies.newReleases) allMovies.push(...mockSectionMovies.newReleases);

    // Search
    const searchLower = query.toLowerCase();
    const filtered = allMovies.filter((m) => {
      const titleMatch = m.title?.toLowerCase().includes(searchLower);
      const englishTitleMatch = m.englishTitle?.toLowerCase().includes(searchLower);
      const descMatch = m.description?.toLowerCase().includes(searchLower);
      return titleMatch || englishTitleMatch || descMatch;
    });

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

  // GET /movies/:id/episodes - Get movie episodes
  http.get(`${API_BASE}/movies/:id/episodes`, async ({ params, request }) => {
    await delay(200);
    const url = new URL(request.url);
    const season = url.searchParams.get("season");

    const movie = getMovieDetail(params.id);
    if (!movie) {
      return HttpResponse.json(
        { message: `Movie with ID ${params.id} not found` },
        { status: 404 }
      );
    }

    let episodes = movie.episodes || [];
    if (season) {
      episodes = episodes.filter((ep) => ep.season === Number(season));
    }

    return HttpResponse.json({ data: episodes });
  }),

  // GET /movies/:id/cast - Get movie cast
  http.get(`${API_BASE}/movies/:id/cast`, async ({ params }) => {
    await delay(200);
    const movie = getMovieDetail(params.id);
    if (!movie) {
      return HttpResponse.json(
        { message: `Movie with ID ${params.id} not found` },
        { status: 404 }
      );
    }
    return HttpResponse.json({ data: movie.cast || [] });
  }),

  // GET /movies/:id/comments - Get movie comments
  http.get(`${API_BASE}/movies/:id/comments`, async ({ params, request }) => {
    await delay(200);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page")) || 1;
    const limit = Number(url.searchParams.get("limit")) || 10;
    const sort = url.searchParams.get("sort");

    const comments = getMovieComments(params.id) || [];
    let sortedComments = [...comments];

    // Sorting
    if (sort === "newest") {
      sortedComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sort === "oldest") {
      sortedComments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }

    const start = (page - 1) * limit;
    const end = start + limit;

    return HttpResponse.json({
      data: sortedComments.slice(start, end),
      pagination: {
        page,
        limit,
        total: comments.length,
        totalPages: Math.ceil(comments.length / limit),
      },
    });
  }),

  // POST /movies/:id/comments - Post comment
  http.post(`${API_BASE}/movies/:id/comments`, async ({ params, request }) => {
    await delay(300);
    const authError = requireAuth(request);
    if (authError) return authError;

    const commentData = await request.json();
    const newComment = {
      id: Date.now(),
      movieId: params.id,
      content: commentData.content,
      isSpoiler: commentData.isSpoiler || false,
      rating: commentData.rating || null,
      episode: commentData.episode || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      user: {
        id: 1,
        username: "MockUser",
        avatar: "https://i.pravatar.cc/150?img=68",
      },
      likes: 0,
      dislikes: 0,
    };

    return HttpResponse.json(newComment, { status: 201 });
  }),

  // POST /movies/:id/rate - Rate movie
  http.post(`${API_BASE}/movies/:id/rate`, async ({ params, request }) => {
    await delay(300);
    const authError = requireAuth(request);
    if (authError) return authError;

    const { rating } = await request.json();
    if (rating < 1 || rating > 10) {
      return HttpResponse.json({ message: "Rating must be between 1 and 10" }, { status: 400 });
    }

    return HttpResponse.json({
      message: "Rating submitted successfully",
      rating,
      movieId: params.id,
    });
  }),

  // GET /movies/:id/recommendations - Get recommended movies
  http.get(`${API_BASE}/movies/:id/recommendations`, async ({ params, request }) => {
    await delay(300);
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit")) || 10;

    // Get current movie
    const currentMovie = getMovieDetail(params.id);
    if (!currentMovie) {
      return HttpResponse.json(
        { message: `Movie with ID ${params.id} not found` },
        { status: 404 }
      );
    }

    // Get all movies
    let allMovies = [...mockTop10Movies];
    if (mockSectionMovies.trending) allMovies.push(...mockSectionMovies.trending);
    if (mockSectionMovies.newReleases) allMovies.push(...mockSectionMovies.newReleases);

    // Filter out current movie
    const currentMovieId = currentMovie.id;
    allMovies = allMovies.filter((m) => m.id !== currentMovieId);

    let recommendedMovies = [];

    // Priority 1: Movies with same genre
    if (currentMovie.genres && currentMovie.genres.length > 0) {
      const firstGenre = currentMovie.genres[0];
      const sameGenreMovies = allMovies.filter(
        (m) => m.genres && m.genres.some((g) => g === firstGenre)
      );
      recommendedMovies = [...sameGenreMovies];
    }

    // Priority 2: If not enough, add trending movies
    if (recommendedMovies.length < limit) {
      const existingIds = new Set([currentMovieId, ...recommendedMovies.map((m) => m.id)]);
      const trendingMovies = (mockSectionMovies.trending || []).filter(
        (m) => !existingIds.has(m.id)
      );
      recommendedMovies = [...recommendedMovies, ...trendingMovies];
    }

    // Priority 3: If still not enough, add top rated movies
    if (recommendedMovies.length < limit) {
      const existingIds = new Set([currentMovieId, ...recommendedMovies.map((m) => m.id)]);
      const topRatedMovies = [...mockTop10Movies]
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .filter((m) => !existingIds.has(m.id));
      recommendedMovies = [...recommendedMovies, ...topRatedMovies];
    }

    return HttpResponse.json({
      data: recommendedMovies.slice(0, limit),
    });
  }),
];
