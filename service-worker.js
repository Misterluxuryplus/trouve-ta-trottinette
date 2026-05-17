// Change only this value on each release: v1-12, v1-13, v1-14...
const CACHE_NAME = "trouve-ta-trott-v1-12";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./service-worker.js",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.all(
        APP_SHELL.map((url) => fetchAndCacheFresh(cache, url))
      ))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const request = event.request;
  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(networkFirstHtml(request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(networkFirstAsset(request));
    return;
  }

  event.respondWith(fetch(request).catch(() => caches.match(request)));
});

async function fetchAndCacheFresh(cache, url) {
  try {
    const request = new Request(url, { cache: "reload" });
    const response = await fetch(request);

    if (response && response.ok) {
      await cache.put(url, response.clone());
    }
  } catch (error) {
    // Offline during install: the app will use whatever is already available.
  }
}

async function networkFirstHtml(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request, { cache: "reload" });

    if (response && response.ok) {
      await cache.put(request, response.clone());
      await cache.put("./index.html", response.clone());
    }

    return response;
  } catch (error) {
    return (await cache.match(request))
      || (await cache.match("./index.html"))
      || (await caches.match("./index.html"));
  }
}

async function networkFirstAsset(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request, { cache: "reload" });

    if (response && response.ok) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    return (await cache.match(request)) || (await caches.match(request));
  }
}
