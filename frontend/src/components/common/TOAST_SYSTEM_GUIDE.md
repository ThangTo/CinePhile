# Toast Notification System - Complete Guide

## 📋 Overview

Hệ thống toast notification tái sử dụng, nhất quán, và dễ dàng tích hợp vào bất kỳ component nào.

## 🎯 Features

✅ **4 loại toast**: Success, Error, Warning, Info  
✅ **Auto dismiss**: Tự động đóng sau thời gian cấu hình  
✅ **Custom duration**: Thay đổi thời gian hiển thị  
✅ **Multiple toasts**: Hiển thị nhiều toast cùng lúc  
✅ **Icons**: Icon tự động theo loại toast  
✅ **Animations**: Smooth slide-in animation  
✅ **Responsive**: Tự động adapt trên mobile  
✅ **Easy to use**: Hook đơn giản, dễ sử dụng

## 📁 File Structure

```
frontend/src/
├── components/
│   └── common/
│       ├── Toast.jsx              # Toast component
│       ├── ToastContainer.jsx     # Container for multiple toasts
│       └── TOAST_SYSTEM_GUIDE.md  # This file
├── hooks/
│   └── useToast.js                # Custom hook
└── styles/
    └── Toast.css                  # Toast styles
```

## 🚀 Quick Start

### 1. Import hook vào component:

```javascript
import useToast from "../../hooks/useToast";
import ToastContainer from "../common/ToastContainer";
```

### 2. Sử dụng hook:

```javascript
const MyComponent = () => {
  const { toasts, removeToast, success, error, warning, info } = useToast();

  const handleAction = () => {
    success("Thao tác thành công!");
  };

  return (
    <>
      {/* Your component content */}
      <button onClick={handleAction}>Click me</button>

      {/* Toast container - đặt ở cuối component */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );
};
```

## 🎨 Toast Types

### 1. Success (Green)

```javascript
success("Đã lưu thành công!");
success("Cập nhật thông tin thành công!", 3000); // Custom duration
```

### 2. Error (Red)

```javascript
error("Có lỗi xảy ra!");
error("Không thể kết nối server!", 4000);
```

### 3. Warning (Orange)

```javascript
warning("Vui lòng điền đầy đủ thông tin!");
warning("Bạn chưa đăng nhập!", 2500);
```

### 4. Info (Blue)

```javascript
info("Chức năng đang được phát triển!");
info("Dữ liệu đã được cập nhật!", 3000);
```

## 🔧 API Reference

### useToast Hook

```javascript
const {
  toasts, // Array of current toasts
  removeToast, // Function to remove a toast by ID
  showToast, // Generic function to show any type
  success, // Show success toast
  error, // Show error toast
  warning, // Show warning toast
  info, // Show info toast
} = useToast();
```

### Toast Functions

```javascript
// Basic usage
success(message);
error(message);
warning(message);
info(message);

// With custom duration
success(message, duration); // duration in milliseconds

// Generic function
showToast(message, type, duration);
```

### Parameters

| Parameter | Type   | Default   | Description                           |
| --------- | ------ | --------- | ------------------------------------- |
| message   | string | required  | Toast message content                 |
| type      | string | "success" | "success", "error", "warning", "info" |
| duration  | number | 2000      | Display duration in ms                |

## 💡 Usage Examples

### Example 1: Account Update

```javascript
const AccountInfoCard = ({ user, onUpdate }) => {
  const { toasts, removeToast, success } = useToast();

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate(formData);
    success("Cập nhật thông tin thành công!");
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        {/* Form fields */}
        <button type="submit">Cập nhật</button>
      </form>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );
};
```

### Example 2: Avatar Upload

