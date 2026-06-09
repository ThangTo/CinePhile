const listeners = new Set();

let deferredPrompt = null;
let initialized = false;
let isInstalled = false;

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

const notify = () => {
  listeners.forEach((listener) => listener());
};

export const initializePwaInstallPrompt = () => {
  if (typeof window === "undefined" || initialized) return;

  initialized = true;
  isInstalled = getIsStandalone();

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    notify();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    isInstalled = true;
    notify();
  });

  const displayModeQuery = window.matchMedia?.("(display-mode: standalone)");
  const handleDisplayModeChange = () => {
    isInstalled = getIsStandalone();
    notify();
  };

  if (displayModeQuery?.addEventListener) {
    displayModeQuery.addEventListener("change", handleDisplayModeChange);
  } else if (displayModeQuery?.addListener) {
    displayModeQuery.addListener(handleDisplayModeChange);
  }
};

export const subscribePwaInstallPrompt = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getPwaInstallSnapshot = () => ({
  canPrompt: Boolean(deferredPrompt),
  isInstalled,
  isIos: getIsIos(),
});

export const promptPwaInstall = async () => {
  if (isInstalled) return { outcome: "installed" };
  if (!deferredPrompt) return { outcome: "manual" };

  const prompt = deferredPrompt;
  deferredPrompt = null;
  notify();

  prompt.prompt();
  return prompt.userChoice;
};
