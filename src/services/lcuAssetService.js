const lcuConnector = require('./lcu');

/**
 * Busca a lista de campeões que o jogador possui.
 */
async function getOwnedChampions() {
    try {
        console.log('[Asset Service] Buscando campeões...');
        // Usa o método da instância do conector
        const champions = await lcuConnector.makeLcuRequest('get', '/lol-champions/v1/owned-champions-minimal');
        console.log(`[Asset Service] ${champions.length} campeões encontrados.`);
        return champions;
    } catch (error) {
        console.error('[Asset Service] Falha ao buscar campeões:', error.message);
        return [];
    }
}

async function getRunePages() { // Renomeado para maior clareza
    try {
        console.log('[Asset Service] Buscando páginas de runas...');
        const runes = await lcuConnector.makeLcuRequest('get', '/lol-perks/v1/pages');
        console.log(`[Asset Service] ${runes.length} páginas de runas encontradas.`);
        return runes;
    } catch (error) {
        console.error('[Asset Service] Falha ao buscar páginas de runas:', error.message);
        return [];
    }
}


module.exports = {
    getOwnedChampions,
    getRunePages
};