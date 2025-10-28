# useAuth Hook

Custom React hook để quản lý trạng thái authentication và modal đăng nhập/đăng ký.

## Mục đích

Hook này được tạo ra để:

- **Tập trung hóa** logic authentication trong toàn bộ ứng dụng
- **Tái sử dụng** trạng thái user và modal authentication ở bất kỳ component nào
- **Đơn giản hóa** việc kiểm tra đăng nhập và mở modal auth
- **Linh hoạt** cho phép mở modal ở chế độ login hoặc register

## API

### Return Values

```javascript
const {
  user, // Object | null - Thông tin user hiện tại
  isAuthenticated, // boolean - True nếu user đã đăng nhập
  showAuthModal, // boolean - Trạng thái hiển thị modal
  authMode, // "login" | "register" - Chế độ modal
  openAuthModal, // Function(mode) - Mở modal
  closeAuthModal, // Function - Đóng modal
  logout, // Function - Đăng xuất
} = useAuth();
```

### Methods

#### `openAuthModal(mode)`

Mở modal authentication

- **mode**: `"login"` hoặc `"register"` (default: `"login"`)

```javascript
openAuthModal("login"); // Mở modal đăng nhập
openAuthModal("register"); // Mở modal đăng ký
```

#### `closeAuthModal()`

Đóng modal authentication

#### `logout()`

Đăng xuất user (xóa token và reload trang)

## Sử dụng

### 1. Import hook và AuthModal

```javascript
import useAuth from "../../hooks/useAuth";
import AuthModal from "../auth/AuthModal";
```

### 2. Sử dụng trong component

```javascript
const MyComponent = () => {
  const { isAuthenticated, openAuthModal, showAuthModal, authMode, closeAuthModal } = useAuth();

  const handleAction = () => {
    if (!isAuthenticated) {
      openAuthModal("login");
      return;
    }
    // Thực hiện action khi đã đăng nhập
  };

  return (
    <>
      {isAuthenticated ? (
        <p>Đã đăng nhập</p>
      ) : (
        <button onClick={() => openAuthModal("login")}>Đăng nhập</button>
      )}

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={closeAuthModal} initialMode={authMode} />
    </>
  );
};
```

### 3. Ví dụ với link "đăng nhập" trong text

```javascript
<p className="text-sm text-gray-400">
  Vui lòng{" "}
  <button
    onClick={() => openAuthModal("login")}
    className="text-primaryColor font-medium hover:underline"
  >
    đăng nhập
  </button>{" "}
  để tham gia bình luận.
</p>
```

### 4. Kiểm tra authentication trước khi thực hiện action

```javascript
const handleLike = (commentId) => {
  if (!isAuthenticated) {
    openAuthModal("login");
    return;
  }
  // Thực hiện like
};

const handleComment = () => {
  if (!isAuthenticated) {
    openAuthModal("login");
    return;
  }
  // Submit comment
};
```

## Components đang sử dụng

- `Header.jsx` - Quản lý đăng nhập/đăng xuất trong header
- `CommentsSection.jsx` - Yêu cầu đăng nhập trước khi comment/like/reply
- Các component khác có thể dễ dàng tích hợp

## Lưu ý

1. **AuthModal component**: Phải được render trong component sử dụng hook
2. **localStorage**: User data được lưu trong localStorage với key `"token"` và `"user"`
3. **Auto reload**: Sau khi logout, trang sẽ tự động reload
4. **Single instance**: Mỗi component sử dụng hook sẽ có instance riêng, nhưng user data được đồng bộ từ localStorage

## Lợi ích

✅ **Tái sử dụng cao**: Sử dụng ở bất kỳ component nào cần authentication
✅ **DRY principle**: Không cần duplicate logic authentication
✅ **Maintainability**: Dễ maintain và update logic authentication
✅ **Flexibility**: Dễ dàng mở rộng thêm chức năng
✅ **Consistency**: Đảm bảo UI/UX authentication nhất quán toàn app
