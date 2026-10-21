/* Service worker — Goomdé : fonctionnement hors ligne.
   Le nom du cache commence par "moore" (l'app supprime ces caches lors d'une mise à jour). */
const VERSION = "2026.10.21.1";
const CACHE = "moore-" + VERSION;
const SHELL = ["./", "index.html", "manifest.json",
  "icon-192.png", "icon-512.png", "maskable-512.png", "apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k.startsWith("moore") && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return; // API, CDN, modèles : réseau normal
  if (url.pathname.endsWith("/version.json")) return;                  // toujours frais
  if (req.mode === "navigate") {                                       // page : réseau d'abord, cache si hors ligne
    e.respondWith(
      fetch(req).then(r => {
        const copy = r.clone(); caches.open(CACHE).then(c => c.put("index.html", copy)); return r;
      }).catch(() => caches.match("index.html").then(r => r || caches.match("./")))
    );
    return;
  }
  e.respondWith(                                                       // le reste : cache d'abord
    caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return r;
    }))
  );
});
