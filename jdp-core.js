/**
 * MOTOR UNIVERSAL JDP
 * Funcionalidade: Bloqueio de interface, loading infinito e sincronização.
 */

// Cria e injeta o HTML do Loading automaticamente se não existir
function injetarLoader() {
    if (!document.getElementById('loading-supreme')) {
        const loader = document.createElement('div');
        loader.id = 'loading-supreme';
        loader.innerHTML = `
            <style>
                #loading-supreme { position: fixed; inset: 0; background: #0d0e12; z-index: 9999; display: flex; flex-direction: column; align-items: center; justify-content: center; }
                .resplendor-ouro { background: linear-gradient(to right, #bf953f, #fcf6ba, #b38728, #fbf5b7, #aa771c); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 900; font-size: 24px; }
                .spinner-supreme { width: 50px; height: 50px; margin-top: 20px; border: 5px solid transparent; border-top: 5px solid #22c55e; border-right: 5px solid #eab308; border-bottom: 5px solid #3b82f6; border-left: 5px solid #a855f7; border-radius: 50%; animation: spin-supreme 1s linear infinite; }
                @keyframes spin-supreme { 100% { transform: rotate(360deg); } }
            </style>
            <div class="resplendor-ouro">DONY BURGUERS</div>
            <div style="margin-top: 10px; color: #bf953f; font-size: 10px; letter-spacing: 2px;">SINCRONIZANDO NAVE...</div>
            <div class="spinner-supreme"></div>
        `;
        document.body.prepend(loader);
    }
}

function verificarConexaoESincronizar() {
    if (navigator.onLine) {
        const loader = document.getElementById('loading-supreme');
        if (loader) loader.style.display = 'none';
        
        // Remove a classe ou estilo que oculta o conteúdo principal
        const main = document.getElementById('main-content');
        if (main) main.style.display = 'flex';
        
        console.log('SISTEMA JDP: MOTOR ATIVO E CONECTADO');
    } else {
        console.log('SISTEMA JDP: AGUARDANDO CONEXÃO...');
        setTimeout(verificarConexaoESincronizar, 2000);
    }
}

// Inicialização Automática
window.addEventListener('load', () => {
    injetarLoader();
    setTimeout(verificarConexaoESincronizar, 10000); // 10 segundos de espera inicial
});
