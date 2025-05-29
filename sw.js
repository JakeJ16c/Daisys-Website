
const CACHE_NAME = "golden-cache-v1";
const urlsToCache = [
  "./",
  "./index.html",
  "./shop.html",
  "./account.html",
  "./checkout.html",
  "./styles.css",
  "./firebase.js",
  "./basket.js",
  "./account.js",
  "./checkout.js",
  "./favicon_circle.ico",
  "./IMG_5319.jpg",
  "./image0.jpeg",
  "./image1.jpeg",
  "./image2.jpeg",
  "./image3.jpeg",
  "./image4.jpeg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
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
