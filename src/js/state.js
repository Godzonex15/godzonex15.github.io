const APP_STATE = {
    // Estado inicial
    currentView: 'grid',
    activeFilters: {},
    map: null,
    markers: [],
    selectedProperty: null,
    currentGalleryIndex: 0,
    favorites: new Set(),
    modalMap: null,
    initialized: false,

    // Métodos para manipular el estado
    setView(view) {
        if (view !== 'list' && view !== 'grid') return;
        this.currentView = view;
        this.notifySubscribers('viewChanged', view);
    },

    setFilter(filterType, value) {
        if (!value || value === '') {
            delete this.activeFilters[filterType];
        } else {
            this.activeFilters[filterType] = value;
        }
        this.notifySubscribers('filtersChanged', this.activeFilters);
    },

    setSelectedProperty(propertyId) {
        this.selectedProperty = propertyId;
        this.notifySubscribers('propertySelected', propertyId);
        // Llamar directamente a la función de actualización del preview
        updateSelectedPropertyPreview(propertyId);
    },

    toggleFavorite(propertyId) {
        if (this.favorites.has(propertyId)) {
            this.favorites.delete(propertyId);
        } else {
            this.favorites.add(propertyId);
        }
        localStorage.setItem('favorites', JSON.stringify([...this.favorites]));
        this.notifySubscribers('favoritesChanged', propertyId);
    },

    // Sistema de suscripción para actualizaciones de estado
    subscribers: {},

    subscribe(event, callback) {
        if (!this.subscribers[event]) {
            this.subscribers[event] = [];
        }
        this.subscribers[event].push(callback);
        return () => {
            this.subscribers[event] = this.subscribers[event].filter(cb => cb !== callback);
        };
    },

    notifySubscribers(event, data) {
        if (!this.subscribers[event]) return;
        this.subscribers[event].forEach(callback => callback(data));
    },

    // Inicialización
    init() {
        // Cargar favoritos del localStorage
        const savedFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        this.favorites = new Set(savedFavorites);

        // Configurar suscriptores iniciales
        this.setupInitialSubscribers();

        // Marcar como inicializado después de un breve retraso
        setTimeout(() => {
            this.initialized = true;
        }, 200);
    },

    setupInitialSubscribers() {
        // Suscriptor para cambios en la vista
        this.subscribe('viewChanged', (view) => {
            document.querySelectorAll('.view-controls-container .btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.view === view);
            });
        });
    
        // Suscriptor para cambios en los filtros
        this.subscribe('filtersChanged', () => {
            if (typeof FilterBar !== 'undefined' && FilterBar.updateFilterTags) {
                FilterBar.updateFilterTags();
            }
            if (typeof window.applyFilters === 'function') {
                window.applyFilters();
            }
        });
    
        // Suscriptor para selección de propiedad
        this.subscribe('propertySelected', (propertyId) => {
            // Llamar directamente a la función de actualización del preview
            if (typeof window.updateSelectedPropertyPreview === 'function') {
                window.updateSelectedPropertyPreview(propertyId);
            }
            
            // Actualizar marcador en el mapa
            if (PropertyMap && typeof PropertyMap.highlightMarker === 'function') {
                PropertyMap.highlightMarker(propertyId);
            }
        });
    
        // Suscriptor para cambios en favoritos
        this.subscribe('favoritesChanged', (propertyId) => {
            // Actualizar botones de favoritos
            document.querySelectorAll(`.favorite-btn[data-property-id="${propertyId}"]`)
                .forEach(btn => {
                    const isFavorite = this.favorites.has(propertyId);
                    btn.classList.toggle('active', isFavorite);
                    btn.querySelector('i').className = isFavorite ? 'fas fa-heart' : 'far fa-heart';
                });
        });
    }
 }

// Inicializar el estado de la aplicación
APP_STATE.init();