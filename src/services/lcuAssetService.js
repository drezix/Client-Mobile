const { makeLcuRequest } = require('./lcu');

/**
 * Busca a lista de campeões que o jogador possui.
 */
async function getOwnedChampions() {
    try {
        console.log('[Asset Service] Buscando campeões...');
        const champions = await makeLcuRequest('get', '/lol-champions/v1/owned-champions-minimal');
        console.log(`[Asset Service] ${champions.length} campeões encontrados.`);
        return champions;
    } catch (error) {
        console.error('[Asset Service] Falha ao buscar campeões:', error.message);
        return []; // Retorna um array vazio em caso de erro
    }
}

/**
 * Busca as páginas de runas do jogador.
 */
async function getCurrentRunePage() {
    try {
        console.log('[Asset Service] Buscando páginas de runas...');
        const runes = await makeLcuRequest('get', '/lol-perks/v1/pages');
        console.log(`[Asset Service] ${runes.length} páginas de runas encontradas.`);
        return runes;
    } catch (error) {
        console.error('[Asset Service] Falha ao buscar páginas de runas:', error.message);
        return [];
    }
}

/**
 * Busca o objeto completo de configurações do Quick Play do jogador.
 */
async function getQuickPlaySettings() {
    try {
        console.log('[Asset Service] Buscando configurações atuais do Quick Play...');
        // Usamos a v2 que parece ser a mais recente no seu log
        const settings = await makeLcuRequest('get', '/lol-settings/v2/account/LCUPreferences/lol-quick-play');
        return settings;
    } catch (error) {
        console.error('[Asset Service] Falha ao buscar configurações do Quick Play:', error.message);
        // Retorna um objeto padrão caso não exista
        return { data: { slotsByQueueId: {} }, schemaVersion: 1 };
    }
}

module.exports = {
    getOwnedChampions,
    getCurrentRunePage,
    getQuickPlaySettings
};