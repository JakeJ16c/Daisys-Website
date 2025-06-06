import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-messaging.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

import { app } from "../firebase.js";

// Initialize Firebase Messaging and Firestore
const messaging = getMessaging(app);
const db = getFirestore(app);

// VAPID key for web push notifications
const VAPID_KEY = 'BKWmwmuEDejKmOZEFLtWAgZXD2OUPqS_77NA6hTEf9-9SXDG9fJh0EZDG7qExr8IDrRiHVPSNvbXohUKsV12ueA';

// Notification categories
const NOTIFICATION_CATEGORIES = [
  { id: 'orders', name: 'New Orders', icon: 'fa-box' },
  { id: 'visits', name: 'Website Visits', icon: 'fa-globe' },
  { id: 'basket', name: 'Basket Updates', icon: 'fa-shopping-cart' },
  { id: 'reviews', name: 'New Reviews', icon: 'fa-star' }
];

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
      // Register the admin's own service worker with default scope
      // This is the key change - using the admin's own service worker instead of trying to use root scope
      const registration = await navigator.serviceWorker.ready;
      console.log('✅ Using existing Service Worker with scope: ', registration.scope);

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

// Function to store admin token in Firestore (multi-device support)
async function storeAdminToken(token) {
  try {
    const adminTokensRef = collection(db, "adminTokens");

    // ✅ Check if token already exists
    const querySnapshot = await getDocs(query(adminTokensRef, where("token", "==", token)));
    if (!querySnapshot.empty) {
      console.log("⚠️ Token already exists in Firestore. Skipping save.");
      return;
    }

    // ✅ Store new token
    await addDoc(adminTokensRef, {
      token: token,
      timestamp: new Date().toISOString(),
      device: navigator.userAgent,
      categories: getCategoryPreferences()
    });
    console.log("✅ Admin token stored in Firestore.");
  } catch (error) {
    console.error("❌ Error storing admin token:", error);
  }
}

// Function to get category preferences
function getCategoryPreferences() {
  const categoriesStr = localStorage.getItem('notificationCategories') || '{}';
  return JSON.parse(categoriesStr);
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

// Function to toggle notification category
export async function toggleNotificationCategory(categoryId, enabled) {
  // Get current category settings
  const categoriesStr = localStorage.getItem('notificationCategories') || '{}';
  const categories = JSON.parse(categoriesStr);
  
  // Update category setting
  categories[categoryId] = enabled;
  
  // Save updated settings
  localStorage.setItem('notificationCategories', JSON.stringify(categories));
  
  console.log(`${enabled ? '✅' : '❌'} ${categoryId} notifications ${enabled ? 'enabled' : 'disabled'}.`);
  
  // Update UI
  updateCategoryToggleUI(categoryId);
  
  // Update token in Firestore with new preferences
  if (Notification.permission === 'granted') {
    try {
      // Get current token
      const currentToken = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: await navigator.serviceWorker.ready
      });
      
      if (currentToken) {
        // Store token with updated preferences
        await storeAdminToken(currentToken);
      }
    } catch (error) {
      console.error('❌ Error updating token with new preferences:', error);
    }
  }
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
    
    // Update category toggles visibility
    const categoriesSection = document.getElementById('notification-categories');
    if (categoriesSection) {
      categoriesSection.style.display = enabled ? 'block' : 'none';
    }
  }
}

// Function to update category toggle UI
export function updateCategoryToggleUI(categoryId) {
  const toggle = document.getElementById(`category-toggle-${categoryId}`);
  if (toggle) {
    // Get current category settings
    const categoriesStr = localStorage.getItem('notificationCategories') || '{}';
    const categories = JSON.parse(categoriesStr);
    
    // Default to true if not set
    const enabled = categories[categoryId] !== false;
    toggle.checked = enabled;
    
    // Update status text
    const statusElement = document.getElementById(`category-status-${categoryId}`);
    if (statusElement) {
      statusElement.textContent = enabled ? 'Enabled' : 'Disabled';
      statusElement.className = enabled ? 'status-enabled' : 'status-disabled';
    }
  }
}

// Function to initialize all category toggles
export function initializeCategoryToggles() {
  // Get current category settings
  const categoriesStr = localStorage.getItem('notificationCategories') || '{}';
  const categories = JSON.parse(categoriesStr);
  
  // Initialize default values if not set
  let updated = false;
  NOTIFICATION_CATEGORIES.forEach(category => {
    if (categories[category.id] === undefined) {
      categories[category.id] = true; // Default to enabled
      updated = true;
    }
    
    // Update UI
    updateCategoryToggleUI(category.id);
  });
  
  // Save updated settings if changed
  if (updated) {
    localStorage.setItem('notificationCategories', JSON.stringify(categories));
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
    const testNotification = new Notification('Youre So Golden', {
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

// Function to check if notification should be shown based on category
function shouldShowNotification(title) {
  // Get category settings
  const categoriesStr = localStorage.getItem('notificationCategories') || '{}';
  const categories = JSON.parse(categoriesStr);
  
  // Check title to determine category
  if (title.includes('Basket Updated') && categories.basket === false) {
    console.log('❌ Basket notifications disabled, not showing notification');
    return false;
  }
  
  if (title.includes('New Order') && categories.orders === false) {
    console.log('❌ Order notifications disabled, not showing notification');
    return false;
  }
  
  if (title.includes('Review') && categories.reviews === false) {
    console.log('❌ Review notifications disabled, not showing notification');
    return false;
  }
  
  if (title.includes('Visit') && categories.visits === false) {
    console.log('❌ Visit notifications disabled, not showing notification');
    return false;
  }
  
  return true;
}

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
  
  // Initialize category toggles
  initializeCategoryToggles();
  
  // Initialize notifications if enabled
  if (enabled) {
    initializeAdminNotifications();
  }
});
