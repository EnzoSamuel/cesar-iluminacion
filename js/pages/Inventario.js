/**
 * ========================================
 * INVENTARIO GENERAL
 * ========================================
 * Ver, buscar, agregar y ordenar los equipos. Nada de acá toca los remitos
 * ya guardados: ellos guardan el nombre del equipo y se siguen viendo igual,
 * aunque un equipo se oculte, se mueva de categoría o se elimine.
 */

const Inventario = {

    query: '',
    filtro: 'all',
    soloPropios: false,
    verOcultos: false,
    nuevaCat: 'ILUMINACIÓN',
    _lista: [],
    _editando: null,
    _flash: null,

    esc(t) { return InventarioService.escapar(t); },
    $(id) { return document.getElementById(id); },

    render() {
        Navbar.render('Inventario General', 'Tus equipos, kits e inventos en un solo lugar');

        const cats = Object.keys(EQUIPOS_DB_BASE);
        const opciones = cats.map(c =>
            `<option value="${this.esc(c)}" ${c === this.nuevaCat ? 'selected' : ''}>${EQUIPOS_DB_BASE[c].emoji} ${this.esc(EQUIPOS_DB_BASE[c].label)}</option>`
        ).join('');

        document.getElementById('page-content').innerHTML = `
        <div class="inv" id="inv-root">
            <div class="rm-top">
                <div>
                    <h1>📦 Inventario General</h1>
                    <p>Agregá equipos propios o kits, cambialos de categoría y ocultá lo que no usás.</p>
                </div>
                <button class="btn-primary" data-act="ir-remito">
                    <span class="material-icons-round">add_circle</span>Armar un remito
                </button>
            </div>

            <div class="inv-nuevo">
                <h3><span class="material-icons-round">add_box</span>Agregar equipo propio o kit</h3>
                <div class="inv-nuevo-form">
                    <input id="inv-nombre" type="text" maxlength="120" autocomplete="off"
                           placeholder="Ej: Kit Nanlite x3 con trípodes, Panel casero 1×1..." />
                    <select id="inv-cat" aria-label="Categoría">${opciones}</select>
                    <button class="btn-success" data-act="agregar">
                        <span class="material-icons-round">add</span>Agregar
                    </button>
                </div>
            </div>

            <div class="inv-tools">
                <div class="rm-search">
                    <span class="material-icons-round">search</span>
                    <input id="inv-buscar" type="search" autocomplete="off" placeholder="Buscar en el inventario..." />
                </div>
                <div class="rm-chips" id="inv-chips"></div>
            </div>

            <div class="inv-resumen" id="inv-resumen"></div>
            <div id="inv-lista"></div>
        </div>`;

        this._enlazar();
        this.pintar();
    },

    _enlazar() {
        const root = this.$('inv-root');

        root.addEventListener('click', e => {
            const el = e.target.closest('[data-act]');
            if (!el) return;
            const fila = el.closest('.inv-row');
            const nombre = fila ? this._lista[+fila.dataset.i] : null;

            switch (el.dataset.act) {
                case 'ir-remito': Router.navigate('nuevo-remito'); break;
                case 'agregar': this.agregar(); break;
                case 'chip': this.filtro = el.dataset.cat; this.pintar(); break;
                case 'propios': this.soloPropios = !this.soloPropios; this.pintar(); break;
                case 'ocultos': this.verOcultos = !this.verOcultos; this.pintar(); break;
                case 'editar': this.abrirEdicion(nombre); break;
                case 'ocultar': this.alternarOculto(nombre, fila); break;
                case 'eliminar': this.confirmarEliminar(nombre); break;
            }
        });

        root.addEventListener('change', e => {
            if (e.target.dataset.act === 'cat') {
                const fila = e.target.closest('.inv-row');
                this.cambiarCategoria(this._lista[+fila.dataset.i], e.target.value);
            } else if (e.target.id === 'inv-cat') {
                this.nuevaCat = e.target.value;
            }
        });

        root.addEventListener('input', e => {
            if (e.target.id === 'inv-buscar') { this.query = e.target.value; this.pintar(); }
        });

        root.addEventListener('keydown', e => {
            if (e.target.id === 'inv-nombre' && e.key === 'Enter') { e.preventDefault(); this.agregar(); }
        });
    },

    _catalogo() {
        let cats = InventarioService.construir(true);
        if (this.query.trim()) cats = InventarioService.buscar(this.query, cats);

        const res = {};
        for (const cat in cats) {
            if (this.filtro !== 'all' && cat !== this.filtro) continue;
            const items = cats[cat].items.filter(n => {
                if (!this.verOcultos && InventarioService.estaOculto(n)) return false;
                if (this.soloPropios && !InventarioService.esPropio(n)) return false;
                return true;
            });
            if (items.length) res[cat] = { ...cats[cat], items };
        }
        return res;
    },

    pintar() {
        // Chips
        const full = InventarioService.construir(true);
        const totalVisibles = Object.values(full).reduce((s, c) => s + c.items.filter(n => !InventarioService.estaOculto(n)).length, 0);
        const chip = (cat, txt, n) => `
            <button class="rm-chip ${this.filtro === cat ? 'active' : ''}" data-act="chip" data-cat="${this.esc(cat)}">
                ${txt}<i class="chip-badge soft">${n}</i></button>`;

        this.$('inv-chips').innerHTML =
            chip('all', 'Todos', totalVisibles) +
            Object.keys(full).map(c => chip(c, `${full[c].emoji} ${this.esc(full[c].label)}`,
                full[c].items.filter(n => !InventarioService.estaOculto(n)).length)).join('') +
            `<button class="rm-chip solo ${this.soloPropios ? 'active' : ''}" data-act="propios">⭐ Solo propios</button>
             <button class="rm-chip solo ${this.verOcultos ? 'active' : ''}" data-act="ocultos">👁️ Ver ocultos${InventarioService.estado.ocultos.length ? `<i class="chip-badge soft">${InventarioService.estado.ocultos.length}</i>` : ''}</button>`;

        // Lista
        const cats = this._catalogo();
        this._lista = [];
        let html = '';
        const opcionesCat = actual => Object.keys(EQUIPOS_DB_BASE).map(c =>
            `<option value="${this.esc(c)}" ${c === actual ? 'selected' : ''}>${EQUIPOS_DB_BASE[c].emoji} ${this.esc(EQUIPOS_DB_BASE[c].label)}</option>`).join('');

        for (const cat in cats) {
            const data = cats[cat];
            html += `
                <section class="eq-section">
                    <h3 class="eq-section-title" style="--cat-color:${data.color}">
                        <span class="material-icons-round">${data.icon}</span>${this.esc(data.label)}<small>${data.items.length}</small>
                    </h3>
                    <div class="inv-rows">`;
            data.items.forEach(nombre => {
                const i = this._lista.length;
                this._lista.push(nombre);
                const propio = InventarioService.esPropio(nombre);
                const oculto = InventarioService.estaOculto(nombre);
                html += `
                    <div class="inv-row ${oculto ? 'oculto' : ''} ${this._flash === nombre ? 'flash' : ''}" data-i="${i}">
                        <div class="inv-nombre">
                            <span>${this.esc(nombre)}</span>
                            ${propio ? '<em class="eq-tag">Propio</em>' : ''}
                            ${oculto ? '<em class="eq-tag gris">Oculto</em>' : ''}
                        </div>
                        <select class="inv-catsel" data-act="cat" aria-label="Categoría de ${this.esc(nombre)}">${opcionesCat(cat)}</select>
                        <div class="inv-acciones">
                            ${propio ? `<button class="inv-ic" data-act="editar" title="Cambiar nombre" aria-label="Cambiar nombre"><span class="material-icons-round">edit</span></button>` : ''}
                            ${propio
                                ? `<button class="inv-ic peligro" data-act="eliminar" title="Eliminar" aria-label="Eliminar"><span class="material-icons-round">delete</span></button>`
                                : `<button class="inv-ic" data-act="ocultar" title="${oculto ? 'Mostrar de nuevo' : 'Ocultar del armado de remitos'}" aria-label="${oculto ? 'Mostrar' : 'Ocultar'}"><span class="material-icons-round">${oculto ? 'visibility' : 'visibility_off'}</span></button>`}
                        </div>
                    </div>`;
            });
            html += '</div></section>';
        }
        this._flash = null;

        this.$('inv-lista').innerHTML = html || `
            <div class="rm-empty pop-in">
                <span class="material-icons-round">search_off</span>
                <p>No hay equipos con ese filtro.</p>
            </div>`;

        const propios = InventarioService.estado.propios.length;
        this.$('inv-resumen').innerHTML =
            `<b>${totalVisibles}</b> equipos en el inventario · <b>${propios}</b> propios` +
            `<span class="inv-nota">Los remitos ya guardados no cambian por nada de lo que hagas acá.</span>`;
    },

    // ---------- Acciones ----------

    async agregar() {
        const input = this.$('inv-nombre');
        const cat = this.$('inv-cat').value;
        try {
            const r = await InventarioService.agregar(input.value, cat);
            input.value = '';
            this.filtro = 'all';
            this.query = '';
            this.$('inv-buscar').value = '';
            this._flash = r.nombre;
            this.pintar();
            const fila = document.querySelector('.inv-row.flash');
            if (fila) fila.scrollIntoView({ block: 'center', behavior: 'smooth' });
            Toast.success(r.creado ? 'Equipo agregado' : 'Ya estaba', `“${this.esc(r.nombre)}” está en el inventario`);
            this._avisoNube(r.guardado);
            input.focus();
        } catch (err) {
            Toast.error('No se pudo agregar', this.esc(err.message));
        }
    },

    _avisoNube(promesa) {
        promesa.then(ok => {
            if (!ok) Toast.warning('Sin conexión', 'Quedó guardado en este dispositivo y se sube cuando vuelva internet');
        });
    },

    cambiarCategoria(nombre, cat) {
        this._flash = nombre;
        this._avisoNube(InventarioService.mover(nombre, cat));
        this.pintar();
        Toast.info('Categoría cambiada', `“${this.esc(nombre)}” ahora está en ${EQUIPOS_DB_BASE[cat].label}`);
    },

    alternarOculto(nombre, fila) {
        const eraOculto = InventarioService.estaOculto(nombre);
        this._avisoNube(InventarioService.alternarOculto(nombre));
        fila.classList.add('leaving');
        setTimeout(() => this.pintar(), 200);
        Toast.info(eraOculto ? 'Equipo visible' : 'Equipo oculto',
            eraOculto ? 'Vuelve a aparecer al armar remitos' : 'No aparece al armar remitos, pero los remitos viejos lo conservan');
    },

    abrirEdicion(nombre) {
        this._editando = nombre;
        Modal.open({
            title: 'Cambiar nombre',
            icon: 'edit',
            size: 'small',
            content: `
                <p style="color:var(--text-secondary);font-size:.85rem;margin-bottom:.75rem">
                    Los remitos que ya usaron “${this.esc(nombre)}” van a seguir mostrando el nombre anterior.</p>
                <input id="inv-edit-nombre" class="inv-modal-input" type="text" maxlength="120" value="${this.esc(nombre)}" />`,
            footer: `
                <button class="btn-outline" onclick="Modal.close()">Cancelar</button>
                <button class="btn-success" onclick="Inventario.guardarEdicion()">Guardar</button>`
        });
        setTimeout(() => {
            const i = this.$('inv-edit-nombre');
            if (i) { i.focus(); i.select(); i.addEventListener('keydown', e => { if (e.key === 'Enter') this.guardarEdicion(); }); }
        }, 50);
    },

    async guardarEdicion() {
        const nuevo = this.$('inv-edit-nombre').value;
        try {
            const viejo = this._editando;
            const p = InventarioService.renombrar(viejo, nuevo);
            Modal.close();
            this._flash = nuevo.replace(/\s+/g, ' ').trim();
            this.pintar();
            this._avisoNube(p);
            Toast.success('Nombre cambiado', 'Listo');
        } catch (err) {
            Toast.error('No se pudo cambiar', this.esc(err.message));
        }
    },

    confirmarEliminar(nombre) {
        Modal.confirm({
            title: 'Eliminar equipo',
            message: `¿Eliminar “${this.esc(nombre)}” del inventario? Los remitos que ya lo usan lo van a seguir mostrando.`,
            icon: 'delete',
            confirmText: 'Sí, eliminar',
            onConfirm: () => {
                this._avisoNube(InventarioService.eliminarPropio(nombre));
                this.pintar();
                Toast.info('Eliminado', 'El equipo salió del inventario');
            }
        });
    }
};
