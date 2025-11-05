import { useState, useEffect } from "react";
import authService from "../services/auth.service";

/**
 * Custom hook to manage authentication state and modal
 * @returns {Object} Authentication state and handlers
 */
const useAuth = () => {
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // "login" or "register"
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is logged in on mount
  useEffect(() => {
    const loadUser = async () => {
      const token = authService.getToken();
      const cachedUserData = authService.getCurrentUserLocal();

      if (token) {
        try {
          // Use cached data first for immediate UI update
          if (cachedUserData) {
            setUser(cachedUserData);
          }

          // Verify token and get current user from API
          try {
            const currentUser = await authService.getCurrentUser();
            const userDataFromAPI = currentUser?.data || currentUser;
            if (userDataFromAPI) {
              setUser(userDataFromAPI);
              // Update local storage
              authService.setAuthData(token, userDataFromAPI, authService.getRefreshToken());
            }
          } catch (error) {
            // If API call fails but we have cached data, keep using it
            // This handles offline scenarios
            console.warn("Failed to verify token, using cached user data:", error);
          }
        } catch (error) {
          console.error("Error loading user:", error);
          authService.clearAuthData();
          setUser(null);
        }
      } else if (cachedUserData) {
        // Clear legacy user data if no token
        authService.clearAuthData();
      }
    };

    loadUser();
  }, []);

  /**
   * Open authentication modal
   * @param {string} mode - "login" or "register"
   */
  const openAuthModal = (mode = "login") => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  /**
   * Close authentication modal
   */
  const closeAuthModal = () => {
    setShowAuthModal(false);
  };

  /**
   * Handle logout
   */
  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      authService.clearAuthData();
      setUser(null);
      window.location.reload();
    }
  };

  /**
   * Check if user is authenticated
   */
  const isAuthenticated = !!user;

  /**
   * Login function (for testing admin access)
   */
  const login = (userData) => {
    localStorage.setItem("token", "mock-token");
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    showAuthModal,
    authMode,
    openAuthModal,
    closeAuthModal,
    logout,
    login,
    setUser,
  };
};

export default useAuth;
