const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer'); // Para Uploads do Celular
const AdmZip = require('adm-zip'); // Para Compactar/Extrair ZIP

const app = express();
app.use(express.json());

// CORS TOTALMENTE LIBERADO PARA AS SUAS REQUISIÇÕES
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE, PUT');
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

// ACESSO DIRETO AOS SEUS ARQUIVOS PÚBLICOS
app.use('/publico', express.static(ROOT));

// ==========================================
// CONFIGURAÇÃO DO MOTOR DE UPLOAD (MULTER)
// ==========================================
const storageConfig = multer.diskStorage({
    destination: (req, file, cb) => {
        const relPath = req.query.path || req.body.path || '';
        const dest = path.join(ROOT, relPath);
        fs.mkdirSync(dest, { recursive: true }); 
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storageConfig });


// ==========================================
// API: LISTAR ARQUIVOS E PASTAS
// ==========================================
app.get('/api/list', (req, res) => {
    const relPath = req.query.path || '';
    const fullPath = path.join(ROOT, relPath);
    
    if (!fullPath.startsWith(ROOT)) {
        return res.status(403).json({ error: "Acesso negado." });
    }

    fs.readdir(fullPath, { withFileTypes: true }, (err, files) => {
        if (err) return res.status(500).json({ error: "Erro ao ler diretório" });
        const data = files.map(f => {
            const filePath = path.join(fullPath, f.name);
            let size = '';
            try {
                const s = fs.statSync(filePath);
                size = f.isFile() ? (s.size / 1024).toFixed(1) + 'KB' : '';
            } catch(e) {}
            return {
                name: f.name,
                isDir: f.isDirectory(),
                size: size
            };
        });
        res.json({ files: data });
    });
});


// ==========================================
// API: ABRIR ARQUIVOS (TEXTO/MÍDIA)
// ==========================================
app.get('/api/open', (req, res) => {
    const relPath = req.query.path || '';
    const fullPath = path.join(ROOT, relPath);
    
    if (!fullPath.startsWith(ROOT)) {
        return res.status(403).send("Acesso negado.");
    }

    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        res.sendFile(fullPath);
    } else {
        res.status(404).send("Arquivo nao encontrado.");
    }
});


