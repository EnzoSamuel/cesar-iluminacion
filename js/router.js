/**
 * ========================================
 * ROUTER
 * ========================================
 * Maneja la navegación entre páginas
 */

const Router = {

    currentPage: 'dashboard',
    currentParam: null,

    pages: {
        'dashboard': () => Dashboard.render(),
        'nuevo-remito': (param) => NuevoRemito.render(param),
        'historial': () => Historial.render(),
        'detalle-remito': (param) => DetalleRemito.render(param)
    },

    navigate(page, param = null) {
        if (!this.pages[page]) {
            console.error('Página no encontrada:', page);
            return;
        }

        this.currentPage = page;
        this.currentParam = param;

        // Cerrar sidebar en mobile
        Sidebar.closeMobile();

        // Scroll al top
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Renderizar página
        this.pages[page](param);

        // Actualizar sidebar active state
        Sidebar.update();
    },

    init() {
        this.navigate('dashboard');
    }
};