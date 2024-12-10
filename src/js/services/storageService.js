const StorageService = {
    // Claves de almacenamiento
    keys: {
        FAVORITES: 'favorites',
        FILTERS: 'filters',
        VIEW_PREFERENCE: 'viewPreference'
    },

    // Métodos de almacenamiento
    save(key, value) {
        try {
            const serializedValue = JSON.stringify(value);
            localStorage.setItem(key, serializedValue);
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    },

    load(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : defaultValue;
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return defaultValue;
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    },

    // Métodos específicos para favoritos
    saveFavorites(favorites) {
        return this.save(this.keys.FAVORITES, Array.from(favorites));
    },

    loadFavorites() {
        return new Set(this.load(this.keys.FAVORITES, []));
    },

    // Métodos específicos para filtros
    saveFilters(filters) {
        return this.save(this.keys.FILTERS, filters);
    },

    loadFilters() {
        return this.load(this.keys.FILTERS, {});
    },

    // Métodos específicos para preferencias de vista
    saveViewPreference(view) {
        return this.save(this.keys.VIEW_PREFERENCE, view);
    },

    loadViewPreference() {
        return this.load(this.keys.VIEW_PREFERENCE, 'grid');
    },

    // Método para limpiar todo el almacenamiento
    clearAll() {
        try {
            Object.values(this.keys).forEach(key => {
                localStorage.removeItem(key);
            });
            return true;
        } catch (error) {
            console.error('Error clearing localStorage:', error);
            return false;
        }
    }
};

// Congelar el servicio para prevenir modificaciones
Object.freeze(StorageService);