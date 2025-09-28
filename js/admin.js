// Admin Panel Module
class AdminPanel {
    constructor() {
        this.currentAlbumId = null;
        this.uploadQueue = [];
        this.isUploading = false;
    }

    async init() {
        // Check authentication
        if (!auth.isAuthenticated()) {
            window.location.href = 'index.html';
            return;
        }

        // Initialize storage
        await storage.init();

        // Load dashboard
        this.loadDashboard();
        this.loadAlbums();

        // Setup event listeners
        this.setupEventListeners();

        // Setup theme
        this.setupTheme();

        // Display admin username
        const session = auth.getSession();
        if (session) {
            document.getElementById('adminUsername').textContent = session.username;
        }
    }

    setupEventListeners() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Navigation
        document.getElementById('viewGalleryBtn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });

        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        // Create album
        document.getElementById('createAlbumForm').addEventListener('submit', (e) => {
            this.createAlbum(e);
        });

        // Upload modal
        document.getElementById('closeUploadBtn').addEventListener('click', () => {
            this.closeUploadModal();
        });

        document.getElementById('uploadOverlay').addEventListener('click', () => {
            this.closeUploadModal();
        });

        // Drop zone
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');

        dropZone.addEventListener('click', () => {
            fileInput.click();
        });

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('active');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('active');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('active');
            this.handleFiles(e.dataTransfer.files);
        });

        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });

        // Confirm dialog
        document.getElementById('confirmCancel').addEventListener('click', () => {
            this.closeConfirmDialog();
        });
    }

    setupTheme() {
        const savedTheme = localStorage.getItem('gallery_theme');
        if (savedTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('gallery_theme', newTheme);
    }

    async loadDashboard() {
        try {
            // Get statistics
            const albums = storage.getAlbums();
            const stats = await storage.getStorageStats();

            // Calculate total downloads
            const allMedia = await storage.getAllMedia();
            const totalDownloads = allMedia.reduce((sum, media) => sum + (media.downloads || 0), 0);

            // Update dashboard
            document.getElementById('totalAlbums').textContent = albums.length;
            document.getElementById('totalMedia').textContent = stats.totalMedia;
            document.getElementById('totalStorage').textContent = stats.formattedSize;
            document.getElementById('totalDownloads').textContent = totalDownloads;
        } catch (error) {
            console.error('Dashboard load error:', error);
        }
    }

    async loadAlbums() {
        const albums = storage.getAlbums();
        const grid = document.getElementById('albumsAdminGrid');
        const emptyState = document.getElementById('emptyState');

        if (albums.length === 0) {
            grid.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        grid.innerHTML = '';

        // Sort by date
        albums.sort((a, b) => b.createdAt - a.createdAt);

        // Render each album
        for (const album of albums) {
            const card = await this.createAlbumAdminCard(album);
            grid.appendChild(card);
        }
    }

    async createAlbumAdminCard(album) {
        const card = document.createElement('div');
        card.className = 'album-admin-card';

        // Get media for preview
        const media = await storage.getAlbumMedia(album.id);

        // Header
        const header = document.createElement('div');
        header.className = 'album-admin-header';

        const title = document.createElement('h3');
        title.className = 'album-admin-title';
        title.textContent = album.name;

        const description = document.createElement('p');
        description.className = 'album-admin-description';
        description.textContent = album.description || 'No description';

        const stats = document.createElement('div');
        stats.className = 'album-admin-stats';

        const mediaStat = document.createElement('div');
        mediaStat.className = 'album-stat';
        mediaStat.innerHTML = `
            <span class="album-stat-value">${album.mediaCount || 0}</span>
            <span class="album-stat-label">Items</span>
        `;

        const viewsStat = document.createElement('div');
        viewsStat.className = 'album-stat';
        viewsStat.innerHTML = `
            <span class="album-stat-value">${album.views || 0}</span>
            <span class="album-stat-label">Views</span>
        `;

        const dateStat = document.createElement('div');
        dateStat.className = 'album-stat';
        dateStat.innerHTML = `
            <span class="album-stat-value">${this.formatDate(album.createdAt)}</span>
            <span class="album-stat-label">Created</span>
        `;

        stats.appendChild(mediaStat);
        stats.appendChild(viewsStat);
        stats.appendChild(dateStat);

        header.appendChild(title);
        header.appendChild(description);
        header.appendChild(stats);

        // Media preview
        const mediaPreview = document.createElement('div');
        mediaPreview.className = 'album-admin-media';

        for (let i = 0; i < 4; i++) {
            const previewItem = document.createElement('div');
            previewItem.className = 'album-media-preview';

            if (media[i]) {
                const img = document.createElement('img');
                img.src = media[i].thumbnail || media[i].data;
                img.alt = media[i].name;
                previewItem.appendChild(img);
            } else {
                const placeholder = document.createElement('div');
                placeholder.className = 'album-media-placeholder';
                placeholder.innerHTML = `
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" opacity="0.2">
                        <rect x="3" y="3" width="18" height="18" rx="2" stroke-width="1"/>
                    </svg>
                `;
                previewItem.appendChild(placeholder);
            }

            mediaPreview.appendChild(previewItem);
        }

        // Actions
        const actions = document.createElement('div');
        actions.className = 'album-admin-actions';

        const uploadBtn = document.createElement('button');
        uploadBtn.className = 'btn btn-primary btn-sm';
        uploadBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke-width="2"/>
                <polyline points="17 8 12 3 7 8" stroke-width="2"/>
                <line x1="12" y1="3" x2="12" y2="15" stroke-width="2"/>
            </svg>
            Upload
        `;
        uploadBtn.onclick = () => this.openUploadModal(album.id, album.name);

        const viewBtn = document.createElement('button');
        viewBtn.className = 'btn btn-secondary btn-sm';
        viewBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke-width="2"/>
                <circle cx="12" cy="12" r="3" stroke-width="2"/>
            </svg>
            View
        `;
        viewBtn.onclick = () => {
            sessionStorage.setItem('openAlbum', album.id);
            window.location.href = 'index.html';
        };

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger btn-sm';
        deleteBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="3 6 5 6 21 6" stroke-width="2"/>
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke-width="2"/>
            </svg>
            Delete
        `;
        deleteBtn.onclick = () => this.confirmDeleteAlbum(album.id, album.name);

        actions.appendChild(uploadBtn);
        actions.appendChild(viewBtn);
        actions.appendChild(deleteBtn);

        card.appendChild(header);
        card.appendChild(mediaPreview);
        card.appendChild(actions);

        return card;
    }

    createAlbum(e) {
        e.preventDefault();

        const name = document.getElementById('albumName').value;
        const description = document.getElementById('albumDescription').value;

        try {
            const album = storage.createAlbum(name, description);
            this.showToast(`Album "${name}" created successfully`);

            // Reset form
            e.target.reset();

            // Reload albums
            this.loadAlbums();
            this.loadDashboard();
        } catch (error) {
            console.error('Create album error:', error);
            this.showToast('Failed to create album', 'error');
        }
    }

    confirmDeleteAlbum(albumId, albumName) {
        const dialog = document.getElementById('confirmDialog');
        const title = document.getElementById('confirmTitle');
        const message = document.getElementById('confirmMessage');
        const okBtn = document.getElementById('confirmOk');

        title.textContent = 'Delete Album';
        message.textContent = `Are you sure you want to delete "${albumName}"? This will also delete all media in the album.`;

        dialog.classList.add('active');

        okBtn.onclick = () => {
            this.deleteAlbum(albumId, albumName);
            this.closeConfirmDialog();
        };
    }

    deleteAlbum(albumId, albumName) {
        try {
            storage.deleteAlbum(albumId);
            this.showToast(`Album "${albumName}" deleted successfully`);
            this.loadAlbums();
            this.loadDashboard();
        } catch (error) {
            console.error('Delete album error:', error);
            this.showToast('Failed to delete album', 'error');
        }
    }

    openUploadModal(albumId, albumName) {
        this.currentAlbumId = albumId;
        const modal = document.getElementById('uploadModal');
        const title = document.getElementById('uploadModalTitle');
        const previewGrid = document.getElementById('previewGrid');

        title.textContent = `Upload to ${albumName}`;
        previewGrid.innerHTML = '';
        this.uploadQueue = [];

        modal.classList.add('active');
    }

    closeUploadModal() {
        const modal = document.getElementById('uploadModal');
        const fileInput = document.getElementById('fileInput');
        const previewGrid = document.getElementById('previewGrid');
        const uploadProgress = document.getElementById('uploadProgress');

        modal.classList.remove('active');
        fileInput.value = '';
        previewGrid.innerHTML = '';
        uploadProgress.style.display = 'none';
        this.uploadQueue = [];
        this.currentAlbumId = null;
    }

    handleFiles(files) {
        const previewGrid = document.getElementById('previewGrid');

        Array.from(files).forEach(file => {
            if (!this.validateFile(file)) return;

            // Add to queue
            const queueItem = {
                file: file,
                id: this.generateId(),
                status: 'pending'
            };
            this.uploadQueue.push(queueItem);

            // Create preview
            const previewItem = this.createPreviewItem(queueItem);
            previewGrid.appendChild(previewItem);
        });

        // Start upload if not already uploading
        if (!this.isUploading && this.uploadQueue.length > 0) {
            this.startUpload();
        }
    }

    validateFile(file) {
        const maxSize = 50 * 1024 * 1024; // 50MB
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'];

        if (file.size > maxSize) {
            this.showToast(`${file.name} exceeds 50MB limit`, 'error');
            return false;
        }

        if (!allowedTypes.includes(file.type)) {
            this.showToast(`${file.name} is not a supported file type`, 'error');
            return false;
        }

        return true;
    }

    createPreviewItem(queueItem) {
        const item = document.createElement('div');
        item.className = 'preview-item';
        item.id = `preview-${queueItem.id}`;

        // Create preview
        if (queueItem.file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(queueItem.file);
            item.appendChild(img);
        } else {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(queueItem.file);
            video.muted = true;
            item.appendChild(video);
        }

        // Remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'preview-remove';
        removeBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <line x1="18" y1="6" x2="6" y2="18" stroke-width="2"/>
                <line x1="6" y1="6" x2="18" y2="18" stroke-width="2"/>
            </svg>
        `;
        removeBtn.onclick = () => this.removeFromQueue(queueItem.id);

        // Status
        const status = document.createElement('div');
        status.className = 'preview-status';
        status.textContent = 'Pending';

        item.appendChild(removeBtn);
        item.appendChild(status);

        return item;
    }

    removeFromQueue(id) {
        const index = this.uploadQueue.findIndex(item => item.id === id);
        if (index !== -1) {
            this.uploadQueue.splice(index, 1);
            const preview = document.getElementById(`preview-${id}`);
            if (preview) preview.remove();
        }
    }

    async startUpload() {
        this.isUploading = true;
        const uploadProgress = document.getElementById('uploadProgress');
        const progressFill = document.getElementById('progressFill');
        const uploadStatus = document.getElementById('uploadStatus');

        uploadProgress.style.display = 'block';

        let completed = 0;
        const total = this.uploadQueue.length;

        for (const queueItem of this.uploadQueue) {
            if (queueItem.status === 'completed') {
                completed++;
                continue;
            }

            try {
                // Update status
                const previewStatus = document.querySelector(`#preview-${queueItem.id} .preview-status`);
                if (previewStatus) previewStatus.textContent = 'Uploading...';

                // Upload file
                await storage.addMedia(this.currentAlbumId, queueItem.file);

                // Mark as completed
                queueItem.status = 'completed';
                if (previewStatus) {
                    previewStatus.textContent = 'Uploaded';
                    previewStatus.style.background = 'rgba(16, 185, 129, 0.9)';
                }

                completed++;
            } catch (error) {
                console.error('Upload error:', error);
                queueItem.status = 'error';
                const previewStatus = document.querySelector(`#preview-${queueItem.id} .preview-status`);
                if (previewStatus) {
                    previewStatus.textContent = 'Error';
                    previewStatus.style.background = 'rgba(239, 68, 68, 0.9)';
                }
            }

            // Update progress
            const progress = (completed / total) * 100;
            progressFill.style.width = `${progress}%`;
            uploadStatus.textContent = `Uploading... ${completed}/${total}`;
        }

        // Complete
        uploadStatus.textContent = `Upload complete! ${completed}/${total} files uploaded`;
        this.isUploading = false;

        // Reload albums
        setTimeout(() => {
            this.loadAlbums();
            this.loadDashboard();
        }, 1000);
    }

    closeConfirmDialog() {
        const dialog = document.getElementById('confirmDialog');
        dialog.classList.remove('active');
    }

    logout() {
        auth.logout();
        window.location.href = 'index.html';
    }

    formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
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
}

// Initialize admin panel when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const adminPanel = new AdminPanel();
    adminPanel.init();
});