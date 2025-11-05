# Services Documentation

Centralized API services for CinePhine frontend.

## 📁 Structure

```
services/
├── index.js                    # Central export
├── movie.service.js            # Movie-related endpoints
├── auth.service.js             # Authentication endpoints
├── user.service.js             # User-related endpoints
├── health.service.js           # Health check endpoints
├── utils/
│   └── apiRequest.js          # Shared API request helper
└── README.md                   # This file
```

## 🚀 Usage

### Import Individual Service

```javascript
import movieService from "@/services/movie.service";
import authService from "@/services/auth.service";
import userService from "@/services/user.service";

// Use
const movies = await movieService.getAll();
const user = await authService.getCurrentUser();
```

### Import from Index

```javascript
import { movieService, authService, userService } from "@/services";
// or
import services from "@/services";

const movies = await services.movies.getAll();
const user = await services.auth.getCurrentUser();
```

## 📚 Services Overview

### 1. Movie Service (`movie.service.js`)

All endpoints related to movies:

- `getAll(params)` - Get all movies with filters
- `getById(id)` - Get movie by ID
- `getTrending(limit)` - Get trending movies
- `getTopRated(limit)` - Get top rated movies
- `getNewReleases(limit)` - Get new releases
- `getByGenre(genre, params)` - Get movies by genre
- `search(query, params)` - Search movies
- `getEpisodes(id, season)` - Get movie episodes
- `getCast(id)` - Get movie cast
- `getComments(id, params)` - Get movie comments
- `postComment(id, commentData)` - Post comment (auth required)
- `rateMovie(id, rating)` - Rate movie (auth required)

### 2. Auth Service (`auth.service.js`)

All endpoints related to authentication:

- `register(userData)` - Register new user
- `login(credentials)` - Login user
- `logout()` - Logout user (auth required)
- `refreshToken(refreshToken)` - Refresh access token
- `getCurrentUser()` - Get current user (auth required)
- `updateProfile(updates)` - Update user profile (auth required)
- `changePassword(passwords)` - Change password (auth required)
- `forgotPassword(email)` - Request password reset
- `resetPassword(resetData)` - Reset password with token

### 3. User Service (`user.service.js`)

All endpoints related to user operations:

- `getProfile(userId)` - Get user profile
- `getFavorites(userId, params)` - Get user favorites
- `addToFavorites(userId, movieId)` - Add to favorites (auth required)
- `removeFromFavorites(userId, movieId)` - Remove from favorites (auth required)
- `getWatchlist(userId, params)` - Get user watchlist
- `addToWatchlist(userId, movieId)` - Add to watchlist (auth required)
- `getHistory(userId, params)` - Get watch history
- `updateWatchProgress(userId, movieId, progressData)` - Update watch progress (auth required)

## 🔧 Technical Details

### HTTP Client

All services use axios instance from `@/lib/axios`:

- Base URL configured via environment variable
- Automatic token injection for authenticated requests
- Error handling via interceptors
- Request/response transformation

### Authentication

For endpoints that require authentication, set `requiresAuth: true`:

```javascript
apiRequest("/movies/123/comments", {
  method: "POST",
  data: commentData,
  requiresAuth: true, // ← Token sẽ tự động được thêm vào header
});
```

Token is stored in `localStorage.getItem("authToken")` and automatically added to `Authorization: Bearer <token>` header.

### Response Format

All API responses follow this structure:

```javascript
{
  success: true,
  data: { ... }, // or []
  message: "Optional message",
  pagination: { ... } // for paginated responses
}
```

The `apiRequest` helper automatically extracts `res.data`, so you directly get the response body.

### Error Handling

Errors are caught and transformed by axios interceptors:

```javascript
try {
  const movie = await movieService.getById(id);
} catch (error) {
  // error.message - User-friendly error message
  // error.status - HTTP status code
  // error.raw - Original axios error
  console.error(error.message);
}
```

## 📝 Examples

### Example 1: Fetch Movies

```javascript
import movieService from "@/services/movie.service";

const fetchMovies = async () => {
  try {
    const response = await movieService.getAll({
      page: 1,
      limit: 20,
      genre: "Action",
    });
    console.log(response.data); // Array of movies
    console.log(response.pagination); // Pagination info
  } catch (error) {
    console.error("Error:", error.message);
  }
};
```

### Example 2: User Login

```javascript
import authService from "@/services/auth.service";

const handleLogin = async (email, password) => {
  try {
    const response = await authService.login({ email, password });

    // Store token and user data
    localStorage.setItem("authToken", response.data.token);
    localStorage.setItem("user", JSON.stringify(response.data.user));

    return response.data.user;
  } catch (error) {
    console.error("Login failed:", error.message);
    throw error;
  }
};
```

### Example 3: Add to Favorites

```javascript
import userService from "@/services/user.service";

const addFavorite = async (movieId) => {
  try {
    const userId = getCurrentUserId(); // Your function to get user ID
    await userService.addToFavorites(userId, movieId);
    console.log("Added to favorites!");
  } catch (error) {
    if (error.status === 401) {
      // User not authenticated, redirect to login
      navigate("/login");
    }
  }
};
```

## 🔄 Migration from Old API

If you were using the old `api.js` structure:

**Before:**

```javascript
import api from "@/services/api";
const movies = await api.movies.getAll();
```

**After:**

```javascript
import movieService from "@/services/movie.service";
const response = await movieService.getAll();
const movies = response.data;
```

Or keep using helper functions:

```javascript
import { fetchMovieById } from "@/services/movie.service";
const movie = await fetchMovieById(id);
```

## ✅ Best Practices

1. **Always use try-catch** for async operations
2. **Check authentication** before calling protected endpoints
3. **Handle loading states** in components
4. **Use helper functions** if you prefer the old API structure
5. **Check response structure** before accessing nested properties

---

**Last Updated**: Based on current project structure
