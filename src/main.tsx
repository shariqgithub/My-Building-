import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register PWA Service Worker immediately
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const swUrl = new URL('sw.js', window.location.href).pathname;
  navigator.serviceWorker
    .register(swUrl)
    .then((reg) => {
      console.log('ServiceWorker active on:', reg.scope);
    })
    .catch((err) => {
      console.warn('ServiceWorker registration error:', err);
    });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
