// Global state
const APP = {
    currentView: 'grid',
    activeFilters: {},
    map: null,
    markers: [],
    favorites: new Set(JSON.parse(localStorage.getItem('favorites') || '[]')),
    selectedProperty: null,
    modalMap: null,
    currentGalleryIndex: 0,
    urlParams: new URLSearchParams(window.location.search),
    config: {
        appUrl: 'https://mls-search-interface-6528ddc13a39.herokuapp.com/',
        wordpressUrl: 'https://bajasurrealtors.com/advanced-search/',
        allowedOrigins: [
            'https://bajasurrealtors.com',
            'https://mls-search-interface-6528ddc13a39.herokuapp.com'
        ]
    }
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing app...');
    initializeMap();
    initializeEventListeners();
    initializeMessageListeners();
    applyFilters();
    changeView('list');
    
    loadPropertyFromUrl();

    // Notificar que la aplicación está cargada si estamos en un iframe
    if (isInIframe()) {
        notifyParentWindow('appLoaded', {});
    }
});

// Message handling functions
function initializeMessageListeners() {
    window.addEventListener('message', function(event) {
        if (APP.config.allowedOrigins.includes(event.origin)) {
            handleIncomingMessage(event.data);
        }
    });
}

function handleIncomingMessage(data) {
    switch (data.type) {
        case 'openProperty':
            showPropertyDetails(data.propertyId);
            break;
        case 'updateFilters':
            updateFilters(data.filterType, data.value);
            break;
        // Add more message handlers as needed
    }
}

function notifyParentWindow(type, data) {
    if (isInIframe()) {
        window.parent.postMessage({
            type: type,
            ...data
        }, APP.config.wordpressUrl);
    }
}

// Función auxiliar para verificar si estamos en un iframe
function isInIframe() {
    try {
        return window !== window.parent;
    } catch (e) {
        return true;
    }
}


function shareProperty(propertyId) {
    const shareUrl = generateShareableUrl(propertyId);
    
    // Notificar a WordPress si estamos en iframe
    if (isInIframe()) {
        notifyParentWindow('updateUrl', { propertyId });
    } else {
        // Actualizar la URL del navegador en modo standalone
        try {
            window.history.pushState({}, '', shareUrl);
        } catch (e) {
            console.warn('Unable to update browser history:', e);
        }
    }
    
    // Copiar al portapapeles
    try {
        const tempInput = document.createElement('input');
        tempInput.value = shareUrl;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        
        // Mostrar notificación
        showShareNotification('¡URL copiada al portapapeles!');
    } catch (e) {
        console.error('Error copying to clipboard:', e);
        showShareNotification('Error al copiar la URL. Por favor, inténtalo de nuevo.');
    }
}

function showShareNotification(message) {
    if (isInIframe()) {
        // Enviar notificación a WordPress
        notifyParentWindow('notification', { message });
    } else {
        // Mostrar notificación en la aplicación
        const notification = document.createElement('div');
        notification.className = 'share-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-check-circle"></i>
                ${message}
            </div>
        `;
        document.body.appendChild(notification);
        
        // Remover la notificación después de 3 segundos
        setTimeout(() => {
            if (notification && notification.parentElement) {
                notification.remove();
            }
        }, 3000);
    }
}

function updateBrowserUrl(propertyId) {
    if (isInIframe()) {
        notifyParentWindow('updateUrl', { propertyId });
    } else {
        const newUrl = generateShareableUrl(propertyId);
        window.history.pushState({}, '', newUrl);
    }
}

// Manejar la carga inicial de propiedades desde URL
function loadPropertyFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const propertyId = urlParams.get('property');
    
    if (propertyId) {
        showPropertyDetails(propertyId);
        
        // Notificar a WordPress si estamos en iframe
        if (isInIframe()) {
            notifyParentWindow('propertyLoaded', { propertyId });
        }
    }
}


// Nuevas funciones para compartir propiedades
function generateShareableUrl(propertyId) {
    // Determinar si estamos en un iframe
    if (isInIframe()) {
        // Usar la URL de WordPress cuando está en iframe
        return `${APP.config.wordpressUrl}?property=${propertyId}`;
    }
    
    // En modo standalone, usar la URL de la aplicación
    if (APP.config.appUrl) {
        return `${APP.config.appUrl}?property=${propertyId}`;
    }
    
    // Fallback a URL relativa si no hay configuración específica
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?property=${propertyId}`;
}



function loadPropertyFromUrl() {
    const propertyId = APP.urlParams.get('property');
    if (propertyId) {
        showPropertyDetails(propertyId);
    }
}

// Core Functions
function updateFilters(filterType, value) {
    if (!value || value === '') {
        delete APP.activeFilters[filterType];
    } else {
        APP.activeFilters[filterType] = value;
    }
    updateFilterTags();
    applyFilters();
}

function initializeEventListeners() {
    document.querySelectorAll('select[id]').forEach(select => {
        select.addEventListener('change', function() {
            updateFilters(this.id, this.value);
        });
    });

    const searchForm = document.querySelector('form');
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            applyFilters();
        });
    }

    document.querySelectorAll('.view-controls-container .btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const viewType = this.getAttribute('data-view');
            changeView(viewType);
        });
    });

    initializeModalListeners();
}

