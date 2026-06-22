/**
 * ========================================
 * EQUIPO TABLE COMPONENT
 * ========================================
 * Renderiza las tablas de equipos con controles de cantidad
 */

const EquipoTable = {

    /**
     * Renderizar tabla completa con todas las categorías
     */
    render(containerId, cantidades, opciones = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const {
            searchQuery = '',
            filterCategoria = 'all',
            showOnlySelected = false,
            readOnly = false
        } = opciones;

        let categorias = EQUIPOS_DB;

        // Si hay búsqueda
        if (searchQuery.trim()) {
            categorias = DataService.buscarEquipos(searchQuery) || {};
        }

        // Si filtro por categoría
        if (filterCategoria !== 'all') {
            const filtered = {};
            if (categorias[filterCategoria]) {
                filtered[filterCategoria] = categorias[filterCategoria];
            }
            categorias = filtered;
        }

        // Si solo mostrar seleccionados
        if (showOnlySelected) {
            const filtered = {};
            for (const cat in categorias) {
                const items = categorias[cat].items.filter(eq => cantidades[eq] > 0);
                if (items.length > 0) {
                    filtered[cat] = { ...categorias[cat], items };
                }
            }
            categorias = filtered;
        }

        // Verificar si hay resultados
        if (Object.keys(categorias).length === 0) {
            container.innerHTML = `
                <div class="table-container">
                    <table class="data-table">
                        <tbody>
                            <tr>
                                <td class="tabla-vacia">
                                    <span class="material-icons-round">search_off</span>
                                    ${searchQuery ? 'No se encontraron equipos' : showOnlySelected ? 'No hay equipos seleccionados' : 'No hay equipos para mostrar'}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;
            return;
        }

        let html = '<div class="table-container"><div class="table-scrollable"><table class="data-table">';

        html += `
            <thead>
                <tr>
                    <th style="text-align:left; width: 55%">Equipo</th>
                    <th style="width: 15%">Cantidad</th>
                    ${!readOnly ? '<th style="width: 30%">Acción</th>' : ''}
                </tr>
            </thead>
            <tbody>
        `;

        for (const cat in categorias) {
            const catData = categorias[cat];
            const colSpan = readOnly ? 2 : 3;

            html += `
                <tr class="categoria-row">
                    <td colspan="${colSpan}">
                        <span class="material-icons-round" style="font-size:1rem; vertical-align:middle; margin-right:0.5rem; color:${catData.color}">${catData.icon}</span>
                        ${cat}
                    </td>
                </tr>
            `;

            catData.items.forEach(equipo => {
                const cant = cantidades[equipo] || 0;
                const hasItems = cant > 0;

                html += `
                    <tr>
                        <td style="text-align:left; padding-left:1.5rem">
                            <span class="equipo-nombre">${equipo}</span>
                        </td>
                        <td>
                            <span class="cantidad-valor ${hasItems ? 'has-items' : ''}">${cant}</span>
                        </td>
                `;

                if (!readOnly) {
                    html += `
                        <td>
                            <div class="cantidad-display">
                                <button class="btn-cantidad btn-minus" 
                                        onclick="NuevoRemito.cambiarCantidad('${equipo.replace(/'/g, "\\'")}', -1)"
                                        ${cant === 0 ? 'disabled' : ''}>
                                    −
                                </button>
                                <button class="btn-cantidad btn-plus" 
                                        onclick="NuevoRemito.cambiarCantidad('${equipo.replace(/'/g, "\\'")}', 1)">
                                    +
                                </button>
                            </div>
                        </td>
                    `;
                }

                html += '</tr>';
            });
        }

        html += '</tbody></table></div></div>';

        container.innerHTML = html;
    }
};