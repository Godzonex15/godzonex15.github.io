const FilterBar = {
    state: {
        activeFilters: {}
    },

    init() {
        this.loadSavedFilters();
        this.bindEvents();
        this.updateFilterTags();
    },

    loadSavedFilters() {
        const savedFilters = StorageService.loadFilters();
        if (savedFilters) {
            this.state.activeFilters = savedFilters;
            this.applyFiltersToInputs();
        }
    },

    bindEvents() {
        // Eventos de los selectores de filtro
        document.querySelectorAll('select[id]').forEach(select => {
            select.addEventListener('change', (e) => {
                this.updateFilter(e.target.id, e.target.value);
            });
        });

        // Evento para limpiar todos los filtros
        const clearAllBtn = document.querySelector('.clear-all-filters');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => this.clearAllFilters());
        }

        // Delegación de eventos para remover filtros individuales
        document.getElementById('filterTags')?.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('.remove-filter');
            if (removeBtn) {
                const filterType = removeBtn.dataset.filterType;
                if (filterType) {
                    this.removeFilter(filterType);
                }
            }
        });
    },

    updateFilter(filterType, value) {
        if (!value || value === '') {
            delete this.state.activeFilters[filterType];
        } else {
            this.state.activeFilters[filterType] = value;
        }

        StorageService.saveFilters(this.state.activeFilters);
        this.updateFilterTags();
        APP_STATE.setFilter(filterType, value);
    },

    removeFilter(filterType) {
        const select = document.getElementById(filterType);
        if (select) {
            select.value = '';
        }
        
        delete this.state.activeFilters[filterType];
        StorageService.saveFilters(this.state.activeFilters);
        this.updateFilterTags();
        APP_STATE.setFilter(filterType, '');
    },

    clearAllFilters() {
        document.querySelectorAll('select[id]').forEach(select => {
            select.value = '';
        });

        this.state.activeFilters = {};
        StorageService.saveFilters(this.state.activeFilters);
        this.updateFilterTags();
        
        Object.keys(APP_STATE.activeFilters).forEach(filterType => {
            APP_STATE.setFilter(filterType, '');
        });
    },

    updateFilterTags() {
        const container = document.getElementById('filterTags');
        if (!container) return;

        const tags = Object.entries(this.state.activeFilters)
            .filter(([_, value]) => value)
            .map(([type, value]) => this.createFilterTag(type, value));

        container.innerHTML = tags.join('');

        // Actualizar visibilidad del contenedor de filtros activos
        const activeFilters = document.getElementById('activeFilters');
        if (activeFilters) {
            activeFilters.style.display = tags.length > 0 ? 'block' : 'none';
        }
    },

    createFilterTag(type, value) {
        let displayValue = value;

        // Formatear valores específicos
        switch(type) {
            case 'priceRange':
                const [min, max] = value.split('-');
                displayValue = max ? 
                    `${Formatters.formatPrice(min)} - ${Formatters.formatPrice(max)}` : 
                    `${Formatters.formatPrice(min)}+`;
                break;
            case 'bedrooms':
            case 'bathrooms':
                displayValue = `${value}+`;
                break;
        }

        // Formatear nombres de filtros
        const filterNames = {
            propertyType: 'Type',
            location: 'Location',
            priceRange: 'Price',
            bedrooms: 'Beds',
            bathrooms: 'Baths'
        };

        return `
            <span class="filter-tag">
                ${filterNames[type] || type}: ${displayValue}
                <button class="remove-filter" 
                        data-filter-type="${type}"
                        aria-label="Remove ${filterNames[type] || type} filter">
                    <i class="fas fa-times"></i>
                </button>
            </span>
        `;
    },

    applyFiltersToInputs() {
        Object.entries(this.state.activeFilters).forEach(([type, value]) => {
            const input = document.getElementById(type);
            if (input) {
                input.value = value;
            }
        });
    },

    getActiveFilters() {
        return {...this.state.activeFilters};
    }
};

// Inicializar el componente
FilterBar.init();