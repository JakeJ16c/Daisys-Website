
const CACHE_NAME = "golden-cache-v1";
const urlsToCache = [
  "/Daisys-Website-main/",
  "/Daisys-Website-main/index.html",
  "/Daisys-Website-main/styles.css",
  "/Daisys-Website-main/firebase.js",
  "/Daisys-Website-main/basket.js",
  "/Daisys-Website-main/favicon_circle.ico"
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
