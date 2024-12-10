const PropertyService = {
    // Métodos de filtrado
    filterProperties(properties, filters) {
        return properties.filter(property => {
            // Filtrar por tipo de propiedad
            if (filters.propertyType && 
                property.propertytypelabel !== filters.propertyType) {
                return false;
            }

            // Filtrar por ubicación
            if (filters.location && 
                property.mlsareamajor !== filters.location) {
                return false;
            }

            // Filtrar por rango de precio
            if (filters.priceRange) {
                const [minStr, maxStr] = filters.priceRange.split('-');
                const price = parseInt(property.currentpricepublic);
                const min = parseInt(minStr);
                const max = maxStr ? parseInt(maxStr) : Infinity;
                
                if (price < min || price > max) {
                    return false;
                }
            }

            // Filtrar por número de habitaciones
            if (filters.bedrooms) {
                const minBeds = parseInt(filters.bedrooms);
                const beds = parseInt(property.bedstotal) || 0;
                if (beds < minBeds) {
                    return false;
                }
            }

            // Filtrar por número de baños
            if (filters.bathrooms) {
                const minBaths = parseFloat(filters.bathrooms);
                const baths = parseFloat(property.bathroomstotaldecimal) || 0;
                if (baths < minBaths) {
                    return false;
                }
            }

            return true;
        });
    },

    // Métodos de búsqueda
    searchProperties(properties, searchTerm) {
        const normalizedTerm = searchTerm.toLowerCase();
        return properties.filter(property => {
            return (
                property.streetadditionalinfo?.toLowerCase().includes(normalizedTerm) ||
                property.city?.toLowerCase().includes(normalizedTerm) ||
                property.subdivisionname?.toLowerCase().includes(normalizedTerm) ||
                property.publicremarks?.toLowerCase().includes(normalizedTerm)
            );
        });
    },

    // Métodos de ordenamiento
    sortProperties(properties, sortBy, sortOrder = 'asc') {
        return [...properties].sort((a, b) => {
            let comparison = 0;
            
            switch (sortBy) {
                case 'price':
                    comparison = parseFloat(a.currentpricepublic) - parseFloat(b.currentpricepublic);
                    break;
                case 'bedrooms':
                    comparison = (parseInt(a.bedstotal) || 0) - (parseInt(b.bedstotal) || 0);
                    break;
                case 'bathrooms':
                    comparison = (parseFloat(a.bathroomstotaldecimal) || 0) - (parseFloat(b.bathroomstotaldecimal) || 0);
                    break;
                case 'area':
                    comparison = (parseFloat(a.buildingareatotal) || 0) - (parseFloat(b.buildingareatotal) || 0);
                    break;
                case 'city':
                    comparison = (a.city || '').localeCompare(b.city || '');
                    break;
                default:
                    return 0;
            }

            return sortOrder === 'asc' ? comparison : -comparison;
        });
    },

    // Métodos de agrupación
    groupProperties(properties, groupBy) {
        return properties.reduce((groups, property) => {
            let key;
            switch (groupBy) {
                case 'type':
                    key = property.propertytypelabel || 'Other';
                    break;
                case 'city':
                    key = property.city || 'Unknown';
                    break;
                case 'priceRange':
                    const price = parseInt(property.currentpricepublic);
                    key = this.getPriceRange(price);
                    break;
                default:
                    key = 'Other';
            }

            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(property);
            return groups;
        }, {});
    },

    // Métodos de utilidad
    getPriceRange(price) {
        if (price <= 100000) return '0-100k';
        if (price <= 200000) return '100k-200k';
        if (price <= 300000) return '200k-300k';
        if (price <= 400000) return '300k-400k';
        return '400k+';
    },

    // Métodos de análisis
    analyzeProperties(properties) {
        const analysis = {
            totalCount: properties.length,
            averagePrice: 0,
            priceRange: { min: Infinity, max: -Infinity },
            typeDistribution: {},
            cityDistribution: {},
            averageBedrooms: 0,
            averageBathrooms: 0
        };

        properties.forEach(property => {
            // Análisis de precios
            const price = parseFloat(property.currentpricepublic);
            analysis.averagePrice += price;
            analysis.priceRange.min = Math.min(analysis.priceRange.min, price);
            analysis.priceRange.max = Math.max(analysis.priceRange.max, price);

            // Distribución por tipo
            const type = property.propertytypelabel || 'Unknown';
            analysis.typeDistribution[type] = (analysis.typeDistribution[type] || 0) + 1;

            // Distribución por ciudad
            const city = property.city || 'Unknown';
            analysis.cityDistribution[city] = (analysis.cityDistribution[city] || 0) + 1;

            // Promedios
            analysis.averageBedrooms += parseInt(property.bedstotal) || 0;
            analysis.averageBathrooms += parseFloat(property.bathroomstotaldecimal) || 0;
        });

        // Calcular promedios finales
        if (properties.length > 0) {
            analysis.averagePrice /= properties.length;
            analysis.averageBedrooms /= properties.length;
            analysis.averageBathrooms /= properties.length;
        }

        return analysis;
    }
};

// Congelar el servicio para prevenir modificaciones
Object.freeze(PropertyService);