import { messaging, db } from './firebase.js';
import { getToken, onMessage } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-messaging.js';
import { doc, setDoc } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';

// Your Web Push certificate key from Firebase
const VAPID_KEY = 'BKWmwmuEDejKmOZEFLtWAgZXD2OUPqS_77NA6hTEf9-9SXDG9fJh0EZDG7qExr8IDrRiHVPSNvbXohUKsV12ueA';

Notification.requestPermission().then((permission) => {
  if (permission === 'granted') {
    console.log('🔔 Notification permission granted.');

    getToken(messaging, { vapidKey: VAPID_KEY }).then((token) => {
      if (token) {
        console.log('📲 Token received:', token);

        // Only store token if user is admin
        const isAdmin = localStorage.getItem('isAdmin') === 'true';
        console.log('👤 Is admin?', isAdmin);
        
        if (isAdmin) {
          // Store the token in Firestore at the right location
          const tokenRef = doc(db, 'adminTokens', 'admin');
          setDoc(tokenRef, { 
            token: token,
            timestamp: new Date().toISOString()
          })
          .then(() => {
            console.log('✅ Admin token stored in Firestore.');
          })
          .catch((error) => {
            console.error('❌ Error storing admin token:', error);
          });
        } else {
          console.log('ℹ️ Non-admin user, token not stored in adminTokens.');
        }
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
  // Display notification manually for foreground messages
  if (payload.notification) {
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
      body: payload.notification.body,
      icon: './icon-192.png'
    };
    
    new Notification(notificationTitle, notificationOptions);
  }
});
