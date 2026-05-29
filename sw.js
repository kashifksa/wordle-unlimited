const CACHE_NAME = 'wordle-unlimited-v13';
const ASSETS = [
  './',
  'Wordle-Unlimited',
  'css/main.css',
  'js/state.js',
  'js/game.js',
  'js/sounds.js',
  'js/ui.js',
  'manifest.json',
  'assets/icon.svg',
  'assets/game-preview.webp',
  'data/words.json',
  'languages/es.json',
  'languages/pt.json',
  'languages/de.json',
  'languages/fr.json',
  'languages/hi.json',
  'languages/ur.json',
  'languages/ar.json',
  'languages/tr.json',
  'languages/id.json'
];

// Install Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching Assets');
        return cache.addAll(ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing Old Cache');
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Fetch Assets from Cache
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
