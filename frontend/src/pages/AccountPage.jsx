import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AccountSidebar from "components/account/AccountSidebar";
import ProfileCard from "components/account/ProfileCard";
import AccountInfoCard from "components/account/AccountInfoCard";
import SecurityCard from "components/account/SecurityCard";
import useAuth from "hooks/useAuth";
import userService from "services/user.service";
import LoadingState from "components/common/LoadingState";

const AccountPage = () => {
  const navigate = useNavigate();
  const { user, isLoading, updateUser, logout } = useAuth();

  useEffect(() => {
    // Redirect if not authenticated
    if (!isLoading && !user) {
      navigate("/");
    }
  }, [user, isLoading, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleUpdateProfile = async (updatedData) => {
    if (!user?.id) return;

    try {
      // Update via API
      const updatedUser = await userService.updateProfile(user.id, updatedData);
      updateUser(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      // Fallback: update local state only
      const updatedUser = { ...user, ...updatedData };
      updateUser(updatedUser);
    }
  };

  if (isLoading || !user) {
    return <LoadingState />;
  }

  return (
    <div className="min-h-screen bg-account-bg-primary text-account-text-primary">
      <div className="flex flex-col py-[50px] md:flex-row min-h-screen">
        <AccountSidebar user={user} onLogout={handleLogout} />

        <main className="flex-1 p-5 md:mt-[40px] md:p-10 md:pt-2 box-border">
          <h1 className="text-3xl font-bold mb-8">Quản lý Tài khoản</h1>

          <ProfileCard user={user} onUpdate={handleUpdateProfile} />

          <AccountInfoCard user={user} onUpdate={handleUpdateProfile} />

          <SecurityCard user={user} onUpdate={handleUpdateProfile} />
        </main>
      </div>
    </div>
  );
};

export default AccountPage;
