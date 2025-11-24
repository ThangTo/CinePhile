import React, { createContext, useContext, useState, useEffect } from "react";
import authService from "services/auth.service";
import AuthModal from "components/auth/AuthModal";

/**
 * AuthContext - Provides authentication state and methods throughout the app
 */
const AuthContext = createContext(null);

/**
 * AuthProvider - Wraps the app and provides auth context
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // "login" or "register"

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      setIsLoading(true);
      try {
        const cachedUserData = authService.getCurrentUserLocal();
        if (cachedUserData) {
          setUser(cachedUserData);
        }

        const currentUser = await authService.getCurrentUser();
        const userDataFromAPI = currentUser?.data || currentUser;

        if (userDataFromAPI) {
          setUser(userDataFromAPI);
          authService.setAuthData(null, userDataFromAPI);
        } else {
          authService.clearAuthData();
          setUser(null);
        }
      } catch (error) {
        authService.clearAuthData();
        setUser(null);
        if (error?.status && error.status !== 401) {
          console.error("Unexpected error in loadUser:", error);
        }
      } finally {
        setIsLoading(false);
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
   * Handle login
   */
  const login = async (credentials) => {
    try {
      const data = await authService.login(credentials);
      const userData = data?.user || data;
      if (userData) {
        setUser(userData);
        closeAuthModal();
      }
      return data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  /**
   * Handle register
   */
  const register = async (userData) => {
    try {
      const data = await authService.register(userData);
      const userDataFromResponse = data?.user || data;
      if (userDataFromResponse) {
        setUser(userDataFromResponse);
        closeAuthModal();
      }
      return data;
    } catch (error) {
      console.error("Register error:", error);
      throw error;
    }
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
    }
  };

  /**
   * Update user data
   */
  const updateUser = (userData) => {
    setUser(userData);
    authService.setAuthData(null, userData);
  };

  /**
   * Force refresh user from API
   */
  const refetchCurrentUser = async () => {
    const data = await authService.getCurrentUser();
    const userData = data?.data || data;
    if (userData) {
      setUser(userData);
      authService.setAuthData(null, userData);
      return userData;
    }
    throw new Error("Unable to fetch user");
  };

  /**
   * Check if user is authenticated
   */
  const isAuthenticated = !!user;

  const value = {
    user,
    isLoading,
    isAuthenticated,
    showAuthModal,
    authMode,
    openAuthModal,
    closeAuthModal,
    login,
    register,
    logout,
    updateUser,
    getCurrentUser: refetchCurrentUser,
    setUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthModal isOpen={showAuthModal} onClose={closeAuthModal} initialMode={authMode} />
    </AuthContext.Provider>
  );
};

/**
 * useAuth hook - Access auth context
 * @returns {Object} Auth context value
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
