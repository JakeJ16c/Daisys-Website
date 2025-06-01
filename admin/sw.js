// Admin Service Worker for Push Notifications
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA6kN9-7dN9Ovq6BmWBBJwBhLXRW6INX4c",
  authDomain: "daisy-s-website.firebaseapp.com",
  projectId: "daisy-s-website",
  storageBucket: "daisy-s-website.firebasestorage.app",
  messagingSenderId: "595443495060",
  appId: "1:595443495060:web:7bbdd1108ad336d55c8481"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Messaging
const messaging = firebase.messaging();

// Cache name for the admin dashboard
const CACHE_NAME = 'admin-dashboard-cache-v1';

// Resources to cache
const RESOURCES_TO_CACHE = [
  './',
  './index.html',
  './settings.html',
  './products.html',
  './orders.html',
  './analytics.html',
  './styles.css',
  './admin-auth.js',
  './dashboard.js',
  './notifications.js',
  './manifest.webmanifest',
  '../icon-512.png'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Admin Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache opened');
        return cache.addAll(RESOURCES_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Admin Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return the response from the cached version
        if (response) {
          return response;
        }
        
        // Not in cache - return the result from the live server
        // `fetch` is essentially a "fallback"
        return fetch(event.request).then(
          (response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Add the response to the cache
            if (event.request.url.startsWith('http')) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }

            return response;
          }
        );
      })
  );
});

// Push event - handle background messages
self.addEventListener('push', (event) => {
  console.log('[Admin SW] Push received:', event);
  
  let notificationData = {};
  
  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (e) {
      notificationData = {
        title: 'New Notification',
        body: event.data.text()
      };
    }
  }
  
  const title = notificationData.notification?.title || 'Admin Notification';
  const options = {
    body: notificationData.notification?.body || 'You have a new notification.',
    icon: '../icon-512.png',
    badge: '../favicon_circle.ico',
    data: {
      url: notificationData.data?.url || '/admin/index.html'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event - open the relevant page
self.addEventListener('notificationclick', (event) => {
  console.log('[Admin SW] Notification click received:', event);
  
  event.notification.close();
  
  // Get the notification data
  const urlToOpen = event.notification.data?.url || '/admin/index.html';
  
  // Open the relevant page
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no window/tab is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle background messages from Firebase
messaging.onBackgroundMessage((payload) => {
  console.log('[Admin SW] Background message received:', payload);
  
  const notificationTitle = payload.notification?.title || 'Admin Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification.',
    icon: '../icon-512.png',
    badge: '../favicon_circle.ico',
    data: {
      url: payload.data?.url || '/admin/index.html'
    }
  };
  
  self.registration.showNotification(notificationTitle, notificationOptions);
});
