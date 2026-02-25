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
    { icon: "🔔", text: "Nhận thông báo phim mới" },
    { icon: "✨", text: "Đề xuất phim cá nhân hóa" },
    { icon: "⭐", text: "Đánh giá và bình luận phim" },
    { icon: "💎", text: "Truy cập chất lượng video cao nhất" },
  ];

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-3">
      {/* Popup Panel */}
      {isOpen && (
        <div
          className={`w-[340px] sm:w-[380px] rounded-2xl overflow-hidden transition-all duration-500 ease-out ${
            isVisible
              ? "opacity-100 translate-y-0 scale-100"
              : "opacity-0 translate-y-4 scale-95"
          }`}
          style={{
            background:
              "linear-gradient(135deg, rgba(15, 15, 30, 0.97) 0%, rgba(25, 20, 50, 0.97) 50%, rgba(15, 15, 30, 0.97) 100%)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow:
              "0 25px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(234, 179, 8, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
          }}
        >
          {/* Header with close button */}
          <div className="relative px-5 pt-5 pb-3">
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full text-gray-500 hover:text-white hover:bg-white/10 transition-all duration-200"
              aria-label="Đóng"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M1 1L13 13M1 13L13 1"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            {/* Animated greeting icon */}
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #eab308 0%, #f59e0b 100%)",
                  boxShadow: "0 4px 15px rgba(234, 179, 8, 0.3)",
                  animation: "guestNotifWave 2s ease-in-out infinite",
                }}
              >
                👋
              </div>
              <div>
                <h3 className="text-white font-bold text-base leading-tight">
                  Chào bạn!
                </h3>
                <p className="text-gray-400 text-xs mt-0.5">
                  Chào mừng đến với CinePhine
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-5 pb-4">
            <p className="text-gray-300 text-sm leading-relaxed mb-4">
              Đăng nhập hoặc đăng ký tài khoản để có{" "}
              <span className="text-yellow-400 font-semibold">
                trải nghiệm tốt nhất
              </span>{" "}
              cùng nhiều tính năng dịch vụ của toàn hệ thống. 
            </p>

            {/* Feature list */}
            <div className="space-y-2 mb-5">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2.5 text-sm"
                  style={{
                    animation: `guestNotifSlideIn 0.4s ease-out ${
                      0.1 + index * 0.08
                    }s both`,
                  }}
                >
                  <span className="text-base flex-shrink-0">{feature.icon}</span>
                  <span className="text-gray-400">{feature.text}</span>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2.5">
              <button
                onClick={handleLogin}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background:
                    "linear-gradient(135deg, #eab308 0%, #f59e0b 100%)",
                  color: "#000",
                  boxShadow: "0 4px 15px rgba(234, 179, 8, 0.25)",
                }}
              >
                Đăng nhập
              </button>
              <button
                onClick={handleRegister}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                }}
              >
                Đăng ký
              </button>
            </div>
          </div>

          {/* Bottom decorative bar */}
          <div
            className="h-1 w-full"
            style={{
              background:
                "linear-gradient(90deg, transparent, #eab308, #f59e0b, #eab308, transparent)",
            }}
          />
        </div>
      )}

      {/* Toggle Button (bell icon) — visible when popup is dismissed */}
      {!isOpen && (
        <button
          onClick={handleToggle}
          className={`group relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 ${
            pulseButton ? "animate-bounce" : ""
          }`}
          style={{
            background: "linear-gradient(135deg, #eab308 0%, #f59e0b 100%)",
            boxShadow:
              "0 8px 25px rgba(234, 179, 8, 0.35), 0 0 0 0 rgba(234, 179, 8, 0.4)",
            animation: pulseButton
              ? "guestNotifPulse 2s ease-in-out infinite"
              : "none",
          }}
          aria-label="Thông báo"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="text-black transition-transform duration-300 group-hover:rotate-12"
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
          <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-black" />
        </button>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes guestNotifPulse {
          0%, 100% { box-shadow: 0 8px 25px rgba(234, 179, 8, 0.35), 0 0 0 0 rgba(234, 179, 8, 0.4); }
          50% { box-shadow: 0 8px 25px rgba(234, 179, 8, 0.35), 0 0 0 12px rgba(234, 179, 8, 0); }
        }
        @keyframes guestNotifWave {
          0%, 100% { transform: rotate(0deg); }
          15% { transform: rotate(14deg); }
          30% { transform: rotate(-8deg); }
          45% { transform: rotate(10deg); }
          60% { transform: rotate(-4deg); }
          75% { transform: rotate(6deg); }
        }
        @keyframes guestNotifSlideIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default GuestNotification;
