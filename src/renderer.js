const { contextBridge, ipcRenderer } = require('electron');

// Expõe funções seguras do Node/Electron para o seu HTML/JS frontend
contextBridge.exposeInMainWorld('api', {
  getServerInfo: () => ipcRenderer.invoke('get-server-info'),
  getLcuData: () => ipcRenderer.invoke('get-lcu-data'),
  onLcuStatusUpdate: (callback) => ipcRenderer.on('lcu-status-update', (_event, value) => callback(value)),
  onServerStatusUpdate: (callback) => ipcRenderer.on('server-status-update', (_event, value) => callback(value)),

  createLobby: () => ipcRenderer.invoke('test-create-lobby'),
});

// O código abaixo será executado no contexto da página web (index.html)
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM carregado. O renderer está pronto.');
  // Você pode adicionar aqui código para interagir com o DOM assim que ele estiver pronto
});