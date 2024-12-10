const PropertyCompare = {
    state: {
        properties: new Map(),
        maxProperties: 4,
        isVisible: false
    },

    init() {
        this.createCompareBar();
        this.bindEvents();
        this.loadSavedProperties();
    },

    // Crear barra de comparación
    createCompareBar() {
        const compareBar = document.createElement('div');
        compareBar.id = 'compareBar';
        compareBar.className = 'compare-bar glass-morphism';
        compareBar.innerHTML = `
            <div class="compare-bar-header">
                <h3>Compare Properties</h3>
                <button class="compare-close-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="compare-properties"></div>
            <div class="compare-actions">
                <button class="btn btn-primary compare-btn" disabled>
                    Compare (<span class="compare-count">0</span>)
                </button>
                <button class="btn btn-outline-danger clear-btn">
                    Clear All
                </button>
            </div>
        `;

        document.body.appendChild(compareBar);
    },

    // Añadir propiedad a comparación
    addProperty(propertyId) {
        if (this.state.properties.size >= this.state.maxProperties) {
            NotificationService.warning(
                `You can only compare up to ${this.state.maxProperties} properties at a time`,
                { title: 'Maximum Properties Reached' }
            );
            return false;
        }

        const property = SAMPLE_LISTINGS.find(p => p.id === propertyId);
        if (!property) return false;

        this.state.properties.set(propertyId, property);
        this.updateCompareBar();
        this.saveProperties();
        
        NotificationService.success('Property added to comparison', {
            title: 'Added to Compare',
            duration: 2000
        });

        return true;
    },

    // Remover propiedad de comparación
    removeProperty(propertyId) {
        if (!this.state.properties.has(propertyId)) return false;

        this.state.properties.delete(propertyId);
        this.updateCompareBar();
        this.saveProperties();

        return true;
    },

    // Actualizar barra de comparación
    updateCompareBar() {
        const compareBar = document.getElementById('compareBar');
        if (!compareBar) return;

        const propertiesContainer = compareBar.querySelector('.compare-properties');
        const compareCount = compareBar.querySelector('.compare-count');
        const compareBtn = compareBar.querySelector('.compare-btn');

        propertiesContainer.innerHTML = Array.from(this.state.properties.values())
            .map(property => this.renderCompareItem(property))
            .join('');

        compareCount.textContent = this.state.properties.size;
        compareBtn.disabled = this.state.properties.size < 2;

        compareBar.classList.toggle('show', this.state.properties.size > 0);
        this.state.isVisible = this.state.properties.size > 0;
    },

    // Renderizar item de comparación
    renderCompareItem(property) {
        return `
            <div class="compare-item" data-property-id="${property.id}">
                <img src="${property.photos?.[0]?.Uri300 || '/api/placeholder/300x200'}" 
                     alt="${property.streetadditionalinfo || property.propertytypelabel}"
                     loading="lazy">
                <div class="compare-item-info">
                    <h4>${property.streetadditionalinfo || property.propertytypelabel}</h4>
                    <p>${I18nService.formatCurrency(property.currentpricepublic)}</p>
                </div>
                <button class="remove-compare-btn" onclick="PropertyCompare.removeProperty('${property.id}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    },

    // Mostrar tabla de comparación
    showComparison() {
        if (this.state.properties.size < 2) return;

        const properties = Array.from(this.state.properties.values());
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'compareModal';
        modal.innerHTML = `
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Property Comparison</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        ${this.renderComparisonTable(properties)}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        const modalInstance = new bootstrap.Modal(modal);
        modalInstance.show();

        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    },

    // Renderizar tabla de comparación
    renderComparisonTable(properties) {
        const features = this.getComparisonFeatures(properties);

        return `
            <div class="comparison-table-container">
                <table class="comparison-table">
                    <thead>
                        <tr>
                            <th>Feature</th>
                            ${properties.map(property => `
                                <th>
                                    <img src="${property.photos?.[0]?.Uri300 || '/api/placeholder/300x200'}" 
                                         alt="${property.streetadditionalinfo || property.propertytypelabel}"
                                         loading="lazy">
                                    <h4>${property.streetadditionalinfo || property.propertytypelabel}</h4>
                                    <p class="price">${I18nService.formatCurrency(property.currentpricepublic)}</p>
                                </th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${features.map(feature => `
                            <tr>
                                <td class="feature-name">${feature.label}</td>
                                ${properties.map(property => `
                                    <td class="feature-value">
                                        ${this.renderFeatureValue(feature, property)}
                                    </td>
                                `).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    // Obtener características para comparar
    getComparisonFeatures(properties) {
        return [
            {
                key: 'propertytypelabel',
                label: 'Property Type',
                format: value => value
            },
            {
                key: 'bedstotal',
                label: 'Bedrooms',
                format: value => value || 'N/A'
            },
            {
                key: 'bathroomstotaldecimal',
                label: 'Bathrooms',
                format: value => value || 'N/A'
            },
            {
                key: 'buildingareatotal',
                label: 'Square Feet',
                format: value => value ? `${I18nService.formatNumber(value)} sq ft` : 'N/A'
            },
            {
                key: 'yearbuilt',
                label: 'Year Built',
                format: value => value || 'N/A'
            },
            {
                key: 'poolfeatures',
                label: 'Pool',
                format: value => value ? 'Yes' : 'No'
            },
            {
                key: 'electric',
                label: 'Utilities',
                format: value => {
                    if (!value) return 'N/A';
                    try {
                        return Object.entries(JSON.parse(value))
                            .filter(([_, v]) => v)
                            .map(([k]) => k)
                            .join(', ') || 'N/A';
                    } catch (e) {
                        return 'N/A';
                    }
                }
            },
            {
                key: 'interiorfeatures',
                label: 'Interior Features',
                format: value => {
                    if (!value) return 'N/A';
                    try {
                        return Object.entries(JSON.parse(value))
                            .filter(([_, v]) => v)
                            .map(([k]) => k)
                            .join(', ') || 'N/A';
                    } catch (e) {
                        return 'N/A';
                    }
                }
            },
            {
                key: 'exteriorfeatures',
                label: 'Exterior Features',
                format: value => {
                    if (!value) return 'N/A';
                    try {
                        return Object.entries(JSON.parse(value))
                            .filter(([_, v]) => v)
                            .map(([k]) => k)
                            .join(', ') || 'N/A';
                    } catch (e) {
                        return 'N/A';
                    }
                }
            }
        ];
    },

    // Renderizar valor de característica
    renderFeatureValue(feature, property) {
        const value = property[feature.key];
        return feature.format(value);
    },

    // Guardar propiedades en localStorage
    saveProperties() {
        try {
            const propertyIds = Array.from(this.state.properties.keys());
            localStorage.setItem('compareProperties', JSON.stringify(propertyIds));
        } catch (error) {
            console.error('Error saving compared properties:', error);
        }
    },

    // Cargar propiedades guardadas
    loadSavedProperties() {
        try {
            const savedIds = JSON.parse(localStorage.getItem('compareProperties') || '[]');
            savedIds.forEach(id => this.addProperty(id));
        } catch (error) {
            console.error('Error loading compared properties:', error);
        }
    },

    // Limpiar todas las propiedades
    clearAll() {
        this.state.properties.clear();
        this.updateCompareBar();
        this.saveProperties();
    },

    // Verificar si una propiedad está en comparación
    isComparing(propertyId) {
        return this.state.properties.has(propertyId);
    },

    // Alternar propiedad en comparación
    toggleProperty(propertyId) {
        return this.isComparing(propertyId) ?
            this.removeProperty(propertyId) :
            this.addProperty(propertyId);
    },

    // Manejar eventos
    bindEvents() {
        document.addEventListener('click', (e) => {
            // Botón de cerrar barra de comparación
            if (e.target.closest('.compare-close-btn')) {
                this.clearAll();
            }

            // Botón de comparar
            if (e.target.closest('.compare-btn:not([disabled])')) {
                this.showComparison();
            }

            // Botón de limpiar todo
            if (e.target.closest('.clear-btn')) {
                this.clearAll();
            }

            // Botón de añadir a comparación en las tarjetas de propiedades
            const compareBtn = e.target.closest('.add-to-compare');
            if (compareBtn) {
                const propertyId = compareBtn.dataset.propertyId;
                if (propertyId) {
                    this.toggleProperty(propertyId);
                    compareBtn.classList.toggle('active', this.isComparing(propertyId));
                }
            }
        });

        // Mantener la barra visible al hacer scroll
        let lastScroll = 0;
        window.addEventListener('scroll', () => {
            if (!this.state.isVisible) return;

            const compareBar = document.getElementById('compareBar');
            if (!compareBar) return;

            const currentScroll = window.pageYOffset;
            const diff = currentScroll - lastScroll;

            if (diff > 0) { // Scrolling down
                compareBar.classList.add('compare-bar-hidden');
            } else { // Scrolling up
                compareBar.classList.remove('compare-bar-hidden');
            }

            lastScroll = currentScroll;
        });
    },

    // Renderizar botón de comparación para las tarjetas de propiedades
    renderCompareButton(propertyId) {
        const isComparing = this.isComparing(propertyId);
        return `
            <button class="add-to-compare ${isComparing ? 'active' : ''}"
                    data-property-id="${propertyId}"
                    title="${isComparing ? 'Remove from comparison' : 'Add to comparison'}">
                <i class="fas fa-balance-scale"></i>
                <span>${isComparing ? 'Remove Compare' : 'Compare'}</span>
            </button>
        `;
    }
};

// Inicializar componente
PropertyCompare.init();

// Exportar componente
window.PropertyCompare = PropertyCompare;  