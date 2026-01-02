import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  MobileUserMenu,
  DesktopUserMenu,
  NavigationLinks,
  SearchBar,
} from "components/header/index";
import { useNotifications } from "contexts/NotificationContext";
import NotificationPanel from "components/notifications/NotificationPanel";
import useAuth from "hooks/useAuth";
import ThemeSelector from "components/common/ThemeSelector";

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showMobileNotifications, setShowMobileNotifications] = useState(false);
  const menuRef = useRef(null);
  const mobileBellButtonRef = useRef(null);
  const navigate = useNavigate();
  const { user, isAuthenticated, showAuthModal, authMode, openAuthModal, closeAuthModal, logout } =
    useAuth();
  const { unreadCount } = useNotifications();

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
          <Link
            to="/"
            className="shrink-0 text-xl lg:text-2xl font-extrabold tracking-tight"
            data-theme-glow="true"
          >
            <span className="text-white">Cine</span>
            <span className="text-cyan-400">Phine</span>
          </Link>

          {/* Middle: Nav links (desktop) */}
          <NavigationLinks className="hidden lg:flex items-center gap-5 text-sm" isMobile={false} />

          {/* Right: Search + actions */}
          <div className="ml-auto flex items-center gap-3">
            {/* Theme Selector - Desktop */}
            <div className="hidden lg:block">
              <ThemeSelector />
            </div>
            {user ? (
              <div className="lg:hidden relative">
                <button
                  ref={mobileBellButtonRef}
                  onClick={() => {
                    setShowMobileNotifications(!showMobileNotifications);
                    setShowMobileMenu(false);
                    setShowMobileSearch(false);
                  }}
                  className="relative p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                  aria-label="Notifications"
                >
                  <i className="fa-solid fa-bell text-xl" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
                {showMobileNotifications && (
                  <div className="absolute right-0 top-full mt-2 z-50">
                    <NotificationPanel
                      onClose={() => setShowMobileNotifications(false)}
                      triggerRef={mobileBellButtonRef}
                    />
                  </div>
                )}
              </div>
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
                className="hidden sm:hidden md:hidden lg:inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primaryColor to-hoverPrimaryColor hover:from-hoverPrimaryColor hover:to-primaryColor text-primaryColorButtonText font-semibold px-5 py-2 text-sm transition-all shadow-lg shadow-primaryColor/30"
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

            {/* Theme Selector - Mobile */}
            <div className="lg:hidden mt-4 mb-4 flex items-center justify-between px-2">
              <span className="text-sm text-gray-300">Theme</span>
              <ThemeSelector />
            </div>

            <NavigationLinks isMobile={true} />
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
