// Unified Firebase Messaging Service Worker
// This service worker handles notifications for both main site and admin dashboard

importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyA6kN9-7dN9Ovq6BmWBBJwBhLXRW6INX4c",
  authDomain: "daisy-s-website.firebaseapp.com",
  projectId: "daisy-s-website",
  storageBucket: "daisy-s-website.firebasestorage.app",
  messagingSenderId: "595443495060",
  appId: "1:595443495060:web:7bbdd1108ad336d55c8481"
});

const messaging = firebase.messaging();

// Log when the service worker is installed
self.addEventListener('install', event => {
  console.log('🔄 Unified Firebase Messaging Service Worker installed!');
  self.skipWaiting(); // Ensure the service worker activates immediately
});

// Log when the service worker is activated
self.addEventListener('activate', event => {
  console.log('✅ Unified Firebase Messaging Service Worker activated!');
  event.waitUntil(clients.claim()); // Take control of all clients immediately
});

// Handle background messages from Firebase
messaging.onBackgroundMessage(function(payload) {
  console.log('📩 [Unified SW] Received background message:', payload);

  // Determine if this is an admin notification
  const isAdminNotification = payload.data && payload.data.target === 'admin';
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: isAdminNotification ? './admin/icon-512.png' : './icon-512.png',
    badge: './favicon_circle.ico',
    data: {
      url: isAdminNotification ? './admin/index.html' : './',
      ...payload.data
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('🖱️ [Unified SW] Notification clicked:', event);
  
  event.notification.close();
  
  // Get the URL from notification data or use default
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(clientList => {
      // Try to focus an existing window
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no matching window, open a new one
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data?.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

// Optional: Cache static assets for offline use
const CACHE_NAME = 'youre-so-golden-cache-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './icon-512.png',
  './favicon_circle.ico',
  './admin/index.html',
  './admin/styles.css'
];

// Cache static assets on install
self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;
  
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(event.request).then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        // Clone the response
        const responseToCache = response.clone();
        
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        
        return response;
      });
    })
  );
});
