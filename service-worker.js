// Bump this when you deploy an update, so old caches get replaced.
var CACHE_NAME = 'vocab-app-cache-v2';

var APP_SHELL = [
  './',
  './index.html',
  './wordbooks-data.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(APP_SHELL);
    }).then(function(){
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(key){ return key !== CACHE_NAME; })
            .map(function(key){ return caches.delete(key); })
      );
    }).then(function(){
      return self.clients.claim();
    })
  );
});

// Cache-first: this is a small, mostly-static app shell, so once cached,
// always prefer the offline copy and only hit the network if something's missing.
self.addEventListener('fetch', function(event){
  if(event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(function(cached){
      if(cached) return cached;
      return fetch(event.request).then(function(response){
        if(response && response.status === 200 && response.type === 'basic'){
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, copy); });
        }
        return response;
      }).catch(function(){
        // Offline and not cached — for navigations, fall back to the app shell.
        if(event.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
