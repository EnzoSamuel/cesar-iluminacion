/**
 * ========================================
 * MODAL COMPONENT
 * ========================================
 */

const Modal = {

    container: null,

    init() {
        this.container = document.getElementById('modal-container');
    },

    /**
     * Abrir un modal
     */
    open({ title, icon, content, footer, size = 'normal' }) {
        if (!this.container) this.init();

        const maxWidths = {
            small: '400px',
            normal: '560px',
            large: '720px'
        };

        this.container.innerHTML = `
            <div class="modal-overlay" onclick="Modal.closeOnOverlay(event)">
                <div class="modal" style="max-width: ${maxWidths[size] || maxWidths.normal}">
                    <div class="modal-header">
                        <h3>
                            ${icon ? `<span class="material-icons-round">${icon}</span>` : ''}
                            ${title}
                        </h3>
                        <button class="modal-close" onclick="Modal.close()">
                            <span class="material-icons-round">close</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                    ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
                </div>
            </div>
        `;

        // Escuchar ESC
        this._escHandler = (e) => {
            if (e.key === 'Escape') this.close();
        };
        document.addEventListener('keydown', this._escHandler);
    },

    /**
     * Cerrar modal
     */
    close() {
        if (!this.container) return;
        this.container.innerHTML = '';
        if (this._escHandler) {
            document.removeEventListener('keydown', this._escHandler);
        }
    },

    /**
     * Cerrar al hacer click en overlay
     */
    closeOnOverlay(event) {
        if (event.target.classList.contains('modal-overlay')) {
            this.close();
        }
    },

    /**
     * Modal de confirmación
     */
    confirm({ title, message, icon = 'warning', confirmText = 'Confirmar', cancelText = 'Cancelar', onConfirm }) {
        this.open({
            title: title,
            icon: icon,
            content: `<p style="color: var(--text-secondary); line-height: 1.6;">${message}</p>`,
            footer: `
                <button class="btn-outline" onclick="Modal.close()">${cancelText}</button>
                <button class="btn-danger" onclick="Modal._onConfirm()">${confirmText}</button>
            `
        });

        this._onConfirm = () => {
            this.close();
            if (onConfirm) onConfirm();
        };
    }
};