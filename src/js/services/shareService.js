const ShareService = {
    baseUrl: 'https://bajasurrealtors.com/advanced-search/',
    iframeUrl: 'https://godzonex15.github.io/',
    
    init() {
        // Check for shared property on page load
        this.handleSharedProperty();
        
        // Listen for URL changes
        window.addEventListener('popstate', () => {
            this.handleSharedProperty();
        });

        // Listen for iframe messages from parent
        window.addEventListener('message', (event) => {
            // Verify origin for security
            if (event.origin === 'https://bajasurrealtors.com') {
                if (event.data.type === 'shareProperty') {
                    this.handleSharedProperty();
                }
            }
        });
    },

    generateShareUrl(propertyId, property) {
        let url;
        
        // If we're in the iframe, generate the parent page URL
        if (window !== window.top) {
            url = new URL(this.baseUrl);
        } else {
            url = new URL(this.iframeUrl);
        }
        
        // Add property ID and details to URL
        url.searchParams.set('property', propertyId);
        if (property) {
            url.searchParams.set('type', property.propertytypelabel);
            url.searchParams.set('location', property.mlsareamajor);
            url.searchParams.set('price', property.currentpricepublic);
        }
        
        return url.toString();
    },

    handleSharedProperty() {
        const params = new URLSearchParams(window.location.search);
        const propertyId = params.get('property');
        
        if (propertyId) {
            const property = SAMPLE_LISTINGS.find(p => p.id === propertyId);
            if (property) {
                // Update filters based on URL parameters
                if (FilterService && typeof FilterService.setFilters === 'function') {
                    const filters = {
                        propertyType: params.get('type'),
                        location: params.get('location'),
                        priceRange: params.get('price')
                    };
                    FilterService.setFilters(filters);
                }

                // Show property details
                setTimeout(() => {
                    PropertyModal.show(propertyId);
                }, 500);

                // Update map if needed
                if (PropertyMap && PropertyMap.focusMarker) {
                    PropertyMap.focusMarker(propertyId);
                }

                // Update URL without reload
                const newUrl = this.generateShareUrl(propertyId, property);
                window.history.replaceState({ propertyId }, '', newUrl);

                // Notify parent frame if in iframe
                if (window !== window.top) {
                    window.parent.postMessage({
                        type: 'propertySelected',
                        propertyId: propertyId,
                        property: {
                            type: property.propertytypelabel,
                            location: property.mlsareamajor,
                            price: property.currentpricepublic,
                            title: property.streetadditionalinfo || property.propertytypelabel,
                            description: property.publicremarks
                        }
                    }, 'https://bajasurrealtors.com');
                }
            }
        }
    },

    async shareProperty(propertyId) {
        const property = SAMPLE_LISTINGS.find(p => p.id === propertyId);
        if (!property) return;

        const shareUrl = this.generateShareUrl(propertyId, property);
        const shareData = {
            title: `${property.streetadditionalinfo || 'Property'} - Baja Sur Realtors`,
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