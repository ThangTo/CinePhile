import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "contexts/AuthContext";
import { NotificationProvider } from "contexts/NotificationContext";
import HomePage from "./pages/HomePage";
import MovieDetail from "./pages/MovieDetail";
import WatchPage from "./pages/WatchPage";
import AccountPage from "./pages/AccountPage";
import GenrePage from "./pages/GenrePage";
import CountryPage from "./pages/CountryPage";
import SearchResults from "./pages/SearchResults";
import MovieTypePage from "./pages/MovieTypePage";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from "./components/general/ProtectedRoute";
import MainLayout from "layouts/MainLayout";
import NotFoundPage from "./pages/NotFound";
import GoogleAuthHandler from "pages/GoogleAuthHandler";
import DemoPage from "./pages/DemoPage";

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <Routes>
            <Route path="/auth/google/callback" element={<GoogleAuthHandler />} />
            {/* All routes use MainLayout (includes Header and Footer) */}
            <Route path="/" element={<MainLayout />}>
              <Route index element={<HomePage />} />
              <Route path="/genre/:slug" element={<GenrePage />} />
              <Route path="/movie/:id" element={<MovieDetail />} />
              <Route path="/country/:slug" element={<CountryPage />} />
              <Route path="/type/:slug" element={<MovieTypePage />} />
              <Route path="/search" element={<SearchResults />} />
              <Route path="/watch/:id" element={<WatchPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/demo" element={<DemoPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
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
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
