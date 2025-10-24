import React, { useEffect, useState, useRef } from "react";
import AuthModal from "./auth/AuthModal";
import { useNavigate } from "react-router-dom";

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [user, setUser] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showUserMenu]);

  const handleOpenAuth = (mode = "login") => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setShowUserMenu(false);
    navigate("/");
  };

  return (
    <header
      className={
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300 " +
        (scrolled ? "bg-black/80 backdrop-blur" : "bg-transparent")
      }
    >
      <nav className="container mx-auto px-4 py-3 flex items-center gap-3">
        {/* Left: Logo */}
        <a href="/" className="shrink-0 text-2xl font-extrabold tracking-tight">
          <span className="text-white">Cine</span>
          <span className="text-cyan-400">Phine</span>
        </a>

        {/* Middle: Nav links (desktop) */}
        <ul className="hidden lg:flex items-center gap-5 text-sm text-gray-300">
          <li>
            <a href="#" className="hover:text-white transition-colors">
              Phim lẻ
            </a>
          </li>
          <li>
            <a href="#" className="hover:text-white transition-colors">
              Phim bộ
            </a>
          </li>
          <li>
            <a href="#" className="hover:text-white transition-colors">
              Anime
            </a>
          </li>
          <li>
            <a href="#" className="hover:text-white transition-colors">
              Thể loại
            </a>
          </li>
          <li>
            <a href="#" className="hover:text-white transition-colors">
              Quốc gia
            </a>
          </li>
          <li>
            <a href="#" className="hover:text-white transition-colors">
              TV Show
            </a>
          </li>
        </ul>

        {/* Right: Search + actions */}
        <div className="ml-auto flex items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full lg:w-80">
            <input
              type="text"
              placeholder="Tìm kiếm phim, diễn viên..."
              className="w-full bg-[#0f172a] text-gray-200 placeholder:text-gray-400 rounded-full pl-11 pr-4 py-2 border border-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010.5 18.5a7.5 7.5 0 006.15-3.85z"
              />
            </svg>
          </div>

          {user ? (
            <div className="hidden sm:flex items-center gap-3 relative" ref={menuRef}>
              {/* Notification Bell */}
              <button className="relative p-2 text-gray-300 hover:text-white transition-colors">
                <i className="fa-solid fa-bell text-xl" />
              </button>

              {/* User Avatar and Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <img
                    src={user.avatar || "https://i.pravatar.cc/150?img=68"}
                    alt={user.username}
                    className="w-10 h-10 rounded-full object-cover border-2 border-white/20"
                  />
                  <i
                    className={`fa-solid fa-chevron-down text-gray-300 text-sm transition-transform ${
                      showUserMenu ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="dropdown-menu absolute right-0 top-full mt-2 w-64 bg-[#1e293b] rounded-lg shadow-xl border border-white/10 overflow-hidden z-50">
                    {/* User Info Header */}
                    <div className="p-4 border-b border-white/10 bg-gradient-to-br from-[#2d3b52] to-[#1e293b]">
                      <div className="flex items-center gap-3 mb-3">
                        <img
                          src={user.avatar || "https://i.pravatar.cc/150?img=68"}
                          alt={user.username}
                          className="w-12 h-12 rounded-full object-cover border-2 border-cyan-400/50"
                        />
                        <div>
                          <div className="text-white font-semibold">{user.username}</div>
                          <div className="text-gray-400 text-xs">{user.email}</div>
                        </div>
                      </div>

                      {/* Premium Banner */}
                      <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg p-2.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-yellow-400 font-semibold text-sm flex items-center gap-1">
                            <i className="fa-solid fa-infinity" />
                            {user.username}
                          </span>
                        </div>
                        <p className="text-gray-300 text-xs mb-2">
                          Nâng cấp tài khoản Cinx để có trải nghiệm đẳng cấp hơn.
                        </p>
                        <button className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold text-sm py-1.5 rounded-md transition-all">
                          Nâng cấp ngay <i className="fa-solid fa-arrow-up" />
                        </button>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 mt-3 text-sm">
                        <div className="flex items-center gap-2">
                          <i className="fa-solid fa-bookmark text-gray-400" />
                          <span className="text-white font-semibold">{user.coins}</span>
                          <i className="fa-solid fa-coins text-yellow-400" />
                        </div>
                        <button className="ml-auto bg-white/5 hover:bg-white/10 text-gray-200 px-3 py-1 rounded-md text-xs transition-colors">
                          + Nạp
                        </button>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      <a
                        href="#"
                        className="flex items-center gap-3 px-4 py-2.5 text-gray-200 hover:bg-white/5 transition-colors"
                      >
                        <i className="fa-solid fa-heart w-5 text-center" />
                        <span>Yêu thích</span>
                      </a>
                      <a
                        href="#"
                        className="flex items-center gap-3 px-4 py-2.5 text-gray-200 hover:bg-white/5 transition-colors"
                      >
                        <i className="fa-solid fa-list w-5 text-center" />
                        <span>Danh sách</span>
                      </a>
                      <a
                        href="#"
                        className="flex items-center gap-3 px-4 py-2.5 text-gray-200 hover:bg-white/5 transition-colors"
                      >
                        <i className="fa-solid fa-history w-5 text-center" />
                        <span>Xem tiếp</span>
                      </a>
                      <a
                        href="/account"
                        className="flex items-center gap-3 px-4 py-2.5 text-gray-200 hover:bg-white/5 transition-colors"
                      >
                        <i className="fa-solid fa-user w-5 text-center" />
                        <span>Tài khoản</span>
                      </a>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <i className="fa-solid fa-sign-out-alt w-5 text-center" />
                        <span>Thoát</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={() => handleOpenAuth("login")}
              className="hidden sm:inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold px-5 py-2 text-sm transition-all shadow-lg shadow-cyan-500/30"
            >
              <i className="fa-solid fa-user" />
              <span>Đăng nhập</span>
            </button>
          )}
        </div>
      </nav>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authMode}
        onLoginSuccess={handleLoginSuccess}
      />
    </header>
  );
};

export default Header;
