const ShareService = {
    baseUrl: 'https://bajasurrealtors.com/advanced-search/',
    iframeUrl: 'https://godzonex15.github.io/',
    
    init() {
        this.handleSharedProperty();
        window.addEventListener('popstate', () => {
            this.handleSharedProperty();
        });
    },

    generateShareUrl(propertyId) {
        // Siempre generar la URL del sitio principal para compartir
        const url = new URL(this.baseUrl);
        url.searchParams.set('property', propertyId);
        return url.toString();
    },

    handleSharedProperty() {
        const params = new URLSearchParams(window.location.search);
        const propertyId = params.get('property');
        
        if (propertyId) {
            const property = SAMPLE_LISTINGS.find(p => p.id === propertyId);
            if (property) {
                setTimeout(() => {
                    PropertyModal.show(propertyId);
                }, 500);

                if (PropertyMap && PropertyMap.focusMarker) {
                    PropertyMap.focusMarker(propertyId);
                }

                // Notificar al padre solo si estamos en un iframe
                if (window !== window.top) {
                    window.parent.postMessage({
                        type: 'propertySelected',
                        propertyId: propertyId,
                        property: {
                            title: property.streetadditionalinfo || property.propertytypelabel,
                            description: property.publicremarks,
                            type: property.propertytypelabel,
                            location: property.mlsareamajor,
                            price: property.currentpricepublic
                        }
                    }, '*');
                }
            }
        }
    },

    async shareProperty(propertyId) {
        const property = SAMPLE_LISTINGS.find(p => p.id === propertyId);
        if (!property) return;

        const shareUrl = this.generateShareUrl(propertyId);
        const shareText = `Check out this ${property.propertytypelabel} in ${property.city}!`;

        try {
            // Primero intentar copiar al portapapeles
            await navigator.clipboard.writeText(shareUrl);
            NotificationService.success('Link copied to clipboard!', {
                title: 'Share Property',
                duration: 2000
            });

            // Si estamos en un iframe, notificar al padre
            if (window !== window.top) {
                window.parent.postMessage({
                    type: 'shareProperty',
                    url: shareUrl,
                    text: shareText
                }, '*');
            }
        } catch (error) {
            console.error('Error copying to clipboard:', error);
            
            // Fallback: Mostrar la URL para copiar manualmente
            NotificationService.info(`Share this URL: ${shareUrl}`, {
                title: 'Share Property',
                duration: 5000
            });
        }
    }
};

// Initialize service
ShareService.init();

// Export for global use
window.ShareService = ShareService;