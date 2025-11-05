# MSW (Mock Service Worker) Setup

MSW được sử dụng để mock API requests trong development mode, cho phép phát triển frontend mà không cần backend thật.

## 📁 Cấu Trúc

```
src/mocks/
├── handlers.js    # Tất cả MSW request handlers
├── browser.js     # MSW browser setup
└── README.md       # File này
```

## 🚀 Cách Hoạt Động

### 1. Configuration

MSW được bật/tắt qua environment variable `REACT_APP_USE_MOCK` trong file `.env`:

```env
REACT_APP_USE_MOCK=true   # Bật MSW mock
# hoặc
REACT_APP_USE_MOCK=false  # Tắt MSW, dùng API thật
```

### 2. Khởi Tạo

MSW được khởi tạo trong `src/index.js`:

```javascript
// MSW chỉ được khởi tạo khi USE_MOCK=true
const USE_MOCK = process.env.REACT_APP_USE_MOCK === "true" || false;

async function enableMocking() {
  if (!USE_MOCK) return;

  const { worker } = await import("./mocks/browser");
  await worker.start({ onUnhandledRequest: "bypass" });
}
```

### 3. Handlers

Tất cả handlers được định nghĩa trong `handlers.js`:

- **Movie Handlers**: `/movies/*` endpoints
- **Auth Handlers**: `/auth/*` endpoints
- **User Handlers**: `/users/*` endpoints
- **Health Handlers**: `/health` endpoint

### 4. Data Source

Tất cả mock data được lấy từ `src/data/mockData.js`:

- `mockTop10Movies`
- `mockSectionMovies`
- `getMovieDetail(id)`
- `getMovieComments(id)`
- `formatEpisodeInfo(movie)`

## 📋 Các Endpoints Được Mock

### Movies

- `GET /movies` - Get all movies
- `GET /movies/:id` - Get movie by ID
- `GET /movies/trending/now` - Get trending movies
- `GET /movies/top/rated` - Get top rated movies
- `GET /movies/new/releases` - Get new releases
- `GET /movies/genre/:genre` - Get movies by genre
- `GET /movies/search/query` - Search movies
- `GET /movies/:id/episodes` - Get movie episodes
- `GET /movies/:id/cast` - Get movie cast
- `GET /movies/:id/comments` - Get movie comments
- `POST /movies/:id/comments` - Post comment (auth required)
- `POST /movies/:id/rate` - Rate movie (auth required)

### Auth

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/logout` - Logout (auth required)
- `POST /auth/refresh-token` - Refresh token
- `GET /auth/me` - Get current user (auth required)
- `PUT /auth/profile` - Update profile (auth required)
- `PUT /auth/change-password` - Change password (auth required)
- `POST /auth/forgot-password` - Forgot password
- `POST /auth/reset-password` - Reset password

### Users

- `GET /users/:id` - Get user profile (auth required)
- `PUT /users/:id` - Update user profile (auth required)
- `POST /users/:id/favorites` - Add to favorites (auth required)
- `DELETE /users/:id/favorites/:movieId` - Remove from favorites (auth required)
- `GET /users/:id/favorites` - Get favorites (auth required)
- `POST /users/:id/watchlist` - Add to watchlist (auth required)
- `DELETE /users/:id/watchlist/:movieId` - Remove from watchlist (auth required)
- `GET /users/:id/watchlist` - Get watchlist (auth required)
- `GET /users/:id/history` - Get watch history (auth required)

### Health

- `GET /health` - Health check

## 🔧 Cách Sử Dụng

### Development với Mock Data

1. Đảm bảo `REACT_APP_USE_MOCK=true` trong `.env`
2. Chạy `npm start`
3. MSW sẽ tự động intercept tất cả API requests
4. Data được trả về từ `mockData.js`

### Development với Real API

1. Đặt `REACT_APP_USE_MOCK=false` trong `.env`
2. Đảm bảo backend đang chạy tại `REACT_APP_API_URL`
3. Chạy `npm start`
4. Requests sẽ được gửi đến backend thật

## ⚠️ Lưu Ý

1. **Service Worker**: MSW v2 tự động tạo service worker khi `worker.start()` được gọi. Không cần tạo file thủ công.

2. **localStorage**: MSW handlers chạy trong service worker context, không có quyền truy cập `localStorage`. Auth data được quản lý bởi `auth-storage.js` ở client side.

3. **Mock Storage**: Trong handlers, chúng ta dùng `mockStorage` object để simulate user state. Tuy nhiên, trong thực tế, auth state được lưu ở client localStorage.

4. **Response Format**: Tất cả handlers trả về response theo format chuẩn của backend để đảm bảo tính nhất quán.

## 🔄 Migration từ Old Mock Logic

Code đã được refactor để:

- ✅ Loại bỏ tất cả `apiWrapper` và `USE_MOCK` logic từ services
- ✅ Services chỉ gọi API thật (được intercept bởi MSW khi enabled)
- ✅ Tất cả mock logic tập trung trong `handlers.js`
- ✅ Data vẫn lấy từ `mockData.js` (centralized)

## 📝 Thêm Handler Mới

Để thêm handler mới:

1. Thêm handler vào section tương ứng trong `handlers.js`
2. Import data cần thiết từ `mockData.js`
3. Sử dụng `http.get()`, `http.post()`, etc. từ MSW
4. Return `HttpResponse.json()` với mock data

Example:

```javascript
// In handlers.js
http.get(`${API_BASE}/movies/new-endpoint`, async ({ request }) => {
  await delay(200);
  const data = getMockData(); // From mockData.js
  return HttpResponse.json({ data });
});
```
