/**
 * ========================================
 * NUEVO REMITO PAGE
 * ========================================
 */

const NuevoRemito = {

    cantidades: {},
    searchQuery: '',
    filterCategoria: 'all',
    showOnlySelected: false,

    remitoData: {
        nombre: '',
        lugar: '',
        fecha: '',
        persona: '',
        tipoEvento: '',
        notas: ''
    },

    editingId: null,

    async init(editId = null) {
        this.cantidades = {};
        for (const cat in EQUIPOS_DB) {
            EQUIPOS_DB[cat].items.forEach(eq => {
                this.cantidades[eq] = 0;
            });
        }

        this.searchQuery = '';
        this.filterCategoria = 'all';
        this.showOnlySelected = false;
        this.editingId = editId;

        if (editId) {
            const trabajo = await StorageService.getTrabajoById(editId);
            if (trabajo) {
                this.remitoData = {
                    nombre: trabajo.nombre || '',
                    lugar: trabajo.lugar || '',
                    fecha: trabajo.fecha || '',
                    persona: trabajo.persona || '',
                    tipoEvento: trabajo.tipoEvento || '',
                    notas: trabajo.notas || ''
                };
                if (trabajo.equipos) {
                    for (const eq in trabajo.equipos) {
                        this.cantidades[eq] = trabajo.equipos[eq];
                    }
                }
            }
        } else {
            this.remitoData = {
                nombre: '',
                lugar: '',
                fecha: new Date().toISOString().split('T')[0],
                persona: '',
                tipoEvento: '',
                notas: ''
            };
        }
    },

    async render(editId = null) {
        Navbar.render(
            editId ? 'Editar Remito' : 'Nuevo Remito',
            editId ? 'Modificar equipos del trabajo' : 'Seleccioná los equipos para el trabajo'
        );

        if (editId) {
            document.getElementById('page-content').innerHTML = `
                <div style="display:flex; align-items:center; justify-content:center; height:400px; flex-direction:column; gap:1rem">
                    <div class="loader-spinner"></div>
                    <p style="color: var(--text-secondary)">Cargando datos del trabajo...</p>
                </div>
            `;
        }

        await this.init(editId);

        const isEditing = !!this.editingId;
        const content = document.getElementById('page-content');

        const tipoOpts = TIPOS_EVENTO.map(t =>
            `<option value="${t}" ${this.remitoData.tipoEvento === t ? 'selected' : ''}>${t}</option>`
        ).join('');

        content.innerHTML = `
            <div class="remito-header">
                <div>
                    <h1>${isEditing ? '✏️ Editar Remito' : '📋 Nuevo Remito'}</h1>
                    <p>${isEditing ? 'Modificá los equipos y datos del trabajo' : 'Completá los datos y seleccioná los equipos necesarios'}</p>
                </div>
                <div class="remito-actions">
                    <button class="btn-outline" onclick="NuevoRemito.limpiarTodo()">
                        <span class="material-icons-round">restart_alt</span>
                        Limpiar
                    </button>
                </div>
            </div>

            <div class="remito-info-grid">
                <div class="remito-info-card">
                    <label>Nombre del Evento / Trabajo</label>
                    <input type="text" placeholder="Ej: Filmación Canal 7..."
                           value="${this.remitoData.nombre}"
                           onchange="NuevoRemito.updateField('nombre', this.value)" />
                </div>
                <div class="remito-info-card">
                    <label>Lugar</label>
                    <input type="text" placeholder="Ej: Casa de Gobierno..."
                           value="${this.remitoData.lugar}"
                           onchange="NuevoRemito.updateField('lugar', this.value)" />
                </div>
                <div class="remito-info-card">
                    <label>Fecha</label>
                    <input type="date" value="${this.remitoData.fecha}"
                           onchange="NuevoRemito.updateField('fecha', this.value)" />
                </div>
                <div class="remito-info-card">
                    <label>Persona / Cliente</label>
                    <input type="text" placeholder="Ej: Gobernador, Empresa X..."
                           value="${this.remitoData.persona}"
                           onchange="NuevoRemito.updateField('persona', this.value)" />
                </div>
                <div class="remito-info-card">
                    <label>Tipo de Evento</label>
                    <select onchange="NuevoRemito.updateField('tipoEvento', this.value)">
                        <option value="">Seleccionar tipo...</option>
                        ${tipoOpts}
                    </select>
                </div>
                <div class="remito-info-card">
                    <label>Notas</label>
                    <input type="text" placeholder="Notas adicionales..."
                           value="${this.remitoData.notas}"
                           onchange="NuevoRemito.updateField('notas', this.value)" />
                </div>
            </div>

            <div class="filter-bar">
                <div class="search-box">
                    <span class="material-icons-round">search</span>
                    <input type="text" placeholder="Buscar equipo..."
                           value="${this.searchQuery}"
                           oninput="NuevoRemito.buscar(this.value)" />
                </div>

                <button class="filter-chip ${this.filterCategoria === 'all' ? 'active' : ''}"
                        onclick="NuevoRemito.filtrarCategoria('all')">
                    Todos
                </button>

                ${Object.keys(EQUIPOS_DB).map(cat => `
                    <button class="filter-chip ${this.filterCategoria === cat ? 'active' : ''}"
                            onclick="NuevoRemito.filtrarCategoria('${cat}')">
                        ${EQUIPOS_DB[cat].emoji} ${cat.split(' ')[0]}
                    </button>
                `).join('')}

                <button class="filter-chip ${this.showOnlySelected ? 'active' : ''}"
                        onclick="NuevoRemito.toggleSeleccionados()"
                        style="margin-left: auto">
                    ✅ Solo seleccionados
                </button>
            </div>

            <div id="equipos-tabla-container"></div>

            <div class="remito-resumen" id="remito-resumen"></div>
        `;

        this.renderTabla();
        this.renderResumen();
    },

    renderTabla() {
        EquipoTable.render('equipos-tabla-container', this.cantidades, {
            searchQuery: this.searchQuery,
            filterCategoria: this.filterCategoria,
            showOnlySelected: this.showOnlySelected
        });
    },

    renderResumen() {
        const resumen = document.getElementById('remito-resumen');
        if (!resumen) return;

        const { tipos, total } = DataService.contarSeleccionados(this.cantidades);
        const categoriasActivas = DataService.contarCategoriasActivas(this.cantidades);

        resumen.innerHTML = `
            <div class="resumen-info">
                <div class="resumen-item">
                    <label>Tipos de equipo</label>
                    <span>${tipos}</span>
                </div>
                <div class="resumen-item">
                    <label>Total items</label>
                    <span>${total}</span>
                </div>
                <div class="resumen-item">
                    <label>Categorías</label>
                    <span>${categoriasActivas}</span>
                </div>
            </div>
            <div class="resumen-actions">
                <button class="btn-primary" onclick="NuevoRemito.previsualizarPDF()" ${total === 0 ? 'disabled style="opacity:0.5;cursor:not-allowed"' : ''}>
                    <span class="material-icons-round">picture_as_pdf</span>
                    Generar PDF
                </button>
                <button class="btn-success" onclick="NuevoRemito.guardarTrabajo()" ${total === 0 ? 'disabled style="opacity:0.5;cursor:not-allowed"' : ''}>
                    <span class="material-icons-round">save</span>
                    ${this.editingId ? 'Actualizar' : 'Guardar'}
                </button>
            </div>
        `;
    },

    cambiarCantidad(equipo, delta) {
        const newVal = (this.cantidades[equipo] || 0) + delta;
        if (newVal < 0) return;
        this.cantidades[equipo] = newVal;

        if (this.showOnlySelected) {
            // Con este filtro activo el ítem puede aparecer/desaparecer
            // de la lista, así que hay que reconstruir la tabla entera.
            this.renderTabla();
        } else {
            // Actualización puntual: no se toca el resto de la tabla,
            // por lo tanto el scroll no se mueve ni "salta" al principio.
            EquipoTable.actualizarFila(equipo, this.cantidades[equipo]);
        }

        this.renderResumen();
    },

    updateField(field, value) {
        this.remitoData[field] = value;
    },

    buscar(query) {
        this.searchQuery = query;
        this.renderTabla();
    },

    filtrarCategoria(cat) {
        this.filterCategoria = cat;
        this.renderTabla();
    },

    toggleSeleccionados() {
        this.showOnlySelected = !this.showOnlySelected;
        document.querySelectorAll('.filter-chip').forEach(chip => {
            if (chip.textContent.includes('Solo seleccionados')) {
                chip.classList.toggle('active', this.showOnlySelected);
            }
        });
        this.renderTabla();
    },

    limpiarTodo() {
        Modal.confirm({
            title: 'Limpiar todo',
            message: '¿Estás seguro de querer limpiar todas las cantidades?',
            icon: 'warning',
            confirmText: 'Sí, limpiar',
            onConfirm: () => {
                for (const eq in this.cantidades) {
                    this.cantidades[eq] = 0;
                }
                this.renderTabla();
                this.renderResumen();
                Toast.info('Limpiado', 'Se resetearon todas las cantidades');
            }
        });
    },

    async guardarTrabajo() {
        const { total } = DataService.contarSeleccionados(this.cantidades);

        if (total === 0) {
            Toast.warning('Sin equipos', 'Seleccioná al menos un equipo');
            return;
        }

        const equiposSeleccionados = {};
        for (const eq in this.cantidades) {
            if (this.cantidades[eq] > 0) {
                equiposSeleccionados[eq] = this.cantidades[eq];
            }
        }

        const trabajo = {
            ...this.remitoData,
            equipos: equiposSeleccionados
        };

        try {
            document.querySelectorAll('.resumen-actions button').forEach(b => {
                b.disabled = true;
                b.style.opacity = '0.5';
            });

            if (this.editingId) {
                await StorageService.updateTrabajo(this.editingId, trabajo);
                Toast.success('Actualizado', `"${trabajo.nombre || 'Sin nombre'}" actualizado en la nube ☁️`);
            } else {
                await StorageService.saveTrabajo(trabajo);
                Toast.success('Guardado', `"${trabajo.nombre || 'Sin nombre'}" guardado en la nube ☁️`);
            }

            Sidebar.update();

            setTimeout(() => {
                Router.navigate('historial');
            }, 800);

        } catch (error) {
            Toast.error('Error', 'No se pudo guardar. Verificá tu conexión.');
            document.querySelectorAll('.resumen-actions button').forEach(b => {
                b.disabled = false;
                b.style.opacity = '1';
            });
        }
    },

    previsualizarPDF() {
        const { total } = DataService.contarSeleccionados(this.cantidades);

        if (total === 0) {
            Toast.warning('Sin equipos', 'Seleccioná al menos un equipo');
            return;
        }

        const equiposSeleccionados = {};
        for (const eq in this.cantidades) {
            if (this.cantidades[eq] > 0) {
                equiposSeleccionados[eq] = this.cantidades[eq];
            }
        }

        const trabajo = {
            ...this.remitoData,
            equipos: equiposSeleccionados,
            numero: '----'
        };

        PDFService.descargar(trabajo);
        Toast.success('PDF Generado', 'Archivo descargado correctamente');
    }
};
