import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Register Glasispect Service Worker Proxy (uses relative path './sw-proxy.js' for GitHub Pages & storage.googleapis.com compatibility)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw-proxy.js')
      .catch(() => {
        // Fallback if hosted in environment restricting ServiceWorker registration
      });
  });
}
