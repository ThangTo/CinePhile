import { useLocation } from "react-router-dom";
import { useMemo } from "react";
import GoogleAuthHandler from "pages/GoogleAuthHandler";

/**
 * Wrapper component để handle Google auth callback trên route "/"
 * Nếu có params auth=google_success hoặc token trong URL, render GoogleAuthHandler
 * Ngược lại, render children (MainLayout)
 */
const GoogleAuthHandlerWrapper = ({ children }) => {
  const location = useLocation();

  // Memoize để tránh re-render không cần thiết
  const shouldRenderAuthHandler = useMemo(() => {
    const params = new URLSearchParams(location.search);

    // Chỉ check các params liên quan đến Google auth, bỏ qua timestamp
    const hasAuthParam =
      params.get("auth") === "google_success" || params.get("status") === "google_success";
    const hasToken = params.get("token") && params.get("refreshToken");
    const hasFailure = params.get("auth") === "google_failed" || params.get("status") === "failure";

    return hasAuthParam || hasToken || hasFailure;
  }, [location.search]);

  // Nếu có auth params hoặc token, render GoogleAuthHandler
  if (shouldRenderAuthHandler) {
    return <GoogleAuthHandler />;
  }

  // Ngược lại, render children (MainLayout)
  return children;
};

export default GoogleAuthHandlerWrapper;
