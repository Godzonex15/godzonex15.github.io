const PropertyMap = {
    state: {
        map: null,
        markers: [],
        activeMarkerId: null,
        bounds: null
    },

    initializeMap(containerId, config = CONFIG.map) {
        try {
            if (this.state.map) {
                this.state.map.remove();
            }

            const map = L.map(containerId, {
                zoomControl: false,
                scrollWheelZoom: true
            }).setView(config.defaultCenter, config.defaultZoom);

            L.control.zoom({
                position: 'bottomright'
            }).addTo(map);

            L.tileLayer(config.tileLayer, {
                attribution: config.attribution,
                maxZoom: 19
            }).addTo(map);

            this.state.map = map;
            return map;
        } catch (error) {
            console.error('Error initializing map:', error);
            return null;
        }
    },

    addMarkers(properties, onClick) {
        this.clearMarkers();
        
        if (!properties || !Array.isArray(properties) || properties.length === 0) {
            return;
        }

        const bounds = L.latLngBounds([]);
        let validMarkers = false;

        properties.forEach(property => {
            if (!property.latitude || !property.longitude) return;

            const marker = this.createPropertyMarker(property, onClick);
            marker.addTo(this.state.map);
            this.state.markers.push(marker);
            bounds.extend([property.latitude, property.longitude]);
            validMarkers = true;
        });

        if (validMarkers) {
            this.state.bounds = bounds;
            this.state.map.fitBounds(bounds.pad(0.1));
        }
    },

    createPropertyMarker(property, onClick) {
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

        marker.on('click', () => {
            if (onClick) onClick(property.id);
            this.highlightMarker(property.id);
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
        if (marker && this.state.map) {
            const latLng = marker.getLatLng();
            this.state.map.setView([latLng.lat, latLng.lng], 15, {
                animate: true,
                duration: 0.5
            });
            marker.openPopup();
        }
    },

    updateMap() {
        if (this.state.map) {
            this.state.map.invalidateSize();
            if (this.state.bounds && !this.state.bounds.isEmpty()) {
                this.state.map.fitBounds(this.state.bounds.pad(0.1));
            }
        }
    }
};

// Exportar el servicio
window.PropertyMap = PropertyMap;