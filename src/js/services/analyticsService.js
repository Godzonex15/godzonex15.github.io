const AnalyticsService = {
    events: {
        PROPERTY_VIEW: 'property_view',
        FILTER_CHANGE: 'filter_change',
        VIEW_CHANGE: 'view_change',
        CONTACT_AGENT: 'contact_agent',
        SCHEDULE_VIEWING: 'schedule_viewing',
        FAVORITE_TOGGLE: 'favorite_toggle',
        MAP_INTERACTION: 'map_interaction',
        SEARCH_PERFORMED: 'search_performed'
    },

    state: {
        sessionStartTime: Date.now(),
        pageViews: 0,
        interactions: {},
        lastEvent: null
    },

    init() {
        this.trackPageView();
        this.bindGlobalEvents();
    },

    trackEvent(eventName, data = {}) {
        try {
            const eventData = {
                eventName,
                timestamp: Date.now(),
                sessionDuration: Date.now() - this.state.sessionStartTime,
                ...data
            };

            // Guardar evento en el estado
            this.state.lastEvent = eventData;
            this.state.interactions[eventName] = (this.state.interactions[eventName] || 0) + 1;

            // Guardar en localStorage para persistencia
            this.persistEvent(eventData);

            // Enviar a servicio de análisis (mock)
            this.sendToAnalytics(eventData);

            return true;
        } catch (error) {
            console.error('Error tracking event:', error);
            return false;
        }
    },

    trackPageView() {
        this.state.pageViews++;
        this.trackEvent('page_view', {
            pageViews: this.state.pageViews,
            path: window.location.pathname,
            referrer: document.referrer
        });
    },

    trackPropertyView(propertyId) {
        this.trackEvent(this.events.PROPERTY_VIEW, {
            propertyId,
            viewType: APP_STATE.currentView
        });
    },

    trackFilterChange(filterType, value) {
        this.trackEvent(this.events.FILTER_CHANGE, {
            filterType,
            value,
            activeFilters: {...APP_STATE.activeFilters}
        });
    },

    trackViewChange(newView) {
        this.trackEvent(this.events.VIEW_CHANGE, {
            previousView: APP_STATE.currentView,
            newView
        });
    },

    trackContactAgent(propertyId) {
        this.trackEvent(this.events.CONTACT_AGENT, {
            propertyId,
            currentView: APP_STATE.currentView
        });
    },

    trackScheduleViewing(propertyId) {
        this.trackEvent(this.events.SCHEDULE_VIEWING, {
            propertyId,
            currentView: APP_STATE.currentView
        });
    },

    trackFavoriteToggle(propertyId, isFavorite) {
        this.trackEvent(this.events.FAVORITE_TOGGLE, {
            propertyId,
            isFavorite,
            totalFavorites: APP_STATE.favorites.size
        });
    },

    trackMapInteraction(interactionType, data = {}) {
        this.trackEvent(this.events.MAP_INTERACTION, {
            interactionType,
            ...data
        });
    },

    // Persistencia de eventos
    persistEvent(eventData) {
        try {
            const events = JSON.parse(localStorage.getItem('analytics_events') || '[]');
            events.push(eventData);
            
            // Mantener solo los últimos 1000 eventos
            if (events.length > 1000) {
                events.shift();
            }
            
            localStorage.setItem('analytics_events', JSON.stringify(events));
        } catch (error) {
            console.error('Error persisting analytics event:', error);
        }
    },

    // Mock de envío a servicio de análisis
    sendToAnalytics(eventData) {
        // En producción, aquí se enviarían los datos a un servicio real
        console.debug('Analytics event:', eventData);
    },

    // Eventos globales
    bindGlobalEvents() {
        // Rastrear tiempo en página
        let lastActivityTime = Date.now();
        
        document.addEventListener('mousemove', () => {
            const now = Date.now();
            if (now - lastActivityTime > 60000) { // 1 minuto
                this.trackEvent('user_active_again', {
                    inactiveTime: now - lastActivityTime
                });
            }
            lastActivityTime = now;
        });

        // Rastrear salida
        window.addEventListener('beforeunload', () => {
            this.trackEvent('session_end', {
                sessionDuration: Date.now() - this.state.sessionStartTime,
                pageViews: this.state.pageViews,
                totalInteractions: Object.values(this.state.interactions).reduce((a, b) => a + b, 0)
            });
        });
    },

    // Métodos de reporte
    getSessionStats() {
        return {
            sessionDuration: Date.now() - this.state.sessionStartTime,
            pageViews: this.state.pageViews,
            interactions: {...this.state.interactions},
            lastEvent: this.state.lastEvent
        };
    },

    getStoredEvents() {
        try {
            return JSON.parse(localStorage.getItem('analytics_events') || '[]');
        } catch {
            return [];
        }
    }
};

// Inicializar el servicio
AnalyticsService.init();