function applyFilters() {
    showLoadingOverlay();

    try {
        let filteredListings = [...SAMPLE_LISTINGS];
        
        if (APP.activeFilters.propertyType) {
            filteredListings = filteredListings.filter(listing => 
                listing.propertytypelabel === APP.activeFilters.propertyType);
        }

        if (APP.activeFilters.location) {
            filteredListings = filteredListings.filter(listing => 
                listing.mlsareamajor === APP.activeFilters.location);
        }

        if (APP.activeFilters.priceRange) {
            const [minStr, maxStr] = APP.activeFilters.priceRange.split('-');
            const min = parseInt(minStr);
            const max = maxStr ? parseInt(maxStr) : Infinity;
            
            filteredListings = filteredListings.filter(listing => {
                const price = parseInt(listing.currentpricepublic);
                return price >= min && price <= max;
            });
        }

        if (APP.activeFilters.bedrooms) {
            const minBeds = parseInt(APP.activeFilters.bedrooms);
            filteredListings = filteredListings.filter(listing => {
                const beds = parseInt(listing.bedstotal) || 0;
                return beds >= minBeds;
            });
        }

        if (APP.activeFilters.bathrooms) {
            const minBaths = parseFloat(APP.activeFilters.bathrooms);
            filteredListings = filteredListings.filter(listing => {
                const baths = parseFloat(listing.bathroomstotaldecimal) || 0;
                return baths >= minBaths;
            });
        }

        const resultsCount = document.getElementById('resultsCount');
        if (resultsCount) {
            resultsCount.textContent = filteredListings.length;
        }

        const container = document.getElementById('propertiesList');
        if (container) {
            container.innerHTML = filteredListings.map(listing => renderPropertyCard(listing)).join('');
        }

        updateMapMarkers(filteredListings);

    } catch (error) {
        console.error('Error applying filters:', error);
    } finally {
        hideLoadingOverlay();
    }
}

// Map Functions
function initializeMap() {
    try {
        const mapElement = document.getElementById('map');
        if (!mapElement) return;

        if (APP.map) {
            APP.map.remove();
            APP.map = null;
        }

        APP.map = L.map('map', {
            zoomControl: false,
            scrollWheelZoom: true
        }).setView([24.1636, -110.3131], 10);

        L.control.zoom({
            position: 'bottomright'
        }).addTo(APP.map);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(APP.map);

        updateMapMarkers();

    } catch (error) {
        console.error('Error initializing map:', error);
    }
}

function initializeDetailMap(property) {
    if (!property?.latitude || !property?.longitude) {
        console.warn('Invalid property data for map');
        return;
    }

    const mapContainer = document.getElementById('detailMap');
    if (!mapContainer) {
        console.warn('Map container not found');
        return;
    }

    if (window.detailMap) {
        window.detailMap.remove();
        window.detailMap = null;
    }

    try {
        const map = L.map('detailMap', {
            center: [property.latitude, property.longitude],
            zoom: 15,
            zoomControl: false,
            scrollWheelZoom: true
        });

        L.control.zoom({
            position: 'bottomright'
        }).addTo(map);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        const marker = L.marker([property.latitude, property.longitude], {
            icon: L.divIcon({
                className: 'custom-marker-container',
                html: createMarkerContent(property, true),
                iconSize: [40, 40],
                iconAnchor: [20, 40],
                popupAnchor: [0, -40]
            })
        }).addTo(map);

        marker.bindPopup(`
            <div class="property-popup">
                <h4>${property.streetadditionalinfo || property.propertytypelabel}</h4>
                <p>${property.unparsedaddress}</p>
                <p class="price">${formatPrice(property.currentpricepublic)}</p>
                <p class="price-mxn">${formatPrice(property.currentpricepublic * 20.78)} MXN</p>
                <div class="popup-actions">
                    <button onclick="openInGoogleMaps({
                        latitude: '${property.latitude}',
                        longitude: '${property.longitude}',
                        unparsedaddress: '${property.unparsedaddress}'
                    })" class="btn btn-sm btn-outline-primary">
                        <i class="fas fa-map-marked-alt"></i> Open in Google Maps
                    </button>
                </div>
            </div>
        `, {
            closeButton: false,
            offset: [0, -20]
        }).openPopup();

        window.detailMap = map;

        setTimeout(() => {
            map.invalidateSize();
            map.setView([property.latitude, property.longitude], 15);
        }, 250);

    } catch (error) {
        console.error('Error initializing detail map:', error);
    }
}

function updateMapMarkers(filteredListings = SAMPLE_LISTINGS) {
    try {
        APP.markers.forEach(marker => marker.remove());
        APP.markers = [];

        filteredListings.forEach(property => {
            if (property.latitude && property.longitude) {
                const marker = L.marker([property.latitude, property.longitude], {
                    icon: L.divIcon({
                        className: 'custom-marker-container',
                        html: createMarkerContent(property, property.id === APP.selectedProperty),
                        iconSize: [40, 40],
                        iconAnchor: [20, 40]
                    })
                });

                marker.propertyId = property.id;

                marker.on('click', () => {
                    selectProperty(property.id);
                });

                marker.on('mouseover', (e) => {
                    e.target.getElement().style.zIndex = 1000;
                });

                marker.on('mouseout', (e) => {
                    if (property.id !== APP.selectedProperty) {
                        e.target.getElement().style.zIndex = 1;
                    }
                });

                marker.addTo(APP.map);
                APP.markers.push(marker);
            }
        });

        if (APP.markers.length > 0) {
            const group = L.featureGroup(APP.markers);
            APP.map.fitBounds(group.getBounds().pad(0.1));
        }
    } catch (error) {
        console.error('Error updating map markers:', error);
    }
}

// Modal Functions
function initializeModalListeners() {
    const propertyModal = document.getElementById('propertyModal');
    if (!propertyModal) return;

    propertyModal.addEventListener('click', function(e) {
        const tab = e.target.closest('.tab-btn');
        if (!tab) return;

        const targetId = tab.getAttribute('data-target');
        const targetSection = document.getElementById(targetId);
        
        if (!targetSection) return;

        propertyModal.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        targetSection.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });

        if (targetId === 'location') {
            const property = SAMPLE_LISTINGS.find(p => p.id === APP.selectedProperty);
            if (property) {
                setTimeout(() => initializeDetailMap(property), 250);
            }
        }
    });

    propertyModal.addEventListener('hidden.bs.modal', function() {
        if (window.detailMap) {
            window.detailMap.remove();
            window.detailMap = null;
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && propertyModal.classList.contains('show')) {
            const modal = bootstrap.Modal.getInstance(propertyModal);
            if (modal) modal.hide();
        }
    });
}

