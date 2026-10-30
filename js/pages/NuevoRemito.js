/**
 * ========================================
 * NUEVO REMITO PAGE
 * ========================================
 * Armado de remitos: buscador inteligente, tarjetas con cantidades,
 * panel "Tu remito" siempre a mano y alta rápida de equipos nuevos.
 *
 * Lo que se guarda en Firestore NO cambió: { nombre, lugar, fecha, persona,
 * tipoEvento, notas, equipos: { "Nombre del equipo": cantidad } }
 */

const NuevoRemito = {

    cantidades: {},          // solo los equipos con cantidad > 0
    searchQuery: '',
    filterCategoria: 'all',
    soloSeleccionados: false,

    remitoData: { nombre: '', lugar: '', fecha: '', persona: '', tipoEvento: '', notas: '' },
    editingId: null,

    _lista: [],              // nombres dibujados en la grilla (data-i de cada tarjeta)
    _listaPanel: [],         // nombres dibujados en el panel "Tu remito"
    _prevPanel: new Set(),
    _flash: null,
    _quickVisible: false,
    _borrador: null,         // remito a medio armar (se conserva si vas a otra pantalla)

    esc(t) { return InventarioService.escapar(t); },
    $(id) { return document.getElementById(id); },

    // =====================
    // CARGA
    // =====================

    async init(editId = null) {
        this.searchQuery = '';
        this.filterCategoria = 'all';
        this.soloSeleccionados = false;
        this.editingId = editId;
        this._prevPanel = new Set();
        this._flash = null;
        this._quickVisible = false;

        if (editId) {
            this.cantidades = {};
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
                        const n = Number(trabajo.equipos[eq]) || 0;
                        if (n > 0) this.cantidades[eq] = n;
                    }
                }
            }
        } else if (this._borrador) {
            this.cantidades = { ...this._borrador.cantidades };
            this.remitoData = { ...this._borrador.remitoData };
        } else {
            this.cantidades = {};
            this.remitoData = {
                nombre: '', lugar: '',
                fecha: new Date().toISOString().split('T')[0],
                persona: '', tipoEvento: '', notas: ''
            };
        }
    },

    _guardarBorrador() {
        if (this.editingId) return;
        this._borrador = { cantidades: { ...this.cantidades }, remitoData: { ...this.remitoData } };
    },

    // =====================
    // PÁGINA
    // =====================

    async render(editId = null) {
        Navbar.render(
            editId ? 'Editar Remito' : 'Nuevo Remito',
            editId ? 'Modificar equipos del trabajo' : 'Armá el remito en pocos toques'
        );

        const content = document.getElementById('page-content');

        if (editId) {
            content.innerHTML = `
                <div style="display:flex; align-items:center; justify-content:center; height:400px; flex-direction:column; gap:1rem">
                    <div class="loader-spinner"></div>
                    <p style="color: var(--text-secondary)">Cargando datos del trabajo...</p>
                </div>`;
        }

        const habiaBorrador = !editId && !!this._borrador && Object.keys(this._borrador.cantidades).length > 0;
        await this.init(editId);

        const isEditing = !!this.editingId;
        const d = this.remitoData;
        const tipoOpts = TIPOS_EVENTO.map(t =>
            `<option value="${this.esc(t)}" ${d.tipoEvento === t ? 'selected' : ''}>${this.esc(t)}</option>`
        ).join('');
        const abrirDatos = window.innerWidth > 760;

        content.innerHTML = `
        <div class="rm" id="rm-root">
            <div class="rm-top">
                <div>
                    <h1>${isEditing ? '✏️ Editar Remito' : '📋 Nuevo Remito'}</h1>
                    <p>${isEditing ? 'Modificá los equipos y datos del trabajo' : 'Buscá, tocá y listo. Todo lo que sumes queda en “Tu remito”.'}</p>
                </div>
                <button class="btn-outline" data-act="limpiar">
                    <span class="material-icons-round">restart_alt</span>Limpiar
                </button>
            </div>

            <details class="rm-datos" ${abrirDatos ? 'open' : ''}>
                <summary><span class="material-icons-round">assignment</span>Datos del trabajo
                    <small>${this.esc(d.nombre || 'Tocá para completar')}</small>
                </summary>
                <div class="rm-datos-grid">
                    <label>Nombre del evento / trabajo
                        <input type="text" data-field="nombre" placeholder="Ej: Filmación Canal 7..." value="${this.esc(d.nombre)}" /></label>
                    <label>Lugar
                        <input type="text" data-field="lugar" placeholder="Ej: Casa de Gobierno..." value="${this.esc(d.lugar)}" /></label>
                    <label>Fecha
                        <input type="date" data-field="fecha" value="${this.esc(d.fecha)}" /></label>
                    <label>Persona / Cliente
                        <input type="text" data-field="persona" placeholder="Ej: Gobernador, Empresa X..." value="${this.esc(d.persona)}" /></label>
                    <label>Tipo de evento
                        <select data-field="tipoEvento"><option value="">Seleccionar tipo...</option>${tipoOpts}</select></label>
                    <label>Notas
                        <input type="text" data-field="notas" placeholder="Notas adicionales..." value="${this.esc(d.notas)}" /></label>
                </div>
            </details>

            <div class="rm-layout">
                <section class="rm-picker">
                    <div class="rm-search">
                        <span class="material-icons-round">search</span>
                        <input id="rm-buscar" type="search" autocomplete="off" enterkeyhint="done"
                               placeholder="Agregá o buscá cualquier equipo que necesites..."
                               value="" />
                        <button class="rm-search-clear" id="rm-clear" data-act="limpiar-busqueda" aria-label="Borrar búsqueda" hidden>
                            <span class="material-icons-round">close</span>
                        </button>
                    </div>
                    <div class="rm-hint">Tip: escribí como hablás en rodaje (“pelican”, “cstand”, “forza 500”). <b>Enter</b> suma el primero; si no existe, lo crea.</div>
                    <div class="rm-import">
                        <button class="rm-import-btn voz" data-act="importar-voz">
                            <span class="material-icons-round">mic</span>Dictar equipos
                        </button>
                        <button class="rm-import-btn" data-act="importar-texto">
                            <span class="material-icons-round">content_paste</span>Pegar lista (WhatsApp)
                        </button>
                    </div>
                    <div id="rm-quick"></div>
                    <div class="rm-chips" id="rm-chips"></div>
                    <div id="rm-grid"></div>
                </section>

                <aside class="rm-panel" id="rm-panel">
                    <div class="pn-head">
                        <div class="pn-handle"></div>
                        <h2><span class="material-icons-round">receipt_long</span>Tu remito</h2>
                        <button class="pn-close" data-act="cerrar-panel" aria-label="Cerrar"><span class="material-icons-round">expand_more</span></button>
                    </div>
                    <div class="pn-list" id="pn-list"></div>
                    <div class="pn-foot" id="pn-foot"></div>
                </aside>
            </div>

            <button class="rm-bar" id="rm-bar" data-act="abrir-panel">
                <span class="rm-bar-count" id="rm-bar-count">0</span>
                <span class="rm-bar-txt" id="rm-bar-txt">Tu remito está vacío</span>
                <span class="material-icons-round">expand_less</span>
            </button>
            <div class="rm-backdrop" data-act="cerrar-panel"></div>
        </div>`;

        this._enlazarEventos();
        this.renderChips();
        this.renderGrid();
        this.renderPanel();

        if (habiaBorrador) {
            Toast.info('Remito en curso', 'Retomamos lo que venías armando');
        }
    },

    _enlazarEventos() {
        const root = this.$('rm-root');

        root.addEventListener('click', e => {
            const el = e.target.closest('[data-act]');
            if (!el || el.tagName === 'INPUT') return;
            this._accion(el.dataset.act, el, e);
        });

        root.addEventListener('input', e => {
            const t = e.target;
            if (t.id === 'rm-buscar') this.buscar(t.value);
            else if (t.dataset.field) this.updateField(t.dataset.field, t.value);
        });

        root.addEventListener('change', e => {
            const t = e.target;
            if (t.dataset.act === 'set' || t.dataset.act === 'pn-set') {
                const nombre = t.dataset.act === 'set'
                    ? this._lista[+t.closest('.eq-card').dataset.i]
                    : this._listaPanel[+t.closest('.pn-row').dataset.i];
                this.setCantidad(nombre, parseInt(t.value, 10) || 0);
            }
        });

        root.addEventListener('focusin', e => {
            if (e.target.classList && e.target.classList.contains('eq-qty')) e.target.select();
        });

        root.addEventListener('keydown', e => {
            if (e.target.id === 'rm-buscar' && e.key === 'Enter') {
                e.preventDefault();
                this.enterBuscador();
            } else if (e.target.id === 'rm-buscar' && e.key === 'Escape') {
                this.limpiarBusqueda();
            } else if (e.target.classList && e.target.classList.contains('eq-qty') && e.key === 'Enter') {
                e.target.blur();
            }
        });
    },

    _accion(act, el) {
        const card = el.closest('.eq-card');
        const fila = el.closest('.pn-row');
        const nombre = card ? this._lista[+card.dataset.i] : fila ? this._listaPanel[+fila.dataset.i] : null;

        switch (act) {
            case 'inc':
            case 'pn-inc': this.cambiarCantidad(nombre, 1); break;
            case 'dec':
            case 'pn-dec': this.cambiarCantidad(nombre, -1); break;
            case 'pn-del': this.setCantidad(nombre, 0); break;
            case 'menu': this.alternarMenuMover(card); break;
            case 'mover': this.moverEquipo(nombre, el.dataset.cat, card); break;
            case 'chip': this.filtrarCategoria(el.dataset.cat); break;
            case 'solo': this.toggleSeleccionados(); break;
            case 'crear': this.crearRapido(el.dataset.cat); break;
            case 'limpiar-busqueda': this.limpiarBusqueda(true); break;
            case 'limpiar': this.limpiarTodo(); break;
            case 'abrir-panel': this.$('rm-root').classList.add('panel-open'); break;
            case 'cerrar-panel': this.$('rm-root').classList.remove('panel-open'); break;
            case 'importar-voz': Importador.abrir('voz'); break;
            case 'importar-texto': Importador.abrir('texto'); break;
            case 'pdf': this.previsualizarPDF(); break;
            case 'guardar': this.guardarTrabajo(); break;
        }
    },

    // =====================
    // PICKER (chips, grilla, alta rápida)
    // =====================

    renderChips() {
        const agrup = InventarioService.agrupar(this.cantidades);
        const { tipos } = DataService.contarSeleccionados(this.cantidades);
        const chip = (cat, texto, n) => `
            <button class="rm-chip ${this.filterCategoria === cat ? 'active' : ''}" data-act="chip" data-cat="${this.esc(cat)}">
                ${texto}${n > 0 ? `<i class="chip-badge">${n}</i>` : ''}
            </button>`;

        this.$('rm-chips').innerHTML =
            chip('all', 'Todos', 0) +
            Object.keys(EQUIPOS_DB).map(cat =>
                chip(cat, `${EQUIPOS_DB[cat].emoji} ${this.esc(EQUIPOS_DB[cat].label)}`, agrup[cat] ? agrup[cat].items.length : 0)
            ).join('') +
            `<button class="rm-chip solo ${this.soloSeleccionados ? 'active' : ''}" data-act="solo">
                ✅ Solo elegidos${tipos > 0 ? `<i class="chip-badge">${tipos}</i>` : ''}
            </button>`;
    },

    _catalogoFiltrado() {
        let cats = this.searchQuery.trim() ? InventarioService.buscar(this.searchQuery) : EQUIPOS_DB;

        if (this.filterCategoria !== 'all') {
            cats = cats[this.filterCategoria] ? { [this.filterCategoria]: cats[this.filterCategoria] } : {};
        }
        if (this.soloSeleccionados) {
            const f = {};
            for (const cat in cats) {
                const items = cats[cat].items.filter(n => this.cantidades[n] > 0);
                if (items.length) f[cat] = { ...cats[cat], items };
            }
            cats = f;
        }
        return cats;
    },

    renderGrid() {
        const cont = this.$('rm-grid');
        if (!cont) return;
        const cats = this._catalogoFiltrado();
        const { html, lista } = EquipoTable.gridHtml(cats, this.cantidades);
        this._lista = lista;

        if (!lista.length) {
            const q = this.searchQuery.trim();
            cont.innerHTML = `
                <div class="rm-empty pop-in">
                    <span class="material-icons-round">${q ? 'search_off' : 'inventory_2'}</span>
                    <p>${q ? 'No hay ningún equipo con ese nombre.' : this.soloSeleccionados ? 'Todavía no elegiste equipos.' : 'No hay equipos para mostrar.'}</p>
                    ${q ? '<small>Elegí abajo en qué categoría va y lo sumamos al instante.</small>' : ''}
                </div>`;
        } else {
            cont.innerHTML = html;
        }
        this.renderQuick();
    },

    /** "¿No está? Agregalo ahora": aparece cuando lo escrito no existe. */
    renderQuick() {
        const box = this.$('rm-quick');
        if (!box) return;
        const q = this.searchQuery.replace(/\s+/g, ' ').trim();

        if (!q || InventarioService.buscarExacto(q)) {
            box.innerHTML = '';
            this._quickVisible = false;
            return;
        }

        const sugerida = InventarioService.adivinarCategoria(q);
        const cats = Object.keys(EQUIPOS_DB_BASE).map(cat => `
            <button class="rm-chip crear ${cat === sugerida ? 'suggest' : ''}" data-act="crear" data-cat="${this.esc(cat)}">
                ${EQUIPOS_DB_BASE[cat].emoji} ${this.esc(EQUIPOS_DB_BASE[cat].label)}
            </button>`).join('');

        box.innerHTML = `
            <div class="rm-quick ${this._quickVisible ? '' : 'pop-in'}">
                <div class="rm-quick-txt">
                    <span class="material-icons-round">add_circle</span>
                    <div>
                        <strong>¿No está “${this.esc(q)}”? Agregalo ahora</strong>
                        <small>Va al inventario y a este remito, sin perder lo que armaste. ¿En qué categoría?</small>
                    </div>
                </div>
                <div class="rm-quick-cats">${cats}</div>
            </div>`;
        this._quickVisible = true;
    },

    buscar(query) {
        this.searchQuery = query;
        this.$('rm-clear').hidden = !query;
        this.renderGrid();
    },

    limpiarBusqueda(enfocar = false) {
        const input = this.$('rm-buscar');
        input.value = '';
        this.buscar('');
        if (enfocar) input.focus();
    },

    enterBuscador() {
        const q = this.searchQuery.trim();
        if (!q) return;
        if (this._lista.length > 0) {
            const nombre = this._lista[0];
            this.cambiarCantidad(nombre, 1);
            Toast.success('Sumado', `${this.esc(nombre)} · ahora ${this.cantidades[nombre]}`);
            this.limpiarBusqueda();
        } else {
            this.crearRapido(InventarioService.adivinarCategoria(q));
        }
    },

    filtrarCategoria(cat) {
        this.filterCategoria = cat;
        this.renderChips();
        this.renderGrid();
    },

    toggleSeleccionados() {
        this.soloSeleccionados = !this.soloSeleccionados;
        this.renderChips();
        this.renderGrid();
    },

    // =====================
    // ALTA RÁPIDA Y CAMBIO DE CATEGORÍA
    // =====================

    async crearRapido(categoria) {
        const texto = this.searchQuery;
        try {
            const r = await InventarioService.agregar(texto, categoria);
            this.cantidades[r.nombre] = (this.cantidades[r.nombre] || 0) + 1;
            this._guardarBorrador();
            this._flash = r.nombre;

            this.searchQuery = '';
            this.$('rm-buscar').value = '';
            this.$('rm-clear').hidden = true;
            this.filterCategoria = 'all';
            this.soloSeleccionados = false;
            this.renderChips();
            this.renderGrid();
            this.renderPanel();
            this._resaltarTarjeta(r.nombre);

            const label = EQUIPOS_DB_BASE[categoria] ? EQUIPOS_DB_BASE[categoria].label : 'Varios';
            Toast.success(r.creado ? 'Equipo nuevo' : 'Ya existía', `“${this.esc(r.nombre)}” está en ${label} y en tu remito`);
            r.guardado.then(ok => {
                if (!ok) Toast.warning('Sin conexión', 'Quedó guardado en este dispositivo y se sube cuando vuelva internet');
            });
        } catch (err) {
            Toast.error('No se pudo agregar', this.esc(err.message || 'Probá de nuevo'));
        }
    },

    /** Suma al remito lo que armó el Importador: [{ nombre, cantidad }] (los nuevos ya están en el inventario). */
    aplicarImportacion(lista, creados = 0) {
        if (!lista.length) return;
        let items = 0;
        lista.forEach(({ nombre, cantidad }) => {
            this.cantidades[nombre] = Math.min(999, (this.cantidades[nombre] || 0) + cantidad);
            items += cantidad;
        });
        this._guardarBorrador();
        this._prevPanel = new Set(this._prevPanel);
        this._flash = null;
        this.renderChips();
        this.renderGrid();
        this.renderPanel();

        const nuevos = creados ? ` · ${creados} equipo${creados > 1 ? 's' : ''} nuevo${creados > 1 ? 's' : ''} en el inventario` : '';
        Toast.success('Agregado al remito', `${items} ${items === 1 ? 'item' : 'items'} de ${lista.length} ${lista.length === 1 ? 'equipo' : 'equipos'}${nuevos}`);
        if (window.innerWidth <= 1100) this.$('rm-root').classList.add('panel-open');
    },

    _resaltarTarjeta(nombre) {
        const i = this._lista.indexOf(nombre);
        const card = i >= 0 ? this.$('eq-' + i) : null;
        if (!card) return;
        card.classList.add('flash-new');
        card.scrollIntoView({ block: 'center', behavior: 'smooth' });
        setTimeout(() => card.classList.remove('flash-new'), 1600);
    },

    alternarMenuMover(card) {
        if (!card) return;
        const abierto = card.classList.contains('open-move');
        document.querySelectorAll('.eq-card.open-move').forEach(c => c.classList.remove('open-move'));
        if (!abierto) card.classList.add('open-move');
    },

    moverEquipo(nombre, categoria, card) {
        if (!nombre || !categoria) return;
        const actual = InventarioService.categoriaDe(nombre);
        if (actual === categoria) { card.classList.remove('open-move'); return; }

        InventarioService.mover(nombre, categoria).then(ok => {
            if (!ok) Toast.warning('Sin conexión', 'El cambio quedó en este dispositivo y se sube cuando vuelva internet');
        });

        card.classList.add('moving-out');
        setTimeout(() => {
            this.renderChips();
            this.renderGrid();
            this._resaltarTarjeta(nombre);
        }, 240);
        Toast.info('Categoría cambiada', `“${this.esc(nombre)}” ahora está en ${EQUIPOS_DB_BASE[categoria].label}`);
    },

    // =====================
    // CANTIDADES
    // =====================

    cambiarCantidad(nombre, delta) {
        if (!nombre) return;
        this.setCantidad(nombre, (this.cantidades[nombre] || 0) + delta);
    },

    setCantidad(nombre, valor) {
        if (!nombre) return;
        const n = Math.max(0, Math.min(999, Math.floor(Number(valor) || 0)));
        if (n === (this.cantidades[nombre] || 0)) {
            const i0 = this._lista.indexOf(nombre);
            if (i0 >= 0) EquipoTable.actualizarTarjeta(i0, n);
            this.renderPanel();
            return;
        }

        if (n === 0) delete this.cantidades[nombre];
        else this.cantidades[nombre] = n;

        this._guardarBorrador();
        this._flash = nombre;

        const i = this._lista.indexOf(nombre);
        if (i >= 0) {
            EquipoTable.actualizarTarjeta(i, n);
            if (n === 0 && this.soloSeleccionados) this._quitarTarjeta(i);
        }
        this.renderChips();
        this.renderPanel();
    },

    /** Con "Solo elegidos" activo, la tarjeta sale con una animación (sin rearmar la lista). */
    _quitarTarjeta(i) {
        const card = this.$('eq-' + i);
        if (!card) return;
        card.classList.add('leaving');
        setTimeout(() => {
            const sec = card.closest('.eq-section');
            card.remove();
            if (sec && !sec.querySelector('.eq-card')) sec.remove();
            if (!document.querySelector('#rm-grid .eq-card')) this.renderGrid();
        }, 220);
    },

    // =====================
    // PANEL "TU REMITO"
    // =====================

    renderPanel() {
        const list = this.$('pn-list');
        if (!list) return;
        const scroll = list.scrollTop;
        const agrup = InventarioService.agrupar(this.cantidades);
        const { tipos, total } = DataService.contarSeleccionados(this.cantidades);
        const prev = this._prevPanel;
        const ahora = new Set();
        this._listaPanel = [];

        let html = '';
        for (const cat in agrup) {
            const g = agrup[cat];
            html += `<div class="pn-cat" style="--cat-color:${g.color}"><span class="material-icons-round">${g.icon}</span>${this.esc(g.label || cat)}</div>`;
            g.items.forEach(nombre => {
                const i = this._listaPanel.length;
                this._listaPanel.push(nombre);
                ahora.add(nombre);
                const clases = ['pn-row'];
                if (!prev.has(nombre)) clases.push('pop-in');
                else if (this._flash === nombre) clases.push('flash');
                html += `
                    <div class="${clases.join(' ')}" data-i="${i}">
                        <span class="pn-name">${this.esc(nombre)}</span>
                        <div class="eq-step sm">
                            <button class="eq-btn eq-minus" data-act="pn-dec" aria-label="Quitar uno">−</button>
                            <input class="eq-qty" data-act="pn-set" type="number" inputmode="numeric" min="0" max="999" value="${this.cantidades[nombre]}" aria-label="Cantidad" />
                            <button class="eq-btn eq-plus" data-act="pn-inc" aria-label="Sumar uno">+</button>
                        </div>
                        <button class="pn-del" data-act="pn-del" aria-label="Sacar del remito"><span class="material-icons-round">close</span></button>
                    </div>`;
            });
        }

        if (!html) {
            html = `
                <div class="pn-empty">
                    <span class="material-icons-round">playlist_add</span>
                    <p>Todavía no sumaste equipos</p>
                    <small>Buscá arriba o tocá <b>Agregar</b> en cualquier tarjeta.</small>
                </div>`;
        }

        list.innerHTML = html;
        list.scrollTop = scroll;
        this._prevPanel = ahora;
        this._flash = null;

        const vacio = total === 0;
        this.$('pn-foot').innerHTML = `
            <div class="pn-totales">
                <div><b>${tipos}</b><span>tipos</span></div>
                <div><b>${total}</b><span>items</span></div>
                <div><b>${Object.keys(agrup).length}</b><span>categorías</span></div>
            </div>
            <div class="pn-botones">
                <button class="btn-primary" data-act="pdf" ${vacio ? 'disabled' : ''}>
                    <span class="material-icons-round">picture_as_pdf</span>PDF
                </button>
                <button class="btn-success" data-act="guardar" ${vacio ? 'disabled' : ''}>
                    <span class="material-icons-round">save</span>${this.editingId ? 'Actualizar' : 'Guardar'}
                </button>
            </div>`;

        this.$('rm-bar-count').textContent = total;
        this.$('rm-bar-count').classList.toggle('on', total > 0);
        this.$('rm-bar-txt').textContent = vacio ? 'Tu remito está vacío' : `${tipos} ${tipos === 1 ? 'equipo' : 'equipos'} · tocá para ver y guardar`;
    },

    // =====================
    // DATOS, LIMPIAR, GUARDAR, PDF
    // =====================

    updateField(field, value) {
        this.remitoData[field] = value;
        this._guardarBorrador();
        if (field === 'nombre') {
            const s = document.querySelector('.rm-datos summary small');
            if (s) s.textContent = value || 'Tocá para completar';
        }
    },

    limpiarTodo() {
        Modal.confirm({
            title: 'Limpiar todo',
            message: '¿Seguro que querés sacar todos los equipos del remito? Los datos del trabajo (nombre, lugar, fecha) se quedan.',
            icon: 'warning',
            confirmText: 'Sí, limpiar',
            onConfirm: () => {
                this.cantidades = {};
                this._guardarBorrador();
                this.renderChips();
                this.renderGrid();
                this.renderPanel();
                Toast.info('Limpiado', 'Se sacaron todos los equipos del remito');
            }
        });
    },

    _equiposSeleccionados() {
        const out = {};
        for (const eq in this.cantidades) {
            if (this.cantidades[eq] > 0) out[eq] = this.cantidades[eq];
        }
        return out;
    },

    async guardarTrabajo() {
        const { total } = DataService.contarSeleccionados(this.cantidades);
        if (total === 0) {
            Toast.warning('Sin equipos', 'Seleccioná al menos un equipo');
            return;
        }

        const trabajo = { ...this.remitoData, equipos: this._equiposSeleccionados() };

        try {
            document.querySelectorAll('.pn-botones button').forEach(b => { b.disabled = true; });

            if (this.editingId) {
                await StorageService.updateTrabajo(this.editingId, trabajo);
                Toast.success('Actualizado', `"${this.esc(trabajo.nombre || 'Sin nombre')}" actualizado en la nube ☁️`);
            } else {
                await StorageService.saveTrabajo(trabajo);
                Toast.success('Guardado', `"${this.esc(trabajo.nombre || 'Sin nombre')}" guardado en la nube ☁️`);
            }

            this._borrador = null;
            Sidebar.update();
            setTimeout(() => Router.navigate('historial'), 800);

        } catch (error) {
            Toast.error('Error', 'No se pudo guardar. Verificá tu conexión.');
            this.renderPanel();
        }
    },

    previsualizarPDF() {
        const { total } = DataService.contarSeleccionados(this.cantidades);
        if (total === 0) {
            Toast.warning('Sin equipos', 'Seleccioná al menos un equipo');
            return;
        }
        PDFService.descargar({ ...this.remitoData, equipos: this._equiposSeleccionados(), numero: '----' });
        Toast.success('PDF Generado', 'Archivo descargado correctamente');
    }
};
