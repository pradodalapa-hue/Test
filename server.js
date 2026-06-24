const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
app.use(express.json());

// CORS LIBERADO PARA AS SUAS REQUISIÇÕES (Controle Total do Sr. José)
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// SUA PASTA PRIVADA DE ARQUIVOS
const ROOT = path.join(__dirname, 'storage');
if (!fs.existsSync(ROOT)) fs.mkdirSync(ROOT, { recursive: true });

// 1. PRIMEIRO: Serve o Painel de Controle Principal (index.html do gerenciador) na raiz "/"
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. SEGUNDO: Serve os arquivos da pasta 'storage' DIRETAMENTE na raiz do site.
// Isso faz com que "storage/minha/index.html" seja acessado diretamente por "/minha/index.html"
app.use(express.static(ROOT));

// Mantido por compatibilidade caso use o prefixo antigo
app.use('/publico', express.static(ROOT)); 

// LISTAR OS SEUS ARQUIVOS E PASTAS
app.get('/api/list', (req, res) => {
    const relPath = req.query.path || '';
    const fullPath = path.join(ROOT, relPath);
    
    if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: "Diretório não encontrado" });
    }

    fs.readdir(fullPath, { withFileTypes: true }, (err, files) => {
        if (err) return res.status(500).json({ error: "Erro ao ler diretório" });
        const data = files.map(f => {
            const s = fs.statSync(path.join(fullPath, f.name));
            return { 
                 name: f.name, 
                 isDir: f.isDirectory(), 
                 size: f.isFile() ? (s.size/1024).toFixed(1)+'KB' : '' 
            };
        });
        res.json({ files: data });
    });
});

// ABRIR OS SEUS ARQUIVOS TEXTO/MÍDIA (Força a renderização correta de HTML e CSS no navegador)
app.get('/api/open', (req, res) => {
    const relPath = req.query.path || '';
    const fullPath = path.join(ROOT, relPath);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        res.sendFile(fullPath);
    } else {
        res.status(404).send("Arquivo nao encontrado.");
    }
});

// CRIAR AS SUAS PASTAS E ARQUIVOS ATRAVÉS DO BOTÃO (+)
app.post('/api/create', (req, res) => {
    const { type, name, content, path: relPath } = req.body;
    const targetDir = path.join(ROOT, relPath);
    const fullPath = path.join(targetDir, name);

    // Garante que a pasta pai existe antes de criar o arquivo/pasta (Evita crash no Render)
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    if (type === 'folder') {
        fs.mkdirSync(fullPath, { recursive: true });
    } else {
        fs.writeFileSync(fullPath, content || '');
    }
    res.json({ success: true });
});

