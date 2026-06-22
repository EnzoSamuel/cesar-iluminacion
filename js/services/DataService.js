/**
 * ========================================
 * DATA SERVICE
 * ========================================
 * Capa intermedia de manejo de datos
 */

const DataService = {

    /**
     * Quitar acentos de un texto (para búsqueda)
     */
    quitarAcentos(texto) {
        if (!texto) return '';
        return texto
            .toString()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    },

    /**
     * Obtener todas las categorías con sus equipos
     */
    getCategorias() {
        return EQUIPOS_DB;
    },

    /**
     * Obtener todos los equipos como array plano
     */
    getTodosLosEquipos() {
        const todos = [];
        for (const cat in EQUIPOS_DB) {
            EQUIPOS_DB[cat].items.forEach(nombre => {
                todos.push({
                    categoria: cat,
                    nombre: nombre,
                    icon: EQUIPOS_DB[cat].icon,
                    color: EQUIPOS_DB[cat].color
                });
            });
        }
        return todos;
    },

    /**
     * Buscar equipos por nombre (sin acentos)
     */
    buscarEquipos(query) {
        const q = this.quitarAcentos(query).trim();
        if (!q) return null;

        const resultados = {};
        for (const cat in EQUIPOS_DB) {
            const filtered = EQUIPOS_DB[cat].items.filter(item => {
                const itemSinAcentos = this.quitarAcentos(item);
                return itemSinAcentos.includes(q);
            });
            if (filtered.length > 0) {
                resultados[cat] = { ...EQUIPOS_DB[cat], items: filtered };
            }
        }
        return resultados;
    },

    /**
     * Contar equipos seleccionados
     */
    contarSeleccionados(cantidades) {
        let tipos = 0;
        let total = 0;

        for (const equipo in cantidades) {
            if (cantidades[equipo] > 0) {
                tipos++;
                total += cantidades[equipo];
            }
        }

        return { tipos, total };
    },

    /**
     * Contar categorías con equipos seleccionados
     */
    contarCategoriasActivas(cantidades) {
        const cats = new Set();
        for (const cat in EQUIPOS_DB) {
            EQUIPOS_DB[cat].items.forEach(eq => {
                if (cantidades[eq] > 0) {
                    cats.add(cat);
                }
            });
        }
        return cats.size;
    },

    /**
     * Obtener solo equipos seleccionados agrupados
     */
    getSeleccionadosPorCategoria(cantidades) {
        const resultado = {};
        for (const cat in EQUIPOS_DB) {
            const items = EQUIPOS_DB[cat].items.filter(eq => cantidades[eq] > 0);
            if (items.length > 0) {
                resultado[cat] = {
                    ...EQUIPOS_DB[cat],
                    items: items
                };
            }
        }
        return resultado;
    },

    /**
     * Obtener tipos de evento
     */
    getTiposEvento() {
        return TIPOS_EVENTO;
    },

    /**
     * Formatear fecha corta
     */
    formatearFechaCorta(fechaStr) {
        if (!fechaStr) return '---';
        const fecha = new Date(fechaStr + 'T12:00:00');
        return fecha.toLocaleDateString('es-AR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    },

    /**
     * Obtener día y mes separados
     */
    getDiaMes(fechaStr) {
        if (!fechaStr) return { dia: '--', mes: '---' };
        const fecha = new Date(fechaStr + 'T12:00:00');
        return {
            dia: fecha.getDate().toString().padStart(2, '0'),
            mes: fecha.toLocaleDateString('es-AR', { month: 'short' }).toUpperCase()
        };
    }
};