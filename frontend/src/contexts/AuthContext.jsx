import React, {
  Suspense,
  createContext,
  lazy,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import authService from "services/auth.service";
import { saveReturnLocation } from "lib/auth-storage";

const AuthContext = createContext(null);
const AuthModal = lazy(() => import("components/auth/AuthModal"));

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const manualAuthUpdateAtRef = useRef(0);

  useEffect(() => {
    const loadUser = async () => {
      const loadStartedAt = Date.now();
      setIsLoading(true);

      try {
        const currentUser = await authService.getCurrentUser();
        const userDataFromAPI = currentUser?.data || currentUser;

        if (userDataFromAPI) {
          setUser(userDataFromAPI);
          authService.setAuthData(null, userDataFromAPI);
        } else {
          authService.clearAuthData();
          setUser(null);
        }
      } catch (apiError) {
        const status = apiError?.status;

        if (manualAuthUpdateAtRef.current > loadStartedAt) {
          return;
        }

        if (status === 401) {
          console.warn("Auth expired (401 from server), clearing auth data");
          authService.clearAuthData();
        } else {
          console.warn(
            "Auth check failed, hiding authenticated UI until the next successful verification (status:",
            status,
            "):",
            apiError?.message
          );
        }

        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  useEffect(() => {
    let isChecking = false;

    const handleVisibilityChange = async () => {
      if (document.visibilityState !== "visible" || !user || isChecking) return;
      isChecking = true;

      try {
        const currentUser = await authService.getCurrentUser();
        const userData = currentUser?.data || currentUser;

        if (userData) {
          setUser(userData);
          authService.setAuthData(null, userData);
        } else {
          authService.clearAuthData();
          setUser(null);
        }
      } catch (error) {
        const status = error?.status;

        if (status === 401) {
          console.warn("Auth expired while inactive, logging out");
          authService.clearAuthData();
          setUser(null);
        }
      } finally {
        isChecking = false;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [user]);

  const openAuthModal = (mode = "login") => {
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    const isAuthPage =
      currentPath === "/auth/google/callback" || currentPath.startsWith("/auth/");

    if (!isAuthPage) {
      saveReturnLocation(currentPath, currentSearch, null);
    }

    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const closeAuthModal = () => {
    setShowAuthModal(false);
  };

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

  const requestRegistrationOTP = async (userData) => {
    return authService.requestRegistrationOTP(userData);
  };

  const forgotPassword = async (email) => {
    return authService.forgotPassword(email);
  };

  const verifyPasswordResetOTP = async (data) => {
    return authService.verifyPasswordResetOTP(data);
  };

  const resetPassword = async (resetData) => {
    return authService.resetPassword(resetData);
  };

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

  const updateUser = (userData) => {
    manualAuthUpdateAtRef.current = Date.now();
    setUser(userData);
    authService.setAuthData(null, userData);
  };

  const refetchCurrentUser = useCallback(async () => {
    const data = await authService.getCurrentUser();
    const userData = data?.data || data;

    if (userData) {
      manualAuthUpdateAtRef.current = Date.now();
      setUser(userData);
      authService.setAuthData(null, userData);
      return userData;
    }

    throw new Error("Unable to fetch user");
  }, []);

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
    requestRegistrationOTP,
    forgotPassword,
    verifyPasswordResetOTP,
    resetPassword,
    logout,
    updateUser,
    getCurrentUser: refetchCurrentUser,
    setUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {showAuthModal && (
        <Suspense fallback={null}>
          <AuthModal isOpen={showAuthModal} onClose={closeAuthModal} initialMode={authMode} />
        </Suspense>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
