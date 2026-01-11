class InventoryPageRenderer {
    constructor() {
        this.currentUserId = null;
        this.profileUserId = null;
        this.profileUsername = null;
        this.isOwnProfile = false;
        this.currentCategory = 'hats';
        this.currentPage = 1;
        this.itemsPerPage = 25; 
        this.displayPerPage = 24; 
        this.totalItems = 0;

        this.ITEM_PLACEHOLDER = '../images/avatar-placeholder.png';
        this.GAME_PLACEHOLDER = '../images/game-placeholder.png';

        this.categories = {
            'hats': { label: 'Hats', assetTypeId: 8, section: 'Catalog', showGetMore: true, wearable: true },
            'hair': { label: 'Hair', assetTypeId: 41, section: 'Catalog', showGetMore: true, wearable: true },
            'faces': { label: 'Faces', assetTypeId: 18, section: 'Catalog', showGetMore: true, wearable: true },
            'heads': { label: 'Heads', assetTypeId: 17, section: 'Catalog', showGetMore: true, wearable: true },
            'gear': { label: 'Gear', assetTypeId: 19, section: 'Catalog', showGetMore: true, wearable: true },
            't-shirts': { label: 'T-Shirts', assetTypeId: 2, section: 'Catalog', showGetMore: true, wearable: true },
            'shirts': { label: 'Shirts', assetTypeId: 11, section: 'Catalog', showGetMore: true, wearable: true },
            'pants': { label: 'Pants', assetTypeId: 12, section: 'Catalog', showGetMore: true, wearable: true },
            'packages': { label: 'Packages', assetTypeId: 32, section: 'Catalog', showGetMore: true, wearable: true, isBundle: true },
            'accessories': { label: 'Accessories', assetTypeId: 42, section: 'Catalog', showGetMore: true, wearable: true },
            'collectibles': { label: 'Collectibles', assetTypeId: null, section: 'Collectibles', showGetMore: false, isCollectible: true },
            'places': { label: 'Places', assetTypeId: 9, section: 'Games', showGetMore: false, isPlace: true },
            'models': { label: 'Models', assetTypeId: 10, section: 'Library', showGetMore: true },
            'decals': { label: 'Decals', assetTypeId: 13, section: 'Library', showGetMore: true },
            'audio': { label: 'Audio', assetTypeId: 3, section: 'Library', showGetMore: true },
            'plugins': { label: 'Plugins', assetTypeId: 38, section: 'Library', showGetMore: true },
            'animations': { label: 'Animations', assetTypeId: 24, section: 'Library', showGetMore: true },
            'badges': { label: 'Badges', assetTypeId: 21, section: 'Badges', showGetMore: false, isBadge: true },
            'game-passes': { label: 'Game Passes', assetTypeId: 34, section: 'Game Passes', showGetMore: false, isGamePass: true }
        };
    }

    async init(userId = null, category = 'hats') {
        console.log('[InventoryPage] Initializing with userId:', userId, 'category:', category);
        
        this.currentCategory = category;
        
        try {

            let api = window.roblox;
            if (!api) {
                console.log('[InventoryPage] Waiting for API...');
                await new Promise(resolve => setTimeout(resolve, 500));
                api = window.roblox;
            }
            
            if (!api) {
                throw new Error('API not available');
            }

            const allMethods = Object.keys(api).filter(k => typeof api[k] === 'function');
            console.log('[InventoryPage] All API methods:', allMethods);
            console.log('[InventoryPage] Has getUserInventory:', typeof api.getUserInventory);
            console.log('[InventoryPage] Has getAvatarInventory:', typeof api.getAvatarInventory);

            this.api = api;

            const currentUser = await api.getCurrentUser();
            if (currentUser) {
                this.currentUserId = currentUser.id;
            }

            this.profileUserId = userId || this.currentUserId;
            this.isOwnProfile = this.profileUserId == this.currentUserId;

            this.updateStateProperties();

            await this.loadUserInfo(api);

            this.setupCategoryTabs();

            this.setupEventHandlers();

            await this.loadCategoryData();
            
            console.log('[InventoryPage] Initialization complete');
        } catch (error) {
            console.error('[InventoryPage] Initialization failed:', error);
            this.showError(error.message);
        }
    }

    updateStateProperties() {
        const stateEl = document.getElementById('state-properties');
        if (stateEl) {
            stateEl.dataset.userid = this.profileUserId || '';
            stateEl.dataset.loggedinuserid = this.currentUserId || '';
            stateEl.dataset.isuser = this.isOwnProfile ? 'true' : 'false';
        }
    }

    async loadUserInfo(api) {
        const titleEl = document.getElementById('inventory-title');
        
        try {
            if (api?.getUserInfo) {
                const userInfo = await api.getUserInfo(this.profileUserId);
                if (userInfo?.name) {
                    this.profileUsername = userInfo.name;
                    
                    if (titleEl) {
                        titleEl.textContent = `${userInfo.name}'s Inventory`;
                    }
                    document.title = `${userInfo.name}'s Inventory - ROBLOX`;
                    
                    const stateEl = document.getElementById('state-properties');
                    if (stateEl) stateEl.dataset.username = userInfo.name;
                }
            }
        } catch (e) {
            console.warn('[InventoryPage] Failed to get username:', e);
            if (titleEl) {
                titleEl.textContent = this.isOwnProfile ? 'My Inventory' : 'Inventory';
            }
        }
    }

    setupCategoryTabs() {
        const tabsContainer = document.getElementById('inventory-tabs');
        const dropdownMenu = document.getElementById('category-dropdown-menu');
        
        if (tabsContainer) {

            tabsContainer.innerHTML = '<h3 class="h3">Category</h3>';

            Object.entries(this.categories).forEach(([key, config]) => {
                const isActive = key === this.currentCategory;
                const tab = document.createElement('li');
                tab.className = `rbx-tab${isActive ? ' active' : ''}`;
                tab.dataset.category = key;
                tab.innerHTML = `
                    <a class="rbx-tab-heading">
                        <span class="rbx-lead">${config.label}</span>
                    </a>
                `;
                tab.addEventListener('click', () => this.switchCategory(key));
                tabsContainer.appendChild(tab);
            });
        }
        
        if (dropdownMenu) {
            dropdownMenu.innerHTML = '';
            Object.entries(this.categories).forEach(([key, config]) => {
                const item = document.createElement('li');
                item.dataset.category = key;
                item.innerHTML = `<a>${config.label}</a>`;
                item.addEventListener('click', () => {
                    this.switchCategory(key);
                    dropdownMenu.style.display = 'none';
                });
                dropdownMenu.appendChild(item);
            });
        }

        this.updateDropdownLabel();
    }

    updateDropdownLabel() {
        const label = document.getElementById('dropdown-label');
        const config = this.categories[this.currentCategory];
        if (label && config) {
            label.textContent = config.label;
        }
    }

    setupEventHandlers() {

        const dropdownBtn = document.getElementById('category-dropdown-btn');
        const dropdownMenu = document.getElementById('category-dropdown-menu');
        
        if (dropdownBtn && dropdownMenu) {
            dropdownBtn.addEventListener('click', () => {
                const isOpen = dropdownMenu.style.display === 'block';
                dropdownMenu.style.display = isOpen ? 'none' : 'block';
            });

            document.addEventListener('click', (e) => {
                if (!dropdownBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
                    dropdownMenu.style.display = 'none';
                }
            });
        }

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
    }

    async switchCategory(category) {
        if (category === this.currentCategory) return;
        
        this.currentCategory = category;
        this.currentPage = 1;

        this.pageCursors = {};
        this.gamePassCursors = {};

        const tabs = document.querySelectorAll('#inventory-tabs .rbx-tab');
        tabs.forEach(tab => {
            if (tab.dataset.category === category) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        this.updateDropdownLabel();

        const url = new URL(window.location);
        url.searchParams.set('category', category);
        window.history.pushState({}, '', url);

        await this.loadCategoryData();
    }

    async loadCategoryData() {
        this.showLoading();
        
        const config = this.categories[this.currentCategory];
        if (!config) {
            this.showError('Invalid category');
            return;
        }

        this.updateHeader(config);
        
        try {
            const api = window.roblox;
            if (!api) throw new Error('API not available');
            
            let result;
            
            if (config.isBadge) {
                result = await this.loadBadges(api);
            } else if (config.isPlace) {
                result = await this.loadPlaces(api);
            } else if (config.isCollectible) {
                result = await this.loadCollectibles(api);
            } else if (config.isGamePass) {
                result = await this.loadGamePasses(api);
            } else if (config.isBundle) {
                result = await this.loadBundles(api);
            } else {
                result = await this.loadInventoryItems(api, config.assetTypeId);
            }
            
            this.renderResults(result, config);

            if (config.showGetMore && result.data.length > 0) {
                this.loadRecommendations(api, config);
            } else {
                document.getElementById('recommendations-section').style.display = 'none';
            }
            
        } catch (error) {
            console.error('[InventoryPage] Failed to load data:', error);
            this.showError(error.message);
        }
    }

    updateHeader(config) {
        const titleEl = document.getElementById('category-title');
        const headerContent = document.getElementById('header-content');
        const sectionName = document.getElementById('section-name');
        const categoryHint = document.getElementById('category-name-hint');
        const getMoreBtn = document.getElementById('get-more-btn');
        
        if (titleEl) titleEl.textContent = config.label;
        if (categoryHint) categoryHint.textContent = config.label;
        
        if (headerContent) {
            headerContent.style.display = config.showGetMore ? '' : 'none';
        }
        
        if (sectionName) {
            sectionName.textContent = config.section;
        }
        
        if (getMoreBtn) {

            switch (config.section) {
                case 'Catalog':
                    getMoreBtn.href = `catalog.html?category=${this.currentCategory}`;
                    break;
                case 'Library':
                    getMoreBtn.href = `catalog.html?section=library&category=${this.currentCategory}`;
                    break;
                default:
                    getMoreBtn.href = 'catalog.html';
            }
        }
    }

    async loadInventoryItems(api, assetTypeId) {
        console.log('[InventoryPage] Loading inventory for assetTypeId:', assetTypeId);
        
        const cursor = this.currentPage > 1 ? this.pageCursors?.[this.currentPage - 1] : null;
        let result;
        let items = [];
        let nextCursor = null;

        if (api.getUserInventory) {
            try {
                result = await api.getUserInventory(this.profileUserId, assetTypeId, this.itemsPerPage, cursor);
                console.log('[InventoryPage] getUserInventory result:', result);
                if (result?.data) {
                    items = result.data;
                    nextCursor = result.nextPageCursor;
                }
            } catch (e) {
                console.warn('[InventoryPage] getUserInventory failed:', e.message);
            }
        }

        if (items.length === 0 && this.isOwnProfile && api.getAvatarInventory) {
            try {
                result = await api.getAvatarInventory({
                    assetTypeId: assetTypeId,
                    limit: this.itemsPerPage,
                    pageToken: cursor
                });
                console.log('[InventoryPage] getAvatarInventory result:', result);

                if (result?.avatarInventoryItems) {
                    items = result.avatarInventoryItems.map(item => ({
                        assetId: item.itemId,
                        id: item.itemId,
                        name: item.itemName,
                        assetName: item.itemName,
                        assetType: assetTypeId,

                        creator: item.creatorName ? { name: item.creatorName } : null,

                        isLimited: item.availabilityStatus === 'Limited',
                        isLimitedUnique: item.availabilityStatus === 'LimitedUnique',
                        collectibleItemType: item.availabilityStatus
                    }));
                    nextCursor = result.nextPageToken;
                }
            } catch (e) {
                console.warn('[InventoryPage] getAvatarInventory failed:', e.message);
            }
        }
        
        if (items.length === 0 && !result) {
            throw new Error('Could not load inventory - no available API method');
        }

        if (!this.pageCursors) this.pageCursors = {};
        if (nextCursor) {
            this.pageCursors[this.currentPage] = nextCursor;
        }
        
        return {
            data: items,
            total: items.length,
            hasMore: !!nextCursor
        };
    }

    async loadBadges(api) {
        if (!api.getUserBadges) {
            throw new Error('getUserBadges not available');
        }
        
        const result = await api.getUserBadges(this.profileUserId, this.itemsPerPage);
        
        return {
            data: result?.data || [],
            total: result?.data?.length || 0,
            hasMore: !!result?.nextPageCursor,
            isBadge: true
        };
    }

    async loadPlaces(api) {
        if (!api.getUserGames) {
            throw new Error('getUserGames not available');
        }
        
        const result = await api.getUserGames(this.profileUserId, this.itemsPerPage);
        
        return {
            data: result?.data || [],
            total: result?.data?.length || 0,
            hasMore: !!result?.nextPageCursor,
            isPlace: true
        };
    }

    async loadCollectibles(api) {
        if (!api.getUserCollectibles) {
            throw new Error('getUserCollectibles not available');
        }
        
        const cursor = this.currentPage > 1 ? this.pageCursors?.[this.currentPage - 1] : null;
        const result = await api.getUserCollectibles(this.profileUserId, this.itemsPerPage, cursor);

        if (!this.pageCursors) this.pageCursors = {};
        if (result?.nextPageCursor) {
            this.pageCursors[this.currentPage] = result.nextPageCursor;
        }
        
        return {
            data: result?.data || [],
            total: result?.data?.length || 0,
            hasMore: !!result?.nextPageCursor,
            isCollectible: true
        };
    }

    async loadBundles(api) {
        if (!api.getUserBundles) {
            throw new Error('getUserBundles not available');
        }
        
        console.log('[InventoryPage] Loading bundles for user:', this.profileUserId);
        
        const cursor = this.currentPage > 1 ? this.pageCursors?.[this.currentPage - 1] : '';
        const result = await api.getUserBundles(this.profileUserId, this.itemsPerPage, cursor);
        
        console.log('[InventoryPage] getUserBundles result:', result);

        const bundles = (result?.data || []).map(bundle => ({
            assetId: bundle.id,
            id: bundle.id,
            name: bundle.name,
            assetName: bundle.name,
            bundleType: bundle.bundleType,
            creator: bundle.creator || { name: 'ROBLOX' }
        }));

        if (!this.pageCursors) this.pageCursors = {};
        if (result?.nextPageCursor) {
            this.pageCursors[this.currentPage] = result.nextPageCursor;
        }
        
        return {
            data: bundles,
            total: bundles.length,
            hasMore: !!result?.nextPageCursor,
            isBundle: true
        };
    }

    async loadGamePasses(api) {
        console.log('[InventoryPage] Loading game passes for user:', this.profileUserId, 'page:', this.currentPage);
        
        try {

            if (api.getUserGamePasses) {

                const exclusiveStartId = this.currentPage > 1 ? this.gamePassCursors?.[this.currentPage - 1] : '';
                
                const result = await api.getUserGamePasses(this.profileUserId, this.itemsPerPage, exclusiveStartId);
                console.log('[InventoryPage] getUserGamePasses result:', result);
                
                const gamePasses = [];
                let nextCursor = '';
                
                if (result?.gamePasses && result.gamePasses.length > 0) {
                    for (const pass of result.gamePasses) {
                        gamePasses.push({
                            id: pass.id || pass.gamePassId,
                            assetId: pass.id || pass.gamePassId,
                            name: pass.name || pass.displayName || 'Game Pass',
                            creatorName: pass.creator?.name || pass.gameName || 'Unknown Game',
                            price: pass.price?.inRobux ?? pass.priceInRobux ?? pass.price,
                            iconAssetId: pass.iconAssetId
                        });
                    }

                    const lastPass = result.gamePasses[result.gamePasses.length - 1];
                    const lastId = lastPass?.id || lastPass?.gamePassId;

                    if (result.gamePasses.length >= this.itemsPerPage && lastId) {
                        nextCursor = lastId.toString();
                    }
                }

                if (!this.gamePassCursors) this.gamePassCursors = {};
                if (nextCursor) {
                    this.gamePassCursors[this.currentPage] = nextCursor;
                }
                
                if (gamePasses.length > 0) {
                    console.log('[InventoryPage] Found', gamePasses.length, 'game passes on page', this.currentPage);
                    return {
                        data: gamePasses,
                        total: gamePasses.length,
                        hasMore: !!nextCursor,
                        isGamePass: true
                    };
                }

                return {
                    data: [],
                    total: 0,
                    hasMore: false,
                    isGamePass: true
                };
            }

            console.log('[InventoryPage] Falling back to game-based lookup');
            const fallbackPasses = await this.getOwnedGamePasses(api);
            
            if (fallbackPasses.length > 0) {
                return {
                    data: fallbackPasses,
                    total: fallbackPasses.length,
                    hasMore: false,
                    isGamePass: true
                };
            }

            return {
                data: [],
                total: 0,
                hasMore: false,
                isGamePass: true
            };
            
        } catch (error) {
            console.error('[InventoryPage] Failed to load game passes:', error);

            if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
                return {
                    data: [],
                    total: 0,
                    hasMore: false,
                    isGamePass: true,
                    notSupported: true,
                    notSupportedMessage: 'Game pass inventory is private or restricted'
                };
            }
            
            return {
                data: [],
                total: 0,
                hasMore: false,
                isGamePass: true,
                notSupported: true,
                notSupportedMessage: 'Could not load game passes. Try again later.'
            };
        }
    }
    
    async getOwnedGamePasses(api) {
        const gamePasses = [];
        
        try {

            let games = [];
            
            if (api.getUserGames) {
                const result = await api.getUserGames(this.profileUserId, 25);
                games = result?.data || [];
            }
            
            if (games.length === 0) {
                console.log('[InventoryPage] User has no games, cannot check game passes');
                return [];
            }

            for (const game of games.slice(0, 10)) { 
                const universeId = game.id || game.universeId;
                if (!universeId) continue;
                
                try {

                    if (api.getGamePasses) {
                        const passesResult = await api.getGamePasses(universeId, 50);
                        const passes = passesResult?.gamePasses || passesResult?.data || [];
                        
                        for (const pass of passes) {
                            const passId = pass.id || pass.gamePassId;
                            if (!passId) continue;

                            try {
                                if (api.userOwnsItem) {
                                    const ownsResult = await api.userOwnsItem(this.profileUserId, 'GamePass', passId);
                                    if (ownsResult?.data?.length > 0) {
                                        gamePasses.push({
                                            id: passId,
                                            assetId: passId,
                                            name: pass.name || pass.displayName || 'Game Pass',
                                            creatorName: game.name || 'Unknown Game',
                                            price: pass.price?.inRobux || pass.priceInRobux || pass.price
                                        });
                                    }
                                }
                            } catch (e) {

                                console.warn('[InventoryPage] Failed to check ownership for pass', passId, ':', e.message);
                            }
                        }
                    }
                } catch (e) {

                    console.warn('[InventoryPage] Failed to get game passes for universe', universeId, ':', e.message);
                }
            }
        } catch (e) {
            console.warn('[InventoryPage] Failed to get owned game passes:', e);
        }
        
        return gamePasses;
    }

    renderResults(result, config) {
        const container = document.getElementById('inventory-items');
        const loadingEl = document.getElementById('inventory-loading');
        const emptyEl = document.getElementById('inventory-empty');
        const resultsInfo = document.getElementById('results-info');

        if (loadingEl) loadingEl.style.display = 'none';

        const displayData = result.data.slice(0, this.displayPerPage);

        if (resultsInfo) {
            const start = (this.currentPage - 1) * this.displayPerPage + 1;
            const end = start + displayData.length - 1;
            if (displayData.length > 0) {
                resultsInfo.textContent = `Showing ${start} - ${end} results`;
            } else {
                resultsInfo.textContent = 'Showing 0 results';
            }
        }

        if (!displayData || displayData.length === 0) {
            if (container) container.innerHTML = '';
            if (emptyEl) {
                const userText = document.getElementById('empty-user-text');
                const categoryName = document.getElementById('empty-category-name');
                const catalogHint = document.getElementById('empty-catalog-hint');
                const catalogLink = document.getElementById('empty-catalog-link');

                if (result.notSupported) {
                    if (userText) {
                        userText.textContent = result.notSupportedMessage || 'Game pass inventory';
                    }
                    if (categoryName) {
                        categoryName.textContent = result.notSupportedMessage ? '' : 'is not available through the API';
                    }
                    if (catalogHint) {
                        catalogHint.style.display = 'none';
                    }
                } else {
                    if (userText) {
                        userText.textContent = this.isOwnProfile ? 'You have' : 'This user has';
                    }
                    if (categoryName) {
                        categoryName.textContent = config.label.toLowerCase();
                    }
                    if (catalogHint) {
                        catalogHint.style.display = config.showGetMore ? '' : 'none';
                    }
                    if (catalogLink) {
                        catalogLink.textContent = config.section;
                    }
                }
                
                emptyEl.style.display = 'block';
            }
            this.updatePagination(0, false);
            return;
        }
        
        if (emptyEl) emptyEl.style.display = 'none';

        if (container) {
            if (result.isPlace) {
                container.innerHTML = displayData.map(item => this.renderPlaceItem(item)).join('');
            } else if (result.isBadge) {
                container.innerHTML = displayData.map(item => this.renderBadgeItem(item)).join('');
            } else if (result.isCollectible) {
                container.innerHTML = displayData.map(item => this.renderCollectibleItem(item)).join('');
            } else if (result.isGamePass) {
                container.innerHTML = displayData.map(item => this.renderGamePassItem(item)).join('');
            } else {
                container.innerHTML = displayData.map(item => this.renderInventoryItem(item, config)).join('');
            }

            this.loadThumbnails(displayData, result.isPlace, result.isBadge, result.isGamePass);

            if (!result.isPlace && !result.isBadge) {
                this.fetchItemPrices(displayData);
            }
        }

        this.totalItems = result.total;
        this.updatePagination(result.total, result.hasMore);
    }

    renderInventoryItem(item, config) {
        const assetId = item.assetId || item.id;
        const name = item.name || item.assetName || 'Unknown Item';
        const creatorName = item.creator?.name || item.creatorName || 'ROBLOX';
        const price = item.price ?? item.priceInRobux ?? item.lowestPrice ?? item.lowestResalePrice;
        const serialNumber = item.serialNumber;
        const isLimited = item.isLimited || item.collectibleItemType === 'Limited';
        const isLimitedU = item.isLimitedUnique || item.collectibleItemType === 'LimitedUnique';
        
        let limitedBadge = '';
        if (isLimitedU) {
            limitedBadge = '<span class="item-overlay rbx-icon-limited-unique-label"></span>';
        } else if (isLimited) {
            limitedBadge = '<span class="item-overlay rbx-icon-limited-label"></span>';
        }
        
        let serialBadge = '';
        if (serialNumber) {
            serialBadge = `<div class="item-serial-number rbx-font-xs">#${serialNumber}</div>`;
        }

        const isForSale = item.isForSale !== false && item.itemStatus !== 'Off Sale' && item.saleStatus !== 'OffSale';
        let priceHtml = '';
        if (price !== null && price !== undefined && price > 0) {
            priceHtml = `
                <span class="inventory-cost rbx-font-xs" data-asset-id="${assetId}">
                    <span class="rbx-icon-robux"></span>
                    <span class="inventory-cost-text">${this.formatNumber(price)}</span>
                </span>
            `;
        } else if (price === 0 && isForSale) {

            priceHtml = `
                <span class="inventory-cost rbx-font-xs" data-asset-id="${assetId}">
                    <span class="inventory-cost-text">Free</span>
                </span>
            `;
        } else {

            priceHtml = `<span class="inventory-cost rbx-font-xs inventory-hide" data-asset-id="${assetId}"></span>`;
        }
        
        return `
            <li class="list-item inventory-item" data-item-id="${assetId}">
                <a href="item.html?id=${assetId}" class="inventory-item-link">
                    <span class="item-thumb">
                        ${serialBadge}
                        <img src="${this.ITEM_PLACEHOLDER}" alt="${this.escapeHtml(name)}" data-asset-id="${assetId}"/>
                        ${limitedBadge}
                    </span>
                    <span class="inventory-name rbx-font-xs rbx-text-overflow">${this.escapeHtml(name)}</span>
                    <span class="inventory-creator rbx-font-xs rbx-text-overflow">
                        <span class="inventory-creator-by">By:</span> ${this.escapeHtml(creatorName)}
                    </span>
                    ${priceHtml}
                </a>
            </li>
        `;
    }

    renderCollectibleItem(item) {
        const assetId = item.assetId || item.id;
        const name = item.name || item.assetName || 'Unknown Item';
        const creatorName = item.creator?.name || item.creatorName || 'ROBLOX';
        const serialNumber = item.serialNumber;
        const isLimited = item.isLimited || item.collectibleItemType === 'Limited';
        const isLimitedU = item.isLimitedUnique || item.collectibleItemType === 'LimitedUnique';
        const price = item.recentAveragePrice || item.lowestResalePrice || item.lowestPrice || item.price;
        
        let limitedBadge = '';
        if (isLimitedU) {
            limitedBadge = '<span class="item-overlay rbx-icon-limited-unique-label"></span>';
        } else if (isLimited) {
            limitedBadge = '<span class="item-overlay rbx-icon-limited-label"></span>';
        }
        
        let serialBadge = '';
        if (serialNumber) {
            serialBadge = `<div class="item-serial-number rbx-font-xs">#${serialNumber}</div>`;
        }

        let priceHtml = '';
        if (price !== null && price !== undefined && price > 0) {
            priceHtml = `
                <span class="inventory-cost rbx-font-xs" data-asset-id="${assetId}">
                    <span class="rbx-icon-robux"></span>
                    <span class="inventory-cost-text">${this.formatNumber(price)}</span>
                </span>
            `;
        } else {

            priceHtml = `<span class="inventory-cost rbx-font-xs inventory-hide" data-asset-id="${assetId}"></span>`;
        }
        
        return `
            <li class="list-item inventory-item" data-item-id="${assetId}">
                <a href="item.html?id=${assetId}" class="inventory-item-link">
                    <span class="item-thumb">
                        ${serialBadge}
                        <img src="${this.ITEM_PLACEHOLDER}" alt="${this.escapeHtml(name)}" data-asset-id="${assetId}"/>
                        ${limitedBadge}
                    </span>
                    <span class="inventory-name rbx-font-xs rbx-text-overflow">${this.escapeHtml(name)}</span>
                    <span class="inventory-creator rbx-font-xs rbx-text-overflow">
                        <span class="inventory-creator-by">By:</span> ${this.escapeHtml(creatorName)}
                    </span>
                    ${priceHtml}
                </a>
            </li>
        `;
    }

    renderGamePassItem(item) {
        const gamePassId = item.assetId || item.id;
        const name = item.name || item.assetName || 'Unknown Game Pass';
        const gameName = item.creator?.name || item.creatorName || 'Unknown Game';
        
        return `
            <li class="list-item inventory-item gamepass-item">
                <a href="catalog.html?id=${gamePassId}&type=gamepass" class="inventory-item-link">
                    <span class="item-thumb">
                        <img src="${this.ITEM_PLACEHOLDER}" alt="${this.escapeHtml(name)}" data-gamepass-id="${gamePassId}"/>
                    </span>
                    <span class="inventory-name rbx-font-xs rbx-text-overflow">${this.escapeHtml(name)}</span>
                    <span class="inventory-creator rbx-font-xs rbx-text-overflow">
                        <span class="inventory-creator-by">Game:</span> ${this.escapeHtml(gameName)}
                    </span>
                </a>
            </li>
        `;
    }

    renderPlaceItem(item) {
        const placeId = item.rootPlace?.id || item.rootPlaceId || item.placeId || item.id;
        const universeId = item.id || item.universeId;
        const name = item.name || 'Unknown Place';
        const creatorName = item.creator?.name || 'Unknown';
        
        return `
            <li class="list-item inventory-item place-item">
                <a href="game-detail.html?placeId=${placeId}" class="inventory-item-link">
                    <span class="item-thumb">
                        <img src="${this.GAME_PLACEHOLDER}" alt="${this.escapeHtml(name)}" data-universe-id="${universeId}"/>
                    </span>
                    <span class="inventory-name rbx-font-xs rbx-text-overflow">${this.escapeHtml(name)}</span>
                    <span class="inventory-creator rbx-font-xs rbx-text-overflow">
                        <span class="inventory-creator-by">Owner:</span> ${this.escapeHtml(creatorName)}
                    </span>
                </a>
            </li>
        `;
    }

    renderBadgeItem(item) {
        const badgeId = item.id || item.badgeId;
        const name = item.name || 'Unknown Badge';
        const awardingUniverse = item.awardingUniverse?.name || item.awarder?.name || '';
        
        return `
            <li class="list-item inventory-item">
                <a href="#" class="inventory-item-link">
                    <span class="item-thumb">
                        <img src="${this.ITEM_PLACEHOLDER}" alt="${this.escapeHtml(name)}" data-badge-id="${badgeId}"/>
                    </span>
                    <span class="inventory-name rbx-font-xs rbx-text-overflow">${this.escapeHtml(name)}</span>
                    <span class="inventory-creator rbx-font-xs rbx-text-overflow">
                        <span class="inventory-creator-by">From:</span> ${this.escapeHtml(awardingUniverse)}
                    </span>
                </a>
            </li>
        `;
    }

    async loadThumbnails(items, isPlace, isBadge, isGamePass) {
        const api = window.roblox;
        if (!api) return;
        
        try {
            if (isPlace) {

                if (api.getUniverseThumbnails) {
                    const universeIds = items.map(i => i.id || i.universeId).filter(Boolean);
                    if (universeIds.length > 0) {
                        const result = await api.getUniverseThumbnails(universeIds, '150x150', 'Icon');
                        this.applyThumbnails(result?.data, 'data-universe-id');
                    }
                }
            } else if (isBadge) {

                if (api.getBadgeThumbnails) {
                    const badgeIds = items.map(i => i.id || i.badgeId).filter(Boolean);
                    if (badgeIds.length > 0) {
                        const result = await api.getBadgeThumbnails(badgeIds, '150x150');
                        this.applyThumbnails(result?.data, 'data-badge-id');
                    }
                }
            } else if (isGamePass) {

                if (api.getGamePassIcons) {
                    const gamePassIds = items.map(i => i.assetId || i.id).filter(Boolean);
                    if (gamePassIds.length > 0) {
                        const result = await api.getGamePassIcons(gamePassIds, '150x150');
                        this.applyThumbnails(result?.data, 'data-gamepass-id');
                    }
                }
            } else if (this.currentCategory === 'packages') {

                if (api.getBundleThumbnails) {
                    const bundleIds = items.map(i => i.assetId || i.id).filter(Boolean);
                    if (bundleIds.length > 0) {
                        const result = await api.getBundleThumbnails(bundleIds, '150x150');
                        this.applyThumbnails(result?.data, 'data-asset-id');
                    }
                }
            } else {

                if (api.getAssetThumbnails) {
                    const assetIds = items.map(i => i.assetId || i.id).filter(Boolean);
                    if (assetIds.length > 0) {
                        const result = await api.getAssetThumbnails(assetIds, '150x150');
                        this.applyThumbnails(result?.data, 'data-asset-id');
                    }
                }
            }
        } catch (e) {
            console.warn('[InventoryPage] Failed to load thumbnails:', e);
        }
    }

    applyThumbnails(data, dataAttr) {
        if (!data) return;
        
        data.forEach(item => {
            if (item.imageUrl && item.targetId) {
                const imgs = document.querySelectorAll(`img[${dataAttr}="${item.targetId}"]`);
                imgs.forEach(img => {
                    img.src = item.imageUrl;
                });
            }
        });
    }

    async fetchItemPrices(items) {
        const api = window.roblox;
        if (!api?.getAssetEconomyDetails && !api?.getCatalogItemDetails) return;
        
        console.log('[InventoryPage] Fetching prices for', items.length, 'items');

        if (api.getCatalogItemDetails) {
            try {
                const assetIds = items.map(i => i.assetId || i.id).filter(Boolean);
                const itemRequests = assetIds.map(id => ({ itemType: 'Asset', id }));
                
                const result = await api.getCatalogItemDetails(itemRequests);
                if (result?.data) {
                    result.data.forEach(itemData => {
                        const assetId = itemData.id || itemData.assetId;
                        const price = itemData.price ?? itemData.lowestPrice ?? itemData.lowestResalePrice;
                        const isForSale = itemData.isForSale !== false && itemData.itemStatus !== 'Off Sale' && itemData.saleStatus !== 'OffSale';
                        
                        if (price !== null && price !== undefined) {
                            this.updateItemPrice(assetId, price, isForSale);
                        }
                    });
                }
            } catch (e) {
                console.warn('[InventoryPage] getCatalogItemDetails failed:', e.message);
            }
        }

        if (api.getAssetEconomyDetails) {
            const limitedItems = items.filter(item => {
                const isLimited = item.isLimited || item.isLimitedUnique || 
                    item.collectibleItemType === 'Limited' || item.collectibleItemType === 'LimitedUnique';
                return isLimited;
            });

            const batchSize = 5;
            for (let i = 0; i < limitedItems.length; i += batchSize) {
                const batch = limitedItems.slice(i, i + batchSize);
                await Promise.all(batch.map(async (item) => {
                    const assetId = item.assetId || item.id;
                    try {
                        const economyData = await api.getAssetEconomyDetails(assetId);
                        if (economyData) {

                            const price = economyData.LowestSellerPrice || economyData.lowestSellerPrice || 
                                economyData.PriceInRobux || economyData.priceInRobux;
                            if (price && price > 0) {
                                this.updateItemPrice(assetId, price);
                            }
                        }
                    } catch (e) {

                    }
                }));
            }
        }
    }

    updateItemPrice(assetId, price, isForSale = true) {
        const priceEl = document.querySelector(`.inventory-cost[data-asset-id="${assetId}"]`);
        if (!priceEl) return;

        if (price === 0 && !isForSale) {
            return;
        }

        priceEl.classList.remove('inventory-hide');
        
        if (price === 0 && isForSale) {
            priceEl.innerHTML = '<span class="inventory-cost-text">Free</span>';
        } else if (price > 0) {
            priceEl.innerHTML = `
                <span class="rbx-icon-robux"></span>
                <span class="inventory-cost-text">${this.formatNumber(price)}</span>
            `;
        }
    }

    async loadRecommendations(api, config) {
        const section = document.getElementById('recommendations-section');
        const container = document.getElementById('recommended-items');
        const categoryName = document.getElementById('recommended-category-name');
        const seeAllBtn = document.getElementById('see-all-btn');
        
        if (!section || !container) return;

        if (categoryName) {
            categoryName.textContent = config.label;
        }

        if (seeAllBtn) {
            seeAllBtn.href = `catalog.html?category=${this.currentCategory}`;
        }
        
        try {

            if (api.getCatalogItems) {
                const result = await api.getCatalogItems({
                    category: config.assetTypeId,
                    limit: 6,
                    sortType: 'Relevance'
                });
                
                if (result?.data && result.data.length > 0) {
                    container.innerHTML = result.data.map(item => this.renderRecommendedItem(item)).join('');
                    section.style.display = 'block';

                    const assetIds = result.data.map(i => i.id).filter(Boolean);
                    if (assetIds.length > 0 && api.getAssetThumbnails) {
                        const thumbResult = await api.getAssetThumbnails(assetIds, '150x150');
                        this.applyThumbnails(thumbResult?.data, 'data-rec-asset-id');
                    }
                    return;
                }
            }

            section.style.display = 'none';
        } catch (e) {
            console.warn('[InventoryPage] Failed to load recommendations:', e);
            section.style.display = 'none';
        }
    }

    renderRecommendedItem(item) {
        const assetId = item.id || item.assetId;
        const name = item.name || 'Unknown Item';
        const creatorName = item.creator?.name || item.creatorName || 'ROBLOX';
        
        return `
            <li class="list-item recommended-item">
                <a href="catalog.html?id=${assetId}" class="recommended-item-link">
                    <span class="recommended-thumb">
                        <img src="${this.ITEM_PLACEHOLDER}" alt="${this.escapeHtml(name)}" data-rec-asset-id="${assetId}"/>
                    </span>
                    <span class="recommended-name rbx-font-xs rbx-text-overflow">${this.escapeHtml(name)}</span>
                    <span class="recommended-creator rbx-font-xs rbx-text-overflow">
                        <span class="recommended-creator-by">By:</span> ${this.escapeHtml(creatorName)}
                    </span>
                </a>
            </li>
        `;
    }

    updatePagination(total, hasMore) {
        const pager = document.getElementById('pager');
        const pageInput = document.getElementById('page-input');
        const totalPagesEl = document.getElementById('total-pages');

        const totalPages = hasMore ? Math.max(this.currentPage + 1, Math.ceil(total / this.displayPerPage)) : this.currentPage;
        
        if (totalPages <= 1 && !hasMore) {
            if (pager) pager.style.display = 'none';
            return;
        }
        
        if (pager) pager.style.display = '';
        if (pageInput) pageInput.value = this.currentPage;
        if (totalPagesEl) totalPagesEl.textContent = hasMore ? `${totalPages}+` : totalPages;

        const prevBtn = document.getElementById('prev-page-btn');
        const nextBtn = document.getElementById('next-page-btn');
        
        if (prevBtn) {
            prevBtn.style.opacity = this.currentPage <= 1 ? '0.5' : '1';
            prevBtn.style.pointerEvents = this.currentPage <= 1 ? 'none' : 'auto';
        }
        
        if (nextBtn) {
            const canGoNext = hasMore || this.currentPage < totalPages;
            nextBtn.style.opacity = canGoNext ? '1' : '0.5';
            nextBtn.style.pointerEvents = canGoNext ? 'auto' : 'none';
        }
    }

    changePage(delta) {
        const newPage = this.currentPage + delta;
        if (newPage >= 1) {
            this.goToPage(newPage);
        }
    }

    goToPage(page) {
        if (page < 1) page = 1;
        
        if (page !== this.currentPage) {
            this.currentPage = page;
            this.loadCategoryData();
        }
    }

    showLoading() {
        const loadingEl = document.getElementById('inventory-loading');
        const container = document.getElementById('inventory-items');
        const emptyEl = document.getElementById('inventory-empty');
        
        if (loadingEl) loadingEl.style.display = 'block';
        if (container) container.innerHTML = '';
        if (emptyEl) emptyEl.style.display = 'none';
    }

    showError(message) {
        const loadingEl = document.getElementById('inventory-loading');
        const container = document.getElementById('inventory-items');
        const emptyEl = document.getElementById('inventory-empty');
        
        if (loadingEl) loadingEl.style.display = 'none';
        if (emptyEl) emptyEl.style.display = 'none';
        
        if (container) {
            container.innerHTML = `
                <div class="section" style="text-align: center; padding: 40px;">
                    <span class="rbx-text-danger">Failed to load inventory: ${this.escapeHtml(message)}</span>
                </div>
            `;
        }
    }

    formatNumber(num) {
        if (num >= 1000000000) {
            return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
        }
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        }
        return num.toLocaleString();
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

window.initInventoryPage = function(userId, category) {
    const renderer = new InventoryPageRenderer();
    renderer.init(userId, category);
    window.inventoryPageRenderer = renderer;
};

