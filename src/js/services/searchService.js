const SearchService = {
    config: {
        minSearchLength: 2,
        debounceTime: 300,
        maxResults: 50,
        searchableFields: [
            'streetadditionalinfo',
            'city',
            'subdivisionname',
            'publicremarks',
            'propertytypelabel'
        ]
    },

    state: {
        lastQuery: '',
        debounceTimeout: null,
        searchHistory: []
    },

    // Búsqueda principal
    search(query, filters = {}) {
        if (!query || query.length < this.config.minSearchLength) {
            return [];
        }

        const normalizedQuery = this.normalizeText(query);
        const searchTerms = normalizedQuery.split(' ').filter(term => term.length >= this.config.minSearchLength);

        return SAMPLE_LISTINGS.filter(property => {
            // Primero aplicar filtros si existen
            if (!this.matchesFilters(property, filters)) {
                return false;
            }

            // Luego buscar coincidencias con los términos
            return searchTerms.every(term => this.propertyMatchesTerm(property, term));
        }).slice(0, this.config.maxResults);
    },

    // Búsqueda con sugerencias
    searchWithSuggestions(query, filters = {}) {
        const results = this.search(query, filters);
        const suggestions = this.generateSuggestions(query, results);

        return {
            results,
            suggestions,
            count: results.length,
            hasMore: results.length === this.config.maxResults
        };
    },

    // Coincidencia de propiedad con término
    propertyMatchesTerm(property, term) {
        return this.config.searchableFields.some(field => {
            const value = property[field];
            if (!value) return false;

            const normalizedValue = this.normalizeText(value.toString());
            return normalizedValue.includes(term);
        });
    },

    // Verificar si la propiedad cumple con los filtros
    matchesFilters(property, filters) {
        return Object.entries(filters).every(([key, value]) => {
            if (!value) return true;

            switch (key) {
                case 'priceRange':
                    const [min, max] = value.split('-').map(Number);
                    const price = Number(property.currentpricepublic);
                    return price >= min && (!max || price <= max);

                case 'bedrooms':
                    const minBeds = Number(value);
                    const beds = Number(property.bedstotal) || 0;
                    return beds >= minBeds;

                case 'bathrooms':
                    const minBaths = Number(value);
                    const baths = Number(property.bathroomstotaldecimal) || 0;
                    return baths >= minBaths;

                default:
                    return property[key] === value;
            }
        });
    },

    // Generar sugerencias basadas en los resultados
    generateSuggestions(query, results) {
        const suggestions = new Set();
        
        results.forEach(property => {
            // Sugerir ubicaciones
            if (property.city) suggestions.add(property.city);
            if (property.subdivisionname) suggestions.add(property.subdivisionname);

            // Sugerir tipos de propiedad
            if (property.propertytypelabel) suggestions.add(property.propertytypelabel);
        });

        // Filtrar sugerencias que coincidan parcialmente con la consulta
        const normalizedQuery = this.normalizeText(query);
        return Array.from(suggestions)
            .filter(suggestion => 
                this.normalizeText(suggestion).includes(normalizedQuery)
            )
            .slice(0, 5);
    },

    // Búsqueda por proximidad geográfica
    searchByLocation(latitude, longitude, radiusKm, filters = {}) {
        return SAMPLE_LISTINGS
            .filter(property => {
                // Primero verificar filtros
                if (!this.matchesFilters(property, filters)) return false;

                // Luego verificar distancia
                if (!property.latitude || !property.longitude) return false;

                const distance = this.calculateDistance(
                    latitude, longitude,
                    property.latitude, property.longitude
                );

                return distance <= radiusKm;
            })
            .map(property => ({
                ...property,
                distance: this.calculateDistance(
                    latitude, longitude,
                    property.latitude, property.longitude
                )
            }))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, this.config.maxResults);
    },

    // Calcular distancia entre dos puntos (fórmula haversine)
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radio de la Tierra en km
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    },

    // Convertir grados a radianes
    toRad(degrees) {
        return degrees * (Math.PI / 180);
    },

    // Normalizar texto para búsqueda
    normalizeText(text) {
        return text.toString().toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remover acentos
            .replace(/[^a-z0-9\s]/g, ''); // Remover caracteres especiales
    },

    // Gestión del historial de búsqueda
    addToHistory(query) {
        const maxHistoryItems = 10;
        this.state.searchHistory = [
            query,
            ...this.state.searchHistory.filter(q => q !== query)
        ].slice(0, maxHistoryItems);

        this.saveHistory();
    },

    getHistory() {
        return this.state.searchHistory;
    },

    clearHistory() {
        this.state.searchHistory = [];
        this.saveHistory();
    },

    saveHistory() {
        try {
            localStorage.setItem('searchHistory', JSON.stringify(this.state.searchHistory));
        } catch (error) {
            console.error('Error saving search history:', error);
        }
    },

    loadHistory() {
        try {
            const history = localStorage.getItem('searchHistory');
            if (history) {
                this.state.searchHistory = JSON.parse(history);
            }
        } catch (error) {
            console.error('Error loading search history:', error);
            this.state.searchHistory = [];
        }
    },

    // Búsqueda con debounce
    debounceSearch(query, filters, callback) {
        clearTimeout(this.state.debounceTimeout);
        
        this.state.debounceTimeout = setTimeout(() => {
            const results = this.search(query, filters);
            callback(results);
        }, this.config.debounceTime);
    }
};

// Inicializar servicio
SearchService.loadHistory();

// Exportar servicio
window.SearchService = SearchService;