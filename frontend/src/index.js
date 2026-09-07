import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { initConsole } from "./utils/console";
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";
import { initializePwaInstallPrompt } from "services/pwaInstall.service";

// Initialize console configuration (disable logs in production)
initConsole();
initializePwaInstallPrompt();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

serviceWorkerRegistration.register({
  // Auto-update: activate the waiting service worker immediately,
  // the "controlling" handler below reloads the page with the new bundle.
  onUpdate: (workbox) => {
    if (typeof workbox.messageSkipWaiting === "function") {
      workbox.messageSkipWaiting();
      return;
    }
    workbox.messageSW?.({ type: "SKIP_WAITING" });
  },
  onControlling: () => {
    window.location.reload();
  },
});
