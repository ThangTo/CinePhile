import { Workbox } from "workbox-window";

const isSameOriginPublicUrl = () => {
  const publicUrl = new URL(process.env.PUBLIC_URL || "/", window.location.href);
  return publicUrl.origin === window.location.origin;
};

export function register(config = {}) {
  if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
    return;
  }

  if (!isSameOriginPublicUrl()) {
    return;
  }

  window.addEventListener("load", () => {
    const publicUrl = process.env.PUBLIC_URL || "";
    const swUrl = `${publicUrl}/service-worker.js`;
    const workbox = new Workbox(swUrl);

    workbox.addEventListener("waiting", () => {
      config.onUpdate?.(workbox);
    });

    workbox.addEventListener("activated", (event) => {
      if (!event.isUpdate) {
        config.onSuccess?.(workbox);
      }
    });

    workbox.addEventListener("controlling", () => {
      config.onControlling?.();
    });

    workbox.register().catch((error) => {
      console.error("Service worker registration failed:", error);
    });
  });
}

export function unregister() {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.ready
    .then((registration) => registration.unregister())
    .catch((error) => {
      console.error("Service worker unregister failed:", error);
    });
}
