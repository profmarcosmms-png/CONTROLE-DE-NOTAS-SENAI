// Service Worker do "Controle de Notas SENAI"
// Objetivo: permitir instalação como app e abrir rapidamente (até offline
// para a interface), sem NUNCA interferir no login (Google/Firebase Auth)
// nem nas chamadas ao Firestore — essas sempre vão direto pela rede.

const CACHE_NAME = "controle-notas-senai-v1"; // mude para v2, v3... quando publicar uma nova versão do app

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => {
        /* se algum arquivo do precache falhar, não impede a instalação */
      })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Só tratamos requisições GET de mesma origem (arquivos estáticos do app).
  // Login do Google, Firebase Auth, Firestore, APIs externas etc. passam
  // direto pela rede, sem passar pelo cache — essencial para não travar
  // login nem mostrar notas desatualizadas.
  if (req.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const fromNetwork = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);

      // stale-while-revalidate: mostra o que já está no cache na hora
      // (app abre rápido, funciona offline) e atualiza o cache em segundo plano
      return cached || fromNetwork;
    })
  );
});
