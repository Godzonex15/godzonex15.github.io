const NotificationService = {
    types: {
        SUCCESS: 'success',
        ERROR: 'error',
        WARNING: 'warning',
        INFO: 'info'
    },

    defaultOptions: {
        duration: 3000,
        position: 'top-right',
        closeable: true,
        animate: true
    },

    init() {
        this.createNotificationContainer();
        this.bindEvents();
    },

    createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'notification-container';
        document.body.appendChild(container);

        // Agregar estilos si no existen
        if (!document.getElementById('notification-styles')) {
            const styles = `
                .notification-container {
                    position: fixed;
                    z-index: 9999;
                    max-width: 400px;
                    padding: 1rem;
                }

                .notification-container.top-right {
                    top: 1rem;
                    right: 1rem;
                }

                .notification-container.top-left {
                    top: 1rem;
                    left: 1rem;
                }

                .notification {
                    background: var(--glass-background);
                    backdrop-filter: blur(10px);
                    border-radius: 8px;
                    padding: 1rem;
                    margin-bottom: 0.5rem;
                    box-shadow: var(--glass-shadow);
                    display: flex;
                    align-items: flex-start;
                    gap: 0.75rem;
                    max-width: 100%;
                    opacity: 0;
                    transform: translateX(100%);
                    transition: all 0.3s ease;
                }

                .notification.show {
                    opacity: 1;
                    transform: translateX(0);
                }

                .notification.success { border-left: 4px solid var(--success-color); }
                .notification.error { border-left: 4px solid var(--danger-color); }
                .notification.warning { border-left: 4px solid var(--warning-color); }
                .notification.info { border-left: 4px solid var(--primary-color); }

                .notification-icon {
                    font-size: 1.25rem;
                    flex-shrink: 0;
                }

                .notification.success .notification-icon { color: var(--success-color); }
                .notification.error .notification-icon { color: var(--danger-color); }
                .notification.warning .notification-icon { color: var(--warning-color); }
                .notification.info .notification-icon { color: var(--primary-color); }

                .notification-content {
                    flex: 1;
                    min-width: 0;
                }

                .notification-title {
                    font-weight: 600;
                    margin-bottom: 0.25rem;
                }

                .notification-message {
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                }

                .notification-close {
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    padding: 0.25rem;
                    font-size: 1rem;
                    opacity: 0.7;
                    transition: opacity 0.2s ease;
                }

                .notification-close:hover {
                    opacity: 1;
                }
            `;

            const styleElement = document.createElement('style');
            styleElement.id = 'notification-styles';
            styleElement.textContent = styles;
            document.head.appendChild(styleElement);
        }
    },

    show(message, type = 'info', options = {}) {
        const settings = { ...this.defaultOptions, ...options };
        const container = document.getElementById('notification-container');
        if (!container) return;

        // Crear notificación
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // Configurar ícono según tipo
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        notification.innerHTML = `
            <i class="fas ${icons[type]} notification-icon"></i>
            <div class="notification-content">
                ${options.title ? `<div class="notification-title">${options.title}</div>` : ''}
                <div class="notification-message">${message}</div>
            </div>
            ${settings.closeable ? `
                <button class="notification-close" aria-label="Close notification">
                    <i class="fas fa-times"></i>
                </button>
            ` : ''}
        `;

        // Agregar al contenedor
        container.appendChild(notification);

        // Mostrar con animación
        if (settings.animate) {
            setTimeout(() => notification.classList.add('show'), 10);
        } else {
            notification.classList.add('show');
        }

        // Configurar auto-cierre
        if (settings.duration > 0) {
            setTimeout(() => this.close(notification), settings.duration);
        }

        // Manejar cierre manual
        if (settings.closeable) {
            const closeBtn = notification.querySelector('.notification-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.close(notification));
            }
        }

        return notification;
    },

    // Métodos de conveniencia
    success(message, options = {}) {
        return this.show(message, this.types.SUCCESS, options);
    },

    error(message, options = {}) {
        return this.show(message, this.types.ERROR, options);
    },

    warning(message, options = {}) {
        return this.show(message, this.types.WARNING, options);
    },

    info(message, options = {}) {
        return this.show(message, this.types.INFO, options);
    },

    close(notification) {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    },

    closeAll() {
        const container = document.getElementById('notification-container');
        if (container) {
            const notifications = container.querySelectorAll('.notification');
            notifications.forEach(notification => this.close(notification));
        }
    },

    bindEvents() {
        // Cerrar notificaciones al cambiar de pestaña
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.closeAll();
            }
        });

        // Pausar temporizadores al hacer hover
        document.addEventListener('mouseover', (e) => {
            const notification = e.target.closest('.notification');
            if (notification) {
                notification.dataset.paused = 'true';
            }
        });

        document.addEventListener('mouseout', (e) => {
            const notification = e.target.closest('.notification');
            if (notification) {
                delete notification.dataset.paused;
            }
        });
    }
};

// Inicializar el servicio
NotificationService.init();