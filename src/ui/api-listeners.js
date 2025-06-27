import { updateLcuUi, updateQueueUi, updateReadyCheckUi, updateServerUi } from './ui-manager.js';

export async function setupApiListeners() {
    window.api.onLcuStatusUpdate((data) => {
        updateLcuUi(data.status === 'connected');
    });
    
    window.api.onServerStatusUpdate(updateServerUi);
    window.api.onQueueStatusUpdate(updateQueueUi);
    window.api.onReadyCheckUpdate(updateReadyCheckUi);

    try {
        const lcuStatus = await window.api.getInitialLcuStatus();
        updateLcuUi(lcuStatus.connected);
    } catch (error) {
        console.error('[api-listeners] Falha ao buscar status inicial da LCU:', error);
    }
}