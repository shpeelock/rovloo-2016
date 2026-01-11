class GroupsSearchRenderer {
    constructor() {
        this.currentQuery = '';
        this.currentPage = 1;
        this.resultsPerPage = 12;
        this.hasMoreResults = false;
        this.isSearching = false;
        this.nextCursor = null;
        
        this.GROUP_PLACEHOLDER = '../images/avatar-placeholder.png';
    }

    init() {
        console.log('[GroupsSearch] Initializing...');
        
        this.setupEventListeners();
        this.checkUrlParams();
        
        console.log('[GroupsSearch] Initialization complete');
    }

    setupEventListeners() {

        const searchBtn = document.getElementById('search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.performSearch());
        }

        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch();
                }
            });
            searchInput.focus();
        }

        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        if (prevBtn) prevBtn.addEventListener('click', () => this.prevPage());
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextPage());
    }

    checkUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('keyword') || urlParams.get('q');
        
        if (query) {
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.value = decodeURIComponent(query);
                this.performSearch();
            }
        }
    }

    async performSearch() {
        const searchInput = document.getElementById('search-input');
        if (!searchInput) return;
        
        const query = searchInput.value.trim();
        if (!query) {
            this.showError('Please enter a group name to search.');
            return;
        }
        
        this.currentQuery = query;
        this.currentPage = 1;
        this.nextCursor = null;
        await this.search(query);
    }

    async search(query) {
        if (this.isSearching) return;
        this.isSearching = true;
        
        this.showLoading();
        
        try {
            const api = window.robloxAPI || window.roblox;
            if (!api) throw new Error('API not available');
            
            let groups = [];
            
            if (api.searchGroups) {
                const result = await api.searchGroups(query, this.resultsPerPage, this.nextCursor);
                groups = result?.data || result || [];
                this.nextCursor = result?.nextPageCursor || null;
                this.hasMoreResults = groups.length >= this.resultsPerPage || !!this.nextCursor;
            }
            
            if (groups.length === 0) {
                this.showNoResults();
            } else {
                await this.renderResults(groups);
                this.showResults();
                this.updatePagination();
            }
        } catch (error) {
            console.error('[GroupsSearch] Search failed:', error);
            this.showError('Search failed. Please try again.');
        } finally {
            this.isSearching = false;
        }
    }

    async renderResults(groups) {
        const grid = document.getElementById('results-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        const api = window.robloxAPI || window.roblox;

        const groupIds = groups.map(g => g.id).filter(Boolean);
        let thumbnails = {};
        
        if (groupIds.length > 0 && api.getGroupThumbnails) {
            try {
                const thumbResult = await api.getGroupThumbnails(groupIds, '150x150');
                if (thumbResult?.data) {
                    thumbResult.data.forEach(t => {
                        if (t.targetId && t.imageUrl) {
                            thumbnails[t.targetId] = t.imageUrl;
                        }
                    });
                }
            } catch (e) {
                console.warn('[GroupsSearch] Failed to load group thumbnails:', e);
            }
        }

        for (const group of groups) {
            const card = this.createGroupCard(group, thumbnails[group.id]);
            grid.appendChild(card);
        }
    }

    createGroupCard(group, thumbnailUrl) {
        const card = document.createElement('div');
        card.className = 'group-card';
        
        const thumb = thumbnailUrl || this.GROUP_PLACEHOLDER;
        
        card.innerHTML = `
            <a href="groups.html?groupId=${group.id}">
                <img class="group-icon" src="${thumb}" alt="${this.escapeHtml(group.name)}" 
                     onerror="this.src='${this.GROUP_PLACEHOLDER}'"/>
                <div class="group-name" title="${this.escapeHtml(group.name)}">${this.escapeHtml(group.name)}</div>
                <div class="group-members">${this.formatNumber(group.memberCount || 0)} members</div>
            </a>
        `;
        
        return card;
    }

    showLoading() {
        this.hideAll();
        const el = document.getElementById('search-loading');
        if (el) el.style.display = 'block';
    }

    showResults() {
        this.hideAll();
        const el = document.getElementById('search-results-container');
        if (el) el.style.display = 'block';
        
        const header = document.getElementById('results-header');
        if (header) {
            header.textContent = `Groups matching "${this.currentQuery}"`;
        }
    }

    showNoResults() {
        this.hideAll();
        const el = document.getElementById('search-no-results');
        if (el) el.style.display = 'block';
    }

    showError(message) {
        this.hideAll();
        const el = document.getElementById('search-no-results');
        if (el) {
            el.innerHTML = `<p style="font-size: 16px; color: #c00;">${this.escapeHtml(message)}</p>`;
            el.style.display = 'block';
        }
    }

    hideAll() {
        const ids = ['search-initial', 'search-loading', 'search-results-container', 'search-no-results'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
    }

    updatePagination() {
        const pageInfo = document.getElementById('page-info');
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        
        if (pageInfo) pageInfo.textContent = `Page ${this.currentPage}`;
        if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
        if (nextBtn) nextBtn.disabled = !this.hasMoreResults;
    }

    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.nextCursor = null; 
            this.search(this.currentQuery);
        }
    }

    nextPage() {
        if (this.hasMoreResults) {
            this.currentPage++;
            this.search(this.currentQuery);
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const renderer = new GroupsSearchRenderer();
    renderer.init();
    window.groupsSearchRenderer = renderer;
});

window.GroupsSearchRenderer = GroupsSearchRenderer;

