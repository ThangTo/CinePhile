# 🔐 Tài Khoản Test - CinePhile

## 👨‍💼 Admin Account

Dùng để truy cập Admin Dashboard và quản lý hệ thống.

```
Email: admin@cinephile.com
Password: admin123
Role: Admin
```

**Quyền hạn**:
- ✅ Truy cập `/admin` dashboard
- ✅ Quản lý phim (CRUD)
- ✅ Quản lý người dùng (CRUD)
- ✅ Xem thống kê
- ✅ Tất cả chức năng user thường

**Sau khi đăng nhập**:
- Trong menu user (header), sẽ thấy nút "Admin Panel" màu tím
- Click để vào dashboard admin

---

## 👤 User Account

Dùng để test chức năng user thường.

```
Email: user@cinephile.com
Password: user123
Role: User
```

**Quyền hạn**:
- ❌ Không truy cập được `/admin`
- ✅ Xem phim
- ✅ Bình luận
- ✅ Thêm vào danh sách
- ✅ Quản lý tài khoản cá nhân

**Khi thử vào `/admin`**:
- Sẽ thấy màn hình "Truy Cập Bị Từ Chối"

---

## 🚀 Cách Đăng Nhập

### Bước 1: Mở Modal Đăng Nhập
- Click vào icon user ở header (góc phải)
- Hoặc click "Đăng nhập" trong menu mobile

### Bước 2: Nhập Thông Tin
- **Admin**: `admin@cinephile.com` / `admin123`
- **User**: `user@cinephile.com` / `user123`

### Bước 3: Click "Đăng nhập"
- Hệ thống sẽ kiểm tra email/password
- Tự động load thông tin user kèm role
- Modal sẽ đóng và trang reload

### Bước 4: Kiểm Tra Role
- Mở menu user (click avatar header)
- **Nếu admin**: Thấy nút "Admin Panel" màu tím ở đầu menu
- **Nếu user**: Không thấy nút admin

---

## 📝 Đăng Ký Tài Khoản Mới

### Bước 1: Mở Modal Đăng Ký
- Click "Đăng nhập" → "Đăng ký ngay"

### Bước 2: Điền Form
```
Tên hiển thị: (tên bạn muốn)
Email: (email hợp lệ)
Mật khẩu: (ít nhất 6 ký tự)
Xác nhận mật khẩu: (khớp với mật khẩu)
```

### Bước 3: Click "Đăng ký"
- User mới được tạo với **role = "user"** (mặc định)
- Tự động đăng nhập
- Không có quyền admin

**Lưu ý**: Tài khoản mới luôn có role "user". Muốn có admin phải:
- Backend assign role
- Hoặc admin hiện tại promote trong User Management

---

## 🔄 Logic Phân Quyền

### Flow Đăng Nhập
```
1. User nhập email/password
   ↓
2. authService.login() check MOCK_USERS
   ↓
3. Tìm thấy user → Return user data (kèm role)
   ↓
4. Lưu vào localStorage: token + user (có role)
   ↓
5. useAuth hook load user từ localStorage
   ↓
6. Header check user.role
   - Nếu "admin" → Hiển thị nút Admin Panel
   - Nếu "user" → Không hiển thị
```

### Flow Truy Cập Admin
```
1. User click link /admin
   ↓
2. ProtectedRoute check:
   - user === null? → Redirect "/"
   - user.role !== "admin"? → Show "Access Denied"
   - user.role === "admin"? → Allow access
   ↓
3. AdminDashboard render
```

### Flow Đăng Ký
```
1. User điền form đăng ký
   ↓
2. authService.register() validate
   ↓
3. Check email đã tồn tại?
   - Yes → Error "Email đã được sử dụng"
   - No → Tiếp tục
   ↓
4. Tạo user mới với role = "user"
   ↓
5. Tự động đăng nhập (lưu token + user)
```

---

## 🎯 Test Scenarios

### ✅ Scenario 1: Login Admin
```
Email: admin@cinephile.com
Password: admin123
Expected: Vào được /admin, thấy nút Admin Panel trong menu
```

### ✅ Scenario 2: Login User
```
Email: user@cinephile.com
Password: user123
Expected: Không thấy nút Admin Panel, không vào được /admin
```

### ✅ Scenario 3: Login Sai
```
Email: wrong@email.com
Password: wrongpass
Expected: Lỗi "Email hoặc mật khẩu không đúng"
```

### ✅ Scenario 4: Đăng Ký Mới
```
Username: TestUser
Email: test@example.com
Password: test123
Expected: Tạo user mới với role "user", auto login
```

### ✅ Scenario 5: User Cố Vào Admin
```
1. Login as user@cinephile.com
2. Navigate to /admin
Expected: Màn hình "Truy Cập Bị Từ Chối"
```

---

## 🛠️ Developer Tools

### Check Current User Role
```javascript
const user = JSON.parse(localStorage.getItem("user"));
console.log("Role:", user?.role);
console.log("Is Admin:", user?.role === "admin");
```

### Manually Set Admin
```javascript
const user = JSON.parse(localStorage.getItem("user"));
user.role = "admin";
localStorage.setItem("user", JSON.stringify(user));
window.location.reload();
```

### View All Mock Users
```javascript
// In authService.js, add export:
export { MOCK_USERS };

// In console:
import { MOCK_USERS } from './services/authService';
console.table(MOCK_USERS);
```

---

## 🔒 Security Notes (Development Mode)

⚠️ **Chỉ dùng cho development**:
- Password plain text (không hash)
- Lưu trong file source code
- Không validate JWT token
- Không expire session

✅ **Production sẽ cần**:
- Backend API thật
- Password hashing (bcrypt)
- JWT với expiry
- Refresh token
- HTTPS only
- Rate limiting
- CSRF protection

---

## 📊 Mock User Database

| ID | Username | Email | Password | Role | Premium |
|----|----------|-------|----------|------|---------|
| 1 | Admin | admin@cinephile.com | admin123 | admin | Yes |
| 2 | User Demo | user@cinephile.com | user123 | user | No |

**Note**: Đăng ký mới sẽ thêm vào list này (runtime only, refresh sẽ mất).

---

## ✨ Features

- ✅ Email/Password authentication
- ✅ Role-based access control
- ✅ Register validation (email duplicate, password length)
- ✅ Auto-login after register
- ✅ Protected routes
- ✅ Role display in user menu
- ✅ Conditional admin panel button
- ✅ Beautiful access denied screen

---

## 📞 Quick Help

**"Quên mật khẩu?"**
→ Hiện tại chưa implement. Dùng mock accounts phía trên.

**"Làm sao thành admin?"**
→ Đăng nhập với `admin@cinephile.com`

**"Đăng ký rồi muốn làm admin?"**
→ Cần admin hiện tại vào User Management và đổi role (hoặc edit localStorage)

**"Logout ở đâu?"**
→ Click avatar → "Thoát" ở menu

