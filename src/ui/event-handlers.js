import { DOMElements, handleGameModeChange, handleRoleSelection } from './ui-manager.js';

export function setupEventListeners() {
    DOMElements.gameModeSelect.addEventListener('change', handleGameModeChange);
    DOMElements.primaryRoleSelect.addEventListener('change', handleRoleSelection);
    DOMElements.secondaryRoleSelect.addEventListener('change', handleRoleSelection);
    DOMElements.leaveQueueBtn.addEventListener('click', () => window.api.invokeLeaveQueue());
    DOMElements.acceptBtn.addEventListener('click', () => window.api.invokeAcceptMatch());
    DOMElements.declineBtn.addEventListener('click', () => window.api.invokeDeclineMatch());
    
    DOMElements.startQueueBtn.addEventListener('click', () => {
        const config = { queueId: parseInt(DOMElements.gameModeSelect.value, 10) };
        const selectedOption = DOMElements.gameModeSelect.options[DOMElements.gameModeSelect.selectedIndex];
        const panelId = selectedOption.dataset.configPanel;
        
        if (panelId === 'role-select-config') {
             config.primaryRole = DOMElements.primaryRoleSelect.value;
             config.secondaryRole = DOMElements.secondaryRoleSelect.value;
        }
        // ... Lógica para outros painéis
        window.api.invokeStartQueue(config);
    });
}