import { useLocation } from "react-router-dom";
import GoogleAuthHandler from "pages/GoogleAuthHandler";

/**
 * Wrapper component để handle Google auth callback trên route "/"
 * Nếu có params auth=google_success hoặc token trong URL, render GoogleAuthHandler
 * Ngược lại, render children (MainLayout)
 */
const GoogleAuthHandlerWrapper = ({ children }) => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  // Chỉ check các params liên quan đến Google auth, bỏ qua timestamp
  const hasAuthParam =
    params.get("auth") === "google_success" || params.get("status") === "google_success";
  const hasToken = params.get("token") && params.get("refreshToken");
  const hasFailure = params.get("auth") === "google_failed" || params.get("status") === "failure";

  // Nếu có auth params hoặc token (KHÔNG phải chỉ timestamp), render GoogleAuthHandler
  if (hasAuthParam || hasToken || hasFailure) {
    return <GoogleAuthHandler />;
  }

  // Ngược lại, render children (MainLayout)
  return children;
};

export default GoogleAuthHandlerWrapper;
