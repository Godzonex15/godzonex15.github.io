const PropertyGallery = {
    state: {
        currentIndex: 0,
        images: [],
        touchStartX: 0,
        touchEndX: 0
    },

    initialize() {
        const property = SAMPLE_LISTINGS.find(p => p.id === APP_STATE.selectedProperty);
        if (!property || !property.photos) return;

        this.state.images = property.photos;
        this.state.currentIndex = 0;
        this.bindEvents();
        this.initializeTouchEvents();
    },

    render(property) {
        if (!property.photos || property.photos.length === 0) {
            return this.renderPlaceholder();
        }

        return `
            <div class="gallery-section">
                <div class="gallery-main">
                    <img src="${property.photos[0].Uri1600 || property.photos[0].Uri800 || '/api/placeholder/800/600'}" 
                         alt="${property.propertytypelabel}" 
                         class="main-image"
                         style="transition: opacity 0.2s ease-in-out">
                    
                    <button class="gallery-nav prev" onclick="PropertyGallery.navigate(-1)" aria-label="Previous image">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <button class="gallery-nav next" onclick="PropertyGallery.navigate(1)" aria-label="Next image">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>

                <div class="thumbnail-strip">
                    ${property.photos.map((photo, index) => `
                        <div class="thumbnail-wrapper ${index === 0 ? 'active' : ''}" 
                             onclick="PropertyGallery.setImage(${index})"
                             role="button"
                             tabindex="0"
                             aria-label="View image ${index + 1} of ${property.photos.length}">
                            <img src="${photo.Uri300}" 
                                 alt="View ${index + 1}"
                                 loading="lazy">
                        </div>
                    `).join('')}
                </div>

                <div class="gallery-counter" aria-live="polite">
                    ${this.state.currentIndex + 1} / ${property.photos.length}
                </div>
            </div>
        `;
    },

    renderPlaceholder() {
        return `
            <div class="gallery-section">
                <div class="gallery-main">
                    <img src="/api/placeholder/800/600" 
                         alt="No image available" 
                         class="main-image placeholder">
                </div>
            </div>
        `;
    },

    setImage(index) {
        const images = this.state.images;
        if (!images || images.length === 0) return;

        // Asegurar que el índice esté dentro de los límites
        index = Math.max(0, Math.min(index, images.length - 1));

        const mainImage = document.querySelector('.gallery-main img');
        const thumbnails = document.querySelectorAll('.thumbnail-wrapper');
        const counter = document.querySelector('.gallery-counter');

        if (mainImage) {
            mainImage.style.opacity = '0';
            setTimeout(() => {
                mainImage.src = images[index].Uri1600 || images[index].Uri800;
                mainImage.style.opacity = '1';
            }, 200);
        }

        thumbnails.forEach((thumb, i) => {
            thumb.classList.toggle('active', i === index);
            if (i === index) {
                thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        });

        if (counter) {
            counter.textContent = `${index + 1} / ${images.length}`;
        }

        this.state.currentIndex = index;
    },

    navigate(direction) {
        const newIndex = this.state.currentIndex + direction;
        const totalImages = this.state.images.length;

        if (newIndex >= 0 && newIndex < totalImages) {
            this.setImage(newIndex);
        } else if (newIndex < 0) {
            this.setImage(totalImages - 1);
        } else {
            this.setImage(0);
        }
    },

    bindEvents() {
        // Eventos de teclado
        document.addEventListener('keydown', (e) => {
            if (!document.getElementById('propertyModal')?.classList.contains('show')) return;

            switch (e.key) {
                case 'ArrowLeft':
                    this.navigate(-1);
                    break;
                case 'ArrowRight':
                    this.navigate(1);
                    break;
            }
        });

        // Accesibilidad para miniaturas
        document.querySelectorAll('.thumbnail-wrapper').forEach((thumb, index) => {
            thumb.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.setImage(index);
                }
            });
        });
    },

    initializeTouchEvents() {
        const galleryMain = document.querySelector('.gallery-main');
        if (!galleryMain) return;

        galleryMain.addEventListener('touchstart', (e) => {
            this.state.touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        galleryMain.addEventListener('touchend', (e) => {
            this.state.touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe();
        }, { passive: true });
    },

    handleSwipe() {
        const threshold = 50;
        const swipeDistance = this.state.touchEndX - this.state.touchStartX;

        if (Math.abs(swipeDistance) > threshold) {
            if (swipeDistance > 0) {
                this.navigate(-1);
            } else {
                this.navigate(1);
            }
        }
    }
};