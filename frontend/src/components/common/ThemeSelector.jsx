import React from "react";
import { useTheme } from "contexts/ThemeContext";
import { FiSun, FiMoon } from "react-icons/fi";

/**
 * ThemeToggle - Component để bật/tắt theme (chỉ toggle, không chọn theme)
 * Việc chọn theme được quản lý ở admin settings
 */
const ThemeSelector = ({ className = "" }) => {
  const { theme, serverTheme, isThemeEnabled, toggleTheme } = useTheme();

  // Không hiển thị nút nếu theme từ server là "default" (admin chọn default)
  if (serverTheme === "default") {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={toggleTheme}
        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        title={isThemeEnabled ? "Tắt theme" : "Bật theme"}
        style={{
          color: theme.colors.text,
        }}
      >
        {isThemeEnabled ? <FiSun className="w-5 h-5" /> : <FiMoon className="w-5 h-5" />}
      </button>
    </div>
  );
};

export default ThemeSelector;
