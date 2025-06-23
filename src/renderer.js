const { contextBridge, ipcRenderer } = require('electron');
const { getQuickPlaySettings } = require('./services/lcuAssetService');

contextBridge.exposeInMainWorld('api', {
    // Eventos
    onLcuStatusUpdate: (callback) => ipcRenderer.on('lcu-status-update', (_event, value) => callback(value)),
    onQueueStatusUpdate: (callback) => ipcRenderer.on('lcu-queue-status-update', (_event, value) => callback(value)),
    onReadyCheckUpdate: (callback) => ipcRenderer.on('lcu-ready-check-update', (_event, value) => callback(value)),
    
    // Ações (Invocations)
    getInitialLcuStatus: () => ipcRenderer.invoke('get-initial-lcu-status'),
    getOwnedChampions: () => ipcRenderer.invoke('get-owned-champions'),
    getRunePages: () => ipcRenderer.invoke('get-rune-pages'),
    getQuickPlaySettings: () => ipcRenderer.invoke('get-quick-play-settings'),
    invokeStartQueue: (config) => ipcRenderer.invoke('invoke-start-queue', config),
    invokeLeaveQueue: () => ipcRenderer.invoke('invoke-leave-queue'),
    invokeAcceptMatch: () => ipcRenderer.invoke('invoke-accept-match'),
    invokeDeclineMatch: () => ipcRenderer.invoke('invoke-decline-match'),
});

// O código abaixo será executado no contexto da página web (index.html)
window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado. O renderer está pronto.');
    // Você pode adicionar aqui código para interagir com o DOM assim que ele estiver pronto
});