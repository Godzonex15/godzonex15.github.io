// Variables globales
let initialized = false;

// Evento principal de carga del documento
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing app...');
    initApp();
});

// Función principal de inicialización
const initApp = async () => {
    try {
        showLoadingOverlay();
        console.log('Starting initialization...'); // Debug log

        // Inicializar estado global
        APP_STATE.init();
        
        // Inicializar componentes principales
        initializeComponents();
        
        // Establecer vista inicial
        const savedView = StorageService.loadViewPreference();
        changeView(savedView);

        // Cargar propiedades iniciales
        const filteredListings = FilterService.applyFilters(SAMPLE_LISTINGS, APP_STATE.activeFilters);
        const sortedListings = FilterService.sortProperties(filteredListings);
        updateResults(sortedListings);
        updateMarkers(sortedListings);

        // Verificar si hay una propiedad en la URL al iniciar
        const params = new URLSearchParams(window.location.search);
        const propertyId = params.get('property');
        console.log('PropertyId from URL:', propertyId); // Debug log
        
        if (propertyId) {
            const property = SAMPLE_LISTINGS.find(p => p.id === propertyId);
            if (property) {
                console.log('Found property, showing modal...'); // Debug log
                setTimeout(() => {
                    PropertyModal.show(propertyId);
                    
                    // Notificar a la página padre
                    if (window !== window.top) {
                        window.parent.postMessage({
                            type: 'propertyLoaded',
                            propertyId: propertyId
                        }, '*');
                    }
                }, 1500); // Aumentado a 1500ms
            }
        }

        initialized = true;

    } catch (error) {
        console.error('Error initializing app:', error);
    } finally {
        hideLoadingOverlay();
        // Notificar que la inicialización está completa
        if (window !== window.top) {
            window.parent.postMessage({ 
                type: 'appInitialized',
                status: 'complete'
            }, '*');
        }
    }
};

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
    Object.entries(FilterService.filterDefinitions).forEach(([filterId, definition]) => {
        const select = document.getElementById(filterId);
        if (select) {
            select.innerHTML = definition.options.map(option => 
                `<option value="${option.value}">${option.label}</option>`
            ).join('');
            
            select.addEventListener('change', (e) => {
                updateFilter(filterId, e.target.value);
            });
        }
    });

    const searchButton = document.querySelector('.search-btn');
    if (searchButton) {
        searchButton.addEventListener('click', (e) => {
            e.preventDefault();
            applyFilters();
        });
    }

    const searchForm = document.querySelector('.search-container form');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            applyFilters();
        });
    }

    const clearAllBtn = document.querySelector('.clear-all-filters');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAllFilters);
    }

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
    window.addEventListener('resize', debounce(() => {
        PropertyMap.updateMap();
    }, 250));

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            PropertyMap.updateMap();
        }
    });
}

function initializeUIComponents() {
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
    document.querySelectorAll('select[id]').forEach(select => {
        select.value = '';
    });

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
        if (initialized) {
            NotificationService.error('Error filtering properties. Please try again.');
        }
    } finally {
        hideLoadingOverlay();
    }
}

function updateResults(filteredListings) {
    const resultsCount = document.getElementById('resultsCount');
    if (resultsCount) {
        resultsCount.textContent = filteredListings.length;
    }

    const container = document.getElementById('propertiesList');
    if (container) {
        container.innerHTML = filteredListings.map(listing => 
            PropertyCard.render(listing, APP_STATE.currentView)
        ).join('');
    }
}

function updateMarkers(filteredListings) {
    if (PropertyMap) {
        PropertyMap.addMarkers(filteredListings, (propertyId) => {
            APP_STATE.setSelectedProperty(propertyId);
        });
    }
}

function updateFilterTags() {
    const container = document.getElementById('filterTags');
    if (!container) return;

    const tags = Object.entries(APP_STATE.activeFilters)
        .filter(([_, value]) => value)
        .map(([type, value]) => {
            let displayValue = value;
            
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
                    <button class="remove-filter" data-filter-type="${type}">
                        <i class="fas fa-times"></i>
                    </button>
                </span>
            `;
        }).join('');

    container.innerHTML = tags;

    const activeFilters = document.getElementById('activeFilters');
    if (activeFilters) {
        activeFilters.style.display = Object.keys(APP_STATE.activeFilters).length > 0 ? 'block' : 'none';
    }
}

function toggleAdvancedFilters() {
    const advancedFilters = document.getElementById('advancedFilters');
    const toggleBtn = document.querySelector('.advanced-filters-toggle i.fa-chevron-down, .advanced-filters-toggle i.fa-chevron-up');
    
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

    document.querySelectorAll('.view-controls-container .btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('onclick').includes(viewType));
    });
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

// Nueva función para verificar y mostrar propiedad
function checkAndShowProperty() {
    const params = new URLSearchParams(window.location.search);
    const propertyId = params.get('property');
    console.log('Checking property:', propertyId); // Debug log
    
    if (propertyId) {
        const property = SAMPLE_LISTINGS.find(p => p.id === propertyId);
        if (property) {
            console.log('Found property, showing modal for:', propertyId); // Debug log
            PropertyModal.show(propertyId);
        }
    }
}

// Escuchar mensajes del padre
window.addEventListener('message', function(event) {
    console.log('Received message:', event.data); // Debug log
    
    if (event.data.action === 'showProperty') {
        const propertyId = event.data.propertyId;
        console.log('Show property request:', propertyId); // Debug log
        
        const property = SAMPLE_LISTINGS.find(p => p.id === propertyId);
        if (property) {
            console.log('Found property, showing modal...'); // Debug log
            PropertyModal.show(propertyId);
            
            if (event.data.filters) {
                FilterService.setFilters(event.data.filters);
            }
        }
    }
});

// Notificar cuando la app está lista
window.addEventListener('load', function() {
    if (window !== window.top) {
        // Primer intento
        setTimeout(() => {
            console.log('First attempt to initialize...'); // Debug log
            window.parent.postMessage({ 
                type: 'appReady',
                status: 'ready'
            }, '*');
            
            checkAndShowProperty();
        }, 1000);

        // Segundo intento por si acaso
        setTimeout(checkAndShowProperty, 2000);
        
        // Tercer intento final
        setTimeout(checkAndShowProperty, 3000);
    }
});

// Exponer funciones globales necesarias
window.showPropertyDetails = (propertyId) => {
    console.log('showPropertyDetails called with:', propertyId); // Debug log
    PropertyModal.show(propertyId);
};
window.scheduleViewing = (propertyId) => PropertyModal.scheduleViewing(propertyId);
window.contactAgent = (propertyId) => PropertyModal.contactAgent(propertyId);
window.changeView = changeView;
window.toggleAdvancedFilters = toggleAdvancedFilters;
window.clearAllFilters = clearAllFilters;
window.removeFilter = removeFilter;
window.applyFilters = applyFilters;