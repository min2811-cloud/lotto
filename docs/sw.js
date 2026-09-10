/* 서비스워커 — 앱을 오프라인에서 쓸 수 있게 파일을 캐시한다.
   배포할 때마다 CACHE 버전을 올린다 (배포.bat 이 자동으로 올려줌). */
var CACHE = "lotto-v1";

var CORE = [
  "./",
  "./index.html",
  "./app.css",
  "./app.js",
  "./rules.js",
  "./store.js",
  "./lottery-api.js",
  "./image.js",
  "./seed-draws.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  var url = new URL(req.url);
  // 다른 사이트(로또 미러 등) 요청은 건드리지 않는다 — 온라인일 때만 동작
  if (url.origin !== self.location.origin) return;

  // stale-while-revalidate: 캐시로 즉시 응답하고, 뒤에서 새 버전 받아 갱신
  e.respondWith(
    caches.open(CACHE).then(function (cache) {
      return cache.match(req).then(function (cached) {
        var network = fetch(req).then(function (res) {
          if (res && res.status === 200) cache.put(req, res.clone());
          return res;
        }).catch(function () { return cached; });
        return cached || network;
      });
    })
  );
});
