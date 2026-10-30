/**
 * ========================================
 * EQUIPO TABLE COMPONENT (tarjetas de equipos)
 * ========================================
 * Dibuja el catálogo como tarjetas agrupadas por categoría, con controles de
 * cantidad grandes (cómodos con el dedo). No tiene lógica de negocio: los
 * clicks los resuelve NuevoRemito por delegación de eventos (data-act).
 */

const EquipoTable = {

    esc(t) { return InventarioService.escapar(t); },

    /** Controles de cantidad: botón "Agregar" si es 0, o − [n] + si ya hay. */
    controlesHtml(cant) {
        if (cant > 0) {
            return `
                <div class="eq-step">
                    <button class="eq-btn eq-minus" data-act="dec" aria-label="Quitar uno">−</button>
                    <input class="eq-qty" data-act="set" type="number" inputmode="numeric" min="0" max="999"
                           value="${cant}" aria-label="Cantidad" />
                    <button class="eq-btn eq-plus" data-act="inc" aria-label="Sumar uno">+</button>
                </div>`;
        }
        return `<button class="eq-add" data-act="inc"><span class="material-icons-round">add</span>Agregar</button>`;
    },

    /** Selector para cambiar un equipo de categoría. */
    moverHtml(actual) {
        return Object.keys(EQUIPOS_DB_BASE).map(cat => `
            <button class="eq-move-chip ${cat === actual ? 'current' : ''}" data-act="mover" data-cat="${this.esc(cat)}">
                ${EQUIPOS_DB_BASE[cat].emoji} ${this.esc(EQUIPOS_DB_BASE[cat].label)}
            </button>`).join('');
    },

    tarjetaHtml(nombre, indice, cat, cant) {
        const meta = EQUIPOS_DB_BASE[cat] || {};
        return `
            <div class="eq-card ${cant > 0 ? 'selected' : ''}" id="eq-${indice}" data-i="${indice}" style="--cat-color:${meta.color || '#8899b4'}">
                <div class="eq-main">
                    <div class="eq-info">
                        <span class="eq-name">${this.esc(nombre)}</span>
                        ${InventarioService.esPropio(nombre) ? '<span class="eq-tag">Propio</span>' : ''}
                    </div>
                    <div class="eq-ctrl">${this.controlesHtml(cant)}</div>
                    <button class="eq-more" data-act="menu" aria-label="Cambiar de categoría" title="Cambiar de categoría">
                        <span class="material-icons-round">swap_horiz</span>
                    </button>
                </div>
                <div class="eq-move">
                    <span class="eq-move-title">Mover a:</span>${this.moverHtml(cat)}
                </div>
            </div>`;
    },

    /**
     * Devuelve { html, lista }. "lista" es el arreglo de nombres en el orden
     * dibujado; cada tarjeta guarda su posición en data-i.
     */
    gridHtml(categorias, cantidades) {
        const lista = [];
        let html = '';
        for (const cat in categorias) {
            const data = categorias[cat];
            if (!data.items.length) continue;
            html += `
                <section class="eq-section" data-cat="${this.esc(cat)}">
                    <h3 class="eq-section-title" style="--cat-color:${data.color}">
                        <span class="material-icons-round">${data.icon}</span>
                        ${this.esc(data.label || cat)}
                        <small>${data.items.length}</small>
                    </h3>
                    <div class="eq-grid">`;
            data.items.forEach(nombre => {
                html += this.tarjetaHtml(nombre, lista.length, cat, cantidades[nombre] || 0);
                lista.push(nombre);
            });
            html += '</div></section>';
        }
        return { html, lista };
    },

    /** Actualiza SOLO los controles de una tarjeta (el scroll no se mueve). */
    actualizarTarjeta(indice, cant) {
        const card = document.getElementById('eq-' + indice);
        if (!card) return;
        const ctrl = card.querySelector('.eq-ctrl');
        const teniaInput = !!card.querySelector('.eq-qty');
        card.classList.toggle('selected', cant > 0);

        if (teniaInput && cant > 0) {
            const input = card.querySelector('.eq-qty');
            if (document.activeElement !== input) input.value = cant;
        } else {
            ctrl.innerHTML = this.controlesHtml(cant);
            ctrl.classList.remove('swap');
            void ctrl.offsetWidth;
            ctrl.classList.add('swap');
        }

        const qty = card.querySelector('.eq-qty');
        if (qty) {
            qty.classList.remove('bump');
            void qty.offsetWidth;
            qty.classList.add('bump');
        }
    }
};
