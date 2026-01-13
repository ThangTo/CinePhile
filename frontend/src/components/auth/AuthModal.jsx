import React, { useState, useEffect } from "react";
import { useAuth } from "contexts/AuthContext";
import bgFormLogin from "assets/images/bg-form-login.png";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api/v1";
const GOOGLE_AUTH_URL = `${API_BASE_URL}/auth/google`;

const AuthModal = ({ isOpen, onClose, initialMode = "login" }) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState(initialMode); // "login" or "register"
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState({
    password: false,
    confirmPassword: false,
  });

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
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Email không hợp lệ";
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
    setErrors({}); // Clear previous errors
    try {
      // Use email for login (backend expects email)
      await login({ email: formData.email, password: formData.password });
      // Chỉ cần tắt modal - AuthContext đã set user state
      // Các component sẽ tự động re-render khi auth state thay đổi
      onClose();
    } catch (error) {
      console.error("Login error:", error);
      // Axios interceptor returns { status, message, raw, isAuthPath }
      const errorMessage = error?.message || "Có lỗi xảy ra. Vui lòng thử lại.";
      setErrors({
        general: errorMessage,
      });
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
    setErrors({}); // Clear previous errors
    try {
      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });
      // Chỉ cần tắt modal - AuthContext đã set user state
      // Các component sẽ tự động re-render khi auth state thay đổi
      onClose();
    } catch (error) {
      console.error("Register error:", error);
      // Axios interceptor returns { status, message, raw, isAuthPath }
      const errorMessage = error?.message || "Có lỗi xảy ra. Vui lòng thử lại.";
      setErrors({
        general: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Location đã được lưu trong openAuthModal (AuthContext)
    // Google OAuth sẽ redirect về GoogleAuthHandler, nơi sẽ xử lý redirect về return location
    window.location.href = GOOGLE_AUTH_URL;
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
    setShowPassword({
      password: false,
      confirmPassword: false,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto p-4"
      style={{ isolation: "isolate" }}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative z-10 w-full min-h-[500px] max-w-4xl mx-auto my-auto flex bg-bgColor2 rounded-2xl overflow-hidden shadow-2xl">
        {/* Left Side - Branding */}
        <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-bgColor2 to-bgColor2 p-12 flex-col justify-center items-center relative overflow-hidden">
          {/* Background pattern */}
          <img
            src={bgFormLogin}
            alt="Background"
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>

        {/* Right Side - Form */}
        <div className="w-full md:w-1/2 bg-bgColor2 p-8 md:p-12 relative">
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
                    className="text-primaryColor hover:underline"
                  >
                    đăng ký ngay
                  </button>
                </>
              ) : (
                <>
                  Nếu bạn đã có tài khoản,{" "}
                  <button
                    onClick={() => switchMode("login")}
                    className="text-primaryColor hover:underline"
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
              <div>
                <input
                  required
                  type={mode === "login" ? "email" : "text"}
                  name={mode === "login" ? "email" : "username"}
                  value={mode === "login" ? formData.email : formData.username}
                  onChange={handleChange}
                  placeholder={mode === "login" ? "Email" : "Tên hiển thị"}
                  className="w-full px-4 py-3 bg-bgColor2 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primaryColor transition-colors"
                />
                {mode === "login" && errors.email && (
                  <p className="mt-1 text-red-500 text-sm">{errors.email}</p>
                )}
                {mode === "register" && errors.username && (
                  <p className="mt-1 text-red-500 text-sm">{errors.username}</p>
                )}
              </div>

              {mode === "register" && (
                <div>
                  <input
                    required
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Email"
                    className="w-full px-4 py-3 bg-bgColor2 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primaryColor transition-colors"
                  />
                  {errors.email && <p className="mt-1 text-red-500 text-sm">{errors.email}</p>}
                </div>
              )}

              <div>
                <div className="relative">
                  <input
                    required
                    type={showPassword.password ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Mật khẩu"
                    className="w-full px-4 py-3 pr-10 bg-bgColor2 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primaryColor transition-colors"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    onClick={() =>
                      setShowPassword({
                        ...showPassword,
                        password: !showPassword.password,
                      })
                    }
                  >
                    <i className={`fas ${showPassword.password ? "fa-eye-slash" : "fa-eye"}`}></i>
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-red-500 text-sm">{errors.password}</p>}
              </div>

              {mode === "register" && (
                <div>
                  <div className="relative">
                    <input
                      required
                      type={showPassword.confirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Nhập lại mật khẩu"
                      className="w-full px-4 py-3 pr-10 bg-bgColor2 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primaryColor transition-colors"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                      onClick={() =>
                        setShowPassword({
                          ...showPassword,
                          confirmPassword: !showPassword.confirmPassword,
                        })
                      }
                    >
                      <i
                        className={`fas ${
                          showPassword.confirmPassword ? "fa-eye-slash" : "fa-eye"
                        }`}
                      ></i>
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-red-500 text-sm">{errors.confirmPassword}</p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-primaryColor hover:bg-hoverPrimaryColor text-primaryColorButtonText font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : "Đăng ký"}
              </button>
            </form>

            {mode === "login" && (
              <>
                <div className="mt-4 text-center text-gray-400 text-sm">OR</div>

                <div className="mt-4">
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
