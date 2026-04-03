import { Outlet } from "react-router-dom";
import { useTheme } from "contexts/ThemeContext";
import Header from "components/general/Header";
import SiteFooter from "components/general/SiteFooter";
import Chatbot from "components/general/Chatbot";
// import GuestNotification from "components/general/GuestNotification";
import ThemeDecorations from "components/common/ThemeDecorations";
import MailboxFAB from "components/general/MailboxFAB";
import { hexToRgbChannels } from "utils/colorUtils";

const MainLayout = () => {
  const { theme, currentTheme } = useTheme();
  const primaryRgb = hexToRgbChannels(theme.colors.primary);
  const accentRgb = hexToRgbChannels(theme.colors.accent);
  const surfaceRgb = hexToRgbChannels(theme.colors.surface, "17, 24, 39");

  return (
    <div
      className={`flex flex-col min-h-screen theme-transition ${
        theme.decorations.enabled && theme.decorations.backgroundPattern
          ? theme.decorations.backgroundPattern
          : ""
      }`}
      data-theme={currentTheme}
      style={{
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
        "--primary-color": theme.colors.primary,
        "--primary-color-hover": theme.colors.primaryHover,
        "--primary-color-dark": theme.colors.accent,
        "--primary-color-rgb": primaryRgb,
        "--theme-background": theme.colors.background,
        "--theme-surface": theme.colors.surface,
        "--theme-surface-rgb": surfaceRgb,
        "--theme-text": theme.colors.text,
        "--theme-border": theme.colors.border,
        "--theme-accent": theme.colors.accent,
        "--theme-accent-rgb": accentRgb,
      }}
    >
      {theme.decorations.enabled && <ThemeDecorations theme={currentTheme} />}
      <Header />
      <main className="flex-grow">
        <Outlet />
      </main>
      <SiteFooter />
      <Chatbot />
      <MailboxFAB />
      {/* <GuestNotification /> */}
    </div>
  );
};

export default MainLayout;
