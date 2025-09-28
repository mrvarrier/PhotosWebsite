// Main application module
class App {
    constructor() {
        this.initialized = false;
    }

    async init() {
        try {
            // Show loading
            this.showLoading(true);

            // Initialize storage
            await storage.init();

            // Initialize gallery
            await gallery.init();

            // Setup event listeners
            this.setupEventListeners();

            // Setup theme
            this.setupTheme();

            // Hide loading
            this.showLoading(false);

            this.initialized = true;
        } catch (error) {
            console.error('Initialization error:', error);
            this.showToast('Failed to initialize app', 'error');
            this.showLoading(false);
        }
    }

    setupEventListeners() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Search
        document.getElementById('searchBtn').addEventListener('click', () => {
            this.toggleSearch();
        });

        document.getElementById('searchClose').addEventListener('click', () => {
            this.closeSearch();
        });

        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        // Admin
        document.getElementById('adminBtn').addEventListener('click', () => {
            this.openAdminModal();
        });

        document.getElementById('closeAdminBtn').addEventListener('click', () => {
            this.closeAdminModal();
        });

        document.getElementById('adminOverlay').addEventListener('click', () => {
            this.closeAdminModal();
        });

        document.getElementById('adminForm').addEventListener('submit', (e) => {
            this.handleAdminLogin(e);
        });

        // Gallery modal
        document.getElementById('closeModalBtn').addEventListener('click', () => {
            gallery.closeGalleryModal();
        });

        document.getElementById('modalOverlay').addEventListener('click', () => {
            gallery.closeGalleryModal();
        });

        document.getElementById('downloadAllBtn').addEventListener('click', () => {
            gallery.downloadAlbum();
        });

        // Navigation filters
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                gallery.setFilter(btn.dataset.filter);
            });
        });

        // Sort
        document.getElementById('sortSelect').addEventListener('change', (e) => {
            gallery.setSortOrder(e.target.value);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === '/' && e.ctrlKey) {
                e.preventDefault();
                this.toggleSearch();
            }
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

    toggleSearch() {
        const searchBar = document.getElementById('searchBar');
        searchBar.classList.toggle('active');

        if (searchBar.classList.contains('active')) {
            document.getElementById('searchInput').focus();
        }
    }

    closeSearch() {
        const searchBar = document.getElementById('searchBar');
        const searchInput = document.getElementById('searchInput');
        searchBar.classList.remove('active');
        searchInput.value = '';
        gallery.loadAlbums();
    }

    async handleSearch(query) {
        if (query.length < 2) {
            gallery.loadAlbums();
            return;
        }

        try {
            const results = await storage.searchMedia(query);

            // Group results by album
            const albumGroups = {};
            results.forEach(media => {
                if (!albumGroups[media.albumId]) {
                    albumGroups[media.albumId] = [];
                }
                albumGroups[media.albumId].push(media);
            });

            // Display search results
            const grid = document.getElementById('albumsGrid');
            grid.innerHTML = '';

            if (Object.keys(albumGroups).length === 0) {
                const emptyState = document.getElementById('emptyState');
                emptyState.style.display = 'block';
                return;
            }

            Object.entries(albumGroups).forEach(([albumId, media]) => {
                const album = storage.getAlbum(albumId);
                if (album) {
                    const card = gallery.createAlbumCard({
                        ...album,
                        mediaCount: media.length
                    });
                    grid.appendChild(card);
                }
            });
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    openAdminModal() {
        if (auth.isAuthenticated()) {
            // Already authenticated, go to admin panel
            window.location.href = 'admin.html';
        } else {
            // Show login modal
            const modal = document.getElementById('adminModal');
            modal.classList.add('active');
        }
    }

    closeAdminModal() {
        const modal = document.getElementById('adminModal');
        const form = document.getElementById('adminForm');
        const error = document.getElementById('loginError');

        modal.classList.remove('active');
        form.reset();
        error.style.display = 'none';
    }

    async handleAdminLogin(e) {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorElement = document.getElementById('loginError');

        try {
            const result = await auth.authenticate(username, password);

            if (result.success) {
                window.location.href = 'admin.html';
            } else {
                errorElement.textContent = result.error;
                errorElement.style.display = 'block';
            }
        } catch (error) {
            console.error('Login error:', error);
            errorElement.textContent = 'Login failed. Please try again.';
            errorElement.style.display = 'block';
        }
    }

    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        spinner.classList.toggle('active', show);
    }

    showToast(message, type = 'success') {
        gallery.showToast(message, type);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});