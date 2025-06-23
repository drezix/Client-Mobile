// Este script agora lida com sucesso e falha, garantindo que o processo sempre termine.
// A principal mudança é parar o monitoramento assim que a primeira conexão for bem-sucedida.

console.log('Iniciando script de teste de integração LCU...');

const { watchLcu, stopLcuWatcher } = require('../src/services/lcu');
const { createRankedLobbyAndSetRoles } = require('../src/services/lobbyController');

// Flag para sabermos se o teste já foi iniciado e evitar execuções múltiplas
let testHasStarted = false;

async function runTests() {
  console.log('Aguardando conexão com o cliente do League of Legends...');

  const onLcuConnect = async () => {
    // Se o teste já foi acionado, ignora chamadas futuras.
    if (testHasStarted) return;
    testHasStarted = true;

    // AQUI ESTÁ A MUDANÇA CRUCIAL:
    // Paramos o monitoramento assim que temos a primeira conexão bem-sucedida.
    // Isso evita o loop de conectar/desconectar enquanto o teste está esperando para ser executado.
    stopLcuWatcher();
    console.log('LCU detectado. Monitoramento parado. Iniciando os testes em 3 segundos...');

    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
      // Roda a função de teste que queremos validar
      await createRankedLobbyAndSetRoles();
      console.log('\n--- Testes de integração finalizados com SUCESSO ---');
      process.exit(0); // Encerra com código 0 (sucesso)

    } catch (error) {
      console.error('\n--- Testes de integração finalizados com FALHA ---');
      process.exit(1); // Encerra com código 1 (erro)
    }
  };

  watchLcu(null, onLcuConnect);

  // Define um timeout. Se o LCU não for encontrado em 30 segundos, o teste falha.
  setTimeout(() => {
    // Só executa o timeout se o teste ainda não tiver começado
    if (!testHasStarted) {
        console.error('❌ TIMEOUT: Cliente do LoL não encontrado em 30 segundos. Encerrando teste.');
        stopLcuWatcher();
        process.exit(1); // Encerra o script com um código de erro.
    }
  }, 30000);
}

// Inicia a execução dos testes.
runTests();