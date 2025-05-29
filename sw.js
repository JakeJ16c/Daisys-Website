// sw.js

self.addEventListener('install', function (event) {
  console.log('📦 Service Worker: Installed');
  // Perform install steps (optional)
});

self.addEventListener('activate', function (event) {
  console.log('✅ Service Worker: Activated');
  // Clean up old caches if necessary (optional)
});

self.addEventListener('fetch', function (event) {
  // You can cache requests here if needed
  // This is a basic pass-through fetch handler
  event.respondWith(fetch(event.request));
});