function initializeModalFocus() {
    const propertyModal = document.getElementById('propertyModal');
    if (!propertyModal) return;

    let lastFocusedElement;

    propertyModal.addEventListener('show.bs.modal', function() {
        lastFocusedElement = document.activeElement;
        
        setTimeout(() => {
            const modalTitle = propertyModal.querySelector('.property-title');
            if (modalTitle) {
                modalTitle.focus();
            }
        }, 150);
    });

    propertyModal.addEventListener('hidden.bs.modal', function() {
        if (lastFocusedElement) {
            lastFocusedElement.focus();
        }
    });

    propertyModal.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = bootstrap.Modal.getInstance(propertyModal);
            if (modal) {
                modal.hide();
            }
        }
    });
}

function cleanupModal() {
    const modalBackdrop = document.querySelector('.modal-backdrop');
    const modalElement = document.getElementById('propertyModal');
    
    if (modalElement) {
        const existingModal = bootstrap.Modal.getInstance(modalElement);
        if (existingModal) {
            existingModal.dispose();
        }
        modalElement.classList.remove('show');
        modalElement.style.display = 'none';
        modalElement.setAttribute('aria-hidden', 'true');
        modalElement.removeAttribute('aria-modal');
        modalElement.removeAttribute('role');
    }
    
    if (modalBackdrop) {
        modalBackdrop.remove();
    }
    
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
}










































function showPropertyDetails(propertyId) {
    console.log('Opening property details for ID:', propertyId);

    const property = SAMPLE_LISTINGS.find(p => p.id === propertyId);
    if (!property) {
        console.error('Property not found:', propertyId);
        return;
    }

    const modalElement = document.getElementById('propertyModal');
    const modalContent = document.getElementById('propertyModalContent');
    if (!modalElement || !modalContent) {
        console.error('Modal elements not found');
        return;
    }

    cleanupModal();

    APP.currentGalleryIndex = 0;
    APP.selectedProperty = propertyId;

    modalContent.innerHTML = `
        <div class="property-detail">
            <div class="modal-header-fixed">
                <div class="modal-header">
                    <div class="property-info">
                        <h1 class="property-title">
                            ${property.streetadditionalinfo || property.propertytypelabel}
                        </h1>
                        <div class="property-meta">
                            <div class="price">
                                ${formatPrice(property.currentpricepublic)}
                                <span class="price-mxn">(${formatPrice(property.currentpricepublic * 20.78)} MXN)</span>
                            </div>
                            <div class="property-location">
                                <i class="fas fa-map-marker-alt"></i> 
                                ${property.city}${property.subdivisionname ? ` - ${property.subdivisionname}` : ''}
                            </div>
                        </div>
                    </div>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div class="modal-tabs">
                    <button class="tab-btn active" data-target="gallery">Gallery</button>
                    <button class="tab-btn" data-target="overview">Overview</button>
                    <button class="tab-btn" data-target="features">Features</button>
                    <button class="tab-btn" data-target="location">Location</button>
                    ${property.vrTour ? `<button class="tab-btn" data-target="virtual-tour">Virtual Tour</button>` : ''}
                </div>
            </div>

            <div class="modal-body">
                <div id="gallery" class="section-content active">
                    ${getGallerySection(property)}
                </div>

                <div id="overview" class="section-content">
                    ${getOverviewSection(property)}
                </div>

                <div id="features" class="section-content">
                    ${getFeaturesSection(property)}
                </div>

                <div id="location" class="section-content">
                    ${getLocationSection(property)}
                </div>

                ${property.vrTour ? `
                    <div id="virtual-tour" class="section-content">
                        ${getVirtualTourSection(property)}
                    </div>
                ` : ''}
            </div>

            <div class="modal-footer">
                <div class="action-buttons">
                    <!-- Nuevo botón de compartir -->
                    <button class="btn btn-outline-primary" onclick="shareProperty('${property.id}')">
                        <i class="fas fa-share-alt"></i> Compartir
                    </button>
                    <button class="btn btn-outline" onclick="toggleFavorite('${property.id}')" 
                            aria-label="${APP.favorites.has(property.id) ? 'Remove from favorites' : 'Add to favorites'}">
                        <i class="fa${APP.favorites.has(property.id) ? 's' : 'r'} fa-heart"></i>
                        ${APP.favorites.has(property.id) ? 'Saved' : 'Save'}
                    </button>
                    <button class="btn btn-primary" onclick="scheduleViewing('${property.id}')">
                        <i class="fas fa-calendar"></i>
                        Schedule Viewing
                    </button>
                    <button class="btn btn-primary" onclick="contactAgent('${property.id}')">
                        <i class="fas fa-envelope"></i>
                        Contact Agent
                    </button>
                </div>
            </div>
        </div>
    `;

    const modal = new bootstrap.Modal(modalElement, {
        backdrop: false,
        keyboard: true,
        focus: true
    });

    modalElement.addEventListener('shown.bs.modal', function() {
        setTimeout(() => {
            initializeDetailMap(property);
        }, 250);

        initializeModalTabs();
        initializeGalleryControls();
    }, { once: true });

    modalElement.addEventListener('hidden.bs.modal', function() {
        cleanupModal();
    });

    modal.show();
}




















































// Property Functions
function selectProperty(propertyId) {
    const preview = document.querySelector('.selected-property');
    if (preview) {
        preview.classList.add('active');
    }
    APP.selectedProperty = propertyId;
    updatePropertySelection();
    updateMarkerStates();
    
    const property = SAMPLE_LISTINGS.find(p => p.id === propertyId);
    if (property) {
        updateSelectedPropertyPreview(property);
        
        const marker = APP.markers.find(m => m.propertyId === propertyId);
        if (marker && APP.map) {
            const latLng = marker.getLatLng();
            APP.map.flyTo([latLng.lat - 0.007, latLng.lng], 15, {
                animate: true,
                duration: 0.5
            });
        }
    }
}

