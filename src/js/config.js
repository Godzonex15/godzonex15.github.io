// Configuración global de la aplicación
const CONFIG = {
    // Configuración del mapa
    map: {
        defaultCenter: [24.1636, -110.3131],
        defaultZoom: 10,
        tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© OpenStreetMap contributors'
    },

    // Configuración de la galería
    gallery: {
        transitionSpeed: 200,
        defaultHeight: 500
    },

    // Tipos de propiedades y sus colores
    propertyTypes: {
        house: {
            color: '#9B8B70', // Taupe elegante
            icon: 'fa-home'
        },
        condo: {
            color: '#B4A590', // Beige cálido
            icon: 'fa-building'
        },
        apartment: {
            color: '#8E8279', // Gris cálido
            icon: 'fa-city'
        },
        land: {
            color: '#A69F95', // Gris beige
            icon: 'fa-mountain'
        }
    },

    // Configuración de la animación
    animation: {
        duration: 300,
        easing: 'ease'
    },

    // Configuración de las conversiones de moneda
    currency: {
        exchangeRate: 20.78, // MXN to USD
        locale: 'en-US',
        currency: 'USD'
    }
};

// Congelar el objeto de configuración para prevenir modificaciones accidentales
Object.freeze(CONFIG);