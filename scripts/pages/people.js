class PeopleSearchRenderer {
    constructor() {
        this.currentQuery = '';
        this.currentPage = 1;
        this.searchType = 'users'; 
        this.resultsPerPage = 10;
        this.hasMoreResults = false;
        this.isSearching = false;
        
        this.AVATAR_PLACEHOLDER = '../images/avatar-placeholder.png';
        this.GROUP_PLACEHOLDER = '../images/avatar-placeholder.png';
    }

    init() {
        console.log('[PeopleSearch] Initializing...');
        
        this.setupEventListeners();
        this.checkUrlParams();
        
        console.log('[PeopleSearch] Initialization complete');
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

        const tabBtns = document.querySelectorAll('.search-tabs .tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                if (type && type !== this.searchType) {
                    this.switchSearchType(type);
                }
            });
        });

        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        if (prevBtn) prevBtn.addEventListener('click', () => this.prevPage());
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextPage());
    }

    checkUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('q') || urlParams.get('keyword');
        const type = urlParams.get('type');
        
        if (type === 'groups') {
            this.switchSearchType('groups');
        }
        
        if (query) {
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.value = decodeURIComponent(query);
                this.performSearch();
            }
        }
    }

    switchSearchType(type) {
        this.searchType = type;
        this.currentPage = 1;

        const tabBtns = document.querySelectorAll('.search-tabs .tab-btn');
        tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });

        if (this.currentQuery) {
            this.search(this.currentQuery, 1);
        }
    }

    async performSearch() {
        const searchInput = document.getElementById('search-input');
        if (!searchInput) return;
        
        const query = searchInput.value.trim();
        if (!query) {
            this.showError('Please enter a search term.');
            return;
        }
        
        this.currentQuery = query;
        this.currentPage = 1;
        await this.search(query, 1);
    }

    async search(query, page) {
        if (this.isSearching) return;
        this.isSearching = true;
        
        this.showLoading();
        
        try {
            const api = window.roblox || window.robloxAPI;
            if (!api) throw new Error('API not available');
            
            let results = [];
            
            if (this.searchType === 'users') {
                results = await this.searchUsers(api, query, page);
            } else {
                results = await this.searchGroups(api, query, page);
            }
            
            if (results.length === 0) {
                this.showNoResults();
            } else {
                await this.renderResults(results);
                this.showResults();
                this.updatePagination();
            }
        } catch (error) {
            console.error('[PeopleSearch] Search failed:', error);
            this.showError('Search failed. Please try again.');
        } finally {
            this.isSearching = false;
        }
    }

    async searchUsers(api, query, page) {
        let users = [];
        
        if (api.searchUsers) {
            const result = await api.searchUsers(query, this.resultsPerPage);
            users = result?.data || result || [];
            this.hasMoreResults = users.length >= this.resultsPerPage;
        }
        
        return users;
    }

    async searchGroups(api, query, page) {
        let groups = [];
        
        if (api.searchGroups) {
            const result = await api.searchGroups(query, this.resultsPerPage);
            groups = result?.data || result || [];
            this.hasMoreResults = groups.length >= this.resultsPerPage;
        }
        
        return groups;
    }

    async renderResults(results) {
        const grid = document.getElementById('results-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        if (this.searchType === 'users') {
            await this.renderUserResults(grid, results);
        } else {
            await this.renderGroupResults(grid, results);
        }
    }

    async renderUserResults(container, users) {
        const api = window.roblox || window.robloxAPI;

        const userIds = users.map(u => u.id).filter(Boolean);
        let thumbnails = {};
        
        if (userIds.length > 0 && api.getUserThumbnails) {
            try {
                const thumbResult = await api.getUserThumbnails(userIds, '150x150', 'headshot');
                if (thumbResult?.data) {
                    thumbResult.data.forEach(t => {
                        if (t.targetId && t.imageUrl) {
                            thumbnails[t.targetId] = t.imageUrl;
                        }
                    });
                }
            } catch (e) {
                console.warn('[PeopleSearch] Failed to load user thumbnails:', e);
            }
        }

        for (const user of users) {
            const card = this.createUserCard(user, thumbnails[user.id]);
            container.appendChild(card);
        }
    }

    createUserCard(user, thumbnailUrl) {
        const card = document.createElement('div');
        card.className = 'user-card';
        
        const thumb = thumbnailUrl || this.AVATAR_PLACEHOLDER;
        const displayName = user.displayName && user.displayName !== user.name ? user.displayName : '';
        
        card.innerHTML = `
            <a href="profile.html?userId=${user.id}">
                <div class="avatar-container">
                    <img class="avatar" src="${thumb}" alt="${this.escapeHtml(user.name)}" 
                         onerror="this.src='${this.AVATAR_PLACEHOLDER}'"/>
                </div>
                <div class="username">${this.escapeHtml(user.name)}</div>
                ${displayName ? `<div class="display-name">${this.escapeHtml(displayName)}</div>` : ''}
            </a>
        `;
        
        return card;
    }

    async renderGroupResults(container, groups) {
        const api = window.roblox || window.robloxAPI;

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
                console.warn('[PeopleSearch] Failed to load group thumbnails:', e);
            }
        }

        for (const group of groups) {
            const card = this.createGroupCard(group, thumbnails[group.id]);
            container.appendChild(card);
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
                <div class="group-name">${this.escapeHtml(group.name)}</div>
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
            const typeLabel = this.searchType === 'users' ? 'Users' : 'Groups';
            header.textContent = `${typeLabel} matching "${this.currentQuery}"`;
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
            this.search(this.currentQuery, this.currentPage);
        }
    }

    nextPage() {
        if (this.hasMoreResults) {
            this.currentPage++;
            this.search(this.currentQuery, this.currentPage);
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
    const renderer = new PeopleSearchRenderer();
    renderer.init();
    window.peopleSearchRenderer = renderer;
});

window.PeopleSearchRenderer = PeopleSearchRenderer;

