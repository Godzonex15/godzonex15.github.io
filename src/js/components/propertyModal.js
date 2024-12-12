const PropertyModal = {
    state: {
        currentTab: 'gallery',
        modalInstance: null,
        currentProperty: null,
        isShared: false
    },

    init() {
        this.bindEvents();
        this.checkSharedProperty();
    },

    checkSharedProperty() {
        const params = new URLSearchParams(window.location.search);
        const propertyId = params.get('property');
        if (propertyId) {
            this.state.isShared = true;
            setTimeout(() => {
                this.show(propertyId);
            }, 500);
        }
    },

    show(propertyId) {
        const property = SAMPLE_LISTINGS.find(p => p.id === propertyId);
        if (!property) return;

        this.state.currentProperty = property;

        const modalContent = document.getElementById('propertyModalContent');
        if (!modalContent) return;

        modalContent.innerHTML = this.render(property);
        
        this.showModal();
        this.initializeTabs();
        PropertyGallery.initialize();

        // Actualizar URL y metadatos si es una propiedad compartida
        if (this.state.isShared || window !== window.top) {
            if (ShareService) {
                ShareService.handleSharedProperty();
            }
        }

        // Inicializar mapa después de que el modal esté visible
        setTimeout(() => {
            if (this.state.currentTab === 'location') {
                PropertyMap.initializeDetailMap(property);
            }
        }, 300);
    },

    render(property) {
        // Preparar datos para compartir con la página padre
        const shareData = {
            type: 'propertySelected',
            property: {
                title: property.streetadditionalinfo || property.propertytypelabel,
                description: property.publicremarks,
                type: property.propertytypelabel,
                location: property.mlsareamajor,
                price: property.currentpricepublic,
                image: property.photos?.[0]?.Uri1600 || ''
            }
        };

        // Notificar a la página padre si estamos en un iframe
        if (window !== window.top) {
            window.parent.postMessage(shareData, 'https://bajasurrealtors.com');
        }

        return `
            <div class="property-detail">
                <div class="modal-header-fixed">
                    <div class="modal-header">
                        <div class="property-info">
                            <h1 class="property-title">
                                ${property.streetadditionalinfo || property.propertytypelabel}
                            </h1>
                            <div class="property-meta">
                                <div class="price">
                                    ${Formatters.formatPrice(property.currentpricepublic)}
                                    <span class="price-mxn">
                                        (${Formatters.formatPrice(property.currentpricepublic * CONFIG.currency.exchangeRate, { currency: 'MXN' })})
                                    </span>
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
                        <button class="tab-btn active" data-target="gallery">
                            <i class="fas fa-images"></i> Gallery
                        </button>
                        <button class="tab-btn" data-target="overview">
                            <i class="fas fa-info-circle"></i> Overview
                        </button>
                        <button class="tab-btn" data-target="features">
                            <i class="fas fa-list"></i> Features
                        </button>
                        <button class="tab-btn" data-target="location">
                            <i class="fas fa-map-marker-alt"></i> Location
                        </button>
                        ${property.vrTour ? `
                            <button class="tab-btn" data-target="virtual-tour">
                                <i class="fas fa-vr-cardboard"></i> Virtual Tour
                            </button>
                        ` : ''}
                    </div>
                </div>

                <div class="modal-body">
                    <div id="gallery" class="section-content active">
                        ${PropertyGallery.render(property)}
                    </div>

                    <div id="overview" class="section-content">
                        ${this.renderOverview(property)}
                    </div>

                    <div id="features" class="section-content">
                        ${this.renderFeatures(property)}
                    </div>

                    <div id="location" class="section-content">
                        ${this.renderLocation(property)}
                    </div>

                    ${property.vrTour ? `
                        <div id="virtual-tour" class="section-content">
                            ${this.renderVirtualTour(property)}
                        </div>
                    ` : ''}
                </div>
                        <div class="modal-footer">
                    <div class="action-buttons">
                        <button class="btn btn-outline-primary" 
                                onclick="APP_STATE.toggleFavorite('${property.id}')">
                            <i class="fa${APP_STATE.favorites.has(property.id) ? 's' : 'r'} fa-heart"></i>
                            ${APP_STATE.favorites.has(property.id) ? 'Saved' : 'Save'}
                        </button>
                        <button class="btn btn-primary" onclick="scheduleViewing('${property.id}')">
                            <i class="fas fa-calendar"></i> Schedule Viewing
                        </button>
                        <button class="btn btn-primary" onclick="contactAgent('${property.id}')">
                            <i class="fas fa-envelope"></i> Contact Agent
                        </button>
                        <button class="btn btn-outline-primary" onclick="ShareService.shareProperty('${property.id}')">
                            <i class="fas fa-share-alt"></i> Share
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    renderOverview(property) {
        return `
            <div class="overview-stats">
                ${[
                    { icon: 'bed', value: property.bedstotal, label: 'Bedrooms' },
                    { icon: 'bath', value: property.bathroomstotaldecimal, label: 'Bathrooms' },
                    { icon: 'ruler-combined', value: property.buildingareatotal, label: 'Sq Ft' },
                    { icon: 'calendar-alt', value: property.yearbuilt, label: 'Year Built' }
                ].filter(stat => stat.value).map(stat => `
                    <div class="stat-item">
                        <i class="fas fa-${stat.icon}"></i>
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
    },

    renderFeatures(property) {
        const featureGroups = [
            {
                title: 'Interior Features',
                icon: 'home',
                data: Formatters.formatFeatures(property.interiorfeatures)
            },
            {
                title: 'Exterior Features',
                icon: 'building',
                data: Formatters.formatFeatures(property.exteriorfeatures)
            },
            {
                title: 'Kitchen Features',
                icon: 'utensils',
                data: Formatters.formatFeatures(property.kitchenappliances)
            },
            {
                title: 'Pool Features',
                icon: 'swimming-pool',
                data: Formatters.formatFeatures(property.poolfeatures)
            },
            {
                title: 'Utilities',
                icon: 'bolt',
                data: Formatters.formatFeatures(property.electric)
            }
        ].filter(group => group.data && group.data.length > 0);

        return `
            <div class="features-grid">
                ${featureGroups.map(group => `
                    <div class="feature-group">
                        <h4>
                            <i class="fas fa-${group.icon}"></i> 
                            ${group.title}
                        </h4>
                        <ul class="feature-list">
                            ${group.data.map(feature => `
                                <li>
                                    <i class="fas fa-check"></i> 
                                    ${feature}
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                `).join('')}
            </div>
        `;
    },

    renderLocation(property) {
        return `
            <div class="location-layout">
                <div class="map-section">
                    <div id="detailMap" class="map-container"></div>
                    <div class="map-actions">
                        <button onclick="window.open('https://www.google.com/maps?q=${property.latitude},${property.longitude}', '_blank')" 
                                class="btn btn-outline-primary">
                            <i class="fas fa-map-marked-alt"></i> 
                            View in Google Maps
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
    },

    renderVirtualTour(property) {
        if (!property.vrTour) return '';
        
        return `
            <div class="virtual-tour-container">
                <div class="tour-actions">
                    <button class="btn btn-outline-primary mb-3" 
                            onclick="window.open('${property.vrTour.Uri}', '_blank')">
                        <i class="fas fa-external-link-alt"></i> 
                        Open in New Window
                    </button>
                </div>
                <iframe src="${property.vrTour.Uri}" 
                        frameborder="0" 
                        allowfullscreen
                        style="width: 100%; height: 600px;"></iframe>
            </div>
        `;
    },

    showModal() {
        const modalElement = document.getElementById('propertyModal');
        if (!modalElement) return;

        if (this.state.modalInstance) {
            this.state.modalInstance.dispose();
        }

        this.state.modalInstance = new bootstrap.Modal(modalElement, {
            backdrop: true,
            keyboard: true,
            focus: true
        });

        this.state.modalInstance.show();
    },

    closeModal() {
        if (this.state.modalInstance) {
            this.state.modalInstance.hide();
        }
    },

    initializeTabs() {
        const modalContent = document.getElementById('propertyModalContent');
        if (!modalContent) return;

        const tabs = modalContent.querySelectorAll('.tab-btn');
        const sections = modalContent.querySelectorAll('.section-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetId = tab.getAttribute('data-target');
                if (!targetId) return;

                // Actualizar estado
                this.state.currentTab = targetId;

                // Actualizar clases activas
                tabs.forEach(t => t.classList.remove('active'));
                sections.forEach(s => s.classList.remove('active'));
                
                tab.classList.add('active');
                const targetSection = document.getElementById(targetId);
                if (targetSection) {
                    targetSection.classList.add('active');
                    targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

                    // Inicializar mapa si es necesario
                    if (targetId === 'location') {
                        if (this.state.currentProperty) {
                            setTimeout(() => {
                                PropertyMap.initializeDetailMap(this.state.currentProperty);
                            }, 250);
                        }
                    }
                }
            });
        });
    },

    bindEvents() {
        // Manejar cierre del modal
        document.addEventListener('hidden.bs.modal', (e) => {
            if (e.target.id === 'propertyModal') {
                if (this.state.modalInstance) {
                    this.state.modalInstance.dispose();
                    this.state.modalInstance = null;
                }
                PropertyMap.destroyDetailMap();
                
                // Actualizar URL si la propiedad fue compartida
                if (this.state.isShared && window === window.top) {
                    window.history.pushState({}, '', window.location.pathname);
                }
            }
        });

        // Eventos de teclado
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.state.modalInstance) {
                this.closeModal();
            }
        });

        // Accesibilidad
        const propertyModal = document.getElementById('propertyModal');
        if (propertyModal) {
            propertyModal.addEventListener('shown.bs.modal', () => {
                const firstFocusable = propertyModal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                if (firstFocusable) {
                    firstFocusable.focus();
                }
            });
        }
    }
};

// Inicializar el componente
PropertyModal.init();

// Exponer métodos necesarios globalmente
window.scheduleViewing = (propertyId) => PropertyModal.scheduleViewing(propertyId);
window.contactAgent = (propertyId) => PropertyModal.contactAgent(propertyId);