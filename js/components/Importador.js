/**
 * ========================================
 * IMPORTADOR (dictado por voz + lista pegada)
 * ========================================
 * Una sola pantalla para dos formas de cargar un remito rápido:
 *   - 🎤 Dictar:   "dos Forza 500, tres pelícanos y un C-Stand"
 *   - 📋 Pegar:    el mensaje que te mandó el cliente por WhatsApp
 *
 * Siempre se muestra primero lo que se entendió (cantidad + equipo del
 * inventario, o equipo nuevo) para corregir antes de sumarlo al remito.
 */

const Importador = {

    el: null,
    texto: '',
    filas: [],
    cambios: {},            // correcciones del usuario, por texto original de la frase
    reconocedor: null,
    escuchando: false,
    _parado: true,
    _debounce: null,

    esc(t) { return InventarioService.escapar(t); },
    $(sel) { return this.el ? this.el.querySelector(sel) : null; },

    get soportaVoz() {
        return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    },

    // =====================
    // Abrir / cerrar
    // =====================

    abrir(modo = 'texto') {
        this.cerrar();
        this.cambios = {};
        this.filas = [];

        const el = document.createElement('div');
        el.className = 'imp-overlay';
        el.innerHTML = `
            <div class="imp-modal" role="dialog" aria-modal="true" aria-label="Agregar equipos con voz o lista">
                <div class="imp-head">
                    <h2><span class="material-icons-round">auto_awesome</span>Agregar con voz o lista</h2>
                    <button class="imp-x" data-act="cerrar" aria-label="Cerrar"><span class="material-icons-round">close</span></button>
                </div>

                <div class="imp-body">
                    <div class="imp-entrada">
                        <textarea id="imp-texto" rows="4" spellcheck="false"
                            placeholder="Dictá o pegá acá. Ej: “dos Forza 500, tres pelícanos y un C-Stand” o el mensaje de WhatsApp del cliente."></textarea>
                        <div class="imp-escucha" id="imp-escucha" hidden>
                            <span class="imp-onda"><i></i><i></i><i></i><i></i><i></i></span>
                            <span id="imp-parcial">Escuchando… hablá normal, con pausas entre equipos</span>
                        </div>
                        <div class="imp-botones">
                            <button class="imp-btn voz" id="imp-voz" data-act="voz">
                                <span class="material-icons-round">mic</span><span id="imp-voz-txt">Dictar</span>
                            </button>
                            <button class="imp-btn" data-act="pegar"><span class="material-icons-round">content_paste</span>Pegar</button>
                            <button class="imp-btn suave" data-act="vaciar"><span class="material-icons-round">delete_sweep</span>Borrar</button>
                        </div>
                        <div class="imp-aviso" id="imp-aviso"></div>
                    </div>

                    <div class="imp-resultado">
                        <div class="imp-titulo">Lo que entendí <small id="imp-resumen"></small></div>
                        <div id="imp-filas"></div>
                    </div>
                </div>

                <div class="imp-pie">
                    <button class="btn-outline" data-act="cerrar">Cancelar</button>
                    <button class="btn-success" id="imp-ok" data-act="confirmar" disabled>
                        <span class="material-icons-round">playlist_add_check</span><span id="imp-ok-txt">Agregar al remito</span>
                    </button>
                </div>
            </div>`;
        document.body.appendChild(el);
        this.el = el;
        document.body.classList.add('imp-abierto');

        el.addEventListener('click', e => this._click(e));
        el.addEventListener('change', e => this._cambio(e));
        el.addEventListener('input', e => this._entrada(e));
        this._esc = e => { if (e.key === 'Escape') this.cerrar(); };
        document.addEventListener('keydown', this._esc);

        this.pintarFilas();

        if (modo === 'voz') {
            this.alternarVoz();
        } else {
            setTimeout(() => { const t = this.$('#imp-texto'); if (t) t.focus(); }, 60);
        }
        if (!this.motor()) {
            this.aviso('Este navegador no permite usar el micrófono desde esta página. Probá con Chrome o Edge; mientras tanto podés pegar o escribir la lista.', 'warn');
            this.$('#imp-voz').disabled = true;
        }
    },

    cerrar() {
        this.detenerVoz();
        if (this.el) { this.el.remove(); this.el = null; }
        document.body.classList.remove('imp-abierto');
        if (this._esc) document.removeEventListener('keydown', this._esc);
    },

    aviso(msg, tipo = '') {
        const a = this.$('#imp-aviso');
        if (a) { a.textContent = msg; a.className = 'imp-aviso ' + tipo; }
    },

    // =====================
    // Eventos
    // =====================

    _click(e) {
        if (e.target.classList.contains('imp-overlay')) { this.cerrar(); return; }
        const b = e.target.closest('[data-act]');
        if (!b) return;
        const fila = b.closest('.imp-fila');
        const i = fila ? +fila.dataset.i : -1;

        switch (b.dataset.act) {
            case 'cerrar': this.cerrar(); break;
            case 'voz': this.alternarVoz(); break;
            case 'pegar': this.pegarPortapapeles(); break;
            case 'vaciar': this.detenerVoz(); this.$('#imp-texto').value = ''; this.cambios = {}; this.analizar(); break;
            case 'mas': this._cant(i, 1); break;
            case 'menos': this._cant(i, -1); break;
            case 'quitar': this._ajuste(i).quitado = true; this.pintarFilas(); break;
            case 'motor-local': StorageService.saveLocal('cesar_voz_motor', 'local'); this.aviso('', ''); this.iniciarLocal(); break;
            case 'confirmar': this.confirmar(); break;
        }
    },

    _cambio(e) {
        const t = e.target;
        const fila = t.closest('.imp-fila');
        if (!fila) return;
        const i = +fila.dataset.i;
        const aj = this._ajuste(i);
        if (t.dataset.f === 'eleccion') aj.eleccion = t.value;
        else if (t.dataset.f === 'cat') aj.cat = t.value;
        else if (t.dataset.f === 'nombre') aj.nombre = t.value;
        else if (t.dataset.f === 'cant') aj.cantidad = Math.max(1, Math.min(999, parseInt(t.value, 10) || 1));
        this.pintarFilas();
    },

    _entrada(e) {
        if (e.target.id !== 'imp-texto') return;
        clearTimeout(this._debounce);
        this._debounce = setTimeout(() => this.analizar(), 350);
    },

    _ajuste(i) {
        const f = this.filas[i];
        return (this.cambios[f.original] = this.cambios[f.original] || {});
    },

    _cant(i, d) {
        const f = this.filas[i];
        const aj = this._ajuste(i);
        const actual = aj.cantidad != null ? aj.cantidad : f.cantidad;
        aj.cantidad = Math.max(1, Math.min(999, actual + d));
        this.pintarFilas();
    },

    // =====================
    // Análisis y vista previa
    // =====================

    analizar() {
        const t = this.$('#imp-texto');
        if (!t) return;
        this.filas = ImportadorService.analizar(t.value);
        this.pintarFilas();
    },

    /** Resuelve lo que se va a hacer con cada fila (aplicando las correcciones del usuario). */
    _resolver(f) {
        const aj = this.cambios[f.original] || {};
        const cantidad = aj.cantidad != null ? aj.cantidad : f.cantidad;
        let eleccion = aj.eleccion;
        if (eleccion == null) eleccion = f.estado === 'nuevo' ? 'NUEVO' : f.candidatos[0].nombre;
        const nuevo = eleccion === 'NUEVO';
        return {
            quitado: !!aj.quitado, cantidad, eleccion, nuevo,
            nombre: nuevo ? (aj.nombre != null ? aj.nombre : f.texto) : eleccion,
            cat: aj.cat || f.categoria
        };
    },

    pintarFilas() {
        const cont = this.$('#imp-filas');
        if (!cont) return;

        if (!this.filas.length) {
            cont.innerHTML = `
                <div class="imp-vacio">
                    <span class="material-icons-round">graphic_eq</span>
                    <p>Todavía no hay nada para revisar</p>
                    <small>Tocá <b>Dictar</b> y decí los equipos, o pegá una lista.</small>
                </div>`;
            this.$('#imp-resumen').textContent = '';
            this.$('#imp-ok').disabled = true;
            this.$('#imp-ok-txt').textContent = 'Agregar al remito';
            return;
        }

        let existentes = 0, nuevos = 0, dudas = 0, total = 0;
        const catOpts = sel => Object.keys(EQUIPOS_DB_BASE).map(c =>
            `<option value="${this.esc(c)}" ${c === sel ? 'selected' : ''}>${EQUIPOS_DB_BASE[c].emoji} ${this.esc(EQUIPOS_DB_BASE[c].label)}</option>`).join('');

        cont.innerHTML = this.filas.map((f, i) => {
            const r = this._resolver(f);
            if (r.quitado) return '';
            total += r.cantidad;
            if (r.nuevo) nuevos++; else existentes++;
            const duda = !r.nuevo && f.estado === 'revisar' && this.cambios[f.original]?.eleccion == null;
            if (duda) dudas++;

            const opciones = f.candidatos.map(c =>
                `<option value="${this.esc(c.nombre)}" ${!r.nuevo && c.nombre === r.eleccion ? 'selected' : ''}>${this.esc(c.nombre)}</option>`).join('')
                + `<option value="NUEVO" ${r.nuevo ? 'selected' : ''}>➕ Crear “${this.esc(f.texto)}” como equipo nuevo</option>`;

            return `
                <div class="imp-fila ${r.nuevo ? 'es-nuevo' : duda ? 'es-duda' : 'es-ok'}" data-i="${i}">
                    <div class="imp-cant">
                        <button data-act="menos" aria-label="Menos">−</button>
                        <input data-f="cant" type="number" inputmode="numeric" min="1" max="999" value="${r.cantidad}" aria-label="Cantidad" />
                        <button data-act="mas" aria-label="Más">+</button>
                    </div>
                    <div class="imp-info">
                        <div class="imp-dije">“${this.esc(f.original)}”</div>
                        ${f.candidatos.length || true ? `<select data-f="eleccion" aria-label="Equipo">${opciones}</select>` : ''}
                        ${r.nuevo ? `
                            <div class="imp-nuevo">
                                <input data-f="nombre" type="text" maxlength="120" value="${this.esc(r.nombre)}" aria-label="Nombre del equipo nuevo" />
                                <select data-f="cat" aria-label="Categoría">${catOpts(r.cat)}</select>
                            </div>` : ''}
                        <div class="imp-estado">
                            ${r.nuevo ? '<span class="tag nuevo">NUEVO · se agrega al inventario</span>'
                                : duda ? '<span class="tag duda">Revisá: hay varias opciones parecidas</span>'
                                : '<span class="tag ok">En el inventario</span>'}
                        </div>
                    </div>
                    <button class="imp-quitar" data-act="quitar" aria-label="Sacar esta línea"><span class="material-icons-round">close</span></button>
                </div>`;
        }).join('');

        const partes = [`${existentes} del inventario`];
        if (nuevos) partes.push(`${nuevos} nuevo${nuevos > 1 ? 's' : ''}`);
        if (dudas) partes.push(`${dudas} para revisar`);
        this.$('#imp-resumen').textContent = '· ' + partes.join(' · ');

        const hay = existentes + nuevos > 0;
        this.$('#imp-ok').disabled = !hay;
        this.$('#imp-ok-txt').textContent = hay ? `Agregar ${total} ${total === 1 ? 'item' : 'items'} al remito` : 'Agregar al remito';
    },

    // =====================
    // Pegar
    // =====================

    async pegarPortapapeles() {
        try {
            const txt = await navigator.clipboard.readText();
            if (!txt.trim()) { this.aviso('El portapapeles está vacío.', 'warn'); return; }
            const t = this.$('#imp-texto');
            t.value = (t.value ? t.value.trimEnd() + '\n' : '') + txt;
            this.aviso('', '');
            this.analizar();
        } catch (err) {
            this.aviso('El navegador no dejó leer el portapapeles. Mantené apretado en el cuadro de arriba y elegí “Pegar”.', 'warn');
            this.$('#imp-texto').focus();
        }
    },

    // =====================
    // Voz
    // =====================
    // Dos motores:
    //  - "nativo": el dictado del navegador (en vivo; depende del servicio de voz de Chrome/Edge)
    //  - "local":  graba y transcribe con Whisper dentro del navegador (VozLocal). No depende de
    //              ningún servicio; se descarga una sola vez.

    motor() {
        const pref = StorageService.getLocal('cesar_voz_motor', null);
        if (pref === 'local' && VozLocal.puedeGrabar) return 'local';
        if (pref === 'nativo' && this.soportaVoz) return 'nativo';
        return this.soportaVoz ? 'nativo' : (VozLocal.puedeGrabar ? 'local' : null);
    },

    alternarVoz() {
        if (this.escuchando || this._procesando) { this.detenerVoz(); return; }
        const m = this.motor();
        if (m === 'local') this.iniciarLocal();
        else if (m === 'nativo') this.iniciarVoz();
        else this.aviso('Este navegador no permite usar el micrófono desde esta página. Probá con Chrome o Edge, o pegá la lista.', 'warn');
    },

    /** Mensaje con botón para pasar al motor local. */
    ofrecerLocal(motivo) {
        const a = this.$('#imp-aviso');
        if (!a) return;
        const peso = VozLocal.descargadoAntes ? 'ya descargado' : 'se descarga una sola vez, ~80 MB';
        a.className = 'imp-aviso warn';
        a.innerHTML = `${this.esc(motivo)} <button class="imp-link" data-act="motor-local">Usar dictado propio (${peso})</button>`;
    },

    // ---------- Motor nativo ----------

    iniciarVoz() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return;
        const t = this.$('#imp-texto');
        if (!t) return;

        const rec = new SR();
        rec.lang = 'es-AR';
        rec.continuous = true;
        rec.interimResults = true;
        rec.maxAlternatives = 1;

        this._parado = false;
        this.escuchando = true;
        this._ponerBotonVoz(true, 'Escuchando… hablá normal, con pausas entre equipos');
        this.aviso('', '');

        rec.onresult = ev => {
            let parcial = '';
            for (let i = ev.resultIndex; i < ev.results.length; i++) {
                const res = ev.results[i];
                const frase = res[0].transcript.trim();
                if (res.isFinal) {
                    if (frase) t.value = (t.value.trim() ? t.value.trimEnd() + '\n' : '') + frase;
                } else {
                    parcial += ' ' + frase;
                }
            }
            const p = this.$('#imp-parcial');
            if (p) p.textContent = parcial.trim() ? '“' + parcial.trim() + '”' : 'Escuchando… hablá normal, con pausas entre equipos';
            this.analizar();
        };

        rec.onerror = ev => {
            if (ev.error === 'no-speech' || ev.error === 'aborted') return;   // se reinicia solo
            this._parado = true;
            if (ev.error === 'network' || ev.error === 'service-not-allowed' || ev.error === 'language-not-supported') {
                // El servicio de voz del navegador no está disponible aunque haya internet.
                if (VozLocal.puedeGrabar && VozLocal.descargadoAntes) {
                    StorageService.saveLocal('cesar_voz_motor', 'local');
                    this.aviso('El dictado del navegador no responde. Paso al dictado propio…', 'warn');
                    setTimeout(() => this.iniciarLocal(), 200);
                } else if (VozLocal.puedeGrabar) {
                    this.ofrecerLocal('El dictado del navegador no está disponible (no es tu internet: pasa en algunos navegadores).');
                } else {
                    this.aviso('El dictado del navegador no está disponible acá. Pegá o escribí la lista.', 'warn');
                }
                return;
            }
            const msgs = {
                'not-allowed': 'El micrófono está bloqueado. Tocá el candado al lado de la dirección y permitilo.',
                'audio-capture': 'No encuentro un micrófono conectado.'
            };
            this.aviso(msgs[ev.error] || 'No pude usar el micrófono (' + ev.error + ').', 'warn');
        };

        rec.onend = () => {
            // Chrome corta solo tras unos segundos de silencio: si no lo paró el usuario, seguimos escuchando.
            if (!this._parado && this.el) {
                try { rec.start(); return; } catch (e) { /* cae al cierre */ }
            }
            this.escuchando = false;
            this._ponerBotonVoz(false);
            this.analizar();
        };

        this.reconocedor = rec;
        try { rec.start(); }
        catch (e) { this.aviso('No pude arrancar el micrófono. Probá de nuevo.', 'warn'); this._parado = true; this.escuchando = false; this._ponerBotonVoz(false); }
    },

    // ---------- Motor local (Whisper) ----------

    async iniciarLocal() {
        const t = this.$('#imp-texto');
        if (!t) return;
        this._procesando = true;
        this._ponerBotonVoz(true, VozLocal.descargadoAntes ? 'Preparando el dictado…' : 'Descargando el dictado (solo esta vez)… 0%');
        this.aviso('', '');

        try {
            if (!VozLocal.listo) {
                await VozLocal.cargar((pct, det) => {
                    const p = this.$('#imp-parcial');
                    if (p && !this.escuchando) p.textContent = `Descargando el dictado (solo esta vez)… ${pct}%  ${det || ''}`;
                });
            }
        } catch (err) {
            this._procesando = false;
            this._ponerBotonVoz(false);
            this.aviso('No pude descargar el dictado propio (¿internet o bloqueador?). Podés pegar o escribir la lista.', 'warn');
            return;
        }
        if (!this.el || !this._procesando) return;     // cerraron la ventana o cancelaron mientras cargaba

        try {
            this._grabacion = await VozLocal.grabar(seg => {
                const p = this.$('#imp-parcial');
                if (p) p.textContent = `Grabando… ${seg}s · decí los equipos y tocá Parar cuando termines`;
                if (seg >= VozLocal.MAX_SEG) this.detenerVoz();
            });
        } catch (err) {
            this._procesando = false;
            this._ponerBotonVoz(false);
            const bloqueado = err && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
            this.aviso(bloqueado ? 'El micrófono está bloqueado. Tocá el candado al lado de la dirección y permitilo.'
                : 'No encuentro un micrófono para grabar.', 'warn');
            return;
        }

        this.escuchando = true;
        this._ponerBotonVoz(true, 'Grabando… decí los equipos y tocá Parar cuando termines');
    },

    async _terminarLocal() {
        const g = this._grabacion;
        this._grabacion = null;
        this.escuchando = false;
        if (!g) { this._procesando = false; this._ponerBotonVoz(false); return; }

        this._ponerBotonVoz(true, 'Transcribiendo lo que dijiste…', true);
        try {
            const audio = await g.parar();
            if (audio.length < 8000) {
                this.aviso('No llegué a escuchar nada. Probá de nuevo, más cerca del micrófono.', 'warn');
            } else {
                const texto = await VozLocal.transcribir(audio);
                if (texto && this.el) {
                    this.agregarTexto(texto);
                } else if (this.el) {
                    this.aviso('No entendí nada. Probá de nuevo, hablando más cerca.', 'warn');
                }
            }
        } catch (err) {
            this.aviso('No pude procesar el audio. Probá de nuevo o pegá la lista.', 'warn');
        }
        this._procesando = false;
        this._ponerBotonVoz(false);
    },

    /** Suma texto dictado al cuadro: una frase por línea. */
    agregarTexto(texto) {
        const t = this.$('#imp-texto');
        if (!t) return;
        const lineas = texto.replace(/([.!?¡¿])\s+/g, '$1\n').split('\n')
            .map(l => l.replace(/[.!?]+$/, '').trim()).filter(Boolean).join('\n');
        t.value = (t.value.trim() ? t.value.trimEnd() + '\n' : '') + lineas;
        this.analizar();
    },

    detenerVoz() {
        this._parado = true;
        if (this.reconocedor) { try { this.reconocedor.stop(); } catch (e) { /* ya parado */ } }
        this.reconocedor = null;

        if (this._grabacion) {            // motor local: cortar y transcribir
            if (this.el) this._terminarLocal();
            else { this._grabacion.cancelar(); this._grabacion = null; }
            return;
        }
        this._procesando = false;
        this.escuchando = false;
        this._ponerBotonVoz(false);
    },

    _ponerBotonVoz(on, texto, ocupado = false) {
        const b = this.$('#imp-voz');
        if (!b) return;
        b.classList.toggle('on', on && !ocupado);
        b.disabled = ocupado;
        this.$('#imp-voz-txt').textContent = on ? 'Parar' : 'Dictar';
        b.querySelector('.material-icons-round').textContent = on ? 'stop' : 'mic';
        const e = this.$('#imp-escucha');
        if (e) e.hidden = !on;
        const p = this.$('#imp-parcial');
        if (p && texto) p.textContent = texto;
    },

    // =====================
    // Confirmar
    // =====================

    async confirmar() {
        this.detenerVoz();
        this.analizar();   // por si quedó algo sin procesar del dictado

        const suma = new Map();
        let creados = 0;
        const btn = this.$('#imp-ok');
        btn.disabled = true;

        try {
            for (const f of this.filas) {
                const r = this._resolver(f);
                if (r.quitado) continue;
                let nombre = r.nombre;
                if (r.nuevo) {
                    nombre = (r.nombre || '').trim();
                    if (!nombre) continue;
                    const res = await InventarioService.agregar(nombre, r.cat);
                    nombre = res.nombre;
                    if (res.creado) creados++;
                    res.guardado.then(ok => {
                        if (!ok) Toast.warning('Sin conexión', 'Los equipos nuevos quedaron en este dispositivo y se suben cuando vuelva internet');
                    });
                }
                suma.set(nombre, (suma.get(nombre) || 0) + r.cantidad);
            }
        } catch (err) {
            Toast.error('No se pudo agregar', this.esc(err.message || 'Probá de nuevo'));
            btn.disabled = false;
            return;
        }

        const lista = [...suma].map(([nombre, cantidad]) => ({ nombre, cantidad }));
        this.cerrar();
        NuevoRemito.aplicarImportacion(lista, creados);
    }
};
