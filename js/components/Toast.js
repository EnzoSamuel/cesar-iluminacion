/**
 * ========================================
 * TOAST COMPONENT
 * ========================================
 */

const Toast = {

    container: null,

    init() {
        this.container = document.getElementById('toast-container');
    },

    show(type, title, message, duration = 4000) {
        if (!this.container) this.init();

        const icons = {
            success: 'check_circle',
            error: 'error',
            warning: 'warning',
            info: 'info'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.style.setProperty('--toast-duration', `${duration / 1000}s`);

        toast.innerHTML = `
            <span class="material-icons-round toast-icon">${icons[type] || 'info'}</span>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <span class="material-icons-round">close</span>
            </button>
        `;

        this.container.appendChild(toast);

        // Remover automáticamente
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, duration + 300);
    },

    success(title, message) {
        this.show('success', title, message);
    },

    error(title, message) {
        this.show('error', title, message);
    },

    warning(title, message) {
        this.show('warning', title, message);
    },

    info(title, message) {
        this.show('info', title, message);
    }
};