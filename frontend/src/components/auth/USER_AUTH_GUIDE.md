# User Authentication System - Guide

## 📋 Overview

Hệ thống xác thực người dùng với 2 trạng thái:

- **Chưa đăng nhập**: Hiển thị nút "Đăng nhập"
- **Đã đăng nhập**: Hiển thị avatar, dropdown menu với thông tin user

## 🎨 UI States

### 1. Chưa Đăng Nhập

```
Header:
  [Logo] [Nav Links] [Search] [Đăng nhập Button]
```

- Nút "Đăng nhập" có gradient cyan-blue, nổi bật
- Click vào sẽ mở AuthModal

### 2. Đã Đăng Nhập

```
Header:
  [Logo] [Nav Links] [Search] [🔔 Bell] [Avatar ▼]
```

- Icon chuông thông báo
- Avatar người dùng với dropdown arrow
- Click avatar → mở dropdown menu

## 🎯 Dropdown Menu Structure

```
┌─────────────────────────────────┐
│ [Avatar] Username               │
│         email@example.com       │
│                                 │
│ ┌─ Premium Banner ─────────┐   │
│ │ 🔁 Minh Tháng Tớ         │   │
│ │ Nâng cấp tài khoản...    │   │
│ │ [Nâng cấp ngay ↑]        │   │
│ └──────────────────────────┘   │
│                                 │
│ 📑 Số dư: 0 💰               │
│ [+ Nạp]                         │
├─────────────────────────────────┤
│ ❤️  Yêu thích                   │
│ 📋 Danh sách                    │
│ ⏱️  Xem tiếp                    │
│ 👤 Tài khoản                    │
│ 🚪 Thoát                        │
└─────────────────────────────────┘
```

## 🔐 Authentication Flow

### Login Flow:

```
1. User clicks "Đăng nhập"
2. AuthModal opens
3. User enters email + password
4. Call authService.login()
5. Save token + user to localStorage
6. Call onLoginSuccess(userData)
7. Header updates to show user info
8. Close modal
```

### Register Flow:

```
1. User clicks "Đăng nhập" → switches to "Đăng ký"
2. User enters username, email, password
3. Call authService.register()
4. Save token + user to localStorage
5. Call onLoginSuccess(userData)
6. Header updates to show user info
7. Close modal
```

### Logout Flow:

```
1. User clicks "Thoát" in dropdown
2. Clear localStorage (token + user)
3. Update state: setUser(null)
4. UI switches back to "Đăng nhập" button
```

## 💾 Data Structure

### User Object:

```javascript
{
  id: 1,
  username: "CinePhile User",
  email: "user@example.com",
  avatar: "https://i.pravatar.cc/150?img=68",
  premium: false,
  coins: 0,
  watchlist: 0
}
```

### LocalStorage:

```javascript
localStorage.setItem("token", "jwt-token-here");
localStorage.setItem("user", JSON.stringify(userObject));
```

## 🎨 Styling Features

### 1. Avatar Border:

- Default: `border-2 border-white/20`
- In dropdown header: `border-2 border-cyan-400/50`

### 2. Dropdown Animation:

```css
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### 3. Menu Items Hover:

- Background: `hover:bg-white/5`
- Logout: `hover:bg-red-500/10` (red tint)

### 4. Premium Banner:

- Gradient: `from-yellow-500/20 to-orange-500/20`
- Border: `border-yellow-500/30`
- Button: `from-yellow-500 to-orange-500`

## 🔧 Component Props

### Header.jsx:

```javascript
// Internal state
const [user, setUser] = useState(null);
const [showUserMenu, setShowUserMenu] = useState(false);
const [showAuthModal, setShowAuthModal] = useState(false);
```

### AuthModal.jsx:

```javascript
<AuthModal
  isOpen={boolean}
  onClose={() => void}
  initialMode="login" | "register"
  onLoginSuccess={(userData) => void}
/>
```

## 🔄 State Management

### Load User on Mount:

```javascript
useEffect(() => {
  const token = localStorage.getItem("token");
  const userData = localStorage.getItem("user");
  if (token && userData) {
    setUser(JSON.parse(userData));
  }
}, []);
```

### Close Dropdown on Outside Click:

```javascript
useEffect(() => {
  const handleClickOutside = (event) => {
    if (menuRef.current && !menuRef.current.contains(event.target)) {
      setShowUserMenu(false);
    }
  };

  if (showUserMenu) {
    document.addEventListener("mousedown", handleClickOutside);
  }
  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
  };
}, [showUserMenu]);
```

## 🧪 Testing

### Mock Mode:

Set `USE_MOCK = true` in `authService.js` để test với mock data.

### Test Login:

```
Email: any@email.com
Password: any (not empty)
→ Mock user will be created
```

### Test Cases:

1. ✅ Chưa đăng nhập → Hiển thị nút "Đăng nhập"
2. ✅ Click "Đăng nhập" → Mở modal
3. ✅ Login thành công → Avatar hiển thị
4. ✅ Click avatar → Dropdown mở
5. ✅ Click bên ngoài → Dropdown đóng
6. ✅ Refresh page → User vẫn đăng nhập
7. ✅ Click "Thoát" → Về trạng thái chưa đăng nhập

## 🚀 Backend Integration

Khi backend sẵn sàng:

### 1. Disable Mock Mode:

```javascript
// authService.js
const USE_MOCK = false;
```

### 2. Update API URL:

```javascript
// .env
REACT_APP_API_URL=https://your-api.com/api
```

### 3. API Endpoints:

- `POST /api/auth/login` - { email, password }
- `POST /api/auth/register` - { username, email, password }
- `POST /api/auth/logout` - { token }
- `GET /api/auth/me` - Get current user (optional)

### 4. Response Format:

```json
{
  "token": "jwt-token",
  "user": {
    "id": 1,
    "username": "User",
    "email": "user@example.com",
    "avatar": "url",
    "premium": false,
    "coins": 0,
    "watchlist": 0
  }
}
```

## 🎯 Features to Add (Future)

1. **Password Reset**: Quên mật khẩu
2. **Email Verification**: Xác thực email
3. **Social Login**: Google, Facebook
4. **Profile Edit**: Chỉnh sửa thông tin
5. **Premium Upgrade**: Nâng cấp tài khoản
6. **Notification Badge**: Số thông báo chưa đọc
7. **Watchlist Count**: Hiển thị số phim trong danh sách
8. **History Tracking**: Lịch sử xem phim

## 📱 Responsive Design

- Mobile: Avatar + dropdown ẩn (sm:hidden được set)
- Tablet+: Hiển thị đầy đủ
- Desktop: Full features

## 🎨 Color Scheme

- Background: `#1e293b` (dark blue-gray)
- Gradient: `from-[#2d3b52] to-[#1e293b]`
- Accent: Cyan-blue gradient
- Premium: Yellow-orange gradient
- Text: White/Gray-200
- Border: `white/10`

## 💡 Best Practices

1. ✅ Always check localStorage on component mount
2. ✅ Clear sensitive data on logout
3. ✅ Handle loading states during auth
4. ✅ Show error messages for failed auth
5. ✅ Prevent body scroll when modal open
6. ✅ Close dropdown on outside click
7. ✅ Smooth animations for better UX
8. ✅ Mock data for development
9. ✅ Prepare for easy backend integration

## 🔒 Security Notes

1. Never store sensitive data in localStorage (only token)
2. Use HTTPS in production
3. Implement token expiration
4. Validate on backend, not just frontend
5. Use secure password requirements
6. Implement rate limiting for login attempts
7. Add CSRF protection
8. Sanitize user input
