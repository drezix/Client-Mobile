try {
    require('electron-reloader')(module);
  } catch (_) {}
  
  const { app, BrowserWindow, ipcMain } = require('electron');
  const path = require('path');
  const { watchLcu, stopLcuWatcher } = require('./services/lcu'); 
  const { startServer, getServerInfo } = require('./services/server');
  // Não precisamos mais do lobbyController aqui para a inicialização
  
  let mainWindow;
  
  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
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
  
    // Apenas inicia os serviços. Sem testes automáticos.
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
  // Este handler pode ser usado no futuro para a funcionalidade real do app.
  // Por agora, ele não é usado pela interface.
  ipcMain.handle('get-server-info', async () => getServerInfo());