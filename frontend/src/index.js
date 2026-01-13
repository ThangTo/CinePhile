import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { initConsole } from "./utils/console";

// Initialize console configuration (disable logs in production)
initConsole();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