function updateSelectedPropertyPreview(property) {
    const previewContainer = document.getElementById('selectedProperty');
    if (!previewContainer) return;

    previewContainer.innerHTML = `
        <div class="selected-property-content glass-morphism">
            <div class="preview-container">
                <div class="preview-image">
                    <img src="${property.imageUrl?.Uri800 || property.photos?.[0]?.Uri800 || 'https://placehold.co/800x600'}" 
                         alt="${property.propertytypelabel || 'Property'}"
                         class="preview-main-image"
                         onerror="this.src='/api/placeholder/800/600'">
                </div>
                <div class="preview-info">
                    <div>
                        <div class="preview-type">
                            <i class="fas fa-${property.propertytypelabel?.toLowerCase().includes('house') ? 'home' : 
                                        property.propertytypelabel?.toLowerCase().includes('land') ? 'mountain' : 
                                        'building'}"></i>
                            ${property.propertytypelabel}
                        </div>
                        <div class="preview-price">
                            ${formatPrice(property.currentpricepublic)}
                        </div>
                        <div class="property-location">
                            <i class="fas fa-map-marker-alt"></i> 
                            ${property.city || ''} ${property.subdivisionname ? `- ${property.subdivisionname}` : ''}
                        </div>
                    </div>
                    <div class="preview-actions">
                        <button onclick="showPropertyDetails('${property.id}')" class="btn btn-primary">
                            <i class="fas fa-info-circle"></i> View Details
                        </button>
                        <button onclick="toggleFavorite('${property.id}')" 
                                class="btn ${APP.favorites.has(property.id) ? 'btn-danger' : 'btn-outline-danger'}">
                            <i class="fa${APP.favorites.has(property.id) ? 's' : 'r'} fa-heart"></i>
                            ${APP.favorites.has(property.id) ? 'Saved' : 'Save'}
                        </button>
                        <button onclick="contactAgent('${property.id}')" class="btn btn-outline-primary">
                            <i class="fas fa-envelope"></i> Contact
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function changeView(viewType) {
    if (viewType !== 'list' && viewType !== 'grid') return;
    
    const container = document.getElementById('propertiesList');
    if (!container) return;

    APP.currentView = viewType;
    
    document.querySelectorAll('.view-controls-container .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.btn[onclick*="${viewType}"]`).classList.add('active');

    container.className = `properties-container ${viewType}-layout`;
    applyFilters();
}

// Rendering Functions
function renderPropertyCard(listing) {
    const isFavorite = APP.favorites.has(listing.id);
    const isSelected = APP.selectedProperty === listing.id;
    const propertyType = (listing.propertytypelabel || '').toLowerCase();
    
    switch(APP.currentView) {
        case 'compact':
            return renderCompactView(listing, isFavorite, isSelected);
        case 'list':
            return renderListView(listing, isFavorite, isSelected);
        case 'grid':
        default:
            return renderGridView(listing, isFavorite, isSelected, propertyType);
    }
}