// ==========================================
// API: CRIAR PASTAS OU ARQUIVOS TEXTO (+)
// ==========================================
app.post('/api/create', (req, res) => {
    const { type, name, content, path: relPath } = req.body;
    const fullPath = path.join(ROOT, relPath || '', name);
    
    if (!fullPath.startsWith(ROOT)) {
        return res.status(403).json({ error: "Acesso negado." });
    }

    try {
        if (type === 'folder') {
            fs.mkdirSync(fullPath, { recursive: true });
        } else {
            fs.writeFileSync(fullPath, content || '');
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ==========================================
// API: EXCLUIR ARQUIVO OU PASTA RECURSIVA
// ==========================================
app.post('/api/delete', (req, res) => {
    const { path: relPath } = req.body;
    const fullPath = path.join(ROOT, relPath || '');

    if (!fullPath.startsWith(ROOT) || fullPath === ROOT) {
        return res.status(403).json({ success: false, error: "Operação não permitida na raiz do sistema." });
    }

    try {
        if (fs.existsSync(fullPath)) {
            const stat = fs.lstatSync(fullPath);
            if (stat.isDirectory()) {
                fs.rmSync(fullPath, { recursive: true, force: true });
            } else {
                fs.unlinkSync(fullPath);
            }
            res.json({ success: true, message: "Item apagado com sucesso!" });
        } else {
            res.status(404).json({ success: false, error: "Item não encontrado no servidor." });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});


// ==========================================
// API: UPLOAD DIRETO DO CELULAR
// ==========================================
app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
        res.json({ success: true, message: "Upload concluído." });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});


// ==========================================
// API: COMPACTAR PARA ZIP
// ==========================================
app.post('/api/zip', (req, res) => {
    const { path: relPath } = req.body;
    const targetPath = path.join(ROOT, relPath || '');
    const outputZip = targetPath + '.zip';

    if (!targetPath.startsWith(ROOT)) {
        return res.status(403).json({ error: "Acesso negado." });
    }

    try {
        if (!fs.existsSync(targetPath)) {
            return res.status(404).json({ error: "Item alvo não encontrado." });
        }

        const zip = new AdmZip();
        const stat = fs.statSync(targetPath);

        if (stat.isDirectory()) {
            zip.addLocalFolder(targetPath);
        } else {
            zip.addLocalFile(targetPath);
        }

        zip.writeZip(outputZip);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ==========================================
// API: EXTRAIR PACOTE ZIP (UNZIP)
// ==========================================
app.post('/api/unzip', (req, res) => {
    const { path: relPath } = req.body;
    const targetPath = path.join(ROOT, relPath || '');
    const destDir = path.dirname(targetPath);

    if (!targetPath.startsWith(ROOT)) {
        return res.status(403).json({ error: "Acesso negado." });
    }

    try {
        if (!fs.existsSync(targetPath)) {
            return res.status(404).json({ error: "Arquivo ZIP não encontrado." });
        }

        const zip = new AdmZip(targetPath);
        zip.extractAllTo(destDir, true);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ==========================================
// API: COPIAR ARQUIVO OU DIRETÓRIO
// ==========================================
app.post('/api/copy', (req, res) => {
    const { source, destination } = req.body;
    const srcPath = path.join(ROOT, source || '');
    const destPath = path.join(ROOT, destination || '');

    if (!srcPath.startsWith(ROOT) || !destPath.startsWith(ROOT)) {
        return res.status(403).json({ error: "Acesso negado fora do escopo." });
    }

    try {
        if (!fs.existsSync(srcPath)) {
            return res.status(404).json({ error: "Item de origem não encontrado." });
        }

        const stat = fs.statSync(srcPath);
        if (stat.isDirectory()) {
            fs.cpSync(srcPath, destPath, { recursive: true });
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
        res.json({ success: true });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});


// ==========================================
// API: RECORTAR / MOVER / RENOMEAR
// ==========================================
app.post('/api/move', (req, res) => {
    const { source, destination } = req.body;
    const srcPath = path.join(ROOT, source || '');
    const destPath = path.join(ROOT, destination || '');

    if (!srcPath.startsWith(ROOT) || !destPath.startsWith(ROOT)) {
        return res.status(403).json({ error: "Acesso negado." });
    }

    try {
        fs.renameSync(srcPath, destPath);
        res.json({ success: true });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/rename', (req, res) => {
    const { source, destination } = req.body;
    const srcPath = path.join(ROOT, source || '');
    const destPath = path.join(ROOT, destination || '');

    if (!srcPath.startsWith(ROOT) || !destPath.startsWith(ROOT)) {
        return res.status(403).json({ error: "Acesso negado." });
    }

    try {
        fs.renameSync(srcPath, destPath);
        res.json({ success: true });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});


// ==========================================================
// CENTRAL DE ROTEAMENTO SOBERANO - CLIENTES / REPOSITÓRIOS
// ==========================================================

app.get('/go/:repo', (req, res) => {
    const repo = req.params.repo.toLowerCase();
    const indexHtmlPath = path.join(__dirname, 'clientes', repo, 'www', 'index.html');
         
    if (fs.existsSync(indexHtmlPath)) {
        res.sendFile(indexHtmlPath);
    } else {
        res.status(404).send('<h1 style="color:#ef4444;font-family:monospace;text-align:center;margin-top:50px;">⚠️ REPOSITÓRIO NÃO ENCONTRADO NO SEU TERRENO</h1>');
    }
});

app.get('/go/:repo/:file', (req, res) => {
    const { repo, file } = req.params;
    const filePath = path.join(__dirname, 'clientes', repo.toLowerCase(), 'www', file);
         
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('Not Found');
    }
});

// Inicialização do Servidor na porta 3000
app.listen(3000, () => {
    console.log("Servidor rodando perfeitamente na porta 3000.");
});
