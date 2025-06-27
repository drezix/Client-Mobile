export const DOMElements = {};
let queueTimerInterval = null;
let queueSeconds = 0;

async function loadComponent(containerId, url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const html = await response.text();
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = html;
        } else {
            // Este erro é crítico, pois o esqueleto principal (index.html) está quebrado.
            console.error(`[loadComponent] Container de componente #${containerId} não existe no index.html.`);
            return false;
        }
        return true;
    } catch (error) {
        console.error(`[loadComponent] Falha ao carregar ${url}:`, error);
        return false;
    }
}

// NOVA FUNÇÃO para orquestrar o carregamento
export async function loadAllComponents() {
    const results = await Promise.all([
        loadComponent('status-container', './ui/components/status-cards.html'),
        loadComponent('controls-container', './ui/components/controls.html'),
        loadComponent('ready-check-container', './ui/components/ready-check.html')
    ]);
    // Retorna true apenas se TODOS os componentes foram carregados com sucesso.
    return results.every(res => res === true);
}

// NOVA FUNÇÃO para fazer o cache e validar
export function cacheDOMElements() {
    const ids = [
        'lcu-indicator', 'lcu-status-text', 'queue-status-text', 'start-queue-btn',
        'leave-queue-btn', 'game-mode-select', 'primary-role-select', 
        'secondary-role-select', 'accept-btn', 'decline-btn', 'controls-container',
        'ready-check-container', 'ready-check-timer', 'server-indicator', 
        'server-status-text', 'server-address'
    ];
    let allFound = true;
    ids.forEach(id => {
        DOMElements[id] = document.getElementById(id);
        if (!DOMElements[id]) {
            console.error(`[cacheDOMElements] Elemento CRÍTICO não encontrado: #${id}`);
            allFound = false;
        }
    });
    DOMElements.allConfigPanels = document.querySelectorAll('.config-panel');
    return allFound;
}

export function updateLcuUi(isConnected) {
    if (!DOMElements.lcuIndicator) return;
    DOMElements.lcuIndicator.classList.toggle('online', isConnected);
    DOMElements.lcuStatusText.textContent = isConnected ? 'Conectado' : 'Desconectado';
    
    document.querySelectorAll('.custom-select, .action-btn').forEach(control => {
        if (!control.closest('.ready-check-section')) {
            control.disabled = !isConnected;
        }
    });
    
    if (isConnected) {
        populateChampionSelects();
        handleGameModeChange();
        handleRoleSelection();
    }
}

export function updateServerUi(data) {
    if (!DOMElements.serverIndicator) return;
    const isRunning = data.status === 'running';
    DOMElements.serverIndicator.classList.toggle('online', isRunning);
    DOMElements.serverStatusText.textContent = isRunning ? 'Rodando' : 'Parado';
    DOMElements.serverAddress.textContent = isRunning ? `${data.ip}:${data.port}` : '...';
}
export async function populateChampionSelects() {
    const championSelects = document.querySelectorAll('.champion-select');
    if (!championSelects.length || (championSelects[0] && championSelects[0].length > 1)) return;
    try {
        const ownedChampions = await window.api.getOwnedChampions();
        const sorted = ownedChampions.sort((a, b) => a.name.localeCompare(b.name));
        championSelects.forEach(select => {
            select.innerHTML = '<option value="">Selecione...</option>';
            sorted.forEach(champion => {
                const option = document.createElement('option');
                option.value = champion.id;
                option.textContent = champion.name;
                select.appendChild(option);
            });
        });
    } catch (error) {
        console.error('Falha ao popular campeões:', error);
    }
}

export function handleGameModeChange() {
    if (!DOMElements.allConfigPanels || !DOMElements.gameModeSelect) return;
    DOMElements.allConfigPanels.forEach(panel => panel.style.display = 'none');
    const selectedOption = DOMElements.gameModeSelect.options[DOMElements.gameModeSelect.selectedIndex];
    if (selectedOption) {
        const panelId = selectedOption.dataset.configPanel;
        if (panelId) {
            const panelToShow = document.getElementById(panelId);
            if (panelToShow) panelToShow.style.display = 'block';
        }
    }
}

export function handleRoleSelection() {
    if (!DOMElements.primaryRoleSelect || !DOMElements.secondaryRoleSelect) return;
    const primary = DOMElements.primaryRoleSelect.value;
    DOMElements.secondaryRoleSelect.disabled = (primary === 'FILL');
    Array.from(DOMElements.secondaryRoleSelect.options).forEach(opt => {
        opt.disabled = (opt.value === primary && primary !== 'FILL');
    });
}

export function updateQueueUi(data) {
    if (!data || !DOMElements.queueStatusText) return;
    const isInQueue = data.searchState === 'Searching';
    if (isInQueue) {
        if (!queueTimerInterval) {
            queueSeconds = 0;
            DOMElements.queueStatusText.textContent = 'Na Fila (0s)';
            queueTimerInterval = setInterval(() => {
                queueSeconds++;
                DOMElements.queueStatusText.textContent = `Na Fila (${queueSeconds}s)`;
            }, 1000);
        }
    } else {
        if (queueTimerInterval) clearInterval(queueTimerInterval);
        queueTimerInterval = null;
        DOMElements.queueStatusText.textContent = 'Inativa';
    }
    if (DOMElements.leaveQueueBtn) DOMElements.leaveQueueBtn.style.display = isInQueue ? 'inline-block' : 'none';
    if (DOMElements.startQueueBtn) DOMElements.startQueueBtn.style.display = isInQueue ? 'none' : 'inline-block';
}

export function updateReadyCheckUi(data) {
    if (!data || !DOMElements.readyCheckContainer) return;
    const isReadyCheckActive = data.state === 'InProgress';
    DOMElements.controlsContainer.style.display = isReadyCheckActive ? 'none' : 'block';
    DOMElements.readyCheckContainer.style.display = isReadyCheckActive ? 'block' : 'none';
    if (isReadyCheckActive) {
        DOMElements.readyCheckTimer.textContent = `Tempo restante: ${Math.floor(data.timer || 0)}s`;
    }
}