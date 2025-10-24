# Account Page - Complete Guide

## 📋 Overview

Trang quản lý tài khoản người dùng với giao diện dark theme, hiện đại và responsive.

## 🎨 UI Structure

```
┌─────────────────────────────────────────────────────────┐
│  Sidebar       │  Main Content                          │
│  ─────────     │  ─────────────────────                 │
│  Logo          │  Quản lý Tài khoản                     │
│                │                                         │
│  ❤️ Yêu thích  │  ┌─ Hồ sơ của tôi ────────────┐       │
│  📋 Danh sách  │  │ [Avatar]  Username           │       │
│  ▶️ Xem tiếp   │  │           email@example.com  │       │
│  🔔 Thông báo  │  │ [Thay đổi] [Xóa]            │       │
│  👤 Tài khoản* │  └──────────────────────────────┘       │
│                │                                         │
│  ─────────     │  ┌─ Thông tin tài khoản ───────┐       │
│  [Avatar]      │  │ Tên hiển thị: [_______]     │       │
│  Username      │  │ Giới tính: ○Nam ○Nữ ○Khác   │       │
│  email...      │  │         [Cập nhật thông tin] │       │
│  🚪 Thoát      │  └──────────────────────────────┘       │
│                │                                         │
│                │  ┌─ Bảo mật & Đăng nhập ───────┐       │
│                │  │ Email: user@email.com  [Thay]│       │
│                │  │ Mật khẩu: ••••••••     [Thay]│       │
│                │  └──────────────────────────────┘       │
└─────────────────────────────────────────────────────────┘
```

## 🗂️ File Structure

```
frontend/src/
├── pages/
│   ├── AccountPage.jsx          # Main page component
│   └── ACCOUNT_PAGE_GUIDE.md    # This file
├── components/
│   └── account/
│       ├── AccountSidebar.jsx   # Left sidebar navigation
│       ├── ProfileCard.jsx      # Avatar & profile display
│       ├── AccountInfoCard.jsx  # Edit username & gender
│       └── SecurityCard.jsx     # Email & password management
└── styles/
    └── AccountPage.css          # All account page styles
```

## 🎯 Features

### 1. **Sidebar Navigation**

- Logo link về home
- Navigation menu:
  - ❤️ Yêu thích (favorites)
  - 📋 Danh sách (watchlist)
  - ▶️ Xem tiếp (continue-watching)
  - 🔔 Thông báo (notifications)
  - 👤 Tài khoản (account) - Active state
- User info display
- Logout button

### 2. **Profile Card**

- Avatar display (100x100px, rounded)
- Username & email
- Change avatar button
- Delete avatar button
- Mock upload (alert for backend integration)

### 3. **Account Info Card**

- Edit username (text input)
- Gender selection (radio buttons):
  - Nam (male)
  - Nữ (female)
  - Không xác định (other)
- Update button (disabled if no changes)
- Success toast notification

### 4. **Security Card**

- Email display & change button
- Password display & change button
- Different states:
  - **Email/Password login**: "Đã đặt ••••••••" + "Thay đổi"
  - **Google login**: "Chưa đặt mật khẩu" + "Đặt mật khẩu"

### 5. **Modals**

- Email change modal
- Password change/set modal
- Form validation
- Mock API calls (alert for backend)

## 🔐 Authentication Logic

### User Object Structure:

```javascript
{
  id: 1,
  username: "Username",
  email: "user@example.com",
  avatar: "url",
  premium: false,
  coins: 1000,
  watchlist: 0,
  hasPassword: true,        // false for Google login
  loginMethod: "email",     // "email" or "google"
  gender: "other"           // "male", "female", "other"
}
```

### Login Method Detection:

```javascript
const isGoogleLogin = user.loginMethod === "google" || !user.hasPassword;
```

### Password Display Logic:

```javascript
// Normal login
hasPassword: true → "Đã đặt ••••••••" + Button "Thay đổi"

// Google login
hasPassword: false → "Chưa đặt mật khẩu" + Button "Đặt mật khẩu"
```

## 🚀 Routes

```javascript
// App.js
<Route path="/account" element={<AccountPage />} />
<Route path="/favorites" element={<AccountPage />} />
<Route path="/watchlist" element={<AccountPage />} />
<Route path="/continue-watching" element={<AccountPage />} />
<Route path="/notifications" element={<AccountPage />} />
```

**Access Flow:**

1. User logged in → Click "Tài khoản" in header dropdown → Navigate to `/account`
2. Click sidebar items → Navigate to respective pages
3. Click "Thoát" → Logout → Navigate to `/` (homepage)

## 🎨 Design Tokens

```css
--bg-dark-primary: #121212; /* Page background */
--bg-dark-secondary: #1e1e1e; /* Cards, sidebar */
--bg-dark-tertiary: #2a2a2a; /* Inputs, footer */
--text-primary: #e0e0e0; /* Main text */
--text-secondary: #a0a0a0; /* Secondary text */
--color-accent: #f3bf1a; /* Yellow accent (buttons) */
--border-color: #333333; /* Borders */
```

## 🔧 Component Props

### AccountPage.jsx:

```javascript
// Internal state
const [user, setUser] = useState(null);

// Redirect if not logged in
useEffect(() => {
  if (!token || !userData) {
    navigate("/");
  }
}, [navigate]);
```

### ProfileCard.jsx:

```javascript
<ProfileCard
  user={userObject}
  onUpdate={(updatedData) => void}
/>
```

### AccountInfoCard.jsx:

