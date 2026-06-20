self.addEventListener('fetch', (event) => {
    const url = event.request.url;
    
    // Permite o carregamento dos arquivos do próprio domínio ou do node local
    if (url.includes('127.0.0.1') || url.includes('localhost') || url.includes('jdpsistemas.com.br') || url.includes('github.io')) {
        event.respondWith(fetch(event.request));
    } else {
        // Bloqueia qualquer tentativa de conexão externa não autorizada
        event.respondWith(new Response('BLOQUEIO HELENA: ACESSO NÃO AUTORIZADO', { 
            status: 403,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        }));
    }
});
