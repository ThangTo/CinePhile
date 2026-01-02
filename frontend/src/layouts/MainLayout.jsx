import { Outlet } from "react-router-dom";
import { useTheme } from "contexts/ThemeContext";
import Header from "components/general/Header";
import SiteFooter from "components/general/SiteFooter";
import Chatbot from "components/general/Chatbot";
import ThemeDecorations from "components/common/ThemeDecorations";

const MainLayout = () => {
  const { theme, currentTheme } = useTheme();

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
      }}
    >
      {theme.decorations.enabled && <ThemeDecorations theme={currentTheme} />}
      <Header />
      <main className="flex-grow">
        <Outlet />
      </main>
      <SiteFooter />
      <Chatbot />
    </div>
  );
};

export default MainLayout;
