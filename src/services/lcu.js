const https = require('https');
const axios =require('axios');
const { getLeagueCredentials } = require('./lcuCredentials');

let lcuData = null;
let mainWindow = null;

// Variáveis de estado para os monitores
let lcuWatcherInterval = null;
let queueWatcherInterval = null;
let readyCheckWatcherInterval = null;
let lastQueueState = null;
let lastReadyCheckState = null;

// Monitores individuais
function startQueueWatcher() {
    if (queueWatcherInterval) return;
    console.log('Monitor de Fila iniciado.');
    queueWatcherInterval = setInterval(async () => {
        if (!lcuData?.connected) return;
        try {
            const response = await makeLcuRequest('get', '/lol-lobby/v2/lobby/matchmaking/search-state');
            const { searchState } = response;
            
            if (searchState !== lastQueueState) {
                console.log(`[Queue Watcher] Estado da fila mudou: ${lastQueueState} -> ${searchState}`);
                lastQueueState = searchState;
                if (mainWindow) mainWindow.webContents.send('lcu-queue-status-update', { searchState });
            }
        } catch (error) {
            if (lastQueueState !== 'Invalid') {
                console.log('[Queue Watcher] Fila tornou-se inválida (provavelmente saiu do lobby).');
                lastQueueState = 'Invalid';
                if (mainWindow) mainWindow.webContents.send('lcu-queue-status-update', { searchState: 'Invalid' });
            }
        }
    }, 1500);
}

function stopQueueWatcher() {
    if (queueWatcherInterval) {
        clearInterval(queueWatcherInterval);
        queueWatcherInterval = null;
        console.log('Monitor de Fila parado.');
    }
}

function startReadyCheckWatcher() {
    if (readyCheckWatcherInterval) return;
    console.log('Monitor de Ready Check iniciado.');
    readyCheckWatcherInterval = setInterval(async () => {
        if (!lcuData?.connected) return;
        try {
            const response = await makeLcuRequest('get', '/lol-matchmaking/v1/ready-check');
            const { state, timer } = response;
            if (state !== lastReadyCheckState || state === 'InProgress') {
                lastReadyCheckState = state;
                if (mainWindow) mainWindow.webContents.send('lcu-ready-check-update', { state, timer });
            }
        } catch (error) {
            if (lastReadyCheckState !== 'Invalid') {
                lastReadyCheckState = 'Invalid';
                if (mainWindow) mainWindow.webContents.send('lcu-ready-check-update', { state: 'Invalid', timer: 0 });
            }
        }
    }, 1000);
}

function stopReadyCheckWatcher() {
    if (readyCheckWatcherInterval) {
        clearInterval(readyCheckWatcherInterval);
        readyCheckWatcherInterval = null;
        console.log('Monitor de Ready Check parado.');
    }
}

// Monitor principal do LCU
async function watchLcu(win) {
    mainWindow = win;
    console.log('Iniciando monitoramento do LCU...');
    
    lcuWatcherInterval = setInterval(async () => {
        try {
            const credentials = await getLeagueCredentials();
            if (!lcuData || !lcuData.connected) {
                lcuData = { 
                    port: credentials.port,
                    encodedToken: Buffer.from(`riot:${credentials.token}`).toString('base64'),
                    connected: true 
                };
                console.log(`LCU Conectado na porta: ${lcuData.port}`);
                if (mainWindow) mainWindow.webContents.send('lcu-status-update', { status: 'connected' });
                startQueueWatcher();
                startReadyCheckWatcher();
            }
        } catch (error) {
            if (lcuData && lcuData.connected) {
                lcuData.connected = false;
                console.log('LCU Desconectado.');
                if (mainWindow) mainWindow.webContents.send('lcu-status-update', { status: 'disconnected' });
                stopQueueWatcher();
                stopReadyCheckWatcher();
            }
        }
    }, 2000); 
}

function stopLcuWatcher() {
    if (lcuWatcherInterval) clearInterval(lcuWatcherInterval);
    stopQueueWatcher();
    stopReadyCheckWatcher();
    console.log('Monitoramento do LCU parado.');
}

function getLcuData() {
    return lcuData;
}

async function makeLcuRequest(method, endpoint, body = null) {
    if (!lcuData || !lcuData.connected) throw new Error('LCU não está conectado.');

    const url = `https://127.0.0.1:${lcuData.port}${endpoint}`;
    const agent = new https.Agent({ rejectUnauthorized: false });

    try {
        const response = await axios({
            method,
            url,
            httpsAgent: agent,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${lcuData.encodedToken}`,
            },
            data: body,
        });
        return response.data;
    } catch (error) {
        throw error;
    }
}

module.exports = { makeLcuRequest, watchLcu, stopLcuWatcher, getLcuData };