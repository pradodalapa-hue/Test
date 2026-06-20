const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
app.use(express.json());

// CORS LIBERADO PARA AS SUAS REQUISIÇÕES
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// ABRE O SEU PAINEL DIRETAMENTE NO NAVEGADOR
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// SUA PASTA PRIVADA DE ARQUIVOS
const ROOT = path.join(__dirname, 'storage');
if (!fs.existsSync(ROOT)) fs.mkdirSync(ROOT, { recursive: true });

// ACESSO DIRETO AOS SEUS ARQUIVOS PÚBLICOS SE PRECISAR
app.use('/publico', express.static(ROOT));

// LISTAR OS SEUS ARQUIVOS E PASTAS
app.get('/api/list', (req, res) => {
    const relPath = req.query.path || '';
    const fullPath = path.join(ROOT, relPath);
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

// ABRIR OS SEUS ARQUIVOS TEXTO/MÍDIA
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
    const fullPath = path.join(ROOT, relPath, name);
    if (type === 'folder') {
        fs.mkdirSync(fullPath, { recursive: true });
    } else {
        fs.writeFileSync(fullPath, content || '');
    }
    res.json({ success: true });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log('Z-PRIVADO ATIVO PORTA ' + PORT));
// ==========================================================
// CENTRAL DE ROTEAMENTO SOBERANO - COLE NO SEU BACKEND EXPRESS
// ==========================================================

// 1. Rota de Execução Limpa do Filho (Simula o GitHub Pages)
app.get('/go/:repo', (req, res) => {
    const repo = req.params.repo.toLowerCase();
    const path = require('path');
    const fs = require('fs');
    
    const indexHtmlPath = path.join(__dirname, 'clientes', repo, 'www', 'index.html');
    
    if (fs.existsSync(indexHtmlPath)) {
        res.sendFile(indexHtmlPath);
    } else {
        res.status(404).send('<h1 style="color:#ef4444;font-family:monospace;text-align:center;margin-top:50px;">⚠️ REPOSITÓRIO NÃO ENCONTRADO NO SEU TERRENO</h1>');
    }
});

// 2. Rota de Entrega Limpa dos Assets do PWA (sw.js, manifest.json)
app.get('/go/:repo/:file', (req, res) => {
    const { repo, file } = req.params;
    const path = require('path');
    const fs = require('fs');
    
    const filePath = path.join(__dirname, 'clientes', repo.toLowerCase(), 'www', file);
    
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('Not Found');
    }
});
