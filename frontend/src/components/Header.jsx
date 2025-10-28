import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AuthModal from "./auth/AuthModal";
import MobileUserMenu from "./Header/MobileUserMenu";
import DesktopUserMenu from "./Header/DesktopUserMenu";
import NavigationLinks from "./Header/NavigationLinks";
import SearchBar from "./Header/SearchBar";
import useAuth from "../hooks/useAuth";

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const { user, isAuthenticated, showAuthModal, authMode, openAuthModal, closeAuthModal, logout } =
    useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    navigate("/");
  };

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-[100001] transition-colors duration-300 bg-black ${
          scrolled ? "md:bg-black/80 md:backdrop-blur" : "md:bg-transparent"
        }`}
      >
        <nav className="w-full px-2 md:px-4 py-2 lg:py-3 flex items-center gap-3">
          {/* Mobile Menu Button */}
          <button
            onClick={() => {
              setShowMobileMenu(!showMobileMenu);
              setShowMobileSearch(false);
            }}
            className="lg:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            <i
              className={`fa-solid ${showMobileMenu ? "fa-times text-red-400" : "fa-bars"} text-xl`}
            />
          </button>

          {/* Left: Logo */}
          <a href="/" className="shrink-0 text-xl lg:text-2xl font-extrabold tracking-tight">
            <span className="text-white">Cine</span>
            <span className="text-cyan-400">Phine</span>
          </a>

          {/* Middle: Nav links (desktop) */}
          <NavigationLinks className="hidden lg:flex items-center gap-5 text-sm" isMobile={false} />

          {/* Right: Search + actions */}
          <div className="ml-auto flex items-center gap-3">
            {user ? (
              <button
                className="lg:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Notifications"
              >
                <i className="fa-solid fa-bell text-xl" />
              </button>
            ) : null}
            {/* Mobile Search Button */}
            <button
              onClick={() => {
                setShowMobileSearch(!showMobileSearch);
                setShowMobileMenu(false);
              }}
              className="lg:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Toggle search"
            >
              <i
                className={`fa-solid ${
                  showMobileSearch ? "fa-times text-red-400" : "fa-search text-white"
                } text-xl`}
              />
            </button>
            {/* Desktop Search */}
            <SearchBar className="hidden lg:block w-80" />
            {isAuthenticated ? (
              <DesktopUserMenu
                user={user}
                showUserMenu={showUserMenu}
                onToggle={() => setShowUserMenu(!showUserMenu)}
                onLogout={handleLogout}
                menuRef={menuRef}
              />
            ) : (
              <button
                onClick={() => openAuthModal("login")}
                className="hidden sm:hidden md:hidden lg:inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold px-5 py-2 text-sm transition-all shadow-lg shadow-cyan-500/30"
              >
                <i className="fa-solid fa-user" />
                <span>Đăng nhập</span>
              </button>
            )}
          </div>
        </nav>
      </header>

      {/* Mobile Search Overlay */}
      {showMobileSearch && (
        <div className="fixed top-[56px] left-0 right-0 z-40 lg:hidden bg-transparent px-4 py-2">
          <SearchBar placeholder="Tìm kiếm phim, diễn viên" />
        </div>
      )}

      {/* Mobile Navigation Menu */}
      {showMobileMenu && (
        <div className="absolute top-[62px] left-0 min-w-[360px] z-40 lg:hidden bg-[rgba(59,73,135,1)] rounded-2xl mx-2 md:mx-4">
          <div className="w-full bg-transparent px-4 py-4">
            <MobileUserMenu
              user={user}
              onLogout={handleLogout}
              onOpenAuth={openAuthModal}
              onClose={() => setShowMobileMenu(false)}
            />

            <NavigationLinks isMobile={true} />
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={closeAuthModal} initialMode={authMode} />
    </>
  );
};

export default Header;
