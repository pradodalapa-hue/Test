const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
app.use(express.json());

// CORS LIBERADO PARA O SEU DOMÍNIO E GITHUB
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

const ROOT = path.join(__dirname, 'storage');
if (!fs.existsSync(ROOT)) fs.mkdirSync(ROOT, { recursive: true });

// ROTA DE HOSPEDAGEM PÚBLICA DE OUTROS SITES DO CRIADOR
app.use('/publico', express.static(ROOT));

// LISTAR ARQUIVOS E PASTAS
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

// ABRIR ARQUIVO DIRETAMENTE NO NAVEGADOR
app.get('/api/open', (req, res) => {
    const relPath = req.query.path || '';
    const fullPath = path.join(ROOT, relPath);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        res.sendFile(fullPath);
    } else {
        res.status(404).send("Arquivo nao encontrado.");
    }
});

// CRIAR ARQUIVO OU PASTA
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
