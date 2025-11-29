import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "contexts/AuthContext";
import { BarSpinner } from "components/common/LoadingState";

const GoogleAuthHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getCurrentUser } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(location.search);
      const status = params.get("status") || params.get("auth");

      if (status === "google_failed" || status === "failure") {
        navigate("/", { replace: true, state: { authError: "Đăng nhập Google thất bại" } });
        return;
      }

      try {
        await getCurrentUser();
        navigate("/", { replace: true, state: { authSuccess: "Đăng nhập thành công" } });
      } catch (error) {
        navigate("/", { replace: true, state: { authError: "Không thể tải thông tin tài khoản" } });
      }
    };

    handleCallback();
  }, [location.search, navigate, getCurrentUser]);

  return <BarSpinner />;
};

export default GoogleAuthHandler;
