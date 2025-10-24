import React, { useState, useEffect } from "react";
import * as authService from "../../services/authService";

const AuthModal = ({ isOpen, onClose, initialMode = "login", onLoginSuccess }) => {
  const [mode, setMode] = useState(initialMode); // "login" or "register"
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Prevent body scroll when modal is open and scroll to top
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;

      // Lock body scroll at current position
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";

      return () => {
        // Restore scroll position
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        document.body.style.overflow = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateLogin = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = "Vui lòng nhập email";
    if (!formData.password) newErrors.password = "Vui lòng nhập mật khẩu";
    return newErrors;
  };

  const validateRegister = () => {
    const newErrors = {};
    if (!formData.username) newErrors.username = "Vui lòng nhập tên hiển thị";
    if (!formData.email) newErrors.email = "Vui lòng nhập email";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Email không hợp lệ";
    if (!formData.password) newErrors.password = "Vui lòng nhập mật khẩu";
    else if (formData.password.length < 6) newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự";
    if (!formData.confirmPassword) newErrors.confirmPassword = "Vui lòng nhập lại mật khẩu";
    else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Mật khẩu không khớp";
    }
    return newErrors;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const newErrors = validateLogin();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      const data = await authService.login(formData.email, formData.password);
      authService.setAuthData(data.token, data.user);
      onClose();
      window.location.reload();
    } catch (error) {
      console.error("Login error:", error);
      setErrors({ general: error.message || "Có lỗi xảy ra. Vui lòng thử lại." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const newErrors = validateRegister();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      const data = await authService.register(formData.username, formData.email, formData.password);
      authService.setAuthData(data.token, data.user);
      onClose();
      window.location.reload();
    } catch (error) {
      console.error("Register error:", error);
      setErrors({ general: error.message || "Có lỗi xảy ra. Vui lòng thử lại." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // TODO: Implement Google OAuth
    window.location.href = "/api/auth/google";
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setFormData({
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
    setErrors({});
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto p-4"
      style={{ isolation: "isolate" }}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative z-10 w-full min-h-[600px] max-w-4xl mx-auto my-auto flex bg-[#1a2332] rounded-2xl overflow-hidden shadow-2xl">
        {/* Left Side - Branding */}
        <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-[#2d3b52] to-[#1a2332] p-12 flex-col justify-center items-center relative overflow-hidden">
          {/* Background pattern */}
          <img
            src="https://www.rophim.li/images/rophim-login.jpg"
            alt="Background"
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>

        {/* Right Side - Form */}
        <div className="w-full md:w-1/2 bg-[#1f2937] p-8 md:p-12 relative">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          >
            <i className="fa-solid fa-times text-2xl" />
          </button>

          <div className="max-w-md mx-auto">
            <h2 className="text-3xl font-bold text-white mb-2">
              {mode === "login" ? "Đăng nhập" : "Tạo tài khoản mới"}
            </h2>
            <p className="text-gray-400 mb-6">
              {mode === "login" ? (
                <>
                  Nếu bạn chưa có tài khoản,{" "}
                  <button
                    onClick={() => switchMode("register")}
                    className="text-yellow-500 hover:underline"
                  >
                    đăng ký ngay
                  </button>
                </>
              ) : (
                <>
                  Nếu bạn đã có tài khoản,{" "}
                  <button
                    onClick={() => switchMode("login")}
                    className="text-yellow-500 hover:underline"
                  >
                    đăng nhập
                  </button>
                </>
              )}
            </p>

            {errors.general && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500 rounded text-red-500 text-sm">
                {errors.general}
              </div>
            )}

            <form onSubmit={mode === "login" ? handleLogin : handleRegister} className="space-y-4">
              {mode === "register" && (
                <div>
                  <input
                    required
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Tên hiển thị"
                    className="w-full px-4 py-3 bg-[#2d3b52] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500 transition-colors"
                  />
                  {errors.username && (
                    <p className="mt-1 text-red-500 text-sm">{errors.username}</p>
                  )}
                </div>
              )}

              <div>
                <input
                  required
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email"
                  className="w-full px-4 py-3 bg-[#2d3b52] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500 transition-colors"
                />
                {errors.email && <p className="mt-1 text-red-500 text-sm">{errors.email}</p>}
              </div>

              <div>
                <input
                  required
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Mật khẩu"
                  className="w-full px-4 py-3 bg-[#2d3b52] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500 transition-colors"
                />
                {errors.password && <p className="mt-1 text-red-500 text-sm">{errors.password}</p>}
              </div>

              {mode === "register" && (
                <div>
                  <input
                    required
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Nhập lại mật khẩu"
                    className="w-full px-4 py-3 bg-[#2d3b52] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500 transition-colors"
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-red-500 text-sm">{errors.confirmPassword}</p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : "Đăng ký"}
              </button>
            </form>

            {mode === "login" && (
              <>
                <div className="mt-4 text-center">
                  <button className="text-sm text-gray-400 hover:text-yellow-500">
                    Quên mật khẩu?
                  </button>
                </div>

                <div className="mt-6">
                  <button
                    onClick={handleGoogleLogin}
                    className="w-full py-3 bg-white hover:bg-gray-100 text-gray-800 font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <img
                      src="https://www.google.com/favicon.ico"
                      alt="Google"
                      className="w-5 h-5"
                    />
                    Đăng nhập bằng Google
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
