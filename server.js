const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// DIRETÓRIO FÍSICO DO CRIADOR (TEMPORÁRIO NO RENDER)
const ROOT = path.join(__dirname, 'storage');
if (!fs.existsSync(ROOT)) fs.mkdirSync(ROOT, { recursive: true });

// CONEXÃO DIRETA DO CRIADOR SR. JOSÉ
const MONGO_URI = "mongodb+srv://pradodalapa_db_user:O5emEdBLe4GHH3Jg@cluster0.vfsxonr.mongodb.net/?appName=Cluster0";
let db = null;

// Conecta ao MongoDB e reconstrói as pastas apagadas pelo Render
async function conectarEPreservar() {
    try {
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        db = client.db('helena_preservation');
        console.log("[HELENA CORE]: Conexão com o banco de dados estabelecida com sucesso!");
        
        // Executa a reconstrução das pastas e arquivos salvos
        await restaurarArquivosDoBanco();
    } catch (err) {
        console.error("[HELENA CORE] ERRO CRÍTICO DE CONEXÃO:", err.message);
    }
}

// Salva arquivos/pastas no banco de dados para evitar que o Render apague
async function salvarNoBanco(caminhoRelativo, tipo, conteudo = "") {
    if (!db) return;
    try {
        const colecao = db.collection('arquivos_vivos');
        await colecao.updateOne(
            { path: caminhoRelativo },
            { $set: { path: caminhoRelativo, type: tipo, content: conteudo, updatedAt: new Date() } },
            { upsert: true }
        );
        console.log(`[HELENA CORE]: Item preservado na Nuvem: ${caminhoRelativo}`);
    } catch (err) {
        console.error("[HELENA CORE]: Erro ao salvar cópia de segurança:", err.message);
    }
}

// Puxa tudo do Banco de Dados e recria na pasta local física quando o Render reiniciar
async function restaurarArquivosDoBanco() {
    if (!db) return;
    try {
        const colecao = db.collection('arquivos_vivos');
        const arquivos = await colecao.find({}).toArray();
        
        console.log(`[HELENA CORE]: Iniciando varredura e reconstrução de ${arquivos.length} itens...`);
        
        for (const item of arquivos) {
            const caminhoFisico = path.join(ROOT, item.path);
            const diretorioPai = path.dirname(caminhoFisico);
            
            if (!fs.existsSync(diretorioPai)) {
                fs.mkdirSync(diretorioPai, { recursive: true });
            }
            
            if (item.type === 'folder') {
                if (!fs.existsSync(caminhoFisico)) {
                    fs.mkdirSync(caminhoFisico, { recursive: true });
                    console.log(`[RECONSTRUÇÃO]: Pasta recriada -> ${item.path}`);
                }
            } else {
                fs.writeFileSync(caminhoFisico, item.content || '');
                console.log(`[RECONSTRUÇÃO]: Arquivo recriado -> ${item.path}`);
            }
        }
        console.log("[HELENA CORE]: Reconstrução concluída. Sistema pronto para operação.");
    } catch (err) {
        console.error("[HELENA CORE]: Falha na recuperação automática:", err.message);
    }
}

// INTERFACE DO PAINEL PRINCIPAL
const servePainelPrincipal = (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
};

app.get('/', servePainelPrincipal);
app.get('/index.html', servePainelPrincipal);
app.get('/Index.html', servePainelPrincipal);

// API DE LISTAGEM
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

// API DE CRIAÇÃO (Salva no disco local E envia para a Nuvem de Preservação)
app.post('/api/create', async (req, res) => {
    const { type, name, content, path: relPath } = req.body;
    const targetDir = path.join(ROOT, relPath);
    const fullPath = path.join(targetDir, name);
    const caminhoRelativoItem = path.join(relPath, name);

    try {
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        if (type === 'folder') {
            fs.mkdirSync(fullPath, { recursive: true });
            await salvarNoBanco(caminhoRelativoItem, 'folder');
        } else {
            fs.writeFileSync(fullPath, content || '');
            await salvarNoBanco(caminhoRelativoItem, 'file', content || '');
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Erro ao criar item: " + err.message });
    }
});

// ROTA SUPREMA DE DIRETÓRIOS VIVOS
app.get('/:caminho(*)', (req, res, next) => {
    const caminhoSolicitado = req.params.caminho;
    const caminhoLower = caminhoSolicitado.toLowerCase();

    if (caminhoSolicitado.startsWith('api/') || caminhoSolicitado === 'favicon.ico' || caminhoLower === 'index.html') {
        return next();
    }

    const fullPath = path.join(ROOT, caminhoSolicitado);

    if (fs.existsSync(fullPath)) {
        const stat = fs.statSync(fullPath);

        if (stat.isFile()) {
            const ext = path.extname(fullPath).toLowerCase();
            if (ext === '.html') res.setHeader('Content-Type', 'text/html; charset=utf-8');
            else if (ext === '.css') res.setHeader('Content-Type', 'text/css; charset=utf-8');
            else if (ext === '.js') res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
            else if (ext === '.json') res.setHeader('Content-Type', 'application/json; charset=utf-8');
            
            return res.sendFile(fullPath);
        }
                  
        if (stat.isDirectory()) {
            const indexPath = path.join(fullPath, 'index.html');
            if (fs.existsSync(indexPath)) {
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                return res.sendFile(indexPath);
            }
        }
    }

    res.status(404).set('Content-Type', 'text/html; charset=utf-8').send(`
        
[HELENA CORE] ROTA INDISPONÍVEL
ERRO 404 — REQUISITO NÃO LOCALIZADO NO ARMAZENAMENTO


                Caminho solicitado: /${caminhoSolicitado}

                Status: Inexistente no diretório físico storage/.
            
Retornar ao Painel Principal

    `);
});

// EXECUÇÃO DO SERVIDOR E INICIALIZAÇÃO DA AUTO-PRESERVAÇÃO
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`[HELENA CORE]: Servidor Ativo na Porta ${PORT}`);
    await conectarEPreservar();
});
 
