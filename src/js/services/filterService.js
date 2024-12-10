const FilterService = {
    filterDefinitions: {
        propertyType: {
            label: 'Property Type',
            options: [
                { value: '', label: 'All Types' },
                { value: 'Houses', label: 'House' },
                { value: 'Apartments', label: 'Apartment' },
                { value: 'Condos', label: 'Condo' },
                { value: 'Land', label: 'Land' }
            ]
        },
        location: {
            label: 'Location',
            options: [
                { value: '', label: 'All Locations' },
                { value: 'La Paz City', label: 'La Paz City' },
                { value: 'El Sargento', label: 'El Sargento' },
                { value: 'El Centenario', label: 'El Centenario' },
                { value: 'Bay of Dreams', label: 'Bay of Dreams' },
                { value: 'Cerro Colorado', label: 'Cerro Colorado' },
                { value: 'CSL-Beach & Marina', label: 'CSL-Beach & Marina' },
                { value: 'CSL-Centro', label: 'CSL-Centro' },
                { value: 'CSL Cor-Inland', label: 'CSL Cor-Inland' },
                { value: 'CSL-Corr. Oceanside', label: 'CSL-Corr. Oceanside' },
                { value: 'CSL-North', label: 'CSL-North' },
                { value: 'East Cape', label: 'East Cape' },
                { value: 'North East Cape', label: 'North East Cape' },
                { value: 'Ejidos', label: 'Ejidos' },
                { value: 'Excondido South', label: 'Excondido South' },
                { value: 'La Ventana', label: 'La Ventana' },
                { value: 'Loreto', label: 'Loreto' },
                { value: 'Los Planes', label: 'Los Planes' },
                { value: 'Mulege', label: 'Mulege' },
                { value: 'Nopolo', label: 'Nopolo' },
                { value: 'Pacific North', label: 'Pacific North' },
                { value: 'Pacific South', label: 'Pacific South' },
                { value: 'San Juan de la Costa', label: 'San Juan de la Costa' },
                { value: 'San Pedro', label: 'San Pedro' },
                { value: 'Scorpion Bay', label: 'Scorpion Bay' },
                { value: 'SJD-Beachside', label: 'SJD-Beachside' },
                { value: 'SJD-Centro', label: 'SJD-Centro' },
                { value: 'SJD Corr-Inland', label: 'SJD Corr-Inland' },
                { value: 'SJD Corr-Oceanside', label: 'SJD Corr-Oceanside' },
                { value: 'SJD-East', label: 'SJD-East' },
                { value: 'SJD-Inland/Golf', label: 'SJD-Inland/Golf' },
                { value: 'SJD-North', label: 'SJD-North' }
            ]
        },
        priceRange: {
            label: 'Price Range',
            options: [
                { value: '', label: 'Any Price' },
                { value: '0-100000', label: 'Up to $100,000' },
                { value: '100000-200000', label: '$100,000 - $200,000' },
                { value: '200000-300000', label: '$200,000 - $300,000' },
                { value: '300000-400000', label: '$300,000 - $400,000' },
                { value: '400000-500000', label: '$400,000 - $500,000' },
                { value: '500000-600000', label: '$500,000 - $600,000' },
                { value: '600000-700000', label: '$600,000 - $700,000' },
                { value: '700000-800000', label: '$700,000 - $800,000' },
                { value: '800000-900000', label: '$800,000 - $900,000' },
                { value: '900000-1000000', label: '$900,000 - $1,000,000' },
                { value: '1000000-', label: '$1,000,000+' }
            ]
        },
        bedrooms: {
            label: 'Bedrooms',
            options: [
                { value: '', label: 'Any' },
                { value: '1', label: '1+' },
                { value: '2', label: '2+' },
                { value: '3', label: '3+' },
                { value: '4', label: '4+' },
                { value: '5', label: '5+' }
            ]
        },
        bathrooms: {
            label: 'Bathrooms',
            options: [
                { value: '', label: 'Any' },
                { value: '1', label: '1+' },
                { value: '2', label: '2+' },
                { value: '3', label: '3+' },
                { value: '4', label: '4+' }
            ]
        }
    },

    filterMethods: {
        propertyType(property, value) {
            if (!value) return true;
            return property.propertytypelabel === value;
        },

        location(property, value) {
            if (!value) return true;
            return property.mlsareamajor === value;
        },

        priceRange(property, value) {
            if (!value) return true;
            const [minStr, maxStr] = value.split('-');
            const price = parseFloat(property.currentpricepublic);
            const min = parseFloat(minStr);
            const max = maxStr ? parseFloat(maxStr) : Infinity;
            return price >= min && (!max || price <= max);
        },

        bedrooms(property, value) {
            if (!value) return true;
            const minBeds = parseInt(value);
            const beds = parseInt(property.bedstotal) || 0;
            return beds >= minBeds;
        },

        bathrooms(property, value) {
            if (!value) return true;
            const minBaths = parseFloat(value);
            const baths = parseFloat(property.bathroomstotaldecimal) || 0;
            return baths >= minBaths;
        }
    },

    sortMethods: {
        priceAsc(a, b) {
            return parseFloat(a.currentpricepublic) - parseFloat(b.currentpricepublic);
        },
        priceDesc(a, b) {
            return parseFloat(b.currentpricepublic) - parseFloat(a.currentpricepublic);
        },
        newest(a, b) {
            return new Date(b.listdate) - new Date(a.listdate);
        }
    },

    applyFilters(properties, filters) {
        if (!properties || !Array.isArray(properties)) return [];
        
        return properties.filter(property => {
            return Object.entries(filters).every(([key, value]) => {
                if (!value) return true;
                return this.filterMethods[key]?.(property, value) ?? true;
            });
        });
    },

    sortProperties(properties, sortBy = 'priceDesc') {
        const sortFn = this.sortMethods[sortBy];
        if (!sortFn) return properties;
        return [...properties].sort(sortFn);
    },

    getFilterOptions(filterType) {
        return this.filterDefinitions[filterType]?.options || [];
    },

    validateFilters(filters) {
        return Object.entries(filters).every(([key, value]) => {
            const filterDef = this.filterDefinitions[key];
            if (!filterDef) return false;
            if (!value) return true;
            return filterDef.options.some(option => option.value === value);
        });
    },

    createFilterSummary(filters) {
        return Object.entries(filters)
            .filter(([_, value]) => value)
            .map(([key, value]) => {
                const definition = this.filterDefinitions[key];
                const option = definition.options.find(opt => opt.value === value);
                return {
                    type: key,
                    label: definition.label,
                    value: option?.label || value
                };
            });
    }
};

// Congelar el servicio para prevenir modificaciones
Object.freeze(FilterService);

// Exponer el servicio globalmente
window.FilterService = FilterService;