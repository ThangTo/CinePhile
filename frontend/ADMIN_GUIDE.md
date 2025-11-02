# Hướng Dẫn Trang Admin Dashboard

## 🎯 Tổng Quan

Trang admin dashboard cho phép quản trị viên quản lý nội dung và người dùng của CinePhile.

## 📁 Cấu Trúc Files

```
src/
├── pages/
│   └── AdminDashboard.jsx          # Trang dashboard chính
├── components/
│   └── admin/
│       ├── AdminSidebar.jsx        # Sidebar điều hướng
│       ├── StatCard.jsx            # Thẻ thống kê
│       ├── MovieTable.jsx          # Bảng quản lý phim
│       └── UserTable.jsx           # Bảng quản lý user
```

## 🚀 Truy Cập Dashboard

URL: `http://localhost:3000/admin`

## 🔧 Các Tính Năng Đã Implement

### 1. **Layout Chính**
- ✅ Sidebar thu gọn/mở rộng
- ✅ Top bar với thông báo và nút về trang chủ
- ✅ Responsive trên mobile/desktop

### 2. **Trang Tổng Quan (Overview)**
- ✅ 4 thẻ thống kê: Tổng Phim, Người Dùng, Lượt Xem, Online
- ✅ Trend indicator (tăng/giảm %)
- ✅ Placeholder cho biểu đồ (Chart.js sẽ implement sau)

### 3. **Quản Lý Phim (Movies)**
- ✅ Bảng danh sách phim với poster
- ✅ Tìm kiếm theo tên
- ✅ Chức năng Sửa/Xóa
- ✅ Nút "Thêm Phim"
- ✅ Phân trang

### 4. **Quản Lý Người Dùng (Users)**
- ✅ Bảng danh sách user
- ✅ Avatar tự sinh từ chữ cái đầu
- ✅ Phân biệt role (Admin/User)
- ✅ Toggle trạng thái Hoạt động/Vô hiệu
- ✅ Chức năng Sửa/Xóa
- ✅ Tìm kiếm theo tên/email

### 5. **Sidebar Menu**
- ✅ Tổng Quan
- ✅ Phim
- ✅ Người Dùng
- ⏳ Bình Luận (chưa implement)
- ⏳ Cài Đặt (chưa implement)
- ✅ Đăng Xuất

## 📝 Cách Sử Dụng

### Thêm Phim Mới
```jsx
// Trong MovieTable.jsx
<button onClick={handleAddMovie}>
  <i className="fa-solid fa-plus mr-2"></i>
  Thêm Phim
</button>
```
→ Sẽ cần tạo Modal/Form để nhập thông tin phim

### Xóa Phim
```jsx
const handleDelete = (id) => {
  if (window.confirm("Bạn có chắc muốn xóa phim này?")) {
    setMovies(movies.filter((m) => m.id !== id));
  }
};
```

### Toggle Trạng Thái User
```jsx
const toggleStatus = (id) => {
  setUsers(
    users.map((u) =>
      u.id === id
        ? { ...u, status: u.status === "active" ? "inactive" : "active" }
        : u
    )
  );
};
```

## 🔐 Phân Quyền (Chưa Implement)

### Tạo Protected Route
```jsx
// src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/" />;
  }
  
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" />;
  }
  
  return children;
};

export default ProtectedRoute;
```

### Sử dụng trong App.js
```jsx
<Route 
  path="/admin" 
  element={
    <ProtectedRoute requiredRole="admin">
      <AdminDashboard />
    </ProtectedRoute>
  } 
/>
```

## 🎨 Tùy Chỉnh Theme

### Màu Sắc Chính
```jsx
// StatCard colors
const COLORS = {
  blue: "from-blue-500 to-cyan-500",
  green: "from-green-500 to-emerald-500",
  purple: "from-purple-500 to-pink-500",
  yellow: "from-yellow-500 to-orange-500",
};
```

### CSS Classes
```jsx
// Sidebar menu item active
"bg-primaryColor text-black font-semibold"

// Table row hover
"hover:bg-white/5 transition-colors"
```

## 📊 Tích Hợp API (Bước Tiếp Theo)

### 1. Thay Mock Data bằng API
```jsx
// Thay vì
const [movies, setMovies] = useState(mockTop10Movies);

// Dùng
useEffect(() => {
  const fetchMovies = async () => {
    const data = await api.get('/admin/movies');
    setMovies(data);
  };
  fetchMovies();
}, []);
```

### 2. CRUD Operations
```jsx
// Create
const handleAddMovie = async (movieData) => {
  await api.post('/admin/movies', movieData);
  // Refresh list
};

// Update
const handleEditMovie = async (id, movieData) => {
  await api.put(`/admin/movies/${id}`, movieData);
};

// Delete
const handleDelete = async (id) => {
  await api.delete(`/admin/movies/${id}`);
};
```

## 📈 Tích Hợp Biểu Đồ

### Cài đặt Chart.js
```bash
npm install chart.js react-chartjs-2
```

### Sử dụng
```jsx
import { Line, Pie } from 'react-chartjs-2';

<Line data={viewsData} options={chartOptions} />
<Pie data={genreData} options={chartOptions} />
```

## 🚧 TODO List

- [ ] Tích hợp API thật
- [ ] Thêm Modal tạo/sửa phim
- [ ] Thêm Modal tạo/sửa user
- [ ] Implement trang Bình Luận
- [ ] Implement trang Cài Đặt
- [ ] Thêm biểu đồ thống kê (Chart.js)
- [ ] Upload ảnh poster/avatar
- [ ] Export báo cáo (CSV/PDF)
- [ ] Dark/Light mode toggle
- [ ] Notifications system
- [ ] Activity logs
- [ ] Phân quyền chi tiết (RBAC)

## 🎯 Best Practices

1. **Validation**: Luôn validate dữ liệu trước khi gửi lên server
2. **Confirmation**: Xác nhận với user trước khi xóa
3. **Loading States**: Hiển thị spinner khi đang fetch data
4. **Error Handling**: Bắt lỗi và hiển thị thông báo rõ ràng
5. **Pagination**: Phân trang cho danh sách lớn
6. **Search/Filter**: Tìm kiếm và lọc client-side cho UX tốt hơn

## 📞 Hỗ Trợ

Nếu cần thêm chức năng hoặc tùy chỉnh, hãy mở rộng các component hiện có hoặc tạo component mới trong `components/admin/`.

