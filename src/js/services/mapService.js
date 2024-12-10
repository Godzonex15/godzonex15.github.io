const MapService = {
    // Estado interno del servicio
    state: {
        map: null,
        markers: [],
        activeMarkerId: null,
        bounds: null
    },

    // Inicialización del mapa
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

    // Gestión de marcadores
    addMarkers(properties, onClick) {
        this.clearMarkers();
        const bounds = L.latLngBounds([]);

        properties.forEach(property => {
            if (!property.latitude || !property.longitude) return;

            const marker = L.marker([property.latitude, property.longitude], {
                icon: L.divIcon({
                    className: 'custom-marker-container',
                    html: this.createMarkerContent(property),
                    iconSize: [40, 40],
                    iconAnchor: [20, 40]
                })
            });

            marker.propertyId = property.id;

            marker.on('click', () => {
                if (onClick) onClick(property.id);
                this.highlightMarker(property.id);
            });

            marker.addTo(this.state.map);
            this.state.markers.push(marker);
            bounds.extend([property.latitude, property.longitude]);
        });

        if (!bounds.isEmpty()) {
            this.state.bounds = bounds;
            this.state.map.fitBounds(bounds.pad(0.1));
        }
    },

    // Limpieza de marcadores
    clearMarkers() {
        this.state.markers.forEach(marker => marker.remove());
        this.state.markers = [];
        this.state.activeMarkerId = null;
    },

    // Resaltar marcador
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

    // Centrar mapa en un marcador
    focusMarker(propertyId) {
        const marker = this.state.markers.find(m => m.propertyId === propertyId);
        if (marker) {
            const latLng = marker.getLatLng();
            this.state.map.flyTo([latLng.lat - 0.007, latLng.lng], 15, {
                animate: true,
                duration: 0.5
            });
        }
    },

    // Crear contenido del marcador
    createMarkerContent(property) {
        const getMarkerClass = (propertyType) => {
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
        };

        const getMarkerIcon = (propertyType) => {
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
        };

        const markerClass = getMarkerClass(property.propertytypelabel);
        const iconClass = getMarkerIcon(property.propertytypelabel);
        const isActive = property.id === this.state.activeMarkerId;
        
        return `
            <div class="map-marker ${markerClass} ${isActive ? 'active' : ''}">
                <i class="fas ${iconClass}"></i>
                <div class="marker-preview">
                    <div class="property-image">
                        <img src="${property.imageUrl?.Uri800 || property.photos?.[0]?.Uri800 || '/api/placeholder/400/300'}" 
                             alt="${property.propertytypelabel || 'Property'}"
                             loading="lazy">
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
                            $${Number(property.currentpricepublic).toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // Actualizar mapa
    updateMap() {
        if (this.state.map) {
            this.state.map.invalidateSize();
            if (this.state.bounds && !this.state.bounds.isEmpty()) {
                this.state.map.fitBounds(this.state.bounds.pad(0.1));
            }
        }
    },

    // Limpieza
    destroy() {
        if (this.state.map) {
            this.clearMarkers();
            this.state.map.remove();
            this.state.map = null;
        }
    }
};

// Congelar el servicio para prevenir modificaciones
Object.freeze(MapService);