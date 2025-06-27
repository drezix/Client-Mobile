const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const lcuConnector = require('./services/lcu'); 
const { getServerInfo, startServer } = require('./services/server');
const { startQueueFlow, leaveQueue, acceptMatch, declineMatch } = require('./services/lobbyController');
const assetService = require('./services/lcuAssetService');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 1000,
    webPreferences: {
      preload: path.join(__dirname, 'renderer.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    resizable: false,
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}


app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  startServer(mainWindow);
  // --- MUDANÇA 2: Iniciar o monitoramento através do conector ---
  lcuConnector.watch(mainWindow);
});

app.on('window-all-closed', () => {
  // --- MUDANÇA 3: Parar o monitoramento através do conector ---
  lcuConnector.stop();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --- MUDANÇA 4: Handlers de Comunicação Atualizados ---

// Este handler não muda aqui, mas o assetService precisa ser atualizado internamente
ipcMain.handle('get-owned-champions', async () => {
  return await assetService.getOwnedChampions();
});

// Este handler também não muda aqui
ipcMain.handle('get-rune-pages', async () => {
  // ATENÇÃO: Renomeei para getRunePages pois busca todas.
  // Se quiser a página ativa, o endpoint é outro.
  return await assetService.getRunePages(); 
});

// ESTE É O HANDLER QUE CAUSOU O ERRO
ipcMain.handle('get-initial-lcu-status', () => {
  console.log('[IPC] Fornecendo status inicial do LCU para a UI.');
  // Acessamos o status através de um método do nosso conector
  return lcuConnector.getStatus(); 
});

// Os handlers de ação não mudam aqui, pois a lógica está encapsulada
// no lobbyController. O lobbyController é que precisa ser atualizado.
ipcMain.handle('invoke-start-queue', async (event, config) => {
  console.log("Recebido evento 'Iniciar Fila' com a configuração:", config);
  try {
    await startQueueFlow(config);
    return { success: true };
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Um erro desconhecido ocorreu.';
    console.error(`[IPC] Falha ao iniciar fila:`, errorMessage);
    return { success: false, error: errorMessage };
  }
});

ipcMain.handle('invoke-leave-queue', async () => {
  return await leaveQueue();
});

ipcMain.handle('invoke-accept-match', async () => {
  return await acceptMatch();
});

ipcMain.handle('invoke-decline-match', async () => {
  return await declineMatch();
});

ipcMain.handle('get-initial-server-status', () => {
    return getServerInfo();
});