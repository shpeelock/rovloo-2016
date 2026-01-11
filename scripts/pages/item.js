class ItemPageRenderer {
    constructor() {
        this.itemId = null;
        this.itemType = 'asset'; 
        this.itemData = null;
        this.currentUserId = null;
        this.isOwned = false;
        this.isFavorited = false;
        this.pendingChallengeData = null; 
        this.pendingResellerPurchase = null; 
        this.currentResellers = null; 
        this.currentResellersPage = 1;
        this.resellersPerPage = 10;
        this.collectibleItemId = null; 
        this.totalQuantity = null; 

        this.assetTypes = {
            2: 'T-Shirt',
            8: 'Hat',
            11: 'Shirt',
            12: 'Pants',
            17: 'Head',
            18: 'Face',
            19: 'Gear',
            27: 'Torso',
            28: 'Right Arm',
            29: 'Left Arm',
            30: 'Right Leg',
            31: 'Left Leg',
            32: 'Package',
            41: 'Hair Accessory',
            42: 'Face Accessory',
            43: 'Neck Accessory',
            44: 'Shoulder Accessory',
            45: 'Front Accessory',
            46: 'Back Accessory',
            47: 'Waist Accessory'
        };
    }

    async init(itemId, itemType = 'asset') {
        console.log(`[ItemPage] Initializing ${itemType} with ID:`, itemId);

        this.itemId = parseInt(itemId, 10);
        this.itemType = itemType;
        
        if (isNaN(this.itemId)) {
            console.error('[ItemPage] Invalid item ID:', itemId);
            this.showError('Invalid item ID');
            return;
        }

        try {

            let api = window.roblox;
            
            console.log('[ItemPage] API check:', {
                robloxAPI: !!window.robloxAPI,
                roblox: !!window.roblox,
                RobloxClient: !!window.RobloxClient,
                RobloxClientApi: !!window.RobloxClient?.api
            });
            
            if (!api) {
                console.warn('[ItemPage] window.roblox not immediately available, waiting...');

                await new Promise(resolve => setTimeout(resolve, 500));
                api = window.roblox;
            }
            
            if (!api) {
                console.error('[ItemPage] window.roblox not available after waiting');
            } else {
                console.log('[ItemPage] API methods available:', Object.keys(api).filter(k => typeof api[k] === 'function').slice(0, 30));
                console.log('[ItemPage] Has getCatalogItemDetails:', typeof api.getCatalogItemDetails);
            }

            if (api) {
                try {
                    const currentUser = await api.getCurrentUser();
                    if (currentUser) {
                        this.currentUserId = currentUser.id;
                    }
                } catch (e) {
                    console.log('[ItemPage] User not logged in');
                }
            }

            switch (this.itemType) {
                case 'badge':
                    await this.loadBadgeData(api);
                    break;
                case 'gamepass':
                    await this.loadGamePassData(api);
                    break;
                case 'bundle':
                    await this.loadBundleData(api);
                    break;
                default:
                    await this.loadAssetData(api);
            }

            this.setupEventHandlers();

            if (api && (this.itemType === 'asset' || this.itemType === 'bundle')) {
                await this.loadRecommendations(api);
            } else {

                const tabsSection = document.getElementById('Tabs');
                if (tabsSection) {
                    tabsSection.style.display = 'none';
                }
            }
            
            console.log('[ItemPage] Initialization complete');
        } catch (error) {
            console.error('[ItemPage] Initialization failed:', error);
            this.showError(error.message);
        }
    }

    async loadAssetData(api) {
        try {
            let itemData = null;

            if (!itemData && api && api.getCatalogItemDetails) {
                try {

                    const items = [{ itemType: 'Asset', id: this.itemId }];
                    const result = await api.getCatalogItemDetails(items);
                    console.log('[ItemPage] getCatalogItemDetails result:', result);
                    if (result?.data && result.data.length > 0) {
                        itemData = result.data[0];
                    }
                } catch (e) {
                    console.warn('[ItemPage] getCatalogItemDetails failed:', e);
                }
            }

            if (!itemData && api && api.getBundleDetails) {
                try {
                    const bundleResult = await api.getBundleDetails(this.itemId);
                    console.log('[ItemPage] getBundleDetails (Bundle fallback) result:', bundleResult);
                    if (bundleResult && bundleResult.id) {

                        console.log('[ItemPage] Item is a bundle, switching to bundle loader');
                        this.itemType = 'bundle';
                        return await this.loadBundleData(api);
                    }
                } catch (e) {
                    console.warn('[ItemPage] getBundleDetails (Bundle fallback) failed:', e);
                }
            }

            if (!itemData && api && api.getAssetDetails) {
                try {
                    const result = await api.getAssetDetails([this.itemId]);
                    console.log('[ItemPage] getAssetDetails result:', result);
                    if (result?.data && result.data.length > 0) {
                        const data = result.data[0];

                        if (data.name || data.Name || data.assetId) {
                            itemData = data;

                            if (!itemData.name && itemData.Name) itemData.name = itemData.Name;
                        }
                    }
                } catch (e) {
                    console.warn('[ItemPage] getAssetDetails failed:', e);
                }
            }

            if (!itemData && api && api.getAssetInfo) {
                try {
                    itemData = await api.getAssetInfo(this.itemId);
                    console.log('[ItemPage] getAssetInfo result:', itemData);
                } catch (e) {
                    console.warn('[ItemPage] getAssetInfo failed:', e);
                }
            }

            if (itemData && api && api.getSingleCatalogItemDetails) {
                try {
                    const singleDetails = await api.getSingleCatalogItemDetails(this.itemId, 'Asset');
                    console.log('[ItemPage] getSingleCatalogItemDetails result:', singleDetails);
                    if (singleDetails) {

                        if (singleDetails.itemCreatedUtc) itemData.created = singleDetails.itemCreatedUtc;
                        else if (singleDetails.createdUtc) itemData.created = singleDetails.createdUtc;
                        else if (singleDetails.created) itemData.created = singleDetails.created;
                        
                        if (singleDetails.itemUpdatedUtc) itemData.updated = singleDetails.itemUpdatedUtc;
                        else if (singleDetails.updatedUtc) itemData.updated = singleDetails.updatedUtc;
                        else if (singleDetails.updated) itemData.updated = singleDetails.updated;
                    }
                } catch (e) {
                    console.warn('[ItemPage] getSingleCatalogItemDetails failed:', e);
                }
            }

            if (itemData && api && api.getAssetEconomyDetails) {
                try {
                    const economyData = await api.getAssetEconomyDetails(this.itemId);
                    console.log('[ItemPage] getAssetEconomyDetails result:', economyData);
                    if (economyData) {
                        if (economyData.Created) itemData.created = economyData.Created;
                        if (economyData.Updated) itemData.updated = economyData.Updated;
                        if (economyData.Sales !== undefined) itemData.sales = economyData.Sales;

                        if (economyData.CollectibleItemId) itemData.collectibleItemId = economyData.CollectibleItemId;
                        if (economyData.CollectibleProductId) itemData.collectibleProductId = economyData.CollectibleProductId;
                        if (economyData.CollectiblesItemDetails) itemData.collectiblesItemDetails = economyData.CollectiblesItemDetails;
                        if (economyData.ProductId) itemData.productId = economyData.ProductId;
                        if (economyData.IsLimited !== undefined) itemData.isLimited = economyData.IsLimited;
                        if (economyData.IsLimitedUnique !== undefined) itemData.isLimitedUnique = economyData.IsLimitedUnique;
                        if (economyData.Remaining !== undefined) itemData.remaining = economyData.Remaining;
                        if (economyData.TotalQuantity !== undefined) itemData.totalQuantity = economyData.TotalQuantity;
                        if (economyData.LowestSellerPrice !== undefined) itemData.lowestResalePrice = economyData.LowestSellerPrice;
                        if (economyData.PriceInRobux !== undefined && itemData.price === undefined) itemData.price = economyData.PriceInRobux;
                    }
                } catch (e) {
                    console.warn('[ItemPage] getAssetEconomyDetails failed:', e);
                }
            }

            if (!itemData) {
                console.warn('[ItemPage] No API data available, using placeholder');
                itemData = {
                    id: this.itemId,
                    name: 'Item #' + this.itemId,
                    description: 'Item details could not be loaded.',
                    assetType: 8,
                    creatorName: 'ROBLOX',
                    creatorTargetId: 1,
                    price: 0,
                    isForSale: false,
                    created: new Date().toISOString(),
                    updated: new Date().toISOString()
                };
            }

            if (!itemData.updated && itemData.created) {
                itemData.updated = itemData.created;
            }
            
            this.itemData = itemData;
            document.title = `${itemData.name || 'Item'} - ROBLOX`;
            
            this.renderAssetDetails(itemData);
            await this.loadThumbnail(api, 'asset');
            await this.loadCreatorAvatar(api, itemData);
            
            if (this.currentUserId) {
                await this.checkOwnership(api, 'asset');
            }
            await this.loadFavoriteData(api);

            this.setupTryOn(itemData);

            if (itemData.isLimited || itemData.isLimitedUnique) {
                document.getElementById('PrivateSalesSection').style.display = 'block';

                this.collectibleItemId = itemData.collectibleItemId;
                this.totalQuantity = itemData.totalQuantity;
                await this.loadResellers(api);
            }
        } catch (error) {
            console.error('[ItemPage] Failed to load asset data:', error);
            throw error;
        }
    }

    setupTryOn(item) {
        const wearableTypes = [2, 8, 11, 12, 17, 18, 19, 41, 42, 43, 44, 45, 46, 47];
        const assetTypeId = item.assetType || item.assetTypeId;
        const isWearable = assetTypeId && wearableTypes.includes(assetTypeId);
        
        const tryOnActions = document.getElementById('TryOnActions');
        const tryOnBtn = document.getElementById('try-on-btn');
        
        if (!isWearable || !tryOnActions || !tryOnBtn) return;
        
        tryOnActions.style.display = 'block';
        
        tryOnBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await this.tryOnItem();
        });
    }

    async tryOnItem() {
        const tryOnBtn = document.getElementById('try-on-btn');
        const thumbEl = document.getElementById('item-thumbnail');
        if (!tryOnBtn || !this.itemData) return;

        if (tryOnBtn.dataset.previewMode === 'true') {
            if (thumbEl && thumbEl.dataset.originalSrc) {
                thumbEl.src = thumbEl.dataset.originalSrc;
            }
            tryOnBtn.textContent = 'Try On';
            tryOnBtn.dataset.previewMode = 'false';
            return;
        }
        
        const originalText = tryOnBtn.textContent;
        tryOnBtn.textContent = 'Trying on...';
        tryOnBtn.style.pointerEvents = 'none';
        
        try {
            const api = window.roblox || window.robloxAPI;
            if (!api) throw new Error('API not available');
            
            const currentUser = await api.getCurrentUser();
            if (!currentUser?.id) {
                throw new Error('Not logged in');
            }
            
            const currentAvatar = await api.getCurrentAvatarV2();
            if (!currentAvatar) {
                throw new Error('Failed to get current avatar');
            }

            const assetId = parseInt(this.itemId);
            const itemAssetType = this.itemData.assetType || this.itemData.assetTypeId;

            const singleSlotTypes = [
                17, 
                18, 
                2,  
                11, 
                12, 
                27, 
                28, 
                29, 
                30, 
                31, 
            ];

            let filteredAssets = (currentAvatar.assets || []).filter(a => {
                if (!a || !a.id || typeof a.id !== 'number') return false;

                if (singleSlotTypes.includes(itemAssetType)) {
                    const existingType = a.assetType?.id || a.assetTypeId;
                    if (existingType === itemAssetType) {
                        return false; 
                    }
                }
                return true;
            });
            
            const currentAssetIds = filteredAssets.map(a => a.id);

            if (currentAssetIds.includes(assetId)) {
                tryOnBtn.textContent = 'Already Wearing';
                setTimeout(() => {
                    tryOnBtn.textContent = originalText;
                    tryOnBtn.style.pointerEvents = 'auto';
                }, 2000);
                return;
            }

            const allAssetIds = [assetId, ...currentAssetIds];

            const bodyColors = currentAvatar.bodyColor3s ? {
                headColor: currentAvatar.bodyColor3s.headColor3 || 'F8F8F8',
                leftArmColor: currentAvatar.bodyColor3s.leftArmColor3 || 'F8F8F8',
                leftLegColor: currentAvatar.bodyColor3s.leftLegColor3 || 'F8F8F8',
                rightArmColor: currentAvatar.bodyColor3s.rightArmColor3 || 'F8F8F8',
                rightLegColor: currentAvatar.bodyColor3s.rightLegColor3 || 'F8F8F8',
                torsoColor: currentAvatar.bodyColor3s.torsoColor3 || 'F8F8F8'
            } : {
                headColor: 'F8F8F8',
                leftArmColor: 'F8F8F8',
                leftLegColor: 'F8F8F8',
                rightArmColor: 'F8F8F8',
                rightLegColor: 'F8F8F8',
                torsoColor: 'F8F8F8'
            };
            
            const scales = currentAvatar.scales || {
                height: 1,
                width: 1,
                head: 1,
                depth: 1,
                proportion: 0,
                bodyType: 0
            };
            
            const playerAvatarType = currentAvatar.playerAvatarType || 'R15';

            let result;
            try {

                result = await api.renderAvatarWithAssets(
                    assetId,
                    allAssetIds,
                    bodyColors,
                    scales,
                    playerAvatarType,
                    '420x420'
                );
            } catch (renderError) {

                console.warn('[ItemPage] Full render failed, trying with just the item:', renderError.message);
                result = await api.renderAvatarWithAssets(
                    assetId,
                    [assetId],
                    bodyColors,
                    scales,
                    playerAvatarType,
                    '420x420'
                );
            }
            
            if (result?.state === 'Completed' && result?.imageUrl) {
                if (thumbEl) {
                    if (!thumbEl.dataset.originalSrc) {
                        thumbEl.dataset.originalSrc = thumbEl.src;
                    }
                    thumbEl.src = result.imageUrl;
                }
                
                tryOnBtn.textContent = 'Take Off';
                tryOnBtn.dataset.previewMode = 'true';
                tryOnBtn.style.pointerEvents = 'auto';
            } else {
                console.warn('[ItemPage] Avatar render failed or pending:', result);
                tryOnBtn.textContent = 'Preview Failed';
                setTimeout(() => {
                    tryOnBtn.textContent = originalText;
                    tryOnBtn.style.pointerEvents = 'auto';
                }, 2000);
            }
            
        } catch (error) {
            console.error('[ItemPage] Try on error:', error);
            tryOnBtn.textContent = 'Error';
            setTimeout(() => {
                tryOnBtn.textContent = 'Try On';
                tryOnBtn.style.pointerEvents = 'auto';
            }, 2000);
        }
    }

    async loadBadgeData(api) {
        try {
            let badgeData = null;

            if (api && api.getBadge) {
                try {
                    badgeData = await api.getBadge(this.itemId);
                    console.log('[ItemPage] getBadge result:', badgeData);
                } catch (e) {
                    console.warn('[ItemPage] getBadge failed:', e);
                }
            }

            if (!badgeData && api && api.getBadgeInfo) {
                try {
                    badgeData = await api.getBadgeInfo(this.itemId);
                    console.log('[ItemPage] getBadgeInfo result:', badgeData);
                } catch (e) {
                    console.warn('[ItemPage] getBadgeInfo failed:', e);
                }
            }

            if (!badgeData) {
                console.warn('[ItemPage] No badge data available, using placeholder');
                badgeData = {
                    id: this.itemId,
                    name: 'Badge #' + this.itemId,
                    description: 'Badge details could not be loaded.',
                    displayName: 'Badge #' + this.itemId,
                    displayDescription: 'Badge details could not be loaded.',
                    enabled: true,
                    iconImageId: null,
                    displayIconImageId: null,
                    created: new Date().toISOString(),
                    updated: new Date().toISOString(),
                    statistics: {
                        pastDayAwardedCount: 0,
                        awardedCount: 0,
                        winRatePercentage: 0
                    },
                    awardingUniverse: {
                        id: 0,
                        name: 'Unknown Game',
                        rootPlaceId: 0
                    }
                };
            }
            
            this.itemData = badgeData;
            document.title = `${badgeData.displayName || badgeData.name || 'Badge'} - ROBLOX`;
            
            this.renderBadgeDetails(badgeData);
            await this.loadThumbnail(api, 'badge');

            if (badgeData.awardingUniverse?.id && api) {
                await this.loadGameCreatorAvatar(api, badgeData.awardingUniverse);
            }
            
            if (this.currentUserId) {
                await this.checkBadgeOwnership(api);
            }
        } catch (error) {
            console.error('[ItemPage] Failed to load badge data:', error);
            throw error;
        }
    }

    async loadGamePassData(api) {
        try {
            let passData = null;

            if (api && api.getGamePass) {
                try {
                    passData = await api.getGamePass(this.itemId);
                    console.log('[ItemPage] getGamePass result:', passData);
                } catch (e) {
                    console.warn('[ItemPage] getGamePass failed:', e);
                }
            }

            if (!passData && api && api.getGamePassInfo) {
                try {
                    passData = await api.getGamePassInfo(this.itemId);
                    console.log('[ItemPage] getGamePassInfo result:', passData);
                } catch (e) {
                    console.warn('[ItemPage] getGamePassInfo failed:', e);
                }
            }

            if (!passData && api && api.getGamePassDetails) {
                try {
                    passData = await api.getGamePassDetails(this.itemId);
                    console.log('[ItemPage] getGamePassDetails result:', passData);
                } catch (e) {
                    console.warn('[ItemPage] getGamePassDetails failed:', e);
                }
            }

            if (passData && !passData.id && passData.gamePassId) {
                passData.id = passData.gamePassId;
            }

            if (!passData || !passData.gamePassId) {
                console.warn('[ItemPage] No game pass data available, using placeholder');
                passData = {
                    id: this.itemId,
                    gamePassId: this.itemId,
                    name: 'Game Pass #' + this.itemId,
                    displayName: 'Game Pass #' + this.itemId,
                    description: 'Game pass details could not be loaded.',
                    price: 0,
                    isForSale: false,
                    iconImageAssetId: null,
                    created: new Date().toISOString(),
                    updated: new Date().toISOString(),
                    seller: {
                        id: 1,
                        name: 'ROBLOX',
                        type: 'User'
                    },
                    gameId: 0,
                    gameName: 'Unknown Game'
                };
            }
            
            this.itemData = passData;
            document.title = `${passData.displayName || passData.name || 'Game Pass'} - ROBLOX`;
            
            this.renderGamePassDetails(passData);
            await this.loadThumbnail(api, 'gamepass');
            await this.loadCreatorAvatar(api, passData);
            
            if (this.currentUserId) {
                await this.checkGamePassOwnership(api);
            }
        } catch (error) {
            console.error('[ItemPage] Failed to load game pass data:', error);
            throw error;
        }
    }

    async checkGamePassOwnership(api) {
        try {
            if (!this.currentUserId || !this.itemId) return;

            if (api && api.userOwnsGamePass) {
                const owns = await api.userOwnsGamePass(this.currentUserId, this.itemId);
                console.log('[ItemPage] userOwnsGamePass result:', owns);
                this.updateOwnershipUI(owns);
                return;
            }

            if (api && api.getUserInventory) {
                try {
                    const inventory = await api.getUserInventory(this.currentUserId, 'GamePass');
                    const owns = inventory?.data?.some(item => 
                        item.id === this.itemId || item.gamePassId === this.itemId
                    );
                    this.updateOwnershipUI(owns);
                } catch (e) {
                    console.warn('[ItemPage] Failed to check game pass ownership via inventory:', e);
                }
            }
        } catch (error) {
            console.warn('[ItemPage] Failed to check game pass ownership:', error);
        }
    }

    async checkBadgeOwnership(api) {
        try {
            if (!this.currentUserId || !this.itemId) return;

            if (api && api.getBadgeAwardedDates) {
                const result = await api.getBadgeAwardedDates(this.currentUserId, [this.itemId]);
                console.log('[ItemPage] getBadgeAwardedDates result:', result);

                const badgeData = result?.data?.[0];
                const hasEarned = badgeData && badgeData.awardedDate;
                
                if (hasEarned) {
                    this.isOwned = true;
                    const ownedPanel = document.getElementById('OwnedPanel');
                    if (ownedPanel) {
                        ownedPanel.style.display = 'block';
                        const ownedText = ownedPanel.querySelector('.UserOwns');
                        if (ownedText) {
                            ownedText.textContent = 'You have earned this badge';
                            ownedText.classList.add('badge-earned');
                        }
                    }
                }
                return;
            }
        } catch (error) {
            console.warn('[ItemPage] Failed to check badge ownership:', error);
        }
    }

    async loadBundleData(api) {
        try {
            let bundleData = null;

            if (api && api.getCatalogItemDetails) {
                try {
                    const items = [{ itemType: 'Bundle', id: this.itemId }];
                    const result = await api.getCatalogItemDetails(items);
                    console.log('[ItemPage] getCatalogItemDetails (Bundle) result:', result);
                    if (result?.data && result.data.length > 0) {
                        bundleData = result.data[0];
                    }
                } catch (e) {
                    console.warn('[ItemPage] getCatalogItemDetails (Bundle) failed:', e);
                }
            }

            if (!bundleData && api && api.getBundleDetails) {
                try {
                    bundleData = await api.getBundleDetails(this.itemId);
                    console.log('[ItemPage] getBundleDetails result:', bundleData);
                } catch (e) {
                    console.warn('[ItemPage] getBundleDetails failed:', e);
                }
            }

            if (bundleData && api && api.getSingleCatalogItemDetails) {
                try {
                    const singleDetails = await api.getSingleCatalogItemDetails(this.itemId, 'Bundle');
                    console.log('[ItemPage] getSingleCatalogItemDetails (Bundle) result:', singleDetails);
                    if (singleDetails) {

                        if (singleDetails.itemCreatedUtc) bundleData.created = singleDetails.itemCreatedUtc;
                        else if (singleDetails.createdUtc) bundleData.created = singleDetails.createdUtc;
                        else if (singleDetails.created) bundleData.created = singleDetails.created;
                        
                        if (singleDetails.itemUpdatedUtc) bundleData.updated = singleDetails.itemUpdatedUtc;
                        else if (singleDetails.updatedUtc) bundleData.updated = singleDetails.updatedUtc;
                        else if (singleDetails.updated) bundleData.updated = singleDetails.updated;
                        
                        if (singleDetails.bundledItems) {
                            bundleData.bundledItems = singleDetails.bundledItems;
                        }
                    }
                } catch (e) {
                    console.warn('[ItemPage] getSingleCatalogItemDetails (Bundle) failed:', e);
                }
            }

            if (!bundleData) {
                console.warn('[ItemPage] No bundle data available, using placeholder');
                bundleData = {
                    id: this.itemId,
                    name: 'Bundle #' + this.itemId,
                    description: 'Bundle details could not be loaded.',
                    itemType: 'Bundle',
                    bundleType: 1,
                    creatorName: 'ROBLOX',
                    creatorTargetId: 1,
                    price: 0,
                    isForSale: false,
                    created: new Date().toISOString(),
                    updated: new Date().toISOString()
                };
            }

            if (!bundleData.updated && bundleData.created) {
                bundleData.updated = bundleData.created;
            }

            bundleData.itemType = 'Bundle';
            
            this.itemData = bundleData;
            document.title = `${bundleData.name || 'Bundle'} - ROBLOX`;
            
            this.renderBundleDetails(bundleData);
            await this.loadThumbnail(api, 'bundle');
            await this.loadCreatorAvatar(api, bundleData);
            
            if (this.currentUserId) {
                await this.checkOwnership(api, 'bundle');
            }
            await this.loadFavoriteData(api);
        } catch (error) {
            console.error('[ItemPage] Failed to load bundle data:', error);
            throw error;
        }
    }

    renderBundleDetails(bundle) {
        const nameEl = document.getElementById('item-name');
        if (nameEl) nameEl.textContent = bundle.name || 'Unknown Bundle';
        
        const typeHeaderEl = document.getElementById('item-type-header');
        if (typeHeaderEl) typeHeaderEl.textContent = 'ROBLOX Bundle';
        
        this.renderCreatorInfo(bundle);
        this.renderDates(bundle);
        this.renderDescription(bundle);
        this.renderPrice(bundle);
        this.renderLabels(bundle);

        const soldDiv = document.getElementById('item-sold');
        if (soldDiv) {
            if (bundle.sales !== undefined) {
                document.getElementById('item-sold-count').textContent = this.formatNumber(bundle.sales);
            } else {
                soldDiv.style.display = 'none';
            }
        }
    }

    renderAssetDetails(item) {
        const nameEl = document.getElementById('item-name');
        if (nameEl) nameEl.textContent = item.name || 'Unknown Item';
        
        const typeHeaderEl = document.getElementById('item-type-header');
        if (typeHeaderEl) {
            const typeName = this.assetTypes[item.assetType] || this.assetTypes[item.assetTypeId] || 'Item';
            typeHeaderEl.textContent = `ROBLOX ${typeName}`;
        }
        
        this.renderCreatorInfo(item);
        this.renderDates(item);
        this.renderDescription(item);
        this.renderPrice(item);
        this.renderLabels(item);
        
        const soldCountEl = document.getElementById('item-sold-count');
        if (soldCountEl && item.sales !== undefined) {
            soldCountEl.textContent = this.formatNumber(item.sales);
        }
    }

    renderBadgeDetails(badge) {
        const nameEl = document.getElementById('item-name');
        if (nameEl) nameEl.textContent = badge.displayName || badge.name || 'Unknown Badge';
        
        const typeHeaderEl = document.getElementById('item-type-header');
        if (typeHeaderEl) typeHeaderEl.textContent = 'ROBLOX Badge';

        const creatorLinkEl = document.getElementById('item-creator-link');
        const creatorAvatarLinkEl = document.getElementById('item-creator-avatar-link');
        if (creatorLinkEl && badge.awardingUniverse) {
            creatorLinkEl.textContent = badge.awardingUniverse.name || 'Unknown Game';
            const gameUrl = `game-detail.html?id=${badge.awardingUniverse.rootPlaceId || badge.awardingUniverse.id}`;
            creatorLinkEl.href = gameUrl;
            if (creatorAvatarLinkEl) {
                creatorAvatarLinkEl.href = gameUrl;
                creatorAvatarLinkEl.title = badge.awardingUniverse.name || 'Game';
            }
        }

        const creatorLabel = document.querySelector('.item-detail .stat-label');
        if (creatorLabel) creatorLabel.textContent = 'Game:';
        
        this.renderDates(badge);
        this.renderDescription(badge);

        if (badge.awardingUniverse) {
            this.showGameLinkSection('Earn This Badge at:', {
                name: badge.awardingUniverse.name,
                rootPlaceId: badge.awardingUniverse.rootPlaceId,
                universeId: badge.awardingUniverse.id
            });
        }

        const priceBox = document.querySelector('.BuyPriceBoxContainer');
        if (priceBox) priceBox.style.display = 'none';
        
        const badgeStatsPanel = document.getElementById('BadgeStatsPanel');
        if (badgeStatsPanel) {
            badgeStatsPanel.style.display = 'block';
            
            const stats = badge.statistics || {};
            document.getElementById('badge-rarity').textContent = this.getBadgeRarity(stats.winRatePercentage);
            document.getElementById('badge-win-rate').textContent = 
                stats.winRatePercentage !== undefined ? `${stats.winRatePercentage.toFixed(2)}%` : '--';
            document.getElementById('badge-awarded-count').textContent = 
                this.formatNumber(stats.awardedCount || 0);
        }

        const soldDiv = document.getElementById('item-sold');
        if (soldDiv) soldDiv.style.display = 'none';
    }

    renderGamePassDetails(pass) {
        const nameEl = document.getElementById('item-name');
        if (nameEl) nameEl.textContent = pass.displayName || pass.name || 'Unknown Game Pass';
        
        const typeHeaderEl = document.getElementById('item-type-header');
        if (typeHeaderEl) typeHeaderEl.textContent = 'ROBLOX Game Pass';
        
        this.renderCreatorInfo(pass);
        this.renderDates(pass);
        this.renderDescription(pass);
        this.renderPrice(pass);

        if (pass.gameId || pass.gameName || pass.placeId || pass.universeId) {
            this.showGameLinkSection('Use this Game Pass at:', {
                name: pass.gameName || 'Loading...',
                placeId: pass.placeId || pass.gameId,
                universeId: pass.universeId || pass.gameId
            });

            if (!pass.gameName && pass.placeId) {
                this.fetchGameInfoForPass(pass.placeId);
            }
        }

        const gamePassInfoPanel = document.getElementById('GamePassInfoPanel');
        if (gamePassInfoPanel) {
            gamePassInfoPanel.style.display = 'none';
        }

        const soldDiv = document.getElementById('item-sold');
        if (soldDiv) {
            if (pass.sales !== undefined) {
                document.getElementById('item-sold-count').textContent = this.formatNumber(pass.sales);
            } else {
                soldDiv.style.display = 'none';
            }
        }
    }

    async fetchGameInfoForPass(placeId) {
        try {
            const api = window.roblox;
            if (!api) return;

            if (api.getPlaceDetails) {
                const placeDetails = await api.getPlaceDetails([placeId]);
                if (placeDetails?.[0]?.universeId) {
                    const universeId = placeDetails[0].universeId;

                    if (api.getGameDetails) {
                        const gameDetails = await api.getGameDetails([universeId]);
                        if (gameDetails?.data?.[0]?.name) {
                            const gameName = gameDetails.data[0].name;

                            const nameEl = document.getElementById('game-link-name');
                            if (nameEl) nameEl.textContent = gameName;

                            if (api.getGameIcons) {
                                const iconResult = await api.getGameIcons([universeId], '150x150');
                                if (iconResult?.data?.[0]?.imageUrl) {
                                    const iconEl = document.getElementById('game-link-icon');
                                    if (iconEl) iconEl.src = iconResult.data[0].imageUrl;
                                }
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('[ItemPage] Failed to fetch game info for pass:', e);
        }
    }

    renderCreatorInfo(item) {
        const creatorLinkEl = document.getElementById('item-creator-link');
        const creatorAvatarLinkEl = document.getElementById('item-creator-avatar-link');
        if (creatorLinkEl) {
            const creatorName = item.creatorName || item.creator?.name || item.seller?.name || 'ROBLOX';
            const creatorId = item.creatorTargetId || item.creator?.id || item.seller?.id || 1;

            const creatorType = item.creatorType || item.creator?.type;
            const isGroup = creatorType === 'Group' || creatorType === 2;
            
            creatorLinkEl.textContent = creatorName;
            if (isGroup) {
                creatorLinkEl.href = `groups.html?groupId=${creatorId}`;
            } else {
                creatorLinkEl.href = `profile.html?userId=${creatorId}`;
            }
            
            if (creatorAvatarLinkEl) {
                if (isGroup) {
                    creatorAvatarLinkEl.href = `groups.html?groupId=${creatorId}`;
                } else {
                    creatorAvatarLinkEl.href = `profile.html?userId=${creatorId}`;
                }
                creatorAvatarLinkEl.title = creatorName;
            }
        }
    }

    renderDates(item) {
        const createdEl = document.getElementById('item-created');

        const createdDate = item.created || item.createdAt || item.createdUtc || item.itemCreatedUtc;
        if (createdEl && createdDate) {
            const date = new Date(createdDate);
            createdEl.textContent = date.toLocaleDateString('en-US', { 
                year: 'numeric', month: 'numeric', day: 'numeric' 
            });
        }
        
        const updatedEl = document.getElementById('item-updated');

        const updatedDate = item.updated || item.updatedAt || item.updatedUtc || item.itemUpdatedUtc || createdDate;
        if (updatedEl && updatedDate) {
            updatedEl.textContent = this.getRelativeTime(new Date(updatedDate));
        }
    }

    renderDescription(item) {
        const descEl = document.getElementById('item-description');
        if (descEl) {
            descEl.textContent = item.description || item.displayDescription || 'No description available.';
        }
    }

    async showGameLinkSection(labelText, gameInfo) {
        const section = document.getElementById('GameLinkSection');
        const label = document.getElementById('game-link-label');
        const link = document.getElementById('game-link');
        const icon = document.getElementById('game-link-icon');
        const name = document.getElementById('game-link-name');
        
        if (!section || !gameInfo) return;
        
        const gameName = gameInfo.name || 'Unknown Game';
        const placeId = gameInfo.rootPlaceId || gameInfo.placeId || gameInfo.id;
        const universeId = gameInfo.universeId || gameInfo.id;
        
        if (label) label.textContent = labelText;
        if (name) name.textContent = gameName;
        if (link) link.href = `game-detail.html?placeId=${placeId}`;
        
        section.style.display = 'block';

        if (icon && universeId) {
            try {
                const api = window.roblox;
                if (api?.getGameIcons) {
                    const result = await api.getGameIcons([universeId], '150x150');
                    if (result?.data?.[0]?.imageUrl) {
                        icon.src = result.data[0].imageUrl;
                    }
                }
            } catch (e) {
                console.warn('[ItemPage] Failed to load game icon:', e);
            }
        }
    }

    renderPrice(item) {
        const priceEl = document.getElementById('item-price');
        const priceLabelEl = document.getElementById('price-label');
        const robuxPanel = document.getElementById('RobuxPurchasePanel');
        const offSalePanel = document.getElementById('OffSalePanel');
        const buyBtn = document.getElementById('buy-btn');

        let price = item.price ?? item.priceInRobux;

        if (price === undefined && item.priceInformation?.defaultPriceInRobux !== undefined) {
            price = item.priceInformation.defaultPriceInRobux;
        }

        const isForSale = item.isForSale !== false;
        const isLimited = item.isLimited || item.isLimitedUnique;
        const isFree = price === 0 && !isLimited; 
        
        console.log('[ItemPage] renderPrice:', { price, isForSale, isLimited, isFree, itemIsForSale: item.isForSale });

        let displayPrice = price;
        let usingResalePrice = false;
        if (isLimited) {
            if (item.lowestResalePrice > 0) {
                displayPrice = item.lowestResalePrice;
                usingResalePrice = true;
            } else if (!isForSale || price === 0) {

                displayPrice = null;
            }
        }

        if (isLimited && usingResalePrice && priceLabelEl) {
            priceLabelEl.textContent = 'Best Price:';
        }

        if (!robuxPanel || !offSalePanel) {
            console.warn('[ItemPage] Price panels not found');
            return;
        }

        if (isFree && isForSale) {
            priceEl.textContent = 'Free';
            if (priceLabelEl) priceLabelEl.textContent = 'Price:';
            buyBtn.textContent = 'Get';
            robuxPanel.style.display = '';
            offSalePanel.style.display = 'none';
        } else if (!isForSale && !isLimited) {
            robuxPanel.style.display = 'none';
            offSalePanel.style.display = '';
        } else if (displayPrice !== null && displayPrice !== undefined && displayPrice > 0) {
            priceEl.textContent = this.formatNumber(displayPrice);
            robuxPanel.style.display = '';
            offSalePanel.style.display = 'none';
            if (buyBtn) {
                buyBtn.textContent = 'Buy Now';
            }
        } else if (isLimited && !displayPrice) {

            robuxPanel.style.display = 'none';
            offSalePanel.style.display = '';
            const offSaleText = offSalePanel.querySelector('.NotAPrice');
            if (offSaleText) offSaleText.textContent = 'No sellers available';
        } else {

            robuxPanel.style.display = '';
            offSalePanel.style.display = 'none';
        }

        if (item.isLimitedUnique && item.remaining !== undefined) {
            const remainingSection = document.getElementById('item-remaining-section');
            const remainingEl = document.getElementById('item-remaining');
            if (remainingSection) remainingSection.style.display = 'block';
            if (remainingEl) remainingEl.textContent = this.formatNumber(item.remaining);
        }
    }

    updateSellersCount(count) {
        const seeAllSellers = document.getElementById('see-all-sellers');
        const sellersCountEl = document.getElementById('sellers-count');
        if (seeAllSellers && sellersCountEl && count > 0) {
            seeAllSellers.style.display = 'block';
            sellersCountEl.textContent = count;
        }
    }

    renderLabels(item) {
        const labelsContainer = document.getElementById('item-labels');
        if (!labelsContainer) return;

        let labelsHtml = '';
        if (item.isLimitedUnique) {
            labelsHtml += '<img src="../images/overlay_limitedUnique_big.png" alt="Limited Unique" title="Limited Unique"/> ';
        } else if (item.isLimited) {
            labelsHtml += '<img src="../images/overlay_limited_big.png" alt="Limited" title="Limited"/> ';
        }
        if (item.isBcOnly || item.premiumExclusive) {
            labelsHtml += '<img src="../images/overlay_bcOnly_big.png" alt="Builders Club Only" title="Builders Club Only"/> ';
        }
        labelsContainer.innerHTML = labelsHtml;
    }

    getBadgeRarity(winRate) {
        if (winRate === undefined || winRate === null) return 'Unknown';
        if (winRate >= 50) return 'Freebie';
        if (winRate >= 20) return 'Easy';
        if (winRate >= 10) return 'Moderate';
        if (winRate >= 5) return 'Challenging';
        if (winRate >= 1) return 'Hard';
        if (winRate >= 0.1) return 'Extreme';
        return 'Impossible';
    }

    async loadThumbnail(api, type) {
        const thumbnailImg = document.getElementById('item-thumbnail');
        if (!thumbnailImg || !api) return;
        
        try {
            let result = null;
            
            if (type === 'badge' && api.getBadgeThumbnails) {
                result = await api.getBadgeThumbnails([this.itemId], '150x150');
            } else if (type === 'gamepass') {

                if (api.getGamePassIcons) {
                    result = await api.getGamePassIcons([this.itemId], '150x150');
                }

                if (!result?.data?.[0]?.imageUrl && api.getGamePassThumbnails) {
                    result = await api.getGamePassThumbnails([this.itemId], '150x150');
                }
            } else if (type === 'bundle' && api.getBundleThumbnails) {
                result = await api.getBundleThumbnails([this.itemId], '420x420');
            } else if (api.getAssetThumbnails) {
                result = await api.getAssetThumbnails([this.itemId], '420x420');
            }
            
            if (result?.data && result.data.length > 0 && result.data[0].imageUrl) {
                thumbnailImg.src = result.data[0].imageUrl;
            }
        } catch (e) {
            console.warn('[ItemPage] Failed to load thumbnail:', e);
        }
    }

    async loadCreatorAvatar(api, item) {
        const avatarImg = document.getElementById('item-creator-avatar');
        if (!avatarImg || !api) return;
        
        const creatorId = item.creatorTargetId || item.creator?.id || item.seller?.id || 1;
        const creatorType = item.creatorType || item.creator?.type;
        const isGroup = creatorType === 'Group' || creatorType === 2;
        
        try {
            if (isGroup && api.getGroupThumbnails) {

                const result = await api.getGroupThumbnails([creatorId], '150x150');
                if (result?.data && result.data.length > 0 && result.data[0].imageUrl) {
                    avatarImg.src = result.data[0].imageUrl;
                }
            } else if (api.getUserThumbnails) {
                const result = await api.getUserThumbnails([creatorId], '75x75', 'headshot');
                if (result?.data && result.data.length > 0 && result.data[0].imageUrl) {
                    avatarImg.src = result.data[0].imageUrl;
                }
            }
        } catch (e) {
            console.warn('[ItemPage] Failed to load creator avatar:', e);
        }
    }

    async loadGameCreatorAvatar(api, universe) {
        const avatarImg = document.getElementById('item-creator-avatar');
        if (!avatarImg || !api) return;
        
        try {

            if (api.getUniverseThumbnails && universe.id) {
                const result = await api.getUniverseThumbnails([universe.id], '75x75', 'icon');
                if (result?.data && result.data.length > 0 && result.data[0].imageUrl) {
                    avatarImg.src = result.data[0].imageUrl;
                }
            }
        } catch (e) {
            console.warn('[ItemPage] Failed to load game avatar:', e);
        }
    }

    async checkOwnership(api, type) {
        if (!api || !this.currentUserId) return;
        
        try {
            let owned = false;
            
            if (type === 'badge' && api.userHasBadge) {
                owned = await api.userHasBadge(this.currentUserId, this.itemId);
            } else if (type === 'gamepass' && api.userOwnsGamePass) {
                owned = await api.userOwnsGamePass(this.currentUserId, this.itemId);
            } else if (type === 'bundle' && api.userOwnsItem) {
                const result = await api.userOwnsItem(this.currentUserId, 'Bundle', this.itemId);
                owned = result?.data && result.data.length > 0;
            } else if (api.userOwnsItem) {
                const result = await api.userOwnsItem(this.currentUserId, 'Asset', this.itemId);
                owned = result?.data && result.data.length > 0;
            } else if (api.userOwnsAsset) {
                owned = await api.userOwnsAsset(this.currentUserId, this.itemId);
            }
            
            this.isOwned = owned;
            
            if (owned) {
                const buyBtn = document.getElementById('buy-btn');
                const ownedPanel = document.getElementById('OwnedPanel');

                if (ownedPanel) {
                    ownedPanel.style.display = 'block';

                    const ownedText = ownedPanel.querySelector('.UserOwns');
                    if (ownedText) {
                        if (type === 'badge') {
                            ownedText.textContent = 'You have earned this badge';
                        } else if (type === 'gamepass') {
                            ownedText.textContent = 'You own this game pass';
                        }
                    }
                }

                if (buyBtn) {
                    buyBtn.textContent = 'Owned';
                    buyBtn.classList.add('owned');
                    buyBtn.style.pointerEvents = 'none';
                    buyBtn.style.opacity = '0.6';
                }
            }
        } catch (e) {
            console.warn('[ItemPage] Failed to check ownership:', e);
        }
    }

    async loadFavoriteData(api) {
        if (!api) return;
        try {
            if (api.getAssetFavoritesCount) {
                const count = await api.getAssetFavoritesCount(this.itemId);
                const favoriteCountEl = document.getElementById('favorite-count');
                if (favoriteCountEl) {
                    favoriteCountEl.textContent = this.formatNumber(count || 0);
                }
            }
            
            if (this.currentUserId && api.getAssetFavoriteStatus) {
                this.isFavorited = await api.getAssetFavoriteStatus(this.currentUserId, this.itemId);
                if (this.isFavorited) {
                    const favoriteBtn = document.getElementById('favorite-btn');
                    if (favoriteBtn) favoriteBtn.classList.add('favorited');
                }
            }
        } catch (e) {
            console.warn('[ItemPage] Failed to load favorite data:', e);
        }
    }

    async loadRecommendations(api) {
        const container = document.getElementById('recommendations-container');
        if (!container || !api) return;
        
        const isBundle = this.itemType === 'bundle';
        const assetTypeId = this.itemData?.assetType || this.itemData?.assetTypeId || 8;
        const bundleTypeId = this.itemData?.bundleType || 1;
        
        try {
            let recommendations = [];

            if (isBundle && api.getBundleRecommendations) {
                try {
                    const response = await api.getBundleRecommendations(this.itemId, bundleTypeId, 12);
                    console.log('[ItemPage] getBundleRecommendations result:', response);
                    if (response?.data && response.data.length > 0) {

                        const bundleIds = response.data.filter(id => id !== this.itemId);
                        if (bundleIds.length > 0 && api.getCatalogItemDetails) {
                            const items = bundleIds.map(id => ({ itemType: 'Bundle', id: parseInt(id) }));
                            const details = await api.getCatalogItemDetails(items);
                            if (details?.data) {
                                recommendations = details.data.slice(0, 10);
                            }
                        }
                    }
                } catch (e) {
                    console.warn('[ItemPage] getBundleRecommendations failed:', e);
                }
            } else if (!isBundle && api.getAssetRecommendations) {
                try {
                    const response = await api.getAssetRecommendations(this.itemId, assetTypeId, 12);
                    console.log('[ItemPage] getAssetRecommendations result:', response);
                    if (response?.data && response.data.length > 0) {

                        const assetIds = response.data.filter(id => id !== this.itemId);
                        if (assetIds.length > 0 && api.getCatalogItemDetails) {
                            const items = assetIds.map(id => ({ itemType: 'Asset', id: parseInt(id) }));
                            const details = await api.getCatalogItemDetails(items);
                            if (details?.data) {
                                recommendations = details.data.slice(0, 10);
                            }
                        }
                    }
                } catch (e) {
                    console.warn('[ItemPage] getAssetRecommendations failed:', e);
                }
            }

            if (recommendations.length === 0 && api.searchCatalog) {
                try {
                    const params = {
                        categoryFilter: null,
                        sortType: 0,
                        keyword: '',
                        limit: 15
                    };
                    const response = await api.searchCatalog(params);
                    if (response?.data && response.data.length > 0) {
                        recommendations = response.data.filter(r => r.id !== this.itemId).slice(0, 10);
                    }
                } catch (e) {
                    console.warn('[ItemPage] searchCatalog fallback failed:', e);
                }
            }
            
            if (!recommendations || recommendations.length === 0) {
                container.innerHTML = '<div class="empty">No recommendations available.</div>';
                return;
            }

            let thumbnails = {};
            const assetItems = recommendations.filter(r => r.itemType !== 'Bundle');
            const bundleItems = recommendations.filter(r => r.itemType === 'Bundle');
            
            if (assetItems.length > 0 && api.getAssetThumbnails) {
                try {
                    const assetIds = assetItems.map(r => r.id);
                    const thumbData = await api.getAssetThumbnails(assetIds, '110x110');
                    if (thumbData?.data) {
                        thumbData.data.forEach(t => {
                            if (t.state === 'Completed' && t.imageUrl) {
                                thumbnails[t.targetId] = t.imageUrl;
                            }
                        });
                    }
                } catch (e) {
                    console.warn('[ItemPage] Failed to load asset recommendation thumbnails:', e);
                }
            }
            
            if (bundleItems.length > 0 && api.getBundleThumbnails) {
                try {
                    const bundleIds = bundleItems.map(r => r.id);
                    const thumbData = await api.getBundleThumbnails(bundleIds, '150x150');
                    if (thumbData?.data) {
                        thumbData.data.forEach(t => {
                            if (t.state === 'Completed' && t.imageUrl) {
                                thumbnails[t.targetId] = t.imageUrl;
                            }
                        });
                    }
                } catch (e) {
                    console.warn('[ItemPage] Failed to load bundle recommendation thumbnails:', e);
                }
            }

            const row1 = recommendations.slice(0, 5);
            const row2 = recommendations.slice(5, 10);
            
            const buildRow = (items) => items.map(r => {
                const itemId = r.id || r.assetId;
                const itemType = r.itemType || 'Asset';
                const restrictions = r.itemRestrictions || [];
                const isLimited = restrictions.includes('Limited') || r.isLimited;
                const isLimitedUnique = restrictions.includes('LimitedUnique') || r.isLimitedUnique;
                
                let limitedOverlay = '';
                if (isLimitedUnique) {
                    limitedOverlay = '<img src="../images/limitedu-minified-legend.png" class="limited-overlay" alt="Limited U" style="position:absolute;top:86px;left:1px;"/>';
                } else if (isLimited) {
                    limitedOverlay = '<img src="../images/limited-minified-legend.png" class="limited-overlay" alt="Limited" style="position:absolute;top:86px;left:1px;"/>';
                }
                
                const thumbUrl = thumbnails[itemId] || '../images/avatar-placeholder.png';
                const typeParam = itemType === 'Bundle' ? '&type=bundle' : '';

                const creatorType = r.creatorType;
                const isGroup = creatorType === 'Group' || creatorType === 2;
                const creatorLink = isGroup 
                    ? `groups.html?groupId=${r.creatorTargetId || 1}` 
                    : `profile.html?id=${r.creatorTargetId || 1}`;
                
                return `
                    <td>
                        <div class="PortraitDiv" style="width:110px;height:160px;overflow:hidden;">
                            <div class="AssetThumbnail" style="position:relative;">
                                <a href="item.html?id=${itemId}${typeParam}" title="${this.escapeHtml(r.name)}" style="display:inline-block;height:110px;width:110px;cursor:pointer;">
                                    <img src="${thumbUrl}" border="0" alt="${this.escapeHtml(r.name)}" style="width:110px;height:110px;"/>
                                </a>
                                ${limitedOverlay}
                            </div>
                            <div class="AssetDetails" style="height:70px;">
                                <div class="AssetName" style="font-size:11px;">
                                    <a href="item.html?id=${itemId}${typeParam}">${this.escapeHtml(r.name)}</a>
                                </div>
                                <div class="AssetCreator" style="font-size:12px;">
                                    <span class="stat-label">Creator:</span> <a href="${creatorLink}">${this.escapeHtml(r.creatorName || 'ROBLOX')}</a>
                                </div>
                            </div>
                        </div>
                    </td>
                `;
            }).join('');
            
            container.innerHTML = `
                <table cellspacing="0" align="Center" border="0" style="width:100%;border-collapse:collapse;">
                    <tr>${buildRow(row1)}</tr>
                    ${row2.length > 0 ? `<tr>${buildRow(row2)}</tr>` : ''}
                </table>
            `;
        } catch (e) {
            console.warn('[ItemPage] Failed to load recommendations:', e);
            container.innerHTML = '<div class="empty">Failed to load recommendations.</div>';
        }
    }

    async loadResellers(api) {
        const container = document.getElementById('resellers-list');
        const noResellers = document.getElementById('no-resellers');
        if (!container || !api) return;
        
        try {
            let resellers = [];
            const collectibleItemId = this.itemData?.collectibleItemId || this.collectibleItemId;

            if (collectibleItemId && api.getCollectibleResellers) {
                try {
                    const resellersData = await api.getCollectibleResellers(collectibleItemId, 100);
                    resellers = resellersData?.data || [];
                    console.log('[ItemPage] getCollectibleResellers result:', resellers);
                } catch (e) {
                    console.warn('[ItemPage] getCollectibleResellers failed:', e);
                }
            }

            if (resellers.length === 0 && api.getAssetResellers) {
                try {
                    const resellersData = await api.getAssetResellers(this.itemId, 100);
                    resellers = resellersData?.data || resellersData || [];
                    console.log('[ItemPage] getAssetResellers result:', resellers);
                } catch (e) {
                    console.warn('[ItemPage] getAssetResellers failed:', e);
                }
            }
            
            if (!resellers || resellers.length === 0) {
                container.innerHTML = '';
                if (noResellers) noResellers.style.display = 'block';

                this.updateSellersCount(0);
                return;
            }
            
            if (noResellers) noResellers.style.display = 'none';

            this.currentResellers = resellers;
            this.currentResellersPage = 1;
            this.resellersPerPage = 10;

            this.updateSellersCount(resellers.length);
            
            await this.renderResellersPage(1);
        } catch (e) {
            console.warn('[ItemPage] Failed to load resellers:', e);
            if (noResellers) noResellers.style.display = 'block';
        }
    }

    async renderResellersPage(page) {
        const container = document.getElementById('resellers-list');
        if (!container || !this.currentResellers) return;
        
        const api = window.roblox;
        const resellers = this.currentResellers;
        const perPage = this.resellersPerPage || 10;
        const totalPages = Math.ceil(resellers.length / perPage);
        const start = (page - 1) * perPage;
        const end = start + perPage;
        const pageResellers = resellers.slice(start, end);
        const isLimitedUnique = this.itemData?.isLimitedUnique;
        const totalQuantity = this.itemData?.totalQuantity || this.totalQuantity;

        const sellerIds = pageResellers.map(r => r.seller?.sellerId || r.seller?.id || r.sellerId || 0).filter(id => id > 0);
        let avatarMap = {};
        if (sellerIds.length > 0 && api?.getUserThumbnails) {
            try {
                const thumbResult = await api.getUserThumbnails(sellerIds, '48x48', 'headshot');
                if (thumbResult?.data) {
                    thumbResult.data.forEach(t => {
                        if (t.targetId && t.imageUrl) {
                            avatarMap[t.targetId] = t.imageUrl;
                        }
                    });
                }
            } catch (e) {
                console.warn('[ItemPage] Failed to fetch seller avatars:', e);
            }
        }

        let html = `
            <table class="ItemSalesTable" cellspacing="0" border="0" style="width:100%;">
                <thead><tr>
                    <th>Seller</th>
                    ${isLimitedUnique ? '<th>Serial</th>' : ''}
                    <th>Price</th>
                    <th></th>
                </tr></thead>
                <tbody>
        `;
        
        pageResellers.forEach((r, index) => {
            const sellerId = r.seller?.sellerId || r.seller?.id || r.sellerId || 0;
            const sellerName = r.seller?.name || r.sellerName || 'Unknown';
            const serialNumber = r.serialNumber || '';
            const price = r.price || 0;
            const collectibleProductId = r.collectibleProductId || '';
            const collectibleItemInstanceId = r.collectibleItemInstanceId || '';
            const avatarUrl = avatarMap[sellerId] || '../images/avatar-placeholder.png';
            const globalIndex = start + index;
            
            html += `
                <tr>
                    <td>
                        <a href="profile.html?id=${sellerId}" class="SellerName">
                            <img src="${avatarUrl}" alt="${this.escapeHtml(sellerName)}" style="width:48px; height:48px; margin-right:8px; vertical-align:middle;"/>
                            ${this.escapeHtml(sellerName)}
                        </a>
                    </td>
                    ${isLimitedUnique ? `<td>Serial ${serialNumber ? `#${serialNumber}` : 'N/A'}</td>` : ''}
                    <td><span class="robux">${this.formatNumber(price)}</span></td>
                    <td>
                        <div class="roblox-buy-now btn-primary btn-small PurchaseButton buy-resale-btn" 
                             data-index="${globalIndex}"
                             data-seller-id="${sellerId}" 
                             data-seller-name="${this.escapeHtml(sellerName)}"
                             data-price="${price}"
                             data-collectible-product-id="${collectibleProductId}"
                             data-collectible-item-instance-id="${collectibleItemInstanceId}">Buy Now</div>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';

        if (totalPages > 1) {
            html += `
                <div class="resellers-pagination" style="padding:10px; text-align:center;">
                    <a href="#" class="reseller-page-btn" data-page="1" ${page <= 1 ? 'style="color:#999; pointer-events:none;"' : ''}>First</a>
                    <a href="#" class="reseller-page-btn" data-page="${page - 1}" ${page <= 1 ? 'style="color:#999; pointer-events:none;"' : ''}>Previous</a>
                    <span style="margin:0 10px;">Page ${page} of ${totalPages}</span>
                    <a href="#" class="reseller-page-btn" data-page="${page + 1}" ${page >= totalPages ? 'style="color:#999; pointer-events:none;"' : ''}>Next</a>
                    <a href="#" class="reseller-page-btn" data-page="${totalPages}" ${page >= totalPages ? 'style="color:#999; pointer-events:none;"' : ''}>Last</a>
                </div>
            `;
        }
        
        container.innerHTML = html;
        this.currentResellersPage = page;

        container.querySelectorAll('.buy-resale-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                this.purchaseFromReseller(index);
            });
        });

        container.querySelectorAll('.reseller-page-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const targetPage = parseInt(btn.dataset.page);
                if (targetPage >= 1 && targetPage <= totalPages) {
                    this.renderResellersPage(targetPage);
                }
            });
        });
    }

    async purchaseFromReseller(resellerIndex) {
        const reseller = this.currentResellers?.[resellerIndex];
        if (!reseller) {
            console.error('[ItemPage] Reseller not found at index:', resellerIndex);
            return;
        }
        
        const api = window.roblox;
        if (!api) {
            alert('API not available');
            return;
        }
        
        const sellerId = reseller.seller?.sellerId || reseller.seller?.id || reseller.sellerId;
        const sellerName = reseller.seller?.name || reseller.sellerName || 'Unknown';
        const price = reseller.price || 0;
        const collectibleItemId = this.itemData?.collectibleItemId || this.collectibleItemId;
        const collectibleProductId = reseller.collectibleProductId;
        const collectibleItemInstanceId = reseller.collectibleItemInstanceId;
        
        if (!confirm(`Buy from ${sellerName} for R$ ${this.formatNumber(price)}?`)) {
            return;
        }
        
        try {
            let purchaserId = null;
            if (api.getCurrentUser) {
                const currentUser = await api.getCurrentUser();
                purchaserId = currentUser?.id;
            }
            
            if (!purchaserId) {
                alert('Must be logged in to purchase');
                return;
            }
            
            let result;

            if (collectibleItemId && collectibleProductId && api.purchaseCollectible) {
                console.log('[ItemPage] Purchasing collectible from reseller:', {
                    collectibleItemId,
                    collectibleProductId,
                    collectibleItemInstanceId,
                    sellerId,
                    price
                });
                
                result = await api.purchaseCollectible(collectibleItemId, {
                    expectedPrice: price,
                    expectedPurchaserId: purchaserId,
                    expectedSellerId: sellerId,
                    expectedSellerType: 'User',
                    collectibleProductId: collectibleProductId,
                    collectibleItemInstanceId: collectibleItemInstanceId || null
                });

                if (result?.requiresChallenge) {
                    console.log('[ItemPage] Reseller purchase requires challenge:', result);
                    this.pendingResellerPurchase = {
                        resellerIndex,
                        collectibleItemId,
                        originalParams: {
                            expectedPrice: price,
                            expectedPurchaserId: purchaserId,
                            expectedSellerId: sellerId,
                            expectedSellerType: 'User',
                            collectibleProductId: collectibleProductId,
                            collectibleItemInstanceId: collectibleItemInstanceId || null
                        }
                    };
                    await this.handleResellerPurchaseChallenge(result);
                    return;
                }
            } else {

                if (confirm('This item requires purchase on Roblox.com. Would you like to open the item page?')) {
                    if (api.openExternal) {
                        api.openExternal(`https://www.roblox.com/catalog/${this.itemId}`);
                    } else {
                        window.open(`https://www.roblox.com/catalog/${this.itemId}`, '_blank');
                    }
                }
                return;
            }
            
            if (result?.purchased || result?.success) {
                alert('Purchase successful! The item has been added to your inventory.');
                this.isOwned = true;

                const robuxPanel = document.getElementById('RobuxPurchasePanel');
                const ownedPanel = document.getElementById('OwnedPanel');
                if (robuxPanel) robuxPanel.style.display = 'none';
                if (ownedPanel) ownedPanel.style.display = 'block';

                await this.loadResellers(api);
            } else {
                throw new Error(result?.errorMessage || result?.purchaseResult || 'Purchase failed');
            }
        } catch (error) {
            console.error('[ItemPage] Reseller purchase failed:', error);
            
            if (error.message?.includes('InsufficientBalance')) {
                alert('You don\'t have enough Robux for this purchase.');
            } else if (error.message?.includes('QuantityLimitExceeded')) {
                alert('You already own this item!');
                this.isOwned = true;
                const robuxPanel = document.getElementById('RobuxPurchasePanel');
                const ownedPanel = document.getElementById('OwnedPanel');
                if (robuxPanel) robuxPanel.style.display = 'none';
                if (ownedPanel) ownedPanel.style.display = 'block';
            } else if (error.message?.includes('PriceChanged')) {
                alert('The price has changed. Please refresh and try again.');
                await this.loadResellers(window.roblox);
            } else if (error.message?.includes('ItemNotForSale')) {
                alert('This item is no longer available from this seller.');
                await this.loadResellers(window.roblox);
            } else {
                alert('Purchase failed: ' + (error.message || 'Unknown error'));
            }
        }
    }

    async handleResellerPurchaseChallenge(challengeResult) {
        const metadata = challengeResult.challengeMetadata;
        const challengeType = challengeResult.challengeType;
        
        console.log('[ItemPage] Handling reseller purchase challenge:', challengeType);
        
        if (challengeType !== 'twostepverification' && challengeType !== 'forcetwostepverification') {
            alert('This purchase requires verification that cannot be completed in the app.\n\nPlease complete the purchase on Roblox.com');
            return;
        }

        this.pendingChallengeData = {
            challengeId: challengeResult.challengeId,
            challengeType: challengeType,
            challengeMetadata: metadata,
            twostepChallengeId: metadata?.challengeId,
            userId: metadata?.userId || this.currentUserId,
            isResellerPurchase: true
        };

        this.showPurchaseModal();

        const modalContent = document.querySelector('#purchase-modal .modal-content');
        if (!modalContent) return;
        
        let twoStepContainer = document.getElementById('twostep-container');
        if (!twoStepContainer) {
            twoStepContainer = document.createElement('div');
            twoStepContainer.id = 'twostep-container';
            twoStepContainer.style.cssText = 'text-align:center; padding:15px; background:#f5f5f5; margin:10px 0; border-radius:4px;';
            
            const footer = document.querySelector('#purchase-modal .PurchaseModalFooter');
            if (footer) {
                footer.parentNode.insertBefore(twoStepContainer, footer);
            } else {
                modalContent.appendChild(twoStepContainer);
            }
        }
        
        twoStepContainer.innerHTML = `
            <div style="font-size:14px; font-weight:bold; margin-bottom:10px; color:#191919;">Two-Step Verification Required</div>
            <div style="font-size:12px; color:#666; margin-bottom:15px;">
                Enter the 6-digit code from your authenticator app to complete this purchase.
            </div>
            <input type="text" id="twostep-code-input" placeholder="Enter 6-digit code" 
                   style="padding:10px; font-size:18px; width:160px; text-align:center; letter-spacing:4px; border:1px solid #ccc; border-radius:4px;"
                   maxlength="6" autocomplete="off">
            <div id="twostep-error" style="color:#cc0000; font-size:12px; margin-top:10px; display:none;"></div>
        `;
        twoStepContainer.style.display = 'block';

        document.getElementById('modal-item-name').textContent = this.itemData?.name || 'Limited Item';

        setTimeout(() => {
            const input = document.getElementById('twostep-code-input');
            if (input) {
                input.focus();
                input.onkeypress = (e) => {
                    if (e.key === 'Enter') {
                        this.submitResellerTwoStepCode();
                    }
                };
            }
        }, 100);

        const confirmBtn = document.getElementById('modal-confirm-btn');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Verify & Purchase';
            confirmBtn.onclick = (e) => {
                e.preventDefault();
                this.submitResellerTwoStepCode();
            };
        }
    }

    async submitResellerTwoStepCode() {
        if (!this.pendingChallengeData || !this.pendingResellerPurchase) return;
        
        const codeInput = document.getElementById('twostep-code-input');
        const twostepError = document.getElementById('twostep-error');
        const confirmBtn = document.getElementById('modal-confirm-btn');
        
        const code = codeInput?.value?.trim();
        
        if (!code || code.length !== 6) {
            if (twostepError) {
                twostepError.textContent = 'Please enter a 6-digit code';
                twostepError.style.display = 'block';
            }
            return;
        }
        
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Verifying...';
        }
        if (twostepError) twostepError.style.display = 'none';
        
        try {
            const { challengeId, twostepChallengeId, userId } = this.pendingChallengeData;
            const { collectibleItemId, originalParams } = this.pendingResellerPurchase;
            const challengeIdToUse = twostepChallengeId || challengeId;
            
            const api = window.roblox;

            const verifyResult = await api.verifyTwoStepForChallenge(userId, challengeIdToUse, code, 'authenticator');
            
            if (!verifyResult?.success) {
                throw new Error(verifyResult?.error || 'Verification failed');
            }
            
            console.log('[ItemPage] 2FA verified for reseller purchase');

            await api.continueChallenge(
                challengeId,
                'twostepverification',
                verifyResult.verificationToken,
                verifyResult.rememberTicket,
                twostepChallengeId
            );

            const result = await api.purchaseCollectible(collectibleItemId, {
                ...originalParams,
                challengeId: challengeId,
                challengeType: 'twostepverification',
                verificationToken: verifyResult.verificationToken,
                rememberTicket: verifyResult.rememberTicket
            });
            
            if (result?.requiresChallenge) {
                if (twostepError) {
                    twostepError.textContent = 'Verification failed. Please try again.';
                    twostepError.style.display = 'block';
                }
                if (confirmBtn) {
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = 'Verify & Purchase';
                }
            } else if (result?.purchased || result?.success) {
                alert('Purchase successful!');
                this.isOwned = true;
                
                const robuxPanel = document.getElementById('RobuxPurchasePanel');
                const ownedPanel = document.getElementById('OwnedPanel');
                if (robuxPanel) robuxPanel.style.display = 'none';
                if (ownedPanel) ownedPanel.style.display = 'block';
                
                this.pendingChallengeData = null;
                this.pendingResellerPurchase = null;
                this.hidePurchaseModal();
                
                await this.loadResellers(api);
            } else {
                throw new Error(result?.errorMessage || 'Purchase failed after verification');
            }
        } catch (error) {
            console.error('[ItemPage] Reseller 2FA verification failed:', error);
            if (twostepError) {
                twostepError.textContent = error.message || 'Verification failed. Please try again.';
                twostepError.style.display = 'block';
            }
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Verify & Purchase';
            }
        }
    }

    setupEventHandlers() {
        document.getElementById('buy-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showPurchaseModal();
        });
        
        document.getElementById('modal-close')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.hidePurchaseModal();
        });
        document.getElementById('modal-cancel-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.hidePurchaseModal();
        });
        document.getElementById('modal-confirm-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.purchaseItem();
        });
        document.getElementById('modal-overlay')?.addEventListener('click', () => this.hidePurchaseModal());
        
        document.getElementById('favorite-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleFavorite();
        });
        
        document.getElementById('enable-3d-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggle3DView();
        });
    }

    async showPurchaseModal(overridePrice = null) {
        if (!this.itemData) return;
        
        const modal = document.getElementById('purchase-modal');
        const overlay = document.getElementById('modal-overlay');
        
        document.getElementById('modal-item-name').textContent = this.itemData.name || this.itemData.displayName;
        const price = overridePrice || this.itemData.price || this.itemData.priceInRobux || 0;
        document.getElementById('modal-item-price').textContent = this.formatNumber(price);
        
        const modalImg = document.getElementById('modal-item-image');
        const thumbnailImg = document.getElementById('item-thumbnail');
        if (modalImg && thumbnailImg) modalImg.src = thumbnailImg.src;
        
        try {
            const api = window.robloxAPI || window.roblox;
            if (api?.getUserCurrency && this.currentUserId) {
                const currency = await api.getUserCurrency(this.currentUserId);
                document.getElementById('modal-user-balance').textContent = this.formatNumber(currency?.robux || 0);
            }
        } catch (e) {
            document.getElementById('modal-user-balance').textContent = '0';
        }
        
        if (modal) modal.style.display = 'block';
        if (overlay) overlay.style.display = 'block';
    }

    hidePurchaseModal() {
        const modal = document.getElementById('purchase-modal');
        const overlay = document.getElementById('modal-overlay');
        if (modal) modal.style.display = 'none';
        if (overlay) overlay.style.display = 'none';

        const twoStepContainer = document.getElementById('twostep-container');
        if (twoStepContainer) twoStepContainer.style.display = 'none';

        const confirmBtn = document.getElementById('modal-confirm-btn');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Buy Now';
            confirmBtn.onclick = (e) => {
                e.preventDefault();
                this.purchaseItem();
            };
        }

        this.pendingChallengeData = null;
    }

    async purchaseItem() {
        if (!this.itemData || !this.currentUserId) {
            alert('Please log in to purchase items.');
            this.hidePurchaseModal();
            return;
        }
        
        const confirmBtn = document.getElementById('modal-confirm-btn');
        const originalBtnText = confirmBtn?.textContent || 'Buy Now';
        
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Purchasing...';
        }
        
        try {
            const api = window.roblox || window.robloxAPI;
            let result = null;
            
            if (this.itemType === 'gamepass' && api?.purchaseGamePass) {
                result = await api.purchaseGamePass(this.itemId, this.itemData.price || 0);
            } else if (api?.purchaseAsset) {
                result = await api.purchaseAsset(this.itemId, this.itemData.price || 0);
            } else {
                throw new Error('Purchase not available');
            }
            
            console.log('[ItemPage] Purchase result:', result);

            if (result?.requiresChallenge || result?.challengeId) {
                const challengeType = result.challengeType;
                console.log('[ItemPage] Challenge required:', challengeType);

                if (challengeType === 'twostepverification' || challengeType === 'forcetwostepverification') {
                    await this.handlePurchaseTwoStepChallenge(result);
                    return;
                }

                if (confirmBtn) {
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = originalBtnText;
                }
                alert('This purchase requires verification that cannot be completed in the app.\n\nPlease complete the purchase on Roblox.com');
                return;
            }
            
            if (result?.purchased) {
                alert('Purchase successful!');
                this.isOwned = true;
                
                const robuxPanel = document.getElementById('RobuxPurchasePanel');
                const ownedPanel = document.getElementById('OwnedPanel');
                if (robuxPanel) robuxPanel.style.display = 'none';
                if (ownedPanel) ownedPanel.style.display = 'block';
                this.hidePurchaseModal();
            } else {
                throw new Error(result?.reason || result?.errorMessage || 'Purchase failed');
            }
        } catch (e) {
            console.error('[ItemPage] Purchase failed:', e);
            alert('Purchase failed: ' + e.message);
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.textContent = originalBtnText;
            }
        }
    }
    
    async handlePurchaseTwoStepChallenge(challengeResult) {
        const confirmBtn = document.getElementById('modal-confirm-btn');
        const metadata = challengeResult.challengeMetadata;
        
        console.log('[ItemPage] Handling 2FA challenge:', challengeResult);

        this.pendingChallengeData = {
            challengeId: challengeResult.challengeId,
            challengeType: challengeResult.challengeType,
            challengeMetadata: metadata,
            twostepChallengeId: metadata?.challengeId,
            userId: metadata?.userId || this.currentUserId
        };

        const modalContent = document.querySelector('#purchase-modal .modal-content') || 
                            document.querySelector('#purchase-modal');
        
        if (!modalContent) {
            alert('Two-Step Verification required. Please complete the purchase on Roblox.com');
            this.hidePurchaseModal();
            return;
        }

        let twoStepContainer = document.getElementById('twostep-container');
        if (!twoStepContainer) {
            twoStepContainer = document.createElement('div');
            twoStepContainer.id = 'twostep-container';
            twoStepContainer.style.cssText = 'text-align:center; padding:15px; background:#f5f5f5; margin:10px 0; border-radius:4px;';

            const buttonsContainer = document.getElementById('modal-buttons') || 
                                    document.querySelector('#purchase-modal .modal-buttons');
            if (buttonsContainer) {
                buttonsContainer.parentNode.insertBefore(twoStepContainer, buttonsContainer);
            } else {
                modalContent.appendChild(twoStepContainer);
            }
        }
        
        twoStepContainer.innerHTML = `
            <div style="font-size:14px; font-weight:bold; margin-bottom:10px; color:#191919;">Two-Step Verification Required</div>
            <div style="font-size:12px; color:#666; margin-bottom:15px;">
                Enter the 6-digit code from your authenticator app to complete this purchase.
            </div>
            <input type="text" id="twostep-code-input" placeholder="Enter 6-digit code" 
                   style="padding:10px; font-size:18px; width:160px; text-align:center; letter-spacing:4px; border:1px solid #ccc; border-radius:4px;"
                   maxlength="6" autocomplete="off">
            <div id="twostep-error" style="color:#cc0000; font-size:12px; margin-top:10px; display:none;"></div>
        `;
        twoStepContainer.style.display = 'block';

        setTimeout(() => {
            const input = document.getElementById('twostep-code-input');
            if (input) {
                input.focus();

                input.onkeypress = (e) => {
                    if (e.key === 'Enter') {
                        this.submitTwoStepCode();
                    }
                };
            }
        }, 100);

        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Verify & Purchase';
            confirmBtn.onclick = (e) => {
                e.preventDefault();
                this.submitTwoStepCode();
            };
        }
    }
    
    async submitTwoStepCode() {
        if (!this.pendingChallengeData) return;
        
        const codeInput = document.getElementById('twostep-code-input');
        const twostepError = document.getElementById('twostep-error');
        const confirmBtn = document.getElementById('modal-confirm-btn');
        
        const code = codeInput?.value?.trim();
        
        if (!code || code.length !== 6) {
            if (twostepError) {
                twostepError.textContent = 'Please enter a 6-digit code';
                twostepError.style.display = 'block';
            }
            return;
        }
        
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Verifying...';
        }
        if (twostepError) twostepError.style.display = 'none';
        
        try {
            const { challengeId, twostepChallengeId, userId } = this.pendingChallengeData;
            const challengeIdToUse = twostepChallengeId || challengeId;
            
            console.log('[ItemPage] Verifying 2FA with challengeId:', challengeIdToUse, 'userId:', userId);
            
            const api = window.roblox || window.robloxAPI;

            const verifyResult = await api.verifyTwoStepForChallenge(userId, challengeIdToUse, code, 'authenticator');
            
            if (!verifyResult?.success) {
                throw new Error(verifyResult?.error || 'Verification failed');
            }
            
            console.log('[ItemPage] 2FA verified, continuing challenge...');

            await api.continueChallenge(
                challengeId,
                'twostepverification',
                verifyResult.verificationToken,
                verifyResult.rememberTicket,
                twostepChallengeId
            );
            
            console.log('[ItemPage] Retrying purchase after 2FA...');

            let result = null;
            if (this.itemType === 'gamepass' && api?.purchaseGamePass) {
                result = await api.purchaseGamePass(this.itemId, this.itemData.price || 0);
            } else if (api?.purchaseAsset) {
                result = await api.purchaseAsset(this.itemId, this.itemData.price || 0);
            }
            
            console.log('[ItemPage] Retry purchase result:', result);
            
            if (result?.requiresChallenge) {
                if (twostepError) {
                    twostepError.textContent = 'Verification failed. Please try again.';
                    twostepError.style.display = 'block';
                }
                if (confirmBtn) {
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = 'Verify & Purchase';
                }
            } else if (result?.purchased) {
                alert('Purchase successful!');
                this.isOwned = true;
                
                const robuxPanel = document.getElementById('RobuxPurchasePanel');
                const ownedPanel = document.getElementById('OwnedPanel');
                if (robuxPanel) robuxPanel.style.display = 'none';
                if (ownedPanel) ownedPanel.style.display = 'block';

                this.pendingChallengeData = null;
                const twoStepContainer = document.getElementById('twostep-container');
                if (twoStepContainer) twoStepContainer.style.display = 'none';
                
                this.hidePurchaseModal();
            } else {
                throw new Error(result?.errorMessage || result?.reason || 'Purchase failed after verification');
            }
            
        } catch (error) {
            console.error('[ItemPage] 2FA verification failed:', error);
            if (twostepError) {
                twostepError.textContent = error.message || 'Verification failed. Please try again.';
                twostepError.style.display = 'block';
            }
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Verify & Purchase';
            }
        }
    }

    async toggleFavorite() {
        if (!this.currentUserId) {
            alert('Please log in to favorite items.');
            return;
        }
        
        try {
            const api = window.robloxAPI || window.roblox;
            const favoriteBtn = document.getElementById('favorite-btn');
            
            if (this.isFavorited) {
                if (api?.unfavoriteAsset) {
                    await api.unfavoriteAsset(this.itemId);
                    this.isFavorited = false;
                    if (favoriteBtn) favoriteBtn.classList.remove('favorited');
                }
            } else {
                if (api?.favoriteAsset) {
                    await api.favoriteAsset(this.itemId);
                    this.isFavorited = true;
                    if (favoriteBtn) favoriteBtn.classList.add('favorited');
                }
            }
            
            await this.loadFavoriteData(api);
        } catch (e) {
            console.error('[ItemPage] Favorite toggle failed:', e);
        }
    }

    toggle3DView() {
        const btn = document.getElementById('enable-3d-btn');
        if (btn) {
            btn.classList.toggle('active');
            console.log('[ItemPage] 3D view toggled');
        }
    }

    showError(message) {
        const nameEl = document.getElementById('item-name');
        if (nameEl) nameEl.textContent = 'Error: ' + message;
    }

    getRelativeTime(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffMonths = Math.floor(diffDays / 30);
        const diffYears = Math.floor(diffDays / 365);
        
        if (diffYears > 0) return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
        if (diffMonths > 0) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
        if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        return 'Today';
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatNumber(num) {
        if (num === null || num === undefined) return '0';
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
}

let itemPage;

window.initItemPage = function(itemId, itemType = 'asset') {
    itemPage = new ItemPageRenderer();
    window.itemPage = itemPage;
    itemPage.init(itemId, itemType);
};

