// Service Worker route handler para Next.js
export async function GET() {
  const swCode = `
// Service Worker para PWA
const CACHE_NAME = 'servipro-v1'
const urlsToCache = [
  '/',
  '/dashboard',
  '/login',
  '/manifest.json',
]

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache)
      })
      .catch((error) => {
        console.error('Erro ao instalar cache:', error)
      })
  )
  self.skipWaiting()
})

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  return self.clients.claim()
})

// Estratégia: Network First, fallback para Cache
// IMPORTANTE: Não interceptar requisições de navegação (GET para documentos HTML)
self.addEventListener('fetch', (event) => {
  // Ignorar requisições de navegação - sempre usar rede para navegação
  if (event.request.mode === 'navigate') {
    return // Deixa o navegador lidar com navegação normalmente
  }
  
  // Ignorar requisições que não são GET
  if (event.request.method !== 'GET') {
    return
  }
  
  // Ignorar requisições de API
  if (event.request.url.includes('/api/')) {
    return
  }
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Só cachear recursos estáticos (CSS, JS, imagens, etc)
        if (response.status === 200 && (
          event.request.url.includes('.css') ||
          event.request.url.includes('.js') ||
          event.request.url.includes('.png') ||
          event.request.url.includes('.jpg') ||
          event.request.url.includes('.svg') ||
          event.request.url.includes('.woff') ||
          event.request.url.includes('.woff2')
        )) {
          const responseToCache = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          })
        }
        
        return response
      })
      .catch(() => {
        // Se falhar, tenta buscar do cache apenas para recursos estáticos
        return caches.match(event.request)
      })
  )
})
  `
  
  return new Response(swCode, {
    headers: {
      'Content-Type': 'application/javascript',
      'Service-Worker-Allowed': '/',
    },
  })
}
