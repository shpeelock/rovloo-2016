class GroupsPageRenderer {
    constructor() {
        this.groupId = null;
        this.groupData = null;
        this.currentUserId = null;
        this.userMembership = null;
        this.roles = [];
        this.currentTab = 'games';
        
        this.wallPage = 1;
        this.pageSize = 20;
        this.wallCursor = null;
        this.totalWallPages = 1;

        this.membersPage = 1;
        this.membersCursor = '';
        this.membersCursorHistory = [];

        this.gamesPage = 1;
        this.gamesCursor = '';
        this.gamesCursorHistory = [];

        this.storePage = 1;
        this.storeCursor = '';
        this.storeCursorHistory = [];
        
        this.AVATAR_PLACEHOLDER = '../images/avatar-placeholder.png';
        this.GAME_PLACEHOLDER = '../images/game-placeholder.png';
        this.GROUP_PLACEHOLDER = '../images/avatar-placeholder.png';
        
        this.loadedTabs = new Set();
        this.userGroups = [];
        this.primaryGroupId = null;
    }

    async init(groupId) {
        console.log('[GroupsPage] Initializing with groupId:', groupId);
        
        try {
            if (!window.roblox) throw new Error('API not available');

            try {
                const currentUser = await window.roblox.getCurrentUser();
                if (currentUser) {
                    this.currentUserId = currentUser.id;
                    await this.loadUserGroups();
                }
            } catch (e) {
                console.log('[GroupsPage] Not logged in');
                const container = document.getElementById('my-groups-list');
                if (container) {
                    container.innerHTML = '<div style="padding: 15px; font-size: 12px; color: #666;">Log in to see your groups</div>';
                }
            }

            if (!groupId) {
                if (this.userGroups.length > 0) {
                    const firstGroup = this.userGroups.find(g => {
                        const group = g.group || g;
                        return String(group.id) === String(this.primaryGroupId);
                    }) || this.userGroups[0];
                    
                    const group = firstGroup.group || firstGroup;
                    this.groupId = group.id;
                    console.log('[GroupsPage] No groupId provided, showing first group:', this.groupId);
                } else {
                    this.showGroupsLanding();
                    return;
                }
            } else {
                this.groupId = groupId;
            }
            
            this.setupTabs();
            await this.loadGroupData();
            await this.checkTabVisibility();

            if (this.hasGames) {
                await this.loadGamesTab();
                this.loadedTabs.add('games');
                this.currentTab = 'games';
            } else {
                await this.loadMembersTab();
                this.loadedTabs.add('members');
                this.currentTab = 'members';

                document.querySelectorAll('#GroupsPeopleContainer .tab').forEach(t => t.classList.remove('active'));
                const membersTab = document.getElementById('GroupsPeople_Members');
                if (membersTab) membersTab.classList.add('active');

                document.querySelectorAll('#GroupsPeople_Pane .tab-content').forEach(p => p.style.display = 'none');
                const membersPane = document.getElementById('GroupsPeoplePane_Members');
                if (membersPane) membersPane.style.display = 'block';
            }
            
            await this.loadWallPosts();
            
            console.log('[GroupsPage] Initialization complete');
        } catch (error) {
            console.error('[GroupsPage] Initialization failed:', error);
            this.showError(error.message);
        }
    }

    showGroupsLanding() {
        const midColumn = document.getElementById('mid-column');
        if (midColumn) {
            midColumn.innerHTML = `
                <div class="groups-landing" style="text-align: center; padding: 60px 20px;">
                    <h2 style="font-size: 28px; font-weight: 300; color: #191919; margin-bottom: 20px;">Groups</h2>
                    <p style="font-size: 16px; color: #666; margin-bottom: 20px;">You haven't joined any groups yet.</p>
                    <p style="font-size: 14px; color: #888; margin-bottom: 30px;">Search for groups to join or create your own!</p>
                    <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                        <a href="people.html?type=groups" class="btn-neutral btn-large" style="display: inline-block; padding: 12px 24px; background: #00a2ff; color: #fff; text-decoration: none; border-radius: 4px;">Search Groups</a>
                    </div>
                </div>
            `;
        }
    }

    async loadUserGroups() {
        const container = document.getElementById('my-groups-list');
        if (!container || !this.currentUserId) return;
        
        try {
            const result = await window.roblox.getUserGroups(this.currentUserId);
            const groups = result?.data || result || [];
            
            this.userGroups = groups;
            this.renderUserGroups(container, groups);

            if (groups.length > 0) {
                const groupIds = groups.map(g => (g.group || g).id);
                try {
                    const thumbResult = await window.roblox.getGroupThumbnails(groupIds, '150x150');
                    if (thumbResult?.data) {
                        thumbResult.data.forEach(thumb => {
                            if (thumb.imageUrl && thumb.targetId) {
                                const img = document.querySelector(`#my-groups-list img[data-group-id="${thumb.targetId}"]`);
                                if (img) img.src = thumb.imageUrl;
                            }
                        });
                    }
                } catch (e) {
                    console.warn('[GroupsPage] Failed to load group thumbnails:', e);
                }
            }
        } catch (error) {
            console.warn('[GroupsPage] Failed to load user groups:', error);
            container.innerHTML = '<div style="padding:10px; font-size:11px;">Could not load groups</div>';
        }
    }

    renderUserGroups(container, groups) {
        if (groups.length === 0) {
            container.innerHTML = '<div class="groups-empty" style="padding: 20px; font-size: 11px; text-align: center; color: #666;">You are not in any groups</div>';
            return;
        }
        
        let html = '';
        for (const item of groups) {
            const group = item.group || item;
            const isSelected = String(group.id) === String(this.groupId);
            const isPrimary = String(group.id) === String(this.primaryGroupId);
            
            html += `
                <div class="GroupListItemContainer${isSelected ? ' selected' : ''}" data-group-id="${group.id}">
                    <a href="groups.html?groupId=${group.id}">
                        <div class="GroupListImageContainer">
                            <img src="${this.GROUP_PLACEHOLDER}" data-group-id="${group.id}" alt="${this.escapeHtml(group.name)}" />
                            ${isPrimary ? '<span class="primary-indicator" title="Primary Group">★</span>' : ''}
                        </div>
                        <div class="GroupListName" title="${this.escapeHtml(group.name)}">${this.escapeHtml(group.name)}</div>
                    </a>
                    <div style="clear:both;"></div>
                </div>
            `;
        }
        container.innerHTML = html;
        
        this.setupGroupsScroll();

        const items = container.querySelectorAll('.GroupListItemContainer');
        items.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const groupId = item.dataset.groupId;
                if (groupId) {
                    window.location.href = `groups.html?groupId=${groupId}`;
                }
            });
        });
    }

    setupGroupsScroll() {
        const container = document.getElementById('my-groups-list');
        const scrollUp = document.getElementById('groups-scroll-up');
        const scrollDown = document.getElementById('groups-scroll-down');
        
        if (!container) return;
        
        const updateScrollButtons = () => {
            if (scrollUp) {
                scrollUp.style.opacity = container.scrollTop > 0 ? '1' : '0.5';
            }
            if (scrollDown) {
                const canScrollDown = container.scrollTop < (container.scrollHeight - container.clientHeight);
                scrollDown.style.opacity = canScrollDown ? '1' : '0.5';
            }
        };
        
        if (scrollUp) {
            scrollUp.addEventListener('click', () => {
                container.scrollBy({ top: -100, behavior: 'smooth' });
            });
        }
        
        if (scrollDown) {
            scrollDown.addEventListener('click', () => {
                container.scrollBy({ top: 100, behavior: 'smooth' });
            });
        }
        
        container.addEventListener('scroll', updateScrollButtons);
        updateScrollButtons();
    }

    setupTabs() {
        const tabs = document.querySelectorAll('#GroupsPeopleContainer .tab');
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

    async checkTabVisibility() {

        try {
            const gamesResult = await window.roblox.getGroupGames(this.groupId);
            const hasGames = gamesResult?.data?.length > 0;
            const gamesTab = document.getElementById('GroupsPeople_Games');
            if (gamesTab) gamesTab.style.display = hasGames ? '' : 'none';
            this.hasGames = hasGames;
        } catch (e) {
            const gamesTab = document.getElementById('GroupsPeople_Games');
            if (gamesTab) gamesTab.style.display = 'none';
            this.hasGames = false;
        }

        try {
            const alliesResult = await window.roblox.getGroupAllies(this.groupId);
            const allies = alliesResult?.relatedGroups || alliesResult?.data || [];
            const hasAllies = allies.length > 0;
            const alliesTab = document.getElementById('GroupsPeople_Allies');
            if (alliesTab) alliesTab.style.display = hasAllies ? '' : 'none';
            this.hasAllies = hasAllies;
        } catch (e) {
            const alliesTab = document.getElementById('GroupsPeople_Allies');
            if (alliesTab) alliesTab.style.display = 'none';
            this.hasAllies = false;
        }

        try {
            const enemiesResult = await window.roblox.getGroupEnemies(this.groupId);
            const enemies = enemiesResult?.relatedGroups || enemiesResult?.data || [];
            const hasEnemies = enemies.length > 0;
            const enemiesTab = document.getElementById('GroupsPeople_Enemies');
            if (enemiesTab) enemiesTab.style.display = hasEnemies ? '' : 'none';
            this.hasEnemies = hasEnemies;
        } catch (e) {
            const enemiesTab = document.getElementById('GroupsPeople_Enemies');
            if (enemiesTab) enemiesTab.style.display = 'none';
            this.hasEnemies = false;
        }

        const storeTab = document.getElementById('GroupsPeople_Items');
        try {
            const storeResult = await window.roblox.getGroupStoreItems(this.groupId, 10);
            const hasStore = storeResult?.data?.length > 0;
            if (storeTab) storeTab.style.display = hasStore ? '' : 'none';
            this.hasStore = hasStore;
        } catch (e) {
            if (storeTab) storeTab.style.display = 'none';
            this.hasStore = false;
        }

        const visibleTabs = ['members']; 
        if (this.hasGames) visibleTabs.unshift('games');
        
        if (visibleTabs.length > 0 && !visibleTabs.includes(this.currentTab)) {
            this.currentTab = visibleTabs[0];
            const firstTab = document.querySelector(`#GroupsPeopleContainer .tab[data-tab="${this.currentTab}"]`);
            if (firstTab) firstTab.classList.add('active');
        }
    }

    async switchTab(tabName) {
        this.currentTab = tabName;

        const tabs = document.querySelectorAll('#GroupsPeopleContainer .tab');
        tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        const tabToPaneMap = {
            'games': 'Games',
            'members': 'Members',
            'allies': 'Allies',
            'enemies': 'Enemies',
            'store': 'Items'
        };

        const tabPanes = document.querySelectorAll('#GroupsPeople_Pane .tab-content');
        tabPanes.forEach(pane => {
            const paneId = pane.id.replace('GroupsPeoplePane_', '');
            const expectedPaneId = tabToPaneMap[tabName];
            pane.style.display = paneId === expectedPaneId ? 'block' : 'none';
        });
        
        if (!this.loadedTabs.has(tabName)) {
            switch (tabName) {
                case 'games': await this.loadGamesTab(); break;
                case 'members': await this.loadMembersTab(); break;
                case 'allies': await this.loadAlliesTab(); break;
                case 'enemies': await this.loadEnemiesTab(); break;
                case 'store': await this.loadStoreTab(); break;
            }
            this.loadedTabs.add(tabName);
        }
    }

    async loadGroupData() {
        try {
            const groupInfo = await window.roblox.getGroup(this.groupId);
            if (!groupInfo) throw new Error('Failed to get group info');
            
            this.groupData = groupInfo;

            const titleEl = document.getElementById('page-title');
            if (titleEl) titleEl.textContent = `${groupInfo.name || 'Group'} - ROBLOX`;
            document.title = `${groupInfo.name || 'Group'} - ROBLOX`;
            
            const nameEl = document.getElementById('group-name');
            if (nameEl) nameEl.textContent = groupInfo.name || 'Unknown Group';
            
            const ownerLink = document.getElementById('group-owner-link');
            if (ownerLink && groupInfo.owner) {
                ownerLink.textContent = groupInfo.owner.username || groupInfo.owner.name || 'Unknown';
                ownerLink.href = `profile.html?userId=${groupInfo.owner.userId || groupInfo.owner.id}`;
            }
            
            const memberCountEl = document.getElementById('group-member-count');
            if (memberCountEl) memberCountEl.textContent = this.formatNumber(groupInfo.memberCount || 0);
            
            const descEl = document.getElementById('group-description');
            if (descEl) descEl.textContent = groupInfo.description || 'No description available.';

            try {
                const thumbResult = await window.roblox.getGroupThumbnails([this.groupId], '150x150');
                if (thumbResult?.data?.[0]?.imageUrl) {
                    const imgEl = document.getElementById('group-thumbnail');
                    if (imgEl) imgEl.src = thumbResult.data[0].imageUrl;
                }
            } catch (e) {
                console.warn('[GroupsPage] Failed to load group thumbnail:', e);
            }
            
            await this.loadRoles();
            this.loadShout();
            await this.setupJoinButton();
            this.setupWallPostButton();
            
        } catch (error) {
            console.error('[GroupsPage] Failed to load group data:', error);
            throw error;
        }
    }

    async loadRoles() {
        try {
            const result = await window.roblox.getGroupRoles(this.groupId);
            this.roles = result?.roles || result || [];
            
            const roleSelect = document.getElementById('role-select');
            if (roleSelect && this.roles.length > 0) {
                this.roles.forEach(role => {
                    const option = document.createElement('option');
                    option.value = role.id;
                    option.textContent = `${role.name} (${role.memberCount || 0})`;
                    roleSelect.appendChild(option);
                });
                
                roleSelect.addEventListener('change', () => {
                    this.membersPage = 1;
                    this.membersCursor = '';
                    this.membersCursorHistory = [];
                    this.loadedTabs.delete('members');
                    this.loadMembersTab('');
                    this.loadedTabs.add('members');
                });
            }
        } catch (error) {
            console.warn('[GroupsPage] Failed to load roles:', error);
        }
    }

    loadShout() {
        const shout = this.groupData?.shout;
        const shoutContainer = document.getElementById('group-shout-container');
        const shoutText = document.getElementById('group-shout-text');
        
        if (shout && shout.body && shoutContainer && shoutText) {
            shoutText.textContent = shout.body;
            shoutContainer.style.display = 'block';
        }
    }

    async setupJoinButton() {
        const joinBtn = document.getElementById('group-join-btn');
        if (!joinBtn) return;

        joinBtn.style.pointerEvents = 'auto';
        joinBtn.onclick = null; 

        if (!this.currentUserId) {
            joinBtn.textContent = 'Join Group';
            joinBtn.className = 'btn-neutral btn-large';
            joinBtn.style.marginTop = '10px';
            joinBtn.onclick = () => {
                alert('Please log in to join this group.');
            };
            return;
        }

        try {
            const groupIdNum = parseInt(this.groupId, 10);
            const isMember = await window.roblox.isUserInGroup(this.currentUserId, groupIdNum);
            console.log('[GroupsPage] Membership check for group', groupIdNum, ':', isMember);
            
            if (isMember) {

                joinBtn.textContent = 'Leave Group';
                joinBtn.className = 'btn-negative btn-large';
                joinBtn.style.marginTop = '10px';
                joinBtn.onclick = () => this.leaveGroup();
                this.userMembership = { isMember: true };
            } else {

                joinBtn.textContent = 'Join Group';
                joinBtn.className = 'btn-neutral btn-large';
                joinBtn.style.marginTop = '10px';
                joinBtn.onclick = () => this.joinGroup();
                this.userMembership = null;
            }
        } catch (error) {
            console.warn('[GroupsPage] Failed to check membership:', error);

            joinBtn.textContent = 'Join Group';
            joinBtn.className = 'btn-neutral btn-large';
            joinBtn.style.marginTop = '10px';
            joinBtn.onclick = () => this.joinGroup();
        }
    }
    
    setupWallPostButton() {
        const postBtn = document.getElementById('wall-post-btn');
        if (postBtn && !postBtn.dataset.listenerAttached) {
            postBtn.addEventListener('click', () => this.postToWall());
            postBtn.dataset.listenerAttached = 'true';
        }
    }

    async loadGamesTab(cursor = '') {
        const container = document.getElementById('games-list');
        if (!container) return;
        
        try {
            const result = await window.roblox.getGroupGames(this.groupId, 'Public', 10, cursor);
            const games = result?.data || result || [];
            this.gamesCursor = result?.nextPageCursor || '';
            
            if (games.length === 0 && this.gamesPage === 1) {
                container.innerHTML = '<div style="padding:20px; text-align:center;">No games found.</div>';
                return;
            }

            const universeIds = games.map(g => g.universeId || g.id).filter(Boolean);
            let icons = {};
            if (universeIds.length > 0) {
                try {
                    const iconResult = await window.roblox.getGameIcons(universeIds, '150x150');
                    if (iconResult?.data) {
                        iconResult.data.forEach(icon => {
                            if (icon.imageUrl && icon.targetId) {
                                icons[icon.targetId] = icon.imageUrl;
                            }
                        });
                    }
                } catch (e) {
                    console.warn('[GroupsPage] Failed to load game icons:', e);
                }
            }
            
            let html = '';
            for (const game of games) {
                const universeId = game.universeId || game.id;
                const iconUrl = icons[universeId] || this.GAME_PLACEHOLDER;
                const placeId = game.rootPlace?.id || game.id || game.placeId;
                html += `
                    <div class="GroupPlace">
                        <a href="game-detail.html?placeId=${placeId}">
                            <img src="${iconUrl}" title="${this.escapeHtml(game.name)}" />
                        </a>
                        <div class="PlaceName">
                            <a class="NameText" href="game-detail.html?placeId=${placeId}">${this.escapeHtml(game.name)}</a>
                        </div>
                        <div class="PlayersOnline">${game.playing || 0} players online</div>
                    </div>
                `;
            }
            container.innerHTML = html;
            
            this.renderGamesPagination();
        } catch (error) {
            console.warn('[GroupsPage] Failed to load games:', error);
            container.innerHTML = '<div style="padding:20px; text-align:center;">No games found.</div>';
        }
    }

    renderGamesPagination() {
        let paginationEl = document.getElementById('games-pagination');
        if (!paginationEl) {
            const gamesPane = document.getElementById('GroupsPeoplePane_Games');
            if (gamesPane) {
                paginationEl = document.createElement('div');
                paginationEl.id = 'games-pagination';
                paginationEl.className = 'tab-pagination';
                gamesPane.appendChild(paginationEl);
            } else {
                return;
            }
        }
        
        const hasPrev = this.gamesPage > 1;
        const hasNext = !!this.gamesCursor;
        
        if (!hasPrev && !hasNext) {
            paginationEl.style.display = 'none';
            return;
        }
        
        paginationEl.style.display = 'block';
        paginationEl.innerHTML = `
            <span class="pagerbtns previous ${!hasPrev ? 'disabled' : ''}" id="games-prev-btn"></span>
            Page ${this.gamesPage}
            <span class="pagerbtns next ${!hasNext ? 'disabled' : ''}" id="games-next-btn"></span>
        `;
        
        if (hasPrev) {
            document.getElementById('games-prev-btn').onclick = () => {
                this.gamesPage--;
                const prevCursor = this.gamesPage === 1 ? '' : this.gamesCursorHistory[this.gamesPage - 2] || '';
                this.loadGamesTab(prevCursor);
            };
        }
        
        if (hasNext) {
            document.getElementById('games-next-btn').onclick = () => {
                this.gamesCursorHistory[this.gamesPage - 1] = this.gamesCursor;
                this.gamesPage++;
                this.loadGamesTab(this.gamesCursor);
            };
        }
    }

    async loadMembersTab(cursor = '') {
        const container = document.getElementById('members-list');
        if (!container) return;
        
        try {
            const roleId = document.getElementById('role-select')?.value;
            let result;
            
            if (roleId) {
                result = await window.roblox.getGroupRoleMembers(this.groupId, roleId, 10, cursor, 'Desc');
            } else {
                result = await window.roblox.getGroupMembers(this.groupId, 10, cursor, 'Desc');
            }
            
            const members = result?.data || result || [];
            this.membersCursor = result?.nextPageCursor || '';
            
            if (members.length === 0) {
                container.innerHTML = '<div style="padding:20px; text-align:center;">No members found.</div>';
                this.renderMembersPagination(0);
                return;
            }

            const userIds = members.map(m => (m.user || m).userId || (m.user || m).id).filter(Boolean);
            let avatars = {};
            if (userIds.length > 0) {
                try {
                    const avatarResult = await window.roblox.getUserThumbnails(userIds, '60x60', 'Headshot');
                    if (avatarResult?.data) {
                        avatarResult.data.forEach(a => {
                            avatars[a.targetId] = a.imageUrl;
                        });
                    }
                } catch (e) {
                    console.warn('[GroupsPage] Failed to load member avatars:', e);
                }
            }
            
            let html = '';
            for (const member of members) {
                const user = member.user || member;
                const userId = user.userId || user.id;
                const avatar = avatars[userId] || this.AVATAR_PLACEHOLDER;
                html += `
                    <div class="GroupMember">
                        <a href="profile.html?userId=${userId}">
                            <img src="${avatar}" width="60" height="60" />
                        </a>
                        <div class="member-name-container">
                            <a href="profile.html?userId=${userId}">${this.escapeHtml(user.username || user.name)}</a>
                        </div>
                    </div>
                `;
            }
            container.innerHTML = html;

            const totalMembers = this.groupData?.memberCount || 0;
            this.renderMembersPagination(totalMembers);
        } catch (error) {
            console.error('[GroupsPage] Failed to load members:', error);
            container.innerHTML = '<div style="padding:20px; text-align:center;">Failed to load members.</div>';
        }
    }

    renderMembersPagination(totalMembers) {
        let paginationEl = document.getElementById('members-pagination');
        if (!paginationEl) {

            const membersPane = document.getElementById('GroupsPeoplePane_Members');
            if (membersPane) {
                paginationEl = document.createElement('div');
                paginationEl.id = 'members-pagination';
                membersPane.appendChild(paginationEl);
            } else {
                return;
            }
        }
        
        const totalPages = Math.ceil(totalMembers / 10) || 1;
        
        paginationEl.innerHTML = `
            <span class="pagerbtns previous ${this.membersPage <= 1 ? 'disabled' : ''}" id="members-prev-btn"></span>
            Page <input type="text" value="${this.membersPage}" id="members-page-input" class="paging_input" style="width:30px;text-align:center;" /> of ${totalPages}
            <span class="pagerbtns next ${!this.membersCursor ? 'disabled' : ''}" id="members-next-btn"></span>
        `;

        const prevBtn = document.getElementById('members-prev-btn');
        const nextBtn = document.getElementById('members-next-btn');
        
        if (prevBtn && this.membersPage > 1) {
            prevBtn.style.cursor = 'pointer';
            prevBtn.onclick = () => {
                this.membersPage--;
                const prevCursor = this.membersPage === 1 ? '' : this.membersCursorHistory[this.membersPage - 2] || '';
                this.loadMembersTab(prevCursor);
            };
        }
        
        if (nextBtn && this.membersCursor) {
            nextBtn.style.cursor = 'pointer';
            nextBtn.onclick = () => {
                this.membersCursorHistory[this.membersPage - 1] = this.membersCursor;
                this.membersPage++;
                this.loadMembersTab(this.membersCursor);
            };
        }
    }

    async loadAlliesTab() {
        const container = document.getElementById('allies-list');
        if (!container) return;
        
        try {
            const result = await window.roblox.getGroupAllies(this.groupId);
            const allies = result?.relatedGroups || result?.data || result || [];
            
            if (allies.length === 0) {
                container.innerHTML = '<div style="padding:20px; text-align:center;">No allies found.</div>';
                return;
            }
            
            container.innerHTML = await this.renderGroupList(allies);
        } catch (error) {
            console.error('[GroupsPage] Failed to load allies:', error);
            container.innerHTML = '<div style="padding:20px; text-align:center;">Failed to load allies.</div>';
        }
    }

    async loadEnemiesTab() {
        const container = document.getElementById('enemies-list');
        if (!container) return;
        
        try {
            const result = await window.roblox.getGroupEnemies(this.groupId);
            const enemies = result?.relatedGroups || result?.data || result || [];
            
            if (enemies.length === 0) {
                container.innerHTML = '<div style="padding:20px; text-align:center;">No enemies found.</div>';
                return;
            }
            
            container.innerHTML = await this.renderGroupList(enemies);
        } catch (error) {
            console.error('[GroupsPage] Failed to load enemies:', error);
            container.innerHTML = '<div style="padding:20px; text-align:center;">Failed to load enemies.</div>';
        }
    }

    async renderGroupList(groups) {

        const groupIds = groups.map(g => g.id).filter(Boolean);
        let thumbnails = {};
        if (groupIds.length > 0) {
            try {
                const thumbResult = await window.roblox.getGroupThumbnails(groupIds, '150x150');
                if (thumbResult?.data) {
                    thumbResult.data.forEach(thumb => {
                        if (thumb.imageUrl && thumb.targetId) {
                            thumbnails[thumb.targetId] = thumb.imageUrl;
                        }
                    });
                }
            } catch (e) {
                console.warn('[GroupsPage] Failed to load group thumbnails:', e);
            }
        }
        
        let html = '';
        for (const group of groups) {
            const thumbUrl = thumbnails[group.id] || this.GROUP_PLACEHOLDER;
            html += `
                <div class="GroupMember">
                    <a href="groups.html?groupId=${group.id}">
                        <img src="${thumbUrl}" width="60" height="60" />
                    </a>
                    <div class="member-name-container">
                        <a href="groups.html?groupId=${group.id}">${this.escapeHtml(group.name)}</a>
                    </div>
                    <div class="member-role">${this.formatNumber(group.memberCount || 0)} members</div>
                </div>
            `;
        }
        return html;
    }

    async loadStoreTab(cursor = '') {
        const container = document.getElementById('store-list');
        if (!container) return;
        
        try {
            const result = await window.roblox.getGroupStoreItems(this.groupId, 10, cursor);
            const items = result?.data || [];
            this.storeCursor = result?.nextPageCursor || '';
            
            if (items.length === 0 && this.storePage === 1) {
                container.innerHTML = '<div style="padding:20px; text-align:center;">No items for sale.</div>';
                return;
            }

            const assetIds = items.map(item => item.id).filter(Boolean);
            let thumbnails = {};
            if (assetIds.length > 0) {
                try {
                    const thumbResult = await window.roblox.getAssetThumbnails(assetIds, '150x150');
                    if (thumbResult?.data) {
                        thumbResult.data.forEach(thumb => {
                            if (thumb.imageUrl && thumb.targetId) {
                                thumbnails[thumb.targetId] = thumb.imageUrl;
                            }
                        });
                    }
                } catch (e) {
                    console.warn('[GroupsPage] Failed to load store thumbnails:', e);
                }
            }
            
            let html = '';
            for (const item of items) {
                const thumbUrl = thumbnails[item.id] || this.AVATAR_PLACEHOLDER;
                const price = item.price !== null && item.price !== undefined ? `R$ ${item.price}` : 'Off Sale';
                html += `
                    <div class="GroupMember">
                        <a href="item.html?id=${item.id}">
                            <img src="${thumbUrl}" width="110" height="110" />
                        </a>
                        <div class="member-name-container">
                            <a href="item.html?id=${item.id}">${this.escapeHtml(item.name)}</a>
                        </div>
                        <div class="member-role">${price}</div>
                    </div>
                `;
            }
            container.innerHTML = html;
            
            this.renderStorePagination();
        } catch (error) {
            console.error('[GroupsPage] Failed to load store:', error);
            container.innerHTML = '<div style="padding:20px; text-align:center;">Failed to load store.</div>';
        }
    }

    renderStorePagination() {
        let paginationEl = document.getElementById('store-pagination');
        if (!paginationEl) {
            const storePane = document.getElementById('GroupsPeoplePane_Items');
            if (storePane) {
                paginationEl = document.createElement('div');
                paginationEl.id = 'store-pagination';
                paginationEl.className = 'tab-pagination';
                storePane.appendChild(paginationEl);
            } else {
                return;
            }
        }
        
        const hasPrev = this.storePage > 1;
        const hasNext = !!this.storeCursor;
        
        if (!hasPrev && !hasNext) {
            paginationEl.style.display = 'none';
            return;
        }
        
        paginationEl.style.display = 'block';
        paginationEl.innerHTML = `
            <span class="pagerbtns previous ${!hasPrev ? 'disabled' : ''}" id="store-prev-btn"></span>
            Page ${this.storePage}
            <span class="pagerbtns next ${!hasNext ? 'disabled' : ''}" id="store-next-btn"></span>
        `;
        
        if (hasPrev) {
            document.getElementById('store-prev-btn').onclick = () => {
                this.storePage--;
                const prevCursor = this.storePage === 1 ? '' : this.storeCursorHistory[this.storePage - 2] || '';
                this.loadStoreTab(prevCursor);
            };
        }
        
        if (hasNext) {
            document.getElementById('store-next-btn').onclick = () => {
                this.storeCursorHistory[this.storePage - 1] = this.storeCursor;
                this.storePage++;
                this.loadStoreTab(this.storeCursor);
            };
        }
    }

    async loadWallPosts() {
        const container = document.getElementById('wall-posts-container');
        if (!container) return;
        
        try {
            const result = await window.roblox.getGroupWall(this.groupId, 10, this.wallCursor || '', 'Desc');
            const posts = result?.data || result || [];
            this.wallCursor = result?.nextPageCursor;
            this.totalWallPages = result?.totalPages || 24;
            
            if (posts.length === 0) {
                container.innerHTML = '<div style="padding:20px; text-align:center;">No wall posts yet.</div>';
                return;
            }
            
            let html = '';
            posts.forEach((post, index) => {
                const isEven = index % 2 === 0;
                const poster = post.poster?.user || post.poster || {};
                const userId = poster.userId || poster.id;
                const username = poster.username || poster.name || 'Unknown';
                
                html += `
                    <div class="${isEven ? 'AlternatingItemTemplateEven' : 'AlternatingItemTemplateOdd'}">
                        <div class="RepeaterImage">
                            <a href="profile.html?userId=${userId}" class="notranslate" title="${this.escapeHtml(username)}">
                                <img src="${this.AVATAR_PLACEHOLDER}" data-wall-user-id="${userId}" style="display:inline-block;height:100px;width:100px;cursor:pointer;" />
                            </a>
                        </div>
                        <div class="RepeaterText">
                            <div class="GroupWall_PostContainer notranslate linkify">${this.escapeHtml(post.body)}</div>
                            <div>
                                <div class="GroupWall_PostDate">
                                    <span style="color: Gray;">${this.formatDate(post.created || post.updated)}</span>
                                    by
                                    <span class="UserLink notranslate"><a href="profile.html?userId=${userId}">${this.escapeHtml(username)}</a></span>
                                </div>
                                <div style="float: right;">
                                    <span class="ReportAbuseLink"><a href="#">Report Abuse</a></span>
                                </div>
                            </div>
                            <div class="GroupWall_PostBtns" style="min-height:0"></div>
                        </div>
                        <div style="clear:both;"></div>
                    </div>
                `;
            });
            container.innerHTML = html;
            
            this.loadWallAvatars(posts);
            this.renderWallPagination();
        } catch (error) {
            console.error('[GroupsPage] Failed to load wall posts:', error);

            const wallSection = document.getElementById('GroupWallPane_Wall');
            if (wallSection) {
                wallSection.style.display = 'none';
            } else {

                container.style.display = 'none';
                const paginationEl = document.getElementById('wall-pagination');
                if (paginationEl) paginationEl.style.display = 'none';
                const postForm = document.getElementById('wall-post-form');
                if (postForm) postForm.style.display = 'none';
            }
        }
    }

    async loadWallAvatars(posts) {
        const userIds = posts.map(p => {
            const poster = p.poster?.user || p.poster || {};
            return poster.userId || poster.id;
        }).filter(Boolean);
        
        if (userIds.length === 0) return;
        
        try {
            const thumbs = await window.roblox.getUserThumbnails([...new Set(userIds)], '110x110', 'Headshot');
            if (thumbs?.data) {
                thumbs.data.forEach(thumb => {
                    if (thumb.imageUrl && thumb.targetId) {
                        const imgs = document.querySelectorAll(`#wall-posts-container img[data-wall-user-id="${thumb.targetId}"]`);
                        imgs.forEach(img => img.src = thumb.imageUrl);
                    }
                });
            }
        } catch (e) {
            console.warn('[GroupsPage] Failed to load wall avatars:', e);
        }
    }

    renderWallPagination() {
        const paginationEl = document.getElementById('wall-pagination');
        if (!paginationEl) return;
        
        const totalPages = this.totalWallPages || (this.wallCursor ? this.wallPage + 1 : this.wallPage);
        
        let html = `
            <span class="pagerbtns previous ${this.wallPage <= 1 ? 'disabled' : ''}" id="wall-prev-btn"></span>
            <div class="paging_wrapper">
                Page
                <input type="text" value="${this.wallPage}" id="wall-page-input" class="paging_input" />
                <div class="paging pagenums_container">${totalPages}</div>
            </div>
            <span class="pagerbtns next ${!this.wallCursor ? 'disabled' : ''}" id="wall-next-btn"></span>
        `;
        paginationEl.innerHTML = html;
        
        const prevBtn = document.getElementById('wall-prev-btn');
        const nextBtn = document.getElementById('wall-next-btn');
        const pageInput = document.getElementById('wall-page-input');
        
        if (prevBtn && this.wallPage > 1) {
            prevBtn.style.cursor = 'pointer';
            prevBtn.addEventListener('click', () => {
                this.wallPage--;
                this.wallCursor = null;
                this.loadWallPosts();
            });
        }
        if (nextBtn && this.wallCursor) {
            nextBtn.style.cursor = 'pointer';
            nextBtn.addEventListener('click', () => {
                this.wallPage++;
                this.loadWallPosts();
            });
        }
        if (pageInput) {
            pageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const newPage = parseInt(pageInput.value);
                    if (newPage > 0 && newPage <= totalPages) {
                        this.wallPage = newPage;
                        this.wallCursor = null;
                        this.loadWallPosts();
                    }
                }
            });
        }
    }

    async joinGroup() {
        if (!this.currentUserId) {
            alert('Please log in to join this group.');
            return;
        }
        
        const joinBtn = document.getElementById('group-join-btn');
        const originalText = joinBtn?.textContent || 'Join Group';
        
        console.log('[GroupsPage] Starting join for group:', this.groupId);
        
        if (joinBtn) {
            joinBtn.textContent = 'Joining...';
            joinBtn.style.pointerEvents = 'none';
        }
        
        const showSuccessAndRefresh = async () => {
            console.log('[GroupsPage] Join successful, showing success message');
            if (joinBtn) joinBtn.textContent = 'Joined!';
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log('[GroupsPage] Refreshing button state...');
            await this.setupJoinButton();
            await this.loadUserGroups();
            console.log('[GroupsPage] Join complete');
        };
        
        try {

            console.log('[GroupsPage] Using joinGroup API...');
            if (window.roblox.joinGroup) {
                const result = await window.roblox.joinGroup(this.groupId);
                console.log('[GroupsPage] joinGroup result:', result);
                
                if (result?.success || result?.groupId || (!result?.errors && !result?.requiresChallenge && !result?.challengeId)) {
                    await showSuccessAndRefresh();
                    return;
                }
                
                if (result?.requiresChallenge || result?.challengeId) {
                    const challengeType = result.challengeType;
                    console.log('[GroupsPage] Challenge required:', challengeType || result.challengeId);

                    if (challengeType === 'twostepverification' || challengeType === 'forcetwostepverification') {
                        if (joinBtn) joinBtn.textContent = '2FA Required';
                        const handled = await this.handleTwoStepChallenge(result, 'join');
                        if (handled) {
                            await showSuccessAndRefresh();
                            return;
                        }
                        await this.setupJoinButton();
                        return;
                    }

                    if (joinBtn) joinBtn.textContent = 'Verifying...';
                    
                    if (window.roblox?.bat?.performGroupAction) {
                        console.log('[GroupsPage] Using BAT performGroupAction for challenge...');
                        const challengeResult = await window.roblox.bat.performGroupAction(this.groupId, 'join');
                        console.log('[GroupsPage] Challenge result:', challengeResult);
                        
                        if (challengeResult?.success) {
                            await showSuccessAndRefresh();
                            return;
                        } else if (challengeResult?.cancelled) {
                            console.log('[GroupsPage] User cancelled');
                            await this.setupJoinButton();
                            return;
                        } else if (challengeResult?.timeout) {
                            alert('The action timed out. Please try again.');
                            await this.setupJoinButton();
                            return;
                        }
                    }

                    if (joinBtn) joinBtn.textContent = 'Verification Required';
                    const confirmed = confirm(
                        'This group requires verification which cannot be completed in the app.\n\n' +
                        'Would you like to open the group page on Roblox.com to join?'
                    );
                    
                    if (confirmed) {
                        const groupUrl = `https://www.roblox.com/groups/${this.groupId}`;
                        if (window.roblox?.openExternal) {
                            window.roblox.openExternal(groupUrl);
                        } else {
                            window.open(groupUrl, '_blank');
                        }
                    }
                    await this.setupJoinButton();
                    return;
                }
                
                if (result?.errors) {
                    throw new Error(result.errors[0]?.message || 'Failed to join group');
                }
            }
        } catch (error) {
            console.error('[GroupsPage] Failed to join group:', error);
            if (joinBtn) {
                joinBtn.textContent = 'Failed';
                await new Promise(resolve => setTimeout(resolve, 2000));
                joinBtn.textContent = originalText;
                joinBtn.style.pointerEvents = 'auto';
            }
            alert('Failed to join group: ' + error.message);
        }
    }

    async leaveGroup() {
        if (!this.currentUserId) return;
        
        if (!confirm('Are you sure you want to leave this group?')) return;
        
        const joinBtn = document.getElementById('group-join-btn');
        const originalText = joinBtn?.textContent || 'Leave Group';
        
        console.log('[GroupsPage] Starting leave for group:', this.groupId);
        
        if (joinBtn) {
            joinBtn.textContent = 'Leaving...';
            joinBtn.style.pointerEvents = 'none';
        }
        
        const showSuccessAndRefresh = async () => {
            console.log('[GroupsPage] Leave successful, showing success message');
            if (joinBtn) joinBtn.textContent = 'Left!';
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log('[GroupsPage] Refreshing button state...');
            await this.setupJoinButton();
            await this.loadUserGroups();
            console.log('[GroupsPage] Leave complete');
        };
        
        try {

            console.log('[GroupsPage] Using leaveGroup API...');
            if (window.roblox.leaveGroup) {
                const result = await window.roblox.leaveGroup(this.groupId, this.currentUserId);
                console.log('[GroupsPage] leaveGroup result:', result);
                
                if (result?.success || (!result?.errors && !result?.requiresChallenge && !result?.challengeId)) {
                    await showSuccessAndRefresh();
                    return;
                }
                
                if (result?.requiresChallenge || result?.challengeId) {
                    const challengeType = result.challengeType;
                    console.log('[GroupsPage] Challenge required:', challengeType || result.challengeId);

                    if (challengeType === 'twostepverification' || challengeType === 'forcetwostepverification') {
                        if (joinBtn) joinBtn.textContent = '2FA Required';
                        const handled = await this.handleTwoStepChallenge(result, 'leave');
                        if (handled) {
                            await showSuccessAndRefresh();
                            return;
                        }
                        await this.setupJoinButton();
                        return;
                    }

                    if (joinBtn) joinBtn.textContent = 'Verifying...';
                    
                    if (window.roblox?.bat?.performGroupAction) {
                        console.log('[GroupsPage] Using BAT performGroupAction for challenge...');
                        const challengeResult = await window.roblox.bat.performGroupAction(this.groupId, 'leave');
                        console.log('[GroupsPage] Challenge result:', challengeResult);
                        
                        if (challengeResult?.success) {
                            await showSuccessAndRefresh();
                            return;
                        } else if (challengeResult?.cancelled) {
                            console.log('[GroupsPage] User cancelled');
                            await this.setupJoinButton();
                            return;
                        } else if (challengeResult?.timeout) {
                            alert('The action timed out. Please try again.');
                            await this.setupJoinButton();
                            return;
                        }
                    }

                    if (joinBtn) joinBtn.textContent = 'Verification Required';
                    const confirmed = confirm(
                        'This action requires verification which cannot be completed in the app.\n\n' +
                        'Would you like to open the group page on Roblox.com to leave?'
                    );
                    
                    if (confirmed) {
                        const groupUrl = `https://www.roblox.com/groups/${this.groupId}`;
                        if (window.roblox?.openExternal) {
                            window.roblox.openExternal(groupUrl);
                        } else {
                            window.open(groupUrl, '_blank');
                        }
                    }
                    await this.setupJoinButton();
                    return;
                }
                
                if (result?.errors) {
                    throw new Error(result.errors[0]?.message || 'Failed to leave group');
                }
            }
        } catch (error) {
            console.error('[GroupsPage] Failed to leave group:', error);
            if (joinBtn) {
                joinBtn.textContent = 'Failed';
                await new Promise(resolve => setTimeout(resolve, 2000));
                joinBtn.textContent = originalText;
                joinBtn.style.pointerEvents = 'auto';
            }
            alert('Failed to leave group: ' + error.message);
        }
    }
    
    async handleTwoStepChallenge(challengeResult, action) {
        const actionText = action === 'join' ? 'join' : 'leave';
        const metadata = challengeResult.challengeMetadata;
        
        console.log('[GroupsPage] Handling 2FA challenge:', challengeResult);
        
        const code = prompt(
            `Two-Step Verification Required\n\n` +
            `To ${actionText} this group, enter the 6-digit code from your authenticator app:`
        );
        
        if (!code || code.trim().length !== 6) {
            console.log('[GroupsPage] 2FA cancelled or invalid code');
            return false;
        }
        
        try {
            const challengeIdToUse = challengeResult.challengeType === 'twostepverification'
                ? (metadata?.challengeId || challengeResult.challengeId)
                : challengeResult.challengeId;
            
            console.log('[GroupsPage] Verifying 2FA with challengeId:', challengeIdToUse);
            
            const verifyResult = await window.roblox.verifyTwoStepForChallenge(
                this.currentUserId,
                challengeIdToUse,
                code.trim(),
                'authenticator'
            );
            
            if (!verifyResult?.success) {
                throw new Error(verifyResult?.error || 'Verification failed');
            }
            
            console.log('[GroupsPage] 2FA verified, continuing challenge...');
            
            await window.roblox.continueChallenge(
                challengeResult.challengeId,
                challengeResult.challengeType,
                verifyResult.verificationToken,
                verifyResult.rememberTicket,
                challengeIdToUse
            );
            
            console.log('[GroupsPage] Retrying group action after 2FA...');
            
            let result;
            if (action === 'join') {
                result = await window.roblox.joinGroup(this.groupId);
            } else {
                result = await window.roblox.leaveGroup(this.groupId, this.currentUserId);
            }
            
            console.log('[GroupsPage] Retry result:', result);
            
            if (result?.requiresChallenge) {
                alert('Verification failed. Please try again.');
                return false;
            }
            
            if (result?.success || result?.groupId || !result?.errors) {
                return true;
            }
            
            throw new Error(result?.errors?.[0]?.message || 'Action failed after 2FA');
            
        } catch (error) {
            console.error('[GroupsPage] 2FA verification failed:', error);
            alert('Verification failed: ' + (error.message || 'Unknown error'));
            return false;
        }
    }

    async postToWall() {
        const input = document.getElementById('wall-post-input');
        if (!input) return;
        
        const message = input.value.trim();
        if (!message) {
            alert('Please enter a message.');
            return;
        }
        
        try {
            if (window.roblox.postGroupWall) {
                await window.roblox.postGroupWall(this.groupId, message);
                input.value = '';
                this.wallPage = 1;
                this.wallCursor = null;
                await this.loadWallPosts();
            }
        } catch (error) {
            console.error('[GroupsPage] Failed to post to wall:', error);
            alert('Failed to post: ' + error.message);
        }
    }

    showError(message) {
        const nameEl = document.getElementById('group-name');
        if (nameEl) nameEl.textContent = 'Error';
        
        const descEl = document.getElementById('group-description');
        if (descEl) descEl.textContent = message || 'An error occurred.';
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

    formatDate(dateStr) {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
            });
        } catch (e) {
            return dateStr;
        }
    }
}

window.GroupsPageRenderer = GroupsPageRenderer;

