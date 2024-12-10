const DOMHelpers = {
    // Crear elemento
    createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        
        // Establecer atributos
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else if (key.startsWith('on') && typeof value === 'function') {
                element.addEventListener(key.substring(2).toLowerCase(), value);
            } else {
                element.setAttribute(key, value);
            }
        });

        // Añadir hijos
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child instanceof Node) {
                element.appendChild(child);
            }
        });

        return element;
    },

    // Limpiar elemento
    clearElement(element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    },

    // Mostrar/ocultar elemento
    toggleElement(element, show) {
        if (element) {
            element.style.display = show ? '' : 'none';
        }
    },

    // Añadir/remover clase
    toggleClass(element, className, force) {
        if (element) {
            element.classList.toggle(className, force);
        }
    },

    // Establecer contenido HTML de forma segura
    setHTML(element, html) {
        if (element) {
            element.innerHTML = this.sanitizeHTML(html);
        }
    },

    // Sanitizar HTML
    sanitizeHTML(html) {
        const template = document.createElement('template');
        template.innerHTML = html.trim();
        return template.innerHTML;
    },

    // Eventos
    addEventListeners(element, events = {}) {
        Object.entries(events).forEach(([event, handler]) => {
            element.addEventListener(event, handler);
        });

        // Retornar función para remover eventos
        return () => {
            Object.entries(events).forEach(([event, handler]) => {
                element.removeEventListener(event, handler);
            });
        };
    },

    // Delegación de eventos
    delegate(element, eventType, selector, handler) {
        element.addEventListener(eventType, event => {
            const target = event.target.closest(selector);
            if (target && element.contains(target)) {
                handler.call(target, event);
            }
        });
    },

    // Animaciones
    fadeIn(element, duration = 300) {
        element.style.opacity = 0;
        element.style.display = '';

        return new Promise(resolve => {
            requestAnimationFrame(() => {
                element.style.transition = `opacity ${duration}ms`;
                element.style.opacity = 1;
                setTimeout(resolve, duration);
            });
        });
    },

    fadeOut(element, duration = 300) {
        return new Promise(resolve => {
            element.style.transition = `opacity ${duration}ms`;
            element.style.opacity = 0;
            
            setTimeout(() => {
                element.style.display = 'none';
                resolve();
            }, duration);
        });
    },

    // Manipulación de formularios
    serializeForm(form) {
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        return data;
    },

    // Scroll
    scrollIntoView(element, options = {}) {
        element.scrollIntoView({
            behavior: options.behavior || 'smooth',
            block: options.block || 'start',
            inline: options.inline || 'nearest'
        });
    },

    // Detección de visibilidad
    isElementInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    },

    // Observador de intersección
    createIntersectionObserver(callback, options = {}) {
        return new IntersectionObserver(callback, {
            root: options.root || null,
            rootMargin: options.rootMargin || '0px',
            threshold: options.threshold || 0
        });
    }
};

// Congelar el objeto de helpers para prevenir modificaciones
Object.freeze(DOMHelpers);