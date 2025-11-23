import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";

// Initialize MSW if USE_MOCK is enabled
const USE_MOCK = process.env.REACT_APP_USE_MOCK === "true" || false;

async function enableMocking() {
  if (!USE_MOCK) {
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

// Start MSW before rendering app
enableMocking().then(() => {
  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});

reportWebVitals();
