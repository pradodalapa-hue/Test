const CACHE_NAME = '@claudiamelgueiro-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://raw.githubusercontent.com/pradodalapa-hue/fotos-industrial/main/img/jdp_1782285558672_1001254228.png',
  'https://raw.githubusercontent.com/pradodalapa-hue/fotos-industrial/main/img/jdp_1782285589574_1001254229.png'
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('MOTOR: ARMAZENANDO ATIVOS');
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('fetch', e => {
    e.respondWith(
        caches.match(e.request).then(response => {
            return response || fetch(e.request);
        })
    );
});;
});