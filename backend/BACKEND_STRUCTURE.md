# 📁 Cấu Trúc Backend - Khung Code Cơ Bản

## 🎯 Tổng Quan

Backend được tổ chức theo kiến trúc **MVC** với 3 layers:

- **Routes**: Định nghĩa endpoints và routing
- **Controllers**: Xử lý HTTP requests/responses
- **Services**: Logic nghiệp vụ (business logic)

---

## 📂 Cấu Trúc Thư Mục

```
backend/
├── index.js                    # Entry point, khởi tạo Express server
├── routes/                     # Route definitions
│   ├── movie.routes.js        # Movie endpoints (12 routes)
│   ├── auth.routes.js         # Auth endpoints (9 routes)
│   ├── user.routes.js         # User endpoints (9 routes)
│   └── health.routes.js       # Health check (1 route)
├── controllers/                # Request handlers
│   ├── movie.controller.js    # Movie controllers (12 functions)
│   ├── auth.controller.js     # Auth controllers (9 functions)
│   ├── user.controller.js     # User controllers (9 functions)
│   └── health.controller.js   # Health controller (1 function)
├── services/                 # Business logic
│   ├── movie.service.js       # Movie services (12 functions)
│   ├── auth.service.js        # Auth services (9 functions)
│   ├── user.service.js        # User services (9 functions)
│   └── health.service.js      # Health service (1 function)
└── data/                      # Mock data (tạm thời)
```

---

## 📋 Danh Sách Endpoints

### 🎬 **Movie Routes** (12 endpoints)

| Method | Endpoint                      | Controller       | Service          | Mô Tả                                   |
| ------ | ----------------------------- | ---------------- | ---------------- | --------------------------------------- |
| GET    | `/api/v1/movies`              | `getAll`         | `getAll`         | Lấy tất cả movies (filters, pagination) |
| GET    | `/api/v1/movies/:id`          | `getById`        | `getById`        | Lấy movie theo ID                       |
| GET    | `/api/v1/movies/trending/now` | `getTrending`    | `getTrending`    | Lấy trending movies                     |
| GET    | `/api/v1/movies/top/rated`    | `getTopRated`    | `getTopRated`    | Lấy top rated movies                    |
| GET    | `/api/v1/movies/new/releases` | `getNewReleases` | `getNewReleases` | Lấy new releases                        |
| GET    | `/api/v1/movies/genre/:genre` | `getByGenre`     | `getByGenre`     | Lấy movies theo genre                   |
| GET    | `/api/v1/movies/search/query` | `search`         | `search`         | Tìm kiếm movies                         |
| GET    | `/api/v1/movies/:id/episodes` | `getEpisodes`    | `getEpisodes`    | Lấy episodes của movie                  |
| GET    | `/api/v1/movies/:id/cast`     | `getCast`        | `getCast`        | Lấy cast của movie                      |
| GET    | `/api/v1/movies/:id/comments` | `getComments`    | `getComments`    | Lấy comments của movie                  |
| POST   | `/api/v1/movies/:id/comments` | `postComment`    | `postComment`    | Đăng comment (auth)                     |
| POST   | `/api/v1/movies/:id/rate`     | `rateMovie`      | `rateMovie`      | Đánh giá movie (auth)                   |

### 🔐 **Auth Routes** (9 endpoints)

| Method | Endpoint                       | Controller       | Service          | Mô Tả                    |
| ------ | ------------------------------ | ---------------- | ---------------- | ------------------------ |
| POST   | `/api/v1/auth/register`        | `register`       | `register`       | Đăng ký tài khoản        |
| POST   | `/api/v1/auth/login`           | `login`          | `login`          | Đăng nhập                |
| POST   | `/api/v1/auth/logout`          | `logout`         | `logout`         | Đăng xuất (auth)         |
| POST   | `/api/v1/auth/refresh-token`   | `refreshToken`   | `refreshToken`   | Refresh token            |
| GET    | `/api/v1/auth/me`              | `getCurrentUser` | `getCurrentUser` | Lấy user hiện tại (auth) |
| PUT    | `/api/v1/auth/profile`         | `updateProfile`  | `updateProfile`  | Cập nhật profile (auth)  |
| PUT    | `/api/v1/auth/change-password` | `changePassword` | `changePassword` | Đổi mật khẩu (auth)      |
| POST   | `/api/v1/auth/forgot-password` | `forgotPassword` | `forgotPassword` | Gửi email reset password |
| POST   | `/api/v1/auth/reset-password`  | `resetPassword`  | `resetPassword`  | Reset password với token |

