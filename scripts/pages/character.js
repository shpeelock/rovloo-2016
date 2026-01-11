(function() {
    'use strict';

    if (window._characterPage2016Loaded) {
        console.log('[CharacterPage] Already loaded');
        return;
    }
    window._characterPage2016Loaded = true;
    console.log('[CharacterPage] Script loading...');

    let currentUserId = null;
    let currentCategory = 8;
    let wardrobePage = 1;
    let wardrobeTotalPages = 1;
    let wardrobeItems = [];
    let wardrobeThumbnails = {};
    let isLoading = false;
    let bodyColorsPalette = [];
    let selectedBodyPart = null;
    let currentBodyColors = {
        headColor3: 'F5CD30', torsoColor3: 'F5CD30',
        rightArmColor3: 'F5CD30', leftArmColor3: 'F5CD30',
        rightLegColor3: 'F5CD30', leftLegColor3: 'F5CD30'
    };
    let currentWearingAssets = [];
    let currentAvatarType = 'R15';
    const ITEMS_PER_PAGE = 8;

    let outfitsData = [];
    let outfitsPage = 1;
    let outfitsTotalPages = 1;
    let outfitsThumbnails = {};

    let currentAnimCategory = 'walk';
    let animationPage = 1;
    let animationTotalPages = 1;
    let animationItems = [];
    let animationThumbnails = {};
    let currentWearingAnimations = {};

    const animCategoryMap = {
        'walk': 55, 'run': 53, 'jump': 52, 'idle': 51,
        'fall': 50, 'climb': 48, 'swim': 54, 'emotes': 61
    };

    const animCategoryNames = {
        55: 'Walk', 53: 'Run', 52: 'Jump', 51: 'Idle',
        50: 'Fall', 48: 'Climb', 54: 'Swim', 61: 'Emotes'
    };

    const categoryMap = {
        'heads': 17, 'faces': 18, 'hats': 8, 'tshirts': 2,
        'shirts': 11, 'pants': 12, 'gear': 19, 'torsos': 27,
        'larms': 29, 'rarms': 28, 'llegs': 31, 'rlegs': 30, 'packages': 'packages'
    };

    const categoryNames = {
        8: 'Hats', 18: 'Faces', 2: 'T-Shirts', 11: 'Shirts', 12: 'Pants',
        19: 'Gear', 17: 'Heads', 27: 'Torsos', 29: 'L Arms', 28: 'R Arms',
        31: 'L Legs', 30: 'R Legs', 'packages': 'Packages'
    };

    const outfitCategories = {

    };

    function brickColorToHex(brickColorId) {
        const color = bodyColorsPalette.find(c => c.brickColorId === brickColorId);
        if (color && color.hexColor) {
            return color.hexColor.replace('#', '');
        }
        return 'F5CD30'; 
    }

    async function initCharacterPage() {
        if (window._characterPageInitializing) return;
        window._characterPageInitializing = true;
        console.log('[CharacterPage] Initializing...');

        try {
            const api = window.roblox || window.robloxAPI;
            if (!api) throw new Error('API not available');

            const user = await api.getCurrentUser();
            if (!user?.id) {
                showError('You must be logged in to customize your character.');
                return;
            }
            currentUserId = user.id;
            console.log('[CharacterPage] User ID:', currentUserId);

            currentCategory = 8;
            wardrobePage = 1;
            wardrobeItems = [];
            wardrobeThumbnails = {};

            setupEventListeners();
            await loadAvatarRules();
            await Promise.all([loadCurrentAvatar(), loadWardrobeItems()]);
            
            console.log('[CharacterPage] Initialization complete');
        } catch (e) {
            console.error('[CharacterPage] Init failed:', e);
            showError('Failed to load: ' + e.message);
        } finally {
            window._characterPageInitializing = false;
        }
    }

    async function loadAvatarRules() {
        try {
            const api = window.roblox || window.robloxAPI;
            if (api?.getAvatarRules) {
                const rules = await api.getAvatarRules();
                if (rules?.bodyColorsPalette) {
                    bodyColorsPalette = rules.bodyColorsPalette;
                    initColorPalette();
                }
            }
        } catch (e) {
            console.warn('[CharacterPage] Avatar rules failed:', e);
        }
    }

    async function loadCurrentAvatar() {
        console.log('[CharacterPage] Loading avatar...');
        const api = window.roblox || window.robloxAPI;
        const avatarImg = document.getElementById('avatar-image');

        try {
            let avatar = null;
            if (api?.getCurrentAvatar) {
                avatar = await api.getCurrentAvatar();
                console.log('[CharacterPage] Avatar data:', avatar);
            }

            if (avatar?.playerAvatarType) {
                currentAvatarType = avatar.playerAvatarType;
                updateAvatarTypeButtons();
            }

            if (avatar?.bodyColor3s) {

                currentBodyColors = {
                    headColor3: avatar.bodyColor3s.headColor3 || 'F5CD30',
                    torsoColor3: avatar.bodyColor3s.torsoColor3 || 'F5CD30',
                    rightArmColor3: avatar.bodyColor3s.rightArmColor3 || 'F5CD30',
                    leftArmColor3: avatar.bodyColor3s.leftArmColor3 || 'F5CD30',
                    rightLegColor3: avatar.bodyColor3s.rightLegColor3 || 'F5CD30',
                    leftLegColor3: avatar.bodyColor3s.leftLegColor3 || 'F5CD30'
                };
                updateBodyPartColors();
            } else if (avatar?.bodyColors) {

                const bc = avatar.bodyColors;
                currentBodyColors = {
                    headColor3: brickColorToHex(bc.headColorId),
                    torsoColor3: brickColorToHex(bc.torsoColorId),
                    rightArmColor3: brickColorToHex(bc.rightArmColorId),
                    leftArmColor3: brickColorToHex(bc.leftArmColorId),
                    rightLegColor3: brickColorToHex(bc.rightLegColorId),
                    leftLegColor3: brickColorToHex(bc.leftLegColorId)
                };
                updateBodyPartColors();
            }

            if (avatarImg && currentUserId) {
                loadAvatarThumbnail(avatarImg);
            }

            currentWearingAssets = avatar?.assets || [];

            currentWearingAnimations = {};
            for (const asset of currentWearingAssets) {
                const typeId = asset.assetType?.id;
                if (Object.values(animCategoryMap).includes(typeId)) {
                    currentWearingAnimations[typeId] = asset.id;
                }
            }
            
            await renderCurrentlyWearing();

            await updateBCBadge();
        } catch (e) {
            console.error('[CharacterPage] Avatar load failed:', e);
        }
    }

    async function updateBCBadge() {
        const bcBadge = document.getElementById('bc-badge');
        const bcBadgeArea = document.querySelector('.bc-badge-area');
        if (!bcBadge || !currentUserId) return;

        try {

            const getPremiumStatus = window.getPremiumStatus;
            const isRandomizeBCEnabled = window.isRandomizeBCEnabled;
            const getBCTypeForUser = window.getBCTypeForUser;
            const getBCOverlayImage = window.getBCOverlayImage;

            if (!getPremiumStatus) {
                console.warn('[CharacterPage] getPremiumStatus not available');
                bcBadge.style.display = 'none';
                return;
            }

            const hasPremium = await getPremiumStatus(currentUserId);
            console.log('[CharacterPage] Premium status:', hasPremium);

            if (hasPremium === true) {

                const bcType = (isRandomizeBCEnabled && isRandomizeBCEnabled()) 
                    ? getBCTypeForUser(currentUserId) 
                    : 'OBC';
                const overlayImage = getBCOverlayImage ? getBCOverlayImage(bcType, '../images/Overlays/') : '../images/Overlays/overlay_obcOnly.png';
                
                bcBadge.src = overlayImage;
                bcBadge.alt = bcType;
                bcBadge.style.display = 'block';
                console.log('[CharacterPage] BC badge set to:', bcType);
            } else {

                bcBadge.style.display = 'none';
                console.log('[CharacterPage] BC badge hidden (no Premium)');
            }
        } catch (e) {
            console.warn('[CharacterPage] Failed to update BC badge:', e);
            bcBadge.style.display = 'none';
        }
    }

    async function loadAvatarThumbnail(avatarImg, retries = 5) {
        const api = window.roblox || window.robloxAPI;
        if (!api?.getUserFullBodyAvatars) return;

        for (let i = 0; i < retries; i++) {
            try {
                const result = await api.getUserFullBodyAvatars([currentUserId], '352x352');
                const data = result?.data?.[0];
                if (data?.imageUrl) {
                    avatarImg.src = data.imageUrl;
                    return;
                }
                await new Promise(r => setTimeout(r, 1500));
            } catch (e) {
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    }

    async function renderCurrentlyWearing() {
        const container = document.getElementById('currently-wearing-list');
        const emptyEl = document.getElementById('currently-wearing-empty');
        if (!container) return;

        if (currentWearingAssets.length === 0) {
            container.innerHTML = '';
            if (emptyEl) emptyEl.style.display = 'block';
            return;
        }
        if (emptyEl) emptyEl.style.display = 'none';

        const api = window.roblox || window.robloxAPI;
        const assetIds = currentWearingAssets.map(a => a.id);
        let thumbnails = {};
        
        try {
            if (api?.getAssetThumbnails) {
                const result = await api.getAssetThumbnails(assetIds, '110x110');
                if (result?.data) {
                    result.data.forEach(t => { thumbnails[t.targetId] = t.imageUrl; });
                }
            }
        } catch (e) {}

        container.innerHTML = currentWearingAssets.map(asset => {
            const thumb = thumbnails[asset.id] || '../images/avatar-placeholder.png';
            const name = asset.name || `Asset ${asset.id}`;
            return `<div class="WardrobeItem">
                <div class="ItemThumb">
                    <img src="${thumb}" alt="${escapeHtml(name)}"/>
                    <button class="btn-neutral btn-small WardrobeWearBtn wearing" data-asset-id="${asset.id}" data-action="remove">Remove</button>
                </div>
                <div class="ItemName"><a href="item.html?id=${asset.id}">${escapeHtml(name)}</a></div>
            </div>`;
        }).join('');
    }

    async function loadWardrobeItems(resetPage = true) {
        const container = document.getElementById('wardrobe-items');
        const loadingEl = document.getElementById('wardrobe-loading');
        const emptyEl = document.getElementById('wardrobe-empty');
        if (!container || !currentUserId || isLoading) return;

        isLoading = true;
        if (resetPage) {
            wardrobePage = 1;
            wardrobeItems = [];
            wardrobeThumbnails = {};
        }

        if (loadingEl) loadingEl.style.display = 'block';
        if (emptyEl) emptyEl.style.display = 'none';
        container.innerHTML = '';

        try {
            const api = window.roblox || window.robloxAPI;
            if (!api?.getAvatarInventory) throw new Error('getAvatarInventory not available');
            
            let allItems = [];

            if (currentCategory === 'packages') {
                if (!api?.getUserBundles) throw new Error('getUserBundles not available');
                
                let cursor = '';
                do {
                    const result = await api.getUserBundles(currentUserId, 100, cursor);
                    if (result?.data) {

                        const bundleItems = result.data.map(bundle => ({
                            itemId: bundle.id,
                            itemName: bundle.name,
                            itemType: 'Bundle',
                            bundleType: bundle.bundleType
                        }));
                        allItems = allItems.concat(bundleItems);
                    }
                    cursor = result?.nextPageCursor || '';
                } while (cursor && allItems.length < 500);
            } else if (outfitCategories[currentCategory]) {

                let pageToken = '';
                do {
                    const result = await api.getAvatarInventory({
                        sortOption: '1',
                        pageLimit: 50,
                        itemCategories: outfitCategories[currentCategory],
                        pageToken: pageToken || undefined
                    });
                    if (result?.avatarInventoryItems) {
                        allItems = allItems.concat(result.avatarInventoryItems);
                    }
                    pageToken = result?.nextPageToken || '';
                } while (pageToken && allItems.length < 500);
            } else {

                let pageToken = '';
                do {
                    const result = await api.getAvatarInventory({
                        sortOption: '1', pageLimit: 50,
                        itemSubType: currentCategory, itemType: 'Asset',
                        pageToken: pageToken || undefined
                    });
                    if (result?.avatarInventoryItems) {
                        allItems = allItems.concat(result.avatarInventoryItems);
                    }
                    pageToken = result?.nextPageToken || '';
                } while (pageToken && allItems.length < 500);
            }

            wardrobeItems = allItems;
            wardrobeTotalPages = Math.ceil(wardrobeItems.length / ITEMS_PER_PAGE);
            console.log('[CharacterPage] Loaded', wardrobeItems.length, 'items');

            if (wardrobeItems.length === 0) {
                if (loadingEl) loadingEl.style.display = 'none';
                if (emptyEl) emptyEl.style.display = 'block';
                updatePagination();
                isLoading = false;
                return;
            }

            await loadWardrobeThumbnails();
            renderWardrobePage();
        } catch (e) {
            console.error('[CharacterPage] Wardrobe load failed:', e);
            if (loadingEl) loadingEl.style.display = 'none';
            container.innerHTML = '<div class="error">Failed to load items.</div>';
        }
        isLoading = false;
    }

    async function loadWardrobeThumbnails() {
        const api = window.roblox || window.robloxAPI;
        const itemIds = wardrobeItems.map(item => item.itemId);

        if (currentCategory === 'packages') {
            if (!api?.getBundleThumbnails) return;
            
            for (let i = 0; i < itemIds.length; i += 50) {
                const batch = itemIds.slice(i, i + 50);
                try {
                    const result = await api.getBundleThumbnails(batch, '150x150');
                    if (result?.data) {
                        result.data.forEach(t => { wardrobeThumbnails[t.targetId] = t.imageUrl; });
                    }
                } catch (e) {}
            }
        } else if (outfitCategories[currentCategory]) {

            if (!api?.getOutfitThumbnails) return;
            
            for (let i = 0; i < itemIds.length; i += 50) {
                const batch = itemIds.slice(i, i + 50);
                try {
                    const result = await api.getOutfitThumbnails(batch, '150x150');
                    if (result?.data) {
                        result.data.forEach(t => { wardrobeThumbnails[t.targetId] = t.imageUrl; });
                    }
                } catch (e) {}
            }
        } else {
            if (!api?.getAssetThumbnails) return;

            for (let i = 0; i < itemIds.length; i += 50) {
                const batch = itemIds.slice(i, i + 50);
                try {
                    const result = await api.getAssetThumbnails(batch, '110x110');
                    if (result?.data) {
                        result.data.forEach(t => { wardrobeThumbnails[t.targetId] = t.imageUrl; });
                    }
                } catch (e) {}
            }
        }
    }

    function renderWardrobePage() {
        const container = document.getElementById('wardrobe-items');
        const loadingEl = document.getElementById('wardrobe-loading');
        const emptyEl = document.getElementById('wardrobe-empty');
        if (!container) return;

        if (loadingEl) loadingEl.style.display = 'none';
        if (emptyEl) emptyEl.style.display = 'none';

        const startIdx = (wardrobePage - 1) * ITEMS_PER_PAGE;
        const pageItems = wardrobeItems.slice(startIdx, startIdx + ITEMS_PER_PAGE);

        container.innerHTML = '';
        const grid = document.createElement('div');
        grid.className = 'WardrobeGrid';

        pageItems.forEach(item => {
            const assetId = item.itemId;
            const name = item.itemName || `Asset ${assetId}`;
            const thumb = wardrobeThumbnails[assetId] || '../images/avatar-placeholder.png';
            const isBundle = currentCategory === 'packages';
            const isOutfit = outfitCategories[currentCategory];
            const isWorn = !isBundle && !isOutfit && currentWearingAssets.some(a => a.id == assetId);

            const itemEl = document.createElement('div');
            itemEl.className = 'WardrobeItem';

            let nameHtml;
            if (isBundle) {
                nameHtml = `<div class="ItemName"><a href="item.html?id=${assetId}&type=bundle">${escapeHtml(name)}</a></div>`;
            } else if (isOutfit) {
                nameHtml = `<div class="ItemName">${escapeHtml(name)}</div>`;
            } else {
                nameHtml = `<div class="ItemName"><a href="item.html?id=${assetId}">${escapeHtml(name)}</a></div>`;
            }
            
            itemEl.innerHTML = `
                <div class="ItemThumb">
                    <img src="${thumb}" alt="${escapeHtml(name)}"/>
                    <button class="btn-neutral btn-small WardrobeWearBtn${isWorn ? ' wearing' : ''}" data-asset-id="${assetId}" data-action="${isWorn ? 'remove' : 'wear'}"${isBundle ? ' data-bundle="true"' : ''}>
                        ${isWorn ? 'Remove' : 'Wear'}
                    </button>
                </div>
                ${nameHtml}
            `;
            grid.appendChild(itemEl);
        });

        container.appendChild(grid);
        updatePagination();
    }

    function updatePagination() {
        const pagerNumbers = document.getElementById('pager-numbers');
        const pagerHolder = document.querySelector('.wardrobe-section .pager-holder');
        if (!pagerNumbers) return;

        if (wardrobeTotalPages <= 1) {
            if (pagerHolder) pagerHolder.style.display = 'none';
            return;
        }
        if (pagerHolder) pagerHolder.style.display = 'block';

        let html = '';
        const start = Math.max(1, wardrobePage - 2);
        const end = Math.min(wardrobeTotalPages, start + 4);
        for (let i = start; i <= end; i++) {
            html += `<a href="#" class="pager-num ${i === wardrobePage ? 'active' : ''}" data-page="${i}">${i}</a>`;
        }
        pagerNumbers.innerHTML = html;

        const prevBtn = document.getElementById('pager-prev');
        const nextBtn = document.getElementById('pager-next');
        if (prevBtn) prevBtn.style.visibility = wardrobePage > 1 ? 'visible' : 'hidden';
        if (nextBtn) nextBtn.style.visibility = wardrobePage < wardrobeTotalPages ? 'visible' : 'hidden';
    }

    async function wearItem(assetId) {
        const api = window.roblox || window.robloxAPI;
        if (!api?.setWearingAssets) { alert('Wear not available'); return; }

        try {
            const item = wardrobeItems.find(i => i.itemId == assetId);
            if (!item) { alert('Item not found'); return; }

            let updatedAssets;

            if (currentCategory === 'packages' && item.itemType === 'Bundle') {
                if (!api?.getBundleDetails) { alert('Bundle details not available'); return; }
                
                const bundleDetails = await api.getBundleDetails(assetId);
                console.log('[CharacterPage] Bundle details:', bundleDetails);
                
                if (!bundleDetails?.items || bundleDetails.items.length === 0) {
                    alert('This bundle has no wearable items.');
                    return;
                }

                const bundleAssets = bundleDetails.items
                    .filter(bi => bi.type === 'Asset')
                    .map(bi => ({
                        id: bi.id,
                        name: bi.name || `Asset ${bi.id}`,
                        assetType: { id: 0, name: 'Unknown' }
                    }));
                
                if (bundleAssets.length === 0) {
                    alert('This bundle has no wearable assets.');
                    return;
                }
                
                updatedAssets = [...currentWearingAssets];
                bundleAssets.forEach(newAsset => {
                    if (!updatedAssets.some(a => a.id === newAsset.id)) {
                        updatedAssets.push(newAsset);
                    }
                });
            } else if (outfitCategories[currentCategory] && item.outfitDetail) {

                const outfitAssets = item.outfitDetail.assets || [];
                if (outfitAssets.length === 0) {
                    console.warn('[CharacterPage] Outfit has no assets');
                    alert('This outfit has no wearable assets.');
                    return;
                }

                const newAssets = outfitAssets.map(a => ({
                    id: a.id,
                    name: `Outfit Asset ${a.id}`,
                    assetType: { id: 0, name: 'Unknown' }
                }));

                updatedAssets = [...currentWearingAssets];
                newAssets.forEach(newAsset => {
                    if (!updatedAssets.some(a => a.id === newAsset.id)) {
                        updatedAssets.push(newAsset);
                    }
                });
            } else {

                if (currentWearingAssets.some(a => a.id == assetId)) return;

                const newAsset = {
                    id: parseInt(assetId),
                    name: item.itemName || `Asset ${assetId}`,
                    assetType: { id: currentCategory, name: categoryNames[currentCategory] || 'Unknown' }
                };

                updatedAssets = [...currentWearingAssets, newAsset];
            }

            const result = await api.setWearingAssets(updatedAssets);
            if (result?.success) {
                await loadCurrentAvatar();
                renderWardrobePage();
                setTimeout(() => loadAvatarThumbnail(document.getElementById('avatar-image')), 1500);
            } else {
                alert('Failed to wear item.');
            }
        } catch (e) {
            console.error('[CharacterPage] Wear failed:', e);
            alert('Failed: ' + (e.message?.includes('LimitExceeded') ? 'Limit reached' : e.message));
        }
    }

    async function removeItem(assetId) {
        const api = window.roblox || window.robloxAPI;
        if (!api?.setWearingAssets) { alert('Remove not available'); return; }

        try {
            const result = await api.setWearingAssets(currentWearingAssets.filter(a => a.id != assetId));
            if (result?.success) {
                await loadCurrentAvatar();
                renderWardrobePage();
                setTimeout(() => loadAvatarThumbnail(document.getElementById('avatar-image')), 1500);
            } else {
                alert('Failed to remove item.');
            }
        } catch (e) {
            console.error('[CharacterPage] Remove failed:', e);
            alert('Failed: ' + e.message);
        }
    }

    async function setBodyColor(bodyPart, hexColor) {
        const api = window.roblox || window.robloxAPI;
        if (!api?.setBodyColors) return;

        const partToField = {
            'head': 'headColor3', 'torso': 'torsoColor3',
            'leftArm': 'leftArmColor3', 'rightArm': 'rightArmColor3',
            'leftLeg': 'leftLegColor3', 'rightLeg': 'rightLegColor3'
        };

        const field = partToField[bodyPart];
        if (!field) return;

        const hex = hexColor.replace('#', '');
        currentBodyColors[field] = hex;

        const partId = bodyPart.charAt(0).toUpperCase() + bodyPart.slice(1);
        const el = document.getElementById(`BP_${partId}`);
        if (el) el.style.backgroundColor = `#${hex}`;

        const colorPicker = document.getElementById('ColorPickerInput');
        if (colorPicker) colorPicker.value = `#${hex}`;

        try {
            await api.setBodyColors(currentBodyColors);
            setTimeout(redrawAvatar, 500);
        } catch (e) {
            console.error('[CharacterPage] setBodyColors failed:', e);
        }
    }

    async function redrawAvatar() {
        const api = window.roblox || window.robloxAPI;
        const img = document.getElementById('avatar-image');
        if (!api?.redrawAvatar || !img) return;

        img.style.opacity = '0.5';
        try {
            await api.redrawAvatar();
            setTimeout(async () => {
                await loadAvatarThumbnail(img);
                img.style.opacity = '1';
            }, 2000);
        } catch (e) {
            img.style.opacity = '1';
        }
    }

    function updateBodyPartColors() {
        const map = {
            'Head': currentBodyColors.headColor3,
            'Torso': currentBodyColors.torsoColor3,
            'LeftArm': currentBodyColors.leftArmColor3,
            'RightArm': currentBodyColors.rightArmColor3,
            'LeftLeg': currentBodyColors.leftLegColor3,
            'RightLeg': currentBodyColors.rightLegColor3
        };
        for (const [part, hex] of Object.entries(map)) {
            const el = document.getElementById(`BP_${part}`);
            if (el && hex) el.style.backgroundColor = `#${hex}`;
        }
    }

    function updateAvatarTypeButtons() {
        const r6Radio = document.getElementById('R6Button');
        const r15Radio = document.getElementById('R15Button');
        
        if (r6Radio) {
            r6Radio.checked = (currentAvatarType === 'R6');
            r6Radio.closest('.avatar-type-option')?.classList.toggle('selected', currentAvatarType === 'R6');
        }
        if (r15Radio) {
            r15Radio.checked = (currentAvatarType === 'R15');
            r15Radio.closest('.avatar-type-option')?.classList.toggle('selected', currentAvatarType === 'R15');
        }
    }

    async function setAvatarType(avatarType) {
        const api = window.roblox || window.robloxAPI;
        if (!api?.setAvatarType) { alert('Avatar type change not available'); return; }

        try {
            console.log(`[CharacterPage] Setting avatar type to ${avatarType}...`);

            document.querySelectorAll('input[name="avatarType"]').forEach(r => r.disabled = true);

            const result = await api.setAvatarType(avatarType);
            
            if (result?.success) {
                currentAvatarType = avatarType;
                updateAvatarTypeButtons();
                setTimeout(() => loadAvatarThumbnail(document.getElementById('avatar-image')), 1500);
                console.log(`[CharacterPage] Avatar type changed to ${avatarType}`);
            } else {
                console.error('[CharacterPage] Failed to set avatar type:', result);
                alert('Failed to change avatar type. Please try again.');

                updateAvatarTypeButtons();
            }
        } catch (e) {
            console.error('[CharacterPage] Error setting avatar type:', e);
            alert('Failed to change avatar type. Please try again.');

            updateAvatarTypeButtons();
        } finally {

            document.querySelectorAll('input[name="avatarType"]').forEach(r => r.disabled = false);
        }
    }

    function initColorPalette() {

    }

    function setupEventListeners() {

        document.querySelectorAll('.tab-container .tab[data-tab]').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                document.querySelectorAll('.tab-container .tab').forEach(t => t.classList.remove('tab-active'));
                tab.classList.add('tab-active');
                document.querySelectorAll('.tab-pane').forEach(p => { p.style.display = 'none'; p.classList.remove('active'); });
                const pane = document.getElementById(`${tabName}-pane`);
                if (pane) { pane.style.display = 'block'; pane.classList.add('active'); }
                if (tabName === 'outfits') loadOutfits();
                if (tabName === 'animations') loadAnimationItems(true);
            });
        });

        document.querySelectorAll('.category-link[data-category]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const catId = categoryMap[link.dataset.category];
                if (catId && catId !== currentCategory) {
                    currentCategory = catId;
                    document.querySelectorAll('.category-link').forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                    loadWardrobeItems(true);
                }
            });
        });

        document.getElementById('wardrobe-items')?.addEventListener('click', async (e) => {
            const btn = e.target.closest('.WardrobeWearBtn');
            if (btn) {
                e.preventDefault();
                if (btn.dataset.action === 'wear') await wearItem(btn.dataset.assetId);
                else await removeItem(btn.dataset.assetId);
            }
        });

        document.getElementById('currently-wearing-list')?.addEventListener('click', async (e) => {
            const btn = e.target.closest('.WardrobeWearBtn');
            if (btn) { e.preventDefault(); await removeItem(btn.dataset.assetId); }
        });

        document.getElementById('pager-first')?.addEventListener('click', (e) => { e.preventDefault(); goToPage(1); });
        document.getElementById('pager-prev')?.addEventListener('click', (e) => { e.preventDefault(); goToPage(wardrobePage - 1); });
        document.getElementById('pager-next')?.addEventListener('click', (e) => { e.preventDefault(); goToPage(wardrobePage + 1); });
        document.getElementById('pager-last')?.addEventListener('click', (e) => { e.preventDefault(); goToPage(wardrobeTotalPages); });
        document.getElementById('pager-numbers')?.addEventListener('click', (e) => {
            const link = e.target.closest('.pager-num');
            if (link) { e.preventDefault(); goToPage(parseInt(link.dataset.page)); }
        });

        document.querySelectorAll('.BodyPart').forEach(part => {
            part.addEventListener('click', () => {
                selectedBodyPart = part.dataset.part;
                document.querySelectorAll('.BodyPart').forEach(p => p.classList.remove('selected'));
                part.classList.add('selected');
                document.getElementById('ColorPickerSection').style.display = 'block';

                const partToField = {
                    'head': 'headColor3', 'torso': 'torsoColor3',
                    'leftArm': 'leftArmColor3', 'rightArm': 'rightArmColor3',
                    'leftLeg': 'leftLegColor3', 'rightLeg': 'rightLegColor3'
                };
                const fieldName = partToField[selectedBodyPart];
                const colorPicker = document.getElementById('ColorPickerInput');
                if (colorPicker && fieldName && currentBodyColors[fieldName]) {
                    colorPicker.value = '#' + currentBodyColors[fieldName];
                }
            });
        });

        document.getElementById('ColorPickerInput')?.addEventListener('input', (e) => {
            if (selectedBodyPart) {
                setBodyColor(selectedBodyPart, e.target.value);
            }
        });

        document.querySelectorAll('input[name="avatarType"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    setAvatarType(e.target.value);
                }
            });
        });

        document.querySelectorAll('.animation-category-link[data-anim-category]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const catName = link.dataset.animCategory;
                if (catName && catName !== currentAnimCategory) {
                    currentAnimCategory = catName;
                    document.querySelectorAll('.animation-category-link').forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                    loadAnimationItems(true);
                }
            });
        });

        document.getElementById('animations-items')?.addEventListener('click', async (e) => {
            const btn = e.target.closest('.WardrobeWearBtn');
            if (btn) {
                e.preventDefault();
                if (btn.dataset.action === 'wear') await wearAnimation(btn.dataset.assetId);
                else await removeAnimation(btn.dataset.assetId);
            }
        });

        document.getElementById('anim-pager-first')?.addEventListener('click', (e) => { e.preventDefault(); goToAnimPage(1); });
        document.getElementById('anim-pager-prev')?.addEventListener('click', (e) => { e.preventDefault(); goToAnimPage(animationPage - 1); });
        document.getElementById('anim-pager-next')?.addEventListener('click', (e) => { e.preventDefault(); goToAnimPage(animationPage + 1); });
        document.getElementById('anim-pager-last')?.addEventListener('click', (e) => { e.preventDefault(); goToAnimPage(animationTotalPages); });
        document.getElementById('anim-pager-numbers')?.addEventListener('click', (e) => {
            const link = e.target.closest('.pager-num');
            if (link) { e.preventDefault(); goToAnimPage(parseInt(link.dataset.page)); }
        });

        document.getElementById('outfits-list')?.addEventListener('click', async (e) => {
            const btn = e.target.closest('.WardrobeWearBtn');
            if (btn && btn.dataset.action === 'wear-outfit') {
                e.preventDefault();
                await wearOutfit(btn.dataset.outfitId);
            }
        });

        document.getElementById('outfit-pager-first')?.addEventListener('click', (e) => { e.preventDefault(); goToOutfitsPage(1); });
        document.getElementById('outfit-pager-prev')?.addEventListener('click', (e) => { e.preventDefault(); goToOutfitsPage(outfitsPage - 1); });
        document.getElementById('outfit-pager-next')?.addEventListener('click', (e) => { e.preventDefault(); goToOutfitsPage(outfitsPage + 1); });
        document.getElementById('outfit-pager-last')?.addEventListener('click', (e) => { e.preventDefault(); goToOutfitsPage(outfitsTotalPages); });
        document.getElementById('outfit-pager-numbers')?.addEventListener('click', (e) => {
            const link = e.target.closest('.pager-num');
            if (link) { e.preventDefault(); goToOutfitsPage(parseInt(link.dataset.page)); }
        });

        document.getElementById('enable-3d-btn')?.addEventListener('click', () => {
            const btn = document.getElementById('enable-3d-btn');
            btn.textContent = btn.textContent === 'Enable 3D' ? 'Disable 3D' : 'Enable 3D';
        });

        document.getElementById('redraw-link')?.addEventListener('click', (e) => { e.preventDefault(); redrawAvatar(); });
    }

    function goToPage(page) {
        if (page < 1 || page > wardrobeTotalPages || page === wardrobePage) return;
        wardrobePage = page;
        renderWardrobePage();
    }

    async function loadOutfits() {
        const container = document.getElementById('outfits-list');
        const loadingEl = document.getElementById('outfits-loading');
        const emptyEl = document.getElementById('outfits-empty');
        if (!container) return;

        if (loadingEl) loadingEl.style.display = 'block';
        if (emptyEl) emptyEl.style.display = 'none';
        container.innerHTML = '';

        try {
            const api = window.roblox || window.robloxAPI;
            if (!api?.getAvatarInventory) throw new Error('getAvatarInventory not available');

            let allOutfits = [];
            let pageToken = '';
            
            do {
                const result = await api.getAvatarInventory({
                    sortOption: '1',
                    pageLimit: 50,
                    itemCategories: [{ itemType: 'Outfit', itemSubType: 3 }],
                    pageToken: pageToken || undefined
                });
                if (result?.avatarInventoryItems) {
                    allOutfits = allOutfits.concat(result.avatarInventoryItems);
                }
                pageToken = result?.nextPageToken || '';
            } while (pageToken && allOutfits.length < 500);

            outfitsData = allOutfits;
            outfitsPage = 1;
            outfitsTotalPages = Math.ceil(outfitsData.length / ITEMS_PER_PAGE);

            if (loadingEl) loadingEl.style.display = 'none';
            if (allOutfits.length === 0) { 
                if (emptyEl) emptyEl.style.display = 'block'; 
                updateOutfitsPagination();
                return; 
            }

            outfitsThumbnails = {};
            const outfitIds = allOutfits.map(o => o.itemId);
            if (api?.getOutfitThumbnails) {
                for (let i = 0; i < outfitIds.length; i += 50) {
                    const batch = outfitIds.slice(i, i + 50);
                    try {
                        const result = await api.getOutfitThumbnails(batch, '150x150');
                        if (result?.data) result.data.forEach(t => { outfitsThumbnails[t.targetId] = t.imageUrl; });
                    } catch (e) {}
                }
            }

            renderOutfitsPage();
        } catch (e) {
            console.error('[CharacterPage] Outfits failed:', e);
            if (loadingEl) loadingEl.style.display = 'none';
            container.innerHTML = '<div class="error">Failed to load outfits.</div>';
        }
    }

    function renderOutfitsPage() {
        const container = document.getElementById('outfits-list');
        const loadingEl = document.getElementById('outfits-loading');
        const emptyEl = document.getElementById('outfits-empty');
        if (!container) return;

        if (loadingEl) loadingEl.style.display = 'none';
        if (emptyEl) emptyEl.style.display = 'none';

        const startIdx = (outfitsPage - 1) * ITEMS_PER_PAGE;
        const pageItems = outfitsData.slice(startIdx, startIdx + ITEMS_PER_PAGE);

        container.innerHTML = pageItems.map(outfit => {
            const thumb = outfitsThumbnails[outfit.itemId] || '../images/avatar-placeholder.png';
            const name = outfit.itemName || `Outfit ${outfit.itemId}`;
            const displayName = name.length > 11 ? name.substring(0, 11) + '...' : name;
            return `<div class="WardrobeItem">
                <div class="ItemThumb">
                    <img src="${thumb}" alt="${escapeHtml(name)}"/>
                    <button class="btn-neutral btn-small WardrobeWearBtn" data-outfit-id="${outfit.itemId}" data-action="wear-outfit">Wear</button>
                </div>
                <div class="ItemName" title="${escapeHtml(name)}">${escapeHtml(displayName)}</div>
            </div>`;
        }).join('');

        updateOutfitsPagination();
    }

    function updateOutfitsPagination() {
        const pagerNumbers = document.getElementById('outfit-pager-numbers');
        const pagerHolder = document.querySelector('.outfits-pager');
        if (!pagerNumbers) return;

        if (outfitsTotalPages <= 1) {
            if (pagerHolder) pagerHolder.style.display = 'none';
            return;
        }
        if (pagerHolder) pagerHolder.style.display = 'block';

        let html = '';
        const start = Math.max(1, outfitsPage - 2);
        const end = Math.min(outfitsTotalPages, start + 4);
        for (let i = start; i <= end; i++) {
            html += `<a href="#" class="pager-num ${i === outfitsPage ? 'active' : ''}" data-page="${i}">${i}</a>`;
        }
        pagerNumbers.innerHTML = html;

        const prevBtn = document.getElementById('outfit-pager-prev');
        const nextBtn = document.getElementById('outfit-pager-next');
        if (prevBtn) prevBtn.style.visibility = outfitsPage > 1 ? 'visible' : 'hidden';
        if (nextBtn) nextBtn.style.visibility = outfitsPage < outfitsTotalPages ? 'visible' : 'hidden';
    }

    function goToOutfitsPage(page) {
        if (page < 1 || page > outfitsTotalPages || page === outfitsPage) return;
        outfitsPage = page;
        renderOutfitsPage();
    }

    async function wearOutfit(outfitId) {
        const api = window.roblox || window.robloxAPI;
        if (!api?.setWearingAssets) { alert('Wear not available'); return; }

        try {

            const outfit = outfitsData.find(o => o.itemId == outfitId);
            if (!outfit || !outfit.outfitDetail) {
                alert('Outfit data not found. Please refresh and try again.');
                return;
            }

            const outfitAssets = outfit.outfitDetail.assets || [];
            if (outfitAssets.length === 0) {
                alert('This outfit has no wearable assets.');
                return;
            }

            console.log('[CharacterPage] Wearing outfit:', outfitId, 'with', outfitAssets.length, 'assets');

            const newAssets = outfitAssets.map(a => ({
                id: a.id,
                name: a.name || `Asset ${a.id}`,
                assetType: a.assetType || { id: 0, name: 'Unknown' }
            }));

            const result = await api.setWearingAssets(newAssets);
            if (result?.success) {
                await loadCurrentAvatar();
                renderWardrobePage();
                setTimeout(() => loadAvatarThumbnail(document.getElementById('avatar-image')), 1500);
            } else {
                alert('Failed to wear outfit.');
            }
        } catch (e) {
            console.error('[CharacterPage] Wear outfit failed:', e);
            alert('Failed to wear outfit: ' + e.message);
        }
    }

    async function loadAnimationItems(resetPage = true) {
        const container = document.getElementById('animations-items');
        const loadingEl = document.getElementById('animations-loading');
        const emptyEl = document.getElementById('animations-empty');
        if (!container || !currentUserId || isLoading) return;

        isLoading = true;
        if (resetPage) {
            animationPage = 1;
            animationItems = [];
            animationThumbnails = {};
        }

        if (loadingEl) loadingEl.style.display = 'block';
        if (emptyEl) emptyEl.style.display = 'none';
        container.innerHTML = '';

        try {
            const api = window.roblox || window.robloxAPI;
            if (!api?.getAvatarInventory) throw new Error('getAvatarInventory not available');

            const animAssetType = animCategoryMap[currentAnimCategory];
            let allItems = [];
            let pageToken = '';
            
            do {
                const result = await api.getAvatarInventory({
                    sortOption: '1', pageLimit: 50,
                    itemSubType: animAssetType, itemType: 'Asset',
                    pageToken: pageToken || undefined
                });
                if (result?.avatarInventoryItems) {
                    allItems = allItems.concat(result.avatarInventoryItems);
                }
                pageToken = result?.nextPageToken || '';
            } while (pageToken && allItems.length < 500);

            animationItems = allItems;
            animationTotalPages = Math.ceil(animationItems.length / ITEMS_PER_PAGE);
            console.log('[CharacterPage] Loaded', animationItems.length, 'animations');

            if (animationItems.length === 0) {
                if (loadingEl) loadingEl.style.display = 'none';
                if (emptyEl) emptyEl.style.display = 'block';
                updateAnimPagination();
                isLoading = false;
                return;
            }

            await loadAnimationThumbnails();
            renderAnimationPage();
        } catch (e) {
            console.error('[CharacterPage] Animation load failed:', e);
            if (loadingEl) loadingEl.style.display = 'none';
            container.innerHTML = '<div class="error">Failed to load animations.</div>';
        }
        isLoading = false;
    }

    async function loadAnimationThumbnails() {
        const api = window.roblox || window.robloxAPI;
        if (!api?.getAssetThumbnails) return;

        const itemIds = animationItems.map(item => item.itemId);
        for (let i = 0; i < itemIds.length; i += 50) {
            const batch = itemIds.slice(i, i + 50);
            try {
                const result = await api.getAssetThumbnails(batch, '110x110');
                if (result?.data) {
                    result.data.forEach(t => { animationThumbnails[t.targetId] = t.imageUrl; });
                }
            } catch (e) {}
        }
    }

    function renderAnimationPage() {
        const container = document.getElementById('animations-items');
        const loadingEl = document.getElementById('animations-loading');
        const emptyEl = document.getElementById('animations-empty');
        if (!container) return;

        if (loadingEl) loadingEl.style.display = 'none';
        if (emptyEl) emptyEl.style.display = 'none';

        const startIdx = (animationPage - 1) * ITEMS_PER_PAGE;
        const pageItems = animationItems.slice(startIdx, startIdx + ITEMS_PER_PAGE);
        const animAssetType = animCategoryMap[currentAnimCategory];
        const isWorn = (assetId) => currentWearingAnimations[animAssetType] == assetId;

        container.innerHTML = pageItems.map(item => {
            const assetId = item.itemId;
            const name = item.itemName || `Animation ${assetId}`;
            const thumb = animationThumbnails[assetId] || '../images/avatar-placeholder.png';
            const worn = isWorn(assetId);

            return `<div class="WardrobeItem">
                <div class="ItemThumb">
                    <img src="${thumb}" alt="${escapeHtml(name)}"/>
                    <button class="btn-neutral btn-small WardrobeWearBtn${worn ? ' wearing' : ''}" data-asset-id="${assetId}" data-action="${worn ? 'remove' : 'wear'}">
                        ${worn ? 'Remove' : 'Wear'}
                    </button>
                </div>
                <div class="ItemName"><a href="item.html?id=${assetId}">${escapeHtml(name)}</a></div>
            </div>`;
        }).join('');

        updateAnimPagination();
    }

    function updateAnimPagination() {
        const pagerNumbers = document.getElementById('anim-pager-numbers');
        const pagerHolder = document.querySelector('.animations-pager');
        if (!pagerNumbers) return;

        if (animationTotalPages <= 1) {
            if (pagerHolder) pagerHolder.style.display = 'none';
            return;
        }
        if (pagerHolder) pagerHolder.style.display = 'block';

        let html = '';
        const start = Math.max(1, animationPage - 2);
        const end = Math.min(animationTotalPages, start + 4);
        for (let i = start; i <= end; i++) {
            html += `<a href="#" class="pager-num ${i === animationPage ? 'active' : ''}" data-page="${i}">${i}</a>`;
        }
        pagerNumbers.innerHTML = html;

        const prevBtn = document.getElementById('anim-pager-prev');
        const nextBtn = document.getElementById('anim-pager-next');
        if (prevBtn) prevBtn.style.visibility = animationPage > 1 ? 'visible' : 'hidden';
        if (nextBtn) nextBtn.style.visibility = animationPage < animationTotalPages ? 'visible' : 'hidden';
    }

    function goToAnimPage(page) {
        if (page < 1 || page > animationTotalPages || page === animationPage) return;
        animationPage = page;
        renderAnimationPage();
    }

    async function wearAnimation(assetId) {
        const api = window.roblox || window.robloxAPI;
        if (!api?.setWearingAssets) { alert('Wear not available'); return; }

        try {
            const item = animationItems.find(i => i.itemId == assetId);
            if (!item) { alert('Animation not found'); return; }

            const animAssetType = animCategoryMap[currentAnimCategory];
            const newAsset = {
                id: parseInt(assetId),
                name: item.itemName || `Animation ${assetId}`,
                assetType: { id: animAssetType, name: animCategoryNames[animAssetType] || 'Animation' }
            };

            const filteredAssets = currentWearingAssets.filter(a => a.assetType?.id !== animAssetType);
            const result = await api.setWearingAssets([...filteredAssets, newAsset]);
            
            if (result?.success) {
                currentWearingAnimations[animAssetType] = parseInt(assetId);
                await loadCurrentAvatar();
                renderAnimationPage();
            } else {
                alert('Failed to wear animation.');
            }
        } catch (e) {
            console.error('[CharacterPage] Wear animation failed:', e);
            alert('Failed: ' + e.message);
        }
    }

    async function removeAnimation(assetId) {
        const api = window.roblox || window.robloxAPI;
        if (!api?.setWearingAssets) { alert('Remove not available'); return; }

        try {
            const result = await api.setWearingAssets(currentWearingAssets.filter(a => a.id != assetId));
            if (result?.success) {
                const animAssetType = animCategoryMap[currentAnimCategory];
                delete currentWearingAnimations[animAssetType];
                await loadCurrentAvatar();
                renderAnimationPage();
            } else {
                alert('Failed to remove animation.');
            }
        } catch (e) {
            console.error('[CharacterPage] Remove animation failed:', e);
            alert('Failed: ' + e.message);
        }
    }

    function showError(message) {
        const container = document.querySelector('.character-customizer-container');
        if (container) {
            container.innerHTML = `<div style="text-align:center;padding:60px 20px;width:100%;">
                <h2 style="color:#d32f2f;margin-bottom:10px;">Error</h2>
                <p style="color:#666;">${escapeHtml(message)}</p>
            </div>`;
        }
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    window.initCharacterPage = initCharacterPage;
    console.log('[CharacterPage] Script loaded, initCharacterPage available');

})();

