import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then(reg => {
          console.log('[PWA] Service Worker registered:', reg);
        })
        .catch(err => {
          console.error('[PWA] Service Worker registration failed:', err);
        });
    } else {
      // 🧹 In development, clean up old service workers
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(reg => reg.unregister());
        console.log('[PWA] Unregistered old service workers (dev mode)');
      });
    }
  });
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as Element);
root.render(
  <React.StrictMode>
      <App />
  </React.StrictMode>
);