```javascript
<AccountInfoCard
  user={userObject}
  onUpdate={(updatedData) => void}
/>
```

### SecurityCard.jsx:

```javascript
<SecurityCard
  user={userObject}
  onUpdate={(updatedData) => void}
/>
```

## 📱 Responsive Design

### Desktop (> 768px):

- Sidebar: 250px fixed width, sticky
- Main content: Flexible width
- Two-column layout

### Mobile (≤ 768px):

- Sidebar: Full width, top position
- Main content: Full width below sidebar
- Single column layout
- Security items: Stack vertically

## ⚙️ State Management

### Load User on Mount:

```javascript
useEffect(() => {
  const token = localStorage.getItem("token");
  const userData = localStorage.getItem("user");

  if (!token || !userData) {
    navigate("/");
    return;
  }

  setUser(JSON.parse(userData));
}, [navigate]);
```

### Update User Data:

```javascript
const handleUpdateProfile = (updatedData) => {
  const updatedUser = { ...user, ...updatedData };
  setUser(updatedUser);
  localStorage.setItem("user", JSON.stringify(updatedUser));
};
```

### Logout:

```javascript
const handleLogout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  navigate("/");
};
```

## 🎭 Animations

### Modal Animation:

```css
@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Loading Spinner:

```css
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
```

### Success Toast:

```css
.success-toast {
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.3s ease;
}

.success-toast.show {
  opacity: 1;
  transform: translateY(0);
}
```

## 🧪 Testing

### Test Cases:

1. **Navigation**

   - ✅ Not logged in → Redirect to home
   - ✅ Logged in → Show account page
   - ✅ Click sidebar items → Navigate
   - ✅ Click "Thoát" → Logout & redirect

2. **Profile Card**

   - ✅ Display avatar, username, email
   - ✅ Click "Thay đổi ảnh" → File input (mock)
   - ✅ Click "Xóa" → Confirm dialog

3. **Account Info**

   - ✅ Edit username → Button enabled
   - ✅ Change gender → Button enabled
   - ✅ No changes → Button disabled
   - ✅ Submit → Success toast

4. **Security**

   - ✅ Email login → "Đã đặt ••••••••"
   - ✅ Google login → "Chưa đặt mật khẩu"
   - ✅ Click "Thay đổi" → Modal opens
   - ✅ Submit → Mock API call

5. **Responsive**
   - ✅ Desktop → Two columns
   - ✅ Mobile → Stack layout

## 🔌 Backend Integration

### Mock Mode:

Currently using mock data. Set `USE_MOCK = true` in `authService.js`.

### API Endpoints (Future):

```javascript
// Update profile
PUT /api/user/profile
Body: { username, gender, avatar }

// Change email
PUT /api/user/email
Body: { newEmail, password }

// Change password
PUT /api/user/password
Body: { currentPassword, newPassword }

// Set password (for Google users)
POST /api/user/set-password
Body: { newPassword }

// Upload avatar
POST /api/user/avatar
Body: FormData with image file
```

### Response Format:

```json
{
  "success": true,
  "message": "Cập nhật thành công",
  "user": {
    "id": 1,
    "username": "Updated Name",
    "email": "user@email.com",
    "avatar": "new-url",
    "gender": "male",
    ...
  }
}
```

## 🎯 Features to Add (Future)

1. **Avatar Upload**: Real file upload to server
2. **Email Verification**: Send verification email
3. **2FA**: Two-factor authentication
4. **Login History**: Show recent login activity
5. **Connected Accounts**: Link Google, Facebook
6. **Privacy Settings**: Control what others can see
7. **Notification Preferences**: Email/push settings
8. **Data Export**: Download user data
9. **Account Deletion**: Delete account option
10. **Activity Log**: Track account changes

## 🎨 Customization

### Change Accent Color:

```css
:root {
  --color-accent: #f3bf1a; /* Change to your brand color */
}
```

### Change Dark Theme Colors:

```css
:root {
  --bg-dark-primary: #121212; /* Darker */
  --bg-dark-secondary: #1e1e1e; /* Medium */
  --bg-dark-tertiary: #2a2a2a; /* Lighter */
}
```

### Sidebar Width:

```css
.account-sidebar {
  width: 250px; /* Adjust as needed */
}
```

## 💡 Best Practices

1. ✅ Always check authentication before rendering
2. ✅ Show loading state during data fetch
3. ✅ Validate form inputs before submission
4. ✅ Show success/error messages to user
5. ✅ Confirm destructive actions (delete, logout)
6. ✅ Keep user data in sync with localStorage
7. ✅ Handle modal close on outside click
8. ✅ Use semantic HTML for accessibility
9. ✅ Maintain consistent spacing and sizing
10. ✅ Test responsive layout on multiple devices

## 🔒 Security Considerations

1. Never store passwords in localStorage
2. Only store JWT token, not sensitive data
3. Clear localStorage on logout
4. Validate on backend, not just frontend
5. Use HTTPS in production
6. Implement rate limiting for API calls
7. Add CSRF protection
8. Sanitize all user inputs
9. Implement session timeout
10. Log security events

## 📚 Dependencies

- React Router: Navigation
- Font Awesome: Icons
- CSS: Custom styles (no framework)

## 🎓 Learning Resources

- [React Router Docs](https://reactrouter.com/)
- [CSS Grid & Flexbox](https://css-tricks.com/)
- [Dark Mode Design](https://material.io/design/color/dark-theme.html)
- [Accessible Forms](https://www.w3.org/WAI/tutorials/forms/)
