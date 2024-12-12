const PropertyModal = {
    state: {
        currentTab: 'gallery',
        modalInstance: null
    },

    init() {
        this.bindEvents();
    },

    show(propertyId) {
        const property = SAMPLE_LISTINGS.find(p => p.id === propertyId);
        if (!property) return;

        const modalContent = document.getElementById('propertyModalContent');
        if (!modalContent) return;

        modalContent.innerHTML = this.render(property);
        
        this.showModal();
        this.initializeTabs();
        PropertyGallery.initialize();

        // Inicializar mapa después de que el modal esté visible
        setTimeout(() => {
            if (this.state.currentTab === 'location') {
                PropertyMap.initializeDetailMap(property);
            }
        }, 300);
    },

    render(property) {
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

    renderActions(property) {
        return `
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
                <button class="btn btn-outline-primary share-button" onclick="handleShare('${property.id}')">
                    <i class="fas fa-share-alt"></i> Share
                </button>
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
                        <button onclick="MapService.openInGoogleMaps({
                            latitude: '${property.latitude}',
                            longitude: '${property.longitude}',
                            unparsedaddress: '${property.unparsedaddress}'
                        })" class="btn btn-outline-primary">
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
                        const property = SAMPLE_LISTINGS.find(p => p.id === APP_STATE.selectedProperty);
                        if (property) {
                            setTimeout(() => {
                                PropertyMap.initializeDetailMap(property);
                            }, 250);
                        }
                    }
                }
            });
        });
    },

    bindEvents() {
        // Eventos del modal
        document.addEventListener('hidden.bs.modal', (e) => {
            if (e.target.id === 'propertyModal') {
                if (this.state.modalInstance) {
                    this.state.modalInstance.dispose();
                    this.state.modalInstance = null;
                }
                PropertyMap.destroyDetailMap();
            }
        });

        // Eventos de teclado
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.state.modalInstance) {
                this.state.modalInstance.hide();
            }
        });

        // Eventos de accesibilidad
        const propertyModal = document.getElementById('propertyModal');
        if (propertyModal) {
            propertyModal.addEventListener('shown.bs.modal', () => {
                const firstFocusable = propertyModal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                if (firstFocusable) {
                    firstFocusable.focus();
                }
            });
        }
    },

    handleShare(propertyId) {
        const property = SAMPLE_LISTINGS.find(p => p.id === propertyId);
        if (!property) return;

        const shareUrl = `${window.location.origin}${window.location.pathname}?property=${propertyId}`;
        const shareText = `Check out this ${property.propertytypelabel} in ${property.city}!`;

        if (navigator.share) {
            // Si el navegador soporta Web Share API
            navigator.share({
                title: property.streetadditionalinfo || 'Property Details',
                text: shareText,
                url: shareUrl
            }).then(() => {
                NotificationService.success('Property shared successfully!');
            }).catch((error) => {
                if (error.name !== 'AbortError') {
                    copyToClipboard(shareUrl);
                }
            });
        } else {
            // Fallback a copiar al portapapeles
            copyToClipboard(shareUrl);
        }
    },

    copyToClipboard(text) {
        // Crear un elemento temporal
        const tempInput = document.createElement('input');
        tempInput.style.position = 'absolute';
        tempInput.style.left = '-9999px';
        tempInput.value = text;
        document.body.appendChild(tempInput);
        
        // Seleccionar y copiar
        tempInput.select();
        try {
            document.execCommand('copy');
            NotificationService.success('Link copied to clipboard!', {
                title: 'Share Property',
                duration: 2000
            });
        } catch (err) {
            NotificationService.error('Failed to copy link');
            console.error('Failed to copy:', err);
        }
        
        // Limpiar
        document.body.removeChild(tempInput);
    },

    // Métodos de utilidad para el modal
    scheduleViewing(propertyId) {
        const property = SAMPLE_LISTINGS.find(p => p.id === propertyId);
        if (!property) return;

        const modalContent = document.getElementById('propertyModalContent');
        if (!modalContent) return;

        modalContent.innerHTML = `
            <div class="schedule-form glass-morphism">
                <h3><i class="fas fa-calendar-alt"></i> Schedule a Viewing</h3>
                <form id="scheduleForm" class="schedule-form-content">
                    <div class="form-group">
                        <label for="schedule-name">
                            <i class="fas fa-user"></i> Name
                        </label>
                        <input type="text" id="schedule-name" name="name" 
                               class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="schedule-email">
                            <i class="fas fa-envelope"></i> Email
                        </label>
                        <input type="email" id="schedule-email" name="email" 
                               class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="schedule-phone">
                            <i class="fas fa-phone"></i> Phone
                        </label>
                        <input type="tel" id="schedule-phone" name="phone" 
                               class="form-control">
                    </div>
                    <div class="form-group">
                        <label for="schedule-date">
                            <i class="fas fa-calendar"></i> Preferred Date
                        </label>
                        <input type="date" id="schedule-date" name="date" 
                               class="form-control" required min="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div class="form-group">
                        <label for="schedule-time">
                            <i class="fas fa-clock"></i> Preferred Time
                        </label>
                        <input type="time" id="schedule-time" name="time" 
                               class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="schedule-notes">
                            <i class="fas fa-comment"></i> Additional Notes
                        </label>
                        <textarea id="schedule-notes" name="notes" 
                                  class="form-control" rows="3"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-calendar-check"></i> Schedule Viewing
                        </button>
                        <button type="button" class="btn btn-outline-primary" 
                                onclick="PropertyModal.show('${propertyId}')">
                            <i class="fas fa-arrow-left"></i> Back to Property
                        </button>
                    </div>
                </form>
            </div>
        `;

        // Manejar envío del formulario
        const form = document.getElementById('scheduleForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                alert('Thank you for scheduling a viewing. An agent will confirm your appointment soon.');
                this.show(propertyId);
            });
        }
    },

    contactAgent(propertyId) {
        const property = SAMPLE_LISTINGS.find(p => p.id === propertyId);
        if (!property) return;

        const modalContent = document.getElementById('propertyModalContent');
        if (!modalContent) return;

        modalContent.innerHTML = `
            <div class="contact-form glass-morphism">
                <h3><i class="fas fa-envelope"></i> Contact Agent</h3>
                <form id="contactForm" class="contact-form-content">
                    <div class="form-group">
                        <label for="contact-name">
                            <i class="fas fa-user"></i> Name
                        </label>
                        <input type="text" id="contact-name" name="name" 
                               class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="contact-email">
                            <i class="fas fa-envelope"></i> Email
                        </label>
                        <input type="email" id="contact-email" name="email" 
                               class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="contact-phone">
                            <i class="fas fa-phone"></i> Phone
                        </label>
                        <input type="tel" id="contact-phone" name="phone" 
                               class="form-control">
                    </div>
                    <div class="form-group">
                        <label for="contact-message">
                            <i class="fas fa-comment"></i> Message
                        </label>
                        <textarea id="contact-message" name="message" 
                                  class="form-control" rows="4" required>
                            I'm interested in the property at ${property.unparsedaddress} (MLS# ${property.mlsid}).
                        </textarea>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-paper-plane"></i> Send Message
                        </button>
                        <button type="button" class="btn btn-outline-primary" 
                                onclick="PropertyModal.show('${propertyId}')">
                            <i class="fas fa-arrow-left"></i> Back to Property
                        </button>
                    </div>
                </form>
            </div>
        `;

        // Manejar envío del formulario
        const form = document.getElementById('contactForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                alert('Thank you for your message. An agent will contact you soon.');
                this.show(propertyId);
            });
        }
    }
};

// Inicializar el componente
PropertyModal.init();