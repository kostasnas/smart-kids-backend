// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey:            "AIzaSyCOvFaSlLun6166hvplUzCSsWmAabJUmcM",
  authDomain:        "smat-kids-app.firebaseapp.com",
  projectId:         "smat-kids-app",
  storageBucket:     "smat-kids-app.firebasestorage.app",
  messagingSenderId: "314617078350",
  appId:             "1:314617078350:web:0a2298c69c5b65ee4e591f"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// ─────────────────────────────────────────────
// Παίρνουμε το FCM token για web
// ─────────────────────────────────────────────
export async function getWebFCMToken() {
  try {
    const token = await getToken(messaging, {
      vapidKey: 'BJWehNF9aAVCfnFtxxBsY9zREU2kD0CcCwt-RXAfFAymPcWxXUbhj2IiReYkPNgFkdIiErR__onw4f8LzgZ4-z4' // Θα το βάλουμε από Firebase console
    });
    if (token) {
      console.log('🌐 Web FCM Token:', token);
      localStorage.setItem('fcm-token-web', token);
      return token;
    }
  } catch (err) {
    console.error('FCM token error:', err);
  }
  return null;
}

// ─────────────────────────────────────────────
// Λαμβάνουμε μηνύματα όταν είναι ανοιχτό το browser
// ─────────────────────────────────────────────
export function onForegroundMessage(callback) {
  return onMessage(messaging, payload => {
    console.log('📬 Foreground message:', payload);
    callback(payload);
  });
}

export { app, messaging };
