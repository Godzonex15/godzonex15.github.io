const I18nService = {
    config: {
        defaultLocale: 'en',
        fallbackLocale: 'en',
        supportedLocales: ['en', 'es'],
        storageKey: 'selectedLocale'
    },

    state: {
        currentLocale: 'en',
        translations: {
            en: {
                propertyTypes: {
                    house: 'House',
                    apartment: 'Apartment',
                    condo: 'Condo',
                    land: 'Land'
                },
                filters: {
                    propertyType: 'Property Type',
                    location: 'Location',
                    priceRange: 'Price Range',
                    bedrooms: 'Bedrooms',
                    bathrooms: 'Bathrooms',
                    allTypes: 'All Types',
                    allLocations: 'All Locations',
                    anyPrice: 'Any Price'
                },
                features: {
                    beds: 'beds',
                    baths: 'baths',
                    sqft: 'sq ft',
                    yearBuilt: 'Year Built',
                    pool: 'Pool',
                    garage: 'Garage'
                },
                actions: {
                    viewDetails: 'View Details',
                    contact: 'Contact Agent',
                    schedule: 'Schedule Viewing',
                    share: 'Share',
                    save: 'Save',
                    remove: 'Remove'
                },
                amenities: {
                    pool: 'Swimming Pool',
                    gym: 'Fitness Center',
                    parking: 'Parking',
                    security: '24/7 Security',
                    ac: 'Air Conditioning'
                }
            },
            es: {
                propertyTypes: {
                    house: 'Casa',
                    apartment: 'Apartamento',
                    condo: 'Condominio',
                    land: 'Terreno'
                },
                filters: {
                    propertyType: 'Tipo de Propiedad',
                    location: 'Ubicación',
                    priceRange: 'Rango de Precio',
                    bedrooms: 'Habitaciones',
                    bathrooms: 'Baños',
                    allTypes: 'Todos los Tipos',
                    allLocations: 'Todas las Ubicaciones',
                    anyPrice: 'Cualquier Precio'
                },
                features: {
                    beds: 'hab',
                    baths: 'baños',
                    sqft: 'm²',
                    yearBuilt: 'Año Construcción',
                    pool: 'Piscina',
                    garage: 'Garaje'
                },
                actions: {
                    viewDetails: 'Ver Detalles',
                    contact: 'Contactar Agente',
                    schedule: 'Programar Visita',
                    share: 'Compartir',
                    save: 'Guardar',
                    remove: 'Eliminar'
                },
                amenities: {
                    pool: 'Piscina',
                    gym: 'Gimnasio',
                    parking: 'Estacionamiento',
                    security: 'Seguridad 24/7',
                    ac: 'Aire Acondicionado'
                }
            }
        }
    },

    // Inicialización
    init() {
        this.loadLocale();
        this.bindEvents();
    },

    // Cargar idioma guardado o detectar automáticamente
    loadLocale() {
        const saved = localStorage.getItem(this.config.storageKey);
        if (saved && this.config.supportedLocales.includes(saved)) {
            this.setLocale(saved);
        } else {
            this.detectLocale();
        }
    },

    // Detectar idioma del navegador
    detectLocale() {
        const browserLocale = navigator.language.split('-')[0];
        const locale = this.config.supportedLocales.includes(browserLocale) ?
            browserLocale : this.config.defaultLocale;
        this.setLocale(locale);
    },

    // Cambiar idioma
    setLocale(locale) {
        if (!this.config.supportedLocales.includes(locale)) {
            console.warn(`Locale ${locale} not supported, falling back to ${this.config.fallbackLocale}`);
            locale = this.config.fallbackLocale;
        }

        this.state.currentLocale = locale;
        localStorage.setItem(this.config.storageKey, locale);
        document.documentElement.setAttribute('lang', locale);
        
        this.updateUI();
    },

    // Obtener traducción
    t(key, params = {}) {
        const keys = key.split('.');
        let value = this.state.translations[this.state.currentLocale];
        
        for (const k of keys) {
            value = value?.[k];
            if (value === undefined) {
                console.warn(`Translation key not found: ${key}`);
                return key;
            }
        }

        // Reemplazar parámetros
        if (typeof value === 'string' && Object.keys(params).length > 0) {
            return value.replace(/{(\w+)}/g, (match, key) => {
                return params[key] !== undefined ? params[key] : match;
            });
        }

        return value;
    },

    // Formatear números según el locale
    formatNumber(number, options = {}) {
        return new Intl.NumberFormat(this.state.currentLocale, options).format(number);
    },

    // Formatear fechas según el locale
    formatDate(date, options = {}) {
        return new Intl.DateTimeFormat(this.state.currentLocale, options).format(date);
    },

    // Formatear moneda según el locale
    formatCurrency(amount, currency = 'USD') {
        return new Intl.NumberFormat(this.state.currentLocale, {
            style: 'currency',
            currency
        }).format(amount);
    },

    // Actualizar interfaz cuando cambia el idioma
    updateUI() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.dataset.i18n;
            element.textContent = this.t(key);
        });

        // Disparar evento para que otros componentes se actualicen
        window.dispatchEvent(new CustomEvent('localeChanged', {
            detail: { locale: this.state.currentLocale }
        }));
    },

    // Manejadores de eventos
    bindEvents() {
        // Actualizar cuando se restaura la página
        window.addEventListener('pageshow', () => {
            this.loadLocale();
        });

        // Observer para elementos dinámicos
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.dataset?.i18n) {
                        node.textContent = this.t(node.dataset.i18n);
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
};

// Inicializar servicio
I18nService.init();

// Exportar servicio
window.I18nService = I18nService;