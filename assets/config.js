/* BD DocConnect site settings (also read by the service worker, hence "self").
   apiUrl: the Apps Script API deployment — the same address the Android app uses.
   firebase / vapidKey: web app notifications (Firebase project → Project settings).
   These values are public by design; no secrets here. */
self.BDC_CONFIG = {
  apiUrl: 'https://script.google.com/macros/s/AKfycbxYAlIi5iixQBU6q-iNhVwqYLVZTdLn9yUUd4kqZZatwOhketcPCNuqH1OEwCOs8B4O/exec',
  apiKey: 'e0ea486c188b038add15723c7b304a0c',
  version: '1.1',
  firebase: {
    apiKey: 'AIzaSyAgC6q7D1isVuQfFTn0JktcjpV6SvZXaT4',
    authDomain: 'bd-docconnect.firebaseapp.com',
    projectId: 'bd-docconnect',
    storageBucket: 'bd-docconnect.firebasestorage.app',
    messagingSenderId: '499402072973',
    appId: '1:499402072973:web:b9b84e013557d343b253c4'
  },
  vapidKey: 'BAFofbX5uuxjroVQ-DfhWI5RxlJDDm5vl3vVG3uo2OrJdpPLpJD6sLlN2l784srkFEYI2oK4KNjjLrgPNsf8sjI'   // Cloud Messaging → Web Push certificates
};
