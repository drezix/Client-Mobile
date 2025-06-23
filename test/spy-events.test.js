const WebSocket = require('ws');
const fs = require('fs'); // Importa o módulo File System
const path = require('path'); // Importa o módulo Path para lidar com caminhos
const { getLeagueCredentials } = require('../src/services/lcuCredentials');

// Define o caminho do arquivo de log
const logFilePath = path.join(__dirname, 'lcu-events.log');

console.log('--- Ferramenta de Espionagem de Eventos da LCU ---');
console.log(`Todos os eventos serão salvos em: ${logFilePath}`);
console.log('Aguardando conexão com o cliente do League of Legends...\n');

// Limpa o arquivo de log antigo no início de cada execução
fs.writeFileSync(logFilePath, '--- Início do Log de Eventos da LCU ---\n\n');

async function startSpy() {
    try {
        const credentials = await getLeagueCredentials();
        const url = `wss://127.0.0.1:${credentials.port}`;
        const token = Buffer.from(`riot:${credentials.token}`).toString('base64');
        
        console.log(`Conectando ao WebSocket em ${url}...\n`);

        const ws = new WebSocket(url, {
            protocolVersion: 13,
            origin: `https://127.0.0.1:${credentials.port}`,
            headers: { 
                'Authorization': `Basic ${token}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
            },
            rejectUnauthorized: false
        });

        ws.on('open', () => {
            console.log('✅ Conexão WebSocket estabelecida.');
            ws.send('[5, "OnJsonApiEvent"]', (error) => {
                if (error) {
                    console.error('❌ FALHA AO ENVIAR MENSAGEM DE INSCRIÇÃO:', error);
                } else {
                    console.log('✅ Mensagem de inscrição enviada com sucesso. Ouvindo eventos e salvando no log...');
                }
            }); 
        });

        ws.on('message', (data) => {
            try {
                const event = JSON.parse(data.toString());
                if (Array.isArray(event) && event.length > 2 && typeof event[2] === 'object' && event[2] !== null) {
                    const eventData = event[2]; 
                    
                    // Prepara a string para ser salva no arquivo
                    const logEntry = 
`----------------------------------------------------------------
Evento Recebido - URI: ${eventData.uri} | Tipo: ${eventData.eventType}
----------------------------------------------------------------
Dados do Evento:
${JSON.stringify(eventData.data, null, 2)}
\n\n`;

                    // AQUI ESTÁ A MUDANÇA: Adiciona o conteúdo ao arquivo de log
                    fs.appendFileSync(logFilePath, logEntry);

                    // Loga uma mensagem curta no terminal apenas para sabermos que algo foi recebido
                    console.log(`Evento capturado: ${eventData.eventType} em ${eventData.uri}. Detalhes salvos no log.`);
                }
            } catch (e) {
                // Ignora mensagens não-JSON
            }
        });

        ws.on('error', (err) => {
            console.error('❌ Erro no WebSocket:', err.message);
            fs.appendFileSync(logFilePath, `\n--- ERRO NO WEBSOCKET: ${err.message} ---\n`);
        });

        ws.on('close', (code, reason) => {
            console.log(`Conexão WebSocket fechada. Código: ${code}`);
            fs.appendFileSync(logFilePath, `\n--- CONEXÃO FECHADA: CÓDIGO ${code} ---\n`);
        });

    } catch (error) {
        console.error(`❌ Falha ao iniciar o espião: ${error.message}`);
    }
}

startSpy();