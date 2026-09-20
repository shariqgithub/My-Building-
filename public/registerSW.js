// Immediate PWA Service Worker Registration
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  function registerServiceWorker() {
    const swPath = new URL('sw.js', window.location.href).pathname;
    navigator.serviceWorker
      .register(swPath)
      .then(function (registration) {
        console.log('PWA ServiceWorker active with scope:', registration.scope);
      })
      .catch(function (error) {
        console.warn('PWA ServiceWorker registration failed:', error);
      });
  }

  // Register immediately if already loaded, or right away without waiting
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    registerServiceWorker();
  } else {
    registerServiceWorker();
    window.addEventListener('load', registerServiceWorker, { once: true });
  }
}
