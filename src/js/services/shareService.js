const ShareService = {
    baseUrl: 'https://bajasurrealtors.com/advanced-search/',
    iframeUrl: 'https://godzonex15.github.io/',
    
    init() {
        this.handleSharedProperty();
        window.addEventListener('popstate', () => {
            this.handleSharedProperty();
        });

        // Escuchar mensajes del padre
        window.addEventListener('message', (event) => {
            if (event.origin === 'https://bajasurrealtors.com') {
                if (event.data.type === 'showProperty') {
                    this.handleSharedProperty();
                }
            }
        });
    },

    generateShareUrl(propertyId) {
        const url = new URL(window !== window.top ? this.baseUrl : this.iframeUrl);
        url.searchParams.set('property', propertyId);
        return url.toString();
    },

    handleSharedProperty() {
        const params = new URLSearchParams(window.location.search);
        const propertyId = params.get('property');
        
        if (propertyId) {
            const property = SAMPLE_LISTINGS.find(p => p.id === propertyId);
            if (property) {
                // Mostrar la propiedad
                setTimeout(() => {
                    PropertyModal.show(propertyId);
                }, 500);

                // Actualizar el mapa
                if (PropertyMap && PropertyMap.focusMarker) {
                    PropertyMap.focusMarker(propertyId);
                }

                // Solo actualizar URL si no estamos en iframe
                if (window === window.top) {
                    const newUrl = this.generateShareUrl(propertyId);
                    window.history.replaceState({ propertyId }, '', newUrl);
                }

                // Notificar al padre si estamos en iframe
                if (window !== window.top) {
                    window.parent.postMessage({
                        type: 'propertySelected',
                        propertyId: propertyId,
                        property: {
                            title: property.streetadditionalinfo || property.propertytypelabel,
                            description: property.publicremarks,
                            type: property.propertytypelabel,
                            location: property.mlsareamajor,
                            price: property.currentpricepublic,
                            image: property.photos?.[0]?.Uri1600 || ''
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
            // Intentar usar el portapapeles moderno
            await navigator.clipboard.writeText(shareUrl);
            NotificationService.success('Link copied to clipboard!', {
                title: 'Share Property',
                duration: 2000
            });
        } catch (error) {
            // Fallback para copiar
            try {
                const textArea = document.createElement('textarea');
                textArea.value = shareUrl;
                textArea.style.position = 'fixed';
                textArea.style.left = '-9999px';
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                NotificationService.success('Link copied to clipboard!', {
                    title: 'Share Property',
                    duration: 2000
                });
            } catch (err) {
                // Si todo falla, mostrar la URL para copiar manualmente
                NotificationService.info(
                    'Could not automatically copy the link. Here it is to copy manually:\n' + shareUrl,
                    { title: 'Share Property', duration: 5000 }
                );
            }
        }

        // Notificar al padre si estamos en iframe
        if (window !== window.top) {
            window.parent.postMessage({
                type: 'shareProperty',
                propertyId,
                url: shareUrl,
                text: shareText
            }, '*');
        }
    }
};

// Inicializar el servicio
ShareService.init();

// Exportar para uso global
window.ShareService = ShareService;