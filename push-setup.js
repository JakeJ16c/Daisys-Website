import { messaging, db } from './firebase.js';
import { getToken, onMessage } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-messaging.js';
import { doc, setDoc } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';

// Your Web Push certificate key from Firebase
const VAPID_KEY = 'YOUR_PUBLIC_VAPID_KEY';

Notification.requestPermission().then((permission) => {
  if (permission === 'granted') {
    console.log('🔔 Notification permission granted.');

    getToken(messaging, { vapidKey: VAPID_KEY }).then((token) => {
      if (token) {
        console.log('📲 Token received:', token);

        // Store the token in Firestore at the right location
        const tokenRef = doc(db, 'adminTokens', 'admin');
        setDoc(tokenRef, { token: token });
      } else {
        console.log('⚠️ No token received.');
      }
    }).catch((err) => {
      console.error('Error retrieving token:', err);
    });
  } else {
    console.warn('❌ Notification permission not granted.');
  }
});

onMessage(messaging, (payload) => {
  console.log('📩 Foreground message received:', payload);
  // Optional: Show alert/toast to user here
});