```javascript
const ProfileCard = ({ user, onUpdate }) => {
  const { toasts, removeToast, success, info } = useToast();

  const handleChangeAvatar = () => {
    // Upload logic...
    info("Chức năng upload ảnh sẽ được tích hợp!");
  };

  const handleDeleteAvatar = () => {
    if (confirm("Xóa ảnh?")) {
      onUpdate({ avatar: null });
      success("Đã xóa ảnh đại diện!");
    }
  };

  return (
    <>
      <button onClick={handleChangeAvatar}>Thay đổi</button>
      <button onClick={handleDeleteAvatar}>Xóa</button>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );
};
```

### Example 3: Form Validation

```javascript
const SecurityCard = () => {
  const { toasts, removeToast, error, success } = useToast();

  const handleSubmit = (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      error("Mật khẩu không khớp!");
      return;
    }

    // API call...
    success("Đổi mật khẩu thành công!");
  };

  return (
    <>
      <form onSubmit={handleSubmit}>{/* Form fields */}</form>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );
};
```

### Example 4: Action Buttons

```javascript
const BannerDetail = ({ movie }) => {
  const { toasts, removeToast, success, info } = useToast();

  const handleAddFavorite = () => {
    // API call...
    success("Đã thêm vào yêu thích!");
  };

  const handleShare = () => {
    info("Chức năng chia sẻ sẽ được tích hợp!");
  };

  return (
    <>
      <button onClick={handleAddFavorite}>❤️ Yêu thích</button>
      <button onClick={handleShare}>🔗 Chia sẻ</button>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );
};
```

### Example 5: Comment System

```javascript
const CommentsSection = () => {
  const { toasts, removeToast, success, warning } = useToast();

  const handleSubmitComment = () => {
    if (!commentText.trim()) {
      warning("Vui lòng nhập nội dung!");
      return;
    }

    // Submit comment...
    success("Bình luận đã được gửi!");
    setCommentText('');
  };

  return (
    <>
      <textarea value={commentText} onChange={...} />
      <button onClick={handleSubmitComment}>Gửi</button>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );
};
```

## 🎨 Styling

### Colors (defined in Toast.css)

```css
.toast-success {
  background-color: #10b981; /* Green */
}

.toast-error {
  background-color: #ef4444; /* Red */
}

.toast-warning {
  background-color: #f59e0b; /* Orange */
}

.toast-info {
  background-color: #3b82f6; /* Blue */
}
```

### Icons

| Type    | Icon                        |
| ------- | --------------------------- |
| Success | `fa-check-circle` ✓         |
| Error   | `fa-exclamation-circle` ⚠   |
| Warning | `fa-exclamation-triangle` ⚠ |
| Info    | `fa-info-circle` ℹ          |

### Positioning

Default: **Bottom-right corner**

- Desktop: `bottom: 30px; right: 30px;`
- Mobile: Full width bottom

### Animation

