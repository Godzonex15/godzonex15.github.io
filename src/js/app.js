document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing app...');
    
    // Variable para controlar inicialización
    let initialized = false;

    // Función para inicializar la app
    const initApp = async () => {
        try {
            showLoadingOverlay();

            // Inicializar estado global
            APP_STATE.init();
            
            // Inicializar componentes principales
            initializeComponents();
            
            // Establecer vista inicial
            const savedView = StorageService.loadViewPreference();
            changeView(savedView);

            // Cargar propiedades iniciales sin mostrar error
            const filteredListings = FilterService.applyFilters(SAMPLE_LISTINGS, APP_STATE.activeFilters);
            const sortedListings = FilterService.sortProperties(filteredListings);
            updateResults(sortedListings);
            updateMarkers(sortedListings);

            // Marcar como inicializado
            initialized = true;

        } catch (error) {
            console.error('Error initializing app:', error);
        } finally {
            hideLoadingOverlay();
        }
    };

    // Iniciar la aplicación
    initApp();
});

function initializeComponents() {
    // Inicializar mapa principal
    PropertyMap.initializeMainMap();
    
    // Inicializar filtros
    initializeFilters();
    
    // Inicializar eventos globales
    initializeEventListeners();
    
    // Inicializar componentes de UI
    initializeUIComponents();
    
    // Inicializar carga de imágenes
    initializeImageLoading();
}

function initializeFilters() {
    // Inicializar filtros básicos y avanzados
    Object.entries(FilterService.filterDefinitions).forEach(([filterId, definition]) => {
        const select = document.getElementById(filterId);
        if (select) {
            // Poblar opciones del select
            select.innerHTML = definition.options.map(option => 
                `<option value="${option.value}">${option.label}</option>`
            ).join('');
            
            // Agregar evento change
            select.addEventListener('change', (e) => {
                updateFilter(filterId, e.target.value);
            });
        }
    });

    // Inicializar botón de búsqueda
    const searchButton = document.querySelector('.search-btn');
    if (searchButton) {
        searchButton.addEventListener('click', (e) => {
            e.preventDefault();
            applyFilters();
        });
    }

    // Inicializar formulario de búsqueda
    const searchForm = document.querySelector('.search-container form');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            applyFilters();
        });
    }

    // Inicializar botón de limpieza
    const clearAllBtn = document.querySelector('.clear-all-filters');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAllFilters);
    }

    // Inicializar eventos de filtros activos
    document.getElementById('filterTags')?.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove-filter');
        if (removeBtn) {
            const filterType = removeBtn.dataset.filterType;
            if (filterType) {
                removeFilter(filterType);
            }
        }
    });
}

function initializeEventListeners() {
    // Evento de cambio de tamaño de ventana
    window.addEventListener('resize', debounce(() => {
        PropertyMap.updateMap();
    }, 250));

    // Eventos de visibilidad de página
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            PropertyMap.updateMap();
        }
    });
}

function initializeUIComponents() {
    // Tooltips y popovers de Bootstrap
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl));
}

function initializeImageLoading() {
    document.addEventListener('load', function(e) {
        if (e.target.tagName === 'IMG') {
            e.target.classList.add('loaded');
        }
    }, true);
}

function updateFilter(filterType, value) {
    if (!value || value === '') {
        delete APP_STATE.activeFilters[filterType];
    } else {
        APP_STATE.activeFilters[filterType] = value;
    }
    
    applyFilters();
}

function removeFilter(filterType) {
    const select = document.getElementById(filterType);
    if (select) {
        select.value = '';
    }
    delete APP_STATE.activeFilters[filterType];
    applyFilters();
}

function clearAllFilters() {
    // Limpiar todos los selectores
    document.querySelectorAll('select[id]').forEach(select => {
        select.value = '';
    });

    // Limpiar filtros activos
    APP_STATE.activeFilters = {};
    applyFilters();
}

function applyFilters() {
    showLoadingOverlay();

    try {
        const filteredListings = FilterService.applyFilters(SAMPLE_LISTINGS, APP_STATE.activeFilters);
        const sortedListings = FilterService.sortProperties(filteredListings);
        updateResults(sortedListings);
        updateMarkers(sortedListings);
        updateFilterTags();
    } catch (error) {
        console.error('Error applying filters:', error);
        if (APP_STATE.initialized) {
            NotificationService.error('Error filtering properties. Please try again.');
        }
    } finally {
        hideLoadingOverlay();
    }
}

function updateResults(filteredListings) {
    // Actualizar contador de resultados
    const resultsCount = document.getElementById('resultsCount');
    if (resultsCount) {
        resultsCount.textContent = filteredListings.length;
    }

    // Actualizar lista de propiedades
    const container = document.getElementById('propertiesList');
    if (container) {
        container.innerHTML = filteredListings.map(listing => 
            PropertyCard.render(listing, APP_STATE.currentView)
        ).join('');
    }
}

function updateMarkers(filteredListings) {
    PropertyMap.addMarkers(filteredListings, (propertyId) => {
        APP_STATE.setSelectedProperty(propertyId);
    });
}

