import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import App from './App.jsx'
import './index.css'

// Vercel Analytics no usa cookies, pero por prudencia RGPD lo cargamos
// solo si el usuario ha aceptado todas las cookies. Reacciona en caliente
// al evento 'cookie-consent-changed' que dispara el banner.
function ConditionalAnalytics() {
  const [consent, setConsent] = useState(() => localStorage.getItem('cookie-consent'));

  useEffect(() => {
    const handler = () => setConsent(localStorage.getItem('cookie-consent'));
    window.addEventListener('cookie-consent-changed', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('cookie-consent-changed', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  if (consent !== 'all') return null;
  return <Analytics />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <>
    <App />
    <ConditionalAnalytics />
  </>
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Error registrando service worker:', error);
    });
  });
}
