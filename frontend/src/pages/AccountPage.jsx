import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import SiteFooter from "../components/SiteFooter";
import AccountSidebar from "../components/account/AccountSidebar";
import ProfileCard from "../components/account/ProfileCard";
import AccountInfoCard from "../components/account/AccountInfoCard";
import SecurityCard from "../components/account/SecurityCard";
import authService from "../services/auth.service";
import userService from "../services/user.service";

const AccountPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        // Check if user is authenticated
        if (!authService.isAuthenticated()) {
          navigate("/");
          return;
        }

        // Try to get user from API first
        try {
          const currentUser = await authService.getCurrentUser();
          const userData = currentUser?.data || currentUser;
          if (userData) {
            setUser(userData);
          } else {
            // Fallback to local storage
            const cachedUser = authService.getCurrentUserLocal();
            if (cachedUser) {
              setUser(cachedUser);
            } else {
              navigate("/");
            }
          }
        } catch (error) {
          // If API fails, use cached data
          const cachedUser = authService.getCurrentUserLocal();
          if (cachedUser) {
            setUser(cachedUser);
          } else {
            navigate("/");
          }
        }
      } catch (error) {
        console.error("Error loading user:", error);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      authService.clearAuthData();
      navigate("/");
    }
  };

  const handleUpdateProfile = async (updatedData) => {
    if (!user?.id) return;

    try {
      // Update via API
      const updatedUser = await userService.updateProfile(user.id, updatedData);
      setUser(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      // Fallback: update local state only
      const updatedUser = { ...user, ...updatedData };
      setUser(updatedUser);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-account-bg-primary">
        <div className="w-12 h-12 border-4 border-account-bg-tertiary border-t-account-accent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div className="flex flex-col py-[50px] md:flex-row min-h-screen bg-account-bg-primary text-account-text-primary">
        <AccountSidebar user={user} onLogout={handleLogout} />

        <main className="flex-1 p-5 md:mt-[40px] md:p-10 md:pt-2 overflow-y-auto md:max-h-screen box-border">
          <h1 className="text-3xl font-bold mb-8 text-account-text-primary">Quản lý Tài khoản</h1>

          <ProfileCard user={user} onUpdate={handleUpdateProfile} />

          <AccountInfoCard user={user} onUpdate={handleUpdateProfile} />

          <SecurityCard user={user} onUpdate={handleUpdateProfile} />
        </main>
      </div>
      <SiteFooter />
    </div>
  );
};

export default AccountPage;
