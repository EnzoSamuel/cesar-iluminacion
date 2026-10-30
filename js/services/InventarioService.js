/**
 * ========================================
 * INVENTARIO SERVICE
 * ========================================
 * Arma el catálogo "vivo" (EQUIPOS_DB) a partir de:
 *   - el catálogo base (js/data/equipos.js)
 *   - los equipos propios que agrega el usuario
 *   - los cambios de categoría y los equipos ocultos
 *
 * Los remitos NUNCA se tocan: guardan solo el nombre del equipo y la cantidad.
 * Lo propio del inventario se guarda aparte, en el documento
 * "inventario/personalizado" de Firestore (y una copia en este dispositivo).
 */

const InventarioService = {

    LOCAL_KEY: 'cesar_iluminacion_inventario',
    COLECCION: 'inventario',
    DOC_ID: 'personalizado',
    CAT_OTROS: 'OTROS (fuera del inventario)',

    estado: { propios: [], categorias: {}, ocultos: [], pendiente: false },

    // ---------- Utilidades ----------

    norm(texto) {
        return (texto || '').toString().toLowerCase()
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/\s+/g, ' ').trim();
    },

    escapar(texto) {
        return (texto == null ? '' : String(texto))
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },

    // ---------- Carga y guardado ----------

    async init() {
        this._leerLocal();
        this.reconstruir();

        // Nube: con tope de tiempo para no trabar la app si no hay conexión.
        try {
            const remoto = await Promise.race([
                this._leerRemoto(),
                new Promise(resolve => setTimeout(() => resolve('timeout'), 4000))
            ]);

            if (remoto && remoto !== 'timeout') {
                if (this.estado.pendiente) {
                    // Hay cambios hechos sin conexión: subirlos primero.
                    await this.guardar();
                } else {
                    this.estado = this._normalizarEstado(remoto);
                    this._escribirLocal();
                }
            } else if (remoto === null && this._hayCambios()) {
                await this.guardar();
            }
        } catch (e) {
            console.warn('Inventario: se usa la copia de este dispositivo', e);
        }

        this.reconstruir();
    },

    _hayCambios() {
        const e = this.estado;
        return e.propios.length || e.ocultos.length || Object.keys(e.categorias).length;
    },

    _normalizarEstado(raw) {
        const e = raw || {};
        return {
            propios: Array.isArray(e.propios)
                ? e.propios.filter(p => p && p.nombre).map(p => ({ nombre: String(p.nombre), categoria: String(p.categoria || 'VARIOS') }))
                : [],
            categorias: (e.categorias && typeof e.categorias === 'object') ? { ...e.categorias } : {},
            ocultos: Array.isArray(e.ocultos) ? e.ocultos.map(String) : [],
            pendiente: !!e.pendiente
        };
    },

    _leerLocal() {
        this.estado = this._normalizarEstado(StorageService.getLocal(this.LOCAL_KEY, null));
    },

    _escribirLocal() {
        StorageService.saveLocal(this.LOCAL_KEY, this.estado);
    },

    async _leerRemoto() {
        const doc = await db.collection(this.COLECCION).doc(this.DOC_ID).get();
        return doc.exists ? doc.data() : null;
    },

    /**
     * Guarda en este dispositivo al instante y en la nube. Devuelve true si
     * quedó sincronizado. Sin conexión no se cuelga: a los 5 s devuelve false
     * y la escritura queda en cola hasta que vuelva internet.
     */
    async guardar() {
        this.estado.pendiente = true;
        this._escribirLocal();
        try {
            const escritura = db.collection(this.COLECCION).doc(this.DOC_ID).set({
                propios: this.estado.propios,
                categorias: this.estado.categorias,
                ocultos: this.estado.ocultos,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            escritura.then(() => {
                this.estado.pendiente = false;
                this._escribirLocal();
            }).catch(() => {});
            await Promise.race([
                escritura,
                new Promise((_, rechazar) => setTimeout(() => rechazar(new Error('timeout')), 5000))
            ]);
            return true;
        } catch (e) {
            console.warn('Inventario: no se pudo sincronizar con la nube', e);
            return false;
        }
    },

    // ---------- Catálogo vivo ----------

    /** Arma el catálogo. Con incluirOcultos=true también trae los ocultos. */
    construir(incluirOcultos = false) {
        const out = {};
        const vistos = new Set();

        for (const cat in EQUIPOS_DB_BASE) {
            const { items, ...meta } = EQUIPOS_DB_BASE[cat];
            out[cat] = { ...meta, items: [] };
        }

        const poner = (nombre, cat) => {
            const clave = this.norm(nombre);
            if (vistos.has(clave)) return;
            vistos.add(clave);
            out[out[cat] ? cat : 'VARIOS'].items.push(nombre);
        };

        const ocultos = new Set(this.estado.ocultos);

        for (const catBase in EQUIPOS_DB_BASE) {
            EQUIPOS_DB_BASE[catBase].items.forEach(nombre => {
                if (!incluirOcultos && ocultos.has(nombre)) return;
                poner(nombre, this.estado.categorias[nombre] || catBase);
            });
        }
        this.estado.propios.forEach(p => poner(p.nombre, p.categoria));

        return out;
    },

    reconstruir() {
        EQUIPOS_DB = this.construir(false);
        return EQUIPOS_DB;
    },

    getCategoriaMeta(cat) {
        return EQUIPOS_DB_BASE[cat] || null;
    },

    esPropio(nombre) {
        return this.estado.propios.some(p => p.nombre === nombre);
    },

    esBase(nombre) {
        for (const cat in EQUIPOS_DB_BASE) {
            if (EQUIPOS_DB_BASE[cat].items.includes(nombre)) return true;
        }
        return false;
    },

    estaOculto(nombre) {
        return this.estado.ocultos.includes(nombre);
    },

    /** Categoría actual de un equipo (o null si no está en el inventario). */
    categoriaDe(nombre) {
        const full = this.construir(true);
        for (const cat in full) {
            if (full[cat].items.includes(nombre)) return cat;
        }
        return null;
    },

    /** Busca un equipo por nombre ignorando mayúsculas/acentos. Devuelve el nombre real. */
    buscarExacto(nombre) {
        const clave = this.norm(nombre);
        const full = this.construir(true);
        for (const cat in full) {
            const hit = full[cat].items.find(n => this.norm(n) === clave);
            if (hit) return hit;
        }
        return null;
    },

    // ---------- Búsqueda ----------

    /** Texto buscable de un equipo: nombre + jerga. */
    textoBusqueda(nombre) {
        let extra = '';
        for (const clave in EQUIPOS_JERGA) {
            if (nombre.toLowerCase().includes(clave.toLowerCase())) extra += ' ' + EQUIPOS_JERGA[clave];
        }
        return this.norm(nombre + ' ' + extra);
    },

    /**
     * Filtra el catálogo vivo. Todas las palabras tienen que aparecer
     * (en cualquier orden) en el nombre o la jerga.
     */
    buscar(query, catalogo = EQUIPOS_DB) {
        const palabras = this.norm(query).split(' ').filter(Boolean);
        if (!palabras.length) return catalogo;
        const res = {};
        for (const cat in catalogo) {
            const items = catalogo[cat].items.filter(n => {
                const t = this.textoBusqueda(n);
                return palabras.every(p => t.includes(p));
            });
            if (items.length) res[cat] = { ...catalogo[cat], items };
        }
        return res;
    },

    /** Intenta adivinar la categoría de un equipo nuevo por su nombre. */
    adivinarCategoria(texto) {
        const t = this.norm(texto);
        const reglas = [
            ['SOPORTES', /tripode|stand|truss|jirafa|boom|torre|atril|ascensor|soporte|baby roller|junior roller/],
            ['ELECTRICIDAD', /cable|zapatilla|tablero|prolongador|alargue|chicote|dimmer|generador|steck|ficha|termica|dmx|adaptador|linea|balasto/],
            ['GRIPERIA', /pinza|clamp|maffer|mafer|bandera|tamiz|rotula|prensa|pelicano|cocodrilo|gobo|c-stand|cstand|seda|rebote|cinta|grampa|morza|perno|sandbag|cutter|net|silk/],
            ['ILUMINACION', /led|hmi|fresnel|panel|nanlite|aputure|amaran|godox|tubo|kino|skypanel|forza|pavo|evoke|lampara|foco|luz|par |softbox|chimera/]
        ];
        for (const [cat, re] of reglas) {
            if (re.test(t)) {
                return Object.keys(EQUIPOS_DB_BASE).find(k => this.norm(k) === this.norm(cat)) || 'VARIOS';
            }
        }
        return 'VARIOS';
    },

    // ---------- Altas, bajas y cambios ----------

    /**
     * Agrega un equipo propio. Si ya existe (aunque esté oculto) no lo duplica:
     * lo muestra de nuevo y devuelve el nombre existente.
     * El cambio se ve al instante; "guardado" es una promesa que dice si
     * también llegó a la nube. Devuelve { nombre, creado, guardado }.
     */
    async agregar(nombre, categoria) {
        nombre = (nombre || '').replace(/\s+/g, ' ').trim();
        if (!nombre) throw new Error('Escribí el nombre del equipo');
        if (nombre.length > 120) throw new Error('El nombre es muy largo (máximo 120 letras)');
        if (!EQUIPOS_DB_BASE[categoria]) categoria = 'VARIOS';

        const existente = this.buscarExacto(nombre);
        if (existente) {
            if (this.estaOculto(existente)) {
                this.estado.ocultos = this.estado.ocultos.filter(n => n !== existente);
                this.reconstruir();
                return { nombre: existente, creado: false, guardado: this.guardar() };
            }
            return { nombre: existente, creado: false, guardado: Promise.resolve(true) };
        }

        this.estado.propios.push({ nombre, categoria });
        this.reconstruir();
        return { nombre, creado: true, guardado: this.guardar() };
    },

    /** Cambia la categoría de cualquier equipo (base o propio). */
    async mover(nombre, categoria) {
        if (!EQUIPOS_DB_BASE[categoria]) return false;
        const propio = this.estado.propios.find(p => p.nombre === nombre);
        if (propio) {
            propio.categoria = categoria;
        } else {
            this.estado.categorias[nombre] = categoria;
        }
        this.reconstruir();
        return this.guardar();
    },

    /** Renombra un equipo PROPIO. Los remitos viejos conservan el nombre anterior. */
    renombrar(nombreViejo, nombreNuevo) {
        nombreNuevo = (nombreNuevo || '').replace(/\s+/g, ' ').trim();
        if (!nombreNuevo) throw new Error('Escribí el nombre del equipo');
        const propio = this.estado.propios.find(p => p.nombre === nombreViejo);
        if (!propio) throw new Error('Solo se pueden renombrar los equipos propios');
        const otro = this.buscarExacto(nombreNuevo);
        if (otro && this.norm(otro) !== this.norm(nombreViejo)) throw new Error('Ya existe un equipo con ese nombre');
        propio.nombre = nombreNuevo;
        this.reconstruir();
        return this.guardar();
    },

    /** Elimina un equipo propio del inventario (los remitos viejos lo siguen mostrando). */
    async eliminarPropio(nombre) {
        this.estado.propios = this.estado.propios.filter(p => p.nombre !== nombre);
        this.reconstruir();
        return this.guardar();
    },

    /** Oculta/restaura un equipo base (no se borra: los remitos viejos lo necesitan). */
    async alternarOculto(nombre) {
        if (this.estaOculto(nombre)) {
            this.estado.ocultos = this.estado.ocultos.filter(n => n !== nombre);
        } else {
            this.estado.ocultos.push(nombre);
        }
        this.reconstruir();
        return this.guardar();
    },

    // ---------- Para remitos guardados (PDF, detalle, resumen) ----------

    /**
     * Agrupa los equipos de un remito por categoría. Incluye equipos ocultos o
     * eliminados: lo que ya está en un remito siempre se muestra.
     */
    agrupar(equipos) {
        const res = {};
        const vistos = new Set();
        const cantidad = n => Number(equipos && equipos[n]) || 0;
        const full = this.construir(true);

        for (const cat in full) {
            const items = full[cat].items.filter(n => cantidad(n) > 0);
            if (items.length) {
                res[cat] = { ...full[cat], items };
                items.forEach(n => vistos.add(n));
            }
        }

        const otros = Object.keys(equipos || {}).filter(n => cantidad(n) > 0 && !vistos.has(n));
        if (otros.length) {
            res[this.CAT_OTROS] = { label: 'Otros', icon: 'inventory_2', emoji: '📦', color: '#8899b4', items: otros };
        }
        return res;
    }
};
