import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AccountSidebar from "components/account/AccountSidebar";
import ProfileCard from "components/account/ProfileCard";
import AccountInfoCard from "components/account/AccountInfoCard";
import SecurityCard from "components/account/SecurityCard";
import useAuth from "hooks/useAuth";
import userService from "services/user.service";
import { BarSpinner } from "components/common/LoadingState";
import ContinueWatchingSection from "components/account/ContinueWatchingSection";

const DEFAULT_TAB = "profile";

const TAB_TITLES = {
  profile: "Quản lý Tài khoản",
  favorites: "Danh sách Yêu thích",
  watchlist: "Danh sách của bạn",
  notifications: "Thông báo",
  "continue-watching": "Xem tiếp của bạn",
};

const AccountPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading, updateUser, logout } = useAuth();
  const searchParams = new URLSearchParams(location.search);
  const queryTab = searchParams.get("tabs");
  const activeTab = queryTab || DEFAULT_TAB;

  useEffect(() => {
    // Redirect if not authenticated
    if (!isLoading && !user) {
      navigate("/");
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    // Khi vào /account mà chưa có query tabs thì redirect sang tab mặc định
    if (location.pathname === "/account" && !queryTab) {
      navigate(`/account?tabs=${DEFAULT_TAB}`, { replace: true });
    }
  }, [location.pathname, queryTab, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleUpdateProfile = async (updatedData) => {
    try {
      console.log("updatedData", updatedData);
      const updatedUser = await userService.updateProfile(updatedData);
      console.log("updatedUser", updatedUser);
      updateUser(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      // Fallback: update local state only
      const updatedUser = { ...user, ...updatedData };
      updateUser(updatedUser);
    }
  };

  if (isLoading || !user) {
    return <BarSpinner />;
  }

  const isContinueWatchingPage = activeTab === "continue-watching";

  const renderMainContent = () => {
    if (isContinueWatchingPage) {
      return <ContinueWatchingSection user={user} />;
    }

    return (
      <>
        <ProfileCard user={user} onUpdate={handleUpdateProfile} />
        <AccountInfoCard user={user} onUpdate={handleUpdateProfile} />
        <SecurityCard user={user} onUpdate={handleUpdateProfile} />
      </>
    );
  };

  const pageTitle = TAB_TITLES[activeTab] || TAB_TITLES[DEFAULT_TAB];

  return (
    <div className="min-h-screen bg-account-bg-primary text-account-text-primary">
      <div className="flex flex-col py-[50px] md:flex-row min-h-screen mx-auto">
        <AccountSidebar user={user} onLogout={handleLogout} />

        <main className="flex-1 p-5 md:mt-[40px] md:p-10 md:pt-2 box-border">
          <h1 className="text-3xl font-bold mb-8">{pageTitle}</h1>
          {renderMainContent()}
        </main>
      </div>
    </div>
  );
};

export default AccountPage;
