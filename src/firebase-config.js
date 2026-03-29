```javascript
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  // const firebaseConfig = {
  apiKey: "AIzaSyCOvFaSlLun6166hvplUzCSsWmAabJUmcM",
  authDomain: "smat-kids-app.firebaseapp.com",
  projectId: "smat-kids-app",
  storageBucket: "smat-kids-app.firebasestorage.app",
  messagingSenderId: "314617078350",
  appId: "1:314617078350:web:0a2298c69c5b65ee4e591f"
};
  apiKey: "AIza...",
  authDomain: "smart-kids-xxx.firebaseapp.com",
  projectId: "smart-kids-xxx",
  storageBucket: "smart-kids-xxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123:web:abc123"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export const requestNotificationPermission = async () => {
  try {
    const token = await getToken(messaging, {
      vapidKey: 'BN7xK...' // BEU6awLs0mzVJCIANleYW2EdT76OzUAvXRj9ct8UIgc1gKMII5qxb4myMkkbDOe9yoBeKiKDW2ZuiTSgr7_Fy2s
    });
    
    if (token) {
      console.log('FCM Token:', token);
      // Save token to backend για να στέλνεις notifications
      await fetch('http://192.168.178.65:3001/api/save-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      return token;
    }
  } catch (error) {
    console.error('Notification permission error:', error);
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
```