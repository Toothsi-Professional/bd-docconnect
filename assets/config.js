/* BD DocConnect site settings (also read by the service worker, hence "self").
   apiUrl: the Apps Script API deployment — the same address the Android app uses.
   firebase / vapidKey: web app notifications (Firebase project → Project settings).
   These values are public by design; no secrets here. */
self.BDC_CONFIG = {
  apiUrl: 'https://script.google.com/macros/s/AKfycbxYAlIi5iixQBU6q-iNhVwqYLVZTdLn9yUUd4kqZZatwOhketcPCNuqH1OEwCOs8B4O/exec',
  apiKey: 'e0ea486c188b038add15723c7b304a0c',
  version: '1.1',
  firebase: null,      // { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId }
  vapidKey: ''         // Cloud Messaging → Web Push certificates → key pair
};
