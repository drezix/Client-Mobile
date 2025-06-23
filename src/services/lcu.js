// Serviço responsável por toda a lógica de interação com o League of Legends Client Update (LCU) API.

const https = require('https'); // Corrigido para usar o módulo nativo https
const axios = require('axios');
const { exec } = require('child_process');

let lcuData = null;
let lcuWatcherInterval = null;
let mainWindow = null;
let hasConnectedOnce = false; 

function getLeagueCredentials() {
  return new Promise((resolve, reject) => {
    const command = process.platform === 'win32'
      ? 'wmic PROCESS WHERE "name=\'LeagueClientUx.exe\'" GET commandline'
      : 'ps x -o args | grep "LeagueClientUx"';

    exec(command, (error, stdout) => {
      if (error || !stdout || !stdout.includes('--remoting-auth-token=')) {
        return reject('Cliente do LoL não encontrado.');
      }
      
      const tokenMatch = stdout.match(/--remoting-auth-token=([^ "]+)/);
      const portMatch = stdout.match(/--app-port=([^ "]+)/);

      if (!tokenMatch || !portMatch) return reject('Não foi possível extrair token ou porta.');
      resolve({ token: tokenMatch[1], port: portMatch[1] });
    });
  });
}

async function watchLcu(win, onFirstConnect) {
    mainWindow = win;
    console.log('Iniciando monitoramento do LCU...');
    
    lcuWatcherInterval = setInterval(async () => {
        try {
            const credentials = await getLeagueCredentials();
            const newData = {
                port: credentials.port,
                encodedToken: Buffer.from(`riot:${credentials.token}`).toString('base64'),
                connected: true,
            };

            if (JSON.stringify(lcuData) !== JSON.stringify(newData)) {
                lcuData = newData;
                console.log(`LCU Conectado na porta: ${lcuData.port}`);
                mainWindow.webContents.send('lcu-status-update', { status: 'connected', port: lcuData.port });

                if (!hasConnectedOnce && typeof onFirstConnect === 'function') {
                    hasConnectedOnce = true;
                    onFirstConnect(); 
                }
            }
        } catch (error) {
            // AQUI ESTÁ A MUDANÇA MAIS IMPORTANTE
            // Se o estado anterior era nulo (nunca conectou), mostramos o erro de busca.
            if (lcuData === null) {
                // Imprime a mensagem de erro do 'reject' da função getLeagueCredentials
                console.error(`Erro ao procurar LCU: ${error}`);
            }
            
            if (lcuData && lcuData.connected) {
                console.log('LCU Desconectado.');
                lcuData = { connected: false };
                hasConnectedOnce = false; 
                // Apenas tenta enviar a mensagem para a janela se ela existir
                if (mainWindow) {
                    mainWindow.webContents.send('lcu-status-update', { status: 'disconnected' });
                }
            } else if (lcuData) {
                // Se já estava desconectado, apenas reseta os dados sem logar de novo
                lcuData.connected = false;
            }
        }
    }, 2000); 
}

function stopLcuWatcher() {
    if (lcuWatcherInterval) {
        clearInterval(lcuWatcherInterval);
        console.log('Monitoramento do LCU parado.');
    }
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
        console.error(`Erro na requisição LCU para ${endpoint}:`, error.message);
        throw error;
    }
}

module.exports = { getLcuData, makeLcuRequest, watchLcu, stopLcuWatcher };