# 🎬 CinePhine - Nền tảng xem phim trực tuyến

CinePhine là một nền tảng xem phim trực tuyến hiện đại, được xây dựng với React và Node.js, cung cấp trải nghiệm xem phim mượt mà với nhiều tính năng như tìm kiếm, lọc, đánh giá, và quản lý danh sách yêu thích.

## 📋 Mục lục

- [Tổng quan](#tổng-quan)
- [Tính năng](#tính-năng)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [Cài đặt và chạy dự án](#cài-đặt-và-chạy-dự-án)
  - [Backend](#backend)
  - [Frontend](#frontend)
- [Cấu hình môi trường](#cấu-hình-môi-trường)

## 🎯 Tổng quan

CinePhine là một ứng dụng web full-stack cho phép người dùng:

- Xem phim trực tuyến với chất lượng cao
- Tìm kiếm và lọc phim theo nhiều tiêu chí (thể loại, quốc gia, năm phát hành, v.v.)
- Quản lý danh sách yêu thích và danh sách xem sau
- Đánh giá và bình luận về phim
- Theo dõi lịch sử xem phim
- Tích hợp chatbot AI để tư vấn phim
- Hệ thống thanh toán để nạp coin và nâng cấp tài khoản premium

## ✨ Tính năng

### Người dùng

- 🔐 Đăng nhập/Đăng ký (Email, Google OAuth)
- 🎬 Xem phim với trình phát video HLS
- 🔍 Tìm kiếm phim thông minh
- 🎭 Lọc phim theo thể loại, quốc gia, năm, chất lượng
- ⭐ Đánh giá và bình luận phim
- ❤️ Quản lý danh sách yêu thích
- 📝 Quản lý danh sách xem sau (Watchlist)
- 📊 Theo dõi lịch sử xem phim
- 💬 Chatbot AI tư vấn phim
- 💰 Nạp coin và nâng cấp tài khoản premium
- 🔔 Hệ thống thông báo real-time

### Quản trị viên

- 📊 Dashboard quản lý tổng quan
- 🎬 Quản lý phim (thêm, sửa, xóa)
- 👥 Quản lý người dùng
- 💬 Quản lý bình luận
- 🔍 Crawler tự động cập nhật phim mới
- 📈 Thống kê và báo cáo

## 🛠️ Công nghệ sử dụng

### Backend

- **Node.js** với **Express.js** - Framework web server
- **MongoDB** với **Mongoose** - Cơ sở dữ liệu NoSQL
- **JWT** - Xác thực và phân quyền
- **Passport.js** - Authentication middleware (Local, Google OAuth)
- **Socket.io** - WebSocket cho real-time notifications
- **PayOS** - Tích hợp thanh toán
- **Google Gemini API** - Chatbot AI

### Frontend

- **React 19** - UI framework
- **React Router** - Điều hướng
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **HLS.js** - Video player
- **Chart.js** - Biểu đồ thống kê
- **SweetAlert2** - Thông báo đẹp

## 📁 Cấu trúc dự án

```
CinePhine/
├── backend/                 # Backend API server
│   ├── config/             # Cấu hình (database, v.v.)
│   │   └── db/
│   │       └── db.js       # Kết nối MongoDB
│   ├── controllers/        # Controllers xử lý request
│   │   ├── admin.controller.js
│   │   ├── auth.controller.js
│   │   ├── movie.controller.js
│   │   ├── user.controller.js
│   │   ├── chat.controller.js
│   │   ├── payment.controller.js
│   │   └── ...
│   ├── models/             # Mongoose models
│   │   ├── user.model.js
│   │   ├── movie.model.js
│   │   ├── comment.model.js
│   │   ├── chat.model.js
│   │   └── ...
│   ├── routes/             # API routes
│   │   ├── auth.routes.js
│   │   ├── movie.routes.js
│   │   ├── user.routes.js
│   │   └── ...
│   ├── services/           # Business logic
│   │   ├── auth.service.js
│   │   ├── movie.service.js
│   │   ├── chat.service.js
│   │   └── ...
│   ├── middleware/         # Custom middleware
│   │   ├── auth.middleware.js
│   │   └── admin.middleware.js
│   ├── utils/             # Utility functions
│   ├── integrations/       # Tích hợp bên thứ 3 (TMDB, v.v.)
│   ├── scripts/           # Scripts tiện ích
│   ├── data/              # Dữ liệu tĩnh (avatars, v.v.)
│   ├── app.js             # Express app configuration
│   └── server.js          # Entry point
│
├── frontend/              # React frontend application
│   ├── public/            # Static files
│   │   ├── index.html
│   │   └── favicon files
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── account/   # Components tài khoản
│   │   │   ├── admin/     # Components admin
│   │   │   ├── auth/       # Components đăng nhập
│   │   │   ├── banner/     # Banner phim
│   │   │   ├── common/     # Components dùng chung
│   │   │   ├── header/     # Header navigation
│   │   │   ├── home-page/  # Trang chủ
│   │   │   ├── movie-card/  # Card phim
│   │   │   ├── movie-detail/# Chi tiết phim
│   │   │   ├── watch-page/  # Trang xem phim
│   │   │   └── ...
│   │   ├── pages/         # Page components
│   │   │   ├── HomePage.jsx
│   │   │   ├── MovieDetail.jsx
│   │   │   ├── WatchPage.jsx
│   │   │   ├── SearchResults.jsx
│   │   │   └── ...
│   │   ├── hooks/         # Custom React hooks
│   │   │   ├── useAuth.js
│   │   │   ├── useMovieDetail.js
│   │   │   └── ...
│   │   ├── contexts/      # React Contexts
│   │   │   ├── AuthContext.jsx
│   │   │   └── NotificationContext.jsx
│   │   ├── services/      # API services
│   │   │   ├── auth.service.js
│   │   │   ├── movie.service.js
│   │   │   └── ...
│   │   ├── utils/         # Utility functions
│   │   │   ├── imageCache.js
│   │   │   ├── imagePreloader.js
│   │   │   ├── apiCache.js
│   │   │   └── ...
│   │   ├── lib/           # Libraries
│   │   │   ├── axios.js    # Axios configuration
│   │   │   └── auth-storage.js
│   │   ├── assets/        # Static assets
│   │   │   └── images/
│   │   ├── styles/        # CSS files
│   │   ├── layouts/       # Layout components
│   │   ├── constants/     # Constants
│   │   ├── App.js         # Main App component
│   │   └── index.js       # Entry point
│   ├── package.json
│   └── tailwind.config.js
│
└── README.md
```

## 🚀 Cài đặt và chạy dự án

### Yêu cầu hệ thống

- **Node.js** >= 16.x
- **npm** hoặc **yarn**
- **MongoDB** >= 4.4 (local hoặc MongoDB Atlas)

### Backend

1. **Di chuyển vào thư mục backend:**

   ```bash
   cd backend
   ```

2. **Cài đặt dependencies:**

   ```bash
   npm install
   ```

3. **Tạo file `.env` trong thư mục `backend/`:**

   ```env
   # Database
   MONGO_URI=mongodb://localhost:27017/cinephile
   # hoặc MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/cinephile

   # Server
   PORT=5000
   NODE_ENV=development

   # JWT
   JWT_SECRET=your-secret-key-here
   JWT_REFRESH_SECRET=your-refresh-secret-key-here

   # Client URLs
   CLIENT_URL=http://localhost:5001
   CLIENT_URL_LOCAL=http://localhost:5001

   # Google OAuth
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret

   # PayOS
   PAYOS_CLIENT_ID=your-payos-client-id
   PAYOS_API_KEY=your-payos-api-key
   PAYOS_CHECKOUT_KEY=your-payos-checkout-key

   # Gemini AI (cho chatbot)
   GEMINI_API_KEY=your-gemini-api-key
   ```

4. **Chạy server:**

   ```bash
   # Development mode (với nodemon - auto reload)
   npm run dev

   # Production mode
   npm start
   ```

   Server sẽ chạy tại: `http://localhost:5000`

### Frontend

1. **Di chuyển vào thư mục frontend:**

   ```bash
   cd frontend
   ```

2. **Cài đặt dependencies:**

   ```bash
   npm install
   ```

3. **Tạo file `.env` trong thư mục `frontend/` (nếu cần):**

   ```env
   REACT_APP_API_URL=http://localhost:5000/api/v1
   REACT_APP_API_KEY_GEMINI=your-gemini-api-key
   ```

4. **Chạy ứng dụng:**

   ```bash
   npm start
   ```

   Ứng dụng sẽ mở tại: `http://localhost:5001`

5. **Build cho production:**

   ```bash
   npm run build
   ```

   Thư mục `build/` sẽ chứa các file đã được tối ưu để deploy.

## ⚙️ Cấu hình môi trường

### MongoDB

Có thể sử dụng MongoDB local hoặc MongoDB Atlas:

**Local MongoDB:**

- Cài đặt MongoDB trên máy
- Chạy MongoDB service
- Cập nhật `MONGO_URI` trong `.env`: `mongodb://localhost:27017/cinephile`

**MongoDB Atlas (Cloud):**

- Tạo tài khoản tại [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- Tạo cluster và database
- Lấy connection string và cập nhật vào `MONGO_URI`

### Google OAuth

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project hiện có
3. Bật Google+ API
4. Tạo OAuth 2.0 credentials
5. Thêm authorized redirect URIs: `http://localhost:5000/api/v1/auth/google/callback`
6. Copy Client ID và Client Secret vào `.env`

### PayOS

1. Đăng ký tài khoản tại [PayOS](https://payos.vn/)
2. Tạo ứng dụng và lấy Client ID, API Key, Checkout Key
3. Cập nhật vào file `.env`

### Google Gemini API

1. Truy cập [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Tạo API key mới
3. Cập nhật vào `.env` (cả backend và frontend nếu cần)

## 📝 Ghi chú

- Đảm bảo MongoDB đang chạy trước khi start backend
- Backend và Frontend cần chạy đồng thời
- Kiểm tra các biến môi trường trong `.env` đã được cấu hình đúng
- Port mặc định: Backend (5000), Frontend (5001)

## 👥 Tác giả

Đồ án được phát triển bởi nhóm 5 Grinders

- Tô Minh Thắng
- Lê Trường Thịnh
- Lê Minh Đức
- Phan Trung Nhựt
- Lê Võ Xuân Hưng
