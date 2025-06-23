/*try {
    require('electron-reloader')(module);
  } catch (_) {}*/
  
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { watchLcu, stopLcuWatcher, getLcuData } = require('./services/lcu'); 
const { startServer } = require('./services/server');
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
  // mainWindow.webContents.openDevTools(); 
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  startServer(mainWindow);
  watchLcu(mainWindow);
});

app.on('window-all-closed', () => {
  stopLcuWatcher();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --- Handlers de Comunicação ---
ipcMain.handle('get-owned-champions', async () => {
  return await assetService.getOwnedChampions();
});
ipcMain.handle('get-rune-pages', async () => {
  return await assetService.getRunePages();
});
ipcMain.handle('get-quick-play-settings', async () => {
  return await assetService.getQuickPlaySettings();
});
ipcMain.handle('get-initial-lcu-status', () => {
  console.log('[IPC] Fornecendo status inicial do LCU para a UI.');
  return getLcuData();
});  
ipcMain.handle('invoke-start-queue', async (event, config) => {
  console.log("Recebido evento 'Iniciar Fila' com a configuração:", config);
  await startQueueFlow(config);
});
ipcMain.handle('invoke-leave-queue', async () => {
  await leaveQueue();
});
ipcMain.handle('invoke-accept-match', async () => {
  await acceptMatch();
});
ipcMain.handle('invoke-decline-match', async () => {
  await declineMatch();
});