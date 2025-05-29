
const CACHE_NAME = "golden-cache-v1";
const urlsToCache = [
  "index.html",
  "shop.html",
  "account.html",
  "checkout.html",
  "styles.css",
  "firebase.js",
  "basket.js",
  "account.js",
  "checkout.js",
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(urlsToCache.map(url => cache.add(url)));
    })
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
