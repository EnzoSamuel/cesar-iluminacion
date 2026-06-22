/**
 * ========================================
 * HISTORIAL PAGE
 * ========================================
 */

const Historial = {

    searchQuery: '',
    filterTipo: 'all',
    _trabajos: [],

    async render() {
        Navbar.render('Trabajos Realizados', 'Historial de remitos generados');

        document.getElementById('page-content').innerHTML = `
            <div style="display:flex; align-items:center; justify-content:center; height:400px; flex-direction:column; gap:1rem">
                <div class="loader-spinner"></div>
                <p style="color: var(--text-secondary)">Cargando trabajos desde la nube...</p>
            </div>
        `;

        try {
            this._trabajos = await StorageService.getTrabajos();
            const trabajosFiltrados = this.aplicarFiltros();

            const content = document.getElementById('page-content');

            content.innerHTML = `
                <div class="historial-header">
                    <div>
                        <h1>📁 Trabajos Realizados</h1>
                        <p>${this._trabajos.length} trabajo(s) registrado(s)</p>
                    </div>
                    <div class="remito-actions">
                        <button class="btn-primary" onclick="Router.navigate('nuevo-remito')">
                            <span class="material-icons-round">add</span>
                            Nuevo Remito
                        </button>
                    </div>
                </div>

                <div class="filter-bar">
                    <div class="search-box">
                        <span class="material-icons-round">search</span>
                        <input type="text" placeholder="Buscar trabajo..."
                               value="${this.searchQuery}"
                               oninput="Historial.buscar(this.value)" />
                    </div>

                    <button class="filter-chip ${this.filterTipo === 'all' ? 'active' : ''}"
                            onclick="Historial.filtrar('all')">
                        Todos
                    </button>

                    ${TIPOS_EVENTO.slice(0, 5).map(tipo => `
                        <button class="filter-chip ${this.filterTipo === tipo ? 'active' : ''}"
                                onclick="Historial.filtrar('${tipo}')">
                            ${tipo}
                        </button>
                    `).join('')}
                </div>

                <div id="historial-lista">
                    ${this.renderLista(trabajosFiltrados)}
                </div>
            `;
        } catch (error) {
            document.getElementById('page-content').innerHTML = `
                <div class="empty-state">
                    <span class="material-icons-round" style="color: var(--danger)">cloud_off</span>
                    <h3>Error de conexión</h3>
                    <p>No se pudo conectar con la base de datos.</p>
                    <button class="btn-primary" onclick="Historial.render()">
                        <span class="material-icons-round">refresh</span>
                        Reintentar
                    </button>
                </div>
            `;
        }
    },

    renderLista(trabajos) {
        if (trabajos.length === 0) {
            return `
                <div class="empty-state">
                    <span class="material-icons-round">folder_off</span>
                    <h3>${this.searchQuery || this.filterTipo !== 'all' ? 'No se encontraron resultados' : 'Sin trabajos registrados'}</h3>
                    <p>${this.searchQuery || this.filterTipo !== 'all' ? 'Probá con otros filtros' : 'Los remitos que guardes aparecerán aquí'}</p>
                    ${!this.searchQuery && this.filterTipo === 'all' ? `
                        <button class="btn-primary" onclick="Router.navigate('nuevo-remito')">
                            <span class="material-icons-round">add</span>
                            Crear Primer Remito
                        </button>
                    ` : ''}
                </div>
            `;
        }

        let html = '<div class="trabajos-list">';

        trabajos.forEach(t => {
            const { dia, mes } = DataService.getDiaMes(t.fecha);
            const totalItems = t.equipos ? Object.values(t.equipos).reduce((a, b) => a + Number(b), 0) : 0;
            const tiposEquipo = t.equipos ? Object.keys(t.equipos).length : 0;
            const badgeClass = this.getBadgeClass(t.tipoEvento);

            html += `
                <div class="trabajo-card">
                    <div class="trabajo-fecha" onclick="Router.navigate('detalle-remito', '${t.id}')" style="cursor:pointer">
                        <div class="dia">${dia}</div>
                        <div class="mes">${mes}</div>
                    </div>
                    <div class="trabajo-info" onclick="Router.navigate('detalle-remito', '${t.id}')" style="cursor:pointer">
                        <h4>${t.nombre || 'Sin nombre'}</h4>
                        <p>${t.lugar || 'Sin lugar especificado'}</p>
                        <div class="trabajo-meta">
                            <span class="trabajo-meta-item">
                                <span class="material-icons-round">person</span>
                                ${t.persona || '---'}
                            </span>
                            <span class="trabajo-meta-item">
                                <span class="material-icons-round">inventory_2</span>
                                ${totalItems} items (${tiposEquipo} tipos)
                            </span>
                            <span class="badge ${badgeClass}">${t.tipoEvento || 'Otro'}</span>
                        </div>
                    </div>
                    <div class="trabajo-actions-col">
                        <button class="btn-ghost" onclick="Historial.descargarPDF('${t.id}')" title="Descargar PDF">
                            <span class="material-icons-round">download</span>
                        </button>
                        <button class="btn-ghost" onclick="Router.navigate('nuevo-remito', '${t.id}')" title="Editar">
                            <span class="material-icons-round">edit</span>
                        </button>
                        <button class="btn-ghost" onclick="Historial.eliminar('${t.id}')" title="Eliminar" style="color: var(--danger)">
                            <span class="material-icons-round">delete</span>
                        </button>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        return html;
    },

    getBadgeClass(tipo) {
        if (!tipo) return 'badge-info';
        const t = tipo.toLowerCase();
        if (t.includes('gubernamental') || t.includes('gobierno')) return 'badge-warning';
        if (t.includes('publicidad') || t.includes('corporativo')) return 'badge-info';
        if (t.includes('cine') || t.includes('televisión')) return 'badge-success';
        if (t.includes('recital') || t.includes('show')) return 'badge-danger';
        return 'badge-info';
    },

    aplicarFiltros() {
        let trabajos = [...this._trabajos];

        if (this.filterTipo !== 'all') {
            trabajos = trabajos.filter(t => t.tipoEvento === this.filterTipo);
        }

        if (this.searchQuery.trim()) {
            const q = this.searchQuery.toLowerCase();
            trabajos = trabajos.filter(t =>
                (t.nombre || '').toLowerCase().includes(q) ||
                (t.lugar || '').toLowerCase().includes(q) ||
                (t.persona || '').toLowerCase().includes(q) ||
                (t.tipoEvento || '').toLowerCase().includes(q)
            );
        }

        return trabajos;
    },

    buscar(query) {
        this.searchQuery = query;
        const lista = document.getElementById('historial-lista');
        if (lista) {
            lista.innerHTML = this.renderLista(this.aplicarFiltros());
        }
    },

    filtrar(tipo) {
        this.filterTipo = tipo;
        this.render();
    },

    async descargarPDF(id) {
        const trabajo = this._trabajos.find(t => t.id === id) || await StorageService.getTrabajoById(id);
        if (trabajo) {
            PDFService.descargar(trabajo);
            Toast.success('PDF Descargado', `"${trabajo.nombre}" descargado`);
        }
    },

    async eliminar(id) {
        const trabajo = this._trabajos.find(t => t.id === id) || await StorageService.getTrabajoById(id);

        Modal.confirm({
            title: 'Eliminar Trabajo',
            message: `¿Estás seguro de eliminar "${trabajo?.nombre || 'este trabajo'}"? Esta acción no se puede deshacer.`,
            icon: 'delete',
            confirmText: 'Eliminar',
            onConfirm: async () => {
                try {
                    await StorageService.deleteTrabajo(id);
                    Toast.success('Eliminado', 'El trabajo fue eliminado correctamente');
                    Sidebar.update();
                    this.render();
                } catch (error) {
                    Toast.error('Error', 'No se pudo eliminar');
                }
            }
        });
    }
};