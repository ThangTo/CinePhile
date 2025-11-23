# MSW Handlers Structure

File `handlers.js` đã được tách thành các file nhỏ hơn theo từng chức năng để dễ quản lý và bảo trì.

## Cấu trúc

```
mocks/
├── handlers/
│   ├── index.js              # Export tất cả handlers (main entry point)
│   ├── movieHandlers.js      # Movie-related endpoints
│   ├── authHandlers.js       # Authentication endpoints
│   ├── userHandlers.js       # User profile & favorites endpoints
│   ├── adminHandlers.js      # Admin panel endpoints
│   └── healthHandlers.js     # Health check endpoints
├── config.js                 # MSW configuration (API_BASE, http, HttpResponse)
├── utils.js                  # Helper functions (delay, generateMockToken, requireAuth, etc.)
├── storage.js                # Mock storage (mockStorage, adminMockStorage)
├── mockData.js              # Mock data definitions
└── browser.js               # MSW browser setup
```

## Shared Configuration

### `config.js`

Centralized configuration for all handlers:

- `API_BASE` - API base URL (from env or default)
- `http` - MSW http handler
- `HttpResponse` - MSW HttpResponse utility

All handlers import from this file to avoid duplication:

```javascript
import { http, HttpResponse, API_BASE } from "../config";
```

## Các Handler Files

### `movieHandlers.js`

- GET /movies - Get all movies with filters
- GET /movies/:id - Get movie by ID
- GET /movies/trending/now - Get trending movies
- GET /movies/top/rated - Get top rated movies
- GET /movies/new/releases - Get new releases
- GET /movies/genre/:genre - Get movies by genre
- GET /movies/search/query - Search movies
- GET /movies/:id/episodes - Get movie episodes
- GET /movies/:id/cast - Get movie cast
- GET /movies/:id/comments - Get movie comments
- POST /movies/:id/comments - Post comment
- POST /movies/:id/rate - Rate movie

### `authHandlers.js`

- POST /auth/register - Register new user
- POST /auth/login - Login (with admin check)
- POST /auth/logout - Logout
- POST /auth/refresh-token - Refresh access token
- GET /auth/me - Get current user
- PUT /auth/profile - Update profile
- PUT /auth/change-password - Change password
- POST /auth/forgot-password - Request password reset
- POST /auth/reset-password - Reset password

### `userHandlers.js`

- GET /users/:id - Get user profile
- PUT /users/:id - Update user profile
- POST /users/:id/favorites - Add to favorites
- DELETE /users/:id/favorites/:movieId - Remove from favorites
- GET /users/:id/favorites - Get favorites list
- POST /users/:id/watchlist - Add to watchlist
- DELETE /users/:id/watchlist/:movieId - Remove from watchlist
- GET /users/:id/watchlist - Get watchlist
- GET /users/:id/history - Get watch history

### `adminHandlers.js`

- **Movies Management:**
  - GET /admin/movies - Get all movies
  - GET /admin/movies/:id - Get movie by ID
  - POST /admin/movies - Create movie
  - PUT /admin/movies/:id - Update movie
  - DELETE /admin/movies/:id - Delete movie
  - GET /admin/movies/search - Search movies
- **Users Management:**
  - GET /admin/users - Get all users
  - GET /admin/users/:id - Get user by ID
  - POST /admin/users - Create user
  - PUT /admin/users/:id - Update user
  - DELETE /admin/users/:id - Delete user
  - PATCH /admin/users/:id/toggle-status - Toggle user status
- **Statistics:**
  - GET /admin/stats - Get dashboard statistics
  - GET /admin/stats/charts/:type - Get chart data

### `healthHandlers.js`

- GET /health - Health check endpoint

## Shared Utilities

### `utils.js`

- `delay(ms)` - Simulate network latency
- `generateMockToken(prefix)` - Generate mock JWT token
- `createMockUser(overrides)` - Create mock user object
- `requireAuth(request)` - Check authentication token

### `storage.js`

- `mockStorage` - In-memory storage for auth data
- `adminMockStorage` - In-memory storage for admin data
- `initializeAdminStorage()` - Initialize admin storage with default data

## Usage

Import handlers từ `handlers/index.js`:

```javascript
import { handlers } from "./handlers/index";
// or import specific handlers
import { movieHandlers, authHandlers } from "./handlers/index";
```

## Migration Notes

- File `handlers.js` cũ đã được backup thành `handlers.js.old`
- Tất cả imports đã được cập nhật để sử dụng cấu trúc mới
- Chức năng hoàn toàn tương thích với code cũ