function renderCompactView(listing, isFavorite, isSelected) {
    return `
        <div class="property-card compact-card ${isSelected ? 'active' : ''}" 
            data-property-id="${listing.id}"
            onclick="selectProperty('${listing.id}')">
            <div class="property-image">
                <img src="${listing.imageUrl?.Uri800 || listing.photos?.[0]?.Uri800 || '/api/placeholder/400/300'}" 
                     alt="${listing.propertytypelabel || 'Property'}"
                     onerror="this.src='https://placehold.co/400x300'">
                <div class="price-tag">${formatPrice(listing.currentpricepublic)}</div>
                <button class="favorite-btn ${isFavorite ? 'active' : ''}" 
                        onclick="event.stopPropagation(); toggleFavorite('${listing.id}')"
                        data-property-id="${listing.id}">
                    <i class="fa${isFavorite ? 's' : 'r'} fa-heart"></i>
                </button>
            </div>
            <div class="property-info">
                <div class="property-location">
                    <i class="fas fa-map-marker-alt"></i> 
                    ${listing.city || ''} ${listing.subdivisionname ? `- ${listing.subdivisionname}` : ''}
                </div>
                <h3 class="property-title">
                    ${listing.streetadditionalinfo || listing.streetname || 'Property Details'}
                </h3>
                <div class="property-specs">
                    ${listing.bedstotal ? `<span class="spec-item"><i class="fas fa-bed"></i> ${listing.bedstotal} beds</span>` : ''}
                    ${listing.bathroomstotaldecimal ? `<span class="spec-item"><i class="fas fa-bath"></i> ${listing.bathroomstotaldecimal} baths</span>` : ''}
                    ${listing.buildingareatotal ? `<span class="spec-item"><i class="fas fa-ruler-combined"></i> ${listing.buildingareatotal} sq ft</span>` : ''}
                </div>
                <div class="property-actions">
                    <button class="btn btn-outline-primary" onclick="event.stopPropagation(); showPropertyDetails('${listing.id}')">
                        <i class="fas fa-info-circle"></i> View Details
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderListView(listing, isFavorite, isSelected) {
    return `
        <div class="property-card list-card ${isSelected ? 'active' : ''}" 
            data-property-id="${listing.id}"
            onclick="selectProperty('${listing.id}')">
            <div class="property-image">
                <img src="${listing.imageUrl?.Uri800 || listing.photos?.[0]?.Uri800 || '/api/placeholder/400/300'}" 
                     alt="${listing.propertytypelabel || 'Property'}"
                     onerror="this.src='/api/placeholder/400/300'">
                <div class="price-tag">
                    $${Number(listing.currentpricepublic).toLocaleString()}
                    <div class="price-conversion">($${(Number(listing.currentpricepublic) * 20.78).toLocaleString()} MXN)</div>
                </div>
                <button class="favorite-btn ${isFavorite ? 'active' : ''}" 
                        onclick="event.stopPropagation(); toggleFavorite('${listing.id}')"
                        data-property-id="${listing.id}">
                    <i class="fa${isFavorite ? 's' : 'r'} fa-heart"></i>
                </button>
            </div>
            <div class="property-info">
                <h3 class="property-title">
                    ${listing.streetadditionalinfo || listing.propertytypelabel || 'Property'}
                </h3>
                <div class="property-location">
                    <i class="fas fa-map-marker-alt"></i> 
                    ${listing.subdivisionname || ''}, ${listing.city || ''}
                </div>
                <div class="property-description">
                    ${listing.publicremarks || 'No description available.'}
                </div>
                <div class="property-specs">
                    ${listing.bedstotal ? `<span class="spec-item"><i class="fas fa-bed"></i> ${listing.bedstotal} beds</span>` : ''}
                    ${listing.bathroomstotaldecimal ? `<span class="spec-item"><i class="fas fa-bath"></i> ${listing.bathroomstotaldecimal} baths</span>` : ''}
                    ${listing.buildingareatotal ? `<span class="spec-item"><i class="fas fa-ruler-combined"></i> ${listing.buildingareatotal} sq ft</span>` : ''}
                </div>
            </div>
        </div>
    `;
}

function renderGridView(listing, isFavorite, isSelected) {
    return `
        <div class="property-card grid-card ${isSelected ? 'active' : ''}" 
            data-property-id="${listing.id}">
            <div class="property-image">
                <img src="${listing.imageUrl?.Uri800 || listing.photos?.[0]?.Uri800 || '/api/placeholder/400/300'}" 
                     alt="${listing.propertytypelabel || 'Property'}"
                     onerror="this.src='/api/placeholder/400/300'">
                <div class="price-tag">
                    $${Number(listing.currentpricepublic).toLocaleString()}
                    <div class="price-conversion">($${(Number(listing.currentpricepublic) * 20.78).toLocaleString()} MXN)</div>
                </div>
                <button class="favorite-btn ${isFavorite ? 'active' : ''}" 
                        onclick="toggleFavorite('${listing.id}')"
                        data-property-id="${listing.id}">
                    <i class="fa${isFavorite ? 's' : 'r'} fa-heart"></i>
                </button>
            </div>
            <div class="property-info">
                <h3 class="property-title">
                    ${listing.streetadditionalinfo || listing.propertytypelabel || 'Property'}
                </h3>
                <div class="property-location">
                    <i class="fas fa-map-marker-alt"></i> 
                    ${listing.subdivisionname || ''}, ${listing.city || ''}
                </div>
                <div class="property-specs">
                    ${listing.bedstotal ? `<span class="spec-item"><i class="fas fa-bed"></i> ${listing.bedstotal} beds</span>` : ''}
                    ${listing.bathroomstotaldecimal ? `<span class="spec-item"><i class="fas fa-bath"></i> ${listing.bathroomstotaldecimal} baths</span>` : ''}
                </div>
                <div class="property-actions">
                    <button type="button" class="btn btn-primary w-100" onclick="showPropertyDetails('${listing.id}')">
                        <i class="fas fa-info-circle"></i> View Details
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Gallery Functions
function getGallerySection(property) {
    return `
        <div class="gallery-section">
            <div class="gallery-main">
                <img src="${property.photos?.[0]?.Uri1600 || '/api/placeholder/800/600'}" 
                     alt="${property.propertytypelabel}" 
                     class="main-image"
                     style="transition: opacity 0.2s ease-in-out">
                <button class="gallery-nav prev" onclick="navigateGallery(-1)" aria-label="Previous image">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <button class="gallery-nav next" onclick="navigateGallery(1)" aria-label="Next image">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
            <div class="thumbnail-strip">
                ${property.photos?.map((photo, index) => `
                    <div class="thumbnail-wrapper ${index === 0 ? 'active' : ''}" 
                         onclick="changeMainImage('${photo.Uri1600 || photo.Uri800}', this, ${index})"
                         role="button"
                         aria-label="View image ${index + 1}">
                        <img src="${photo.Uri300}" 
                             alt="View ${index + 1}"
                             loading="lazy">
                    </div>
                `).join('') || ''}
            </div>
        </div>
    `;
}

function getOverviewSection(property) {
    return `
        <div class="overview-stats">
            ${[
                { icon: 'bed', value: property.bedstotal, label: 'Bedrooms' },
                { icon: 'bath', value: property.bathroomstotaldecimal, label: 'Bathrooms' },
                { icon: 'ruler-combined', value: property.buildingareatotal, label: 'Sq Ft' },
                { icon: 'calendar-alt', value: property.yearbuilt, label: 'Year Built' }
            ].filter(stat => stat.value).map(stat => `
                <div class="stat-item">
                    <i class="fas fa-${stat.icon}" aria-hidden="true"></i>
                    <span class="value">${stat.value}</span>
                    <span class="label">${stat.label}</span>
                </div>
            `).join('')}
        </div>

        <div class="property-description">
            <h3>Description</h3>
            <p>${property.publicremarks || 'No description available.'}</p>
        </div>
    `;
}

function getFeaturesSection(property) {
    return `
        <div class="features-grid">
            ${[
                {
                    title: 'Interior Features',
                    icon: 'home',
                    data: parseFeatures(property.interiorfeatures)
                },
                {
                    title: 'Exterior Features',
                    icon: 'building',
                    data: parseFeatures(property.exteriorfeatures)
                },
                {
                    title: 'Kitchen Features',
                    icon: 'utensils',
                    data: parseFeatures(property.kitchenappliances)
                },
                {
                    title: 'Pool Features',
                    icon: 'swimming-pool',
                    data: parseFeatures(property.poolfeatures)
                },
                {
                    title: 'Utilities',
                    icon: 'bolt',
                    data: parseFeatures(property.electric)
                }
            ].filter(section => section.data).map(section => `
                <div class="feature-group">
                    <h4><i class="fas fa-${section.icon}" aria-hidden="true"></i> ${section.title}</h4>
                    <ul class="feature-list">
                        ${Object.entries(section.data)
                            .filter(([_, value]) => value)
                            .map(([key]) => `
                                <li><i class="fas fa-check" aria-hidden="true"></i> ${key}</li>
                            `).join('')}
                    </ul>
                </div>
            `).join('')}
        </div>
    `;
}

function getLocationSection(property) {
    return `
        <div class="location-layout">
            <div class="map-section">
                <div id="detailMap" class="map-container"></div>
                <div class="map-actions">
                    <button onclick="openInGoogleMaps({
                        latitude: '${property.latitude}',
                        longitude: '${property.longitude}',
                        unparsedaddress: '${property.unparsedaddress}'
                    })" class="btn btn-outline-primary">
                        <i class="fas fa-map-marked-alt"></i> View in Google Maps
                    </button>
                </div>
            </div>
            <div class="location-details">
                <h3>Location Details</h3>
                <div class="location-grid">
                    <div class="address-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <div class="info">
                            <label>Address</label>
                            <span>${property.unparsedaddress}</span>
                        </div>
                    </div>
                    <div class="address-item">
                        <i class="fas fa-compass"></i>
                        <div class="info">
                            <label>Area</label>
                            <span>${property.mlsareamajor}</span>
                        </div>
                    </div>
                    ${property.postalcode ? `
                        <div class="address-item">
                            <i class="fas fa-mail-bulk"></i>
                            <div class="info">
                                <label>Postal Code</label>
                                <span>${property.postalcode}</span>
                            </div>
                        </div>
                    ` : ''}
                    <div class="address-item">
                        <i class="fas fa-map-pin"></i>
                        <div class="info">
                            <label>Coordinates</label>
                            <span>${property.latitude}, ${property.longitude}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getVirtualTourSection(property) {
    if (!property.vrTour) return '';
    
    return `
        <div class="virtual-tour-container">
            <div class="tour-actions">
                <button class="btn btn-outline-primary" onclick="openVirtualTour('${property.vrTour.Uri}')">
                    <i class="fas fa-external-link-alt"></i> Open in New Window
                </button>
            </div>
            <iframe src="${property.vrTour.Uri}" 
                    frameborder="0" 
                    allowfullscreen
                    style="width: 100%; height: 600px;"></iframe>
        </div>
    `;
}

// Utility Functions
function contactAgent(propertyId) {
    const property = SAMPLE_LISTINGS.find(p => p.id === propertyId);
    if (!property) return;

    const modalContent = document.getElementById('propertyModalContent');
    if (modalContent) {
        modalContent.innerHTML = `
            <div class="contact-form glass-morphism">
                <h3><i class="fas fa-envelope"></i> Contact Agent</h3>
                <form id="contactForm" class="contact-form-content">
                    <div class="form-group">
                        <label for="contact-name">
                            <i class="fas fa-user"></i> Name
                        </label>
                        <input type="text" id="contact-name" name="name" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="contact-email">
                            <i class="fas fa-envelope"></i> Email
                        </label>
                        <input type="email" id="contact-email" name="email" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="contact-phone">
                            <i class="fas fa-phone"></i> Phone
                        </label>
                        <input type="tel" id="contact-phone" name="phone" class="form-control">
                    </div>
                    <div class="form-group">
                        <label for="contact-message">
                            <i class="fas fa-comment"></i> Message
                        </label>
                        <textarea id="contact-message" name="message" class="form-control" rows="4" required>I'm interested in the property at ${property.unparsedaddress} (MLS# ${property.mlsid}).</textarea>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-paper-plane"></i> Send Message
                        </button>
                        <button type="button" class="btn btn-outline-primary" onclick="showPropertyDetails('${propertyId}')">
                            <i class="fas fa-arrow-left"></i> Back to Property
                        </button>
                    </div>
                </form>
            </div>
        `;

        const form = document.getElementById('contactForm');
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                alert('Thank you for your message. An agent will contact you soon.');
                showPropertyDetails(propertyId);
            });
        }
    }
}

function scheduleViewing(propertyId) {
    const property = SAMPLE_LISTINGS.find(p => p.id === propertyId);
    if (!property) return;

    const modalContent = document.getElementById('propertyModalContent');
    if (modalContent) {
        modalContent.innerHTML = `
            <div class="schedule-form glass-morphism">
                <h3><i class="fas fa-calendar-alt"></i> Schedule a Viewing</h3>
                <form id="scheduleForm" class="schedule-form-content">
                    <div class="form-group">
                        <label for="schedule-name">
                            <i class="fas fa-user"></i> Name
                        </label>
                        <input type="text" id="schedule-name" name="name" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="schedule-email">
                            <i class="fas fa-envelope"></i> Email
                        </label>
                        <input type="email" id="schedule-email" name="email" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="schedule-phone">
                            <i class="fas fa-phone"></i> Phone
                        </label>
                        <input type="tel" id="schedule-phone" name="phone" class="form-control">
                    </div>
                    <div class="form-group">
                        <label for="schedule-date">
                            <i class="fas fa-calendar"></i> Preferred Date
                        </label>
                        <input type="date" id="schedule-date" name="date" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="schedule-time">
                            <i class="fas fa-clock"></i> Preferred Time
                        </label>
                        <input type="time" id="schedule-time" name="time" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="schedule-notes">
                            <i class="fas fa-comment"></i> Additional Notes
                        </label>
                        <textarea id="schedule-notes" name="notes" class="form-control" rows="3"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-calendar-check"></i> Schedule Viewing
                        </button>
                        <button type="button" class="btn btn-outline-primary" onclick="showPropertyDetails('${propertyId}')">
                            <i class="fas fa-arrow-left"></i> Back to Property
                        </button>
                    </div>
                </form>
            </div>
        `;

        const form = document.getElementById('scheduleForm');
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                alert('Thank you for scheduling a viewing. An agent will confirm your appointment soon.');
                showPropertyDetails(propertyId);
            });
        }
    }
}

// Helper Functions
function openInGoogleMaps(property) {
    const address = encodeURIComponent(property.unparsedaddress);
    const coordinates = `${property.latitude},${property.longitude}`;
    const url = `https://www.google.com/maps/search/?api=1&query=${coordinates}`;
    window.open(url, '_blank');
}

function openVirtualTour(url) {
    if (url) {
        window.open(url, '_blank');
    }
}

function updateFilterTags() {
    const container = document.getElementById('filterTags');
    if (!container) return;

    const tags = Object.entries(APP.activeFilters)
        .filter(([_, value]) => value)
        .map(([type, value]) => {
            let displayValue = value;
            if (type === 'priceRange') {
                const [min, max] = value.split('-');
                displayValue = max ? 
                    `${formatPrice(min)} - ${formatPrice(max)}` : 
                    `${formatPrice(min)}+`;
            }
            
            return `
                <span class="filter-tag">
                    ${type}: ${displayValue}
                    <button class="remove-filter" onclick="removeFilter('${type}')">
                        <i class="fas fa-times"></i>
                    </button>
                </span>
            `;
        });

    container.innerHTML = tags.join('');
}

function toggleFavorite(propertyId) {
    if (APP.favorites.has(propertyId)) {
        APP.favorites.delete(propertyId);
    } else {
        APP.favorites.add(propertyId);
    }
    
    localStorage.setItem('favorites', JSON.stringify([...APP.favorites]));
    updateFavoriteButtons(propertyId);
}

function updateFavoriteButtons(propertyId) {
    document.querySelectorAll(`.favorite-btn[data-property-id="${propertyId}"]`).forEach(button => {
        const isFavorite = APP.favorites.has(propertyId);
        button.classList.toggle('active', isFavorite);
        button.innerHTML = `<i class="fa${isFavorite ? 's' : 'r'} fa-heart"></i>`;
    });
}

function updatePropertySelection() {
    document.querySelectorAll('.property-card').forEach(card => {
        card.classList.toggle('active', card.dataset.propertyId === APP.selectedProperty);
    });
}

function updateMarkerStates() {
    APP.markers.forEach(marker => {
        const markerElement = marker.getElement();
        if (markerElement) {
            const markerDiv = markerElement.querySelector('.map-marker');
            if (markerDiv) {
                const isActive = marker.propertyId === APP.selectedProperty;
                markerDiv.classList.toggle('active', isActive);
                markerElement.style.zIndex = isActive ? 1000 : 1;
            }
        }
    });
}

function parseFeatures(featuresStr) {
    if (!featuresStr) return null;
    try {
        return JSON.parse(featuresStr);
    } catch {
        return null;
    }
}

function formatPrice(price) {
    if (!price) return 'Price on request';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(price);
}

function showLoadingOverlay() {
    document.querySelector('.loading-overlay').style.display = 'flex';
}

function hideLoadingOverlay() {
    document.querySelector('.loading-overlay').style.display = 'none';
}

function removeFilter(filterType) {
    const select = document.getElementById(filterType);
    if (select) {
        select.value = '';
    }
    delete APP.activeFilters[filterType];
    updateFilterTags();
    applyFilters();
}

// Gallery Navigation Functions
function changeMainImage(imageUrl, thumbnailElement, index) {
    const mainImage = document.querySelector('.main-image');
    if (mainImage) {
        mainImage.style.opacity = '0';
        setTimeout(() => {
            mainImage.src = imageUrl;
            mainImage.style.opacity = '1';
        }, 200);
        
        APP.currentGalleryIndex = index;
    }

    document.querySelectorAll('.thumbnail-wrapper').forEach(thumb => {
        thumb.classList.remove('active');
    });
    thumbnailElement?.classList.add('active');

    thumbnailElement?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
    });
}

