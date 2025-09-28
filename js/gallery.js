// Gallery module for displaying and interacting with media
class Gallery {
    constructor() {
        this.currentAlbum = null;
        this.currentMedia = [];
        this.currentIndex = 0;
        this.filterType = 'all';
        this.sortBy = 'date';
    }

    async init() {
        await this.loadAlbums();
        this.setupLightbox();
    }

    async loadAlbums() {
        const albums = storage.getAlbums();
        const grid = document.getElementById('albumsGrid');
        const emptyState = document.getElementById('emptyState');

        if (albums.length === 0) {
            grid.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        grid.innerHTML = '';

        // Sort albums
        const sortedAlbums = this.sortAlbums(albums);

        // Render each album
        sortedAlbums.forEach(album => {
            const card = this.createAlbumCard(album);
            grid.appendChild(card);
        });
    }

    sortAlbums(albums) {
        const sorted = [...albums];

        switch (this.sortBy) {
            case 'name':
                sorted.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'size':
                sorted.sort((a, b) => (b.mediaCount || 0) - (a.mediaCount || 0));
                break;
            case 'date':
            default:
                sorted.sort((a, b) => b.createdAt - a.createdAt);
                break;
        }

        return sorted;
    }

    createAlbumCard(album) {
        const card = document.createElement('div');
        card.className = 'album-card';
        card.onclick = () => this.openAlbum(album.id);

        const cover = document.createElement('div');
        cover.className = 'album-cover';

        if (album.coverImage) {
            const img = document.createElement('img');
            img.src = album.coverImage;
            img.alt = album.name;
            cover.appendChild(img);
        } else {
            const placeholder = document.createElement('div');
            placeholder.className = 'album-placeholder';
            placeholder.innerHTML = `
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke-width="1.5"/>
                    <circle cx="8.5" cy="8.5" r="1.5" stroke-width="1.5"/>
                    <path d="M21 15l-5-5L5 21" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
            cover.appendChild(placeholder);
        }

        const info = document.createElement('div');
        info.className = 'album-info';

        const title = document.createElement('h3');
        title.className = 'album-title';
        title.textContent = album.name;

        const meta = document.createElement('div');
        meta.className = 'album-meta';

        const count = document.createElement('span');
        count.className = 'album-count';
        count.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke-width="2"/>
            </svg>
            ${album.mediaCount || 0} items
        `;

        const views = document.createElement('span');
        views.className = 'album-count';
        views.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke-width="2"/>
                <circle cx="12" cy="12" r="3" stroke-width="2"/>
            </svg>
            ${album.views || 0} views
        `;

        meta.appendChild(count);
        meta.appendChild(views);
        info.appendChild(title);
        info.appendChild(meta);

        card.appendChild(cover);
        card.appendChild(info);

        return card;
    }

    async openAlbum(albumId) {
        this.currentAlbum = storage.getAlbum(albumId);
        if (!this.currentAlbum) return;

        // Increment views
        storage.incrementAlbumViews(albumId);

        // Load media
        this.currentMedia = await storage.getAlbumMedia(albumId);

        // Update modal
        const modal = document.getElementById('galleryModal');
        const title = document.getElementById('modalTitle');
        const grid = document.getElementById('mediaGrid');

        title.textContent = this.currentAlbum.name;
        grid.innerHTML = '';

        // Filter media
        const filteredMedia = this.filterMedia(this.currentMedia);

        // Render media items
        filteredMedia.forEach((item, index) => {
            const mediaElement = this.createMediaElement(item, index);
            grid.appendChild(mediaElement);
        });

        // Show modal
        modal.classList.add('active');
    }

    filterMedia(media) {
        if (this.filterType === 'all') return media;

        return media.filter(item => {
            if (this.filterType === 'photos' && item.type === 'photo') return true;
            if (this.filterType === 'videos' && item.type === 'video') return true;
            return false;
        });
    }

    createMediaElement(item, index) {
        const element = document.createElement('div');
        element.className = 'media-item';

        if (item.type === 'photo') {
            const img = document.createElement('img');
            img.src = item.thumbnail || item.data;
            img.alt = item.name;
            img.loading = 'lazy';
            element.appendChild(img);
        } else {
            const video = document.createElement('video');
            video.src = item.data;
            video.poster = item.thumbnail;
            video.muted = true;
            video.loop = true;
            element.appendChild(video);

            // Play on hover
            element.onmouseenter = () => video.play();
            element.onmouseleave = () => {
                video.pause();
                video.currentTime = 0;
            };
        }

        // Type indicator
        const type = document.createElement('div');
        type.className = 'media-type';
        type.textContent = item.type === 'video' ? 'VIDEO' : 'PHOTO';
        element.appendChild(type);

        // Overlay
        const overlay = document.createElement('div');
        overlay.className = 'media-overlay';
        element.appendChild(overlay);

        // Actions
        const actions = document.createElement('div');
        actions.className = 'media-actions';

        const viewBtn = document.createElement('button');
        viewBtn.className = 'media-btn';
        viewBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke-width="2"/>
                <circle cx="12" cy="12" r="3" stroke-width="2"/>
            </svg>
        `;
        viewBtn.onclick = (e) => {
            e.stopPropagation();
            this.openLightbox(index);
        };

        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'media-btn';
        downloadBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke-width="2"/>
                <polyline points="7 10 12 15 17 10" stroke-width="2"/>
                <line x1="12" y1="15" x2="12" y2="3" stroke-width="2"/>
            </svg>
        `;
        downloadBtn.onclick = (e) => {
            e.stopPropagation();
            this.downloadMedia(item);
        };

        actions.appendChild(viewBtn);
        actions.appendChild(downloadBtn);
        element.appendChild(actions);

        // Click to open lightbox
        element.onclick = () => this.openLightbox(index);

        return element;
    }

    setupLightbox() {
        const lightbox = document.getElementById('lightbox');
        const closeBtn = document.getElementById('lightboxClose');
        const prevBtn = document.getElementById('lightboxPrev');
        const nextBtn = document.getElementById('lightboxNext');
        const overlay = document.getElementById('lightboxOverlay');
        const downloadBtn = document.getElementById('lightboxDownload');

        closeBtn.onclick = () => this.closeLightbox();
        overlay.onclick = () => this.closeLightbox();

        prevBtn.onclick = () => this.navigateLightbox(-1);
        nextBtn.onclick = () => this.navigateLightbox(1);

        downloadBtn.onclick = () => {
            const media = this.filterMedia(this.currentMedia)[this.currentIndex];
            if (media) this.downloadMedia(media);
        };

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!lightbox.classList.contains('active')) return;

            switch (e.key) {
                case 'Escape':
                    this.closeLightbox();
                    break;
                case 'ArrowLeft':
                    this.navigateLightbox(-1);
                    break;
                case 'ArrowRight':
                    this.navigateLightbox(1);
                    break;
            }
        });
    }

    openLightbox(index) {
        const filteredMedia = this.filterMedia(this.currentMedia);
        if (index < 0 || index >= filteredMedia.length) return;

        this.currentIndex = index;
        const media = filteredMedia[index];

        const lightbox = document.getElementById('lightbox');
        const mediaContainer = document.getElementById('lightboxMedia');
        const title = document.getElementById('lightboxTitle');
        const prevBtn = document.getElementById('lightboxPrev');
        const nextBtn = document.getElementById('lightboxNext');

        // Clear previous content
        mediaContainer.innerHTML = '';

        // Create media element
        if (media.type === 'photo') {
            const img = document.createElement('img');
            img.src = media.data;
            img.alt = media.name;
            mediaContainer.appendChild(img);
        } else {
            const video = document.createElement('video');
            video.src = media.data;
            video.controls = true;
            video.autoplay = true;
            mediaContainer.appendChild(video);
        }

        // Update title
        title.textContent = media.name;

        // Update navigation buttons
        prevBtn.style.display = index > 0 ? 'flex' : 'none';
        nextBtn.style.display = index < filteredMedia.length - 1 ? 'flex' : 'none';

        // Show lightbox
        lightbox.classList.add('active');
    }

    closeLightbox() {
        const lightbox = document.getElementById('lightbox');
        const mediaContainer = document.getElementById('lightboxMedia');

        // Stop any playing videos
        const video = mediaContainer.querySelector('video');
        if (video) {
            video.pause();
        }

        lightbox.classList.remove('active');
    }

    navigateLightbox(direction) {
        const filteredMedia = this.filterMedia(this.currentMedia);
        const newIndex = this.currentIndex + direction;

        if (newIndex >= 0 && newIndex < filteredMedia.length) {
            this.openLightbox(newIndex);
        }
    }

    downloadMedia(media) {
        try {
            // Increment download count
            storage.incrementDownloadCount(media.id);

            // Create download link
            const link = document.createElement('a');
            link.href = media.data;
            link.download = media.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Show toast
            this.showToast(`Downloading ${media.name}`);
        } catch (error) {
            console.error('Download error:', error);
            this.showToast('Download failed', 'error');
        }
    }

    async downloadAlbum() {
        if (!this.currentAlbum) return;

        this.showToast('Preparing download...');

        try {
            const media = await storage.getAlbumMedia(this.currentAlbum.id);

            if (media.length === 0) {
                this.showToast('No media to download', 'error');
                return;
            }

            // For GitHub Pages, we'll download files individually
            // In a real implementation, you'd use a library like JSZip
            this.showToast(`Downloading ${media.length} files...`);

            media.forEach((item, index) => {
                setTimeout(() => {
                    this.downloadMedia(item);
                }, index * 500); // Stagger downloads
            });
        } catch (error) {
            console.error('Album download error:', error);
            this.showToast('Download failed', 'error');
        }
    }

    closeGalleryModal() {
        const modal = document.getElementById('galleryModal');
        modal.classList.remove('active');
        this.currentAlbum = null;
        this.currentMedia = [];
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');

        toastMessage.textContent = message;
        toast.classList.add('active');

        setTimeout(() => {
            toast.classList.remove('active');
        }, 3000);
    }

    setFilter(type) {
        this.filterType = type;

        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === type);
        });

        // If modal is open, reload media
        if (this.currentAlbum) {
            this.openAlbum(this.currentAlbum.id);
        }
    }

    setSortOrder(order) {
        this.sortBy = order;
        this.loadAlbums();
    }
}

// Initialize gallery
const gallery = new Gallery();