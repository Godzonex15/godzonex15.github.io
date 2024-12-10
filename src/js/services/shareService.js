// shareService.js - Actualizado
const ShareService = {
    baseUrl: window.location.href, // URL actual
    
    init() {
        // Check for shared property on page load
        this.handleSharedProperty();
        
        // Listen for URL changes
        window.addEventListener('popstate', () => {
            this.handleSharedProperty();
        });

        // Listen for iframe messages from parent
        window.addEventListener('message', (event) => {
            // Verificar origen para seguridad
            if (this.isValidOrigin(event.origin)) {
                if (event.data.type === 'shareProperty') {
                    this.handleSharedProperty();
                }
            }
        });
    },

    isValidOrigin(origin) {
        // Lista de dominios permitidos
        const allowedDomains = [
            'https://bajasurrealtors.com',
            'https://godzonex15.github.io'
        ];
        return allowedDomains.includes(origin);
    },

    generateShareUrl(propertyId) {
        // Crear URL con parámetros para compartir
        const url = new URL(this.baseUrl);
        url.searchParams.set('property', propertyId);
        return url.toString();
    },

    async shareProperty(propertyId) {
        const property = SAMPLE_LISTINGS.find(p => p.id === propertyId);
        if (!property) return;

        const shareUrl = this.generateShareUrl(propertyId);
        const shareData = {
            title: property.streetadditionalinfo || 'Property Details',
            text: `Check out this ${property.propertytypelabel} in ${property.city}!`,
            url: shareUrl
        };

        try {
            // Intentar usar Web Share API si está disponible
            if (navigator.share) {
                await navigator.share(shareData);
                NotificationService.success('Property shared successfully!');
            } else {
                // Fallback a copiar al portapapeles
                await navigator.clipboard.writeText(shareUrl);
                NotificationService.success('Link copied to clipboard!', {
                    title: 'Share Property',
                    duration: 2000
                });
            }

            // Notificar a la página padre
            this.notifyParentPage(propertyId);

        } catch (error) {
            if (error.name !== 'AbortError') {
                NotificationService.error('Error sharing property');
                console.error('Error sharing:', error);
            }
        }
    },

    notifyParentPage(propertyId) {
        // Enviar mensaje a la página padre
        if (window.parent !== window) {
            window.parent.postMessage({
                type: 'propertyShared',
                propertyId: propertyId,
                url: this.generateShareUrl(propertyId)
            }, '*');  // En producción, especificar origen exacto
        }
    },

    handleSharedProperty() {
        // Manejar propiedad compartida
        const params = new URLSearchParams(window.location.search);
        const propertyId = params.get('property');
        
        if (propertyId) {
            const property = SAMPLE_LISTINGS.find(p => p.id === propertyId);
            if (property) {
                // Mostrar detalles de la propiedad
                setTimeout(() => {
                    PropertyModal.show(propertyId);
                }, 500);

                // Actualizar mapa
                if (PropertyMap && PropertyMap.focusMarker) {
                    PropertyMap.focusMarker(propertyId);
                }

                // Actualizar URL sin recargar
                const newUrl = this.generateShareUrl(propertyId);
                window.history.replaceState({ propertyId }, '', newUrl);
            }
        }
    }
};

// Inicializar servicio
ShareService.init();

// Exportar para uso global
window.ShareService = ShareService;