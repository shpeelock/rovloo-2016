class ProfilePageRenderer {
    constructor() {
        this.currentUserId = null;
        this.profileUserId = null;
        this.profileUser = null;
        this.isOwnProfile = false;
        this.currentTab = 'about';

        this.AVATAR_PLACEHOLDER = '../images/avatar-placeholder.png';
        this.GAME_PLACEHOLDER = '../images/game-placeholder.png';
        this.BADGE_PLACEHOLDER = '../images/avatar-placeholder.png'; 

        this.robloxBadges = {
            'Administrator': { name: 'Administrator', description: 'This badge identifies an account as belonging to a ROBLOX administrator.' },
            'Friendship': { name: 'Friendship', description: 'This badge is given to players who have made at least 20 friends.' },
            'Combat Initiation': { name: 'Combat Initiation', description: 'This badge is given to players who have knocked out another player.' },
            'Warrior': { name: 'Warrior', description: 'This badge is given to players who have knocked out 10 enemies.' },
            'Bloxxer': { name: 'Bloxxer', description: 'This badge is given to players who have knocked out 100 enemies.' },
            'Homestead': { name: 'Homestead', description: 'This badge is given to players who have visited their home.' },
            'Bricksmith': { name: 'Bricksmith', description: 'This badge is given to players who have built something in Build mode.' },
            'Veteran': { name: 'Veteran', description: 'This badge is given to players who have been on ROBLOX for at least 1 year.' },
            'Ambassador': { name: 'Ambassador', description: 'This badge is given to players who have invited a friend to ROBLOX.' },
            'Inviter': { name: 'Inviter', description: 'This badge is given to players who have invited a friend to ROBLOX.' },
            'Welcome To The Club': { name: 'Welcome To The Club', description: 'This badge is given to players who have ever had Builders Club.' }
        };
    }

    async init(userId = null) {
        console.log('[ProfilePage] Initializing with userId:', userId);
        
        try {
            const api = window.roblox;
            if (!api) throw new Error('API not available');

            const currentUser = await api.getCurrentUser();
            if (currentUser) {
                this.currentUserId = currentUser.id;
            }

            this.profileUserId = userId || this.currentUserId;
            this.isOwnProfile = this.profileUserId == this.currentUserId;

            this.setupTabs();

            await this.loadProfileData();
            
            console.log('[ProfilePage] Initialization complete');
        } catch (error) {
            console.error('[ProfilePage] Initialization failed:', error);
            this.showError(error.message);
        }
    }

    setupTabs() {
        const tabs = document.querySelectorAll('#profile-tabs .rbx-tab');
        
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

    switchTab(tabName) {
        this.currentTab = tabName;

        const tabs = document.querySelectorAll('#profile-tabs .rbx-tab');
        tabs.forEach(tab => {
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        document.getElementById('tab-about').style.display = tabName === 'about' ? 'block' : 'none';
        document.getElementById('tab-creations').style.display = tabName === 'creations' ? 'block' : 'none';

        if (tabName === 'creations') {
            this.loadCreations();
        }
    }

    async loadProfileData() {
        const api = window.roblox;
        if (!api) {
            console.error('[ProfilePage] API not available');
            return;
        }
        
        console.log('[ProfilePage] Loading profile data for userId:', this.profileUserId);
        
        try {

            await this.loadUserInfo(api);

            await Promise.all([
                this.loadFriendFollowerCounts(api),
                this.loadPresence(api),
                this.loadCurrentlyWearing(api),
                this.loadRobloxBadges(api),
                this.loadPlayerBadges(api),
                this.loadFriendsList(api),
                this.loadCollections(api),
                this.loadGroups(api),
                this.loadStatistics(api)
            ]);

            this.setupActionButtons();
            
            console.log('[ProfilePage] Profile data loaded successfully');
            
        } catch (error) {
            console.error('[ProfilePage] Failed to load profile data:', error);
        }
    }

    async loadUserInfo(api) {
        try {
            let userInfo;
            
            if (api.getUserInfo) {
                userInfo = await api.getUserInfo(this.profileUserId);
            } else if (api.getUser) {
                userInfo = await api.getUser(this.profileUserId);
            }
            
            if (!userInfo) throw new Error('Failed to get user info');
            
            this.profileUser = userInfo;

            const usernameEl = document.getElementById('profile-username');
            if (usernameEl) {
                usernameEl.textContent = userInfo.name || userInfo.displayName || 'Unknown';
            }

            document.title = `${userInfo.name || 'User'}'s Profile - ROBLOX`;

            const descEl = document.getElementById('profile-description');
            const descContainer = document.getElementById('profile-description-container');
            const descToggle = document.getElementById('description-toggle');
            
            if (descEl) {
                if (userInfo.description && userInfo.description.trim()) {
                    descEl.innerHTML = this.formatDescription(userInfo.description);

                    if (descContainer && descToggle) {

                        setTimeout(() => {

                            descContainer.style.maxHeight = 'none';
                            descContainer.style.overflow = 'visible';
                            const scrollHeight = descEl.scrollHeight;
                            const containerHeight = 100; 
                            
                            console.log('[ProfilePage] Description height:', scrollHeight, 'threshold:', containerHeight);
                            
                            if (scrollHeight > containerHeight) {

                                descContainer.style.maxHeight = containerHeight + 'px';
                                descContainer.style.overflow = 'hidden';
                                descEl.style.maxHeight = containerHeight + 'px';
                                descEl.style.overflow = 'hidden';
                                descToggle.style.display = 'block';
                                descToggle.textContent = 'See More';
                                
                                let isCollapsed = true;
                                descToggle.onclick = () => {
                                    console.log('[ProfilePage] See More clicked, isCollapsed:', isCollapsed);
                                    if (isCollapsed) {

                                        descContainer.style.maxHeight = 'none';
                                        descContainer.style.overflow = 'visible';
                                        descEl.style.maxHeight = 'none';
                                        descEl.style.overflow = 'visible';
                                        descToggle.textContent = 'See Less';
                                        isCollapsed = false;
                                    } else {

                                        descContainer.style.maxHeight = containerHeight + 'px';
                                        descContainer.style.overflow = 'hidden';
                                        descEl.style.maxHeight = containerHeight + 'px';
                                        descEl.style.overflow = 'hidden';
                                        descToggle.textContent = 'See More';
                                        isCollapsed = true;
                                    }
                                };
                            } else {

                                descToggle.style.display = 'none';
                            }
                        }, 50);
                    }
                } else {
                    descEl.textContent = 'No description available.';
                    if (descToggle) descToggle.style.display = 'none';
                    if (descContainer) {
                        descContainer.style.maxHeight = 'none';
                        descContainer.style.overflow = 'visible';
                    }
                }
            }

            await this.loadAvatar(api);

            await this.loadMembershipBadge(api);
            
        } catch (error) {
            console.error('[ProfilePage] Failed to load user info:', error);
        }
    }

    async loadAvatar(api) {
        try {
            const avatarEl = document.getElementById('profile-avatar');
            if (!avatarEl) return;
            
            if (api.getUserThumbnails) {
                const result = await api.getUserThumbnails([this.profileUserId], '150x150', 'AvatarHeadShot');
                if (result?.data?.[0]?.imageUrl) {
                    avatarEl.src = result.data[0].imageUrl;
                }
            } else if (api.getUserHeadshots) {
                const result = await api.getUserHeadshots([this.profileUserId], '150x150');
                if (result?.data?.[0]?.imageUrl) {
                    avatarEl.src = result.data[0].imageUrl;
                }
            }
        } catch (error) {
            console.warn('[ProfilePage] Failed to load avatar:', error);
        }
    }

    async loadMembershipBadge(api) {
        const badgeEl = document.getElementById('profile-badge');
        if (!badgeEl) return;

        try {
            if (api.validatePremiumMembership) {
                const hasPremium = await api.validatePremiumMembership(this.profileUserId);
                if (hasPremium) {

                    const randomizeBC = localStorage.getItem('rovloo_randomize_bc') === 'true';

                    let bcType = 'OBC';
                    let bcTitle = 'Outrageous Builders Club';
                    let bcClass = 'rbx-icon-obc';

                    if (randomizeBC) {

                        bcType = this.getBCTypeForUser(this.profileUserId);

                        switch (bcType) {
                            case 'BC':
                                bcClass = 'rbx-icon-bc';
                                bcTitle = 'Builders Club';
                                break;
                            case 'TBC':
                                bcClass = 'rbx-icon-tbc';
                                bcTitle = 'Turbo Builders Club';
                                break;
                            case 'OBC':
                            default:
                                bcClass = 'rbx-icon-obc';
                                bcTitle = 'Outrageous Builders Club';
                                break;
                        }
                    }

                    badgeEl.className = bcClass;
                    badgeEl.title = bcTitle;
                    badgeEl.style.display = 'inline-block';
                }
            }
        } catch (error) {
            console.warn('[ProfilePage] Failed to check premium status:', error);
        }
    }

    getBCTypeForUser(userId) {
        if (!userId) return 'OBC';

        let hash = parseInt(userId, 10);
        if (isNaN(hash)) return 'OBC';

        hash = ((hash >> 16) ^ hash) * 0x45d9f3b;
        hash = ((hash >> 16) ^ hash) * 0x45d9f3b;
        hash = (hash >> 16) ^ hash;

        const bucket = Math.abs(hash) % 3;
        return ['BC', 'TBC', 'OBC'][bucket];
    }

    async loadPresence(api) {
        try {
            const statusEl = document.getElementById('profile-avatar-status');
            if (!statusEl) return;
            
            if (api.getUserPresence || api.getPresence) {
                const presenceMethod = api.getUserPresence || api.getPresence;
                const result = await presenceMethod([this.profileUserId]);
                if (result?.userPresences?.[0]) {
                    const presence = result.userPresences[0];
                    
                    switch (presence.userPresenceType) {
                        case 1: 
                            statusEl.className = 'profile-avatar-status rbx-icon-online';
                            break;
                        case 2: 
                            statusEl.className = 'profile-avatar-status rbx-icon-ingame';
                            break;
                        case 3: 
                            statusEl.className = 'profile-avatar-status rbx-icon-instudio';
                            break;
                        default:
                            statusEl.style.display = 'none';
                    }
                }
            }
        } catch (error) {
            console.warn('[ProfilePage] Failed to load presence:', error);
        }
    }

    async loadCurrentlyWearing(api) {
        const sliderContainer = document.getElementById('accoutrements-slider');
        const avatarImg = document.getElementById('wearing-avatar-image');
        if (!sliderContainer) return;

        try {

            if (avatarImg && api.getUserFullBodyAvatars) {
                const result = await api.getUserFullBodyAvatars([this.profileUserId], '352x352');
                if (result?.data?.[0]?.imageUrl) {
                    avatarImg.src = result.data[0].imageUrl;
                }
            }

            let wearingAssets = [];
            if (api.getCurrentlyWearing) {
                const result = await api.getCurrentlyWearing(this.profileUserId);
                wearingAssets = result?.assetIds || result?.data || result || [];
            }

            console.log('[ProfilePage] Currently wearing assets:', wearingAssets);

            this.wearingAssets = wearingAssets;
            this.wearingPage = 0;
            this.itemsPerPage = 8;

            this.totalWearingPages = Math.max(1, Math.ceil(wearingAssets.length / this.itemsPerPage));

            await this.buildWearingSlider(api);

            this.setupWearingPagination();

        } catch (error) {
            console.warn('[ProfilePage] Failed to load currently wearing:', error);
            sliderContainer.innerHTML = '<ul class="accoutrement-items-container"><li class="accoutrement-item">Failed to load</li></ul>';
        }
    }

    async buildWearingSlider(api) {
        const sliderContainer = document.getElementById('accoutrements-slider');
        if (!sliderContainer) return;

        sliderContainer.style.width = `${this.totalWearingPages * 100}%`;

        let html = '';
        for (let page = 0; page < this.totalWearingPages; page++) {
            const start = page * this.itemsPerPage;
            const pageAssets = this.wearingAssets.slice(start, start + this.itemsPerPage);
            
            html += `<ul class="accoutrement-items-container" style="width: ${100 / this.totalWearingPages}%;">`;

            for (let i = 0; i < this.itemsPerPage; i++) {
                const assetId = pageAssets[i];
                if (assetId) {
                    html += `<li class="accoutrement-item">
                        <a href="item.html?id=${assetId}">
                            <img class="accoutrement-image" src="${this.AVATAR_PLACEHOLDER}" alt="Item" data-asset-id="${assetId}"/>
                        </a>
                    </li>`;
                } else {
                    html += `<li class="accoutrement-item"></li>`;
                }
            }
            
            html += '</ul>';
        }
        
        sliderContainer.innerHTML = html;

        if (this.wearingAssets.length > 0 && api.getAssetThumbnails) {
            try {
                const result = await api.getAssetThumbnails(this.wearingAssets, '150x150');
                if (result?.data) {
                    result.data.forEach(item => {
                        if (item.imageUrl && item.targetId) {
                            const img = sliderContainer.querySelector(`img[data-asset-id="${item.targetId}"]`);
                            if (img) {
                                img.src = item.imageUrl;
                            }
                        }
                    });
                }
            } catch (e) {
                console.warn('[ProfilePage] Failed to load wearing thumbnails:', e);
            }
        }
    }

    setupWearingPagination() {
        const pageContainer = document.getElementById('accoutrements-page');
        if (!pageContainer) return;

        pageContainer.innerHTML = '';
        for (let i = 0; i < this.totalWearingPages; i++) {
            const dot = document.createElement('span');
            dot.className = `profile-accoutrements-page${i === 0 ? ' page-active' : ''}`;
            dot.dataset.page = i;
            dot.onclick = () => {
                this.goToWearingPage(i);
            };
            pageContainer.appendChild(dot);
        }
    }

    goToWearingPage(pageIndex) {
        if (pageIndex < 0 || pageIndex >= this.totalWearingPages) return;
        
        this.wearingPage = pageIndex;

        const slider = document.getElementById('accoutrements-slider');
        if (slider) {
            const offset = -(pageIndex * (100 / this.totalWearingPages));
            slider.style.marginLeft = `${offset}%`;
        }

        this.updateWearingDots();
    }

    updateWearingDots() {
        const dots = document.querySelectorAll('#accoutrements-page .profile-accoutrements-page');
        dots.forEach((dot, i) => {
            dot.classList.toggle('page-active', i === this.wearingPage);
        });
    }

    async loadFriendFollowerCounts(api) {
        try {

            if (api.getFriendsCount) {
                const result = await api.getFriendsCount(this.profileUserId);
                const count = typeof result === 'object' ? (result?.count ?? 0) : (result ?? 0);
                console.log('[ProfilePage] Friends count:', count, 'raw:', result);
                const el = document.getElementById('friends-count');
                if (el) {
                    el.textContent = this.formatNumber(count);
                    el.href = `friends.html?userId=${this.profileUserId}&tab=friends`;
                }
            }

            if (api.getFollowersCount) {
                const result = await api.getFollowersCount(this.profileUserId);
                const count = typeof result === 'object' ? (result?.count ?? 0) : (result ?? 0);
                console.log('[ProfilePage] Followers count:', count, 'raw:', result);
                const el = document.getElementById('followers-count');
                if (el) {
                    el.textContent = this.formatNumber(count);
                    el.href = `friends.html?userId=${this.profileUserId}&tab=followers`;
                }
            }

            if (api.getFollowingCount) {
                const result = await api.getFollowingCount(this.profileUserId);
                const count = typeof result === 'object' ? (result?.count ?? 0) : (result ?? 0);
                console.log('[ProfilePage] Following count:', count, 'raw:', result);
                const el = document.getElementById('following-count');
                if (el) {
                    el.textContent = this.formatNumber(count);
                    el.href = `friends.html?userId=${this.profileUserId}&tab=following`;
                }
            }
        } catch (error) {
            console.warn('[ProfilePage] Failed to load counts:', error);
        }
    }

    async loadRobloxBadges(api) {
        const container = document.getElementById('roblox-badges-container');
        const countEl = document.getElementById('roblox-badges-count');
        const seeMoreBtn = document.getElementById('roblox-badges-see-more');
        if (!container) return;
        
        try {
            let badges = [];
            
            if (api.getRobloxBadges) {
                badges = await api.getRobloxBadges(this.profileUserId);
            }
            
            if (!badges || badges.length === 0) {
                container.innerHTML = '<div class="empty-message">No Roblox badges to display.</div>';
                return;
            }

            if (countEl) {
                countEl.textContent = `(${badges.length})`;
            }

            const visibleCount = 6;
            const hasMore = badges.length > visibleCount;

            let html = badges.map((badge, index) => {
                const isHidden = index >= visibleCount;
                return this.renderRobloxBadge(badge, isHidden);
            }).join('');
            
            container.innerHTML = html;

            if (hasMore && seeMoreBtn) {
                seeMoreBtn.style.display = '';
                let isExpanded = false;
                
                seeMoreBtn.addEventListener('click', () => {
                    isExpanded = !isExpanded;
                    
                    if (isExpanded) {

                        const hiddenBadges = container.querySelectorAll('.badge-item.hidden-badge');
                        hiddenBadges.forEach(badge => {
                            badge.classList.remove('hidden-badge');
                            badge.style.display = '';
                        });

                        container.classList.add('badge-list-more');

                        seeMoreBtn.textContent = 'See Less';
                    } else {

                        const allBadges = container.querySelectorAll('.badge-item');
                        allBadges.forEach((badge, index) => {
                            if (index >= visibleCount) {
                                badge.classList.add('hidden-badge');
                                badge.style.display = 'none';
                            }
                        });

                        container.classList.remove('badge-list-more');

                        seeMoreBtn.textContent = 'See More';
                    }
                });
            }
            
        } catch (error) {
            console.warn('[ProfilePage] Failed to load Roblox badges:', error);
            container.innerHTML = '<div class="empty-message">No Roblox badges to display.</div>';
        }
    }

    renderRobloxBadge(badge, isHidden = false) {
        const name = badge.name || badge.Name || 'Unknown Badge';
        const iconClass = `rbx-icon-${name.toLowerCase().replace(/\s+/g, '-')}`;
        const hiddenClass = isHidden ? ' hidden-badge' : '';
        const hiddenStyle = isHidden ? ' style="display: none;"' : '';
        
        return `
            <div class="asset-item badge-item${hiddenClass}"${hiddenStyle}>
                <span class="${iconClass}" title="${this.escapeHtml(name)}"></span>
                <span class="item-name">${this.escapeHtml(name)}</span>
            </div>
        `;
    }

    async loadPlayerBadges(api) {
        const container = document.getElementById('player-badges-container');
        const countEl = document.getElementById('player-badges-count');
        const seeAllEl = document.getElementById('player-badges-see-all');
        if (!container) return;

        if (seeAllEl) {
            seeAllEl.href = `inventory.html?userId=${this.profileUserId}&category=badges`;
        }
        
        try {
            let badges = [];
            
            if (api.getUserBadges) {
                const result = await api.getUserBadges(this.profileUserId, 10);
                badges = result?.data || [];
            }
            
            if (countEl) {
                countEl.textContent = `(${badges.length})`;
            }
            
            if (!badges || badges.length === 0) {
                container.innerHTML = '<div class="empty-message">No player badges to display.</div>';
                return;
            }
            
            container.innerHTML = badges.map(badge => this.renderPlayerBadge(badge)).join('');

            this.loadBadgeThumbnails(badges);
            
        } catch (error) {
            console.warn('[ProfilePage] Failed to load player badges:', error);
            container.innerHTML = '<div class="empty-message">No player badges to display.</div>';
        }
    }

    renderPlayerBadge(badge) {
        const name = badge.name || badge.Name || 'Unknown Badge';
        const badgeId = badge.id || badge.badgeId;
        
        return `
            <div class="asset-item badge-item" data-badge-id="${badgeId}">
                <a href="#">
                    <img src="${this.BADGE_PLACEHOLDER}" alt="${this.escapeHtml(name)}" data-badge-id="${badgeId}"/>
                    <span class="item-name">${this.escapeHtml(name)}</span>
                </a>
            </div>
        `;
    }

    async loadBadgeThumbnails(badges) {
        const api = window.roblox;
        if (!api?.getBadgeThumbnails) return;
        
        try {
            const badgeIds = badges.map(b => b.id || b.badgeId).filter(Boolean);
            if (badgeIds.length === 0) return;
            
            const result = await api.getBadgeThumbnails(badgeIds, '150x150');
            if (result?.data) {
                result.data.forEach(item => {
                    if (item.imageUrl && item.targetId) {
                        const imgs = document.querySelectorAll(`img[data-badge-id="${item.targetId}"]`);
                        imgs.forEach(img => {
                            img.src = item.imageUrl;
                        });
                    }
                });
            }
        } catch (error) {
            console.warn('[ProfilePage] Failed to load badge thumbnails:', error);
        }
    }

    async loadFriendsList(api) {
        const container = document.getElementById('friends-list-container');
        const countEl = document.getElementById('friends-section-count');
        const seeAllEl = document.getElementById('friends-see-all');
        if (!container) return;
        
        try {
            let friends = [];
            
            if (api.getFriends) {
                const result = await api.getFriends(this.profileUserId);
                friends = result?.data || [];
                console.log('[ProfilePage] Friends data:', friends);
            }
            
            if (countEl) {
                countEl.textContent = `(${friends.length})`;
            }
            
            if (seeAllEl) {
                seeAllEl.href = `friends.html?userId=${this.profileUserId}&tab=friends`;
            }
            
            if (!friends || friends.length === 0) {
                container.innerHTML = '<div class="empty-message">No friends to display.</div>';
                return;
            }

            let presenceMap = {};
            const displayFriends = friends.slice(0, 9);
            const friendIds = displayFriends.map(f => f.id);
            
            const presenceMethod = api.getUserPresence || api.getPresence;
            if (presenceMethod) {
                const presenceResult = await presenceMethod(friendIds);
                if (presenceResult?.userPresences) {
                    presenceResult.userPresences.forEach(p => {
                        presenceMap[p.userId] = p;
                    });
                }
            }

            let userDetailsMap = {};
            const needsDetails = displayFriends.some(f => !f.name && !f.displayName);
            if (needsDetails && api.getUsersByIds) {
                try {
                    const userDetails = await api.getUsersByIds(friendIds);
                    if (userDetails?.data) {
                        userDetails.data.forEach(u => {
                            userDetailsMap[u.id] = u;
                        });
                    }
                } catch (e) {
                    console.warn('[ProfilePage] Failed to fetch user details:', e);
                }
            }

            const enrichedFriends = displayFriends.map(friend => {
                const details = userDetailsMap[friend.id] || {};
                return {
                    ...friend,
                    name: friend.name || details.name || friend.displayName || details.displayName || 'Unknown',
                    displayName: friend.displayName || details.displayName || friend.name || details.name
                };
            });

            container.innerHTML = enrichedFriends.map(friend => this.renderFriendCard(friend, presenceMap[friend.id])).join('');

            this.loadFriendAvatars(enrichedFriends);
            
        } catch (error) {
            console.warn('[ProfilePage] Failed to load friends:', error);
            container.innerHTML = '<div class="empty-message">Failed to load friends.</div>';
        }
    }

    renderFriendCard(friend, presence) {
        let name = friend.name || friend.displayName || 'Unknown';

        if (name.length > 10) {
            name = name.substring(0, 10) + '...';
        }
        const userId = friend.id;
        
        let statusClass = '';
        if (presence) {
            switch (presence.userPresenceType) {
                case 1: statusClass = 'rbx-icon-online'; break;
                case 2: statusClass = 'rbx-icon-ingame'; break;
                case 3: statusClass = 'rbx-icon-instudio'; break;
            }
        }
        
        return `
            <div class="friend" data-user-id="${userId}">
                <div class="friend-link">
                    <a href="profile.html?userId=${userId}">
                        <span class="friend-avatar">
                            <img src="${this.AVATAR_PLACEHOLDER}" alt="${this.escapeHtml(name)}" data-user-id="${userId}"/>
                        </span>
                    </a>
                    ${statusClass ? `<span class="friend-status ${statusClass}"></span>` : ''}
                    <a href="profile.html?userId=${userId}" class="friend-name">${this.escapeHtml(name)}</a>
                </div>
            </div>
        `;
    }

    async loadFriendAvatars(friends) {
        const api = window.roblox;
        if (!api?.getUserThumbnails && !api?.getUserHeadshots) return;
        
        try {
            const userIds = friends.map(f => f.id);
            let result;
            if (api.getUserThumbnails) {
                result = await api.getUserThumbnails(userIds, '150x150', 'AvatarHeadShot');
            } else if (api.getUserHeadshots) {
                result = await api.getUserHeadshots(userIds, '150x150');
            }
            
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
        } catch (error) {
            console.warn('[ProfilePage] Failed to load friend avatars:', error);
        }
    }

    async loadCollections(api) {
        console.log('[ProfilePage] loadCollections called');
        const container = document.getElementById('collections-list');
        const inventoryLink = document.getElementById('collections-inventory-link');
        
        console.log('[ProfilePage] Collections container:', container);
        
        if (!container) {
            console.warn('[ProfilePage] Collections container not found!');
            return;
        }

        if (inventoryLink) {
            inventoryLink.href = `inventory.html?userId=${this.profileUserId}`;
        }
        
        console.log('[ProfilePage] Loading collections for userId:', this.profileUserId);
        
        try {
            let collectibles = [];

            const withTimeout = (promise, ms) => {
                const timeout = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout')), ms)
                );
                return Promise.race([promise, timeout]);
            };

            if (api.getUserCollectibles) {
                try {
                    console.log('[ProfilePage] Calling getUserCollectibles...');
                    const result = await withTimeout(api.getUserCollectibles(this.profileUserId, 10, '', 'Desc'), 5000);
                    collectibles = result?.data || [];
                    console.log('[ProfilePage] getUserCollectibles result:', result);
                } catch (e) {
                    console.warn('[ProfilePage] getUserCollectibles failed:', e.message);
                }
            } else {
                console.warn('[ProfilePage] getUserCollectibles not available');
            }

            if (collectibles.length === 0 && api.getUserInventory) {
                try {
                    console.log('[ProfilePage] Calling getUserInventory...');
                    const result = await withTimeout(api.getUserInventory(this.profileUserId, 8, 10, '', 'Desc'), 5000);
                    collectibles = result?.data || [];
                    console.log('[ProfilePage] getUserInventory result:', result);
                } catch (e) {
                    console.warn('[ProfilePage] getUserInventory failed:', e.message);
                }
            }
            
            console.log('[ProfilePage] Collections loaded:', collectibles.length);
            
            if (!collectibles || collectibles.length === 0) {
                container.innerHTML = '<li class="empty-message">No collectibles to display.</li>';
                return;
            }

            const displayItems = collectibles.slice(0, 6);
            console.log('[ProfilePage] Display items:', displayItems);
            container.innerHTML = displayItems.map(item => this.renderCollectionItem(item)).join('');

            console.log('[ProfilePage] About to call loadCollectionThumbnails');
            await this.loadCollectionThumbnails(displayItems);
            
        } catch (error) {
            console.warn('[ProfilePage] Failed to load collections:', error);
            container.innerHTML = '<li class="empty-message">Unable to load collectibles.</li>';
        }
    }

    renderCollectionItem(item) {
        const name = item.name || item.assetName || 'Unknown Item';
        const assetId = item.assetId || item.id;
        
        return `
            <li class="list-item asset-item collections-item">
                <a href="item.html?id=${assetId}" class="collections-link" title="${this.escapeHtml(name)}">
                    <img src="${this.AVATAR_PLACEHOLDER}" alt="${this.escapeHtml(name)}" data-asset-id="${assetId}"/>
                    <span class="item-name text-overflow">${this.escapeHtml(name)}</span>
                </a>
            </li>
        `;
    }

    async loadCollectionThumbnails(items) {
        console.log('[ProfilePage] loadCollectionThumbnails called with', items?.length, 'items');
        const api = window.roblox;
        console.log('[ProfilePage] api:', api ? 'exists' : 'null', 'getAssetThumbnails:', api?.getAssetThumbnails ? 'exists' : 'null');
        
        if (!api?.getAssetThumbnails) {
            console.warn('[ProfilePage] getAssetThumbnails not available');
            return;
        }
        
        try {
            console.log('[ProfilePage] Collection items for thumbnails:', items);
            const assetIds = items.map(i => i.assetId || i.id).filter(Boolean);
            console.log('[ProfilePage] Asset IDs for thumbnails:', assetIds);
            
            if (assetIds.length === 0) {
                console.warn('[ProfilePage] No asset IDs found for thumbnails');
                return;
            }
            
            const result = await api.getAssetThumbnails(assetIds, '150x150');
            console.log('[ProfilePage] Thumbnail result:', result);
            
            if (result?.data) {
                result.data.forEach(item => {
                    console.log('[ProfilePage] Thumbnail item:', item);
                    if (item.imageUrl && item.targetId) {
                        const imgs = document.querySelectorAll(`#collections-list img[data-asset-id="${item.targetId}"]`);
                        console.log('[ProfilePage] Found imgs for targetId', item.targetId, ':', imgs.length);
                        imgs.forEach(img => {
                            img.src = item.imageUrl;
                        });
                    }
                });
            }
        } catch (error) {
            console.warn('[ProfilePage] Failed to load collection thumbnails:', error);
        }
    }

    async loadGroups(api) {
        const slideshowContainer = document.getElementById('groups-switcher');
        const slidesContainer = slideshowContainer?.querySelector('.slide-items-container');
        if (!slideshowContainer || !slidesContainer) return;
        
        try {
            let groups = [];
            
            if (api.getUserGroups) {
                const result = await api.getUserGroups(this.profileUserId);
                groups = result?.data || result || [];
            }
            
            console.log('[ProfilePage] Groups loaded:', groups.length);
            
            if (!groups || groups.length === 0) {
                slidesContainer.innerHTML = '<li class="rbx-switcher-item profile-slide-item active" style="padding: 40px; text-align: center;">No groups to display.</li>';
                return;
            }

            this.slideshowGroups = groups;
            this.currentGroupSlideIndex = 0;

            slidesContainer.innerHTML = groups.map((group, index) => this.renderGroupSlideItem(group, index)).join('');

            this.setupGroupsSlideshowControls(slideshowContainer);

            this.setupGroupsViewToggle(groups);

            this.loadGroupThumbnails(groups);
            
        } catch (error) {
            console.warn('[ProfilePage] Failed to load groups:', error);
            slidesContainer.innerHTML = '<li class="rbx-switcher-item profile-slide-item active" style="padding: 40px; text-align: center;">Failed to load groups.</li>';
        }
    }

    renderGroupSlideItem(groupData, index) {
        const group = groupData.group || groupData;
        const name = group.name || 'Unknown Group';
        const description = group.description || '';
        const groupId = group.id;
        const memberCount = group.memberCount || 0;
        const role = groupData.role?.name || 'Member';
        const isActive = index === 0 ? 'active' : '';
        
        return `
            <li class="rbx-switcher-item profile-slide-item ${isActive}" data-index="${index}">
                <div class="col-sm-6 profile-slide-item-left">
                    <div class="slide-item-emblem-container">
                        <a href="groups.html?groupId=${groupId}">
                            <img class="group-item-image" src="${this.AVATAR_PLACEHOLDER}" alt="${this.escapeHtml(name)}" data-group-id="${groupId}"/>
                        </a>
                    </div>
                </div>
                <div class="col-sm-6 profile-slide-item-right groups">
                    <div class="slide-item-info">
                        <h2 class="slide-item-name groups">${this.escapeHtml(name)}</h2>
                        <p class="slide-item-description groups">${this.escapeHtml(description)}</p>
                    </div>
                    <div class="slide-item-stats">
                        <ul class="hlist">
                            <li class="list-item">
                                <p class="slide-item-stat-title">Members</p>
                                <p class="slide-item-members-count">${this.formatNumber(memberCount)}</p>
                            </li>
                            <li class="list-item">
                                <p class="slide-item-stat-title">Rank</p>
                                <p class="slide-item-my-rank">${this.escapeHtml(role)}</p>
                            </li>
                        </ul>
                    </div>
                </div>
            </li>
        `;
    }

    setupGroupsSlideshowControls(container) {
        const prevBtn = container.querySelector('.rbx-switcher-control.left');
        const nextBtn = container.querySelector('.rbx-switcher-control.right');
        const slides = container.querySelectorAll('.rbx-switcher-item');
        
        if (!prevBtn || !nextBtn || slides.length === 0) return;

        const updateControls = () => {
            prevBtn.style.visibility = this.currentGroupSlideIndex === 0 ? 'hidden' : 'visible';
            nextBtn.style.visibility = this.currentGroupSlideIndex >= slides.length - 1 ? 'hidden' : 'visible';
        };

        const showSlide = (index) => {
            slides.forEach((slide, i) => {
                if (i === index) {
                    slide.classList.add('active');
                } else {
                    slide.classList.remove('active');
                }
            });
            updateControls();
        };

        showSlide(0);

        prevBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (this.currentGroupSlideIndex > 0) {
                this.currentGroupSlideIndex--;
                showSlide(this.currentGroupSlideIndex);
            }
        });
        
        nextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (this.currentGroupSlideIndex < slides.length - 1) {
                this.currentGroupSlideIndex++;
                showSlide(this.currentGroupSlideIndex);
            }
        });
    }

    setupGroupsViewToggle(groups) {
        const slideshowBtn = document.getElementById('groups-slideshow-btn');
        const gridBtn = document.getElementById('groups-grid-btn');
        const slideshowView = document.getElementById('groups-switcher');
        const gridView = document.getElementById('groups-grid-view');
        const gridList = document.getElementById('groups-grid-list');
        
        if (slideshowBtn) {
            slideshowBtn.addEventListener('click', () => {
                slideshowView.style.display = '';
                gridView.style.display = 'none';
                slideshowBtn.className = 'profile-view-selector rbx-btn-secondary-xs';
                gridBtn.className = 'profile-view-selector rbx-btn-control-xs';
                slideshowBtn.querySelector('span').classList.add('selected');
                gridBtn.querySelector('span').classList.remove('selected');
            });
        }
        
        if (gridBtn) {
            gridBtn.addEventListener('click', () => {
                slideshowView.style.display = 'none';
                gridView.style.display = '';
                slideshowBtn.className = 'profile-view-selector rbx-btn-control-xs';
                gridBtn.className = 'profile-view-selector rbx-btn-secondary-xs';
                slideshowBtn.querySelector('span').classList.remove('selected');
                gridBtn.querySelector('span').classList.add('selected');

                if (gridList && !gridList.dataset.loaded) {
                    gridList.innerHTML = groups.map(g => this.renderGroupGridItem(g)).join('');
                    gridList.dataset.loaded = 'true';

                    this.loadGroupThumbnails(groups);
                }
            });
        }
    }

    renderGroupGridItem(groupData) {
        const group = groupData.group || groupData;
        const name = group.name || 'Unknown Group';
        const groupId = group.id;
        
        const displayName = name.length > 17 ? name.substring(0, 17) + '...' : name;
        
        return `
            <li class="list-item group">
                <a href="groups.html?groupId=${groupId}" class="group-link" title="${this.escapeHtml(name)}">
                    <span class="group-thumb">
                        <img src="${this.AVATAR_PLACEHOLDER}" alt="${this.escapeHtml(name)}" data-group-id="${groupId}"/>
                    </span>
                    <span class="group-name text-overflow">${this.escapeHtml(displayName)}</span>
                </a>
            </li>
        `;
    }

    async loadGroupThumbnails(groups) {
        const api = window.roblox;
        if (!api?.getGroupThumbnails) return;
        
        try {
            const groupIds = groups.map(g => (g.group || g).id).filter(Boolean);
            if (groupIds.length === 0) return;
            
            const result = await api.getGroupThumbnails(groupIds, '150x150');
            if (result?.data) {
                result.data.forEach(item => {
                    if (item.imageUrl && item.targetId) {
                        const imgs = document.querySelectorAll(`img[data-group-id="${item.targetId}"]`);
                        imgs.forEach(img => {
                            img.src = item.imageUrl;
                        });
                    }
                });
            }
        } catch (error) {
            console.warn('[ProfilePage] Failed to load group thumbnails:', error);
        }
    }

    async loadStatistics(api) {
        try {

            const joinDateEl = document.getElementById('stat-join-date');
            if (joinDateEl && this.profileUser?.created) {
                const joinDate = new Date(this.profileUser.created);
                joinDateEl.textContent = joinDate.toLocaleDateString('en-US', { 
                    month: 'numeric', 
                    day: 'numeric', 
                    year: 'numeric' 
                });
            }

            const placeVisitsEl = document.getElementById('stat-place-visits');
            if (placeVisitsEl && api.getUserGames) {
                try {
                    const result = await api.getUserGames(this.profileUserId, 50);
                    const games = result?.data || [];
                    const totalVisits = games.reduce((sum, game) => sum + (game.placeVisits || game.visits || 0), 0);
                    placeVisitsEl.textContent = this.formatNumber(totalVisits);
                } catch (e) {
                    placeVisitsEl.textContent = '0';
                }
            }
            
        } catch (error) {
            console.warn('[ProfilePage] Failed to load statistics:', error);
        }
    }

    async loadCreations() {
        const slideshowContainer = document.getElementById('games-slideshow-container');

        if (slideshowContainer?.dataset.loaded === 'true') return;
        
        try {
            const api = window.roblox;
            if (!api) return;
            
            await this.loadGamesSlideshow(api);
            
        } catch (error) {
            console.warn('[ProfilePage] Failed to load creations:', error);
        }
    }

    async loadGamesSlideshow(api) {
        const container = document.getElementById('games-switcher');
        const slidesContainer = container?.querySelector('.slide-items-container');
        const countEl = document.getElementById('games-count');
        if (!container || !slidesContainer) return;
        
        try {
            let games = [];
            
            if (api.getUserGames) {
                const result = await api.getUserGames(this.profileUserId, 10);
                games = result?.data || [];
            }
            
            container.dataset.loaded = 'true';
            
            if (countEl) {
                countEl.textContent = `(${games.length})`;
            }
            
            if (!games || games.length === 0) {
                slidesContainer.innerHTML = '<li class="empty-slide" style="padding: 40px; text-align: center; color: white;">No games to display.</li>';
                return;
            }

            this.slideshowGames = games;
            this.currentSlideIndex = 0;

            slidesContainer.innerHTML = games.map((game, index) => this.renderGameSlideItem(game, index)).join('');

            this.setupSlideshowControls(container);

            this.loadSlideshowThumbnails(games);
            
        } catch (error) {
            console.warn('[ProfilePage] Failed to load games slideshow:', error);
            slidesContainer.innerHTML = '<li class="empty-slide" style="padding: 40px; text-align: center; color: white;">Failed to load games.</li>';
        }
    }

    renderGameSlideItem(game, index) {
        const name = game.name || 'Unknown Game';
        const description = game.description || 'No description available.';
        const placeId = game.rootPlace?.id || game.rootPlaceId || game.placeId;
        const universeId = game.id || game.universeId;
        const playing = game.playing || 0;
        const visits = game.visits || 0;
        const isActive = index === 0 ? 'active' : '';
        
        return `
            <li class="rbx-switcher-item profile-slide-item ${isActive}" data-index="${index}">
                <div class="col-sm-6 profile-slide-item-left">
                    <div class="slide-item-emblem-container">
                        <a href="game-detail.html?placeId=${placeId}">
                            <img class="game-item-image" src="${this.GAME_PLACEHOLDER}" alt="${this.escapeHtml(name)}" data-universe-id="${universeId}"/>
                        </a>
                    </div>
                </div>
                <div class="col-sm-6 profile-slide-item-right games">
                    <div class="slide-item-info">
                        <h2 class="slide-item-name games">${this.escapeHtml(name)}</h2>
                        <p class="slide-item-description games">${this.escapeHtml(description)}</p>
                    </div>
                    <div class="slide-item-stats">
                        <ul class="hlist">
                            <li class="list-item">
                                <p class="slide-item-stat-title rbx-font-bold">Players Online</p>
                                <p class="slide-item-members-count rbx-font-bold">${this.formatNumber(playing)}</p>
                            </li>
                            <li class="list-item">
                                <p class="slide-item-stat-title rbx-font-bold">Visits</p>
                                <p class="slide-item-my-rank rbx-font-bold games">${this.formatNumber(visits)}</p>
                            </li>
                        </ul>
                    </div>
                </div>
            </li>
        `;
    }

    setupSlideshowControls(container) {
        const prevBtn = container.querySelector('.rbx-switcher-control.left');
        const nextBtn = container.querySelector('.rbx-switcher-control.right');
        const slides = container.querySelectorAll('.rbx-switcher-item');
        
        if (!prevBtn || !nextBtn || slides.length === 0) return;

        const updateControls = () => {
            prevBtn.style.display = this.currentSlideIndex === 0 ? 'none' : 'block';
            nextBtn.style.display = this.currentSlideIndex >= slides.length - 1 ? 'none' : 'block';
        };

        const showSlide = (index) => {
            slides.forEach((slide, i) => {
                if (i === index) {
                    slide.classList.add('active');
                    slide.style.display = 'block';
                } else {
                    slide.classList.remove('active');
                    slide.style.display = 'none';
                }
            });
            updateControls();
        };

        showSlide(0);

        prevBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (this.currentSlideIndex > 0) {
                this.currentSlideIndex--;
                showSlide(this.currentSlideIndex);
            }
        });
        
        nextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (this.currentSlideIndex < slides.length - 1) {
                this.currentSlideIndex++;
                showSlide(this.currentSlideIndex);
            }
        });
    }

    async loadSlideshowThumbnails(games) {
        const api = window.roblox;
        if (!api?.getGameIcons) return;
        
        this.slideshowThumbnailCache = {};
        
        try {
            const universeIds = games.map(g => g.id || g.universeId).filter(Boolean);
            if (universeIds.length === 0) return;
            
            const result = await api.getGameIcons(universeIds, '512x512');
            if (result?.data) {
                result.data.forEach(item => {
                    if (item.imageUrl && item.targetId) {
                        this.slideshowThumbnailCache[item.targetId] = item.imageUrl;
                        const imgs = document.querySelectorAll(`img[data-universe-id="${item.targetId}"]`);
                        imgs.forEach(img => {
                            img.src = item.imageUrl;
                        });
                    }
                });
            }
        } catch (error) {
            console.warn('[ProfilePage] Failed to load game icons:', error);
        }
    }

    setupActionButtons() {
        const actionsEl = document.getElementById('profile-actions');
        if (actionsEl) {
            actionsEl.style.display = 'none';
        }
    }

    async checkFriendshipStatus() {
        const btn = document.getElementById('btn-friend-request');
        if (!btn) return;
        
        try {
            const api = window.roblox;
            if (!api?.getFriendshipStatus) return;
            
            const status = await api.getFriendshipStatus(this.currentUserId, this.profileUserId);
            
            if (status === 'Friends') {
                btn.textContent = 'Unfriend';
                btn.dataset.status = 'friends';
            } else if (status === 'RequestSent') {
                btn.textContent = 'Request Pending';
                btn.disabled = true;
                btn.dataset.status = 'pending';
            } else if (status === 'RequestReceived') {
                btn.textContent = 'Accept Request';
                btn.dataset.status = 'received';
            } else {
                btn.textContent = 'Add Friend';
                btn.dataset.status = 'none';
            }
        } catch (error) {
            console.warn('[ProfilePage] Failed to check friendship status:', error);
        }
    }

    async checkFollowStatus() {
        const btn = document.getElementById('btn-follow');
        if (!btn) return;
        
        try {
            const api = window.roblox;
            if (!api?.isFollowing) return;
            
            const isFollowing = await api.isFollowing(this.profileUserId);
            
            if (isFollowing) {
                btn.textContent = 'Unfollow';
                btn.dataset.following = 'true';
            } else {
                btn.textContent = 'Follow';
                btn.dataset.following = 'false';
            }
        } catch (error) {
            console.warn('[ProfilePage] Failed to check follow status:', error);
        }
    }

    async handleFriendRequest() {
        const btn = document.getElementById('btn-friend-request');
        if (!btn) return;
        
        const api = window.roblox;
        if (!api) return;
        
        btn.disabled = true;
        
        try {
            const status = btn.dataset.status;
            
            if (status === 'friends') {

                if (api.unfriend) {
                    await api.unfriend(this.profileUserId);
                    btn.textContent = 'Add Friend';
                    btn.dataset.status = 'none';
                }
            } else if (status === 'received') {

                if (api.acceptFriendRequest) {
                    await api.acceptFriendRequest(this.profileUserId);
                    btn.textContent = 'Unfriend';
                    btn.dataset.status = 'friends';
                }
            } else {

                if (api.sendFriendRequest) {
                    await api.sendFriendRequest(this.profileUserId);
                    btn.textContent = 'Request Pending';
                    btn.dataset.status = 'pending';
                }
            }
        } catch (error) {
            console.error('[ProfilePage] Friend request action failed:', error);
        } finally {
            btn.disabled = btn.dataset.status === 'pending';
        }
    }

    async handleFollow() {
        const btn = document.getElementById('btn-follow');
        if (!btn) return;
        
        const api = window.roblox;
        if (!api) return;
        
        btn.disabled = true;
        
        try {
            const isFollowing = btn.dataset.following === 'true';
            
            if (isFollowing) {
                if (api.unfollowUser) {
                    await api.unfollowUser(this.profileUserId);
                    btn.textContent = 'Follow';
                    btn.dataset.following = 'false';
                }
            } else {
                if (api.followUser) {
                    await api.followUser(this.profileUserId);
                    btn.textContent = 'Unfollow';
                    btn.dataset.following = 'true';
                }
            }
        } catch (error) {
            console.error('[ProfilePage] Follow action failed:', error);
        } finally {
            btn.disabled = false;
        }
    }

    handleMessage() {

        window.location.href = `messages.html?recipientId=${this.profileUserId}`;
    }

    formatNumber(num) {
        if (num === null || num === undefined) return '0';
        return num.toLocaleString();
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDescription(text) {
        if (!text) return '';

        let escaped = this.escapeHtml(text);

        escaped = escaped.replace(/\n/g, '<br>');

        const urlRegex = /(https?:\/\/[^\s<]+)/g;
        escaped = escaped.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener">$1</a>');
        
        return escaped;
    }

    showError(message) {
        const container = document.querySelector('.profile-container');
        if (container) {
            container.innerHTML = `
                <div class="section error-section">
                    <h2>Error</h2>
                    <p>${this.escapeHtml(message)}</p>
                    <button class="rbx-btn-control-sm" onclick="location.reload()">Retry</button>
                </div>
            `;
        }
    }
}

let profilePageRenderer = null;

function initProfilePage(userId) {
    profilePageRenderer = new ProfilePageRenderer();
    profilePageRenderer.init(userId);
}

window.initProfilePage = initProfilePage;
window.ProfilePageRenderer = ProfilePageRenderer;

