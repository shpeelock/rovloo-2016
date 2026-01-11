class HomePageRenderer {
    constructor() {
        this.currentUser = null;
        this.friends = [];
        this.recentGames = [];
        this.favoriteGames = [];
        this.recommendedGames = [];
        this.thumbnailLoader = null;
        this.originalContent = null;

        this.rovlooUniverseIds = new Set();

        this.expandedViewState = {
            type: null,
            isLoading: false,
            hasMoreGames: true,
            currentPage: 1,
            loadedGameIds: new Set(),
            observer: null
        };

        this.AVATAR_PLACEHOLDER = 'images/avatar-placeholder.png';
        this.GAME_PLACEHOLDER = 'images/game-placeholder.png';

        this.MAX_RETRIES = 3;
        this.RETRY_DELAY = 1000; 

        this.MAX_FRIENDS_CACHED = 20;
        this.MAX_GAMES_CACHED = 12;
    }

    clearCache() {
        this.friends = [];
        this.recentGames = [];
        this.favoriteGames = [];
        this.recommendedGames = [];
        this.expandedViewState.loadedGameIds.clear();
        this.originalContent = null;
        if (this.thumbnailLoader) {
            this.thumbnailLoader.clearPending();
        }
        console.log('[HomePageRenderer] Cache cleared');
    }

    async init() {
        console.log('[HomePageRenderer] Initializing...');

        if (window.ThumbnailLoader) {
            this.thumbnailLoader = new window.ThumbnailLoader();
        }

        this.showFriendsLoadingState();

        try {

            const isLoggedIn = await this.checkLoginStatus();
            
            if (isLoggedIn) {

                await this.loadUserHeader();

                await Promise.all([
                    this.loadFriends(),
                    this.loadRecentGames(),
                    this.loadFavoriteGames(),
                    this.loadRecommendedGames()
                ]);
            } else {

                this.showLoggedOutState();
            }
            
            console.log('[HomePageRenderer] Initialization complete');
        } catch (error) {
            console.error('[HomePageRenderer] Initialization failed:', error);
            this.showError('Failed to load home page data');
        }
    }

    showFriendsLoadingState() {
        const friendsContainer = document.querySelector('.friends-carousel');
        if (friendsContainer) {
            friendsContainer.innerHTML = `
                <div class="friends-loading">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">Loading friends...</div>
                </div>
            `;
        }
    }

    showLoadingState() {

        const friendsContainer = document.querySelector('.friends-carousel');
        if (friendsContainer) {
            friendsContainer.innerHTML = this.createFriendSkeletons(8);
        }

        const gamesContainer = document.querySelector('.recently-played-section .games-grid');
        if (gamesContainer) {
            gamesContainer.innerHTML = this.createGameSkeletons(6);
        }
    }

    createFriendSkeletons(count) {
        let html = '';
        for (let i = 0; i < count; i++) {
            html += `
                <div class="friend-card skeleton-card">
                    <div class="skeleton skeleton-avatar"></div>
                    <div class="skeleton skeleton-text skeleton-text-medium"></div>
                </div>
            `;
        }
        return html;
    }

    createGameSkeletons(count) {
        let html = '';
        for (let i = 0; i < count; i++) {
            html += `
                <div class="game-card skeleton-card">
                    <div class="game-card-container">
                        <div class="skeleton skeleton-game-thumb"></div>
                        <div class="skeleton skeleton-text skeleton-text-medium"></div>
                        <div class="skeleton skeleton-text skeleton-text-short"></div>
                    </div>
                </div>
            `;
        }
        return html;
    }

    async retryWithBackoff(fn, retries = this.MAX_RETRIES) {
        for (let i = 0; i < retries; i++) {
            try {
                return await fn();
            } catch (error) {
                if (i === retries - 1) throw error;

                if (error.status === 429) {
                    const delay = this.RETRY_DELAY * Math.pow(2, i);
                    console.log(`[HomePageRenderer] Rate limited, retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    throw error;
                }
            }
        }
    }

    async checkLoginStatus() {
        try {
            const api = window.robloxAPI || window.RobloxClient?.api;
            if (!api) return false;
            
            if (api.isAuthenticated) {
                return await api.isAuthenticated();
            }

            const user = await api.getCurrentUser();
            return !!(user && user.id);
        } catch (error) {
            console.log('[HomePageRenderer] Login check failed:', error);
            return false;
        }
    }

    async loadUserHeader() {
        console.log('[HomePageRenderer] Loading user header...');
        
        try {
            const api = window.robloxAPI || window.RobloxClient?.api;
            if (!api) {
                console.log('[HomePageRenderer] API not available, keeping static user header');
                return;
            }

            this.currentUser = await api.getCurrentUser();
            if (!this.currentUser || !this.currentUser.id) {
                throw new Error('Failed to get current user');
            }

            this.updateUsernameDisplay(this.currentUser.name || this.currentUser.displayName);

            await this.loadUserAvatar(this.currentUser.id);

            await this.loadMembershipBadge(this.currentUser.id);

            console.log('[HomePageRenderer] User header loaded successfully');
        } catch (error) {
            console.error('[HomePageRenderer] Failed to load user header:', error);

            console.log('[HomePageRenderer] Keeping static user header due to error');
        }
    }

    updateUsernameDisplay(username) {
        const usernameEl = document.getElementById('username');
        if (usernameEl) {
            usernameEl.textContent = username;
        }
    }

    async loadUserAvatar(userId) {
        const avatarEl = document.querySelector('.user-avatar-circle');
        if (!avatarEl) return;

        try {
            const api = window.robloxAPI || window.RobloxClient?.api;
            if (!api || !api.getUserHeadshots) {
                console.warn('[HomePageRenderer] getUserHeadshots not available');
                return;
            }

            const result = await api.getUserHeadshots([userId], '150x150');
            
            if (result?.data && result.data[0]?.imageUrl) {

                avatarEl.src = result.data[0].imageUrl;
                avatarEl.alt = `${this.currentUser?.name || 'User'} Avatar`;
            }

        } catch (error) {
            console.error('[HomePageRenderer] Failed to load user avatar:', error);

        }
    }

    async loadMembershipBadge(userId) {
        const badgeEl = document.querySelector('.bc-badge');
        if (!badgeEl) return;

        try {
            const api = window.robloxAPI || window.RobloxClient?.api;
            if (!api || !api.validatePremiumMembership) {

                badgeEl.style.display = 'none';
                return;
            }

            const hasPremium = await api.validatePremiumMembership(userId);

            if (hasPremium) {

                const randomizeBC = localStorage.getItem('rovloo_randomize_bc') === 'true';

                let bcType = 'OBC';
                let bcTitle = 'Outrageous Builders Club';
                let bcClass = 'bc-badge obc-on';

                if (randomizeBC) {

                    bcType = this.getBCTypeForUser(userId);

                    switch (bcType) {
                        case 'BC':
                            bcClass = 'bc-badge bc-on';
                            bcTitle = 'Builders Club';
                            break;
                        case 'TBC':
                            bcClass = 'bc-badge tbc-on';
                            bcTitle = 'Turbo Builders Club';
                            break;
                        case 'OBC':
                        default:
                            bcClass = 'bc-badge obc-on';
                            bcTitle = 'Outrageous Builders Club';
                            break;
                    }
                }

                badgeEl.className = bcClass;
                badgeEl.title = bcTitle;
                badgeEl.style.display = '';
            } else {

                badgeEl.style.display = 'none';
            }
        } catch (error) {
            console.log('[HomePageRenderer] Premium check failed:', error);

            badgeEl.style.display = 'none';
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

    async loadFriends() {
        console.log('[HomePageRenderer] Loading friends...');
        
        try {
            const api = window.robloxAPI;
            
            if (!api || !this.currentUser) {
                console.log('[HomePageRenderer] API not available or not logged in');
                this.showFriendsNotLoggedIn();
                return;
            }

            const friendsData = await api.getFriends(this.currentUser.id);
            
            if (!friendsData?.data || friendsData.data.length === 0) {
                console.log('[HomePageRenderer] No friends data');
                this.showNoFriends();
                return;
            }

            this.friends = friendsData.data;

            const shuffledFriends = [...this.friends].sort(() => Math.random() - 0.5);
            const displayFriends = shuffledFriends.slice(0, 9);
            const friendIds = displayFriends.map(f => f.id);

            let userDetails = {};
            try {
                if (api.getUsersByIds) {
                    const usersResult = await api.getUsersByIds(friendIds);
                    if (usersResult?.data) {
                        usersResult.data.forEach(user => {
                            userDetails[user.id] = user;
                        });
                    }
                } else if (api.getUser) {

                    const userPromises = friendIds.map(id => 
                        api.getUser(id).catch(() => null)
                    );
                    const users = await Promise.all(userPromises);
                    users.forEach(user => {
                        if (user && user.id) {
                            userDetails[user.id] = user;
                        }
                    });
                }
            } catch (error) {
                console.warn('[HomePageRenderer] User details fetch failed:', error);
            }

            this.updateFriendCount(this.friends.length);

            let presenceMap = {};
            try {
                const presenceData = await api.getPresence(friendIds);
                if (presenceData?.userPresences) {
                    presenceData.userPresences.forEach(p => {
                        presenceMap[p.userId] = p;
                    });
                }
            } catch (error) {
                console.warn('[HomePageRenderer] getPresence failed:', error);
            }

            this.renderFriendsListDynamic(displayFriends, userDetails, presenceMap);
            this.setupFriendsSeeAll();

            console.log('[HomePageRenderer] Friends loaded successfully');
        } catch (error) {
            console.error('[HomePageRenderer] Failed to load friends:', error);
            this.showFriendsError();
        }
    }

    updateFriendCount(count) {
        const headerEl = document.querySelector('.friends-section')?.previousElementSibling?.querySelector('h2');
        if (headerEl) {
            headerEl.textContent = `Friends (${count})`;
        }
    }

    async renderFriendsListDynamic(friends, userDetails, presenceMap) {
        const container = document.querySelector('.friends-carousel');
        if (!container) return;

        container.innerHTML = '';

        const shuffledFriends = [...friends].sort(() => Math.random() - 0.5);
        const displayFriends = shuffledFriends.slice(0, 9);

        for (const friend of displayFriends) {

            const user = userDetails[friend.id] || {};
            const friendName = user.name || user.displayName || friend.name || friend.displayName || `User${friend.id}`;
            const presence = presenceMap[friend.id] || { userPresenceType: 0 };
            
            const card = this.renderFriendCardWithName(friend, friendName, presence);
            container.appendChild(card);
        }

        if (this.thumbnailLoader) {
            const avatarImages = container.querySelectorAll('.friend-avatar');
            avatarImages.forEach((img, index) => {
                const friend = displayFriends[index];
                if (friend) {
                    this.thumbnailLoader.queueUserAvatar(friend.id, img);
                }
            });
        }
    }

    renderFriendCardWithName(friend, friendName, presence) {
        const card = document.createElement('div');
        card.className = 'friend-card';
        card.dataset.userId = friend.id;

        const presenceClass = this.getPresenceClass(presence.userPresenceType);
        const displayName = this.truncateText(friendName, 12);

        const avatarImg = document.createElement('img');
        avatarImg.src = this.AVATAR_PLACEHOLDER;
        avatarImg.className = 'friend-avatar';
        avatarImg.alt = friendName;
        avatarImg.dataset.userId = friend.id;
        card.appendChild(avatarImg);

        if (presenceClass) {
            const statusBadge = document.createElement('span');
            statusBadge.className = `friend-status-badge ${presenceClass}`;
            card.appendChild(statusBadge);
        }

        const nameLink = document.createElement('a');
        nameLink.href = `#profile?userId=${friend.id}`;
        nameLink.className = 'friend-name';
        nameLink.title = friendName;
        nameLink.textContent = displayName;
        card.appendChild(nameLink);

        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('friend-name')) {
                this.navigateToProfile(friend.id);
            }
        });

        return card;
    }

    escapeHtml(text) {
        if (!text) return '';
        return text.replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;')
                  .replace(/'/g, '&#39;');
    }

    renderFriendCard(friend, presence) {
        const card = document.createElement('div');
        card.className = 'friend-card';
        card.dataset.userId = friend.id;

        const presenceClass = this.getPresenceClass(presence.userPresenceType);

        const friendName = friend.name || friend.displayName || friend.username || 
                          friend.Name || friend.DisplayName || friend.Username ||
                          `User${friend.id}`;
        
        console.log(`[HomePageRenderer] Friend ${friend.id} name: "${friendName}" (from: name="${friend.name}", displayName="${friend.displayName}", username="${friend.username}")`);
        
        const displayName = this.truncateText(friendName, 12);

        const avatarImg = document.createElement('img');
        avatarImg.src = this.AVATAR_PLACEHOLDER;
        avatarImg.className = 'friend-avatar';
        avatarImg.alt = friendName;
        avatarImg.dataset.userId = friend.id;
        card.appendChild(avatarImg);

        if (presenceClass) {
            const statusBadge = document.createElement('span');
            statusBadge.className = `friend-status-badge ${presenceClass}`;
            card.appendChild(statusBadge);
        }

        const nameLink = document.createElement('a');
        nameLink.href = `#profile?userId=${friend.id}`;
        nameLink.className = 'friend-name';
        nameLink.title = friendName;
        nameLink.textContent = displayName; 
        card.appendChild(nameLink);

        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('friend-name')) {
                this.navigateToProfile(friend.id);
            }
        });

        return card;
    }

    getPresenceClass(presenceType) {
        switch (presenceType) {
            case 1: return 'icon-online';      
            case 2: return 'icon-game';        
            case 3: return 'icon-studio';      
            default: return '';                 
        }
    }

    setupFriendsSeeAll() {
        const seeAllBtn = document.querySelector('.friends-section')?.previousElementSibling?.querySelector('.btn-more');
        if (seeAllBtn) {
            seeAllBtn.href = 'pages/friends.html';
            seeAllBtn.addEventListener('click', async (e) => {
                e.preventDefault();

                const mainContent = document.querySelector('.home-main-content');
                if (mainContent) {
                    await this.animateCollapse(mainContent);
                }

                window.location.href = 'pages/friends.html?fromSeeAll=1';
            });
        }
    }

    showFriendsNotLoggedIn() {
        const container = document.querySelector('.friends-carousel');
        if (container) {
            container.innerHTML = `
                <div class="friends-message">
                    <div class="message-text">Please log in to see your friends</div>
                </div>
            `;
        }
    }

    showNoFriends() {
        const container = document.querySelector('.friends-carousel');
        if (container) {
            container.innerHTML = `
                <div class="friends-message">
                    <div class="message-text">No friends to display</div>
                </div>
            `;
        }
    }

    showFriendsError() {
        const container = document.querySelector('.friends-carousel');
        if (container) {
            container.innerHTML = `
                <div class="friends-message">
                    <div class="message-text">Failed to load friends</div>
                    <button class="retry-btn" onclick="window.homePageRenderer?.loadFriends()">Retry</button>
                </div>
            `;
        }
    }

    async loadRecentGames(retryCount = 0) {
        const MAX_RETRIES = 5;
        const RETRY_DELAY_BASE = 2000; 
        
        console.log('[HomePageRenderer] Loading recent games...' + (retryCount > 0 ? ` (retry ${retryCount}/${MAX_RETRIES})` : ''));
        
        try {
            const api = window.robloxAPI || window.RobloxClient?.api;
            if (!api) {
                console.log('[HomePageRenderer] API not available, keeping static game content');

                if (retryCount < MAX_RETRIES) {
                    const delay = RETRY_DELAY_BASE * Math.pow(1.5, retryCount);
                    console.log(`[HomePageRenderer] API not ready, retrying in ${delay}ms...`);
                    setTimeout(() => this.loadRecentGames(retryCount + 1), delay);
                }
                return;
            }

            let playtimeData = null;
            if (window.PlaytimeTracker) {
                playtimeData = await window.PlaytimeTracker.getAllPlaytime();
                console.log('[HomePageRenderer] Playtime data:', playtimeData);
            } else {
                console.log('[HomePageRenderer] PlaytimeTracker not available');
            }

            let universeIds = [];
            let placeIdToPlaytime = new Map();
            let hasRecentlyPlayed = false;

            if (playtimeData && Object.keys(playtimeData).length > 0) {

                const sortedGames = Object.entries(playtimeData)
                    .filter(([placeId, data]) => data && data.totalMinutes > 0)
                    .sort((a, b) => {
                        const lastPlayedA = a[1].lastPlayed || 0;
                        const lastPlayedB = b[1].lastPlayed || 0;
                        return lastPlayedB - lastPlayedA;
                    })
                    .slice(0, 12);

                console.log('[HomePageRenderer] Sorted recently played games:', sortedGames.length);

                if (sortedGames.length > 0) {
                    hasRecentlyPlayed = true;

                    const placeIds = sortedGames.map(([placeId, data]) => {
                        placeIdToPlaytime.set(parseInt(placeId), data);
                        return parseInt(placeId);
                    });

                    console.log('[HomePageRenderer] Recently played place IDs:', placeIds);

                    const validPlaceIds = placeIds.filter(id => id && id > 0 && Number.isInteger(id));
                    
                    if (validPlaceIds.length === 0) {
                        console.warn('[HomePageRenderer] No valid place IDs found');
                    } else {

                        for (const placeId of validPlaceIds) {
                            try {
                                const placeDetailsApi = window.roblox?.getPlaceDetails || api.getPlaceDetails;
                                if (placeDetailsApi) {
                                    const result = await placeDetailsApi([placeId]);
                                    if (Array.isArray(result) && result[0]?.universeId && result[0].universeId > 0) {
                                        universeIds.push(result[0].universeId);
                                    }
                                }
                            } catch (e) {
                                console.warn(`[HomePageRenderer] Failed to get place details for ${placeId}:`, e);
                            }
                        }
                    }
                }
            }

            if (universeIds.length === 0) {
                console.log('[HomePageRenderer] No recently played games found, hiding section');
                this.hideRecentlyPlayedSection();
                return;
            }

            universeIds = [...new Set(universeIds)].slice(0, 12);

            console.log('[HomePageRenderer] Found universe IDs:', universeIds);

            let gameDetails = new Map();
            let gameVotes = new Map();

            const batchSize = 15;
            const batches = [];
            for (let i = 0; i < universeIds.length; i += batchSize) {
                batches.push(universeIds.slice(i, i + batchSize));
            }

            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];

                if (i > 0) {
                    await new Promise(resolve => setTimeout(resolve, 150));
                }

                try {
                    const [detailsResult, votesResult] = await Promise.all([
                        api.getGameDetails ? api.getGameDetails(batch).catch(e => {
                            console.warn(`[HomePageRenderer] Game details batch ${i} failed:`, e);
                            return null;
                        }) : null,
                        api.getGameVotes ? api.getGameVotes(batch).catch(e => {
                            console.warn(`[HomePageRenderer] Game votes batch ${i} failed:`, e);
                            return null;
                        }) : null
                    ]);

                    if (detailsResult?.data) {
                        for (const game of detailsResult.data) {
                            if (game?.id) {
                                gameDetails.set(game.id, game);
                            }
                        }
                    }

                    if (votesResult?.data) {
                        for (const vote of votesResult.data) {
                            if (vote?.id) {
                                gameVotes.set(vote.id, vote);
                            }
                        }
                    }
                } catch (error) {
                    console.warn(`[HomePageRenderer] Batch ${i} failed completely:`, error);

                }
            }

            this.recentGames = universeIds.map(id => {
                const details = gameDetails.get(id);
                const votes = gameVotes.get(id) || { upVotes: 0, downVotes: 0 };
                if (details) {

                    const placeId = details.rootPlaceId || details.placeId;
                    const playtimeData = placeIdToPlaytime.get(placeId) || placeIdToPlaytime.get(parseInt(placeId));

                    return { 
                        ...details, 
                        _votes: votes,
                        _playtime: playtimeData
                    };
                }
                return details;
            }).filter(g => g && g.name); 

            if (this.recentGames.length === 0 && retryCount < MAX_RETRIES) {
                const delay = RETRY_DELAY_BASE * Math.pow(1.5, retryCount);
                console.log(`[HomePageRenderer] No games loaded, retrying in ${delay}ms...`);
                setTimeout(() => this.loadRecentGames(retryCount + 1), delay);
                return;
            }

            this.showRecentlyPlayedSection();
            this.renderGamesList(this.recentGames, gameDetails, gameVotes);

            this.setupGamesSeeAll();

            console.log('[HomePageRenderer] Recent games loaded successfully');
        } catch (error) {
            console.error('[HomePageRenderer] Failed to load recent games:', error);

            if (retryCount < MAX_RETRIES) {
                const delay = RETRY_DELAY_BASE * Math.pow(1.5, retryCount);
                console.log(`[HomePageRenderer] Retrying in ${delay}ms...`);
                setTimeout(() => this.loadRecentGames(retryCount + 1), delay);
            } else {
                console.log('[HomePageRenderer] Max retries reached, hiding section');
                this.hideRecentlyPlayedSection();
            }
        }
    }

    async loadFavoriteGames() {
        console.log('[HomePageRenderer] Loading favorite games...');
        
        try {
            const api = window.robloxAPI;
            
            if (!api || !this.currentUser) {
                console.log('[HomePageRenderer] API not available or not logged in');
                this.showFavoritesNotLoggedIn();
                return;
            }

            let favorites = null;
            if (api.getUserFavoriteGames) {
                favorites = await api.getUserFavoriteGames(this.currentUser.id, 10);
            }

            if (!favorites?.data || favorites.data.length === 0) {
                console.log('[HomePageRenderer] No favorite games');
                this.showNoFavorites();
                return;
            }

            const universeIds = favorites.data.map(g => g.universeId || g.id).filter(Boolean);

            if (universeIds.length === 0) {
                this.showNoFavorites();
                return;
            }

            let gameDetails = new Map();
            let gameVotes = new Map();

            const batchSize = 10;
            const batches = [];
            for (let i = 0; i < universeIds.length; i += batchSize) {
                batches.push(universeIds.slice(i, i + batchSize));
            }

            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];

                if (i > 0) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                try {
                    const [detailsResult, votesResult] = await Promise.all([
                        api.getGameDetails ? api.getGameDetails(batch).catch(e => {
                            console.warn(`[HomePageRenderer] Favorite game details batch ${i} failed:`, e);
                            return null;
                        }) : null,
                        api.getGameVotes ? api.getGameVotes(batch).catch(e => {
                            console.warn(`[HomePageRenderer] Favorite game votes batch ${i} failed:`, e);
                            return null;
                        }) : null
                    ]);

                    if (detailsResult?.data) {
                        detailsResult.data.forEach(game => {
                            if (game?.id) {
                                gameDetails.set(game.id, game);
                            }
                        });
                    }

                    if (votesResult?.data) {
                        votesResult.data.forEach(vote => {
                            if (vote?.id) {
                                gameVotes.set(vote.id, vote);
                            }
                        });
                    }
                } catch (e) {
                    console.warn(`[HomePageRenderer] Favorite games batch ${i} failed:`, e);
                }
            }

            const games = universeIds.map(id => {
                const details = gameDetails.get(id);
                const votes = gameVotes.get(id) || { upVotes: 0, downVotes: 0 };
                if (details) {
                    return { ...details, _votes: votes };
                }
                return details;
            }).filter(g => g && g.name);

            this.favoriteGames = games;

            this.renderFavoriteGamesList(games, gameDetails, gameVotes);

            console.log('[HomePageRenderer] Favorite games loaded successfully');
        } catch (error) {
            console.error('[HomePageRenderer] Failed to load favorite games:', error);
            this.showFavoritesError();
        }
    }

    renderFavoriteGamesList(games, gameDetails, gameVotes) {
        const container = document.querySelector('.favorites-grid');
        if (!container) return;

        container.innerHTML = '';

        const displayGames = games.slice(0, 6);

        for (const game of displayGames) {

            const votes = game._votes || gameVotes.get(game.universeId || game.id) || { upVotes: 0, downVotes: 0 };
            const card = this.renderGameCard(game, votes);
            container.appendChild(card);
        }

        if (this.thumbnailLoader) {
            const thumbImages = container.querySelectorAll('.game-card-thumb');
            thumbImages.forEach((img, index) => {
                const universeId = displayGames[index]?.universeId || displayGames[index]?.id;
                if (universeId) {
                    this.thumbnailLoader.queueGameIcon(universeId, img);
                }
            });
        }
    }

    showFavoritesNotLoggedIn() {
        const container = document.querySelector('.favorites-grid');
        if (container) {
            container.innerHTML = `
                <div class="games-message">
                    <div class="message-text">Please log in to see your favorites</div>
                </div>
            `;
        }
    }

    showNoFavorites() {
        const container = document.querySelector('.favorites-grid');
        if (container) {
            container.innerHTML = `
                <div class="games-message">
                    <div class="message-text">No favorite games yet</div>
                </div>
            `;
        }
    }

    showFavoritesError() {
        const container = document.querySelector('.favorites-grid');
        if (container) {
            container.innerHTML = `
                <div class="games-message">
                    <div class="message-text">Failed to load favorites</div>
                    <button class="retry-btn" onclick="window.homePageRenderer?.loadFavoriteGames()">Retry</button>
                </div>
            `;
        }
    }

    hideRecentlyPlayedSection() {

        const sectionHeaders = document.querySelectorAll('.section-header');
        for (const header of sectionHeaders) {
            const h2 = header.querySelector('h2');
            if (h2 && h2.textContent.trim() === 'Recently Played') {

                header.style.display = 'none';

                const contentSection = header.nextElementSibling;
                if (contentSection && contentSection.classList.contains('recently-played-section') && 
                    !contentSection.classList.contains('favorites-section') && 
                    !contentSection.classList.contains('recommended-section')) {
                    contentSection.style.display = 'none';
                }
                console.log('[HomePageRenderer] Recently Played section hidden');
                break;
            }
        }
    }

    showRecentlyPlayedSection() {

        const sectionHeaders = document.querySelectorAll('.section-header');
        for (const header of sectionHeaders) {
            const h2 = header.querySelector('h2');
            if (h2 && h2.textContent.trim() === 'Recently Played') {

                header.style.display = '';

                const contentSection = header.nextElementSibling;
                if (contentSection && contentSection.classList.contains('recently-played-section') && 
                    !contentSection.classList.contains('favorites-section') && 
                    !contentSection.classList.contains('recommended-section')) {
                    contentSection.style.display = '';
                }
                console.log('[HomePageRenderer] Recently Played section shown');
                break;
            }
        }
    }

    async loadRecommendedGames() {
        console.log('[HomePageRenderer] Loading recommended games...');
        
        try {
            const api = window.robloxAPI || window.RobloxClient?.api;
            
            if (!api) {
                console.log('[HomePageRenderer] API not available for recommendations');
                this.showRecommendedNotAvailable();
                return;
            }

            const [recommendations, rovlooGames] = await Promise.all([
                api.getOmniRecommendations('Home').catch(e => {
                    console.warn('[HomePageRenderer] Failed to get omni recommendations:', e);
                    return null;
                }),
                this.loadRovlooHighestRated().catch(e => {
                    console.warn('[HomePageRenderer] Failed to get Rovloo games:', e);
                    return [];
                })
            ]);

            console.log('[HomePageRenderer] Recommendations response:', recommendations);
            console.log('[HomePageRenderer] Rovloo highest rated:', rovlooGames?.length || 0);

            let robloxUniverseIds = [];
            if (recommendations?.sorts) {
                for (const sort of recommendations.sorts) {
                    if (sort.recommendationList && sort.recommendationList.length > 0) {
                        const sortUniverseIds = sort.recommendationList
                            .filter(rec => rec.contentType === 'Game' && rec.contentId)
                            .map(rec => rec.contentId);
                        robloxUniverseIds.push(...sortUniverseIds);
                    } else if (sort.games && sort.games.length > 0) {
                        const sortUniverseIds = sort.games
                            .filter(g => g.universeId)
                            .map(g => g.universeId);
                        robloxUniverseIds.push(...sortUniverseIds);
                    }
                }
            }

            robloxUniverseIds = [...new Set(robloxUniverseIds)];

            const rovlooUniverseIds = rovlooGames
                .filter(g => g.universeId)
                .map(g => g.universeId);

            const rovlooToInclude = rovlooUniverseIds.slice(0, 3);
            const robloxToInclude = robloxUniverseIds
                .filter(id => !rovlooToInclude.includes(id)) 
                .slice(0, 6 - rovlooToInclude.length);

            let universeIds = [];
            const maxLen = Math.max(rovlooToInclude.length, robloxToInclude.length);
            for (let i = 0; i < maxLen; i++) {
                if (i < rovlooToInclude.length) universeIds.push(rovlooToInclude[i]);
                if (i < robloxToInclude.length) universeIds.push(robloxToInclude[i]);
            }

            universeIds = [...new Set(universeIds)].slice(0, 6);

            if (universeIds.length === 0) {
                this.showNoRecommendations();
                return;
            }

            console.log('[HomePageRenderer] Mixed recommendations:', universeIds.length, 
                `(${rovlooToInclude.length} Rovloo, ${robloxToInclude.length} Roblox)`);

            let gameDetails = new Map();
            let gameVotes = new Map();

            for (const rovlooGame of rovlooGames) {
                if (rovlooGame.universeId && universeIds.includes(rovlooGame.universeId)) {
                    gameDetails.set(rovlooGame.universeId, {
                        id: rovlooGame.universeId,
                        name: rovlooGame.name,
                        playing: rovlooGame.playing || rovlooGame.playerCount || 0,
                        rootPlaceId: rovlooGame.placeId,
                        creator: rovlooGame.creator || { name: rovlooGame.creatorName || 'Unknown' },
                        genre: rovlooGame.genre || 'All',
                        visits: rovlooGame.visits || 0,
                        favoritedCount: rovlooGame.favoritedCount || 0
                    });
                }
            }

            const idsToFetch = universeIds.filter(id => !gameDetails.has(id));

            if (idsToFetch.length > 0) {
                try {
                    const [detailsResult, votesResult] = await Promise.all([
                        api.getGameDetails ? api.getGameDetails(idsToFetch).catch(e => {
                            console.warn(`[HomePageRenderer] Recommended game details failed:`, e);
                            return null;
                        }) : null,
                        api.getGameVotes ? api.getGameVotes(universeIds).catch(e => {
                            console.warn(`[HomePageRenderer] Recommended game votes failed:`, e);
                            return null;
                        }) : null
                    ]);

                    if (detailsResult?.data) {
                        detailsResult.data.forEach(game => {
                            if (game?.id) {
                                gameDetails.set(game.id, game);
                            }
                        });
                    }

                    if (votesResult?.data) {
                        votesResult.data.forEach(vote => {
                            if (vote?.id) {
                                gameVotes.set(vote.id, vote);
                            }
                        });
                    }
                } catch (error) {
                    console.warn(`[HomePageRenderer] Recommended games fetch failed:`, error);
                }
            } else {

                try {
                    const votesResult = await api.getGameVotes?.(universeIds);
                    if (votesResult?.data) {
                        votesResult.data.forEach(vote => {
                            if (vote?.id) {
                                gameVotes.set(vote.id, vote);
                            }
                        });
                    }
                } catch (e) {
                    console.warn('[HomePageRenderer] Failed to get votes:', e);
                }
            }

            const rovlooUniverseIdSet = new Set(rovlooGames.map(g => g.universeId));

            this.rovlooUniverseIds = rovlooUniverseIdSet;
            
            const games = universeIds.map(id => {
                const details = gameDetails.get(id);
                const votes = gameVotes.get(id) || { upVotes: 0, downVotes: 0 };
                if (details) {
                    return { 
                        ...details, 
                        _votes: votes,
                        _isRovloo: rovlooUniverseIdSet.has(id) 
                    };
                }
                return details;
            }).filter(g => g && g.name);

            this.recommendedGames = games;

            this.renderRecommendedGamesList(games, gameDetails, gameVotes);

            console.log('[HomePageRenderer] Recommended games loaded successfully');
        } catch (error) {
            console.error('[HomePageRenderer] Failed to load recommended games:', error);
            this.showRecommendedError();
        }
    }

    async loadRovlooHighestRated() {

        if (!window.roblox?.reviews?.getReviewedGames) {
            console.log('[HomePageRenderer] Rovloo reviews API not available');
            return [];
        }

        try {

            const reviewedGames = await window.roblox.reviews.getReviewedGames({
                sort: 'highest_rated'
            });

            if (!reviewedGames || reviewedGames.length === 0) {
                return [];
            }

            console.log('[HomePageRenderer] Got Rovloo highest rated games:', reviewedGames.length);

            const processedGames = [];
            const api = window.robloxAPI || window.roblox;

            for (const g of reviewedGames.slice(0, 10)) { 

                if (g.universeId && g.name && g.name !== 'Unknown Game') {
                    processedGames.push({
                        universeId: g.universeId,
                        placeId: g.placeId || g.gameId,
                        name: g.name,
                        playing: g.playing || g.playerCount || 0,
                        playerCount: g.playing || g.playerCount || 0,
                        genre: g.genre || 'All',
                        visits: g.visits || 0,
                        favoritedCount: g.favoritedCount || 0,
                        creator: g.creator ? { name: g.creator } : null,
                        creatorName: g.creatorName || g.creator || 'Unknown',
                        rovlooLikeRatio: g.likeRatio || 0
                    });
                } else if (g.gameId && api?.getPlaceDetails) {

                    try {
                        const placeId = typeof g.gameId === 'string' ? parseInt(g.gameId, 10) : g.gameId;
                        const placeDetails = await api.getPlaceDetails([placeId]);
                        if (placeDetails?.[0]?.universeId) {
                            processedGames.push({
                                universeId: placeDetails[0].universeId,
                                placeId: placeId,
                                name: g.name || 'Unknown Game',
                                playing: g.playing || 0,
                                playerCount: g.playing || 0,
                                genre: g.genre || 'All',
                                rovlooLikeRatio: g.likeRatio || 0
                            });
                        }
                    } catch (e) {
                        console.warn('[HomePageRenderer] Failed to convert place ID:', e);
                    }
                }

                if (processedGames.length >= 5) break;
            }

            return processedGames;
        } catch (error) {
            console.error('[HomePageRenderer] Failed to load Rovloo highest rated:', error);
            return [];
        }
    }

    renderRecommendedGamesList(games, gameDetails, gameVotes) {
        const container = document.querySelector('.recommended-grid');
        if (!container) return;

        container.innerHTML = '';

        const displayGames = games.slice(0, 6);

        for (const game of displayGames) {

            const votes = game._votes || gameVotes.get(game.universeId || game.id) || { upVotes: 0, downVotes: 0 };

            const card = this.renderGameCard(game, votes, { isRovloo: game._isRovloo });
            container.appendChild(card);
        }

        if (this.thumbnailLoader) {
            const thumbImages = container.querySelectorAll('.game-card-thumb');
            thumbImages.forEach((img, index) => {
                const universeId = displayGames[index]?.universeId || displayGames[index]?.id;
                if (universeId) {
                    this.thumbnailLoader.queueGameIcon(universeId, img);
                }
            });
        }
    }

    showRecommendedNotAvailable() {
        const container = document.querySelector('.recommended-grid');
        if (container) {
            container.innerHTML = `
                <div class="games-message">
                    <div class="message-text">Please log in to see recommendations</div>
                </div>
            `;
        }
    }

    showNoRecommendations() {
        const container = document.querySelector('.recommended-grid');
        if (container) {
            container.innerHTML = `
                <div class="games-message">
                    <div class="message-text">No recommendations available</div>
                </div>
            `;
        }
    }

    showRecommendedError() {
        const container = document.querySelector('.recommended-grid');
        if (container) {
            container.innerHTML = `
                <div class="games-message">
                    <div class="message-text">Failed to load recommendations</div>
                    <button class="retry-btn" onclick="window.homePageRenderer?.loadRecommendedGames()">Retry</button>
                </div>
            `;
        }
    }

    renderGamesList(games, gameDetails, gameVotes) {
        const container = document.querySelector('.recently-played-section .games-grid');
        if (!container) return;

        container.innerHTML = '';

        const displayGames = games.slice(0, 6);

        for (const game of displayGames) {

            const votes = game._votes || gameVotes.get(game.universeId || game.id) || { upVotes: 0, downVotes: 0 };
            const card = this.renderGameCard(game, votes);
            container.appendChild(card);
        }

        if (this.thumbnailLoader) {
            const thumbImages = container.querySelectorAll('.game-card-thumb');
            thumbImages.forEach((img, index) => {
                const universeId = displayGames[index]?.universeId || displayGames[index]?.id;
                if (universeId) {
                    this.thumbnailLoader.queueGameIcon(universeId, img);
                }
            });
        }
    }

    renderGameCard(game, votes, options = {}) {
        const card = document.createElement('div');
        card.className = 'game-card' + (options.isRovloo ? ' rovloo-game-card' : '');
        card.dataset.universeId = game.universeId || game.id;
        card.dataset.placeId = game.rootPlaceId || game.placeId;

        const gameName = this.truncateText(game.name || 'Unknown Game', 20);
        const playerCount = this.formatNumber(game.playing || 0);
        const votePercentage = this.calculateVotePercentage(votes.upVotes, votes.downVotes);
        const creatorName = game.creator?.name || 'Unknown';

        let playtimeInline = '';
        if (game._playtime && game._playtime.totalMinutes > 0) {
            const playtimeFormatted = window.PlaytimeTracker 
                ? window.PlaytimeTracker.formatPlaytimeMinutes(game._playtime.totalMinutes)
                : this.formatPlaytimeMinutes(game._playtime.totalMinutes);
            playtimeInline = ` · <img src="images/rovloo/playtime-indicator.png" alt="" class="playtime-icon-small">${playtimeFormatted}`;
        }

        const rovlooBadgeHtml = options.isRovloo ? `
            <div class="rovloo-badge" title="Rovloo Reviewed">
                <span class="rovloo-icon">★</span>
            </div>
        ` : '';

        card.innerHTML = `
            <a href="pages/game-detail.html?placeId=${game.rootPlaceId || game.placeId}" class="game-card-container">
                <div class="game-card-thumb-container">
                    <img src="${this.GAME_PLACEHOLDER}" class="game-card-thumb" alt="${game.name}" data-universe-id="${game.universeId || game.id}"/>
                    ${rovlooBadgeHtml}
                </div>
                <div class="game-card-name" title="${game.name}">${gameName}</div>
                <div class="game-card-name-secondary">${playerCount} Playing${playtimeInline}</div>
                <div class="game-card-vote">
                    <div class="vote-bar">
                        <div class="vote-thumbs-up">
                            <span class="icon-thumbs-up"></span>
                        </div>
                        <div class="vote-thumbs-down">
                            <span class="icon-thumbs-down"></span>
                        </div>
                        <div class="vote-container">
                            <div class="vote-background${votes.upVotes + votes.downVotes === 0 ? ' no-votes' : ''}"></div>
                            <div class="vote-percentage" style="width: ${votePercentage}%"></div>
                            <div class="vote-mask">
                                <div class="segment seg-1"></div>
                                <div class="segment seg-2"></div>
                                <div class="segment seg-3"></div>
                                <div class="segment seg-4"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="vote-counts">
                    <span class="vote-up-count">${this.formatNumber(votes.upVotes)}</span>
                    <span class="vote-down-count">${this.formatNumber(votes.downVotes)}</span>
                </div>
                <div class="game-card-footer">
                    <div class="game-creator">by <span class="creator-link" data-creator-id="${game.creator?.id}" data-creator-type="${game.creator?.type}">${creatorName}</span></div>
                </div>
            </a>
        `;

        const container = card.querySelector('.game-card-container');
        container.addEventListener('click', (e) => {
            e.preventDefault();
            this.navigateToGame(game.rootPlaceId || game.placeId);
        });

        const creatorLink = card.querySelector('.creator-link');
        if (creatorLink) {
            creatorLink.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const creatorId = creatorLink.dataset.creatorId;
                const creatorType = creatorLink.dataset.creatorType;
                if (creatorId) {
                    if (creatorType === 'Group') {
                        this.navigateToGroup(creatorId);
                    } else {
                        this.navigateToProfile(creatorId);
                    }
                }
            });
        }

        return card;
    }

    calculateVotePercentage(upVotes, downVotes) {
        const total = upVotes + downVotes;
        if (total === 0) return 0;
        return Math.round((upVotes / total) * 100);
    }

    setupGamesSeeAll() {

        const recentlyPlayedHeader = document.querySelector('.recently-played-section')?.previousElementSibling;
        const recentSeeAllBtn = recentlyPlayedHeader?.querySelector('.btn-more');
        if (recentSeeAllBtn) {
            recentSeeAllBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showExpandedView('recently-played', 'Recently Played', this.recentGames);
            });
        }

        const favoritesHeader = document.querySelector('.favorites-section')?.previousElementSibling;
        const favoritesSeeAllBtn = favoritesHeader?.querySelector('.btn-more');
        if (favoritesSeeAllBtn) {
            favoritesSeeAllBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showExpandedView('favorites', 'My Favorites', this.favoriteGames || []);
            });
        }

        const recommendedHeader = document.querySelector('.recommended-section')?.previousElementSibling;
        const recommendedSeeAllBtn = recommendedHeader?.querySelector('.btn-more');
        if (recommendedSeeAllBtn) {
            recommendedSeeAllBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showExpandedView('recommended', 'Recommended', this.recommendedGames || []);
            });
        }
    }

    async showExpandedView(type, title, games) {
        console.log(`[HomePageRenderer] Showing expanded view for ${type}`);
        
        const mainContent = document.querySelector('.home-main-content');
        if (!mainContent) return;

        this.expandedViewState = {
            type: type,
            isLoading: false,
            hasMoreGames: true,
            currentPage: 1,
            loadedGameIds: new Set(),
            allUniverseIds: [], 
            observer: null
        };

        if (!this.originalContent) {
            this.originalContent = mainContent.innerHTML;
        }

        await this.animateCollapse(mainContent);

        const expandedViewHtml = `
            <div class="expanded-games-view" id="ExpandedGamesView" style="opacity: 0; transform: translateY(20px);">
                <div class="section-header" style="margin-bottom: 15px; margin-left: -20px;">
                    <h2>${title}</h2>
                    <button class="btn-more" id="ExpandedGamesBack">← Back</button>
                </div>
                <div class="expanded-games-grid games-grid" id="ExpandedGamesGrid">
                    <div class="games-loading">
                        <div class="loading-spinner"></div>
                        <div class="loading-text">Loading games...</div>
                    </div>
                </div>
                <div class="infinite-scroll-sentinel" id="InfiniteScrollSentinel"></div>
            </div>
        `;

        mainContent.innerHTML = expandedViewHtml;

        const backBtn = document.getElementById('ExpandedGamesBack');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.exitExpandedView());
        }

        this.setupInfiniteScrollObserver();

        const expandedView = document.getElementById('ExpandedGamesView');
        if (expandedView) {
            expandedView.offsetHeight; 
            expandedView.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            expandedView.style.opacity = '1';
            expandedView.style.transform = 'translateY(0)';
        }

        await this.loadExpandedGames(type, games);

        setTimeout(() => this.checkIfMoreGamesNeeded(), 100);
    }

    setupInfiniteScrollObserver() {
        const sentinel = document.getElementById('InfiniteScrollSentinel');
        if (!sentinel) return;

        if (this.expandedViewState.observer) {
            this.expandedViewState.observer.disconnect();
        }

        this.expandedViewState.observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (entry.isIntersecting && 
                    !this.expandedViewState.isLoading && 
                    this.expandedViewState.hasMoreGames) {
                    console.log('[HomePageRenderer] IntersectionObserver triggered, loading next page...');
                    this.loadNextPageOfGames();
                }
            },
            {
                rootMargin: '500px' 
            }
        );

        this.expandedViewState.observer.observe(sentinel);
        console.log('[HomePageRenderer] Infinite scroll observer set up');
    }
    
    checkIfMoreGamesNeeded() {
        if (this.expandedViewState.isLoading || !this.expandedViewState.hasMoreGames) {
            return;
        }
        
        const sentinel = document.getElementById('InfiniteScrollSentinel');
        if (!sentinel) return;
        
        const rect = sentinel.getBoundingClientRect();
        const viewportHeight = window.innerHeight;

        if (rect.top < viewportHeight + 500) {
            console.log('[HomePageRenderer] Screen not filled, loading more games...');
            this.loadNextPageOfGames();
        }
    }

    async loadNextPageOfGames() {
        if (this.expandedViewState.isLoading || !this.expandedViewState.hasMoreGames) {
            return;
        }

        this.expandedViewState.isLoading = true;
        this.expandedViewState.currentPage++;

        this.showInfiniteScrollLoading();

        try {

            await this.loadExpandedGames(this.expandedViewState.type, null, true);
        } catch (error) {
            console.error('[HomePageRenderer] Failed to load next page:', error);
            this.expandedViewState.currentPage--; 
        } finally {
            this.expandedViewState.isLoading = false;
            this.hideInfiniteScrollLoading();

            setTimeout(() => this.checkIfMoreGamesNeeded(), 100);
        }
    }

    showInfiniteScrollLoading() {
        const grid = document.getElementById('ExpandedGamesGrid');
        if (!grid) return;

        const existingLoader = grid.querySelector('.infinite-scroll-loading');
        if (existingLoader) {
            existingLoader.remove();
        }

        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'infinite-scroll-loading';
        loadingIndicator.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">Loading more games...</div>
        `;
        grid.appendChild(loadingIndicator);
    }

    hideInfiniteScrollLoading() {
        const grid = document.getElementById('ExpandedGamesGrid');
        if (!grid) return;

        const loadingIndicator = grid.querySelector('.infinite-scroll-loading');
        if (loadingIndicator) {
            loadingIndicator.remove();
        }
    }
    async animateCollapse(container) {
        const sections = container.querySelectorAll('.section-header, .friends-section, .recently-played-section, .favorites-section, .recommended-section, .user-header');
        
        if (sections.length === 0) return;

        if (window.scrollY > 0) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        return new Promise(resolve => {
            let completedAnimations = 0;
            const totalSections = sections.length;

            sections.forEach((section, index) => {
                section.style.transition = 'none';
                section.style.opacity = '1';
                section.style.transform = 'translateY(0)';
                section.offsetHeight; 

                setTimeout(() => {
                    section.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    section.style.opacity = '0';
                    section.style.transform = 'translateY(-20px)';

                    setTimeout(() => {
                        completedAnimations++;
                        if (completedAnimations === totalSections) {
                            resolve();
                        }
                    }, 300);
                }, index * 50); 
            });
        });
    }

    async loadExpandedGames(type, cachedGames, appendMode = false) {
        const grid = document.getElementById('ExpandedGamesGrid');
        if (!grid) return;

        const GAMES_PER_PAGE = 12; 

        try {
            const api = window.robloxAPI;

            if (!appendMode) {

                let allUniverseIds = [];

                if (type === 'recently-played') {
                    if (window.PlaytimeTracker) {
                        const playtimeData = await window.PlaytimeTracker.getAllPlaytime();
                        console.log('[HomePageRenderer] Fetching recently played games');
                        
                        if (playtimeData && Object.keys(playtimeData).length > 0) {
                            const sortedGames = Object.entries(playtimeData)
                                .filter(([placeId, data]) => data && data.totalMinutes > 0)
                                .sort((a, b) => (b[1].lastPlayed || 0) - (a[1].lastPlayed || 0))
                                .slice(0, 100);

                            const placeIds = sortedGames.map(([placeId]) => parseInt(placeId));
                            const validPlaceIds = placeIds.filter(id => id && id > 0 && Number.isInteger(id));
                            
                            if (validPlaceIds.length > 0) {
                                try {
                                    const placeDetailsApi = window.roblox?.getPlaceDetails || api?.getPlaceDetails;
                                    if (placeDetailsApi) {
                                        const placeDetailsResult = await placeDetailsApi(validPlaceIds);
                                        if (Array.isArray(placeDetailsResult)) {
                                            for (const place of placeDetailsResult) {
                                                if (place?.universeId && place.universeId > 0) {
                                                    allUniverseIds.push(place.universeId);
                                                }
                                            }
                                        }
                                    }
                                } catch (e) {
                                    console.warn('[HomePageRenderer] Batch place details failed:', e);
                                }
                            }
                        }
                    }
                } else if (type === 'favorites') {

                    if (api?.getUserFavoriteGames && this.currentUser) {
                        console.log('[HomePageRenderer] Fetching all favorite games with pagination');
                        let cursor = '';
                        let pageCount = 0;
                        const maxPages = 10; 
                        
                        do {
                            const favorites = await api.getUserFavoriteGames(this.currentUser.id, 100, cursor);
                            if (favorites?.data) {
                                const pageIds = favorites.data.map(g => g.universeId || g.id).filter(Boolean);
                                allUniverseIds.push(...pageIds);
                                console.log(`[HomePageRenderer] Favorites page ${pageCount + 1}: ${pageIds.length} games`);
                            }
                            cursor = favorites?.nextPageCursor || '';
                            pageCount++;
                        } while (cursor && pageCount < maxPages);
                        
                        console.log(`[HomePageRenderer] Total favorites fetched: ${allUniverseIds.length}`);
                    }
                } else if (type === 'recommended') {

                    console.log('[HomePageRenderer] Fetching recommended games from multiple sources');

                    if (api?.getOmniRecommendations) {
                        try {
                            const recommendations = await api.getOmniRecommendations('Home');
                            if (recommendations?.sorts) {
                                for (const sort of recommendations.sorts) {
                                    if (sort.recommendationList && sort.recommendationList.length > 0) {
                                        const sortUniverseIds = sort.recommendationList
                                            .filter(rec => rec.contentType === 'Game' && rec.contentId)
                                            .map(rec => rec.contentId);
                                        allUniverseIds.push(...sortUniverseIds);
                                    } else if (sort.games && sort.games.length > 0) {
                                        const sortUniverseIds = sort.games
                                            .filter(g => g.universeId)
                                            .map(g => g.universeId);
                                        allUniverseIds.push(...sortUniverseIds);
                                    }
                                }
                            }
                            console.log(`[HomePageRenderer] Omni recommendations: ${allUniverseIds.length} games`);
                        } catch (e) {
                            console.warn('[HomePageRenderer] Failed to fetch omni recommendations:', e);
                        }
                    }

                    if (api?.getGameSortsExplore) {
                        try {
                            const sortsData = await api.getGameSortsExplore();
                            if (sortsData?.sorts) {
                                for (const sort of sortsData.sorts) {
                                    if (sort.games && sort.games.length > 0) {
                                        const sortUniverseIds = sort.games
                                            .filter(g => g.universeId)
                                            .map(g => g.universeId);
                                        allUniverseIds.push(...sortUniverseIds);
                                    }
                                }
                            }
                            console.log(`[HomePageRenderer] After sorts explore: ${allUniverseIds.length} games (with duplicates)`);
                        } catch (e) {
                            console.warn('[HomePageRenderer] Failed to fetch from sorts explore:', e);
                        }
                    }

                    if (api?.getGameSorts) {
                        try {
                            const gameSorts = await api.getGameSorts();
                            if (gameSorts?.sorts) {
                                for (const sort of gameSorts.sorts) {
                                    if (sort.games && sort.games.length > 0) {
                                        const sortUniverseIds = sort.games
                                            .filter(g => g.universeId)
                                            .map(g => g.universeId);
                                        allUniverseIds.push(...sortUniverseIds);
                                    }
                                }
                            }
                            console.log(`[HomePageRenderer] After game sorts: ${allUniverseIds.length} games (with duplicates)`);
                        } catch (e) {
                            console.warn('[HomePageRenderer] Failed to fetch from game sorts:', e);
                        }
                    }
                }

                allUniverseIds = [...new Set(allUniverseIds)];
                this.expandedViewState.allUniverseIds = allUniverseIds;
                this.expandedViewState.loadedGameIds = new Set();

                if (cachedGames && cachedGames.length > 0) {
                    cachedGames.forEach(g => {
                        const id = g.universeId || g.id;
                        if (id) this.expandedViewState.loadedGameIds.add(id);
                    });
                }

                console.log(`[HomePageRenderer] Total universe IDs for ${type}: ${allUniverseIds.length}`);

                if (cachedGames && cachedGames.length > 0) {
                    grid.innerHTML = '';
                    for (const game of cachedGames) {
                        const votes = game._votes || { upVotes: 0, downVotes: 0 };
                        const universeId = game.universeId || game.id;
                        const isRovloo = this.rovlooUniverseIds && this.rovlooUniverseIds.has(universeId);
                        const card = this.renderGameCard(game, votes, { isRovloo });
                        grid.appendChild(card);
                    }

                    if (this.thumbnailLoader) {
                        const thumbImages = grid.querySelectorAll('.game-card-thumb');
                        thumbImages.forEach((img, index) => {
                            const universeId = cachedGames[index]?.universeId || cachedGames[index]?.id;
                            if (universeId) {
                                this.thumbnailLoader.queueGameIcon(universeId, img);
                            }
                        });
                    }
                } else {
                    grid.innerHTML = '';
                }
            }

            const allUniverseIds = this.expandedViewState.allUniverseIds || [];
            const universeIdsToLoad = allUniverseIds.filter(id => !this.expandedViewState.loadedGameIds.has(id));
            const batchToLoad = universeIdsToLoad.slice(0, GAMES_PER_PAGE);

            console.log(`[HomePageRenderer] Loading batch: ${batchToLoad.length} games (${universeIdsToLoad.length} remaining)`);

            this.expandedViewState.hasMoreGames = universeIdsToLoad.length > GAMES_PER_PAGE;

            if (batchToLoad.length === 0) {

                const loadingIndicator = grid.querySelector('.additional-games-loading, .games-loading');
                if (loadingIndicator) loadingIndicator.remove();
                
                this.expandedViewState.hasMoreGames = false;
                console.log(`[HomePageRenderer] ✅ Complete: No more games to load for ${type}`);

                const existingEndMessage = grid.querySelector('.all-games-loaded');
                if (!existingEndMessage && grid.children.length > 0) {
                    const endMessage = document.createElement('div');
                    endMessage.className = 'all-games-loaded';
                    endMessage.innerHTML = `
                        <div class="end-message-text">You've reached the end!</div>
                        <div class="end-message-count">${this.expandedViewState.loadedGameIds.size} games loaded</div>
                    `;
                    grid.appendChild(endMessage);
                }
                return;
            }

            batchToLoad.forEach(id => this.expandedViewState.loadedGameIds.add(id));

            let gameDetails = new Map();
            let gameVotes = new Map();

            try {
                const [detailsResult, votesResult] = await Promise.all([
                    api?.getGameDetails ? api.getGameDetails(batchToLoad).catch(e => {
                        console.warn('[HomePageRenderer] Game details failed:', e);
                        return null;
                    }) : null,
                    api?.getGameVotes ? api.getGameVotes(batchToLoad).catch(e => {
                        console.warn('[HomePageRenderer] Game votes failed:', e);
                        return null;
                    }) : null
                ]);

                if (detailsResult?.data) {
                    detailsResult.data.forEach(game => {
                        if (game?.id) gameDetails.set(game.id, game);
                    });
                }
                if (votesResult?.data) {
                    votesResult.data.forEach(vote => {
                        if (vote?.id) gameVotes.set(vote.id, vote);
                    });
                }
            } catch (error) {
                console.warn('[HomePageRenderer] Batch fetch failed:', error);
            }

            const loadingIndicator = grid.querySelector('.additional-games-loading, .games-loading');
            if (loadingIndicator) loadingIndicator.remove();

            let renderedCount = 0;
            batchToLoad.forEach((universeId, index) => {
                const details = gameDetails.get(universeId);
                if (!details?.name) return;
                
                const votes = gameVotes.get(universeId) || { upVotes: 0, downVotes: 0 };
                const isRovloo = this.rovlooUniverseIds && this.rovlooUniverseIds.has(universeId);
                const card = this.renderGameCard(details, votes, { isRovloo });
                
                if (appendMode) {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(10px)';
                }
                grid.appendChild(card);
                renderedCount++;
                
                if (appendMode) {
                    setTimeout(() => {
                        card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, 50 + (index * 30));
                }
            });

            if (this.thumbnailLoader && renderedCount > 0) {
                const allThumbImages = grid.querySelectorAll('.game-card-thumb');
                const newThumbImages = Array.from(allThumbImages).slice(-renderedCount);
                newThumbImages.forEach((img, index) => {
                    const universeId = batchToLoad[index];
                    if (universeId) {
                        this.thumbnailLoader.queueGameIcon(universeId, img);
                    }
                });
            }

            console.log(`[HomePageRenderer] ✅ Rendered ${renderedCount} games, hasMore: ${this.expandedViewState.hasMoreGames}`);

        } catch (error) {
            console.error('[HomePageRenderer] Failed to load expanded games:', error);
            
            const loadingIndicator = grid.querySelector('.additional-games-loading, .games-loading');
            if (loadingIndicator) loadingIndicator.remove();
            
            if (!appendMode && (!cachedGames || cachedGames.length === 0)) {
                grid.innerHTML = `
                    <div class="games-message">
                        <div class="message-text">Failed to load games</div>
                        <button class="retry-btn" onclick="window.homePageRenderer?.loadExpandedGames('${type}', [])">Retry</button>
                    </div>
                `;
            }
        }
    }

    async exitExpandedView() {
        const expandedView = document.getElementById('ExpandedGamesView');
        const mainContent = document.querySelector('.home-main-content');
        
        if (!mainContent || !this.originalContent) return;

        if (this.expandedViewState.observer) {
            this.expandedViewState.observer.disconnect();
        }

        if (expandedView) {
            expandedView.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            expandedView.style.opacity = '0';
            expandedView.style.transform = 'translateY(-20px)';
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        mainContent.innerHTML = this.originalContent;

        const sections = mainContent.querySelectorAll('.section-header, .friends-section, .recently-played-section, .favorites-section, .recommended-section, .user-header');
        sections.forEach((section, index) => {
            section.style.opacity = '0';
            section.style.transform = 'translateY(20px)';
            section.offsetHeight; 
            
            setTimeout(() => {
                section.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                section.style.opacity = '1';
                section.style.transform = 'translateY(0)';
            }, index * 50);
        });

        this.setupGamesSeeAll();
        this.setupFriendsSeeAll();

        await new Promise(resolve => setTimeout(resolve, 500 + (sections.length * 50)));
        sections.forEach(section => {
            section.style.transition = '';
            section.style.opacity = '';
            section.style.transform = '';
        });
    }

    showGamesError() {
        const container = document.querySelector('.recently-played-section .games-grid');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    Failed to load games
                    <button class="retry-btn" onclick="window.homePageRenderer?.loadRecentGames()">Retry</button>
                </div>
            `;
        }
    }

    showLoggedOutState() {

        const usernameEl = document.getElementById('username');
        if (usernameEl) {
            usernameEl.textContent = 'Guest';
        }

        const badgeEl = document.querySelector('.bc-badge');
        if (badgeEl) {
            badgeEl.style.display = 'none';
        }
    }

    showError(message) {
        console.error('[HomePageRenderer] Error:', message);
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    formatNumber(num) {
        if (!num) return '0';
        if (num >= 1000000000) {
            return (num / 1000000000).toFixed(1) + 'B';
        }
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toLocaleString();
    }

    formatPlaytimeMinutes(minutes) {
        if (!minutes || minutes < 1) return '< 1m';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
        }
        return `${mins}m`;
    }

    navigateToGame(placeId) {
        if (placeId) {
            window.location.href = `pages/game-detail.html?placeId=${placeId}`;
        }
    }

    navigateToProfile(userId) {
        if (userId) {
            window.location.href = `pages/profile.html?userId=${userId}`;
        }
    }

    navigateToGroup(groupId) {
        if (groupId) {
            window.location.href = `pages/groups.html?groupId=${groupId}`;
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = HomePageRenderer;
}

if (typeof window !== 'undefined') {
    window.HomePageRenderer = HomePageRenderer;
}

document.addEventListener('DOMContentLoaded', () => {

    const isHomePage = document.body.dataset.internalPageName === 'Home' || 
                       window.location.pathname.endsWith('index.html') ||
                       window.location.pathname.endsWith('/');
    
    if (isHomePage) {

        const api = window.robloxAPI || window.RobloxClient?.api;
        if (!api) {
            console.log('[HomePageRenderer] No API available, keeping static content');
            return;
        }
        
        const renderer = new HomePageRenderer();

        window.homePageRenderer = renderer;
        renderer.init();
    }
});

