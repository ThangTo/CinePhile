import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import MovieDetail from "./pages/MovieDetail";
import WatchPage from "./pages/WatchPage";
import AccountPage from "./pages/AccountPage";
import GenrePage from "./pages/GenrePage";
import CountryPage from "./pages/CountryPage";
import APITestExample from "./components/examples/APITestExample";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from "./components/general/ProtectedRoute";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/genre/:slug" element={<GenrePage />} />
        <Route path="/movie/:id" element={<MovieDetail />} />
        <Route path="/country/:slug" element={<CountryPage />} />
        <Route path="/watch/:id" element={<WatchPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/favorites" element={<AccountPage />} />
        <Route path="/watchlist" element={<AccountPage />} />
        <Route path="/continue-watching" element={<AccountPage />} />
        <Route path="/notifications" element={<AccountPage />} />
        <Route path="/api-test" element={<APITestExample />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
