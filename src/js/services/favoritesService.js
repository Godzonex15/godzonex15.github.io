const FavoritesService = {
    state: {
        favorites: new Set(),
        lastSync: null,
        syncInterval: 30000, // 30 segundos
        maxFavorites: 100
    },

    events: {
        FAVORITE_ADDED: 'favorite_added',
        FAVORITE_REMOVED: 'favorite_removed',
        FAVORITES_CLEARED: 'favorites_cleared',
        FAVORITES_LOADED: 'favorites_loaded',
        SYNC_COMPLETE: 'sync_complete',
        SYNC_ERROR: 'sync_error'
    },

    init() {
        this.loadFavorites();
        this.startAutoSync();
        this.bindEvents();
    },

    // Gestión de favoritos
    addFavorite(propertyId) {
        if (this.state.favorites.size >= this.state.maxFavorites) {
            NotificationService.warning(
                `You can only save up to ${this.state.maxFavorites} favorites. Please remove some before adding more.`,
                { title: 'Maximum Favorites Reached' }
            );
            return false;
        }

        const property = SAMPLE_LISTINGS.find(p => p.id === propertyId);
        if (!property) {
            console.error('Property not found:', propertyId);
            return false;
        }

        this.state.favorites.add(propertyId);
        this.saveFavorites();
        
        this.dispatchEvent(this.events.FAVORITE_ADDED, { propertyId, property });
        
        NotificationService.success('Property added to favorites', {
            title: 'Added to Favorites',
            duration: 2000
        });

        AnalyticsService.trackFavoriteToggle(propertyId, true);
        return true;
    },

    removeFavorite(propertyId) {
        if (!this.state.favorites.has(propertyId)) return false;

        this.state.favorites.delete(propertyId);
        this.saveFavorites();
        
        this.dispatchEvent(this.events.FAVORITE_REMOVED, { propertyId });
        
        NotificationService.info('Property removed from favorites', {
            title: 'Removed from Favorites',
            duration: 2000
        });

        AnalyticsService.trackFavoriteToggle(propertyId, false);
        return true;
    },

    toggleFavorite(propertyId) {
        return this.state.favorites.has(propertyId) ?
            this.removeFavorite(propertyId) :
            this.addFavorite(propertyId);
    },

    clearFavorites() {
        this.state.favorites.clear();
        this.saveFavorites();
        
        this.dispatchEvent(this.events.FAVORITES_CLEARED);
        
        NotificationService.info('All favorites have been cleared', {
            title: 'Favorites Cleared'
        });
    },

    // Persistencia
    loadFavorites() {
        try {
            const savedFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
            this.state.favorites = new Set(savedFavorites);
            this.state.lastSync = Date.now();
            
            this.dispatchEvent(this.events.FAVORITES_LOADED, {
                count: this.state.favorites.size
            });
        } catch (error) {
            console.error('Error loading favorites:', error);
            NotificationService.error('Error loading favorites');
        }
    },

    saveFavorites() {
        try {
            localStorage.setItem('favorites', 
                JSON.stringify([...this.state.favorites])
            );
            this.state.lastSync = Date.now();
        } catch (error) {
            console.error('Error saving favorites:', error);
            NotificationService.error('Error saving favorites');
        }
    },

    // Sincronización automática
    startAutoSync() {
        setInterval(() => this.sync(), this.state.syncInterval);
    },

    async sync() {
        try {
            // Aquí iría la lógica de sincronización con el servidor
            // Por ahora solo simulamos una sincronización
            await new Promise(resolve => setTimeout(resolve, 500));
            
            this.state.lastSync = Date.now();
            this.dispatchEvent(this.events.SYNC_COMPLETE, {
                timestamp: this.state.lastSync
            });
        } catch (error) {
            console.error('Error syncing favorites:', error);
            this.dispatchEvent(this.events.SYNC_ERROR, { error });
        }
    },

    // Sistema de eventos
    listeners: {},

    addEventListener(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = new Set();
        }
        this.listeners[event].add(callback);
        
        // Retornar función para remover el listener
        return () => this.listeners[event].delete(callback);
    },

    dispatchEvent(event, data = {}) {
        if (!this.listeners[event]) return;
        this.listeners[event].forEach(callback => callback(data));
    },

    bindEvents() {
        // Sincronizar al recuperar foco
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && 
                Date.now() - this.state.lastSync > this.state.syncInterval) {
                this.sync();
            }
        });

        // Sincronizar antes de cerrar
        window.addEventListener('beforeunload', () => {
            this.saveFavorites();
        });
    },

    // Métodos de utilidad
    getFavorites() {
        return [...this.state.favorites];
    },

    getFavoriteProperties() {
        return SAMPLE_LISTINGS.filter(property => 
            this.state.favorites.has(property.id)
        );
    },

    isFavorite(propertyId) {
        return this.state.favorites.has(propertyId);
    },

    getCount() {
        return this.state.favorites.size;
    },

    getLastSync() {
        return this.state.lastSync;
    }
};

// Inicializar el servicio
FavoritesService.init();