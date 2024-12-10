const PropertyCard = {
    render(property, view = 'grid') {
        const isFavorite = APP_STATE.favorites.has(property.id);
        const isSelected = APP_STATE.selectedProperty === property.id;

        return view === 'list' ? 
            this.renderListView(property, isFavorite, isSelected) : 
            this.renderGridView(property, isFavorite, isSelected);
    },

    renderGridView(property, isFavorite, isSelected) {
        return `
            <div class="property-card grid-card ${isSelected ? 'active' : ''}" 
                data-property-id="${property.id}"
                onClick="APP_STATE.setSelectedProperty('${property.id}')">
                <div class="property-image">
                    <img src="${property.imageUrl?.Uri800 || property.photos?.[0]?.Uri800 || '/api/placeholder/400/300'}" 
                         alt="${property.propertytypelabel}"
                         loading="lazy"
                         onerror="this.src='/api/placeholder/400/300'">
                    <div class="price-tag">
                        ${Formatters.formatPrice(property.currentpricepublic)}
                        <div class="price-conversion">${Formatters.formatPrice(property.currentpricepublic * CONFIG.currency.exchangeRate, { currency: 'MXN' })}</div>
                    </div>
                    <button class="favorite-btn ${isFavorite ? 'active' : ''}" 
                            onclick="event.stopPropagation(); APP_STATE.toggleFavorite('${property.id}')"
                            data-property-id="${property.id}">
                        <i class="fa${isFavorite ? 's' : 'r'} fa-heart"></i>
                    </button>
                    ${this.renderPropertyStatus(property)}
                </div>
                <div class="property-info">
                    <h3 class="property-title">
                        ${property.streetadditionalinfo || property.propertytypelabel}
                    </h3>
                    <div class="property-location">
                        <i class="fas fa-map-marker-alt"></i> 
                        ${property.subdivisionname ? `${property.subdivisionname}, ` : ''}${property.city}
                    </div>
                    ${this.renderPropertySpecs(property)}
                    <div class="property-description">
                        ${Formatters.truncateText(property.publicremarks, 120)}
                    </div>
                    <div class="property-actions">
                        <button class="btn-primary btn-block" onclick="event.stopPropagation(); showPropertyDetails('${property.id}')">
                            View Details
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    renderListView(property, isFavorite, isSelected) {
        return `
            <div class="property-card list-card ${isSelected ? 'active' : ''}" 
                data-property-id="${property.id}"
                onclick="APP_STATE.setSelectedProperty('${property.id}')">
                <div class="property-image">
                    <img src="${property.imageUrl?.Uri800 || property.photos?.[0]?.Uri800 || '/api/placeholder/400/300'}" 
                         alt="${property.propertytypelabel}"
                         loading="lazy"
                         onerror="this.src='/api/placeholder/400/300'">
                    <div class="price-tag">
                        ${Formatters.formatPrice(property.currentpricepublic)}
                        <div class="price-conversion">${Formatters.formatPrice(property.currentpricepublic * CONFIG.currency.exchangeRate, { currency: 'MXN' })}</div>
                    </div>
                    <button class="favorite-btn ${isFavorite ? 'active' : ''}" 
                            onclick="event.stopPropagation(); APP_STATE.toggleFavorite('${property.id}')"
                            data-property-id="${property.id}">
                        <i class="fa${isFavorite ? 's' : 'r'} fa-heart"></i>
                    </button>
                    ${this.renderPropertyStatus(property)}
                </div>
                <div class="property-info">
                    <div class="property-header">
                        <h3 class="property-title">
                            ${property.streetadditionalinfo || property.propertytypelabel}
                        </h3>
                        <div class="property-location">
                            <i class="fas fa-map-marker-alt"></i> 
                            ${property.subdivisionname ? `${property.subdivisionname}, ` : ''}${property.city}
                        </div>
                    </div>
                    ${this.renderPropertySpecs(property)}
                    <div class="property-description">
                        ${Formatters.truncateText(property.publicremarks, 200)}
                    </div>
                    ${this.renderPropertyFeatures(property)}
                    <div class="property-actions">
                        <button class="btn-primary" onclick="event.stopPropagation(); showPropertyDetails('${property.id}')">
                            View Details
                        </button>
                        <button class="btn-outline" onclick="event.stopPropagation(); contactAgent('${property.id}')">
                            Contact Agent
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    renderPropertySpecs(property) {
        return `
            <div class="property-specs">
                ${property.bedstotal ? `
                    <span class="spec-item">
                        <i class="fas fa-bed"></i> ${property.bedstotal} Beds
                    </span>
                ` : ''}
                ${property.bathroomstotaldecimal ? `
                    <span class="spec-item">
                        <i class="fas fa-bath"></i> ${property.bathroomstotaldecimal} Baths
                    </span>
                ` : ''}
                ${property.buildingareatotal ? `
                    <span class="spec-item">
                        <i class="fas fa-vector-square"></i> ${Formatters.formatArea(property.buildingareatotal)}
                    </span>
                ` : ''}
                ${property.yearbuilt ? `
                    <span class="spec-item">
                        <i class="fas fa-calendar"></i> Built ${property.yearbuilt}
                    </span>
                ` : ''}
            </div>
        `;
    },

    renderPropertyFeatures(property) {
        const features = [];
        
        if (property.interiorfeatures) {
            const interiorFeatures = Formatters.formatFeatures(property.interiorfeatures);
            features.push(...interiorFeatures.slice(0, 2));
        }
        if (property.exteriorfeatures) {
            const exteriorFeatures = Formatters.formatFeatures(property.exteriorfeatures);
            features.push(...exteriorFeatures.slice(0, 2));
        }

        if (features.length === 0) return '';

        return `
            <div class="property-features">
                ${features.slice(0, 4).map(feature => `
                    <span class="feature-tag">
                        <i class="fas fa-check"></i> ${feature}
                    </span>
                `).join('')}
            </div>
        `;
    },

    renderPropertyStatus(property) {
        if (property.yearbuilt && property.yearbuilt >= new Date().getFullYear()) {
            return '<div class="property-status new">New Construction</div>';
        }
        return '';
    },

    bindEvents() {
        document.addEventListener('click', (e) => {
            const favoriteBtn = e.target.closest('.favorite-btn');
            if (favoriteBtn) {
                e.stopPropagation();
                const propertyId = favoriteBtn.dataset.propertyId;
                if (propertyId) {
                    APP_STATE.toggleFavorite(propertyId);
                }
            }
        });
    }
};

PropertyCard.bindEvents();