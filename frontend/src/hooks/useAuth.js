import { useState, useEffect } from "react";
import authService from "services/auth.service";

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
      setIsLoading(true);
      try {
        const token = authService.getToken();
        const cachedUserData = authService.getCurrentUserLocal();

        if (token) {
          // Use cached data first for immediate UI update
          if (cachedUserData) {
            // Ensure role is preserved - explicitly check and set
            const userWithRole = {
              id: cachedUserData.id,
              name: cachedUserData.name || cachedUserData.username,
              email: cachedUserData.email,
              role: cachedUserData.role || "user", // Explicitly ensure role exists
              ...cachedUserData, // Spread other properties
            };

            // Force role to be set
            if (!userWithRole.role) {
              userWithRole.role = cachedUserData.role || "user";
            }

            // Re-save to ensure role is preserved
            authService.setAuthData(token, userWithRole, authService.getRefreshToken());

            setUser(userWithRole);
            setIsLoading(false); // Set loading false immediately if we have cached data

            // If user has admin role, skip API verification to avoid MSW issues
            // This is especially important for QuickAdminLogin
            if (userWithRole.role === "admin") {
              // Skip API call for admin users to preserve their role
              console.log("🔒 Skipping API verification for admin user");
              // Ensure we return early and don't continue to API call
              return; // This should exit the entire loadUser function
            }
          }

          // Verify token and get current user from API (in background)
          // Only for non-admin users or when no cached data
          // IMPORTANT: This code should NOT run for admin users
          if (!cachedUserData || (cachedUserData && cachedUserData.role !== "admin")) {
            try {
              const currentUser = await authService.getCurrentUser();
              const userDataFromAPI = currentUser?.data || currentUser;
              if (userDataFromAPI) {
                // Ensure role is preserved if it was in cached data
                const finalUser = {
                  ...userDataFromAPI,
                  role: userDataFromAPI.role || cachedUserData?.role || "user",
                };
                setUser(finalUser);
                // Update local storage with preserved role
                authService.setAuthData(token, finalUser, authService.getRefreshToken());
              }
            } catch (error) {
              // If API call fails but we have cached data, keep using it
              // This handles offline scenarios or MSW not running
              console.warn("Failed to verify token, using cached user data:", error);
              // If no cached data was available, clear auth
              if (!cachedUserData) {
                authService.clearAuthData();
                setUser(null);
              }
            }
          }
        } else {
          // No token - clear any legacy cached data
          if (cachedUserData) {
            authService.clearAuthData();
          }
          setUser(null);
        }
      } catch (error) {
        console.error("Unexpected error in loadUser:", error);
        setUser(null);
      } finally {
        setIsLoading(false); // Always set loading to false when done
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
   * Login function - Forwards to authService.login()
   * @deprecated Use authService.login() directly instead
   * This is kept for backward compatibility only
   */
  const login = async (credentials) => {
    // Only support credentials format (email + password)
    if (!credentials || !credentials.email || !credentials.password) {
      throw new Error(
        "Invalid credentials format. Use authService.login({ email, password }) instead."
      );
    }

    try {
      const data = await authService.login(credentials);
      // Reload to trigger useAuth to load the new user
      window.location.reload();
      return data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
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
