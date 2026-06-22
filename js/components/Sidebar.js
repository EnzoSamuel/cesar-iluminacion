/**
 * ========================================
 * SIDEBAR COMPONENT
 * ========================================
 */

const Sidebar = {

    element: null,
    isCollapsed: false,
    _statsCache: { totalTrabajos: 0 },

    async init() {
        this.element = document.getElementById('sidebar');
        this.isCollapsed = StorageService.getLocal(StorageService.KEYS.SIDEBAR, false);
        await this.loadStats();
        this.render();
        this.applyState();
    },

    async loadStats() {
        try {
            this._statsCache = await StorageService.getEstadisticas();
        } catch (e) {
            this._statsCache = { totalTrabajos: 0 };
        }
    },

    render() {
        const stats = this._statsCache;

        this.element.innerHTML = `
            <div class="sidebar-header">
                <div class="sidebar-logo">💡</div>
                <div class="sidebar-brand">
                    <h3>Cesar Iluminación</h3>
                    <span>Sistema de Gestión</span>
                </div>
            </div>

            <nav class="sidebar-nav">
                <div class="sidebar-section-title">Principal</div>

                <div class="nav-item ${Router.currentPage === 'dashboard' ? 'active' : ''}"
                     onclick="Router.navigate('dashboard')">
                    <span class="material-icons-round">dashboard</span>
                    <span class="nav-item-text">Inicio</span>
                </div>

                <div class="nav-item ${Router.currentPage === 'nuevo-remito' ? 'active' : ''}"
                     onclick="Router.navigate('nuevo-remito')">
                    <span class="material-icons-round">add_circle</span>
                    <span class="nav-item-text">Nuevo Remito</span>
                </div>

                <div class="sidebar-section-title">Registros</div>

                <div class="nav-item ${Router.currentPage === 'historial' ? 'active' : ''}"
                     onclick="Router.navigate('historial')">
                    <span class="material-icons-round">history</span>
                    <span class="nav-item-text">Trabajos Realizados</span>
                    ${stats.totalTrabajos > 0 ? `<span class="nav-item-badge">${stats.totalTrabajos}</span>` : ''}
                </div>
            </nav>

            <div class="sidebar-toggle">
                <button class="btn-collapse" onclick="Sidebar.toggleCollapse()">
                    <span class="material-icons-round">${this.isCollapsed ? 'chevron_right' : 'chevron_left'}</span>
                    <span class="btn-collapse-text">Colapsar</span>
                </button>
            </div>
        `;

        let overlay = document.querySelector('.sidebar-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            overlay.onclick = () => this.closeMobile();
            document.body.appendChild(overlay);
        }
    },

    applyState() {
        this.element.classList.toggle('collapsed', this.isCollapsed);
        document.querySelector('.main-wrapper')?.classList.toggle('sidebar-collapsed', this.isCollapsed);
        document.getElementById('navbar')?.classList.toggle('sidebar-collapsed', this.isCollapsed);
    },

    toggleCollapse() {
        this.isCollapsed = !this.isCollapsed;
        StorageService.saveLocal(StorageService.KEYS.SIDEBAR, this.isCollapsed);
        this.applyState();
        this.render();
    },

    toggle() {
        this.element.classList.toggle('active');
        document.querySelector('.sidebar-overlay')?.classList.toggle('active');
    },

    closeMobile() {
        this.element.classList.remove('active');
        document.querySelector('.sidebar-overlay')?.classList.remove('active');
    },

    async update() {
        await this.loadStats();
        this.render();
        this.applyState();
    }
};