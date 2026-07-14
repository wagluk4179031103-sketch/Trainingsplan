// Service Worker für den Trainingsplan – ermöglicht Offline-Nutzung.
const CACHE = "trainingsplan-v2";

// App-Shell: lokale Dateien, die für den Offline-Betrieb vorab gecacht werden.
const ASSETS = [
  "./",
  "./trainingsplan.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png",
  "./favicon-32.png"
];

// Bei der Installation den App-Shell in den Cache legen.
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Alte Caches beim Aktivieren aufräumen.
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch-Strategie:
// - Navigationsanfragen: Netzwerk zuerst, bei Offline auf gecachte Seite zurückfallen.
// - Sonstige GET-Anfragen (Assets, Fonts): Cache zuerst, dann Netzwerk und dabei nachcachen.
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("./trainingsplan.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        // Erfolgreiche Antworten (auch Google Fonts) für später ablegen.
        if (res && res.status === 200 &&
            (res.type === "basic" || res.type === "cors")) {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
