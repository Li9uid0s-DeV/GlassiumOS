import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Register GlassiumOS Service Worker Proxy for browser CORS bypass
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw-proxy.js', { scope: '/' })
      .then((reg) => {
        console.log('[GlassiumOS] Service Worker Proxy registered successfully:', reg.scope);
      })
      .catch((err) => {
        console.warn('[GlassiumOS] Service Worker registration failed:', err);
      });
  });
}

