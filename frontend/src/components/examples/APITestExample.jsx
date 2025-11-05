/**
 * APITestExample.jsx
 *
 * Component ví dụ để test API integration
 * Copy pattern này vào các components của bạn
 */

import { useState, useEffect } from "react";
import healthService from "services/health.service";
import movieService from "services/movie.service";

const APITestExample = () => {
  const [health, setHealth] = useState(null);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const testAPI = async () => {
      try {
        setLoading(true);
        setError(null);

        // Test 1: Health check
        const healthRes = await healthService.check();
        setHealth(healthRes);

        // Test 2: Get movies
        const moviesRes = await movieService.getAll({ limit: 5 });
        setMovies(moviesRes.data || []);
      } catch (err) {
        setError(err.message);
        console.error("API Test Error:", err);
      } finally {
        setLoading(false);
      }
    };

    testAPI();
  }, []);

  if (loading) {
    return (
      <div className="p-8 bg-gray-900 text-white rounded">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
        <p className="mt-4 text-center">Đang test API...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-red-900/20 border border-red-500 rounded text-white">
        <h3 className="text-xl font-bold mb-2">❌ API Error</h3>
        <p className="mb-4">{error}</p>
        <p className="text-sm text-gray-400">
          Đảm bảo backend đang chạy tại:{" "}
          {process.env.REACT_APP_API_URL || "http://localhost:5000/api/v1"}
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-900 text-white rounded space-y-4">
      <h2 className="text-2xl font-bold">✅ API Test Results</h2>

      {/* Health Check */}
      <div className="bg-green-900/20 p-4 rounded">
        <h3 className="font-semibold mb-2">Health Check:</h3>
        <pre className="text-xs overflow-auto">{JSON.stringify(health, null, 2)}</pre>
      </div>

      {/* Movies List */}
      <div className="bg-blue-900/20 p-4 rounded">
        <h3 className="font-semibold mb-2">Movies ({movies.length}):</h3>
        {movies.length > 0 ? (
          <ul className="space-y-2">
            {movies.map((movie) => (
              <li key={movie.id} className="text-sm">
                {movie.title || movie.name || `Movie ID: ${movie.id}`}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400">No movies found</p>
        )}
      </div>

      {/* API Info */}
      <div className="bg-gray-800 p-4 rounded text-sm">
        <p>
          <strong>API Base URL:</strong>{" "}
          {process.env.REACT_APP_API_URL || "http://localhost:5000/api/v1"}
        </p>
      </div>
    </div>
  );
};

export default APITestExample;

/**
 * Cách sử dụng:
 *
 * 1. Import vào App.jsx hoặc bất kỳ page nào:
 *    import APITestExample from "./components/examples/APITestExample";
 *
 * 2. Render component:
 *    <APITestExample />
 *
 * 3. Check console và UI để xem API hoạt động
 *
 * 4. Nếu thấy error, check:
 *    - Backend đang chạy?
 *    - CORS configured đúng?
 *    - API_URL trong .env đúng?
 */
