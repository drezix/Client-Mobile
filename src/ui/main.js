import { loadAllComponents, cacheDOMElements } from './ui-manager.js';
import { setupEventListeners } from './event-handlers.js';
import { setupApiListeners } from './api-listeners.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[main.js] DOM carregado. Iniciando a UI...');
    
    // ETAPA 1: Carrega todo o HTML dos componentes.
    const htmlLoaded = await loadAllComponents();
    if (!htmlLoaded) {
        console.error("[main.js] FALHA CRÍTICA: Não foi possível carregar os componentes da UI. A aplicação não pode continuar.");
        return;
    }

    // ETAPA 2: SÓ APÓS o HTML estar na página, fazemos o cache dos elementos.
    const elementsCached = cacheDOMElements();
    if (!elementsCached) {
        console.error("[main.js] FALHA CRÍTICA: Elementos essenciais da UI não foram encontrados no DOM. A aplicação não pode continuar.");
        return;
    }

    // ETAPA 3: Com o HTML carregado e os elementos em cache, configuramos os listeners.
    console.log('[main.js] UI pronta. Configurando listeners...');
    setupEventListeners();
    await setupApiListeners();
    console.log("[main.js] Aplicação totalmente inicializada.");
});