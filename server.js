const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// DIRETÓRIO FÍSICO PERMANENTE DO CRIADOR
const ROOT = path.join(__dirname, 'storage');
if (!fs.existsSync(ROOT)) fs.mkdirSync(ROOT, { recursive: true });

// 1. INTERFACE PRINCIPAL DO GERENCIADOR (Proteção total contra maiúsculas/minúsculas)
const servePainelPrincipal = (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
};

app.get('/', servePainelPrincipal);
app.get('/index.html', servePainelPrincipal);
app.get('/Index.html', servePainelPrincipal); // Captura o desvio com "I" maiúsculo

// 2. CONTROLE DE DIRETÓRIOS E CRIAÇÃO (APIs)
app.get('/api/list', (req, res) => {
    const relPath = req.query.path || '';
    const fullPath = path.join(ROOT, relPath);
    
    if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: "Diretório não localizado." });
    }

    fs.readdir(fullPath, { withFileTypes: true }, (err, files) => {
        if (err) return res.status(500).json({ error: "Erro ao ler diretório." });
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

app.post('/api/create', (req, res) => {
    const { type, name, content, path: relPath } = req.body;
    const targetDir = path.join(ROOT, relPath);
    const fullPath = path.join(targetDir, name);

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

// 3. ROTA SUPREMA DE DIRETÓRIOS VIVOS (Caminhos Limpos e Permanentes)
app.get('/:caminho(*)', (req, res, next) => {
    const caminhoSolicitado = req.params.caminho;
    const caminhoLower = caminhoSolicitado.toLowerCase();

    // Ignora chamadas de API do sistema, favicon e qualquer variação de index.html do painel principal
    if (caminhoSolicitado.startsWith('api/') || caminhoSolicitado === 'favicon.ico' || caminhoLower === 'index.html') {
        return next();
    }

    const fullPath = path.join(ROOT, caminhoSolicitado);

    if (fs.existsSync(fullPath)) {
        const stat = fs.statSync(fullPath);

        // Se for um arquivo físico, serve diretamente com o Mime-Type correto
        if (stat.isFile()) {
            const ext = path.extname(fullPath).toLowerCase();
            if (ext === '.html') res.setHeader('Content-Type', 'text/html; charset=utf-8');
            else if (ext === '.css') res.setHeader('Content-Type', 'text/css; charset=utf-8');
            else if (ext === '.js') res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
            else if (ext === '.json') res.setHeader('Content-Type', 'application/json; charset=utf-8');
            
            return res.sendFile(fullPath);
        } 
        
        // Se for uma pasta, verifica se existe um index.html lá dentro para rodar automaticamente
        if (stat.isDirectory()) {
            const indexPath = path.join(fullPath, 'index.html');
            if (fs.existsSync(indexPath)) {
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                return res.sendFile(indexPath);
            }
        }
    }

    // Console de Erro Industrial HELENA caso o arquivo não exista fisicamente no storage/
    res.status(404).set('Content-Type', 'text/html; charset=utf-8').send(`
        <div style="background:#020617; color:#fde047; font-family:'JetBrains Mono', monospace; padding:40px; min-height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center;">
            <h1 style="color:#06b6d4; font-size:2rem; margin-bottom:10px;">[HELENA CORE] ROTA INDISPONÍVEL</h1>
            <p style="font-size:1.1rem; color:#ffffff;">ERRO 404 — REQUISITO NÃO LOCALIZADO NO ARMAZENAMENTO</p>
            <div style="background:#0f172a; border:1px solid #06b6d4; padding:15px; border-radius:8px; margin-top:20px; font-size:0.9rem; max-width:600px; width:100%;">
                Caminho solicitado: <span style="color:#fde047;">/${caminhoSolicitado}</span><br>
                Status: Inexistente no diretório físico <b>storage/</b>.
            </div>
            <a href="/" style="margin-top:30px; color:#020617; background:#fde047; padding:10px 20px; text-decoration:none; font-weight:bold; border-radius:5px; text-transform:uppercase; font-size:0.8rem;">Retornar ao Painel Principal</a>
        </div>
    `);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[HELENA CORE]: Servidor Ativo na Porta ${PORT} - Controle Físico Pronto.`);
});