### 👤 **User Routes** (9 endpoints)

| Method | Endpoint                               | Controller            | Service               | Mô Tả                     |
| ------ | -------------------------------------- | --------------------- | --------------------- | ------------------------- |
| GET    | `/api/v1/users/:id`                    | `getProfile`          | `getProfile`          | Lấy profile user (auth)   |
| PUT    | `/api/v1/users/:id`                    | `updateProfile`       | `updateProfile`       | Cập nhật profile (auth)   |
| POST   | `/api/v1/users/:id/favorites`          | `addToFavorites`      | `addToFavorites`      | Thêm vào favorites (auth) |
| DELETE | `/api/v1/users/:id/favorites/:movieId` | `removeFromFavorites` | `removeFromFavorites` | Xóa khỏi favorites (auth) |
| GET    | `/api/v1/users/:id/favorites`          | `getFavorites`        | `getFavorites`        | Lấy favorites list (auth) |
| POST   | `/api/v1/users/:id/watchlist`          | `addToWatchlist`      | `addToWatchlist`      | Thêm vào watchlist (auth) |
| DELETE | `/api/v1/users/:id/watchlist/:movieId` | `removeFromWatchlist` | `removeFromWatchlist` | Xóa khỏi watchlist (auth) |
| GET    | `/api/v1/users/:id/watchlist`          | `getWatchlist`        | `getWatchlist`        | Lấy watchlist (auth)      |
| GET    | `/api/v1/users/:id/history`            | `getHistory`          | `getHistory`          | Lấy watch history (auth)  |

### 💚 **Health Route** (1 endpoint)

| Method | Endpoint         | Controller | Service | Mô Tả        |
| ------ | ---------------- | ---------- | ------- | ------------ |
| GET    | `/api/v1/health` | `check`    | `check` | Health check |

**Tổng cộng: 31 endpoints**

---

## 🔄 Luồng Xử Lý Request

```
Client Request
    ↓
Express Router (index.js)
    ↓
Route Handler (routes/*.routes.js)
    ↓
Controller (controllers/*.controller.js)
    ↓
Service (services/*.service.js)
    ↓
Database/Logic
    ↓
Service returns data
    ↓
Controller formats response
    ↓
Client receives response
```

---

## 📝 Cấu Trúc Function

### **Controller Pattern:**

```javascript
const functionName = async (req, res) => {
  // Extract params, query, body from req
  // Call service
  // Handle response (success/error)
};
```

### **Service Pattern:**

```javascript
const functionName = async (param1, param2, ...) => {
  // Business logic
  // Database operations
  // Return data
};
```

---

## 🔐 Authentication

Các endpoints có ghi chú **(auth)** yêu cầu:

1. **Middleware**: Verify JWT token từ header `Authorization: Bearer <token>`
2. **req.user**: User object được attach vào request sau khi verify token

---

## 📌 Next Steps

1. ✅ **Khung code đã tạo xong** - Tất cả routes, controllers, services đã có function signatures
2. ⏳ **Cần implement**: Logic trong từng function (services và controllers)
3. ⏳ **Cần thêm**:
   - Middleware authentication
   - Error handling middleware
   - Validation middleware
   - Database models/connections
   - Environment configuration

---

## 📚 Tài Liệu Tham Khảo

- Xem MSW handlers: `frontend/src/mocks/handlers.js`
- Xem mock data structure: `frontend/src/mocks/mockData.js`
- API Integration Guide: `frontend/API_INTEGRATION_GUIDE.md`