function navigateGallery(direction) {
    const property = SAMPLE_LISTINGS.find(p => p.id === APP.selectedProperty);
    if (!property || !property.photos) return;

    const totalPhotos = property.photos.length;
    let newIndex = APP.currentGalleryIndex + direction;

    if (newIndex >= totalPhotos) newIndex = 0;
    if (newIndex < 0) newIndex = totalPhotos - 1;

    const photo = property.photos[newIndex];
    const thumbnails = document.querySelectorAll('.thumbnail-wrapper');
    if (photo && thumbnails[newIndex]) {
        changeMainImage(photo.Uri1600 || photo.Uri800, thumbnails[newIndex], newIndex);
    }
}

function initializeGalleryControls() {
    document.addEventListener('keydown', function(e) {
        if (!APP.selectedProperty) return;

        if (e.key === 'ArrowLeft') {
            navigateGallery(-1);
        } else if (e.key === 'ArrowRight') {
            navigateGallery(1);
        }
    });

    const galleryMain = document.querySelector('.gallery-main');
    if (galleryMain) {
        let touchStartX = 0;
        let touchEndX = 0;

        galleryMain.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].screenX;
        });

        galleryMain.addEventListener('touchend', e => {
            touchEndX = e.changedTouches[0].screenX;
            if (touchStartX - touchEndX > 50) {
                navigateGallery(1);
            } else if (touchEndX - touchStartX > 50) {
                navigateGallery(-1);
            }
        });
    }
}

