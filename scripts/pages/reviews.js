class ReviewsPageRenderer {
    constructor() {
        this.currentTab = 'all-reviews';
        this.searchQuery = '';
        this.filterOption = 'all';
        this.sortOption = 'quality';
        this.currentUserId = null;

        this.CLIENT_SIDE_SORT_OPTIONS = [
            'quality', 'underrated', 'trending', 'hidden_gems',
            'highest-voted', 'lowest-voted', 'most-replies', 'least-replies',
            'most-playtime', 'least-playtime', 'highest-rated-user', 'lowest-rated-user',
            'oldest', 'highest_rated', 'lowest_rated', 'game', 'most_visits', 'least_visits'
        ];
    }

    requiresClientSideSort(sort) {
        return this.CLIENT_SIDE_SORT_OPTIONS.includes(sort);
    }

    async init() {
        console.log('[ReviewsPage] Initializing...');

        try {
            const user = await window.roblox.getCurrentUser();
            this.currentUserId = user?.id || null;
        } catch (e) {
            this.currentUserId = null;
        }

        if (!this.currentUserId) {
            const myReviewsTab = document.getElementById('tab-my-reviews');
            if (myReviewsTab) myReviewsTab.style.display = 'none';
        }

        this.setupTabs();
        this.setupControls();
        await this.loadCurrentTab();
    }

    setupTabs() {
        const tabLinks = document.querySelectorAll('.rbx-tab-heading');
        tabLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                this.switchTab(targetId);
            });
        });
    }

    switchTab(tabId) {

        document.querySelectorAll('.rbx-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

        const tabEl = document.querySelector(`[href="#${tabId}"]`)?.parentElement;
        const paneEl = document.getElementById(tabId);
        
        if (tabEl) tabEl.classList.add('active');
        if (paneEl) paneEl.classList.add('active');

        this.currentTab = tabId;
        this.loadCurrentTab();
    }

    setupControls() {
        const searchInput = document.getElementById('reviewSearchInput');
        const searchBtn = document.getElementById('reviewSearchBtn');
        const filterSelect = document.getElementById('browseReviewFilter');
        const sortSelect = document.getElementById('browseReviewSort');

        searchBtn?.addEventListener('click', () => {
            this.searchQuery = searchInput?.value || '';
            this.loadCurrentTab();
        });

        searchInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchQuery = searchInput.value || '';
                this.loadCurrentTab();
            }
        });

        filterSelect?.addEventListener('change', (e) => {
            this.filterOption = e.target.value;
            this.loadCurrentTab();
        });

        sortSelect?.addEventListener('change', (e) => {
            this.sortOption = e.target.value;
            this.loadCurrentTab();
        });
    }

    async loadCurrentTab() {
        if (window.ReviewComponent) {
            window.ReviewComponent.destroy();
        }

        let containerId;
        let options = { browseMode: true };

        switch (this.currentTab) {
            case 'admin-picks':
                containerId = 'adminPicksList';
                options.adminPicksMode = true;
                break;
            case 'my-reviews':
                containerId = 'myReviewsList';
                options.myReviewsMode = true;
                options.myReviewsUserId = this.currentUserId;
                options.sortOption = 'recent';
                break;
            default:
                containerId = 'browseReviewsList';
                options.searchQuery = this.searchQuery;
                options.filterOption = this.filterOption;
                options.sortOption = this.sortOption;
                options.clientSideSort = this.requiresClientSideSort(this.sortOption);
        }

        await window.ReviewComponent.init('browse', containerId, options);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const reviewsPage = new ReviewsPageRenderer();
    window.reviewsPage = reviewsPage;
    reviewsPage.init();
});

