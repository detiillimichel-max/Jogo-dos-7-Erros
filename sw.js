/* ============================================
   JOGO DOS 7 ERROS — sw.js
   Service Worker — Offline-First Cache
   ============================================ */

const CACHE_NAME = '7erros-v1.0.0';

// Assets para cache no install
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
];

// ─── INSTALL ──────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Pre-cacheando assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch(err => console.warn('[SW] Falha no pre-cache:', err))
  );
});

// ─── ACTIVATE ─────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Ativando...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => {
            console.log('[SW] Deletando cache antigo:', k);
            return caches.delete(k);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ─── FETCH — Cache-First com fallback de rede ──
self.addEventListener('fetch', event => {
  // Apenas requisições GET
  if (event.request.method !== 'GET') return;

  // Ignora extensões do Chrome e requests não-http
  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    // Fontes externas: network-first com fallback de cache
    event.respondWith(networkFirstFont(event.request));
    return;
  }

  // Assets locais: cache-first
  event.respondWith(cacheFirst(event.request));
});

// Cache-First: serve do cache, fallback na rede e atualiza cache
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline e não está no cache
    return new Response(
      '<h2 style="font-family:monospace;color:#00f5ff;background:#04040f;padding:40px;text-align:center">⚡ Offline — Abra o jogo primeiro com internet</h2>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}

// Network-First para fontes: tenta a rede, fallback no cache
async function networkFirstFont(request) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_NAME + '-fonts');
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('', { status: 503 });
  }
}

// ─── BACKGROUND SYNC (futuro: salvar score offline) ──
self.addEventListener('sync', event => {
  if (event.tag === 'sync-scores') {
    event.waitUntil(syncScores());
  }
});

async function syncScores() {
  // Placeholder para sincronização futura de pontuações
  console.log('[SW] Sincronizando pontuações...');
}

// ─── PUSH NOTIFICATIONS (futuro) ──────────────
self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || '7 Erros', {
      body:    data.body    || 'Novo desafio disponível!',
      icon:    './icons/icon-192.png',
      badge:   './icons/icon-96.png',
      vibrate: [100, 50, 100],
      data:    { url: './' }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || './')
  );
});
