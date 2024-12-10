const ShareService = {
    baseUrl: 'https://godzonex15.github.io/',
    
    init() {
        // Check for shared property on page load
        this.handleSharedProperty();
        
        // Listen for URL changes
        window.addEventListener('popstate', () => {
            this.handleSharedProperty();
        });

        // Listen for iframe messages from parent
        window.addEventListener('message', (event) => {
            // Verify origin if needed
            if (event.data.type === 'shareProperty') {
                this.handleSharedProperty();
            }
        });
    },

    generateShareUrl(propertyId) {
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
                // Show property details
                setTimeout(() => {
                    PropertyModal.show(propertyId);
                }, 500);

                // Update map if needed
                if (PropertyMap && PropertyMap.focusMarker) {
                    PropertyMap.focusMarker(propertyId);
                }

                // Update URL without reload
                const newUrl = this.generateShareUrl(propertyId);
                window.history.replaceState({ propertyId }, '', newUrl);

                // Notify parent frame if in iframe
                if (window.parent !== window) {
                    window.parent.postMessage({
                        type: 'propertySelected',
                        propertyId: propertyId
                    }, '*');
                }
            }
        }
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
            if (navigator.share) {
                await navigator.share(shareData);
                NotificationService.success('Property shared successfully!');
            } else {
                await navigator.clipboard.writeText(shareUrl);
                NotificationService.success('Link copied to clipboard!', {
                    title: 'Share Property',
                    duration: 2000
                });
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                NotificationService.error('Error sharing property');
                console.error('Error sharing:', error);
            }
        }
    }
};

// Initialize service
ShareService.init();

// Export for global use
window.ShareService = ShareService;