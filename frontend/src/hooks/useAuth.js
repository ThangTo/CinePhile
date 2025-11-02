import { useState, useEffect } from "react";

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
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    
    console.log("🔍 useAuth mount - checking localStorage:", { token, userData });
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        console.log("✅ User parsed successfully:", parsedUser);
        console.log("👤 User role:", parsedUser.role);
        setUser(parsedUser);
      } catch (error) {
        console.error("Error parsing user data:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    setIsLoading(false);
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
