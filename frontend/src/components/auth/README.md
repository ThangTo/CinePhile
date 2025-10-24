# Authentication System

## Overview

Modal-based authentication system với login và register forms. Không chuyển trang, chỉ là overlay modal.

## Components

### AuthModal.jsx

Main modal component xử lý cả login và register.

**Props:**

- `isOpen` (boolean): Hiển thị/ẩn modal
- `onClose` (function): Callback khi đóng modal
- `initialMode` (string): "login" hoặc "register"

**Features:**

- ✅ Form validation
- ✅ Error handling
- ✅ Loading states
- ✅ Switch giữa login/register
- ✅ Google OAuth placeholder
- ✅ Responsive design
- ✅ Cloudflare captcha UI

## Backend Integration

### API Endpoints Required

#### 1. Login

```
POST /api/auth/login
Body: { email, password }
Response: { token, user: { id, username, email, ... } }
```

#### 2. Register

```
POST /api/auth/register
Body: { username, email, password }
Response: { token, user: { id, username, email, ... } }
```

#### 3. Google OAuth (Optional)

```
GET /api/auth/google
Redirect to Google OAuth flow
```

### Environment Variables

Create `.env` file:

```
REACT_APP_API_URL=http://localhost:5000/api
```

### Auth Service (`authService.js`)

Centralized authentication logic:

- `login(email, password)` - Login user
- `register(username, email, password)` - Register user
- `logout()` - Clear auth data
- `getCurrentUser()` - Get current user
- `isAuthenticated()` - Check auth status
- `getToken()` - Get JWT token
- `setAuthData(token, user)` - Store auth data

### Storage

Uses `localStorage` to store:

- `token`: JWT authentication token
- `user`: User object (JSON string)

## Usage

### In Header Component

```jsx
import AuthModal from './auth/AuthModal';

const [showAuthModal, setShowAuthModal] = useState(false);
const [authMode, setAuthMode] = useState('login');

// Open modal
<button onClick={() => {
  setAuthMode('login');
  setShowAuthModal(true);
}}>
  Đăng nhập
</button>

// Render modal
<AuthModal
  isOpen={showAuthModal}
  onClose={() => setShowAuthModal(false)}
  initialMode={authMode}
/>
```

### Protected Routes (Future)

```jsx
import { isAuthenticated } from "./services/authService";

const ProtectedRoute = ({ children }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/" />;
  }
  return children;
};
```

### API Calls with Auth

```jsx
import { getToken } from "./services/authService";

const fetchWithAuth = async (url, options = {}) => {
  const token = getToken();
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
};
```

## Backend Implementation Guide

### Express.js Example

```javascript
// auth.routes.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Register
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email đã được sử dụng" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    // Generate token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
    }

    // Generate token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
```

### User Model Example (Mongoose)

```javascript
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  avatar: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("User", userSchema);
```

## Security Considerations

1. **Password Hashing**: Always hash passwords with bcrypt
2. **JWT Secret**: Use strong secret key in environment variables
3. **HTTPS**: Use HTTPS in production
4. **CORS**: Configure CORS properly
5. **Rate Limiting**: Add rate limiting to prevent brute force
6. **Input Validation**: Validate all inputs on backend
7. **SQL Injection**: Use parameterized queries
8. **XSS Protection**: Sanitize user inputs

## Testing

### Manual Testing

1. Click "Đăng nhập" trong header
2. Try to login without filling fields (should show errors)
3. Fill valid data and submit
4. Check localStorage for token and user
5. Page should refresh and show user info
6. Click "Đăng xuất" to logout

### API Testing (when backend is ready)

Use Postman or curl:

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"123456"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456"}'
```

## Styling

- Uses Tailwind CSS
- Dark theme matching website design
- Responsive (mobile + desktop)
- Smooth animations
- Backdrop blur effect

## Future Enhancements

- [ ] Email verification
- [ ] Password reset
- [ ] Two-factor authentication
- [ ] Social login (Facebook, Twitter)
- [ ] Remember me checkbox
- [ ] Profile page
- [ ] Password strength meter
- [ ] ReCaptcha integration
