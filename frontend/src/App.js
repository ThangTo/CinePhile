import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "contexts/AuthContext";
import { NotificationProvider } from "contexts/NotificationContext";
import { ThemeProvider } from "contexts/ThemeContext";
import { VoiceProvider } from "contexts/VoiceContext";
import ErrorBoundary from "components/common/ErrorBoundary";
import VoiceIndicator from "components/common/VoiceIndicator";
import TimiOnboarding from "components/common/TimiOnboarding";
import { initUserInteractionListener } from "utils/userInteraction";
import "styles/themes.css";
import HomePage from "./pages/HomePage";
import MovieDetail from "./pages/MovieDetail";
import WatchPage from "./pages/WatchPage";
import AccountPage from "./pages/AccountPage";
import GenrePage from "./pages/GenrePage";
import CountryPage from "./pages/CountryPage";
import SearchResults from "./pages/SearchResults";
import MovieTypePage from "./pages/MovieTypePage";
import BrowsePage from "./pages/BrowsePage";
import AdminDashboard from "./pages/AdminDashboard";
import PremiumPage from "./pages/PremiumPage";
import RechargeCoinPage from "./pages/RechargeCoinPage";
import CastDetailPage from "./pages/CastDetailPage";
import ProtectedRoute from "./components/general/ProtectedRoute";
import MainLayout from "layouts/MainLayout";
import NotFoundPage from "./pages/NotFound";
import GoogleAuthHandler from "pages/GoogleAuthHandler";
import GoogleAuthHandlerWrapper from "components/common/GoogleAuthHandlerWrapper";
import ScrollToTop from "components/common/ScrollToTop";

function App() {
  // Khởi tạo listener một lần cho toàn bộ app để phát hiện user interaction (click/keydown/touch)
  useEffect(() => {
    initUserInteractionListener();
  }, []);

  return (
    <ErrorBoundary>
      <VoiceProvider>
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              <Router>
                <ScrollToTop />
                <Routes>
                  <Route path="/auth/google/callback" element={<GoogleAuthHandler />} />
                  {/* Handle Google auth callback on homepage (when backend redirects to /?auth=google_success) */}
                  <Route
                    path="/"
                    element={
                      <GoogleAuthHandlerWrapper>
                        <MainLayout />
                      </GoogleAuthHandlerWrapper>
                    }
                  >
                    <Route index element={<HomePage />} />
                    <Route path="/genre/:slug" element={<GenrePage />} />
                    <Route path="/movie/:id" element={<MovieDetail />} />
                    <Route path="/cast/:id" element={<CastDetailPage />} />
                    <Route path="/country/:slug" element={<CountryPage />} />
                    <Route path="/type/:slug" element={<MovieTypePage />} />
                    <Route path="/search" element={<SearchResults />} />
                    <Route path="/filter" element={<BrowsePage />} />
                    <Route path="/watch/:id" element={<WatchPage />} />
                    <Route path="/account" element={<AccountPage />} />
                    <Route path="/premium" element={<PremiumPage />} />
                    <Route path="/recharge" element={<RechargeCoinPage />} />
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
              <VoiceIndicator />
              <TimiOnboarding />
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </VoiceProvider>
    </ErrorBoundary>
  );
}

export default App;
