self.addEventListener('fetch', (event) => {
    const url = event.request.url;
    
    // HELENA SECURITY GATEWAY — PERMITE APENAS AS ROTAS DA ARQUITETURA DO CRIADOR
    if (
        url.includes('127.0.0.1') || 
        url.includes('localhost') || 
        url.includes('jdpsistemas.com.br') || 
        url.includes('github.io') ||
        url.includes('onrender.com') // LIBERAÇÃO DA RENDER NA NUVEM
    ) {
        event.respondWith(fetch(event.request));
    } else {
        // BLOQUEIA INVASORES E OUTRAS REQUISIÇÕES NÃO AUTORIZADAS
        event.respondWith(new Response('BLOQUEIO HELENA: SINAL NÃO AUTORIZADO', {
            status: 403,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        }));
    }
});
