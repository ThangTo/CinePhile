import React, { useCallback, useEffect, useState } from "react";
import useAuth from "hooks/useAuth";
import { useTheme } from "contexts/ThemeContext";
import { hexToRgba } from "utils/colorUtils";
import MailboxModal from "./MailboxModal";
import mailboxService from "services/mailbox.service";

const MailboxFAB = () => {
  const { isAuthenticated, isLoading, openAuthModal } = useAuth();
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const primaryColor = "#ffd875";
  const primaryHoverColor = "#fde68a";
  const accentColor = theme.colors.accent;
  const surfaceColor = theme.colors.surface;

  const loadUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    try {
      const data = await mailboxService.getUnreadCount();
      setUnreadCount(data.count || 0);
    } catch {
      setUnreadCount(0);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isLoading) return undefined;

    loadUnreadCount();

    const interval = setInterval(() => {
      if (!isOpen) {
        loadUnreadCount();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isLoading, isOpen, loadUnreadCount]);

  const handleOpen = () => {
    if (isLoading) return;

    if (!isAuthenticated) {
      openAuthModal("login");
      return;
    }

    setIsOpen(true);
    setUnreadCount(0);
  };

  return (
    <>
      <div className="fixed bottom-4 left-5 z-[100005] md:bottom-6 md:left-8">
        <div className="relative">
          <div
            className="pointer-events-none absolute -inset-4 rounded-[32px] blur-2xl opacity-80"
            style={{
              background: `radial-gradient(circle, ${hexToRgba(primaryColor, 0.42)} 0%, ${hexToRgba(primaryHoverColor, 0.22)} 35%, ${hexToRgba(accentColor, 0.12)} 62%, transparent 76%)`,
            }}
          />

          <div className="relative flex items-center gap-3">
            <button
              onClick={handleOpen}
              aria-label="Mở hộp thư CinePhine"
              className="group relative flex h-[62px] w-[62px] items-center justify-center overflow-visible rounded-[24px] border transition-all duration-300 hover:-translate-y-1 active:scale-95 md:h-[68px] md:w-[68px]"
              style={{
                background: `
                  linear-gradient(145deg, ${hexToRgba("#fff7dc", 0.42)} 0%, ${hexToRgba(primaryColor, 0.24)} 30%, ${hexToRgba(surfaceColor, 0.8)} 100%)
                `,
                borderColor:
                  unreadCount > 0 ? hexToRgba(primaryColor, 0.72) : hexToRgba(primaryColor, 0.34),
                boxShadow:
                  unreadCount > 0
                    ? `0 22px 45px ${hexToRgba("#000000", 0.4)}, 0 0 0 1px ${hexToRgba("#fff7dc", 0.18)} inset, 0 0 34px ${hexToRgba(primaryColor, 0.42)}`
                    : `0 20px 40px ${hexToRgba("#000000", 0.34)}, 0 0 0 1px ${hexToRgba("#fff7dc", 0.12)} inset, 0 0 22px ${hexToRgba(primaryColor, 0.18)}`,
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
              }}
            >
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[24px]">
                <div
                  className="absolute inset-0 opacity-95"
                  style={{
                    background: `linear-gradient(180deg, ${hexToRgba("#fffdf4", 0.34)} 0%, ${hexToRgba(primaryColor, 0.1)} 36%, ${hexToRgba(primaryHoverColor, 0.18)} 100%)`,
                  }}
                />
                <div
                  className="absolute inset-[1px] rounded-[23px]"
                  style={{
                    background: `linear-gradient(180deg, ${hexToRgba("#ffffff", 0.12)} 0%, transparent 24%, ${hexToRgba("#0b1020", 0.2)} 100%)`,
                  }}
                />
                <div
                  className="absolute right-2 top-2 h-3 w-3 rounded-full blur-sm"
                  style={{ background: hexToRgba("#ffffff", 0.8) }}
                />

                <div className="relative flex h-full w-full items-center justify-center">
                  <div
                    className="relative flex h-11 w-11 items-center justify-center rounded-[18px] transition-transform duration-300 group-hover:scale-105"
                    style={{
                      background: `linear-gradient(160deg, ${hexToRgba("#fff5cc", 0.95)} 0%, ${hexToRgba(primaryColor, 0.68)} 55%, ${hexToRgba(primaryHoverColor, 0.58)} 100%)`,
                      boxShadow: `0 0 0 1px ${hexToRgba("#fffdf4", 0.28)} inset, 0 10px 18px ${hexToRgba(primaryColor, 0.24)}`,
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#221506"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="relative z-10 transition-transform duration-300 group-hover:-translate-y-0.5"
                    >
                      <rect width="20" height="16" x="2" y="4" rx="3" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </div>
                </div>
              </div>

              {unreadCount > 0 && (
                <>
                  <span
                    className="pointer-events-none absolute -right-2 -top-2 z-20 min-w-[24px] rounded-full px-1.5 py-1 text-center text-[10px] font-bold text-[#1b1304]"
                    style={{
                      background: `linear-gradient(135deg, ${primaryColor} 0%, #fff0c4 100%)`,
                      boxShadow: `0 10px 22px ${hexToRgba(primaryColor, 0.4)}, 0 0 0 2px ${hexToRgba("#1a1a1a", 0.82)}`,
                    }}
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                  <span
                    className="pointer-events-none absolute inset-0 rounded-[24px] animate-ping opacity-30"
                    style={{
                      background: hexToRgba(primaryColor, 0.12),
                    }}
                  />
                </>
              )}
            </button>

            <button
              onClick={handleOpen}
              className="hidden rounded-2xl border px-4 py-2 text-left backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 md:block"
              style={{
                background: `linear-gradient(135deg, ${hexToRgba("#fff7dc", 0.22)} 0%, ${hexToRgba(primaryColor, 0.14)} 36%, ${hexToRgba(surfaceColor, 0.72)} 100%)`,
                borderColor: hexToRgba(primaryColor, 0.24),
                color: "#fffdf7",
                boxShadow: `0 16px 36px ${hexToRgba("#000000", 0.22)}, 0 0 24px ${hexToRgba(primaryColor, 0.16)}`,
              }}
            >
              <div
                className="text-[10px] uppercase tracking-[0.28em]"
                style={{ color: hexToRgba("#fff5cc", 0.74) }}
              >
                CinePhine
              </div>
              <div className="text-sm font-semibold">
                {unreadCount > 0 ? `Hộp thư • ${unreadCount} mới` : "Hộp thư hỗ trợ"}
              </div>
            </button>
          </div>
        </div>
      </div>

      <MailboxModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export default MailboxFAB;
