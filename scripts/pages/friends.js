class FriendsPageRenderer {
    constructor() {
        this.currentUserId = null;
        this.profileUserId = null;
        this.isOwnProfile = false;
        this.currentTab = 'friends';
        this.currentPage = 1;
        this.itemsPerPage = 18; 
        this.totalItems = 0;
        this.allData = []; 
        this.fromSeeAll = false;

        this.AVATAR_PLACEHOLDER = '../images/avatar-placeholder.png';

        this.tabConfig = {
            friends: {
                label: 'Friends',
                tooltip: 'Users who have accepted your friend request'
            },
            following: {
                label: 'Following',
                tooltip: 'Users you are following'
            },
            followers: {
                label: 'Followers',
                tooltip: 'Users who are following you'
            },
            requests: {
                label: 'Requests',
                tooltip: 'Pending friend requests'
            }
        };
    }

    async init(userId = null, tab = 'friends') {
        console.log('[FriendsPage] Initializing with userId:', userId, 'tab:', tab);
        
        this.currentTab = tab;

        const urlParams = new URLSearchParams(window.location.search);
        this.fromSeeAll = urlParams.get('fromSeeAll') === '1';

        if (this.fromSeeAll) {
            this.prepareEntranceAnimation();

            urlParams.delete('fromSeeAll');
            const newUrl = urlParams.toString() ? `${window.location.pathname}?${urlParams}` : window.location.pathname;
            window.history.replaceState({}, '', newUrl);
        }
        
        try {

            const api = window.robloxAPI || window.roblox;
            if (!api) throw new Error('API not available');
            
            const currentUser = await api.getCurrentUser();
            if (currentUser) {
                this.currentUserId = currentUser.id;
            }

            this.profileUserId = userId ? parseInt(userId, 10) : this.currentUserId;
            this.isOwnProfile = this.profileUserId === this.currentUserId;
            
            console.log('[FriendsPage] profileUserId:', this.profileUserId, 'currentUserId:', this.currentUserId, 'isOwnProfile:', this.isOwnProfile);

            this.updateStateProperties();

            await this.updatePageTitle();

            this.setupTabs();

            this.setupEventHandlers();

            await this.loadTabData();

            if (this.fromSeeAll) {
                await this.playEntranceAnimation();
            }
            
            console.log('[FriendsPage] Initialization complete');
        } catch (error) {
            console.error('[FriendsPage] Initialization failed:', error);
            this.showError(error.message);

            if (this.fromSeeAll) {
                await this.playEntranceAnimation();
            }
        }
    }

    prepareEntranceAnimation() {
        const pageContent = document.querySelector('.page-content');
        if (pageContent) {
            pageContent.style.opacity = '0';
            pageContent.style.transform = 'translateY(20px)';
        }
    }

    async playEntranceAnimation() {
        const pageContent = document.querySelector('.page-content');
        if (!pageContent) return;

        pageContent.offsetHeight;

        pageContent.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        pageContent.style.opacity = '1';
        pageContent.style.transform = 'translateY(0)';

        await new Promise(resolve => setTimeout(resolve, 400));

        pageContent.style.transition = '';
    }

    updateStateProperties() {
        const stateEl = document.getElementById('state-properties');
        if (stateEl) {
            stateEl.dataset.userid = this.profileUserId || '';
            stateEl.dataset.loggedinuserid = this.currentUserId || '';
        }
    }

    async updatePageTitle() {
        const titleEl = document.getElementById('friends-title');
        if (!titleEl) {
            console.warn('[FriendsPage] friends-title element not found');
            return;
        }
        
        console.log('[FriendsPage] updatePageTitle - isOwnProfile:', this.isOwnProfile, 'profileUserId:', this.profileUserId);
        
        if (this.isOwnProfile) {
            titleEl.textContent = 'My Friends';
            document.title = 'My Friends - ROBLOX';
        } else {

            try {
                const api = window.roblox || window.robloxAPI;

                let userInfo = null;
                if (api?.getUserInfo) {
                    userInfo = await api.getUserInfo(this.profileUserId);
                } else if (api?.getUser) {
                    userInfo = await api.getUser(this.profileUserId);
                }
                
                console.log('[FriendsPage] User info result:', userInfo);
                if (userInfo?.name) {
                    titleEl.textContent = `${userInfo.name}'s Friends`;
                    document.title = `${userInfo.name}'s Friends - ROBLOX`;
                    
                    const stateEl = document.getElementById('state-properties');
                    if (stateEl) stateEl.dataset.username = userInfo.name;
                } else {
                    console.warn('[FriendsPage] userInfo has no name:', userInfo);
                    titleEl.textContent = `User's Friends`;
                }
            } catch (e) {
                console.warn('[FriendsPage] Failed to get username:', e);
                titleEl.textContent = `User's Friends`;
            }
        }
    }

    setupTabs() {
        const tabs = document.querySelectorAll('#horizontal-tabs .rbx-tab');

        const requestsTab = document.getElementById('tab-requests');
        if (requestsTab) {
            requestsTab.style.display = this.isOwnProfile ? '' : 'none';
        }

        tabs.forEach(tab => {
            if (this.isOwnProfile) {
                tab.classList.remove('subtract-item');
            } else {
                tab.classList.add('subtract-item');
            }
        });

        this.setActiveTab(this.currentTab);

        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = tab.dataset.tab;
                if (tabName && tabName !== this.currentTab) {
                    this.switchTab(tabName);
                }
            });
        });
    }

    setActiveTab(tabName) {
        const tabs = document.querySelectorAll('#horizontal-tabs .rbx-tab');
        tabs.forEach(tab => {
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
    }

    async switchTab(tabName) {
        this.currentTab = tabName;
        this.currentPage = 1;
        this.setActiveTab(tabName);

        const url = new URL(window.location);
        url.searchParams.set('tab', tabName);
        window.history.pushState({}, '', url);
        
        await this.loadTabData();
    }

    setupEventHandlers() {

        document.getElementById('prev-page-btn')?.addEventListener('click', () => this.changePage(-1));
        document.getElementById('next-page-btn')?.addEventListener('click', () => this.changePage(1));
        
        document.getElementById('page-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const page = parseInt(e.target.value);
                if (!isNaN(page)) {
                    this.goToPage(page);
                }
            }
        });

        document.getElementById('retry-btn')?.addEventListener('click', () => this.loadTabData());

        const ignoreAllBtn = document.getElementById('ignore-all-btn');
        if (ignoreAllBtn) ignoreAllBtn.style.display = 'none';
    }

    async loadTabData() {
        this.showLoading();
        
        try {
            const api = window.robloxAPI || window.roblox;
            if (!api) throw new Error('API not available');
            
            let result;
            
            switch (this.currentTab) {
                case 'friends':
                    result = await this.loadFriends(api);
                    break;
                case 'following':
                    result = await this.loadFollowing(api);
                    break;
                case 'followers':
                    result = await this.loadFollowers(api);
                    break;
                case 'requests':
                    result = await this.loadFriendRequests(api);
                    break;
            }
            
            if (result) {
                await this.renderResults(result);
            }
        } catch (error) {
            console.error('[FriendsPage] Failed to load data:', error);
            this.showError(error.message);
        }
    }

    async loadFriends(api) {
        if (!api.getFriends) throw new Error('getFriends not available');
        
        const result = await api.getFriends(this.profileUserId);

        return {
            data: result?.data || [],
            total: result?.data?.length || 0,
            type: 'friends'
        };
    }

    async loadFollowing(api) {
        if (!api.getFollowings) throw new Error('getFollowings not available');

        let allData = [];
        let cursor = '';
        
        do {
            const result = await api.getFollowings(this.profileUserId, 100, cursor);
            if (result?.data) {
                allData = allData.concat(result.data);
            }
            cursor = result?.nextPageCursor || '';
        } while (cursor && allData.length < 1000);

        allData.reverse();
        
        return {
            data: allData,
            total: allData.length,
            type: 'following'
        };
    }

    async loadFollowers(api) {
        if (!api.getFollowers) throw new Error('getFollowers not available');

        let allData = [];
        let cursor = '';
        
        do {
            const result = await api.getFollowers(this.profileUserId, 100, cursor);
            if (result?.data) {
                allData = allData.concat(result.data);
            }
            cursor = result?.nextPageCursor || '';
        } while (cursor && allData.length < 1000);

        allData.reverse();
        
        return {
            data: allData,
            total: allData.length,
            type: 'followers'
        };
    }

    async loadFriendRequests(api) {
        if (!api.getFriendRequests) throw new Error('getFriendRequests not available');
        
        const result = await api.getFriendRequests();
        
        return {
            data: result?.data || [],
            total: result?.data?.length || 0,
            type: 'requests'
        };
    }

    async renderResults(result) {
        const container = document.getElementById('friends-container');
        const loadingEl = document.getElementById('friends-loading');
        const emptyEl = document.getElementById('friends-empty');
        const errorEl = document.getElementById('friends-error');

        if (loadingEl) loadingEl.style.display = 'none';
        if (errorEl) errorEl.style.display = 'none';

        this.allData = result.data || [];
        this.totalItems = result.total;

        this.updateSubtitle(result.total, result.type);
        
        if (!this.allData || this.allData.length === 0) {
            if (container) container.innerHTML = '';
            if (emptyEl) {
                const emptyMsg = document.getElementById('empty-message');
                if (emptyMsg) {
                    emptyMsg.textContent = this.getEmptyMessage(result.type);
                }
                emptyEl.style.display = 'block';
            }
            this.updatePagination(0);
            return;
        }
        
        if (emptyEl) emptyEl.style.display = 'none';

        await this.renderCurrentPage(result.type);

        this.updatePagination(result.total);
    }

    async renderCurrentPage(type) {
        const container = document.getElementById('friends-container');
        if (!container) return;

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageData = this.allData.slice(startIndex, endIndex);
        
        if (pageData.length === 0) return;

        const userIds = pageData.map(u => u.id);
        const needsDetails = pageData.some(u => !u.name && !u.displayName);
        const robloxApi = window.roblox || window.robloxAPI;

        const needsPresence = type === 'friends' || type === 'following';
        
        try {
            const [userDetailsResult, presenceResult] = await Promise.all([
                needsDetails && robloxApi?.getUsersByIds ? robloxApi.getUsersByIds(userIds).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
                needsPresence && robloxApi?.getUserPresence ? robloxApi.getUserPresence(userIds).catch(() => ({ userPresences: [] })) : Promise.resolve({ userPresences: [] })
            ]);

            const userDetails = {};
            if (userDetailsResult?.data) {
                userDetailsResult.data.forEach(u => userDetails[u.id] = u);
            }

            const presenceMap = {};
            if (presenceResult?.userPresences) {
                presenceResult.userPresences.forEach(p => presenceMap[p.userId] = p);
            }

            pageData.forEach(user => {
                const details = userDetails[user.id] || {};
                user.name = user.name || details.name || user.displayName || details.displayName;
                user.displayName = user.displayName || details.displayName || user.name || details.name;
                
                const presence = presenceMap[user.id];
                if (presence) {
                    user.isOnline = presence.userPresenceType > 0;
                    user.inGame = presence.userPresenceType === 2;
                    user.inStudio = presence.userPresenceType === 3;
                    user.lastLocation = presence.lastLocation;
                    user.placeId = presence.placeId;
                }
            });
        } catch (e) {
            console.warn('[FriendsPage] Failed to fetch page data:', e);
        }

        container.innerHTML = pageData.map(user => this.renderFriendCard(user, type)).join('');

        this.setupActionButtons();

        this.loadAvatars(pageData);
    }

    updateSubtitle(count, type) {
        const subtitleEl = document.getElementById('friends-subtitle');
        if (!subtitleEl) return;
        
        const config = this.tabConfig[type] || this.tabConfig.friends;
        subtitleEl.textContent = `${config.label} (${count.toLocaleString()})`;
    }

    getEmptyMessage(type) {
        switch (type) {
            case 'friends':
                return this.isOwnProfile ? 'You have no friends yet.' : 'This user has no friends.';
            case 'following':
                return this.isOwnProfile ? 'You are not following anyone.' : 'This user is not following anyone.';
            case 'followers':
                return this.isOwnProfile ? 'You have no followers yet.' : 'This user has no followers.';
            case 'requests':
                return 'No pending friend requests.';
            default:
                return 'No users to display.';
        }
    }

    renderFriendCard(user, type) {
        const userId = user.id;
        const username = user.name || user.displayName || 'Unknown';
        const profileUrl = `profile.html?userId=${userId}`;

        const isOnline = user.isOnline || false;
        const inGame = user.inGame || false;
        const inStudio = user.inStudio || false;
        const lastLocation = user.lastLocation || '';
        const placeId = user.placeId;

        let statusClass = '';
        if (isOnline && !inGame && !inStudio) statusClass = 'online';
        else if (inGame) statusClass = 'game';
        else if (inStudio) statusClass = 'studio';

        let statusIcons = '';
        if (type === 'friends' || type === 'following') {
            if (isOnline && !inGame && !inStudio) {
                statusIcons = `<span class="rbx-icon-online" title="${this.escapeHtml(lastLocation)}"></span>`;
            } else if (inGame && isOnline) {
                const gameUrl = placeId ? `game-detail.html?placeId=${placeId}` : '#';
                statusIcons = `<a href="${gameUrl}"><span class="rbx-icon-game" title="${this.escapeHtml(lastLocation)}"></span></a>`;
            } else if (inStudio && isOnline) {
                statusIcons = `<span class="rbx-icon-studio" title="${this.escapeHtml(lastLocation)}"></span>`;
            }
        }

        let statusText = '';
        if (type !== 'followers' && type !== 'requests') {
            if (isOnline && !inGame && !inStudio) {
                statusText = '<div class="friends-status">Online</div>';
            } else if (inGame && isOnline) {
                const gameUrl = placeId ? `game-detail.html?placeId=${placeId}` : '#';
                statusText = `<a href="${gameUrl}"><div class="friends-status online">Game ${this.escapeHtml(lastLocation)}</div></a>`;
            } else if (inStudio && isOnline) {
                statusText = `<div class="friends-status">${this.escapeHtml(lastLocation.substring(2) || 'In Studio')}</div>`;
            } else {
                statusText = '<div class="friends-status">Offline</div>';
            }
        }
        
        return `
            <div class="friends-container" data-user-id="${userId}">
                <div class="friends-card">
                    <div class="friends-image">
                        ${statusIcons ? `<div class="icon-container">${statusIcons}</div>` : ''}
                        <a href="${profileUrl}">
                            <img class="${statusClass}" src="${this.AVATAR_PLACEHOLDER}" alt="${this.escapeHtml(username)}" data-user-id="${userId}"/>
                        </a>
                    </div>
                    <div class="friends-name no-buttons">
                        <a href="${profileUrl}" title="${this.escapeHtml(username)}">${this.escapeHtml(username)}</a>
                    </div>
                    ${statusText}
                </div>
            </div>
        `;
    }

    setupActionButtons() {

    }

    async acceptFriendRequest(userId, btn) {
        try {
            const api = window.robloxAPI || window.roblox;
            if (!api?.acceptFriendRequest) {
                console.warn('[FriendsPage] acceptFriendRequest not available');
                return;
            }
            
            btn.disabled = true;
            await api.acceptFriendRequest(userId);

            const card = btn.closest('.friends-container');
            const buttonContainer = card?.querySelector('.button-container');
            if (buttonContainer) {
                buttonContainer.innerHTML = '<div class="friends-status success">You are now friends!</div>';
            }
        } catch (error) {
            console.error('[FriendsPage] Failed to accept friend request:', error);
            btn.disabled = false;
        }
    }

    async declineFriendRequest(userId, btn) {
        try {
            const api = window.robloxAPI || window.roblox;
            if (!api?.declineFriendRequest) {
                console.warn('[FriendsPage] declineFriendRequest not available');
                return;
            }
            
            btn.disabled = true;
            await api.declineFriendRequest(userId);

            const card = btn.closest('.friends-container');
            if (card) {
                card.style.opacity = '0.5';
                setTimeout(() => card.remove(), 300);
            }

            this.totalItems--;
            this.updateSubtitle(this.totalItems, 'requests');
        } catch (error) {
            console.error('[FriendsPage] Failed to decline friend request:', error);
            btn.disabled = false;
        }
    }

    async declineAllRequests() {
        try {
            const api = window.robloxAPI || window.roblox;
            if (!api?.declineAllFriendRequests) {
                console.warn('[FriendsPage] declineAllFriendRequests not available');
                return;
            }
            
            const ignoreAllBtn = document.getElementById('ignore-all-btn');
            if (ignoreAllBtn) ignoreAllBtn.disabled = true;
            
            await api.declineAllFriendRequests();

            await this.loadTabData();
        } catch (error) {
            console.error('[FriendsPage] Failed to decline all requests:', error);
            const ignoreAllBtn = document.getElementById('ignore-all-btn');
            if (ignoreAllBtn) ignoreAllBtn.disabled = false;
        }
    }

    async unfollowUser(userId, btn) {
        try {
            const api = window.robloxAPI || window.roblox;
            if (!api?.unfollowUser) {
                console.warn('[FriendsPage] unfollowUser not available');
                return;
            }
            
            btn.disabled = true;
            await api.unfollowUser(userId);

            btn.textContent = 'Follow';
            btn.classList.remove('rbx-btn-control-xs', 'unfollow-btn');
            btn.classList.add('rbx-btn-secondary-xs', 'follow-btn');
            btn.disabled = false;

            btn.onclick = async () => {
                await this.followUser(userId, btn);
            };
        } catch (error) {
            console.error('[FriendsPage] Failed to unfollow user:', error);
            btn.disabled = false;
        }
    }

    async followUser(userId, btn) {
        try {
            const api = window.robloxAPI || window.roblox;
            if (!api?.followUser) {
                console.warn('[FriendsPage] followUser not available');
                return;
            }
            
            btn.disabled = true;
            await api.followUser(userId);

            btn.textContent = 'Unfollow';
            btn.classList.remove('rbx-btn-secondary-xs', 'follow-btn');
            btn.classList.add('rbx-btn-control-xs', 'unfollow-btn');
            btn.disabled = false;

            btn.onclick = async () => {
                await this.unfollowUser(userId, btn);
            };
        } catch (error) {
            console.error('[FriendsPage] Failed to follow user:', error);
            btn.disabled = false;
        }
    }

    async loadAvatars(users) {

        const api = window.roblox || window.robloxAPI;
        if (!api?.getUserThumbnails) {
            console.warn('[FriendsPage] getUserThumbnails not available');
            return;
        }
        
        try {
            const userIds = users.map(u => u.id);
            console.log('[FriendsPage] Loading avatars for userIds:', userIds);
            const result = await api.getUserThumbnails(userIds, '150x150', 'AvatarHeadShot');
            console.log('[FriendsPage] Avatar thumbnails result:', result);
            
            if (result?.data) {
                result.data.forEach(item => {
                    if (item.imageUrl && item.targetId) {
                        const imgs = document.querySelectorAll(`img[data-user-id="${item.targetId}"]`);
                        imgs.forEach(img => {
                            img.src = item.imageUrl;
                        });
                    }
                });
            }
        } catch (e) {
            console.warn('[FriendsPage] Failed to load avatars:', e);
        }
    }

    updatePagination(total) {
        this.totalItems = total;
        const totalPages = Math.ceil(total / this.itemsPerPage);
        
        const pager = document.getElementById('pager');
        const pageInput = document.getElementById('page-input');
        const totalPagesEl = document.getElementById('total-pages');
        
        if (totalPages <= 1) {
            if (pager) pager.style.display = 'none';
            return;
        }
        
        if (pager) pager.style.display = '';
        if (pageInput) pageInput.value = this.currentPage;
        if (totalPagesEl) totalPagesEl.textContent = totalPages;

        const prevBtn = document.getElementById('prev-page-btn');
        const nextBtn = document.getElementById('next-page-btn');
        
        if (prevBtn) {
            prevBtn.style.opacity = this.currentPage <= 1 ? '0.5' : '1';
            prevBtn.style.pointerEvents = this.currentPage <= 1 ? 'none' : 'auto';
        }
        
        if (nextBtn) {
            nextBtn.style.opacity = this.currentPage >= totalPages ? '0.5' : '1';
            nextBtn.style.pointerEvents = this.currentPage >= totalPages ? 'none' : 'auto';
        }
    }

    changePage(delta) {
        const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        const newPage = this.currentPage + delta;
        
        if (newPage >= 1 && newPage <= totalPages) {
            this.goToPage(newPage);
        }
    }

    async goToPage(page) {
        const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;
        
        if (page !== this.currentPage) {
            this.currentPage = page;

            await this.renderCurrentPage(this.currentTab);
            this.updatePagination(this.totalItems);
        }
    }

    showLoading() {
        const loadingEl = document.getElementById('friends-loading');
        const container = document.getElementById('friends-container');
        const emptyEl = document.getElementById('friends-empty');
        const errorEl = document.getElementById('friends-error');
        
        if (loadingEl) loadingEl.style.display = 'block';
        if (container) container.innerHTML = '';
        if (emptyEl) emptyEl.style.display = 'none';
        if (errorEl) errorEl.style.display = 'none';
    }

    showError(message) {
        const loadingEl = document.getElementById('friends-loading');
        const container = document.getElementById('friends-container');
        const emptyEl = document.getElementById('friends-empty');
        const errorEl = document.getElementById('friends-error');
        const errorMsg = document.getElementById('error-message');
        
        if (loadingEl) loadingEl.style.display = 'none';
        if (container) container.innerHTML = '';
        if (emptyEl) emptyEl.style.display = 'none';
        if (errorEl) errorEl.style.display = 'block';
        if (errorMsg) errorMsg.textContent = message || 'An error occurred.';
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

let friendsPageRenderer = null;

function initFriendsPage(userId, tab) {
    friendsPageRenderer = new FriendsPageRenderer();
    friendsPageRenderer.init(userId, tab);
}

window.initFriendsPage = initFriendsPage;
window.FriendsPageRenderer = FriendsPageRenderer;