// Marker Helper Functions
function getMarkerClass(propertyType) {
    switch(propertyType.toLowerCase()) {
        case 'house':
        case 'houses': 
            return 'marker-house';
        case 'condo':
        case 'condos': 
            return 'marker-condo';
        case 'apartment':
        case 'apartments': 
            return 'marker-apartment';
        case 'land': 
            return 'marker-land';
        default: 
            return 'marker-house';
    }
}

function getMarkerIcon(propertyType) {
    switch(propertyType.toLowerCase()) {
        case 'house':
        case 'houses': 
            return 'fa-home';
        case 'condo':
        case 'condos': 
            return 'fa-building';
        case 'apartment':
        case 'apartments': 
            return 'fa-city';
        case 'land': 
            return 'fa-mountain';
        default: 
            return 'fa-home';
    }
}

function createMarkerContent(property, isActive = false) {
    const markerClass = getMarkerClass(property.propertytypelabel);
    const iconClass = getMarkerIcon(property.propertytypelabel);
    
    return `
        <div class="map-marker ${markerClass} ${isActive ? 'active' : ''}">
            <i class="fas ${iconClass}"></i>
            <div class="marker-preview">
                <div class="property-image">
                    <img src="${property.imageUrl?.Uri800 || property.photos?.[0]?.Uri800 || '/api/placeholder/400/300'}" 
                         alt="${property.propertytypelabel || 'Property'}">
                </div>
                <div class="preview-info">
                    <div class="property-type">
                        <i class="fas ${iconClass}"></i>
                        ${property.propertytypelabel}
                    </div>
                    <div class="property-location">
                        ${property.subdivisionname || ''}, ${property.city || ''}
                    </div>
                    <div class="property-price">
                        ${formatPrice(property.currentpricepublic)}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Tab Functions
function initializeModalTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const sections = document.querySelectorAll('.section-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const targetId = tab.getAttribute('data-target');
            const targetSection = document.getElementById(targetId);
            
            if (!targetSection) return;

            tabs.forEach(t => t.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            tab.classList.add('active');
            targetSection.classList.add('active');

            targetSection.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });

            if (targetId === 'location') {
                setTimeout(() => {
                    if (window.detailMap) {
                        window.detailMap.invalidateSize();
                    }
                }, 250);
            }
        });
    });
}

function initializePropertyTabs(modalContent, property) {
    const tabs = modalContent.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const targetId = tab.getAttribute('data-target');
            const targetSection = document.getElementById(targetId);
            
            if (targetSection) {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                if (targetId === 'location') {
                    if (window.detailMap) {
                        window.detailMap.remove();
                        window.detailMap = null;
                    }
                    
                    setTimeout(() => {
                        const mapContainer = document.getElementById('detailMap');
                        if (mapContainer) {
                            mapContainer.style.height = '400px';
                            mapContainer.style.width = '100%';
                            initializeDetailMap(property);
                        }
                    }, 250);
                }

                targetSection.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }
        });
    });
}

// Modal Helper Functions
function initializePropertyModal() {
    const propertyModal = document.getElementById('propertyModal');
    if (!propertyModal) return;

    propertyModal.addEventListener('shown.bs.modal', function() {
        setTimeout(() => {
            const locationTab = document.querySelector('[data-target="location"]');
            if (locationTab && locationTab.classList.contains('active')) {
                const property = SAMPLE_LISTINGS.find(p => p.id === APP.selectedProperty);
                if (property) {
                    initializeDetailMap(property);
                }
            }
        }, 250);
    });

    propertyModal.addEventListener('hidden.bs.modal', function() {
        if (window.detailMap) {
            window.detailMap.remove();
            window.detailMap = null;
        }
    });
}

// Section Generation Functions
function createFeaturesList(featuresJson) {
    if (!featuresJson) return '<p>No features listed</p>';
    
    try {
        const features = JSON.parse(featuresJson);
        return `
            <ul class="features-list">
                ${Object.entries(features)
                    .filter(([_, value]) => value)
                    .map(([key]) => `
                        <li><i class="fas fa-check"></i> ${key}</li>
                    `).join('')}
            </ul>
        `;
    } catch (e) {
        return '<p>No features listed</p>';
    }
}

// Modal Section Generation Functions
function getGalleryHTML(property) {
    return `
        <div class="gallery-section">
            <div class="gallery-main">
                <img src="${property.photos?.[0]?.Uri1600 || '/api/placeholder/800/600'}" 
                     alt="${property.propertytypelabel}" 
                     class="main-image"
                     style="transition: opacity 0.2s ease-in-out">
                <button class="gallery-nav prev" onclick="navigateGallery(-1)">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <button class="gallery-nav next" onclick="navigateGallery(1)">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
            <div class="thumbnail-strip">
                ${property.photos?.map((photo, index) => `
                    <div class="thumbnail-wrapper ${index === 0 ? 'active' : ''}" 
                         onclick="changeMainImage('${photo.Uri1600 || photo.Uri800}', this, ${index})">
                        <img src="${photo.Uri300}" 
                             alt="View ${index + 1}"
                             loading="lazy">
                    </div>
                `).join('') || ''}
            </div>
        </div>
    `;
}

function getLocationSectionHTML(property) {
    return `
        <div id="location" class="section-content">
            <div class="location-layout">
                <div class="map-section">
                    <div id="detailMap" class="map-container"></div>
                    <div class="map-actions">
                        <button class="btn btn-outline-primary" onclick="openInGoogleMaps({
                            latitude: '${property.latitude}',
                            longitude: '${property.longitude}',
                            unparsedaddress: '${property.unparsedaddress}'
                        })">
                            <i class="fas fa-map-marked-alt"></i> View in Google Maps
                        </button>
                    </div>
                </div>
                <div class="location-details">
                    <h3>Location Details</h3>
                    <div class="location-grid">
                        <div class="address-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <div class="info">
                                <label for="property-address">Address</label>
                                <span id="property-address">${property.unparsedaddress}</span>
                            </div>
                        </div>
                        <div class="address-item">
                            <i class="fas fa-compass"></i>
                            <div class="info">
                                <label for="property-area">Area</label>
                                <span id="property-area">${property.mlsareamajor}</span>
                            </div>
                        </div>
                        ${property.postalcode ? `
                            <div class="address-item">
                                <i class="fas fa-mail-bulk"></i>
                                <div class="info">
                                    <label for="property-postal">Postal Code</label>
                                    <span id="property-postal">${property.postalcode}</span>
                                </div>
                            </div>
                        ` : ''}
                        <div class="address-item">
                            <i class="fas fa-map-pin"></i>
                            <div class="info">
                                <label for="property-coordinates">Coordinates</label>
                                <span id="property-coordinates">${property.latitude}, ${property.longitude}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getVirtualTourSectionHTML(property) {
    if (!property.vrTour) return '';
    
    return `
        <div id="virtual-tour" class="section-content">
            <div class="virtual-tour-container">
                <div class="tour-actions">
                    <button class="btn btn-outline-primary mb-3" onclick="openVirtualTour('${property.vrTour.Uri}')">
                        <i class="fas fa-external-link-alt"></i> Open in New Window
                    </button>
                </div>
                <iframe src="${property.vrTour.Uri}" 
                        frameborder="0" 
                        allowfullscreen
                        style="width: 100%; height: 600px;"></iframe>
            </div>
        </div>
    `;
}