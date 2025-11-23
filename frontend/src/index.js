import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";

// MSW is disabled - using real HTTP requests to backend
// To enable MSW for testing, set REACT_APP_USE_MOCK=true in .env
const USE_MOCK = process.env.REACT_APP_USE_MOCK === "true" || false;

async function enableMocking() {
  if (!USE_MOCK) {
    console.log("🌐 Using real HTTP API (MSW disabled)");
    return;
  }

  const { worker } = await import("./mocks/browser");

  // Start MSW worker
  await worker.start({
    serviceWorker: {
      url: "/mockServiceWorker.js",
    },
    onUnhandledRequest: "bypass", // Bypass unhandled requests to allow real API calls if needed
  });

  console.log("✅ MSW: Mock Service Worker enabled");
}

// Start MSW before rendering app (if enabled)
enableMocking().then(() => {
  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});

reportWebVitals();
