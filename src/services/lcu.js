const https = require('https');
const axios =require('axios');
const { getLeagueCredentials } = require('./lcuCredentials');
const WebSocket = require('ws');
const { EventEmitter } = require('events');


class LCUConnector {
    constructor() {
        this.credentials = null;
        this.ws = null;
        this.mainWindow = null;
        this.connectionInterval = null;
        this.eventEmitter = new EventEmitter(); 
    }

    // Inicia a tentativa de conexão
    watch(win) {
        this.mainWindow = win;
        console.log('Iniciando monitoramento do LCU...');
        this.connectionInterval = setInterval(async () => {
            try {
                if (!this.isConnected()) {
                    const credentials = await getLeagueCredentials();
                    this.connect(credentials);
                }
            } catch (error) {
                if (this.isConnected()) {
                    this.disconnect();
                }
            }
        }, 2000);
    }

    // Para o monitoramento
    stop() {
        clearInterval(this.connectionInterval);
        this.disconnect();
        console.log('Monitoramento do LCU parado.');
    }
    
    // Conecta ao WebSocket e notifica a UI
    connect(credentials) {
        if (this.ws) return;

        this.credentials = credentials;
        const url = `wss://127.0.0.1:${this.credentials.port}`;
        const token = Buffer.from(`riot:${this.credentials.token}`).toString('base64');

        console.log(`Tentando conectar ao WebSocket em ${url}...`);

        // AQUI ESTÁ A CORREÇÃO CRUCIAL:
        // Adicionamos as opções necessárias para a conexão ser aceita pela LCU.
        this.ws = new WebSocket(url, {
            rejectUnauthorized: false, // ESSENCIAL
            headers: {
                'Authorization': `Basic ${token}` // ESSENCIAL
            }
        });

        this.ws.on('open', () => {
            console.log(`✅ Conexão WebSocket estabelecida na porta: ${this.credentials.port}`);
            // A notificação para a UI deve vir daqui, no momento do sucesso.
            this.mainWindow.webContents.send('lcu-status-update', { status: 'connected' });
            // Se inscreve nos eventos da LCU
            this.ws.send('[5, "OnJsonApiEvent"]');
        });

        this.ws.on('message', this.handleEvent.bind(this));

        this.ws.on('error', (err) => {
            console.error('❌ Erro no WebSocket:', err.message);
            // O evento 'close' será chamado em seguida, não precisamos fazer nada aqui
        });

        this.ws.on('close', () => {
            // O evento 'close' é o local definitivo para tratar a desconexão
            this.disconnect();
        });
    }

    // Desconecta e notifica a UI
     disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null; // Garante que a próxima verificação tente reconectar
        }
        
        // Apenas notifique e logue se havia uma credencial ativa
        if (this.credentials) {
            this.credentials = null;
            console.log('LCU Desconectado.');
            if (this.mainWindow) {
                this.mainWindow.webContents.send('lcu-status-update', { status: 'disconnected' });
            }
        }
    }
    
    // Filtra os eventos do WebSocket e envia para a UI
    handleEvent(rawMessage) {
        // Primeiro, garante que a mensagem não é vazia antes de qualquer coisa.
        if (!rawMessage) {
            return; 
        }

        const messageString = rawMessage.toString();
        // Se a mensagem, depois de convertida para string, for vazia, ignora.
        if (!messageString.trim()) {
            return;
        }

        // AGORA, A MUDANÇA MAIS IMPORTANTE:
        // Envolvemos a parte perigosa (JSON.parse) em um bloco try...catch.
        try {
            const event = JSON.parse(rawMessage.toString());

            // A LCU envia eventos em um formato de array: [type, eventName, data]
            // Se não for um array com pelo menos 3 elementos, não é o que esperamos.
            if (!Array.isArray(event) || event.length < 3) {
                return;
            }
            
            const [type, eventName, data] = event;

            if (data && data.uri) {
                this.eventEmitter.emit(data.uri, data.data);
            }
            if (!data) {
                return;
            }

            // --- A partir daqui, a lógica é a mesma de antes ---

            // Evento de Ready Check
            if (data.uri === '/lol-matchmaking/v1/ready-check') {
                console.log('[WebSocket] Evento de Ready Check recebido:', data.data);
                // Adiciona uma checagem para garantir que a janela principal ainda existe
                if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                    this.mainWindow.webContents.send('lcu-ready-check-update', data.data);
                }
            }
            
            // Evento de Estado da Fila
            if (data.uri === '/lol-lobby/v2/lobby/matchmaking/search-state') {
                console.log('[WebSocket] Evento de Fila recebido:', data.data);
                if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                    this.mainWindow.webContents.send('lcu-queue-status-update', data.data);
                }
            }

        } catch (error) {
            // Se JSON.parse falhar, significa que a mensagem não era um JSON.
            // Em vez de quebrar a aplicação, nós simplesmente a ignoramos e talvez
            // a logamos no console para fins de depuração.
            console.warn('[WebSocket] Mensagem não-JSON recebida, ignorando:', messageString);
        }
    }

    waitForEvent(uri, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const listener = (data) => {
                clearTimeout(timer);
                resolve(data);
            };
            
            const timer = setTimeout(() => {
                this.eventEmitter.removeListener(uri, listener);
                reject(new Error(`Timeout: Evento '${uri}' não recebido em ${timeout}ms`));
            }, timeout);

            // Adiciona um ouvinte para o evento específico
            this.eventEmitter.once(uri, (data) => {
                clearTimeout(timer); // Limpa o timeout pois o evento chegou
                resolve(data);       // Resolve a promise com os dados do evento
            });
        });
    }

    isConnected() {
        return this.credentials && this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    getStatus() {
        if (!this.isConnected()) {
            return { connected: false };
        }
        // Retorna um objeto similar ao antigo lcuData
        return {
            port: this.credentials.port,
            // Não é seguro expor o token, mas se precisar do encoded, pode adicioná-lo
            // encodedToken: Buffer.from(`riot:${this.credentials.token}`).toString('base64'),
            connected: true
        };
    }
    
    // makeLcuRequest permanece similar, mas usando this.credentials
    async makeLcuRequest(method, endpoint, body = null) {
        // 1. Checa a conexão usando o método da classe
        if (!this.isConnected()) {
            throw new Error('LCU não está conectado.');
        }

        // 2. Usa as credenciais armazenadas em 'this.credentials'
        const url = `https://127.0.0.1:${this.credentials.port}${endpoint}`;
        const agent = new https.Agent({ rejectUnauthorized: false });
        
        // 3. Gera o token de autorização a partir de 'this.credentials'
        const encodedToken = Buffer.from(`riot:${this.credentials.token}`).toString('base64');

        try {
            // A chamada do axios permanece a mesma
            const response = await axios({
                method,
                url,
                httpsAgent: agent,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${encodedToken}`, // Usa o token gerado
                },
                data: body,
            });
            return response.data;
        } catch (error) {
            // Logar o erro com mais detalhes pode ser útil
            console.error(`Falha na requisição LCU para ${endpoint}:`, error.message);
            throw error; // Repassa o erro para quem chamou a função
        }
    }
}

// Exporta uma única instância (Singleton) para toda a aplicação usar
module.exports = new LCUConnector();