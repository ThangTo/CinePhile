import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "contexts/AuthContext";
import { NotificationProvider } from "contexts/NotificationContext";
import { ThemeProvider } from "contexts/ThemeContext";
import { VoiceProvider, useVoice } from "contexts/VoiceContext";
import ErrorBoundary from "components/common/ErrorBoundary";
import { initUserInteractionListener } from "utils/userInteraction";
import "styles/themes.css";
import ProtectedRoute from "./components/general/ProtectedRoute";
import ScrollToTop from "components/common/ScrollToTop";

const HomePage = lazy(() => import("./pages/HomePage"));
const MovieDetail = lazy(() => import("./pages/MovieDetail"));
const WatchPage = lazy(() => import("./pages/WatchPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const GenrePage = lazy(() => import("./pages/GenrePage"));
const CountryPage = lazy(() => import("./pages/CountryPage"));
const SearchResults = lazy(() => import("./pages/SearchResults"));
const MovieTypePage = lazy(() => import("./pages/MovieTypePage"));
const BrowsePage = lazy(() => import("./pages/BrowsePage"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const PremiumPage = lazy(() => import("./pages/PremiumPage"));
const RechargeCoinPage = lazy(() => import("./pages/RechargeCoinPage"));
const CastDetailPage = lazy(() => import("./pages/CastDetailPage"));
const MainLayout = lazy(() => import("layouts/MainLayout"));
const NotFoundPage = lazy(() => import("./pages/NotFound"));
const GoogleAuthHandler = lazy(() => import("pages/GoogleAuthHandler"));
const GoogleAuthHandlerWrapper = lazy(() => import("components/common/GoogleAuthHandlerWrapper"));
const CursorEffects = lazy(() => import("components/common/CursorEffects"));
const VoiceIndicator = lazy(() => import("components/common/VoiceIndicator"));
const TimiOnboarding = lazy(() => import("components/common/TimiOnboarding"));

function RouteLoading() {
  return (
    <div className="min-h-dvh bg-[#0a0a0c] flex items-center justify-center">
      <div className="flex items-center justify-center gap-1.5 h-8" aria-label="Loading">
        <div className="w-1.5 h-6 bg-primaryColor rounded-full animate-bounce" />
        <div
          className="w-1.5 h-8 bg-primaryColor rounded-full animate-bounce"
          style={{ animationDelay: "-0.2s" }}
        />
        <div
          className="w-1.5 h-6 bg-primaryColor rounded-full animate-bounce"
          style={{ animationDelay: "-0.4s" }}
        />
      </div>
    </div>
  );
}

function CursorEffectsSlot({ activeEffectId }) {
  if (!activeEffectId || activeEffectId === "none") return null;

  return (
    <Suspense fallback={null}>
      <CursorEffects activeEffectId={activeEffectId} />
    </Suspense>
  );
}

function VoiceWidgets() {
  const { isEnabled, showOnboarding } = useVoice();

  if (!isEnabled && !showOnboarding) return null;

  return (
    <Suspense fallback={null}>
      {isEnabled && <VoiceIndicator />}
      {showOnboarding && <TimiOnboarding />}
    </Suspense>
  );
}

function AppInner() {
  const { user } = useAuth();

  return (
    <>
      <CursorEffectsSlot activeEffectId={user?.cursorEffectId || "none"} />
      <Router>
        <ScrollToTop />
        <Suspense fallback={<RouteLoading />}>
          <Routes>
            <Route path="/auth/google/callback" element={<GoogleAuthHandler />} />
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
        </Suspense>
      </Router>
      <VoiceWidgets />
    </>
  );
}

function App() {
  useEffect(() => {
    initUserInteractionListener();
  }, []);

  return (
    <ErrorBoundary>
      <VoiceProvider>
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              <AppInner />
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </VoiceProvider>
    </ErrorBoundary>
  );
}

export default App;
