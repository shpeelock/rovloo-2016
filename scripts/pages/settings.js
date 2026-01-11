class SettingsPageRenderer {
    constructor() {
        this.currentCategory = 'appearance';

        this.categories = {
            'appearance': { label: 'Appearance', contentId: 'content-appearance' },
            'builders-club': { label: 'Builders Club', contentId: 'content-builders-club' },
            'performance': { label: 'Performance', contentId: 'content-performance' },
            'hidden-content': { label: 'Hidden Content', contentId: 'content-hidden-content' }
        };

        this.SUBTHEME_KEY = 'rovloo_2016_subtheme';
        this.RANDOMIZE_BC_KEY = 'rovloo_randomize_bc';
        this.SIDEBAR_ALWAYS_OPEN_KEY = 'rovloo_2016_sidebar_always_open';
        this.MINIFIED_LOGO_KEY = 'rovloo_2016_minified_logo';
    }

    async init(category = 'appearance') {
        console.log('[SettingsPage] Initializing with category:', category);

        if (this.categories[category]) {
            this.currentCategory = category;
        }

        try {

            this.setupCategoryTabs();

            this.setupMobileDropdown();

            this.setupEventHandlers();

            this.initSubthemeToggle();
            this.initSidebarAlwaysOpenToggle();
            this.initMinifiedLogoToggle();
            this.initRandomizeBCToggle();
            await this.initGpuAccelerationToggle();
            this.initBlacklistManagement();

            this.showCategory(this.currentCategory);

            console.log('[SettingsPage] Initialization complete');
        } catch (error) {
            console.error('[SettingsPage] Initialization failed:', error);
        }
    }

    setupCategoryTabs() {
        const tabsContainer = document.getElementById('settings-tabs');
        if (!tabsContainer) return;

        const header = tabsContainer.querySelector('h3');
        tabsContainer.innerHTML = '';
        if (header) tabsContainer.appendChild(header);

        for (const [categoryId, category] of Object.entries(this.categories)) {
            const li = document.createElement('li');
            li.className = 'rbx-tab';
            if (categoryId === this.currentCategory) {
                li.classList.add('active');
            }
            li.dataset.category = categoryId;

            const a = document.createElement('a');
            a.className = 'rbx-tab-heading';
            a.innerHTML = `<span class="rbx-lead">${category.label}</span>`;

            li.appendChild(a);
            tabsContainer.appendChild(li);

            li.addEventListener('click', () => {
                this.showCategory(categoryId);
            });
        }
    }

    setupMobileDropdown() {
        const dropdownBtn = document.getElementById('category-dropdown-btn');
        const dropdownMenu = document.getElementById('category-dropdown-menu');
        const dropdownLabel = document.getElementById('dropdown-label');

        if (!dropdownBtn || !dropdownMenu) return;

        dropdownMenu.innerHTML = '';
        for (const [categoryId, category] of Object.entries(this.categories)) {
            const li = document.createElement('li');
            li.className = 'rbx-dropdown-item';
            if (categoryId === this.currentCategory) {
                li.classList.add('active');
            }
            li.dataset.category = categoryId;
            li.textContent = category.label;

            dropdownMenu.appendChild(li);

            li.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showCategory(categoryId);
                dropdownMenu.style.display = 'none';
                dropdownBtn.setAttribute('aria-expanded', 'false');
            });
        }

        if (dropdownLabel && this.categories[this.currentCategory]) {
            dropdownLabel.textContent = this.categories[this.currentCategory].label;
        }

        dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dropdownMenu.style.display === 'block';
            dropdownMenu.style.display = isOpen ? 'none' : 'block';
            dropdownBtn.setAttribute('aria-expanded', !isOpen);
        });

        document.addEventListener('click', () => {
            dropdownMenu.style.display = 'none';
            dropdownBtn.setAttribute('aria-expanded', 'false');
        });
    }

    setupEventHandlers() {

        window.addEventListener('popstate', () => {
            const urlParams = new URLSearchParams(window.location.search);
            const category = urlParams.get('category') || 'appearance';
            if (this.categories[category]) {
                this.showCategory(category, false);
            }
        });
    }

    showCategory(categoryId, updateUrl = true) {
        if (!this.categories[categoryId]) return;

        this.currentCategory = categoryId;
        const category = this.categories[categoryId];

        const tabs = document.querySelectorAll('#settings-tabs .rbx-tab');
        tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.category === categoryId);
        });

        const dropdownItems = document.querySelectorAll('#category-dropdown-menu .rbx-dropdown-item');
        dropdownItems.forEach(item => {
            item.classList.toggle('active', item.dataset.category === categoryId);
        });

        const dropdownLabel = document.getElementById('dropdown-label');
        if (dropdownLabel) {
            dropdownLabel.textContent = category.label;
        }

        const panels = document.querySelectorAll('.settings-content-panel');
        panels.forEach(panel => {
            panel.style.display = panel.id === category.contentId ? 'block' : 'none';
        });

        if (updateUrl) {
            const url = new URL(window.location);
            url.searchParams.set('category', categoryId);
            window.history.pushState({}, '', url);
        }

        if (categoryId === 'hidden-content') {
            this.updateBlacklistSummary();
        }
    }

    initSubthemeToggle() {
        const radios = document.querySelectorAll('input[name="subtheme"]');
        if (radios.length === 0) return;

        const savedTheme = localStorage.getItem(this.SUBTHEME_KEY) || 'light';

        radios.forEach(radio => {

            if (radio.value === savedTheme) {
                radio.checked = true;
            }

            radio.addEventListener('change', () => {
                if (radio.checked) {
                    localStorage.setItem(this.SUBTHEME_KEY, radio.value);
                    this.applySubtheme(radio.value);
                }
            });
        });

        this.applySubtheme(savedTheme);
    }

    applySubtheme(theme) {
        document.body.classList.remove('dark-theme', 'light-theme');
        document.body.classList.add(`${theme}-theme`);
        console.log('[SettingsPage] Applied subtheme:', theme);
    }

    initSidebarAlwaysOpenToggle() {
        const toggle = document.getElementById('sidebar-always-open-toggle');
        if (!toggle) return;

        const savedValue = localStorage.getItem(this.SIDEBAR_ALWAYS_OPEN_KEY);
        toggle.checked = savedValue === 'true';

        this.applySidebarAlwaysOpen(toggle.checked);

        toggle.addEventListener('change', () => {
            localStorage.setItem(this.SIDEBAR_ALWAYS_OPEN_KEY, toggle.checked.toString());
            this.applySidebarAlwaysOpen(toggle.checked);
            console.log('[SettingsPage] Sidebar always open:', toggle.checked);
        });
    }

    applySidebarAlwaysOpen(alwaysOpen) {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        if (alwaysOpen) {
            sidebar.classList.add('open', 'always-open');
            document.body.classList.add('sidebar-always-open');

            localStorage.setItem('sidebarOpen', 'true');
        } else {
            sidebar.classList.remove('always-open');
            document.body.classList.remove('sidebar-always-open');

        }
    }

    initMinifiedLogoToggle() {
        const toggle = document.getElementById('minified-logo-toggle');
        if (!toggle) return;

        const savedValue = localStorage.getItem(this.MINIFIED_LOGO_KEY);
        toggle.checked = savedValue === 'true';

        this.applyMinifiedLogo(toggle.checked);

        toggle.addEventListener('change', () => {
            localStorage.setItem(this.MINIFIED_LOGO_KEY, toggle.checked.toString());
            this.applyMinifiedLogo(toggle.checked);
            console.log('[SettingsPage] Minified logo:', toggle.checked);
        });
    }

    applyMinifiedLogo(useMinified) {
        const fullLogo = document.querySelector('.icon-logo');
        const miniLogo = document.querySelector('.icon-logo-r');

        if (fullLogo && miniLogo) {
            if (useMinified) {
                fullLogo.style.display = 'none';
                miniLogo.style.display = 'inline-block';
            } else {
                fullLogo.style.display = 'inline-block';
                miniLogo.style.display = 'none';
            }
        }
    }

    static isSidebarAlwaysOpen() {
        return localStorage.getItem('rovloo_2016_sidebar_always_open') === 'true';
    }

    static isMinifiedLogoEnabled() {
        return localStorage.getItem('rovloo_2016_minified_logo') === 'true';
    }

    initRandomizeBCToggle() {
        const toggle = document.getElementById('randomize-bc-toggle');
        if (!toggle) return;

        const savedValue = localStorage.getItem(this.RANDOMIZE_BC_KEY);
        toggle.checked = savedValue === 'true';

        toggle.addEventListener('change', () => {
            localStorage.setItem(this.RANDOMIZE_BC_KEY, toggle.checked.toString());
            console.log('[SettingsPage] Randomize BC:', toggle.checked);
        });
    }

    static getBCTypeForUser(userId) {
        if (!userId) return 'OBC'; 

        let hash = parseInt(userId, 10);
        if (isNaN(hash)) return 'OBC';

        hash = ((hash >> 16) ^ hash) * 0x45d9f3b;
        hash = ((hash >> 16) ^ hash) * 0x45d9f3b;
        hash = (hash >> 16) ^ hash;

        const bucket = Math.abs(hash) % 3;
        return ['BC', 'TBC', 'OBC'][bucket];
    }

    static isRandomizeBCEnabled() {
        return localStorage.getItem('rovloo_randomize_bc') === 'true';
    }

    async initGpuAccelerationToggle() {
        const toggle = document.getElementById('gpu-acceleration-toggle');
        const notice = document.getElementById('gpu-restart-notice');

        if (!toggle) return;

        try {

            if (window.RobloxClient?.settings?.getGpuAcceleration) {
                const result = await window.RobloxClient.settings.getGpuAcceleration();
                toggle.checked = result?.enabled ?? true;
            } else {

                toggle.checked = true;
                console.log('[SettingsPage] GPU API not available, defaulting to enabled');
            }
        } catch (error) {
            console.error('[SettingsPage] Failed to get GPU acceleration state:', error);
            toggle.checked = true;
        }

        toggle.addEventListener('change', async () => {
            try {
                if (window.RobloxClient?.settings?.setGpuAcceleration) {
                    const result = await window.RobloxClient.settings.setGpuAcceleration(toggle.checked);

                    if (notice && result?.requiresRestart) {
                        notice.style.display = 'block';
                    }

                    console.log('[SettingsPage] GPU acceleration set to:', toggle.checked);
                } else {
                    console.warn('[SettingsPage] GPU API not available');
                }
            } catch (error) {
                console.error('[SettingsPage] Failed to set GPU acceleration:', error);

                toggle.checked = !toggle.checked;
            }
        });
    }

    initBlacklistManagement() {
        const manageBtn = document.getElementById('manage-blacklist-btn');
        const modal = document.getElementById('blacklist-modal');
        const closeBtn = document.getElementById('blacklist-modal-close');
        const overlay = modal?.querySelector('.blacklist-modal-overlay');
        const tabs = modal?.querySelectorAll('.blacklist-tab');

        if (!manageBtn || !modal) return;

        manageBtn.addEventListener('click', () => {
            modal.style.display = 'flex';
            this.loadBlacklistTab('games');
        });

        const closeModal = () => {
            modal.style.display = 'none';
        };

        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (overlay) overlay.addEventListener('click', closeModal);

        tabs?.forEach(tab => {
            tab.addEventListener('click', () => {

                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                this.loadBlacklistTab(tab.dataset.tab);
            });
        });

        this.updateBlacklistSummary();
    }

    async updateBlacklistSummary() {
        const summaryEl = document.getElementById('blacklist-summary');
        if (!summaryEl) return;

        try {
            if (!window.roblox?.blacklist?.getAll) {
                summaryEl.textContent = 'Blacklist not available';
                return;
            }

            const data = await window.roblox.blacklist.getAll();
            const gamesCount = data?.games?.length || 0;
            const itemsCount = data?.items?.length || 0;
            const creatorsCount = data?.creators?.length || 0;
            const total = gamesCount + itemsCount + creatorsCount;

            if (total === 0) {
                summaryEl.textContent = 'No hidden content';
                summaryEl.classList.remove('has-content');
            } else {
                const parts = [];
                if (gamesCount > 0) parts.push(`${gamesCount} game${gamesCount !== 1 ? 's' : ''}`);
                if (itemsCount > 0) parts.push(`${itemsCount} item${itemsCount !== 1 ? 's' : ''}`);
                if (creatorsCount > 0) parts.push(`${creatorsCount} creator${creatorsCount !== 1 ? 's' : ''}`);

                summaryEl.textContent = `Hidden: ${parts.join(', ')}`;
                summaryEl.classList.add('has-content');
            }
        } catch (error) {
            console.error('[SettingsPage] Failed to update blacklist summary:', error);
            summaryEl.textContent = 'Failed to load';
        }
    }

    async loadBlacklistTab(tabName) {

        const lists = {
            'games': document.getElementById('blacklist-games-list'),
            'items': document.getElementById('blacklist-items-list'),
            'creators': document.getElementById('blacklist-creators-list')
        };

        for (const [name, list] of Object.entries(lists)) {
            if (list) {
                list.style.display = name === tabName ? 'block' : 'none';
            }
        }

        const listContainer = lists[tabName];
        if (!listContainer) return;

        listContainer.innerHTML = '<div class="blacklist-loading">Loading...</div>';

        try {
            let items = [];

            if (window.roblox?.blacklist) {
                switch (tabName) {
                    case 'games':
                        items = await window.roblox.blacklist.getGames() || [];
                        break;
                    case 'items':
                        items = await window.roblox.blacklist.getItems() || [];
                        break;
                    case 'creators':
                        items = await window.roblox.blacklist.getCreators() || [];
                        break;
                }
            }

            if (items.length === 0) {
                listContainer.innerHTML = `<div class="blacklist-empty">No hidden ${tabName}</div>`;
                return;
            }

            listContainer.innerHTML = '';
            items.forEach(item => {
                const row = this.createBlacklistItemRow(item, tabName);
                listContainer.appendChild(row);
            });

        } catch (error) {
            console.error(`[SettingsPage] Failed to load ${tabName} blacklist:`, error);
            listContainer.innerHTML = '<div class="blacklist-empty">Failed to load</div>';
        }
    }

    createBlacklistItemRow(item, tabName) {
        const row = document.createElement('div');
        row.className = 'blacklist-item';

        const info = document.createElement('div');
        info.className = 'blacklist-item-info';

        const name = document.createElement('span');
        name.className = 'blacklist-item-name';
        name.textContent = item.name || 'Unknown';
        info.appendChild(name);

        if (tabName === 'creators' && item.creatorType) {
            const type = document.createElement('span');
            type.className = 'blacklist-item-type';
            type.textContent = item.creatorType;
            info.appendChild(type);
        }

        row.appendChild(info);

        const actions = document.createElement('div');
        actions.className = 'blacklist-item-actions';

        const unhideBtn = document.createElement('button');
        unhideBtn.className = 'blacklist-unhide-btn';
        unhideBtn.textContent = 'Unhide';
        unhideBtn.addEventListener('click', async () => {
            await this.unhideItem(item, tabName, row);
        });

        actions.appendChild(unhideBtn);
        row.appendChild(actions);

        return row;
    }

    async unhideItem(item, tabName, rowElement) {
        try {
            if (!window.roblox?.blacklist) {
                console.error('[SettingsPage] Blacklist API not available');
                return;
            }

            switch (tabName) {
                case 'games':
                    await window.roblox.blacklist.removeGame(item.universeId);
                    break;
                case 'items':
                    await window.roblox.blacklist.removeItem(item.assetId);
                    break;
                case 'creators':
                    await window.roblox.blacklist.removeCreator(item.creatorId, item.creatorType);
                    break;
            }

            rowElement.remove();

            const listContainer = rowElement.parentElement || document.getElementById(`blacklist-${tabName}-list`);
            if (listContainer && listContainer.children.length === 0) {
                listContainer.innerHTML = `<div class="blacklist-empty">No hidden ${tabName}</div>`;
            }

            this.updateBlacklistSummary();

            console.log(`[SettingsPage] Unhid ${tabName} item:`, item.name);

        } catch (error) {
            console.error(`[SettingsPage] Failed to unhide ${tabName} item:`, error);
        }
    }
}

let settingsPageRenderer = null;

function initSettingsPage(category = 'appearance') {
    settingsPageRenderer = new SettingsPageRenderer();
    settingsPageRenderer.init(category);
}

window.initSettingsPage = initSettingsPage;
window.SettingsPageRenderer = SettingsPageRenderer;

