/* Offline support + notifications.
   The site shell is kept on the device; pages and data come from the API (the shell keeps the
   last copies in local storage). Pushes arrive through Firebase Cloud Messaging. */
const CACHE = 'bdc-shell-v10';
const FILES = ['./', './home/', './admin/', './assets/shell.js', './assets/shell.css', './assets/config.js',
  './assets/icon-192.png', './assets/icon-512.png', './assets/apple-touch-icon.png', './manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // API calls and maps go to the network
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true })));
});

// Notifications (only once the Firebase settings are filled in config.js)
try {
  importScripts('./assets/config.js');
  if (self.BDC_CONFIG && self.BDC_CONFIG.firebase) {
    importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js',
                  'https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');
    firebase.initializeApp(self.BDC_CONFIG.firebase);
    firebase.messaging();   // shows pushes while the app is closed; a tap opens the link sent with it
  }
} catch (e) { /* notifications unavailable: the app still works */ }
