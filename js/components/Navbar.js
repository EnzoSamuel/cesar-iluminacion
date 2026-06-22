/**
 * ========================================
 * NAVBAR COMPONENT
 * ========================================
 */

const Navbar = {

    render(title = 'Dashboard', subtitle = '') {
        const navbar = document.getElementById('navbar');

        const now = new Date();
        const dateStr = now.toLocaleDateString('es-AR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        // Capitalizar primera letra
        const dateFormatted = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

        navbar.innerHTML = `
            <div class="navbar-left">
                <button class="btn-menu-toggle" onclick="Sidebar.toggle()">
                    <span class="material-icons-round">menu</span>
                </button>
                <div>
                    <div class="navbar-title">${title}</div>
                    ${subtitle ? `<div class="navbar-subtitle">${subtitle}</div>` : ''}
                </div>
            </div>
            <div class="navbar-right">
                <span class="current-date">${dateFormatted}</span>
            </div>
        `;

        // Actualizar clases según sidebar
        const isCollapsed = StorageService.get(StorageService.KEYS.SIDEBAR, false);
        navbar.classList.toggle('sidebar-collapsed', isCollapsed);
    }
};