```css
@keyframes toastSlideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

## 🔧 Customization

### Change Default Duration

```javascript
// In useToast.js
const showToast = useCallback((message, type = "success", duration = 3000) => {
  // Changed from 2000 to 3000
```

### Change Position

```css
/* In Toast.css */
.toast {
  top: 30px; /* Instead of bottom */
  left: 30px; /* Instead of right */
}
```

### Add New Toast Type

1. Add color in `Toast.css`:

```css
.toast-custom {
  background-color: #8b5cf6; /* Purple */
}
```

2. Add icon in `Toast.jsx`:

```javascript
const icons = {
  success: "fa-check-circle",
  error: "fa-exclamation-circle",
  warning: "fa-exclamation-triangle",
  info: "fa-info-circle",
  custom: "fa-star", // New icon
};
```

3. Add method in `useToast.js`:

```javascript
return {
  // ... other methods
  custom: (message, duration) => showToast(message, "custom", duration),
};
```

## 📊 Where Toasts Are Used

### Account Pages:

1. ✅ **ProfileCard** - Avatar upload/delete
2. ✅ **AccountInfoCard** - Update profile info
3. ✅ **SecurityCard** - Email/password changes

### Movie Detail Pages:

4. ✅ **BannerDetail** - Add favorite, share, etc.
5. ✅ **CommentsSection** - Submit comments, like/reply

### Future Implementation:

- Login/Register success
- Add to watchlist
- Rating movies
- Search results
- Video player actions

## 🧪 Testing

### Test Cases:

```javascript
// 1. Single toast
success("Test message");

// 2. Multiple toasts
success("First message");
error("Second message");
warning("Third message");

// 3. Custom duration
info("Short message", 1000); // 1 second
success("Long message", 5000); // 5 seconds

// 4. Empty message (should still work)
success("");

// 5. Very long message
success(
  "This is a very long message that should wrap properly within the toast container width limit"
);

// 6. Rapid succession
for (let i = 0; i < 5; i++) {
  success(`Message ${i + 1}`);
}
```

## ⚠️ Important Notes

### 1. ToastContainer Placement

Always place `<ToastContainer>` at the **end** of your component, before closing tag:

```javascript
return (
  <>
    {/* Your content */}

    <ToastContainer toasts={toasts} removeToast={removeToast} />
  </>
);
```

### 2. Don't Nest ToastContainers

Each component should have **only one** `ToastContainer`.

❌ **Bad:**

```javascript
<div>
  <ToastContainer ... />
  <SomeComponent>
    <ToastContainer ... /> {/* Duplicate! */}
  </SomeComponent>
</div>
```

✅ **Good:**

```javascript
<div>
  {/* Content */}

  <ToastContainer ... /> {/* Only one */}
</div>
```

### 3. Import Path

Make sure import paths are correct based on your component location:

```javascript
// From account components (2 levels deep)
import useToast from "../../hooks/useToast";
import ToastContainer from "../common/ToastContainer";

// From movie-detail components (2 levels deep)
import useToast from "../../hooks/useToast";
import ToastContainer from "../common/ToastContainer";

// From pages (1 level deep)
import useToast from "../hooks/useToast";
import ToastContainer from "../components/common/ToastContainer";
```

## 🔄 Migration from Old Toast

### Before (Manual Toast):

```javascript
const handleSubmit = () => {
  const successMsg = document.createElement("div");
  successMsg.className = "success-toast";
  successMsg.textContent = "✓ Success!";
  document.body.appendChild(successMsg);

  setTimeout(() => successMsg.classList.add("show"), 10);
  setTimeout(() => {
    successMsg.classList.remove("show");
    setTimeout(() => successMsg.remove(), 300);
  }, 2000);
};
```

### After (useToast):

```javascript
const { success } = useToast();

const handleSubmit = () => {
  success("Success!");
};
```

**Benefits:**

- ✅ 90% less code
- ✅ Cleaner and readable
- ✅ Consistent styling
- ✅ Easier to maintain
- ✅ Type-safe
- ✅ Reusable

## 🚀 Best Practices

1. **Use appropriate toast types:**

   - Success: Completed actions
   - Error: Failed operations
   - Warning: Validation errors
   - Info: Informational messages

2. **Keep messages concise:**

   - ✅ "Đã lưu thành công!"
   - ❌ "Thông tin tài khoản của bạn đã được lưu vào cơ sở dữ liệu thành công!"

3. **Use Vietnamese properly:**

   - ✅ "Đã thêm vào danh sách yêu thích!"
   - ❌ "Add to favorite success!"

4. **Don't overuse:**

   - Show toast for important actions
   - Don't show for every click

5. **Timing:**
   - Success/Info: 2000ms (default)
   - Warning: 2500-3000ms
   - Error: 3000-4000ms

## 📚 Dependencies

- React hooks (useState, useEffect, useCallback)
- Font Awesome icons
- Custom CSS animations

## 🎓 Learn More

- [React Hooks](https://react.dev/reference/react)
- [Toast UI Pattern](https://uxdesign.cc/toast-notification-pattern-9b3e7f3b6f7e)
- [Font Awesome Icons](https://fontawesome.com/icons)
