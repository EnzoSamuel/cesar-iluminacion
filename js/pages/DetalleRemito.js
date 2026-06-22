/**
 * ========================================
 * DETALLE REMITO PAGE
 * ========================================
 */

const DetalleRemito = {

    async render(id) {
        Navbar.render('Detalle del Remito', 'Cargando...');

        document.getElementById('page-content').innerHTML = `
            <div style="display:flex; align-items:center; justify-content:center; height:400px; flex-direction:column; gap:1rem">
                <div class="loader-spinner"></div>
                <p style="color: var(--text-secondary)">Cargando remito...</p>
            </div>
        `;

        const trabajo = await StorageService.getTrabajoById(id);

        if (!trabajo) {
            Navbar.render('Error', 'Trabajo no encontrado');
            document.getElementById('page-content').innerHTML = `
                <div class="empty-state">
                    <span class="material-icons-round">error</span>
                    <h3>Trabajo no encontrado</h3>
                    <p>El remito que buscás no existe o fue eliminado.</p>
                    <button class="btn-primary" onclick="Router.navigate('historial')">
                        <span class="material-icons-round">arrow_back</span>
                        Volver al Historial
                    </button>
                </div>
            `;
            return;
        }

        Navbar.render('Detalle del Remito', `#${trabajo.numero || '---'}`);

        const content = document.getElementById('page-content');
        const totalItems = trabajo.equipos ? Object.values(trabajo.equipos).reduce((a, b) => a + Number(b), 0) : 0;
        const tiposEquipo = trabajo.equipos ? Object.keys(trabajo.equipos).length : 0;

        content.innerHTML = `
            <div class="detalle-header">
                <button class="btn-icon" onclick="Router.navigate('historial')">
                    <span class="material-icons-round">arrow_back</span>
                </button>
                <div style="flex:1">
                    <h1>${trabajo.nombre || 'Sin nombre'}</h1>
                </div>
                <button class="btn-outline" onclick="Router.navigate('nuevo-remito', '${id}')">
                    <span class="material-icons-round">edit</span>
                    Editar
                </button>
                <button class="btn-primary" onclick="DetalleRemito.descargar('${id}')">
                    <span class="material-icons-round">download</span>
                    Descargar PDF
                </button>
            </div>

            <div class="detalle-meta">
                <div class="detalle-meta-card">
                    <label>Fecha</label>
                    <span>${DataService.formatearFechaCorta(trabajo.fecha)}</span>
                </div>
                <div class="detalle-meta-card">
                    <label>Lugar</label>
                    <span>${trabajo.lugar || '---'}</span>
                </div>
                <div class="detalle-meta-card">
                    <label>Persona / Cliente</label>
                    <span>${trabajo.persona || '---'}</span>
                </div>
                <div class="detalle-meta-card">
                    <label>Tipo de Evento</label>
                    <span>${trabajo.tipoEvento || '---'}</span>
                </div>
                <div class="detalle-meta-card">
                    <label>Total Items</label>
                    <span>${totalItems} equipos (${tiposEquipo} tipos)</span>
                </div>
                <div class="detalle-meta-card">
                    <label>Notas</label>
                    <span>${trabajo.notas || '---'}</span>
                </div>
            </div>

            <div class="table-container">
                <div class="table-header">
                    <h3>Equipos del Remito</h3>
                </div>
                <div id="detalle-equipos-tabla"></div>
            </div>
        `;

        this.renderTablaDetalle(trabajo);
    },

    renderTablaDetalle(trabajo) {
        const container = document.getElementById('detalle-equipos-tabla');
        if (!container || !trabajo.equipos) return;

        let html = '<table class="data-table"><thead><tr><th style="text-align:left">Equipo</th><th style="width:100px">Cantidad</th></tr></thead><tbody>';

        for (const cat in EQUIPOS_DB) {
            const catData = EQUIPOS_DB[cat];
            let catHasItems = false;
            const itemsHtml = [];

            catData.items.forEach(equipo => {
                if (trabajo.equipos[equipo] && trabajo.equipos[equipo] > 0) {
                    catHasItems = true;
                    itemsHtml.push(`
                        <tr>
                            <td style="text-align:left; padding-left:1.5rem">
                                <span class="equipo-nombre">${equipo}</span>
                            </td>
                            <td>
                                <span class="cantidad-valor has-items">${trabajo.equipos[equipo]}</span>
                            </td>
                        </tr>
                    `);
                }
            });

            if (catHasItems) {
                html += `
                    <tr class="categoria-row">
                        <td colspan="2">
                            <span class="material-icons-round" style="font-size:1rem; vertical-align:middle; margin-right:0.5rem; color:${catData.color}">${catData.icon}</span>
                            ${cat}
                        </td>
                    </tr>
                `;
                html += itemsHtml.join('');
            }
        }

        html += '</tbody></table>';
        container.innerHTML = html;
    },

    async descargar(id) {
        const trabajo = await StorageService.getTrabajoById(id);
        if (trabajo) {
            PDFService.descargar(trabajo);
            Toast.success('PDF Descargado', 'Archivo descargado correctamente');
        }
    }
};