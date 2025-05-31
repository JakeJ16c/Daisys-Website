// admin/notifications.js
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-messaging.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { app } from "../firebase.js";

// Initialize Firebase Messaging and Firestore
const messaging = getMessaging(app);
const db = getFirestore(app);

// VAPID key for web push notifications
const VAPID_KEY = 'BKWmwmuEDejKmOZEFLtWAgZXD2OUPqS_77NA6hTEf9-9SXDG9fJh0EZDG7qExr8IDrRiHVPSNvbXohUKsV12ueA';

// Function to request notification permission and get FCM token
export async function initializeAdminNotifications() {
  try {
    // Check if notifications are enabled in settings
    const notificationsEnabled = localStorage.getItem('adminNotificationsEnabled') === 'true';
    
    if (!notificationsEnabled) {
      console.log('❌ Admin notifications are disabled in settings.');
      return null;
    }
    
    // Check if service workers are supported
    if ('serviceWorker' in navigator) {
      // Register the service worker
      const registration = await navigator.serviceWorker.register('./sw.js');
      console.log('✅ Admin Service Worker registered: ', registration.scope);
      
      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        console.log('✅ Notification permission granted.');
        
        // Get FCM token
        const currentToken = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration
        });
        
        if (currentToken) {
          console.log('✅ Admin FCM Token: ', currentToken);
          
          // Store token in Firestore
          await storeAdminToken(currentToken);
          
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
    console.error('❌ Error initializing admin notifications: ', error);
  }
  
  return null;
}

// Function to store admin token in Firestore
async function storeAdminToken(token) {
  try {
    const tokenRef = doc(db, "adminTokens", "admin");
    
    await setDoc(tokenRef, {
      token: token,
      timestamp: new Date().toISOString(),
      device: navigator.userAgent
    });
    
    console.log('✅ Admin token stored in Firestore.');
  } catch (error) {
    console.error('❌ Error storing admin token: ', error);
  }
}

// Function to toggle notifications
export async function toggleAdminNotifications(enabled) {
  localStorage.setItem('adminNotificationsEnabled', enabled);
  
  if (enabled) {
    // Initialize notifications if enabled
    await initializeAdminNotifications();
  } else {
    console.log('❌ Admin notifications disabled.');
  }
  
  // Update UI
  updateNotificationToggleUI();
}

// Function to update notification toggle UI
export function updateNotificationToggleUI() {
  const toggle = document.getElementById('notification-toggle');
  if (toggle) {
    const enabled = localStorage.getItem('adminNotificationsEnabled') === 'true';
    toggle.checked = enabled;
    
    // Update status text
    const statusElement = document.getElementById('notification-status');
    if (statusElement) {
      statusElement.textContent = enabled ? 'Enabled' : 'Disabled';
      statusElement.className = enabled ? 'status-enabled' : 'status-disabled';
    }
  }
}

// Function to send a test notification
export async function sendTestNotification() {
  try {
    // Check if notifications are enabled
    const notificationsEnabled = localStorage.getItem('adminNotificationsEnabled') === 'true';
    if (!notificationsEnabled) {
      alert('Please enable notifications first.');
      return;
    }
    
    // Check permission
    if (Notification.permission !== 'granted') {
      alert('Notification permission not granted. Please enable notifications first.');
      return;
    }
    
    // Display a local test notification
    const testNotification = new Notification('Test Notification', {
      body: 'This is a test notification from the admin dashboard.',
      icon: '../icon-512.png'
    });
    
    console.log('✅ Test notification sent.');
    
    // Show success message
    const statusElement = document.getElementById('test-notification-status');
    if (statusElement) {
      statusElement.textContent = 'Test notification sent!';
      statusElement.className = 'status-success';
      
      // Clear status after 3 seconds
      setTimeout(() => {
        statusElement.textContent = '';
      }, 3000);
    }
  } catch (error) {
    console.error('❌ Error sending test notification: ', error);
    alert('Error sending test notification: ' + error.message);
  }
}

// Handle foreground messages
onMessage(messaging, (payload) => {
  console.log('✅ Admin foreground message received: ', payload);
  
  // Display notification manually for foreground messages
  if (payload.notification) {
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
      body: payload.notification.body,
      icon: '../icon-512.png'
    };
    
    new Notification(notificationTitle, notificationOptions);
  }
});

// Initialize notification settings on page load
document.addEventListener('DOMContentLoaded', () => {
  // Set initial state from localStorage
  const enabled = localStorage.getItem('adminNotificationsEnabled') === 'true';
  if (enabled === null) {
    // Default to enabled if not set
    localStorage.setItem('adminNotificationsEnabled', 'true');
  }
  
  // Update UI
  updateNotificationToggleUI();
  
  // Initialize notifications if enabled
  if (enabled) {
    initializeAdminNotifications();
  }
});
