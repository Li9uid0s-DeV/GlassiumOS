import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { installBackendFetchInterceptor } from './os/backendConfig';

installBackendFetchInterceptor();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Register Wisp + Ultraviolet (/uv/service/) & Scramjet (/scramjet/) Service Worker Proxy safely
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw-proxy.js')
      .then((reg) => {
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      })
      .catch(() => {
        // Fallback handled by server-side /uv/service/* & /scramjet/* Wisp routes
      });
  });
}

