const lcuConnector = require('./lcu');
const assetService = require('./lcuAssetService'); 

// --- Funções de Ação Específicas ---

async function createLobby(queueId) {
    console.log(`>>> Criando lobby para fila ${queueId}...`);
    await lcuConnector.makeLcuRequest('post', '/lol-lobby/v2/lobby', { queueId });
    console.log('✅ Lobby criado.');
}

async function setRoles(primaryRole, secondaryRole) {
    console.log(`>>> Definindo rotas: ${primaryRole}/${secondaryRole}`);
    const payload = { firstPreference: primaryRole, secondPreference: secondaryRole };
    await lcuConnector.makeLcuRequest('put', '/lol-lobby/v2/lobby/members/localMember/position-preferences', payload);
    console.log('✅ Rotas definidas.');
}

async function startQueue() {
    console.log('>>> Iniciando a fila...');
    await lcuConnector.makeLcuRequest('post', '/lol-lobby/v2/lobby/matchmaking/search');
    console.log('✅ Fila iniciada.');
}

async function updateQuickPlayPreferences(config) {
    // Esta função já era assíncrona e chamava a API, apenas trocamos a chamada.
    console.log(`>>> Atualizando preferências do Quick Play...`);
    // ... (a lógica interna para montar o payload continua a mesma)
    const runePage = await assetService.getRunePages(); // Supondo que assetService foi atualizado
    if (!runePage || runePage.length === 0) {
        throw new Error("Nenhuma página de runas válida foi encontrada.");
    }
    const aRunePage = runePage.find(p => p.isValid) || runePage[0]; // Pega uma página válida
    
    const perksAsString = JSON.stringify({
            perkIds: runePage.perkIds,
            perkStyle: runePage.primaryStyleId,
            perkSubStyle: runePage.subStyleId,
        });

        const playerSlots = config.selections
            .filter(sel => sel.championId)
            .map(sel => ({
                championId: sel.championId,
                positionPreference: sel.position,
                perks: perksAsString,
                skinId: 0,
                spell1: 4, 
                spell2: 14,
            }));
        
        const settingsPayload = {
            schemaVersion: 1,
            data: { slotsByQueueId: { [config.queueId.toString()]: playerSlots } }
        };

        console.log("Enviando novas preferências...");

    await lcuConnector.makeLcuRequest('put', '/lol-settings/v2/account/LCUPreferences/lol-quick-play', settingsPayload);
    console.log("✅ Preferências do Quick Play atualizadas.");
}


// --- Função Principal de Fluxo (Refatorada para ser robusta) ---

async function startQueueFlow(config) {
    console.log(`>>> INICIANDO FLUXO para fila ${config.queueId}...`);
    
    const isQuickPlay = config.queueId === 490 || config.queueId === 1700; // Swiftplay, Brawl, etc.
    const isNormalOrRanked = [400, 420, 440].includes(config.queueId);
    
    try {
        if (isQuickPlay) {
            // Fluxo para modos como Swiftplay
            await updateQuickPlayPreferences(config);
            // Não precisamos esperar por um evento aqui, pois a preferência é salva na conta.
        }

        // Para todos os modos, criamos o lobby
        console.log('PASSO 1: Criando o lobby...');
        const lobbyPromise = lcuConnector.waitForEvent('/lol-lobby/v2/lobby');
        await createLobby(config.queueId);
        await lobbyPromise; // Espera o evento de confirmação
        console.log('PASSO 1 CONCLUÍDO: Lobby confirmado via WebSocket.');

        if (isNormalOrRanked) {
            // Fluxo para modos com seleção de rota
            console.log('PASSO 2: Definindo rotas...');
            const rolesPromise = lcuConnector.waitForEvent('/lol-lobby/v2/lobby');
            await setRoles(config.primaryRole, config.secondaryRole);
            await rolesPromise; // Espera o evento de confirmação
            console.log('PASSO 2 CONCLUÍDO: Rotas confirmadas via WebSocket.');
        }

        // Passo final: Iniciar a fila
        console.log('PASSO FINAL: Iniciando a fila...');
        await startQueue();
        console.log("\n✅ Fluxo completo finalizado com sucesso!");

    } catch (error) {
        console.error('\n❌ FALHA NO FLUXO PRINCIPAL. Motivo:', error.message);
        throw error;
    }
}

// --- Outras Ações (apenas trocam a chamada) ---

async function leaveQueue() {
    await lcuConnector.makeLcuRequest('delete', '/lol-lobby/v2/lobby/matchmaking/search');
    console.log('✅ Saiu da fila.');
}

async function acceptMatch() {
    await lcuConnector.makeLcuRequest('post', '/lol-matchmaking/v1/ready-check/accept');
    console.log('✅ Partida aceita.');
}

async function declineMatch() {
    await lcuConnector.makeLcuRequest('post', '/lol-matchmaking/v1/ready-check/decline');
    console.log('✅ Partida recusada.');
}

module.exports = {
    startQueueFlow,
    leaveQueue,
    acceptMatch,
    declineMatch,
};