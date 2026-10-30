/**
 * ========================================
 * IMPORTADOR SERVICE
 * ========================================
 * Convierte texto libre (dictado por voz o un mensaje pegado de WhatsApp)
 * en una lista de { cantidad, equipo }, comparándola con el inventario.
 *
 *   "dos Forza 500, tres pelícanos y un C-Stand"
 *   "- 2x Aputure 600d\n- Pelícano x4\n- cinta gaffer (3)"
 *
 * No guarda nada: solo analiza. Quien lo usa (Importador) muestra el
 * resultado para revisar y recién ahí lo suma al remito.
 */

const ImportadorService = {

    NUM: {
        un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8,
        nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15,
        dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20, treinta: 30
    },

    // Palabras que no ayudan a identificar un equipo
    STOP: new Set(['de', 'del', 'con', 'y', 'e', 'la', 'el', 'los', 'las', 'para', 'un', 'una', 'unos',
        'unas', 'por', 'en', 'a', 'que', 'u', 'unidad', 'unidades', 'x', 'mas', 'tipo']),

    // Muletillas del principio de una frase ("agregá", "necesito", "y también"...)
    RELLENO: new Set(['agrega', 'agregar', 'agregame', 'agregale', 'agregalo', 'suma', 'sumar', 'sumale',
        'sumame', 'pone', 'poner', 'ponele', 'poneme', 'necesito', 'necesitamos', 'necesita', 'quiero',
        'queremos', 'dame', 'damelos', 'falta', 'faltan', 'tambien', 'ademas', 'luego', 'despues', 'y',
        'e', 'mas', 'me', 'nos', 'hay', 'que', 'tenemos', 'llevamos', 'llevar', 'lleva', 'incluir',
        'anota', 'anotame', 'anotar', 'ah']),

    // Cómo suele transcribir (o escribir) la gente lo que se dice en rodaje
    FUSIONES: [
        [/\b(?:c|si|ci|see|ce|se|sie)\s?s?tan[dt]?s?\b/g, 'c stand'],
        [/\b(?:fuerza|forsa|forza)\b/g, 'forza'],
        [/\b(?:nanlait|nanlight|nanlai|nan lite|nan light)\b/g, 'nanlite'],
        [/\b(?:godocs|godoks|godoc|godock)\b/g, 'godox'],
        [/\b(?:pavo ?tubes?|pabo ?tubes?)\b/g, 'pavotube'],
        [/\bache eme i\b/g, 'hmi'],
        [/\b(?:apiutur|aputur|aputure|aputur)\b/g, 'aputure'],
        [/\b(?:kilo ?vatios?|kilowatts?|kilovatios?)\b/g, 'kw'],
        [/\b(?:vatios?|watts?|watios?)\b/g, 'w'],
        [/\b(?:mafer|maffers?|mafers)\b/g, 'maffer'],
        [/\bgrip ?head\b/g, 'gobo head'],
        [/\bsuper ?clamps?\b/g, 'super clamp']
    ],

    // ---------- Texto → palabras ----------

    plegar(t) {
        return (t || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    },

    /** Palabras comparables: minúsculas, sin acentos ni signos, con las fusiones aplicadas. */
    tokens(texto) {
        let t = this.plegar(texto).replace(/×/g, 'x').replace(/[-_/]/g, ' ').replace(/[^a-z0-9\s]/g, ' ');
        t = t.replace(/\s+/g, ' ').trim();
        this.FUSIONES.forEach(([re, a]) => { t = t.replace(re, a); });
        return t.split(' ').filter(w => w && !this.STOP.has(w));
    },

    variantes(w) {
        const v = new Set([w]);
        if (w.length > 3 && w.endsWith('s')) v.add(w.slice(0, -1));
        if (w.length > 4 && w.endsWith('es')) v.add(w.slice(0, -2));
        if (w.length > 4 && w.endsWith('ces')) v.add(w.slice(0, -3) + 'z');
        return [...v];
    },

    distancia(a, b) {
        if (Math.abs(a.length - b.length) > 2) return 9;
        const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
        for (let j = 1; j <= b.length; j++) d[0][j] = j;
        for (let i = 1; i <= a.length; i++) {
            for (let j = 1; j <= b.length; j++) {
                d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
            }
        }
        return d[a.length][b.length];
    },

    /** ¿La palabra q (lo que dijeron) corresponde a la palabra t (del equipo)? */
    coincide(q, t) {
        if (q === t) return true;
        if (/^\d+$/.test(q)) {
            // "500" coincide con "500", "500c" o "500b", pero no con "5" ni "1500"
            return t.startsWith(q) && /^[a-z]/.test(t.slice(q.length));
        }
        if (/^\d/.test(t) && !/^\d/.test(q)) return false;
        for (const a of this.variantes(q)) {
            for (const b of this.variantes(t)) {
                if (a === b) return true;
                if (a.length >= 4 && b.startsWith(a)) return true;
                if (b.length >= 4 && a.startsWith(b)) return true;
            }
        }
        if (q.length >= 5 && t.length >= 5 && !/\d/.test(q + t)) {
            return this.distancia(q, t) <= (q.length >= 8 ? 2 : 1);
        }
        return false;
    },

    // ---------- Índice del inventario ----------

    _indice() {
        const cat = EQUIPOS_DB;
        const clave = Object.keys(cat).map(c => c + cat[c].items.length).join('|') + '#' + InventarioService.estado.propios.length;
        if (this._cache && this._cache.clave === clave) return this._cache.lista;

        const lista = [];
        for (const c in cat) {
            cat[c].items.forEach(nombre => {
                const propios = this.tokens(nombre);
                const extra = this.tokens(InventarioService.textoBusqueda(nombre)).filter(w => !propios.includes(w));
                lista.push({ nombre, categoria: c, propios, todos: propios.concat(extra) });
            });
        }
        this._cache = { clave, lista };
        return lista;
    },

    /**
     * Mejores equipos para un texto. Devuelve { candidatos:[{nombre,categoria,score,cobertura}], estado }.
     * estado: 'ok' (seguro) | 'revisar' (hay dudas) | 'nuevo' (no existe).
     */
    buscar(texto) {
        const q = this.tokens(texto);
        if (!q.length) return { candidatos: [], estado: 'nuevo' };

        const exacto = InventarioService.buscarExacto(texto);
        if (exacto && !InventarioService.estaOculto(exacto)) {
            return { candidatos: [{ nombre: exacto, categoria: InventarioService.categoriaDe(exacto), score: 1, cobertura: 1 }], estado: 'ok' };
        }

        const res = [];
        this._indice().forEach(it => {
            let hit = 0;
            let numerosOk = true;
            const usados = new Set();
            q.forEach(w => {
                const i = it.todos.findIndex(t => this.coincide(w, t));
                if (i >= 0) { hit++; usados.add(i); }
                else if (/^\d+$/.test(w)) numerosOk = false;
            });
            if (!numerosOk || hit === 0) return;
            const cobertura = hit / q.length;
            if (cobertura < 0.6) return;
            const usadosPropios = [...usados].filter(i => i < it.propios.length).length;
            const precision = it.propios.length ? usadosPropios / it.propios.length : 0;
            res.push({ nombre: it.nombre, categoria: it.categoria, cobertura, score: 0.75 * cobertura + 0.25 * precision });
        });

        res.sort((a, b) => b.score - a.score); // empate: queda primero el que va antes en el catálogo
        const candidatos = res.slice(0, 6);
        if (!candidatos.length) return { candidatos: [], estado: 'nuevo' };

        const [m, s] = candidatos;
        const seguro = m.cobertura === 1 && m.score >= 0.8 && (!s || m.score - s.score >= 0.1);
        return { candidatos, estado: seguro ? 'ok' : 'revisar' };
    },

    // ---------- Frases, cantidades ----------

    _palabras(seg) {
        const o = seg.trim().split(/\s+/).filter(Boolean);
        return { o, n: o.map(w => this.plegar(w).replace(/^[^a-z0-9(]+|[^a-z0-9)]+$/g, '')) };
    },

    /** Saca la cantidad del principio o del final de una frase. */
    extraerCantidad(seg) {
        let { o, n } = this._palabras(seg);
        let cant = null;

        // muletillas iniciales
        while (n.length > 1 && this.RELLENO.has(n[0])) { o.shift(); n.shift(); }

        const esNumero = w => /^\d{1,3}$/.test(w);
        const quitar = k => { o.splice(0, k); n.splice(0, k); };

        if (n[0] === 'media' && n[1] === 'docena') { cant = 6; quitar(2); }
        else if (n[0] && this.NUM[n[0]] && n[1] === 'docena') { cant = 12 * this.NUM[n[0]]; quitar(2); }
        else if (n[0] === 'docena') { cant = 12; quitar(1); }
        else if (n[0] && this.NUM[n[0]] && (n[1] === 'par' || n[1] === 'pares')) { cant = 2 * (n[0] === 'un' || n[0] === 'una' || n[0] === 'uno' ? 1 : this.NUM[n[0]]); quitar(2); }
        else if (n[0] === 'par' || n[0] === 'pares') { cant = 2; quitar(1); }
        else if (n[0] && esNumero(n[0]) && !/^\d+[.,]\d/.test(o[0])) { cant = +n[0]; quitar(1); }
        else if (n[0] && /^\d{1,3}x$/.test(n[0])) { cant = parseInt(n[0], 10); quitar(1); }
        else if (n[0] && /^x\d{1,3}$/.test(n[0])) { cant = parseInt(n[0].slice(1), 10); quitar(1); }
        else if (n[0] && this.NUM[n[0]] && n.length > 1) { cant = this.NUM[n[0]]; quitar(1); }

        if (cant !== null) {
            while (n.length > 1 && ['x', 'u', 'unidad', 'unidades', 'de', 'del'].includes(n[0])) { o.shift(); n.shift(); }
        } else {
            const L = n.length;
            const ult = n[L - 1] || '';
            if (L > 1 && /^x\d{1,3}$/.test(ult)) { cant = +ult.slice(1); o.pop(); n.pop(); }
            else if (L > 2 && esNumero(ult) && (n[L - 2] === 'x' || n[L - 2] === '-' || n[L - 2] === '')) { cant = +ult; o.splice(L - 2, 2); n.splice(L - 2, 2); }
            else if (L > 1 && /^\(\d{1,3}\)$/.test(ult)) { cant = +ult.replace(/\D/g, ''); o.pop(); n.pop(); }
            else if (L > 2 && (ult === 'unidades' || ult === 'unidad' || ult === 'u') && esNumero(n[L - 2])) { cant = +n[L - 2]; o.splice(L - 2, 2); n.splice(L - 2, 2); }
            else if (L > 1 && esNumero(ult) && /[:\-–]$/.test(o[L - 2] || '')) { cant = +ult; o.pop(); o[o.length - 1] = o[o.length - 1].replace(/[:\-–]+$/, ''); n.pop(); }
        }

        const nombre = o.join(' ').replace(/^[\s"'“”«»(\[]+|[\s"'“”«».,;:\-–)\]]+$/g, '').trim();
        return { cantidad: Math.max(1, Math.min(999, cant || 1)), tenia: cant !== null, nombre };
    },

    // ---------- Texto completo → filas ----------

    _esCharla(nombre, tenia, buscado) {
        const t = this.plegar(nombre);
        if (/^(hola|buenas|buen dia|buenos dias|buenas tardes|buenas noches|gracias|muchas gracias|saludos|por favor|ok|dale|listo|genial|perfecto|abrazo)\b/.test(t)) return true;
        if (!tenia && buscado.estado === 'nuevo') {
            if (/[:?!]$/.test(nombre.trim())) return true;
            if (t.split(/\s+/).length > 7) return true;
        }
        return false;
    },

    _separarPorCantidades(parte) {
        // "dos forza 500 tres pelicanos" (dictado sin comas): corta donde empieza
        // otra cantidad, siempre que lo anterior ya sea un equipo conocido.
        const { o, n } = this._palabras(parte);
        if (o.length < 3) return [parte];
        const entero = this.buscar(parte);
        if (entero.candidatos.length && entero.candidatos[0].cobertura === 1) return [parte];

        const cortes = [];
        for (let i = 1; i < o.length - 1; i++) {
            const esPalabraNum = !!this.NUM[n[i]] && n[i] !== 'un' ? true : (n[i] === 'un' || n[i] === 'una');
            const esDigito = /^\d{1,3}$/.test(n[i]) && !/^\d/.test(n[i + 1]) && !['w', 'kw', 'wh', 'm', 'mm', 'cm', 'a', 'v', 'k'].includes(n[i + 1]);
            if (!esPalabraNum && !esDigito) continue;
            const izq = o.slice(cortes.length ? cortes[cortes.length - 1] : 0, i).join(' ');
            const b = this.buscar(this.extraerCantidad(izq).nombre);
            if (b.candidatos.length && b.candidatos[0].cobertura === 1 && b.candidatos[0].score >= 0.7) cortes.push(i);
        }
        if (!cortes.length) return [parte];
        const partes = [];
        let desde = 0;
        cortes.forEach(c => { partes.push(o.slice(desde, c).join(' ')); desde = c; });
        partes.push(o.slice(desde).join(' '));
        return partes;
    },

    analizar(texto) {
        let lineas = (texto || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);

        // Prefijos de WhatsApp: "[12/10 14:32] Juan: ..." o "12/10/24, 14:32 - Juan: ..."
        lineas = lineas.map(l => l
            .replace(/^\[?\d{1,2}[\/.-]\d{1,2}(?:[\/.-]\d{2,4})?,?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:[ap]\.?\s?m\.?)?\]?\s*[-–]?\s*[^:]{1,40}:\s*/i, ''));

        // Lista numerada "1) ... 2) ..." (números de orden, no cantidades)
        const nums = lineas.map(l => (l.match(/^(\d{1,3})[.)]\s+\S/) || [])[1]).map(Number);
        const esIndice = lineas.length >= 2 && nums.every((x, i) => x === i + 1);

        const filas = [];
        lineas.forEach(linea => {
            let l = linea.replace(/^[^\p{L}\p{N}(]+/u, '');
            if (esIndice) l = l.replace(/^\d{1,3}[.)]\s+/, '');

            let partes = l.split(/\s*[;,]+\s*|\s+\+\s+|[.!?]+\s+(?=[\p{L}\p{N}])/u);
            partes = partes.flatMap(p => p.split(/\s+(?:y|e|mas|más|también|tambien)\s+(?=(?:\d{1,3}\b|un\b|una\b|uno\b|dos\b|tres\b|cuatro\b|cinco\b|seis\b|siete\b|ocho\b|nueve\b|diez\b|media\b|docena\b))/i));
            partes = partes.flatMap(p => this._separarPorCantidades(p));

            partes.forEach(p => {
                const { cantidad, tenia, nombre } = this.extraerCantidad(p);
                if (!nombre || !/\p{L}/u.test(nombre)) return;
                const r = this.buscar(nombre);
                if (this._esCharla(nombre, tenia, r)) return;
                filas.push({
                    original: p.trim(),
                    texto: nombre.charAt(0).toUpperCase() + nombre.slice(1),
                    cantidad,
                    estado: r.estado,
                    candidatos: r.candidatos,
                    categoria: r.candidatos[0] ? r.candidatos[0].categoria : InventarioService.adivinarCategoria(nombre)
                });
            });
        });
        return filas;
    }
};
