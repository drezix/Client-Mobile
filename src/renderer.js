const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    onLcuStatusUpdate: (callback) => ipcRenderer.on('lcu-status-update', (_event, value) => callback(value)),
    onQueueStatusUpdate: (callback) => ipcRenderer.on('lcu-queue-status-update', (_event, value) => callback(value)),
    onReadyCheckUpdate: (callback) => ipcRenderer.on('lcu-ready-check-update', (_event, value) => callback(value)),
    onServerStatusUpdate: (callback) => ipcRenderer.on('server-status-update', (_event, value) => callback(value)),

    getInitialLcuStatus: () => ipcRenderer.invoke('get-initial-lcu-status'),
    getInitialServerStatus: () => ipcRenderer.invoke('get-initial-server-status'),
    getOwnedChampions: () => ipcRenderer.invoke('get-owned-champions'),
    getRunePages: () => ipcRenderer.invoke('get-rune-pages'),
    invokeStartQueue: (config) => ipcRenderer.invoke('invoke-start-queue', config),
    invokeLeaveQueue: () => ipcRenderer.invoke('invoke-leave-queue'),
    invokeAcceptMatch: () => ipcRenderer.invoke('invoke-accept-match'),
    invokeDeclineMatch: () => ipcRenderer.invoke('invoke-decline-match'),
});
