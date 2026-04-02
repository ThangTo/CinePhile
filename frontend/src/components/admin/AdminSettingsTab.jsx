import React, { useState, useEffect } from "react";
import { settingsAPI } from "services/admin.service";
import { useTheme } from "contexts/ThemeContext";
import { FiCheck, FiLoader, FiSettings, FiLayout } from "react-icons/fi";

const AdminSettingsTab = () => {
  // --- GIỮ NGUYÊN LOGIC CŨ ---
  const { allThemes } = useTheme();
  const [currentTheme, setCurrentTheme] = useState("default");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Load current theme from server
  useEffect(() => {
    const loadTheme = async () => {
      try {
        setLoading(true);
        const theme = await settingsAPI.getTheme();
        setCurrentTheme(theme);
      } catch (error) {
        console.error("Failed to load theme:", error);
        setMessage({ type: "error", text: "Không thể tải cài đặt theme" });
      } finally {
        setLoading(false);
      }
    };
    loadTheme();
  }, []);

  // Save theme to server
  const handleThemeChange = async (themeName) => {
    try {
      setSaving(true);
      setMessage({ type: "", text: "" });
      await settingsAPI.setTheme(themeName);
      setCurrentTheme(themeName);
      setMessage({ type: "success", text: "Đã cập nhật theme thành công!" });

      // Clear message after 3 seconds
      setTimeout(() => {
        setMessage({ type: "", text: "" });
      }, 3000);
    } catch (error) {
      console.error("Failed to save theme:", error);
      setMessage({ type: "error", text: "Không thể lưu cài đặt theme" });
    } finally {
      setSaving(false);
    }
  };

  // --- PHẦN GIAO DIỆN MỚI ---

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-white/10 border-t-primaryColor animate-spin"></div>
        </div>
        <p className="text-gray-400 text-sm animate-pulse">Đang tải cấu hình...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto animate-fade-in pb-10">
      {/* 1. Header */}
      <div className="mb-8 flex items-center gap-4 border-b border-white/5 pb-6">
        <div className="p-3 bg-primaryColor/10 rounded-xl text-primaryColor border border-primaryColor/20">
          <FiSettings size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Cài Đặt Hệ Thống</h1>
          <p className="text-gray-400 text-sm mt-1">
            Tùy chỉnh giao diện và các thiết lập chung cho trang web CinePhine.
          </p>
        </div>
      </div>

      {/* 2. Message Banner */}
      {message.text && (
        <div
          className={`mb-8 p-4 rounded-xl flex items-center gap-3 shadow-lg backdrop-blur-md transition-all duration-300 transform translate-y-0 ${
            message.type === "success"
              ? "bg-green-500/10 border border-green-500/30 text-green-400"
              : "bg-red-500/10 border border-red-500/30 text-red-400"
          }`}
        >
          {message.type === "success" ? (
            <FiCheck size={20} />
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center font-bold text-xs">
              !
            </div>
          )}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* 3. Theme Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-white font-semibold text-lg">
          <FiLayout className="text-primaryColor" />
          <h2>Giao diện & Chủ đề</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.values(allThemes).map((theme) => {
            const isActive = currentTheme === theme.name;

            return (
              <button
                key={theme.name}
                onClick={() => handleThemeChange(theme.name)}
                disabled={saving}
                className={`group relative flex flex-col items-start w-full text-left rounded-2xl overflow-hidden transition-all duration-300 ${
                  isActive
                    ? "ring-2 ring-primaryColor ring-offset-2 ring-offset-[#0f172a] shadow-2xl shadow-primaryColor/20 scale-[1.02]"
                    : "border border-white/10 hover:border-white/20 hover:shadow-xl hover:-translate-y-1 opacity-80 hover:opacity-100"
                } ${saving ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
              >
                {/* A. Mini UI Preview (Mô phỏng giao diện web) */}
                <div
                  className="w-full h-40 relative overflow-hidden bg-gray-900 border-b border-white/5"
                  style={{ backgroundColor: theme.colors.background }} // Nền web
                >
                  {/* Giả lập Sidebar */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1/4 opacity-30 flex flex-col gap-2 p-2"
                    style={{ backgroundColor: theme.colors.accent }}
                  >
                    <div className="w-8 h-8 rounded-full bg-white/20 mb-2"></div>
                    <div className="w-full h-2 rounded-full bg-white/10"></div>
                    <div className="w-3/4 h-2 rounded-full bg-white/10"></div>
                  </div>

                  {/* Giả lập Header & Content */}
                  <div className="absolute left-[25%] top-0 right-0 bottom-0 p-3 flex flex-col gap-3">
                    {/* Header */}
                    <div className="flex justify-between items-center">
                      <div className="w-1/3 h-3 rounded-full bg-white/10"></div>
                      <div className="w-6 h-6 rounded-full bg-white/10"></div>
                    </div>

                    {/* Hero Banner (Primary Color) */}
                    <div
                      className="w-full h-16 rounded-lg shadow-sm flex items-center justify-center"
                      style={{ backgroundColor: theme.colors.primary }}
                    >
                      <div className="w-8 h-8 rounded-full bg-black/20"></div>
                    </div>

                    {/* Content Rows */}
                    <div className="flex gap-2 mt-1">
                      <div className="w-1/3 h-12 rounded bg-white/5"></div>
                      <div className="w-1/3 h-12 rounded bg-white/5"></div>
                      <div className="w-1/3 h-12 rounded bg-white/5"></div>
                    </div>
                  </div>

                  {/* Overlay Loading State */}
                  {saving && isActive && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-20">
                      <FiLoader className="w-8 h-8 animate-spin text-white" />
                    </div>
                  )}
                </div>

                {/* B. Theme Info */}
                <div className="w-full p-5 bg-bgColor3 flex items-center justify-between">
                  <div>
                    <h3
                      className={`font-bold text-base ${
                        isActive ? "text-white" : "text-gray-300 group-hover:text-white"
                      }`}
                    >
                      {theme.displayName}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ backgroundColor: theme.colors.primary }}
                      ></span>
                      {isActive ? "Đang kích hoạt" : "Nhấn để áp dụng"}
                    </p>
                  </div>

                  {/* Check Icon Wrapper */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isActive
                        ? "bg-primaryColor text-black scale-100 opacity-100"
                        : "bg-white/5 text-gray-500 scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100"
                    }`}
                  >
                    <FiCheck size={16} strokeWidth={3} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsTab;
