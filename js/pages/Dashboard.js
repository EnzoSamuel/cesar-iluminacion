/**
 * ========================================
 * DASHBOARD PAGE
 * ========================================
 */

const Dashboard = {

    async render() {
        Navbar.render('Inicio', 'Resumen general');

        // Loading
        document.getElementById('page-content').innerHTML = `
            <div style="display:flex; align-items:center; justify-content:center; height:400px; flex-direction:column; gap:1rem">
                <div class="loader-spinner"></div>
                <p style="color: var(--text-secondary)">Cargando datos desde la nube...</p>
            </div>
        `;

        try {
            const stats = await StorageService.getEstadisticas();
            const trabajos = await StorageService.getTrabajos();
            const recientes = trabajos.slice(0, 5);

            const content = document.getElementById('page-content');

            content.innerHTML = `
                <div class="dashboard-welcome">
                    <h1>¡Bienvenido, Cesar! 👋</h1>
                    <p>Gestioná tus equipos de iluminación y llevá un registro de todos tus trabajos.</p>
                </div>

                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon blue">
                            <span class="material-icons-round">description</span>
                        </div>
                        <div class="stat-info">
                            <h4>Total Trabajos</h4>
                            <div class="stat-number">${stats.totalTrabajos}</div>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon green">
                            <span class="material-icons-round">calendar_month</span>
                        </div>
                        <div class="stat-info">
                            <h4>Este Mes</h4>
                            <div class="stat-number">${stats.trabajosMes}</div>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon amber">
                            <span class="material-icons-round">inventory_2</span>
                        </div>
                        <div class="stat-info">
                            <h4>Equipos Usados</h4>
                            <div class="stat-number">${stats.totalEquiposUsados}</div>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon red">
                            <span class="material-icons-round">category</span>
                        </div>
                        <div class="stat-info">
                            <h4>Categorías</h4>
                            <div class="stat-number">${Object.keys(EQUIPOS_DB).length}</div>
                        </div>
                    </div>
                </div>

                <div class="dashboard-section">
                    <div class="section-header">
                        <h2>Acciones Rápidas</h2>
                    </div>
                    <div class="quick-actions">
                        <button class="quick-action-btn" onclick="Router.navigate('nuevo-remito')">
                            <div class="action-icon blue">
                                <span class="material-icons-round">add_circle</span>
                            </div>
                            <div class="action-text">
                                <h4>Nuevo Remito</h4>
                                <p>Crear lista de equipos</p>
                            </div>
                        </button>

                        <button class="quick-action-btn" onclick="Router.navigate('historial')">
                            <div class="action-icon green">
                                <span class="material-icons-round">folder_open</span>
                            </div>
                            <div class="action-text">
                                <h4>Trabajos Realizados</h4>
                                <p>Ver historial completo</p>
                            </div>
                        </button>

                        <button class="quick-action-btn" onclick="Dashboard.verInventario()">
                            <div class="action-icon amber">
                                <span class="material-icons-round">inventory</span>
                            </div>
                            <div class="action-text">
                                <h4>Ver Inventario</h4>
                                <p>Lista completa de equipos</p>
                            </div>
                        </button>
                    </div>
                </div>

                <div class="dashboard-section">
                    <div class="section-header">
                        <h2>Últimos Trabajos</h2>
                        ${trabajos.length > 0 ? '<button class="btn-ghost" onclick="Router.navigate(\'historial\')">Ver todos <span class="material-icons-round" style="font-size:1rem">arrow_forward</span></button>' : ''}
                    </div>

                    ${recientes.length > 0 ? this.renderRecientes(recientes) : `
                        <div class="empty-state">
                            <span class="material-icons-round">assignment</span>
                            <h3>Sin trabajos registrados</h3>
                            <p>Creá tu primer remito para comenzar a llevar un registro.</p>
                            <button class="btn-primary" onclick="Router.navigate('nuevo-remito')">
                                <span class="material-icons-round">add</span>
                                Crear Primer Remito
                            </button>
                        </div>
                    `}
                </div>
            `;
        } catch (error) {
            document.getElementById('page-content').innerHTML = `
                <div class="empty-state">
                    <span class="material-icons-round" style="color: var(--danger)">cloud_off</span>
                    <h3>Error de conexión</h3>
                    <p>No se pudo conectar con la base de datos. Verificá tu internet.</p>
                    <button class="btn-primary" onclick="Dashboard.render()">
                        <span class="material-icons-round">refresh</span>
                        Reintentar
                    </button>
                </div>
            `;
        }
    },

    renderRecientes(trabajos) {
        let html = '<div class="trabajos-list">';

        trabajos.forEach(t => {
            const { dia, mes } = DataService.getDiaMes(t.fecha);
            const totalItems = t.equipos
                ? Object.values(t.equipos).reduce((a, b) => a + Number(b), 0)
                : 0;

            html += `
                <div class="trabajo-card" onclick="Router.navigate('detalle-remito', '${t.id}')">
                    <div class="trabajo-fecha">
                        <div class="dia">${dia}</div>
                        <div class="mes">${mes}</div>
                    </div>
                    <div class="trabajo-info">
                        <h4>${t.nombre || 'Sin nombre'}</h4>
                        <div class="trabajo-meta">
                            <span class="trabajo-meta-item">
                                <span class="material-icons-round">place</span>
                                ${t.lugar || 'Sin lugar'}
                            </span>
                            <span class="trabajo-meta-item">
                                <span class="material-icons-round">person</span>
                                ${t.persona || 'Sin persona'}
                            </span>
                            <span class="trabajo-meta-item">
                                <span class="material-icons-round">inventory_2</span>
                                ${totalItems} equipos
                            </span>
                        </div>
                    </div>
                    <span class="badge badge-info">${t.tipoEvento || 'Otro'}</span>
                </div>
            `;
        });

        html += '</div>';
        return html;
    },

    verInventario() {
        let itemsHtml = '';
        let total = 0;

        for (const cat in EQUIPOS_DB) {
            itemsHtml += `<strong style="color: ${EQUIPOS_DB[cat].color}">${EQUIPOS_DB[cat].emoji} ${cat}</strong>: ${EQUIPOS_DB[cat].items.length} equipos<br>`;
            total += EQUIPOS_DB[cat].items.length;
        }
        itemsHtml += `<br><strong>Total: ${total} equipos en el inventario</strong>`;

        Modal.open({
            title: 'Inventario de Equipos',
            icon: 'inventory',
            content: `<div style="line-height: 2">${itemsHtml}</div>`,
            footer: '<button class="btn-primary" onclick="Modal.close()">Cerrar</button>'
        });
    }
};