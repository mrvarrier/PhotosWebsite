// Storage module using IndexedDB for media files and localStorage for metadata
class Storage {
    constructor() {
        this.dbName = 'GalleryDB';
        this.dbVersion = 1;
        this.db = null;
        this.albumsKey = 'gallery_albums';
        this.mediaStore = 'media';
        this.maxFileSize = 50 * 1024 * 1024; // 50MB max per file
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('IndexedDB error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create media store
                if (!db.objectStoreNames.contains(this.mediaStore)) {
                    const store = db.createObjectStore(this.mediaStore, { keyPath: 'id' });
                    store.createIndex('albumId', 'albumId', { unique: false });
                    store.createIndex('type', 'type', { unique: false });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    // Album Management
    getAlbums() {
        const albumsJson = localStorage.getItem(this.albumsKey);
        if (!albumsJson) return [];

        try {
            return JSON.parse(albumsJson);
        } catch {
            return [];
        }
    }

    getAlbum(albumId) {
        const albums = this.getAlbums();
        return albums.find(album => album.id === albumId);
    }

    createAlbum(name, description = '') {
        const albums = this.getAlbums();

        const newAlbum = {
            id: this.generateId(),
            name: name,
            description: description,
            coverImage: null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            mediaCount: 0,
            views: 0
        };

        albums.push(newAlbum);
        localStorage.setItem(this.albumsKey, JSON.stringify(albums));

        return newAlbum;
    }

    updateAlbum(albumId, updates) {
        const albums = this.getAlbums();
        const index = albums.findIndex(album => album.id === albumId);

        if (index !== -1) {
            albums[index] = {
                ...albums[index],
                ...updates,
                updatedAt: Date.now()
            };
            localStorage.setItem(this.albumsKey, JSON.stringify(albums));
            return albums[index];
        }

        return null;
    }

    deleteAlbum(albumId) {
        const albums = this.getAlbums();
        const filtered = albums.filter(album => album.id !== albumId);
        localStorage.setItem(this.albumsKey, JSON.stringify(filtered));

        // Delete all media in album
        this.deleteAlbumMedia(albumId);
    }

    incrementAlbumViews(albumId) {
        const albums = this.getAlbums();
        const album = albums.find(a => a.id === albumId);
        if (album) {
            album.views = (album.views || 0) + 1;
            localStorage.setItem(this.albumsKey, JSON.stringify(albums));
        }
    }

    // Media Management
    async addMedia(albumId, file) {
        if (file.size > this.maxFileSize) {
            throw new Error(`File size exceeds ${this.maxFileSize / (1024 * 1024)}MB limit`);
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async () => {
                const mediaItem = {
                    id: this.generateId(),
                    albumId: albumId,
                    name: file.name,
                    type: file.type.startsWith('video/') ? 'video' : 'photo',
                    mimeType: file.type,
                    size: file.size,
                    data: reader.result,
                    thumbnail: await this.generateThumbnail(file, reader.result),
                    timestamp: Date.now(),
                    downloads: 0
                };

                const transaction = this.db.transaction([this.mediaStore], 'readwrite');
                const store = transaction.objectStore(this.mediaStore);
                const request = store.add(mediaItem);

                request.onsuccess = () => {
                    // Update album media count
                    this.updateAlbumMediaCount(albumId);
                    resolve(mediaItem);
                };

                request.onerror = () => {
                    reject(request.error);
                };
            };

            reader.onerror = () => {
                reject(reader.error);
            };

            reader.readAsDataURL(file);
        });
    }

    async generateThumbnail(file, dataUrl) {
        if (file.type.startsWith('video/')) {
            return this.generateVideoThumbnail(dataUrl);
        } else if (file.type.startsWith('image/')) {
            return this.generateImageThumbnail(dataUrl);
        }
        return null;
    }

    async generateImageThumbnail(dataUrl) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                const maxSize = 400;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxSize) {
                        height = (height * maxSize) / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width = (width * maxSize) / height;
                        height = maxSize;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.src = dataUrl;
        });
    }

    async generateVideoThumbnail(dataUrl) {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            video.muted = true;
            video.playsInline = true;

            video.onloadeddata = () => {
                video.currentTime = 1; // Seek to 1 second
            };

            video.onseeked = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0);

                const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
                resolve(thumbnail);
            };

            video.onerror = () => {
                resolve(null);
            };

            video.src = dataUrl;
        });
    }

    async getAlbumMedia(albumId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.mediaStore], 'readonly');
            const store = transaction.objectStore(this.mediaStore);
            const index = store.index('albumId');
            const request = index.getAll(albumId);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async getMediaItem(mediaId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.mediaStore], 'readonly');
            const store = transaction.objectStore(this.mediaStore);
            const request = store.get(mediaId);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async deleteMedia(mediaId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.mediaStore], 'readwrite');
            const store = transaction.objectStore(this.mediaStore);
            const request = store.delete(mediaId);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async deleteAlbumMedia(albumId) {
        const media = await this.getAlbumMedia(albumId);
        const transaction = this.db.transaction([this.mediaStore], 'readwrite');
        const store = transaction.objectStore(this.mediaStore);

        media.forEach(item => {
            store.delete(item.id);
        });
    }

    async updateAlbumMediaCount(albumId) {
        const media = await this.getAlbumMedia(albumId);
        const albums = this.getAlbums();
        const album = albums.find(a => a.id === albumId);

        if (album) {
            album.mediaCount = media.length;

            // Set first image as cover if no cover exists
            if (!album.coverImage && media.length > 0) {
                const firstImage = media.find(m => m.type === 'photo');
                if (firstImage) {
                    album.coverImage = firstImage.thumbnail || firstImage.data;
                }
            }

            localStorage.setItem(this.albumsKey, JSON.stringify(albums));
        }
    }

    incrementDownloadCount(mediaId) {
        const transaction = this.db.transaction([this.mediaStore], 'readwrite');
        const store = transaction.objectStore(this.mediaStore);
        const request = store.get(mediaId);

        request.onsuccess = () => {
            const media = request.result;
            if (media) {
                media.downloads = (media.downloads || 0) + 1;
                store.put(media);
            }
        };
    }

    // Search functionality
    async searchMedia(query) {
        const albums = this.getAlbums();
        const results = [];

        // Search in album names
        const matchingAlbums = albums.filter(album =>
            album.name.toLowerCase().includes(query.toLowerCase()) ||
            (album.description && album.description.toLowerCase().includes(query.toLowerCase()))
        );

        for (const album of matchingAlbums) {
            const media = await this.getAlbumMedia(album.id);
            results.push(...media);
        }

        // Search in media names
        const allMedia = await this.getAllMedia();
        const matchingMedia = allMedia.filter(media =>
            media.name.toLowerCase().includes(query.toLowerCase())
        );

        results.push(...matchingMedia);

        // Remove duplicates
        const uniqueResults = results.filter((item, index, self) =>
            index === self.findIndex(m => m.id === item.id)
        );

        return uniqueResults;
    }

    async getAllMedia() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.mediaStore], 'readonly');
            const store = transaction.objectStore(this.mediaStore);
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Utility methods
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    // Storage statistics
    async getStorageStats() {
        const media = await this.getAllMedia();
        const totalSize = media.reduce((sum, item) => sum + item.size, 0);

        return {
            totalMedia: media.length,
            totalSize: totalSize,
            formattedSize: this.formatFileSize(totalSize),
            averageSize: media.length > 0 ? totalSize / media.length : 0
        };
    }
}

// Initialize storage
const storage = new Storage();