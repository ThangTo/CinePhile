import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "hooks/useAuth";

const GuestNotification = () => {
  const { isAuthenticated, openAuthModal } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [pulseButton, setPulseButton] = useState(true);
  const navigate = useNavigate();

  // Auto-show after 3 seconds for guests
  useEffect(() => {
    if (isAuthenticated || isDismissed) return;

    const dismissed = sessionStorage.getItem("guestNotifDismissed");
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    const timer = setTimeout(() => {
      setIsOpen(true);
      setTimeout(() => setIsVisible(true), 50);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isAuthenticated, isDismissed]);

  // Stop pulse animation after a while
  useEffect(() => {
    const timer = setTimeout(() => setPulseButton(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  // Don't render for logged-in users
  if (isAuthenticated) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      setIsOpen(false);
      setIsDismissed(true);
      sessionStorage.setItem("guestNotifDismissed", "true");
    }, 400);
  };

  const handleToggle = () => {
    if (isOpen) {
      handleDismiss();
    } else {
      setIsOpen(true);
      setIsDismissed(false);
      sessionStorage.removeItem("guestNotifDismissed");
      setTimeout(() => setIsVisible(true), 50);
    }
  };

  const handleLogin = () => {
    if (openAuthModal) {
      openAuthModal("login");
    } else {
      navigate("/login");
    }
    handleDismiss();
  };

  const handleRegister = () => {
    if (openAuthModal) {
      openAuthModal("register");
    } else {
      navigate("/register");
    }
    handleDismiss();
  };

  const features = [
    { icon: "🎬", text: "Lưu phim yêu thích & danh sách xem sau" },
    { icon: "📊", text: "Theo dõi tiến trình xem phim" },
    { icon: "📥", text: "Tải phim không quảng cáo về máy" },
    { icon: "🔔", text: "Nhận thông báo phim mới" },
    { icon: "✨", text: "Đề xuất phim cá nhân hóa" },
    { icon: "⭐", text: "Đánh giá và bình luận phim" },
    { icon: "💎", text: "Truy cập chất lượng video cao nhất" },
  ];

  return (
    <div
      className="fixed z-[100000] max-h-[80dvh] flex flex-col items-start gap-4"
      style={{
        bottom: "calc(var(--safe-bottom) + 1.5rem)",
        left: "calc(var(--safe-left) + 1.5rem)",
      }}
    >
      {/* ====== POPUP PANEL ====== */}
      {isOpen && (
        <div
          className={`relative w-[340px] sm:w-[380px] bg-bgColor2/90 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl shadow-black/80 overflow-hidden transition-all duration-500 ease-out origin-bottom-left ${
            isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-90"
          }`}
        >
          {/* Ambient Glows (Hiệu ứng ánh sáng) */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primaryColor/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-primaryColor/10 rounded-full blur-2xl pointer-events-none" />

          {/* Header with close button */}
          <div className="relative px-6 pt-6 pb-2 z-10">
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200"
              aria-label="Đóng"
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path
                  d="M1 1L13 13M1 13L13 1"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            {/* Animated greeting icon */}
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-primaryColor/15 border border-primaryColor/30 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(var(--primary-color-rgb),0.15)]">
                <span
                  style={{
                    animation: "guestNotifWave 2.5s ease-in-out infinite origin-bottom-right",
                  }}
                >
                  👋
                </span>
              </div>
              <div>
                <h3 className="text-gray-100 font-bold text-lg leading-tight flex items-center gap-2">
                  Chào bạn! <i className="fa-solid fa-sparkles text-primaryColor text-[10px]" />
                </h3>
                <p className="text-primaryColor/80 text-xs mt-0.5 font-medium tracking-wide uppercase">
                  Chào mừng đến với CinePhine
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="relative px-6 pb-6 z-10">
            <p className="text-gray-300 text-sm leading-relaxed mb-5">
              Đăng nhập hoặc đăng ký tài khoản để có{" "}
              <span className="text-primaryColor font-bold drop-shadow-sm">
                trải nghiệm tốt nhất
              </span>{" "}
              cùng nhiều tính năng dịch vụ của toàn hệ thống.
            </p>

            {/* Feature list */}
            <div className="space-y-3 mb-6">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 text-sm"
                  style={{
                    animation: `guestNotifSlideIn 0.5s ease-out ${0.1 + index * 0.08}s both`,
                  }}
                >
                  <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 text-[11px] shadow-inner">
                    {feature.icon}
                  </div>
                  <span className="text-gray-300 text-[13px]">{feature.text}</span>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleLogin}
                className="flex-1 py-3 px-4 rounded-xl text-sm font-bold bg-primaryColor text-gray-900 transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] shadow-[0_4px_15px_rgba(var(--primary-color-rgb),0.3)] hover:shadow-[0_6px_20px_rgba(var(--primary-color-rgb),0.5)]"
              >
                Đăng nhập
              </button>
              <button
                onClick={handleRegister}
                className="flex-1 py-3 px-4 rounded-xl text-sm font-bold text-primaryColor transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] bg-primaryColor/10 border border-primaryColor/30 hover:bg-primaryColor/20"
              >
                Đăng ký
              </button>
            </div>
          </div>

          {/* Bottom decorative bar */}
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-primaryColor/60 to-transparent" />
        </div>
      )}

      {/* ====== TOGGLE BUTTON (Bell Icon) ====== */}
      {!isOpen && (
        <button
          onClick={handleToggle}
          className="group relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 bg-bgColor2/90 backdrop-blur-xl border border-primaryColor/40 shadow-[0_0_20px_rgba(var(--primary-color-rgb),0.2)]"
          aria-label="Thông báo"
        >
          {/* Vòng sáng nhấp nháy (Thay thế cho shadow vàng cũ) */}
          {pulseButton && (
            <span className="absolute inset-0 rounded-full border-2 border-primaryColor animate-ping opacity-60" />
          )}

          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            className="text-primaryColor transition-transform duration-300 group-hover:rotate-12 drop-shadow-md"
          >
            <path
              d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M13.73 21a2 2 0 0 1-3.46 0"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          {/* Red dot indicator */}
          <span className="absolute top-[2px] right-[4px] w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-bgColor2 shadow-sm" />
        </button>
      )}

      {/* CSS Animations (Được giữ lại vì tính chất keyframes riêng biệt không phụ thuộc màu) */}
      <style>{`
        @keyframes guestNotifWave {
          0%, 100% { transform: rotate(0deg); }
          15% { transform: rotate(14deg); }
          30% { transform: rotate(-8deg); }
          45% { transform: rotate(10deg); }
          60% { transform: rotate(-4deg); }
          75% { transform: rotate(6deg); }
        }
        @keyframes guestNotifSlideIn {
          from { opacity: 0; transform: translateX(-15px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default GuestNotification;
