const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());

// CORS LIBERADO PARA AS SUAS CONEXÕES PRIVADAS
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// COMO ESTÁ TUDO NA MESMA PASTA, SERVE OS ARQUIVOS DIRETO DA RAIZ
app.use(express.static(__dirname));

// ROTA RAIZ: Entrega o seu index.html que está ao lado do server.js
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Armazenamento em memória volátil para o índice da antena
let cacheEstrutura = { files: [] };

app.get('/api/list', (req, res) => {
    res.json(cacheEstrutura);
});

app.post('/api/sync', (req, res) => {
    cacheEstrutura = req.body;
    res.json({ success: true });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log('ANTENA JDP ATIVA NA PORTA ' + PORT));
