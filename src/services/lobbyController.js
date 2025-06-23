const { makeLcuRequest } = require('./lcu');
const assetService = require('./lcuAssetService');

/**
 * Define as preferências de rota para o jogador local no lobby atual.
 * @param {string} primaryRole - A rota primária (ex: "MIDDLE").
 * @param {string} secondaryRole - A rota secundária (ex: "BOTTOM").
 */
async function setRoles(primaryRole, secondaryRole) {
    console.log(`>>> Definindo rotas para ${primaryRole} / ${secondaryRole}...`);
    try {
        const payload = {
            "firstPreference": primaryRole,
            "secondPreference": secondaryRole
        };
        await makeLcuRequest('put', '/lol-lobby/v2/lobby/members/localMember/position-preferences', payload);
        console.log('✅ SUCESSO! Rotas definidas.');
    } catch(error) {
        console.error('❌ FALHA AO DEFINIR ROTAS. Motivo:', error.message);
    }
}

async function startQueue() {
    try {
        console.log('>>> ETAPA 3: Tentando iniciar a fila...');
        // Este endpoint não precisa de um corpo (payload) na requisição.
        await makeLcuRequest('post', '/lol-lobby/v2/lobby/matchmaking/search');
        console.log('✅ SUCESSO! Fila iniciada.');
    } catch(error) {
        console.error('❌ FALHA AO INICIAR A FILA. Motivo:', error.message);
        throw error;
    }
}

async function createLobby(queueId) {
    console.log(`>>> ETAPA 1: Tentando criar lobby para fila ${queueId}...`);
    const lobbyPayload = { queueId };
    await makeLcuRequest('post', '/lol-lobby/v2/lobby', lobbyPayload);
    console.log('✅ SUCESSO! Lobby criado.');
}

async function updateQuickPlayPreferences(config) {
    console.log(">>> Atualizando preferências do Quick Play...");
    try {
        // 1. Busca as configurações atuais para não sobrescrever outros modos
        const currentSettings = await assetService.getQuickPlaySettings();

        // 2. Busca uma página de runas válida para usar como modelo
        const currentRunePage = await assetService.getCurrentRunePage();
        if (!currentRunePage) throw new Error("Nenhuma página de runas válida selecionada.");
        
        // 3. Constrói o objeto de runas e o transforma em uma string JSON
        const perksAsString = JSON.stringify({
            perkIds: currentRunePage.perkIds,
            perkStyle: currentRunePage.primaryStyleId,
            perkSubStyle: currentRunePage.subStyleId,
        });

        // 4. Monta os novos "slots" com base na seleção da UI
        const newSlots = config.selections
            .filter(sel => sel.championId) // Garante que não há campeões nulos
            .map(sel => ({
                championId: sel.championId,
                positionPreference: sel.position,
                perks: perksAsString, // Usa a string JSON de runas
                spell1: 4, // Flash
                spell2: 14 // Ignite
            }));
        
        // 5. Atualiza o objeto de configurações com os novos slots para a fila específica
        currentSettings.data.slotsByQueueId[config.queueId.toString()] = newSlots;

        console.log("Enviando novas preferências:", JSON.stringify(currentSettings, null, 2));

        // 6. Envia o objeto de configurações completo de volta para a API
        await makeLcuRequest('put', '/lol-settings/v2/account/LCUPreferences/lol-quick-play', currentSettings);
        
        console.log("✅ SUCESSO! Preferências do Quick Play atualizadas.");

    } catch(error) {
        console.error('❌ FALHA AO ATUALIZAR PREFERÊNCIAS. Motivo:', error.message);
        throw error;
    }
}

/**
 * Inicia o fluxo correto de ações com base na configuração recebida da UI.
 * @param {object} config - Objeto de configuração da UI.
 * @param {number} config.queueId - O ID da fila selecionada.
 * @param {string} [config.primaryRole] - A rota primária (opcional).
 * @param {string} [config.secondaryRole] - A rota secundária (opcional).
 */
async function startQueueFlow(config) {
    console.log(`>>> INICIANDO FLUXO para fila ${config.queueId}...`);
    try {
        // ID 490 é Swiftplay, mas seu log mostrou que a preferência pode ser salva como 480. Usaremos o ID real.
        const isQuickSearch = config.queueId === 490 || config.queueId === 1700;
        
        if (isQuickSearch) {
            // Primeiro, atualiza as preferências do jogador
            await updateQuickPlayPreferences(config);
            await new Promise(resolve => setTimeout(resolve, 500));
            // Depois, tenta criar um lobby e iniciar a fila. A API usará as preferências salvas.
            await createLobby(config.queueId);
            await new Promise(resolve => setTimeout(resolve, 500));
            await startQueue();
        } else {
            // Fluxo normal para outros modos
            await createLobby(config.queueId);
            await new Promise(resolve => setTimeout(resolve, 500)); 
            await setRoles(config.primaryRole, config.secondaryRole);
            await new Promise(resolve => setTimeout(resolve, 500));
            await startQueue();
        }
        
        console.log("\nFluxo completo finalizado com sucesso!");
    } catch (error) {
        console.error('\n❌ FALHA NO FLUXO PRINCIPAL. Motivo:', error.message);
        throw error;
    }
}
  
/**
 * Cancela a busca por uma partida no lobby atual.
 */
async function leaveQueue() {
    try {
        console.log('>>> Tentando sair da fila...');
        // A ação de sair da fila é um DELETE no mesmo endpoint de buscar.
        await makeLcuRequest('delete', '/lol-lobby/v2/lobby/matchmaking/search');
        console.log('✅ SUCESSO! Saiu da fila.');
    } catch(error) {
        console.error('❌ FALHA AO SAIR DA FILA. Motivo:', error.message);
        throw error;
    }
}

/**
 * Aceita a partida encontrada (Ready Check).
 */
async function acceptMatch() {
    try {
        console.log('>>> Aceitando a partida...');
        await makeLcuRequest('post', '/lol-matchmaking/v1/ready-check/accept');
        console.log('✅ SUCESSO! Partida aceita.');
    } catch(error) {
        console.error('❌ FALHA AO ACEITAR. Motivo:', error.message);
        throw error;
    }
}

/**
 * Recusa a partida encontrada (Ready Check).
 */
async function declineMatch() {
    try {
        console.log('>>> Recusando a partida...');
        await makeLcuRequest('post', '/lol-matchmaking/v1/ready-check/decline');
        console.log('✅ SUCESSO! Partida recusada.');
    } catch(error) {
        console.error('❌ FALHA AO RECUSAR. Motivo:', error.message);
        throw error;
    }
}

module.exports = {
    startQueueFlow,
    leaveQueue,
    acceptMatch,
    declineMatch,
};