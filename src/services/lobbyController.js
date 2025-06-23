const { makeLcuRequest } = require('./lcu');

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

/**
 * Cria um novo lobby ranqueado e, em seguida, define as rotas primária e secundária.
 */
async function createRankedLobbyAndSetRoles() {
  console.log('>>> INICIANDO FLUXO: Criar Lobby e Definir Rotas...');
  try {
    // Etapa 1: Criar o Lobby
    const lobbyPayload = {
      queueId: 420 // ID para Ranqueada Solo/Duo
    };
    await makeLcuRequest('post', '/lol-lobby/v2/lobby', lobbyPayload);
    console.log('✅ SUCESSO! Lobby criado.');

    // Etapa 2: Definir as Rotas
    // Aguarda um instante para garantir que o lobby está pronto para receber o próximo comando
    await new Promise(resolve => setTimeout(resolve, 500)); 
    await setRoles("MIDDLE", "BOTTOM");
    
    console.log("Fluxo finalizado com sucesso!");

  } catch (error) {
    console.error('❌ FALHA NO FLUXO DE CRIAÇÃO DE LOBBY. Motivo:', error.message);
    console.error('Isso pode acontecer se você já estiver em um lobby.');
  }
}

// Exportamos a função principal do nosso controller para ser usada em outros arquivos.
module.exports = {
    createRankedLobbyAndSetRoles
};