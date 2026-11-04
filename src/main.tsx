import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Register Wisp + Ultraviolet (/uv/service/) & Scramjet (/scramjet/) Service Worker Proxy immediately
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('./sw-proxy.js', { updateViaCache: 'none' })
    .then((reg) => {
      reg.update().catch(() => {});
    })
    .catch(() => {
      // Fallback handled by server-side /uv/service/* & /scramjet/* Wisp routes
    });
}

