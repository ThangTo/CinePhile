import { useCallback, useEffect, useMemo, useState } from "react";

const getIsStandalone = () => {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator.standalone === true
  );
};

const getIsIos = () => {
  if (typeof window === "undefined") return false;

  const userAgent = window.navigator.userAgent || "";
  const platform = window.navigator.platform || "";
  const isTouchMac = platform === "MacIntel" && window.navigator.maxTouchPoints > 1;

  return /iphone|ipad|ipod/i.test(userAgent) || isTouchMac;
};

export default function usePwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(getIsStandalone);
  const isIos = useMemo(() => getIsIos(), []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    const displayModeQuery = window.matchMedia?.("(display-mode: standalone)");
    const handleDisplayModeChange = () => setIsInstalled(getIsStandalone());

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    if (displayModeQuery?.addEventListener) {
      displayModeQuery.addEventListener("change", handleDisplayModeChange);
    } else if (displayModeQuery?.addListener) {
      displayModeQuery.addListener(handleDisplayModeChange);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);

      if (displayModeQuery?.removeEventListener) {
        displayModeQuery.removeEventListener("change", handleDisplayModeChange);
      } else if (displayModeQuery?.removeListener) {
        displayModeQuery.removeListener(handleDisplayModeChange);
      }
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (isInstalled) return { outcome: "installed" };

    if (!deferredPrompt) {
      return { outcome: "manual" };
    }

    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);

    return choice;
  }, [deferredPrompt, isInstalled]);

  return {
    canPrompt: Boolean(deferredPrompt),
    isInstalled,
    isIos,
    promptInstall,
    shouldShowInstall: !isInstalled && (Boolean(deferredPrompt) || isIos),
  };
}
