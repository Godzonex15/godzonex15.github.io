const PropertyMap = {
    state: {
        mainMap: null,
        detailMap: null,
        markers: [],
        activeMarkerId: null,
        bounds: null,
        activePopup: null
    },

    initializeMainMap() {
        try {
            const mapElement = document.getElementById('map');
            if (!mapElement) return null;

            if (this.state.mainMap) {
                this.state.mainMap.remove();
            }

            const map = L.map('map', {
                zoomControl: false,
                scrollWheelZoom: true
            }).setView(CONFIG.map.defaultCenter, CONFIG.map.defaultZoom);

            L.control.zoom({
                position: 'bottomright'
            }).addTo(map);

            L.tileLayer(CONFIG.map.tileLayer, {
                attribution: CONFIG.map.attribution,
                maxZoom: 19
            }).addTo(map);

            this.state.mainMap = map;
            return map;
        } catch (error) {
            console.error('Error initializing main map:', error);
            return null;
        }
    },

    initializeDetailMap(property) {
        if (!property?.latitude || !property?.longitude) {
            console.warn('Invalid property data for detail map');
            return;
        }

        const mapContainer = document.getElementById('detailMap');
        if (!mapContainer) return;

        try {
            if (this.state.detailMap) {
                this.state.detailMap.remove();
                this.state.detailMap = null;
            }

            const map = L.map('detailMap', {
                center: [property.latitude, property.longitude],
                zoom: 15,
                zoomControl: false,
                scrollWheelZoom: true
            });

            L.control.zoom({
                position: 'bottomright'
            }).addTo(map);

            L.tileLayer(CONFIG.map.tileLayer, {
                attribution: CONFIG.map.attribution
            }).addTo(map);

            const marker = this.createPropertyMarker(property);
            marker.addTo(map);

            this.state.detailMap = map;

            setTimeout(() => {
                map.invalidateSize();
                map.setView([property.latitude, property.longitude], 15);
            }, 250);
        } catch (error) {
            console.error('Error initializing detail map:', error);
        }
    },

    addMarkers(properties, onClick) {
        this.clearMarkers();
        
        if (!properties || properties.length === 0) return;

        try {
            const validMarkers = properties
                .filter(p => p.latitude && p.longitude)
                .map(property => {
                    const marker = this.createPropertyMarker(property, onClick);
                    marker.addTo(this.state.mainMap);
                    return marker;
                });

            this.state.markers = validMarkers;

            if (validMarkers.length > 0) {
                const bounds = L.latLngBounds(
                    validMarkers.map(m => m.getLatLng())
                );
                this.state.bounds = bounds;
                this.state.mainMap.fitBounds(bounds.pad(0.1));
            }
        } catch (error) {
            console.error('Error adding markers:', error);
        }
    },

    createPropertyMarker(property, onClick = null) {
        const marker = L.marker([property.latitude, property.longitude], {
            icon: L.divIcon({
                className: 'custom-marker-container',
                html: this.createMarkerContent(property),
                iconSize: [40, 40],
                iconAnchor: [20, 40],
                popupAnchor: [0, -40]
            })
        });

        marker.propertyId = property.id;

        const popup = L.popup({
            offset: [0, -35],
            closeButton: false,
            className: 'property-popup-container',
            minWidth: 300
        }).setContent(this.createPopupContent(property));

        marker.bindPopup(popup);

        // Eventos del marcador
        marker.on('click', () => {
            if (onClick) onClick(property.id);
            this.highlightMarker(property.id);
        });

        let popupTimeout;
        
        marker.on('mouseover', () => {
            clearTimeout(popupTimeout);
            if (this.state.activePopup && this.state.activePopup !== popup) {
                this.state.activePopup.getElement()?.classList.remove('active');
            }
            marker.openPopup();
            popup.getElement()?.classList.add('active');
            this.state.activePopup = popup;
        });

        marker.on('mouseout', (e) => {
            const popupElement = popup.getElement();
            if (!popupElement?.contains(e.originalEvent.relatedTarget)) {
                popupTimeout = setTimeout(() => {
                    if (!popupElement?.matches(':hover')) {
                        marker.closePopup();
                        popupElement?.classList.remove('active');
                    }
                }, 300);
            }
        });

        return marker;
    },

    createMarkerContent(property) {
        const getMarkerClass = (propertyType) => {
            switch(propertyType.toLowerCase()) {
                case 'houses':
                case 'house': 
                    return 'marker-house';
                case 'condos':
                case 'condo': 
                    return 'marker-condo';
                case 'apartments':
                case 'apartment': 
                    return 'marker-apartment';
                case 'land': 
                    return 'marker-land';
                default: 
                    return 'marker-house';
            }
        };

        const getMarkerIcon = (propertyType) => {
            switch(propertyType.toLowerCase()) {
                case 'houses':
                case 'house': 
                    return 'fa-home';
                case 'condos':
                case 'condo': 
                    return 'fa-building';
                case 'apartments':
                case 'apartment': 
                    return 'fa-city';
                case 'land': 
                    return 'fa-mountain';
                default: 
                    return 'fa-home';
            }
        };

        const markerClass = getMarkerClass(property.propertytypelabel);
        const iconClass = getMarkerIcon(property.propertytypelabel);
        const isActive = property.id === this.state.activeMarkerId;
        
        return `
            <div class="map-marker ${markerClass} ${isActive ? 'active' : ''}">
                <i class="fas ${iconClass}"></i>
            </div>
        `;
    },

    createPopupContent(property) {
        return `
            <div class="property-popup">
                <div class="popup-image">
                    <img src="${property.imageUrl?.Uri800 || property.photos?.[0]?.Uri800 || '/api/placeholder/400/300'}" 
                         alt="${property.propertytypelabel}"
                         onerror="this.src='/api/placeholder/400/300'">
                </div>
                <div class="popup-content">
                    <h4>${property.streetadditionalinfo || property.propertytypelabel}</h4>
                    <p class="location">
                        <i class="fas fa-map-marker-alt"></i> 
                        ${property.subdivisionname || ''}, ${property.city}
                    </p>
                    <p class="price">
                        ${Formatters.formatPrice(property.currentpricepublic)}
                        <span class="price-mxn">
                            (${Formatters.formatPrice(property.currentpricepublic * CONFIG.currency.exchangeRate, { currency: 'MXN' })})
                        </span>
                    </p>
                    <div class="popup-actions">
                        <button class="btn btn-primary" onclick="showPropertyDetails('${property.id}')">
                            <i class="fas fa-info-circle"></i> View Details
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    clearMarkers() {
        if (this.state.markers) {
            this.state.markers.forEach(marker => {
                if (marker) marker.remove();
            });
        }
        this.state.markers = [];
        this.state.activeMarkerId = null;
        this.state.activePopup = null;
    },

    highlightMarker(propertyId) {
        this.state.markers.forEach(marker => {
            const element = marker.getElement();
            if (element) {
                const markerDiv = element.querySelector('.map-marker');
                if (markerDiv) {
                    const isActive = marker.propertyId === propertyId;
                    markerDiv.classList.toggle('active', isActive);
                    element.style.zIndex = isActive ? 1000 : 1;
                }
            }
        });
        this.state.activeMarkerId = propertyId;
    },

    focusMarker(propertyId) {
        const marker = this.state.markers.find(m => m.propertyId === propertyId);
        if (marker && this.state.mainMap) {
            const latLng = marker.getLatLng();
            this.state.mainMap.setView([latLng.lat, latLng.lng], 15, {
                animate: true,
                duration: 0.5
            });
            marker.openPopup();
        }
    },

    updateMap() {
        if (this.state.mainMap) {
            this.state.mainMap.invalidateSize();
            if (this.state.bounds && typeof this.state.bounds.isValid === 'function' && this.state.bounds.isValid()) {
                this.state.mainMap.fitBounds(this.state.bounds.pad(0.1));
            }
        }
    },

    destroyDetailMap() {
        if (this.state.detailMap) {
            this.state.detailMap.remove();
            this.state.detailMap = null;
        }
    }
};

// Exportar el servicio
window.PropertyMap = PropertyMap;