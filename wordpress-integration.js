// WordPress integration script
(function() {
    const IFRAME_ID = 'mls-search-iframe';
    const MLS_APP_URL = 'https://mls-search-interface-6528ddc13a39.herokuapp.com/';
    
    // Initialize integration
    function initializeMLSIntegration() {
        const iframe = document.getElementById(IFRAME_ID);
        if (!iframe) return;
        
        // Listen for messages from the iframe
        window.addEventListener('message', handleIframeMessage);
        
        // Handle URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const propertyId = urlParams.get('property');
        if (propertyId) {
            // Wait for iframe to load before sending message
            iframe.addEventListener('load', () => {
                sendMessageToIframe('openProperty', { propertyId });
            });
        }
    }
    
    function handleIframeMessage(event) {
        if (event.origin !== MLS_APP_URL) return;
        
        const { type, ...data } = event.data;
        
        switch (type) {
            case 'appLoaded':
                console.log('MLS Search application loaded');
                break;
                
            case 'updateUrl':
                updateBrowserUrl(data.propertyId);
                break;
                
            case 'notification':
                showNotification(data.message);
                break;
                
            case 'propertyLoaded':
                handlePropertyLoaded(data.propertyId);
                break;

            case 'updateUrl':
                updateBrowserUrl(data.propertyId);
                break;
                
            case 'notification':
                showNotification(data.message);
                break;
        }
    }
    
    function sendMessageToIframe(type, data) {
        const iframe = document.getElementById(IFRAME_ID);
        if (!iframe) return;
        
        iframe.contentWindow.postMessage({
            type,
            ...data
        }, MLS_APP_URL);
    }
    
    function updateBrowserUrl(propertyId) {
        const newUrl = propertyId 
            ? `${window.location.pathname}?property=${propertyId}`
            : window.location.pathname;
            
        history.pushState({}, '', newUrl);
    }

    
    
    function showNotification(message) {
        // Implementar según el sistema de notificaciones de WordPress
        // Ejemplo usando una notificación simple
        const notification = document.createElement('div');
        notification.className = 'wp-notification';
        notification.innerHTML = `
            <div class="notification-content">
                ${message}
                <button onclick="this.parentElement.remove()">×</button>
            </div>
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }
    
    function handlePropertyLoaded(propertyId) {
        // Implementar cualquier lógica adicional necesaria cuando se carga una propiedad
        console.log('Property loaded:', propertyId);
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeMLSIntegration);
    } else {
        initializeMLSIntegration();
    }
})();