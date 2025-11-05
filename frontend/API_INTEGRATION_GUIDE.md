# Hướng Dẫn Tích Hợp API Frontend-Backend

Hướng dẫn chi tiết cách thay thế mock data bằng API thật từ backend.

## 📋 Mục Lục

1. [Chuẩn Bị](#chuẩn-bị)
2. [Cấu Hình Environment](#cấu-hình-environment)
3. [Tích Hợp Từng Component](#tích-hợp-từng-component)
4. [Xử Lý Loading & Error States](#xử-lý-loading--error-states)
5. [Best Practices](#best-practices)

---

## 🚀 Chuẩn Bị

### Bước 1: Đảm Bảo Backend Đang Chạy

```bash
cd backend
npm start
```

Backend sẽ chạy tại: `http://localhost:5000`

### Bước 2: Test API Connection

Tạo file test để kiểm tra kết nối:

```javascript
// frontend/src/utils/testAPI.js
import api from "../services/api";

export const testConnection = async () => {
  try {
    const health = await api.health();
    console.log("✅ Backend connected:", health);

    const movies = await api.movies.getAll({ limit: 5 });
    console.log("✅ Movies fetched:", movies);

    return true;
  } catch (error) {
    console.error("❌ API connection failed:", error);
    return false;
  }
};
```

Sử dụng trong component hoặc console:

```javascript
import { testConnection } from "../utils/testAPI";

// Test khi app load
testConnection();
```

---

## ⚙️ Cấu Hình Environment

### Tạo File `.env` trong `frontend/`

```bash
REACT_APP_API_URL=http://localhost:5000/api/v1
```

### Hoặc thiết lập mặc định trong `api.js`

File đã được cấu hình sẵn với:

```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api/v1";
```

---

## 🔄 Tích Hợp Từng Component

### 1. WatchPage.jsx ✅ (Đã Hoàn Thành)

**Trước (Mock Data):**

```javascript
import { fetchMovieById, fetchEpisodes } from "../services/api";

const [m, eps] = await Promise.all([fetchMovieById(id), fetchEpisodes(id)]);
```

**Sau (API Real):**

```javascript
import api from "../services/api";

const [movieRes, episodesRes] = await Promise.all([
  api.movies.getById(id),
  api.movies.getEpisodes(id),
]);

setMovie(movieRes.data);
setEpisodes(episodesRes.data);
```

**Hoặc giữ nguyên (đã có helper functions):**

```javascript
import { fetchMovieById, fetchEpisodes } from "../services/api";

const [m, eps] = await Promise.all([fetchMovieById(id), fetchEpisodes(id)]);
// Helper functions tự động extract response.data
```

---

### 2. HomePage.jsx - Banner & Sections

**File hiện tại:**

```javascript
// HomePage.jsx
import Banner from "../components/BannerHome";
import SectionRow from "../components/SectionRow";
import Top10Movie from "../components/Top10Movie";
```

**Cần update các components con:**

#### a) BannerHome.jsx

**Trước:**

```javascript
import { defaultBannerMovie } from "../data/mockData";

const BannerHome = () => {
  const movie = defaultBannerMovie;
  // ...
};
```

**Sau:**

```javascript
import { useState, useEffect } from "react";
import api from "../services/api";
import LoadingState from "../components/common/LoadingState";
import ErrorState from "../components/common/ErrorState";

const BannerHome = () => {
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBannerMovie = async () => {
      try {
        setLoading(true);
        // Lấy trending đầu tiên hoặc top rated
        const response = await api.movies.getTrending(1);
        if (response.data && response.data.length > 0) {
          setMovie(response.data[0]);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBannerMovie();
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!movie) return null;

  // Render với movie từ API
  return (
    // ... existing JSX
  );
};
```

#### b) SectionRow.jsx

**Trước:**

```javascript
import { mockSectionMovies } from "../data/mockData";

const movies = mockSectionMovies[sectionType] || [];
```

**Sau:**

```javascript
import { useState, useEffect } from "react";
import api from "../services/api";

const SectionRow = ({ title, sectionType, linkHref }) => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        setLoading(true);
        let response;

        switch (sectionType) {
          case "trending":
            response = await api.movies.getTrending(20);
            break;
          case "newReleases":
            response = await api.movies.getNewReleases(20);
            break;
          case "topRated":
            response = await api.movies.getTopRated(20);
            break;
          default:
            response = await api.movies.getAll({ limit: 20 });
        }

        setMovies(response.data || []);
      } catch (error) {
        console.error(`Error fetching ${sectionType}:`, error);
        setMovies([]); // Fallback to empty array
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, [sectionType]);

  if (loading) {
    return <div className="py-8">Đang tải...</div>;
  }

  if (movies.length === 0) {
    return null; // Hoặc hiển thị empty state
  }

  return (
    // ... existing JSX với movies từ API
  );
};
```

#### c) Top10Movie.jsx

**Trước:**

```javascript
import { mockTop10Movies } from "../data/mockData";
const movies = mockTop10Movies;
```

**Sau:**

```javascript
import { useState, useEffect } from "react";
import api from "../services/api";

const Top10Movie = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTop10 = async () => {
      try {
        setLoading(true);
        const response = await api.movies.getTopRated(10);
        setMovies(response.data || []);
      } catch (error) {
        console.error("Error fetching top 10:", error);
        setMovies([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTop10();
  }, []);

  if (loading) return <div>Đang tải Top 10...</div>;
  if (movies.length === 0) return null;

  return (
    // ... existing JSX
  );
};
```

---

### 3. MovieDetail.jsx

**File hiện tại đang dùng `useMovieDetail` hook:**

**Trước:**

```javascript
// hooks/useMovieDetail.js
import { getMovieDetail } from "../data/mockData";

const movie = getMovieDetail(id);
```

**Sau:**

```javascript
// hooks/useMovieDetail.js
import { useState, useEffect } from "react";
import api from "../services/api";

export const useMovieDetail = (id) => {
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMovie = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.movies.getById(id);
        setMovie(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchMovie();
    }
  }, [id]);

  return { movie, loading, error };
};
```

**Update trong MovieDetail.jsx:**

```javascript
import { useMovieDetail } from "../hooks/useMovieDetail";

const MovieDetail = () => {
  const { id } = useParams();
  const { movie, loading, error } = useMovieDetail(id);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!movie) return <ErrorState message="Không tìm thấy phim" />;

  // ... existing JSX
};
```

---

### 4. CommentsSection.jsx

**Lấy comments từ API:**

```javascript
import { useState, useEffect } from "react";
import api from "../services/api";

const CommentsSection = ({ movie }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        setLoading(true);
        const response = await api.movies.getComments(movie.id, {
          page: 1,
          limit: 10,
          sort: "newest",
        });
        setComments(response.data || []);
      } catch (error) {
        console.error("Error fetching comments:", error);
        setComments([]);
      } finally {
        setLoading(false);
      }
    };

    if (movie?.id) {
      fetchComments();
    }
  }, [movie?.id]);

  // ... existing JSX
};
```

**Post comment:**

```javascript
const handlePostComment = async (commentData) => {
  try {
    await api.movies.postComment(movie.id, {
      content: commentData.content,
      rating: commentData.rating,
      episode: commentData.episode,
      isSpoiler: commentData.isSpoiler,
    });

    // Refresh comments
    const response = await api.movies.getComments(movie.id);
    setComments(response.data);
  } catch (error) {
    console.error("Error posting comment:", error);
    // Show error toast
  }
};
```

---

## ⏳ Xử Lý Loading & Error States

### Tạo Reusable Components

#### LoadingState.jsx

```javascript
// frontend/src/components/common/LoadingState.jsx
const LoadingState = ({ message = "Đang tải..." }) => {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primaryColor mx-auto mb-4"></div>
        <p className="text-gray-400">{message}</p>
      </div>
    </div>
  );
};
```

#### ErrorState.jsx

```javascript
// frontend/src/components/common/ErrorState.jsx
const ErrorState = ({ message = "Có lỗi xảy ra", onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <p className="text-red-400 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-primaryColor rounded hover:bg-primaryColor/80"
        >
          Thử lại
        </button>
      )}
    </div>
  );
};
```

### Pattern Chung

```javascript
const MyComponent = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.movies.getById(id);
        setData(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  return (
    // Render với data
  );
};
```

---

## ✅ Best Practices

### 1. Error Handling

```javascript
try {
  const response = await api.movies.getById(id);
  setMovie(response.data);
} catch (error) {
  // Log for debugging
  console.error("Error:", error);

  // Show user-friendly message
  setError("Không thể tải thông tin phim. Vui lòng thử lại sau.");

  // Optional: Send to error tracking service
  // Sentry.captureException(error);
}
```

### 2. Retry Logic (Optional)

```javascript
const fetchWithRetry = async (fn, retries = 3) => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return fetchWithRetry(fn, retries - 1);
    }
    throw error;
  }
};

// Usage
const response = await fetchWithRetry(() => api.movies.getById(id));
```

### 3. Caching (Future Enhancement)

```javascript
// Simple cache with localStorage
const getCachedOrFetch = async (key, fetchFn, ttl = 5 * 60 * 1000) => {
  const cached = localStorage.getItem(key);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < ttl) {
      return data;
    }
  }

  const response = await fetchFn();
  localStorage.setItem(
    key,
    JSON.stringify({
      data: response.data,
      timestamp: Date.now(),
    })
  );

  return response.data;
};

// Usage
const movie = await getCachedOrFetch(`movie-${id}`, () => api.movies.getById(id));
```

### 4. AbortController (Cancel Requests)

```javascript
useEffect(() => {
  const abortController = new AbortController();

  const fetchData = async () => {
    try {
      // Note: api.js cần support AbortSignal
      const response = await api.movies.getById(id, {
        signal: abortController.signal,
      });
      setMovie(response.data);
    } catch (error) {
      if (error.name !== "AbortError") {
        setError(error.message);
      }
    }
  };

  fetchData();

  return () => {
    abortController.abort(); // Cancel on unmount
  };
}, [id]);
```

---

## 📝 Checklist Migration

- [ ] **Bước 1**: Test kết nối backend (`api.health()`)
- [ ] **Bước 2**: Update `WatchPage.jsx` ✅
- [ ] **Bước 3**: Update `BannerHome.jsx`
- [ ] **Bước 4**: Update `SectionRow.jsx`
- [ ] **Bước 5**: Update `Top10Movie.jsx`
- [ ] **Bước 6**: Update `useMovieDetail.js` hook
- [ ] **Bước 7**: Update `CommentsSection.jsx`
- [ ] **Bước 8**: Update `MovieDetail.jsx` (nếu có)
- [ ] **Bước 9**: Test tất cả các tính năng
- [ ] **Bước 10**: Xử lý error cases
- [ ] **Bước 11**: Thêm loading states
- [ ] **Bước 12**: Remove unused mock data imports

---

## 🐛 Troubleshooting

### Lỗi CORS

**Error**: `Access to fetch has been blocked by CORS policy`

**Fix**: Đảm bảo backend config CORS đúng:

```javascript
// backend/config/config.js
cors: {
  origin: "http://localhost:3000",
  credentials: true,
}
```

### Lỗi Network

**Error**: `Failed to fetch` hoặc `Network request failed`

**Fix**:

1. Kiểm tra backend đang chạy: `curl http://localhost:5000/api/v1/health`
2. Kiểm tra `REACT_APP_API_URL` trong `.env`
3. Kiểm tra firewall/antivirus

### Lỗi 404

**Error**: `404 Not Found`

**Fix**: Kiểm tra endpoint path trong `api.js` khớp với backend routes

### Data Structure Mismatch

**Error**: Component không render vì data structure khác với mock

**Fix**:

1. Log response để xem structure: `console.log(response)`
2. Điều chỉnh mapping hoặc update backend response format
3. Có thể cần transform data:

```javascript
const transformMovie = (apiMovie) => ({
  id: apiMovie.id,
  title: apiMovie.title,
  poster: apiMovie.poster_url || apiMovie.poster,
  // Map các fields khác...
});
```

---

## 🎯 Next Steps

1. **Authentication**: Implement login/register flow với `api.auth`
2. **User Actions**: Implement favorites, watchlist với `api.users`
3. **Real-time Updates**: WebSocket cho comments (optional)
4. **Optimization**: Implement caching, pagination
5. **Testing**: Unit tests cho API calls

---

**Chúc bạn tích hợp thành công!** 🚀

Nếu gặp vấn đề, check console logs và network tab trong DevTools.
