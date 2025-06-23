console.log('Iniciando script de teste de integração LCU...');

// Importamos diretamente os serviços que precisamos para o teste
const { watchLcu, stopLcuWatcher } = require('../src/services/lcu');
const { createRankedLobbyAndSetRoles } = require('../src/services/lobbyController');

/**
 * Função principal que controla o fluxo do teste.
 */
async function runTests() {
  console.log('Aguardando conexão com o cliente do League of Legends...');

  // A função de callback que será executada quando o LCU for encontrado.
  const onLcuConnect = async () => {
    console.log('LCU detectado. Iniciando os testes em 3 segundos...');
    
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Roda a função de teste que queremos validar
    await createRankedLobbyAndSetRoles();
    
    console.log('\n--- Testes de integração finalizados ---');
    
    // Para o monitoramento e encerra o script com sucesso
    stopLcuWatcher();
    process.exit(0); 
  };

  // Inicia o monitoramento do LCU. Note que não passamos 'mainWindow', pois não temos uma janela neste script.
  // O 'watchLcu' precisa ser ligeiramente ajustado para lidar com isso (ver abaixo).
  watchLcu(null, onLcuConnect);

  // Define um timeout. Se o LCU não for encontrado em 30 segundos, o teste falha.
  setTimeout(() => {
    console.error('❌ TIMEOUT: Cliente do LoL não encontrado em 30 segundos. Encerrando teste.');
    stopLcuWatcher();
    process.exit(1); // Encerra o script com um código de erro.
  }, 30000);
}

// Inicia a execução dos testes.
runTests();