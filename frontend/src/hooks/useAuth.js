import { useState, useEffect } from "react";

/**
 * Custom hook to manage authentication state and modal
 * @returns {Object} Authentication state and handlers
 */
const useAuth = () => {
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // "login" or "register"

  // Check if user is logged in on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error("Error parsing user data:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
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
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    window.location.reload();
  };

  /**
   * Check if user is authenticated
   */
  const isAuthenticated = !!user;

  return {
    user,
    isAuthenticated,
    showAuthModal,
    authMode,
    openAuthModal,
    closeAuthModal,
    logout,
  };
};

export default useAuth;
