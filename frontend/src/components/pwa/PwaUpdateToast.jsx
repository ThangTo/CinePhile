import React, { useEffect, useState } from "react";
import { RefreshCw, RotateCcw, Sparkles, X } from "lucide-react";

const PWA_UPDATE_EVENT = "cinephine:pwa-update";

const PwaUpdateToast = () => {
  const [waitingWorkbox, setWaitingWorkbox] = useState(null);
  const [isReloading, setIsReloading] = useState(false);

  useEffect(() => {
    const handleUpdate = (event) => {
      setWaitingWorkbox(event.detail?.workbox || null);
      setIsReloading(false);
    };

    window.addEventListener(PWA_UPDATE_EVENT, handleUpdate);
    return () => window.removeEventListener(PWA_UPDATE_EVENT, handleUpdate);
  }, []);

  if (!waitingWorkbox) return null;

  const handleReload = () => {
    setIsReloading(true);

    if (typeof waitingWorkbox.messageSkipWaiting === "function") {
      waitingWorkbox.messageSkipWaiting();
      return;
    }

    waitingWorkbox.messageSW?.({ type: "SKIP_WAITING" });
  };

  return (
    <section
      className="fixed z-[10000015] w-[calc(100vw-var(--safe-left)-var(--safe-right)-2rem)] max-w-[23rem] overflow-hidden rounded-[22px] border border-white/10 bg-[#101014]/95 text-white shadow-[0_24px_70px_rgba(0,0,0,0.42)] backdrop-blur-2xl"
      style={{
        top: "calc(var(--app-header-total-height) + 0.75rem)",
        right: "calc(var(--safe-right) + 1rem)",
      }}
      aria-live="polite"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primaryColor/80 to-transparent" />
      <div className="pointer-events-none absolute -right-12 -top-20 h-36 w-36 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-14 bottom-0 h-36 w-36 rounded-full bg-primaryColor/10 blur-3xl" />

      <div className="relative p-4">
        <div className="flex items-start gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primaryColor to-[#fff1b8] text-[#17110a] shadow-[0_18px_36px_rgba(255,216,117,0.18)]">
            <RefreshCw size={19} strokeWidth={2.25} />
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-300 text-[#061014] ring-2 ring-[#101014]">
              <Sparkles size={10} strokeWidth={2.3} />
            </span>
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primaryColor/75">
              Bản mới sẵn sàng
            </p>
            <h2 className="mt-1 text-base font-black leading-tight">Cập nhật CinePhine</h2>
            <p className="mt-1 text-xs leading-relaxed text-gray-400">
              Tải lại khi tiện, trình phát hiện tại sẽ không bị tự ngắt.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setWaitingWorkbox(null)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/55 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Ẩn thông báo cập nhật"
          >
            <X size={14} strokeWidth={2.2} />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={handleReload}
            disabled={isReloading}
            className="group flex min-h-10 flex-1 items-center justify-center gap-2 rounded-full bg-primaryColor px-4 text-sm font-black text-[#17110a] shadow-[0_14px_34px_rgba(255,216,117,0.18)] transition-all hover:-translate-y-0.5 hover:bg-hoverPrimaryColor disabled:cursor-wait disabled:translate-y-0 disabled:opacity-75"
          >
            {isReloading ? (
              <>
                <RefreshCw size={16} strokeWidth={2.4} className="animate-spin" />
                Đang tải...
              </>
            ) : (
              <>
                <RotateCcw size={16} strokeWidth={2.4} className="transition-transform group-hover:-rotate-45" />
                Tải lại
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setWaitingWorkbox(null)}
            className="min-h-10 rounded-full border border-white/10 bg-white/[0.05] px-4 text-sm font-semibold text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            Để sau
          </button>
        </div>
      </div>
    </section>
  );
};

export default PwaUpdateToast;
