// notifications.js
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-messaging.js";
import { app } from "./firebase.js";

// Initialize Firebase Messaging
const messaging = getMessaging(app);

// Function to request notification permission and get FCM token
export async function initializeNotifications() {
  try {
    // Check if service workers are supported
    if ('serviceWorker' in navigator) {
      // Register the Firebase Messaging service worker
      const registration = await navigator.serviceWorker.register('./firebase-messaging-sw.js');
      console.log('✅ Firebase Messaging SW registered: ', registration.scope);
      
      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        console.log('✅ Notification permission granted.');
        
        // Get FCM token
        const currentToken = await getToken(messaging, {
          vapidKey: 'BKWmwmuEDejKmOZEFLtWAgZXD2OUPqS_77NA6hTEf9-9SXDG9fJh0EZDG7qExr8IDrRiHVPSNvbXohUKsV12ueA', // Replace with your actual VAPID key from Firebase console
          serviceWorkerRegistration: registration
        });
        
        if (currentToken) {
          console.log('✅ FCM Token: ', currentToken);
          
          // Store token in Firestore if user is admin
          const isAdmin = localStorage.getItem('isAdmin') === 'true';
          if (isAdmin) {
            storeAdminToken(currentToken);
          }
          
          return currentToken;
        } else {
          console.log('❌ No token received.');
        }
      } else {
        console.log('❌ Notification permission denied.');
      }
    } else {
      console.log('❌ Service workers not supported in this browser.');
    }
  } catch (error) {
    console.error('❌ Error initializing notifications: ', error);
  }
  
  return null;
}

// Function to store admin token in Firestore
async function storeAdminToken(token) {
  try {
    const { getFirestore, doc, setDoc } = await import("https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js");
    const db = getFirestore(app);
    
    await setDoc(doc(db, "adminTokens", "admin"), {
      token: token,
      timestamp: new Date().toISOString()
    });
    
    console.log('✅ Admin token stored in Firestore.');
  } catch (error) {
    console.error('❌ Error storing admin token: ', error);
  }
}

// Handle foreground messages
onMessage(messaging, (payload) => {
  console.log('✅ Foreground message received: ', payload);
  
  // Display notification manually for foreground messages
  if (payload.notification) {
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
      body: payload.notification.body,
      icon: '/icon-192.png'
    };
    
    new Notification(notificationTitle, notificationOptions);
  }
});