function updateFilterTags() {
    const container = document.getElementById('filterTags');
    if (!container) return;

    const tags = Object.entries(APP_STATE.activeFilters)
        .filter(([_, value]) => value)
        .map(([type, value]) => {
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
                    <button class="remove-filter" data-filter-type="${type}" 
                            aria-label="Remove ${filterNames[type] || type} filter">
                        <i class="fas fa-times"></i>
                    </button>
                </span>
            `;
        }).join('');

    container.innerHTML = tags;

    // Actualizar visibilidad del contenedor de filtros activos
    const activeFilters = document.getElementById('activeFilters');
    if (activeFilters) {
        activeFilters.style.display = Object.keys(APP_STATE.activeFilters).length > 0 ? 'block' : 'none';
    }
}

function toggleAdvancedFilters() {
    const advancedFilters = document.getElementById('advancedFilters');
    const toggleBtn = document.querySelector('.advanced-filters-toggle i');
    
    if (advancedFilters.style.display === 'none') {
        advancedFilters.style.display = 'block';
        toggleBtn.classList.replace('fa-chevron-down', 'fa-chevron-up');
    } else {
        advancedFilters.style.display = 'none';
        toggleBtn.classList.replace('fa-chevron-up', 'fa-chevron-down');
    }
}

function changeView(viewType) {
    if (viewType !== 'list' && viewType !== 'grid') return;
    
    APP_STATE.setView(viewType);
    StorageService.saveViewPreference(viewType);
    
    const container = document.getElementById('propertiesList');
    if (container) {
        container.className = `properties-container ${viewType}-layout`;
        applyFilters();
    }
}

function showLoadingOverlay() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
        overlay.offsetHeight; // Forzar reflow
        overlay.classList.add('visible');
    }
}

function hideLoadingOverlay() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) {
        overlay.classList.remove('visible');
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function updateSelectedPropertyPreview(propertyId) {
    const property = SAMPLE_LISTINGS.find(p => p.id === propertyId);
    const previewContainer = document.getElementById('selectedProperty');
    
    if (!property || !previewContainer) return;

    previewContainer.classList.add('active');
    
    previewContainer.innerHTML = `
        <div class="preview-content">
            <div class="preview-image">
                <img src="${property.imageUrl?.Uri800 || property.photos?.[0]?.Uri800 || '/api/placeholder/400/300'}" 
                     alt="${property.propertytypelabel}"
                     onerror="this.src='/api/placeholder/400/300'">
                <div class="price-tag">
                    ${Formatters.formatPrice(property.currentpricepublic)}
                    <div class="price-conversion">
                        ${Formatters.formatPrice(property.currentpricepublic * CONFIG.currency.exchangeRate, { currency: 'MXN' })}
                    </div>
                </div>
            </div>
            <div class="preview-details">
                <h3 class="preview-title">${property.streetadditionalinfo || property.propertytypelabel}</h3>
                <div class="preview-location">
                    <i class="fas fa-map-marker-alt"></i>
                    ${property.subdivisionname || ''}, ${property.city}
                </div>
                <div class="preview-specs">
                    ${property.bedstotal ? `
                        <span class="spec-item">
                            <i class="fas fa-bed"></i> ${property.bedstotal} beds
                        </span>
                    ` : ''}
                    ${property.bathroomstotaldecimal ? `
                        <span class="spec-item">
                            <i class="fas fa-bath"></i> ${property.bathroomstotaldecimal} baths
                        </span>
                    ` : ''}
                    ${property.buildingareatotal ? `
                        <span class="spec-item">
                            <i class="fas fa-ruler-combined"></i> 
                            ${Formatters.formatArea(property.buildingareatotal)}
                        </span>
                    ` : ''}
                </div>
                <div class="preview-description">
                    ${property.publicremarks ? 
                        Formatters.truncateText(property.publicremarks, 150) : ''}
                </div>
                <div class="preview-actions">
                    <button onclick="showPropertyDetails('${property.id}')" class="btn btn-primary">
                        <i class="fas fa-info-circle"></i> View Details
                    </button>
                    <button onclick="contactAgent('${property.id}')" class="btn btn-outline-primary">
                        <i class="fas fa-envelope"></i> Contact Agent
                    </button>
                </div>
            </div>
        </div>
    `;

    if (PropertyMap && typeof PropertyMap.highlightMarker === 'function') {
        PropertyMap.highlightMarker(propertyId);
    }
}

// Exponer funciones globales necesarias
window.showPropertyDetails = (propertyId) => PropertyModal.show(propertyId);
window.scheduleViewing = (propertyId) => PropertyModal.scheduleViewing(propertyId);
window.contactAgent = (propertyId) => PropertyModal.contactAgent(propertyId);
window.changeView = changeView;
window.toggleAdvancedFilters = toggleAdvancedFilters;
window.updateSelectedPropertyPreview = updateSelectedPropertyPreview;
window.clearAllFilters = clearAllFilters;
window.removeFilter = removeFilter;
window.applyFilters = applyFilters;