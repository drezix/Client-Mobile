const express = require('express');
const os = require('os');
// CORREÇÃO: Importamos a instância do LCUConnector em vez das funções antigas.
const lcuConnector = require('./lcu');

const app = express();
const PORT = 3000;

let serverInstance = null;
let serverInfo = {
    ip: 'Não iniciado',
    port: PORT,
    status: 'stopped'
};

function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return '127.0.0.1'; // Fallback
}

function startServer(win) {
    app.use(express.json());

    // --- Definição das Rotas da nossa API ---

    // Rota de teste para verificar se o servidor está funcionando
    app.get('/status', (req, res) => {
        // CORREÇÃO: Usamos o método getStatus() do conector.
        res.json({ message: 'Servidor do LoL Controller está no ar!', lcu: lcuConnector.getStatus() });
    });

    // Rota para aceitar a partida
    app.post('/lol/accept-queue', async (req, res) => {
        try {
            console.log('Recebido comando via API para aceitar a partida.');
            // CORREÇÃO: Usamos o método makeLcuRequest do conector.
            const data = await lcuConnector.makeLcuRequest('post', '/lol-matchmaking/v1/ready-check/accept');
            res.status(200).json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    });
    
    // Rota para selecionar e confirmar um campeão
    app.post('/lol/pick-champion', async (req, res) => {
        const { championId, actionId } = req.body;
        if (!championId || !actionId) {
            return res.status(400).json({ success: false, message: 'championId e actionId são necessários.' });
        }

        try {
            console.log(`Recebido comando via API para pickar campeão ${championId} na ação ${actionId}`);
            const endpoint = `/lol-champ-select/v1/session/actions/${actionId}`;
            const body = { championId, completed: true };
            // CORREÇÃO: Usamos o método makeLcuRequest do conector.
            const data = await lcuConnector.makeLcuRequest('patch', endpoint, body);
            res.status(200).json({ success: true, data });
        } catch(error) {
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // Inicia o servidor e escuta na porta definida
    serverInstance = app.listen(PORT, '0.0.0.0', () => {
        serverInfo.ip = getLocalIp();
        serverInfo.status = 'running';
        console.log(`Servidor rodando em: http://${serverInfo.ip}:${PORT}`);
        // Notifica a UI que o servidor está no ar
        win.webContents.send('server-status-update', { status: 'running', ip: serverInfo.ip, port: PORT });
    });
}

function getServerInfo() {
    return serverInfo;
}

module.exports = { startServer, getServerInfo };
