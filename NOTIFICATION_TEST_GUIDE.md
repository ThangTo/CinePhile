# Hướng Dẫn Test Notification System

## Tổng Quan

Hệ thống notification đã được tích hợp hoàn chỉnh với backend API. Tất cả mock data đã được xóa và hệ thống chỉ sử dụng API thật.

## Cấu Trúc

### Backend API Endpoints:
- `GET /api/v1/notifications` - Lấy danh sách thông báo
- `GET /api/v1/notifications/unread` - Lấy thông báo chưa đọc
- `GET /api/v1/notifications/unread/count` - Lấy số lượng chưa đọc
- `PUT /api/v1/notifications/:id/read` - Đánh dấu đã đọc
- `PUT /api/v1/notifications/read-all` - Đánh dấu tất cả đã đọc
- `DELETE /api/v1/notifications/:id` - Xóa thông báo
- `POST /api/v1/notifications` - Tạo thông báo (cho admin/testing)

### Frontend Components:
- `NotificationContext` - Quản lý state và API calls
- `NotificationPanel` - Panel dropdown khi click bell
- `NotificationItem` - Component hiển thị 1 thông báo
- `NotificationsTab` - Tab hiển thị tất cả thông báo

## Các Bước Test

### 1. Test Tạo Thông Báo (Backend)

#### Tạo thông báo hệ thống (cho tất cả user):
**Lưu ý**: Khi tạo thông báo system (không truyền userId), hệ thống sẽ tự động tạo một bản copy cho MỖI user trong hệ thống. Mỗi user sẽ có thông báo riêng của mình, có thể xóa độc lập.

```bash
POST http://localhost:5000/api/v1/notifications
Headers: Authorization: Bearer <admin_token>
Body:
{
  "title": "Phim mới ra mắt",
  "message": "Phim 'Avengers: Endgame' đã có sẵn để xem",
  "type": "movie_update",
  "movieId": "<movie_id>"
  // Không truyền userId = tạo cho TẤT CẢ users
}
```

**Response**: 
```json
{
  "message": "System notification created for 150 users",
  "count": 150
}
```

#### Tạo thông báo cho user cụ thể:
```bash
POST http://localhost:5000/api/v1/notifications
Headers: Authorization: Bearer <admin_token>
Body:
{
  "title": "Bình luận mới",
  "message": "Có người đã trả lời bình luận của bạn",
  "type": "comment_reply",
  "userId": "<user_id>"
}
```

### 2. Test Frontend - Load Notifications

1. **Đăng nhập vào hệ thống**
2. **Kiểm tra bell icon** ở header:
   - Badge số hiển thị số thông báo chưa đọc
   - Click vào bell → mở NotificationPanel
   - Panel hiển thị tối đa 5 thông báo chưa đọc

### 3. Test Mark as Read

1. **Click vào một thông báo**:
   - Thông báo được đánh dấu đã đọc (opacity giảm)
   - Nếu có `actionUrl` → navigate đến URL đó
   - Badge count giảm đi 1

2. **Click "Đánh dấu đã đọc"** trong panel:
   - Tất cả thông báo của user được đánh dấu đã đọc
   - Badge count = 0

### 4. Test Delete Notification

1. **Click nút "Xóa"** trên một thông báo:
   - Thông báo biến mất khỏi UI ngay lập tức (optimistic update)
   - Nếu lỗi → thông báo được thêm lại

**Lưu ý**: Chỉ có thể xóa thông báo của chính user, không thể xóa system notifications

### 5. Test Notifications Tab

1. **Navigate đến `/account?tabs=notifications`**
2. **Kiểm tra**:
   - Hiển thị tất cả thông báo (đã đọc + chưa đọc)
   - Có filter: Tất cả / Chưa đọc / Đã đọc
   - Có pagination
   - Có thể đánh dấu đã đọc và xóa

### 6. Test Auto Refresh

1. **Mở trang web và đăng nhập**
2. **Tạo thông báo mới từ backend** (dùng Postman hoặc script)
3. **Đợi tối đa 30 giây** → thông báo mới sẽ xuất hiện tự động

### 7. Test Badge Count Logic

1. **Click vào bell icon** → badge count = 0 (đã mark panel as viewed)
2. **Tạo thông báo mới** → badge count tăng lên
3. **Click lại bell** → badge count = 0

**Logic**: Badge chỉ hiển thị thông báo mới sau lần xem panel cuối cùng

## Test Script (Postman/Thunder Client)

### 1. Tạo System Notification:
```http
POST http://localhost:5000/api/v1/notifications
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Test Notification",
  "message": "Đây là thông báo test",
  "type": "system"
}
```

### 2. Tạo Movie Update Notification:
```http
POST http://localhost:5000/api/v1/notifications
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Phim mới cập nhật",
  "message": "Phim 'Test Movie' đã có tập mới",
  "type": "movie_update",
  "movieId": "<movie_id>"
}
```

### 3. Lấy Notifications:
```http
GET http://localhost:5000/api/v1/notifications?limit=100
Authorization: Bearer <token>
```

### 4. Đánh dấu đã đọc:
```http
PUT http://localhost:5000/api/v1/notifications/<notification_id>/read
Authorization: Bearer <token>
```

### 5. Đánh dấu tất cả đã đọc:
```http
PUT http://localhost:5000/api/v1/notifications/read-all
Authorization: Bearer <token>
```

### 6. Xóa thông báo:
```http
DELETE http://localhost:5000/api/v1/notifications/<notification_id>
Authorization: Bearer <token>
```

## Kiểm Tra Console

Mở Developer Tools → Console để xem:
- API calls và responses
- Errors nếu có
- Log messages từ NotificationContext

## Các Trường Hợp Edge Case Cần Test

1. **Không có thông báo**: Panel hiển thị "Không có thông báo mới"
2. **API lỗi**: Frontend xử lý gracefully, không crash
3. **Network timeout**: Optimistic update vẫn hoạt động
4. **Logout**: Notifications được clear
5. **Multiple tabs**: Mỗi tab có state riêng (có thể cải thiện sau với WebSocket)

## Troubleshooting

### Badge không hiển thị:
- Kiểm tra `lastViewedAt` trong localStorage
- Kiểm tra `unreadCount` trong console
- Kiểm tra API response có `unreadCount` không

### Thông báo không load:
- Kiểm tra authentication token
- Kiểm tra network tab trong DevTools
- Kiểm tra backend logs

### Thông báo không cập nhật:
- Kiểm tra polling interval (30 giây)
- Kiểm tra `isAuthenticated` state
- Kiểm tra API response format

## Notes

- **System notifications**: Khi tạo thông báo system (không truyền userId), hệ thống sẽ tạo một bản copy riêng cho MỖI user. Mỗi user có thể xóa/thao tác với thông báo của mình mà không ảnh hưởng đến user khác.
- **User notifications**: Thông báo cho user cụ thể (truyền userId) chỉ hiển thị cho user đó.
- **Xóa thông báo**: Mỗi user chỉ có thể xóa thông báo của chính mình.
- **Auto-refresh**: Mỗi 30 giây khi đã đăng nhập.







