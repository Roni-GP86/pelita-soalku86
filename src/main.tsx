import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './app.tsx';
import './index.css';

// Silently intercept and suppress benign local Vite WebSocket connection errors
// to prevent any disturbing error overlays/popups on the preview screen
if (typeof window !== "undefined") {
  const ignorePatterns = [
    "websocket",
    "WebSocket",
    "vite",
    "ditutup tanpa dibuka",
    "gagal terhubung",
    "connection closed",
    "failed to connect"
  ];

  window.addEventListener("error", (event) => {
    const message = event.message || "";
    if (ignorePatterns.some((pattern) => message.toLowerCase().includes(pattern.toLowerCase()))) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const reasonStr = reason ? (reason.message || String(reason)) : "";
    if (ignorePatterns.some((pattern) => reasonStr.toLowerCase().includes(pattern.toLowerCase()))) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

