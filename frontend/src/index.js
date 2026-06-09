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
  onUpdate: (workbox) => {
    window.dispatchEvent(
      new CustomEvent("cinephine:pwa-update", {
        detail: { workbox },
      }),
    );
  },
  onControlling: () => {
    window.location.reload();
  },
});
