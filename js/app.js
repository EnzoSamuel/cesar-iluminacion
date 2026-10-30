/**
 * ========================================
 * APP - MAIN ENTRY POINT
 * ========================================
 * Cesar Iluminación - Sistema de Gestión
 */

(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', async () => {

        // Inicializar componentes
        Toast.init();
        FondoEpico.init();

        // Inventario (equipos propios, ocultos, categorías). Si falla, la app
        // sigue con el catálogo base.
        try { await InventarioService.init(); } catch (e) { console.warn(e); }

        // Inicializar sidebar (carga stats de Firebase)
        await Sidebar.init();

        // Iniciar router (carga dashboard)
        Router.init();

        // Ocultar loading screen
        setTimeout(() => {
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.classList.add('hidden');
                setTimeout(() => loadingScreen.remove(), 500);
            }
        }, 800);

        console.log('%c🎬 Cesar Iluminación - Sistema de Gestión', 'color: #3b67b2; font-size: 16px; font-weight: bold;');
        console.log('%c☁️ Sistema con base de datos en la nube', 'color: #28a745; font-size: 12px;');

    });

})();