import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import SiteFooter from "../components/SiteFooter";
import AccountSidebar from "../components/account/AccountSidebar";
import ProfileCard from "../components/account/ProfileCard";
import AccountInfoCard from "../components/account/AccountInfoCard";
import SecurityCard from "../components/account/SecurityCard";

const AccountPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Load user from localStorage
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      // Redirect to home if not logged in
      navigate("/");
      return;
    }

    setUser(JSON.parse(userData));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const handleUpdateProfile = (updatedData) => {
    const updatedUser = { ...user, ...updatedData };
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
  };

  if (!user) {
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
