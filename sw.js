
// ==========================================================================
// HELENA CORE v2.0 - GUARDIÃO DE PRESERVAÇÃO IMPERIAL DO CRIADOR SR. JOSÉ
// SISTEMA DE CACHE REVERSO, INDEXEDDB INTEGRADO E RESISTÊNCIA CONTRA APAGAMENTO
// ==========================================================================

const CACHE_NAME = 'HELENA_VAULT_V2';
const INDEXEDDB_NAME = 'HELENA_DATABASE';
const DB_VERSION = 1;

// Lista de recursos vitais para manter a interface da HELENA sempre viva offline
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/Index.html',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Inicialização e Instalação do Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[HELENA GUARDIÃO]: Selando arquivos vitais no Cache Vault.');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Ativação e limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[HELENA GUARDIÃO]: Expurgando cache antigo:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptador de Requisições - Impede que erros de rede ou quedas do Render matem o app
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Se for uma requisição para o próprio servidor ou arquivos estáticos
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Retorna o cache imediatamente, mas atualiza em segundo plano se houver rede
        fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => console.log('[HELENA GUARDIÃO]: Operando em modo de sobrevivência offline para:', event.request.url));
        
        return cachedResponse;
      }

      // Se não estiver no cache, tenta a rede real
      return fetch(event.request).catch(async () => {
        // Se a rede falhar (Render offline), tenta responder com uma rota coringa do Cache para HTML
        if (event.request.mode === 'navigate') {
          const cache = await caches.open(CACHE_NAME);
          return cache.match('/index.html') || cache.match('/Index.html');
        }
      });
    })
  );
});

// Ouvinte de mensagens para sincronização forçada de arquivos via IndexedDB
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PRESERVE_FILE') {
    const { path, content, isDir } = event.data;
    saveFileToIndexedDB(path, content, isDir);
  }
});

// Gravação Direta no IndexedDB do Navegador (O Cofre do Criador)
function saveFileToIndexedDB(path, content, isDir) {
  const request = indexedDB.open(INDEXEDDB_NAME, DB_VERSION);

  request.onupgradeneeded = (event) => {
    const db = event.target.result;
    if (!db.objectStoreNames.contains('files')) {
      db.createObjectStore('files', { keyPath: 'path' });
    }
  };

  request.onsuccess = (event) => {
    const db = event.target.result;
    const transaction = db.transaction('files', 'readwrite');
    const store = transaction.objectStore('files');
    
    store.put({
      path: path,
      content: content,
      isDir: isDir,
      updatedAt: new Date().toISOString()
    });

    transaction.oncomplete = () => {
      console.log(`[HELENA GUARDIÃO DB]: ${path} foi blindado no disco rígido do navegador.`);
    };
  };

  request.onerror = (err) => {
    console.error('[HELENA GUARDIÃO DB] ERRO CRÍTICO AO BLINDAR:', err);
  };
}
