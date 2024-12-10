const Formatters = {
    // Formato de precio
    formatPrice(price, options = {}) {
        if (!price) return 'Price on request';
        
        const config = {
            locale: options.locale || CONFIG.currency.locale,
            currency: options.currency || CONFIG.currency.currency,
            minimumFractionDigits: options.minimumFractionDigits || 0,
            maximumFractionDigits: options.maximumFractionDigits || 0
        };

        try {
            return new Intl.NumberFormat(config.locale, {
                style: 'currency',
                currency: config.currency,
                minimumFractionDigits: config.minimumFractionDigits,
                maximumFractionDigits: config.maximumFractionDigits
            }).format(price);
        } catch (error) {
            console.error('Error formatting price:', error);
            return `$${Number(price).toLocaleString()}`;
        }
    },

    // Formato de área
    formatArea(area, unit = 'sq ft') {
        if (!area) return 'N/A';
        return `${Number(area).toLocaleString()} ${unit}`;
    },

    // Formato de fecha
    formatDate(date, options = {}) {
        if (!date) return 'N/A';
        
        try {
            const dateObj = new Date(date);
            return dateObj.toLocaleDateString(options.locale || 'en-US', {
                year: options.year || 'numeric',
                month: options.month || 'long',
                day: options.day || 'numeric'
            });
        } catch (error) {
            console.error('Error formatting date:', error);
            return date;
        }
    },

    // Formato de distancia
    formatDistance(meters, unit = 'km') {
        if (!meters) return 'N/A';
        
        switch (unit.toLowerCase()) {
            case 'km':
                return `${(meters / 1000).toFixed(1)} km`;
            case 'mi':
                return `${(meters / 1609.34).toFixed(1)} mi`;
            default:
                return `${meters} m`;
        }
    },

    // Formato de características
    formatFeatures(features) {
        if (!features) return [];
        
        try {
            const parsed = typeof features === 'string' ? JSON.parse(features) : features;
            return Object.entries(parsed)
                .filter(([_, value]) => value)
                .map(([key]) => key);
        } catch (error) {
            console.error('Error formatting features:', error);
            return [];
        }
    },

    // Formato de texto truncado
    truncateText(text, maxLength = 100) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + '...';
    },

    // Formato de rango de precios
    formatPriceRange(min, max) {
        const formattedMin = this.formatPrice(min);
        if (!max) return `${formattedMin}+`;
        return `${formattedMin} - ${this.formatPrice(max)}`;
    }
};

// Congelar el objeto de formateo para prevenir modificaciones
Object.freeze(Formatters);