class GameDetailPageRenderer {
    constructor() {
        this.currentPlaceId = null;
        this.currentUniverseId = null;
        this.isLoading = false;
        this.thumbnailLoader = null;

        this.allServers = [];
        this.currentServerPage = 1;
        this.serversPerPage = 6;

        this.isBestConnectionProcessing = false;

        this.GAME_PLACEHOLDER = '../images/game-placeholder.png';
        this.AVATAR_PLACEHOLDER = '../images/avatar-placeholder.png';
    }

    async init(placeId, universeId = null) {
        if (this.isLoading) return;
        
        console.log('[GameDetailPage] Initializing for placeId:', placeId);
        
        this.isLoading = true;
        this.currentPlaceId = placeId;
        this.currentUniverseId = universeId;

        this.isBestConnectionProcessing = false;
        this.allServers = [];
        this.currentServerPage = 1;

        if (window.ThumbnailLoader) {
            this.thumbnailLoader = new window.ThumbnailLoader({
                gamePlaceholder: this.GAME_PLACEHOLDER,
                avatarPlaceholder: this.AVATAR_PLACEHOLDER
            });
        }

        try {

            if (!universeId) {
                universeId = await this.getUniverseId(placeId);
                this.currentUniverseId = universeId;
            }

            if (!universeId) {
                throw new Error('Could not determine universe ID for this game');
            }

            await this.loadGameData(placeId, universeId);

            this.setupEventHandlers();
            
            console.log('[GameDetailPage] Initialization complete');
        } catch (error) {
            console.error('[GameDetailPage] Initialization failed:', error);
            this.showError(error.message);
        } finally {
            this.isLoading = false;
        }
    }

    async getUniverseId(placeId) {
        const api = window.robloxAPI || window.roblox;
        if (!api) return null;

        try {
            if (api.getPlaceDetails) {
                const details = await api.getPlaceDetails([placeId]);
                if (details?.[0]?.universeId) {
                    return details[0].universeId;
                }
            }
            
            if (api.multigetPlaceDetails) {
                const details = await api.multigetPlaceDetails([placeId]);
                if (details?.[0]?.universeId) {
                    return details[0].universeId;
                }
            }
        } catch (e) {
            console.error('[GameDetailPage] Failed to get universe ID:', e);
        }
        
        return null;
    }

    async loadGameData(placeId, universeId) {
        const api = window.robloxAPI || window.roblox;
        if (!api) throw new Error('API not available');

        const gameDetails = await api.getGameDetails([universeId]);
        if (!gameDetails?.data?.[0]) {
            throw new Error('Game not found');
        }

        const game = gameDetails.data[0];
        this.gameData = game; 

        this.updateBasicInfo(game);

        const promises = [
            this.loadThumbnail(universeId),
            this.loadVotes(universeId),
            this.loadFavorites(universeId),
            this.loadServers(placeId),
            this.loadGamePasses(universeId),
            this.loadBadges(universeId),
            this.loadRecommendations(universeId),
            this.loadRovlooStats(placeId, universeId),
            this.checkFavoriteStatus(), 
            this.loadPlaytime(placeId, universeId) 
        ];

        await Promise.allSettled(promises);

        if (window.ReviewComponent) {
            console.log('[GameDetailPage] Initializing ReviewComponent for placeId:', placeId);
            window.ReviewComponent.init(placeId, 'ReviewsSection', { universeId: universeId }).catch(err => {
                console.error('[GameDetailPage] ReviewComponent init failed:', err);
            });
        }
    }

    async loadPlaytime(placeId, universeId) {
        try {
            if (window.PlaytimeTracker) {
                const playtimeData = await window.PlaytimeTracker.getPlaytimeDataAsync(placeId, universeId);
                console.log('[GameDetailPage] Playtime data:', playtimeData);

                const playtimeEl = document.getElementById('UserPlaytime');
                const playtimeSection = document.getElementById('RovlooPlaytimeSection');
                if (playtimeEl && playtimeData.totalMinutes > 0) {
                    playtimeEl.textContent = window.PlaytimeTracker.formatPlaytimeMinutes(playtimeData.totalMinutes);
                    if (playtimeSection) {
                        playtimeSection.style.display = '';
                    }
                }
            }
        } catch (e) {
            console.error('[GameDetailPage] Failed to load playtime:', e);
        }
    }

    updateBasicInfo(game) {

        const titleEl = document.getElementById('GameTitle');
        if (titleEl) {
            titleEl.textContent = game.name || 'Unknown Game';
            titleEl.title = game.name || '';

            const titleLength = (game.name || '').length;
            if (titleLength <= 16) {
                titleEl.style.fontSize = '48px';
            } else if (titleLength <= 24) {
                titleEl.style.fontSize = '40px';
            } else {
                titleEl.style.fontSize = '36px';
            }
        }

        if (game.name) {
            document.title = `${game.name} - ROBLOX`;
        }

        const descEl = document.getElementById('GameDescription');
        if (descEl) {
            descEl.innerHTML = this.formatDescription(game.description || 'No description available.');
        }

        const creatorLink = document.getElementById('CreatorLink');
        if (creatorLink && game.creator) {
            creatorLink.textContent = game.creator.name || 'Unknown';
            if (game.creator.type === 'User') {
                creatorLink.href = `profile.html?userId=${game.creator.id}`;
            } else if (game.creator.type === 'Group') {
                creatorLink.href = `groups.html?groupId=${game.creator.id}`;
            }
        }

        this.updateStat('PlayingCount', game.playing || 0);
        this.updateStat('VisitsCount', game.visits || 0);
        this.updateStat('MaxPlayers', game.maxPlayers || '--');

        const createdEl = document.getElementById('CreatedDate');
        if (createdEl && game.created) {
            createdEl.textContent = this.formatDate(game.created);
        }

        const updatedEl = document.getElementById('UpdatedDate');
        if (updatedEl && game.updated) {
            updatedEl.textContent = this.formatRelativeTime(game.updated);
        }

        const genreLink = document.getElementById('GenreLink');
        if (genreLink) {
            const genre = game.genre_l1 || game.genre || 'All';
            genreLink.textContent = genre;
            genreLink.href = `games.html?genre=${encodeURIComponent(genre)}`;
        }

        const copyLockedEl = document.getElementById('CopyLockedNote');
        if (copyLockedEl) {
            copyLockedEl.style.display = game.copyingAllowed === false ? 'inline' : 'none';
        }
    }

    updateStat(elementId, value) {
        const el = document.getElementById(elementId);
        if (!el) return;

        if (typeof value === 'number') {
            el.textContent = this.formatNumber(value);
            el.title = value.toLocaleString();
        } else {
            el.textContent = value;
        }
    }

    async loadThumbnail(universeId) {
        const api = window.robloxAPI || window.roblox;
        const carouselInner = document.getElementById('carousel-inner');
        const carouselEl = document.getElementById('rbx-carousel');
        const prevBtn = document.getElementById('carousel-prev');
        const nextBtn = document.getElementById('carousel-next');
        const indicators = document.getElementById('carousel-indicators');
        
        if (!carouselInner || !api?.getGameThumbnails) return;

        try {
            const result = await api.getGameThumbnails([universeId], '768x432');
            let thumbnails = [];

            if (result?.data?.[0]?.thumbnails) {
                thumbnails = result.data[0].thumbnails.map(t => t.imageUrl).filter(Boolean);
            } else if (result?.data?.[0]?.imageUrl) {
                thumbnails = [result.data[0].imageUrl];
            }
            
            if (thumbnails.length === 0) {
                console.log('[GameDetailPage] No thumbnails found');
                return;
            }
            
            console.log('[GameDetailPage] Found', thumbnails.length, 'thumbnails');

            carouselInner.innerHTML = thumbnails.map((url, index) => `
                <div class="item${index === 0 ? ' active' : ''}" data-index="${index}">
                    <span><img class="CarouselThumb" src="${url}" alt="Game Thumbnail ${index + 1}"/></span>
                </div>
            `).join('');

            if (thumbnails.length > 1) {
                this.setupCarousel(thumbnails.length);
            }
            
        } catch (e) {
            console.error('[GameDetailPage] Failed to load thumbnail:', e);
        }
    }

    setupCarousel(totalSlides) {
        const carouselEl = document.getElementById('rbx-carousel');
        const prevBtn = document.getElementById('carousel-prev');
        const nextBtn = document.getElementById('carousel-next');
        const indicators = document.getElementById('carousel-indicators');
        const carouselInner = document.getElementById('carousel-inner');
        
        if (!carouselEl || !prevBtn || !nextBtn || !indicators) return;
        
        let currentIndex = 0;
        let autoAdvanceInterval = null;
        let isHovering = false;
        const AUTO_ADVANCE_DELAY = 5000; 
        const FADE_DURATION = 400; 

        indicators.innerHTML = Array.from({ length: totalSlides }, (_, i) => 
            `<li data-index="${i}" class="${i === 0 ? 'active' : ''}"></li>`
        ).join('');
        indicators.style.display = 'block';

        carouselEl.addEventListener('mouseenter', () => {
            isHovering = true;
            prevBtn.style.display = 'block';
            nextBtn.style.display = 'block';
            stopAutoAdvance();
        });
        
        carouselEl.addEventListener('mouseleave', () => {
            isHovering = false;
            prevBtn.style.display = 'none';
            nextBtn.style.display = 'none';
            startAutoAdvance();
        });

        const goToSlide = (index, direction = 'next') => {
            if (index === currentIndex) return;
            
            const items = carouselInner.querySelectorAll('.item');
            const currentItem = items[currentIndex];
            const nextItem = items[index];
            
            if (!currentItem || !nextItem) return;

            currentItem.style.transition = `opacity ${FADE_DURATION}ms ease`;
            currentItem.style.opacity = '0';

            nextItem.classList.add('active');
            nextItem.style.opacity = '0';
            nextItem.style.transition = `opacity ${FADE_DURATION}ms ease`;

            setTimeout(() => {
                nextItem.style.opacity = '1';
            }, 50);

            setTimeout(() => {
                currentItem.classList.remove('active');
                currentItem.style.opacity = '';
                currentItem.style.transition = '';
                nextItem.style.transition = '';
            }, FADE_DURATION + 50);

            indicators.querySelectorAll('li').forEach((li, i) => {
                li.classList.toggle('active', i === index);
            });
            
            currentIndex = index;
        };

        const prevSlide = () => {
            const newIndex = (currentIndex - 1 + totalSlides) % totalSlides;
            goToSlide(newIndex, 'prev');
        };

        const nextSlide = () => {
            const newIndex = (currentIndex + 1) % totalSlides;
            goToSlide(newIndex, 'next');
        };

        const startAutoAdvance = () => {
            if (autoAdvanceInterval) return;
            autoAdvanceInterval = setInterval(() => {
                if (!isHovering) {
                    nextSlide();
                }
            }, AUTO_ADVANCE_DELAY);
        };
        
        const stopAutoAdvance = () => {
            if (autoAdvanceInterval) {
                clearInterval(autoAdvanceInterval);
                autoAdvanceInterval = null;
            }
        };

        prevBtn.addEventListener('click', (e) => {
            e.preventDefault();
            prevSlide();
        });
        
        nextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            nextSlide();
        });

        indicators.addEventListener('click', (e) => {
            const li = e.target.closest('li');
            if (li) {
                const index = parseInt(li.dataset.index, 10);
                if (!isNaN(index)) {
                    goToSlide(index);
                }
            }
        });

        startAutoAdvance();

        this.carouselCleanup = () => {
            stopAutoAdvance();
        };
    }

    async loadVotes(universeId) {
        const api = window.robloxAPI || window.roblox;
        if (!api?.getGameVotes) return;

        try {

            const result = await api.getGameVotes([universeId]);

            if (result?.data?.[0]) {
                const votes = result.data[0];
                const upVotes = votes.upVotes || 0;
                const downVotes = votes.downVotes || 0;
                const total = upVotes + downVotes;
                const percent = total > 0 ? Math.round((upVotes / total) * 100) : 50;

                const upEl = document.getElementById('vote-up-text');
                const downEl = document.getElementById('vote-down-text');
                const barEl = document.querySelector('.voting-panel .percent');

                if (upEl) {
                    upEl.textContent = this.formatVoteCount(upVotes);
                    upEl.title = upVotes.toLocaleString();
                }
                if (downEl) {
                    downEl.textContent = this.formatVoteCount(downVotes);
                    downEl.title = downVotes.toLocaleString();
                }
                if (barEl) {
                    barEl.style.width = `${percent}%`;
                }
            }

            if (window.roblox?.getUserVote) {
                try {
                    const userVote = await window.roblox.getUserVote(universeId);
                    console.log('[GameDetailPage] User vote data:', userVote);
                    if (userVote && userVote.userVote !== undefined && userVote.userVote !== null) {
                        this.updateVoteButtonStates(userVote.userVote);
                    }
                } catch (e) {
                    console.log('[GameDetailPage] Failed to get user vote (user may not be logged in):', e);
                }
            }
        } catch (e) {
            console.error('[GameDetailPage] Failed to load votes:', e);
        }
    }

    updateVoteButtonStates(userVote) {
        const upIcon = document.querySelector('#VoteUpButton .rbx-icon-like');
        const downIcon = document.querySelector('#VoteDownButton .rbx-icon-dislike');

        console.log('[GameDetailPage] updateVoteButtonStates called with:', userVote);
        console.log('[GameDetailPage] upIcon found:', !!upIcon);
        console.log('[GameDetailPage] downIcon found:', !!downIcon);

        upIcon?.classList.remove('selected');
        downIcon?.classList.remove('selected');

        if (userVote === true) {
            upIcon?.classList.add('selected');
            console.log('[GameDetailPage] Added selected to upIcon');
        } else if (userVote === false) {
            downIcon?.classList.add('selected');
            console.log('[GameDetailPage] Added selected to downIcon');
        }
    }

    async loadFavorites(universeId) {
        const api = window.robloxAPI || window.RobloxClient?.api;
        
        console.log('[GameDetailPage] loadFavorites called with universeId:', universeId);
        console.log('[GameDetailPage] API available:', !!api);
        console.log('[GameDetailPage] getGameFavoritesCount available:', !!api?.getGameFavoritesCount);
        
        if (!api?.getGameFavoritesCount) {
            console.warn('[GameDetailPage] getGameFavoritesCount not available');
            return;
        }

        try {
            const result = await api.getGameFavoritesCount(universeId);
            console.log('[GameDetailPage] Favorites count result:', result);
            
            const favEl = document.querySelector('.favoriteCount');
            if (favEl && result?.favoritesCount !== undefined) {
                favEl.textContent = this.formatVoteCount(result.favoritesCount);
                favEl.title = result.favoritesCount.toLocaleString();
            }

            if (api?.getGameFavoriteStatus) {
                try {
                    const status = await api.getGameFavoriteStatus(universeId);
                    const favIcon = document.getElementById('FavoriteIcon');
                    if (favIcon && status?.isFavorited) {
                        favIcon.classList.add('favorited');
                    }
                } catch (e) {

                }
            }
        } catch (e) {
            console.error('[GameDetailPage] Failed to load favorites:', e);
        }
    }

    async loadServers(placeId) {
        const api = window.robloxAPI || window.roblox;
        const container = document.getElementById('rbx-game-server-item-container');
        const loadingEl = document.getElementById('ServersLoading');
        const loadingStatusEl = document.getElementById('ServerLoadingStatus');
        const noServersEl = document.getElementById('NoServersMessage');
        const paginationEl = document.getElementById('ServersPagination');
        
        if (!container || !api?.getGameServers) return;

        const excludeFullCheckbox = document.getElementById('ExcludeFullServers');
        const sortDropdown = document.getElementById('ServerSortOrder');
        const sortOrder = sortDropdown?.value || 'desc';

        const excludeFullUserPref = excludeFullCheckbox?.checked || false;
        const excludeFull = sortOrder === 'bestConnection' ? true : excludeFullUserPref;

        if (this.isBestConnectionProcessing && sortOrder === 'bestConnection') {
            console.log('[GameDetailPage] Best Connection already processing, ignoring duplicate request');
            return;
        }

        if (loadingEl) loadingEl.style.display = 'block';
        if (noServersEl) noServersEl.style.display = 'none';
        if (paginationEl) paginationEl.style.display = 'none';
        container.innerHTML = '';

        const updateLoadingStatus = (message) => {
            if (loadingStatusEl) loadingStatusEl.textContent = message;
        };

        const isApiSort = sortOrder === 'desc' || sortOrder === 'asc';
        const apiSortOrder = isApiSort ? (sortOrder === 'desc' ? 'Desc' : 'Asc') : 'Desc';

        try {
            const result = await api.getGameServers(placeId, 'Public', 100, '', apiSortOrder, excludeFull);
            
            if (result?.data && result.data.length > 0) {
                let servers = [...result.data];

                await this.loadPlayerAvatarsForServers(servers);

                if (sortOrder === 'newest') {
                    servers.sort((a, b) => {
                        const idA = a.id || '';
                        const idB = b.id || '';
                        return idB.localeCompare(idA);
                    });
                } else if (sortOrder === 'bestConnection') {

                    console.log('[GameDetailPage] Sorting by best connection (region proximity)...');
                    this.isBestConnectionProcessing = true;
                    
                    try {
                        updateLoadingStatus('Detecting your best region...');

                        if (!window._regionLatencyRanking) {
                            console.log('[GameDetailPage] Measuring latency to all Roblox regions...');
                            const regionResults = await window.RobloxClient?.ping?.measureAllRegions();
                            if (regionResults && regionResults.length > 0) {
                                window._regionLatencyRanking = {};
                                window._regionLatencyData = regionResults;
                                regionResults.forEach((r, index) => {
                                    window._regionLatencyRanking[r.region] = index;
                                });
                                console.log('[GameDetailPage] Top 5 regions:', regionResults.slice(0, 5).map(r => `${r.region}: ~${r.latency}ms`).join(', '));
                            }
                        } else {
                            const bestRegion = window._regionLatencyData?.[0];
                            if (bestRegion) {
                                updateLoadingStatus(`Best region: ${bestRegion.region} (~${bestRegion.latency}ms)`);
                            }
                        }

                        await this.resolveServerRegions(servers, placeId, updateLoadingStatus);

                        this.sortServersByLatency(servers);
                        
                        this.isBestConnectionProcessing = false;
                    } catch (e) {
                        console.error('[GameDetailPage] Failed to sort by best connection:', e);
                        this.isBestConnectionProcessing = false;
                    }
                }
                
                if (loadingEl) loadingEl.style.display = 'none';
                
                this.allServers = servers;
                this.currentServerPage = 1;
                this.renderServersWithPagination();
            } else {
                if (loadingEl) loadingEl.style.display = 'none';
                container.innerHTML = '';
                if (noServersEl) {
                    noServersEl.style.display = 'block';
                    if (sortOrder === 'bestConnection') {
                        noServersEl.textContent = 'No available servers with open slots. Best Connection requires servers with available space to detect their region.';
                    } else if (excludeFull) {
                        noServersEl.textContent = 'No available servers with open slots. Try unchecking "Exclude Full Servers".';
                    } else {
                        noServersEl.textContent = 'No servers are currently running.';
                    }
                }
            }
        } catch (e) {
            console.error('[GameDetailPage] Failed to load servers:', e);
            if (loadingEl) loadingEl.style.display = 'none';
            container.innerHTML = '<li class="error-message">Failed to load servers.</li>';
        }
    }

    async resolveServerRegions(servers, placeId, updateLoadingStatus) {
        const api = window.robloxAPI || window.roblox;

        const REGION_CACHE_VERSION = 2;
        const cacheKey = `serverRegions_v${REGION_CACHE_VERSION}_${placeId}`;
        let cachedRegions = {};
        try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                cachedRegions = JSON.parse(cached);

                const oneHourAgo = Date.now() - (60 * 60 * 1000);
                Object.keys(cachedRegions).forEach(serverId => {
                    if (cachedRegions[serverId].timestamp < oneHourAgo) {
                        delete cachedRegions[serverId];
                    }
                });
            }
        } catch (e) {
            cachedRegions = {};
        }

        let serversToResolve;
        if (servers.length <= 100) {
            serversToResolve = servers;
        } else {

            const firstBatch = servers.slice(0, 50);
            const remaining = servers.slice(50);
            const sampleSize = Math.min(50, remaining.length);
            const randomSample = [];
            const weightedRemaining = remaining.sort((a, b) => (b.playing || 0) - (a.playing || 0));
            const step = Math.max(1, Math.floor(weightedRemaining.length / sampleSize));
            for (let i = 0; i < weightedRemaining.length && randomSample.length < sampleSize; i += step) {
                randomSample.push(weightedRemaining[i]);
            }
            serversToResolve = [...firstBatch, ...randomSample];
            console.log(`[GameDetailPage] Large server list (${servers.length}): analyzing ${serversToResolve.length} strategically sampled servers`);
        }

        let resolvedCount = 0;
        let errorCount = 0;
        
        console.log(`[GameDetailPage] Resolving regions for ${serversToResolve.length} servers...`);
        updateLoadingStatus(`Detecting server regions (0/${serversToResolve.length})...`);

        const batchSize = 10;
        for (let i = 0; i < serversToResolve.length; i += batchSize) {
            const batch = serversToResolve.slice(i, i + batchSize);
            
            await Promise.all(batch.map(async (server) => {
                try {

                    if (cachedRegions[server.id]) {
                        const cached = cachedRegions[server.id];
                        server.regionString = cached.regionString;
                        server.estimatedLatency = cached.estimatedLatency;
                        server.serverIP = cached.serverIP;
                        resolvedCount++;
                        return;
                    }

                    const connInfo = await api.getServerConnectionInfo(placeId, server.id);
                    
                    if (!connInfo) {
                        errorCount++;
                        return;
                    }

                    if (connInfo.status === 22) {

                        return;
                    }
                    
                    const ip = connInfo?.joinScript?.UdmuxEndpoints?.[0]?.Address || 
                               connInfo?.joinScript?.MachineAddress;
                    
                    if (ip) {
                        server.serverIP = ip;

                        const regionInfo = await window.RobloxClient?.region?.resolveIp(ip);
                        if (regionInfo) {
                            server.regionString = regionInfo.locationString;

                            let latencyRegionKey = regionInfo.regionKey;
                            if (regionInfo.routedTo) {
                                latencyRegionKey = regionInfo.routedTo;
                            }
                            const rank = window._regionLatencyRanking?.[latencyRegionKey];
                            server.estimatedLatency = rank !== undefined ? window._regionLatencyData[rank]?.latency ?? 9999 : 9999;
                            resolvedCount++;

                            cachedRegions[server.id] = {
                                regionString: server.regionString,
                                estimatedLatency: server.estimatedLatency,
                                serverIP: ip,
                                timestamp: Date.now()
                            };
                        } else {
                            server.regionString = 'Unknown';
                            server.estimatedLatency = 9999;
                            resolvedCount++;

                            cachedRegions[server.id] = {
                                regionString: server.regionString,
                                estimatedLatency: server.estimatedLatency,
                                serverIP: ip,
                                timestamp: Date.now()
                            };
                        }
                    }
                } catch (e) {
                    errorCount++;
                }
            }));

            updateLoadingStatus(`Detecting server regions (${Math.min(i + batchSize, serversToResolve.length)}/${serversToResolve.length})...`);

            if (i + batchSize < serversToResolve.length) {
                await new Promise(r => setTimeout(r, 150));
            }
        }
        
        console.log(`[GameDetailPage] Resolved regions for ${resolvedCount}/${serversToResolve.length} servers (${errorCount} errors)`);

        try {
            localStorage.setItem(cacheKey, JSON.stringify(cachedRegions));
        } catch (e) {
            console.warn('[GameDetailPage] Failed to save server region cache:', e);
        }
    }

    sortServersByLatency(servers) {
        servers.sort((a, b) => {
            const latencyA = a.estimatedLatency ?? 9999;
            const latencyB = b.estimatedLatency ?? 9999;

            if (latencyA !== latencyB) {
                return latencyA - latencyB;
            }

            return (b.playing || 0) - (a.playing || 0);
        });
    }

    async loadPlayerAvatarsForServers(servers) {
        const api = window.robloxAPI || window.roblox;
        if (!api?.getPlayerAvatarsByToken) return;

        const tokenSet = new Set();
        servers.forEach(server => {
            if (server.playerTokens) {
                server.playerTokens.forEach(token => tokenSet.add(token));
            }
        });

        const tokens = Array.from(tokenSet);
        if (tokens.length === 0) return;

        try {

            const batchSize = 100;
            const avatarMap = {};

            for (let i = 0; i < tokens.length; i += batchSize) {
                const batch = tokens.slice(i, i + batchSize);
                const result = await api.getPlayerAvatarsByToken(batch, '150x150', 'Webp');
                
                if (result?.data) {
                    result.data.forEach(item => {
                        const match = item.requestId?.match(/AvatarHeadShot::([A-F0-9]+)::/);
                        if (match && item.imageUrl) {
                            avatarMap[match[1]] = item.imageUrl;
                        }
                    });
                }
            }

            servers.forEach(server => {
                server.playerAvatars = [];
                if (server.playerTokens) {
                    server.playerTokens.forEach(token => {
                        if (avatarMap[token]) {
                            server.playerAvatars.push(avatarMap[token]);
                        }
                    });
                }
            });
        } catch (e) {
            console.warn('[GameDetailPage] Failed to load player avatars:', e);
        }
    }

    renderServersWithPagination() {
        const container = document.getElementById('rbx-game-server-item-container');
        const paginationEl = document.getElementById('ServersPagination');
        const pageInfoEl = document.getElementById('ServersPageInfo');
        const loadMoreBtn = document.getElementById('LoadMoreServers');
        
        if (!container) return;

        const totalPages = Math.ceil(this.allServers.length / this.serversPerPage);
        const startIdx = (this.currentServerPage - 1) * this.serversPerPage;
        const endIdx = startIdx + this.serversPerPage;
        const serversToShow = this.allServers.slice(startIdx, endIdx);

        container.innerHTML = serversToShow.map(server => this.renderServerItem(server)).join('');

        if (paginationEl && totalPages > 1) {
            paginationEl.style.display = 'flex';
            if (pageInfoEl) {
                pageInfoEl.textContent = `Page ${this.currentServerPage} of ${totalPages}`;
            }
            
            const prevBtn = document.getElementById('PrevServersPage');
            const nextBtn = document.getElementById('NextServersPage');

            if (prevBtn) {
                prevBtn.classList.toggle('disabled', this.currentServerPage <= 1);
            }
            if (nextBtn) {
                nextBtn.classList.toggle('disabled', this.currentServerPage >= totalPages);
            }
        } else if (paginationEl) {
            paginationEl.style.display = 'none';
        }

        if (loadMoreBtn) loadMoreBtn.classList.add('hidden');

        this.setupServerJoinButtons();
    }

    renderServers() {
        this.renderServersWithPagination();
    }

    renderServerItem(server) {
        const playerCount = server.playing || 0;
        const maxPlayers = server.maxPlayers || 0;
        const serverId = server.id || '';

        let regionHtml = '';
        if (server.regionString) {
            const latencyText = server.estimatedLatency && server.estimatedLatency < 9999 
                ? ` (~${Math.round(server.estimatedLatency)}ms)` 
                : '';
            const isUncertain = server.regionString === 'Unknown' || (server.estimatedLatency && server.estimatedLatency >= 9999);
            const tooltip = isUncertain 
                ? 'Region could not be determined from server IP'
                : 'Server datacenter location based on IP. Note: Roblox may route your connection through a different path.';
            regionHtml = `<div class="server-region${isUncertain ? ' uncertain' : ''}" title="${tooltip}">📍 ${server.regionString}${latencyText}</div>`;
        }

        return `
            <li class="section-row rbx-game-server-item" data-server-id="${serverId}">
                <div class="section-left rbx-game-server-details">
                    <div class="rbx-game-status rbx-game-server-status">${playerCount} of ${maxPlayers} Players Max</div>
                    ${regionHtml}
                    <a class="btn-full-width rbx-btn-control-xs rbx-game-server-join" href="#" data-server-id="${serverId}">Join</a>
                </div>
                <div class="section-right rbx-game-server-players">
                    ${this.renderServerPlayers(server)}
                </div>
            </li>
        `;
    }

    renderServerPlayers(server) {
        const avatars = server.playerAvatars || [];
        const tokens = server.playerTokens || [];
        const maxDisplay = 6;

        if (avatars.length > 0) {
            return avatars.slice(0, maxDisplay).map(url => 
                `<span class="avatar avatar-headshot-sm player-avatar">
                    <img src="${url}" alt="Player" class="avatar-card-image"/>
                </span>`
            ).join('');
        }

        return tokens.slice(0, maxDisplay).map(() => 
            `<span class="avatar avatar-headshot-sm player-avatar">
                <img src="${this.AVATAR_PLACEHOLDER}" alt="Player" class="avatar-card-image"/>
            </span>`
        ).join('');
    }

    setupServerFilters() {
        const excludeFullCheckbox = document.getElementById('ExcludeFullServers');
        const sortDropdown = document.getElementById('ServerSortOrder');
        const refreshBtn = document.getElementById('RefreshServers');
        const prevBtn = document.getElementById('PrevServersPage');
        const nextBtn = document.getElementById('NextServersPage');

        excludeFullCheckbox?.addEventListener('change', () => {
            this.loadServers(this.currentPlaceId);
        });

        sortDropdown?.addEventListener('change', () => {
            this.loadServers(this.currentPlaceId);
        });

        refreshBtn?.addEventListener('click', () => {
            this.loadServers(this.currentPlaceId);
        });

        prevBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            if (this.currentServerPage > 1) {
                this.currentServerPage--;
                this.renderServersWithPagination();
            }
        });

        nextBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            const totalPages = Math.ceil(this.allServers.length / this.serversPerPage);
            if (this.currentServerPage < totalPages) {
                this.currentServerPage++;
                this.renderServersWithPagination();
            }
        });
    }

    async loadGamePasses(universeId) {
        const api = window.robloxAPI || window.roblox;
        const container = document.getElementById('rbx-passes-container');
        
        console.log('[GameDetailPage] loadGamePasses called with universeId:', universeId);
        console.log('[GameDetailPage] Passes container found:', !!container);
        console.log('[GameDetailPage] getGamePasses available:', !!api?.getGamePasses);
        
        if (!container || !api?.getGamePasses) {
            console.warn('[GameDetailPage] Cannot load game passes - container or API missing');
            return;
        }

        try {
            const result = await api.getGamePasses(universeId, 50);
            console.log('[GameDetailPage] Game passes result:', JSON.stringify(result, null, 2));

            const passes = result?.data || result?.gamePasses || result?.Data || [];
            console.log('[GameDetailPage] Parsed passes:', passes.length);
            
            if (passes && passes.length > 0) {
                container.innerHTML = this.renderGamePasses(passes);
                this.loadGamePassThumbnails(passes);
            } else {
                container.innerHTML = '<li class="no-passes">This game has no passes.</li>';
            }
        } catch (e) {
            console.error('[GameDetailPage] Failed to load game passes:', e);
            container.innerHTML = '<li class="error-message">Failed to load passes.</li>';
        }
    }

    renderGamePasses(passes) {
        return passes.map(pass => this.renderGamePassItem(pass)).join('');
    }

    renderGamePassItem(pass) {

        const passId = pass.id || pass.gamePassId;
        const price = pass.price !== null && pass.price !== undefined ? pass.price : null;
        const isOnSale = price !== null;
        const passUrl = `item.html?id=${passId}&type=gamepass`;

        return `
            <li class="list-item">
                <div class="rbx-item-card">
                    <a href="${passUrl}" class="gear-passes-asset" data-pass-id="${passId}">
                        <img class="" src="${this.GAME_PLACEHOLDER}" alt="${this.escapeHtml(pass.name)}" data-pass-id="${passId}"/>
                    </a>
                    <div class="rbx-caption">
                        <p>
                            <a href="${passUrl}"><strong title="${this.escapeHtml(pass.name)}">${this.escapeHtml(pass.name)}</strong></a>
                        </p>
                        <div class="rbx-item-price">
                            ${isOnSale ? `<span class="rbx-icon-robux"></span><h4 class="rbx-price-robux" style="margin-top:-5px">${price.toLocaleString()}</h4>` : '<span class="off-sale">Off Sale</span>'}
                        </div>
                        <div class="rbx-item-buy">
                            ${isOnSale ? `<button class="PurchaseButton rbx-btn-buy-xs rbx-gear-passes-purchase" data-item-id="${passId}" data-item-name="${this.escapeHtml(pass.name)}" data-expected-price="${price}"><span>Buy</span></button>` : ''}
                        </div>
                    </div>
                </div>
            </li>
        `;
    }

    async loadGamePassThumbnails(passes) {
        const api = window.roblox || window.robloxAPI;
        if (!api) return;

        try {

            const passIds = passes.map(p => p.id || p.gamePassId).filter(Boolean);
            
            if (passIds.length === 0) return;
            
            console.log('[GameDetailPage] Loading game pass icons for IDs:', passIds);
            
            let result = null;

            if (api.getGamePassIcons) {
                result = await api.getGamePassIcons(passIds, '150x150', 'Png');
                console.log('[GameDetailPage] getGamePassIcons result:', result);
            }

            else if (api.getBatchThumbnails) {
                const requests = passIds.map(id => ({
                    type: 'GamePass',
                    targetId: id,
                    size: '150x150',
                    format: 'Png'
                }));
                result = await api.getBatchThumbnails(requests);
                console.log('[GameDetailPage] getBatchThumbnails result:', result);
            }
            
            if (result?.data) {
                result.data.forEach(item => {
                    if (item.imageUrl && item.targetId) {
                        const imgs = document.querySelectorAll(`img[data-pass-id="${item.targetId}"]`);
                        console.log('[GameDetailPage] Setting thumbnail for pass', item.targetId, ':', item.imageUrl, 'found', imgs.length, 'images');
                        imgs.forEach(img => img.src = item.imageUrl);
                    }
                });
            }
        } catch (e) {
            console.error('[GameDetailPage] Failed to load pass thumbnails:', e);
        }
    }

    async loadBadges(universeId) {
        const api = window.roblox;
        const container = document.querySelector('.badge-list');
        const badgeSection = document.querySelector('.badge-container');
        if (!container || !api?.getGameBadges) {
            if (badgeSection) badgeSection.style.display = 'none';
            return;
        }

        try {
            const result = await api.getGameBadges(universeId, 50);
            
            if (result?.data && result.data.length > 0) {

                const badgeThumbnails = {};
                const badgeIds = result.data.map(b => b.id);
                
                try {
                    const thumbResult = await api.getBadgeThumbnails(badgeIds, '150x150');
                    if (thumbResult?.data) {
                        thumbResult.data.forEach(t => {
                            badgeThumbnails[t.targetId] = t.imageUrl;
                        });
                    }
                } catch (e) {
                    console.warn('[GameDetailPage] Failed to load badge thumbnails:', e);
                }

                this.allBadges = result.data;
                this.badgeThumbnails = badgeThumbnails;
                this.badgesExpanded = false;
                
                container.innerHTML = this.renderBadges(result.data, badgeThumbnails);
                this.setupBadgesSeeMore();
            } else {

                if (badgeSection) badgeSection.style.display = 'none';
            }
        } catch (e) {
            console.error('[GameDetailPage] Failed to load badges:', e);

            if (badgeSection) badgeSection.style.display = 'none';
        }
    }

    renderBadges(badges, thumbnails = {}) {
        const displayBadges = this.badgesExpanded ? badges : badges.slice(0, 3);
        const badgeItems = displayBadges.map(badge => this.renderBadgeItem(badge, thumbnails[badge.id])).join('');
        const seeMoreBtn = badges.length > 3 ? `
            <li>
                <button type="button" class="btn-full-width btn-control-sm" id="badges-see-more">
                    ${this.badgesExpanded ? 'See Less' : 'See More'}
                </button>
            </li>
        ` : '';
        return badgeItems + seeMoreBtn;
    }

    setupBadgesSeeMore() {
        const btn = document.getElementById('badges-see-more');
        if (btn) {
            btn.addEventListener('click', () => {
                this.badgesExpanded = !this.badgesExpanded;
                const container = document.querySelector('.badge-list');
                if (container) {
                    container.innerHTML = this.renderBadges(this.allBadges, this.badgeThumbnails);
                    this.setupBadgesSeeMore();
                }
            });
        }
    }

    renderBadgeItem(badge, thumbnailUrl) {
        const rarity = badge.statistics?.winRatePercentage 
            ? `${badge.statistics.winRatePercentage.toFixed(1)}% (${this.getRarityLabel(badge.statistics.winRatePercentage)})`
            : 'Unknown';
        const wonYesterday = badge.statistics?.pastDayAwardedCount || 0;
        const wonEver = badge.statistics?.awardedCount || 0;
        
        const imgSrc = thumbnailUrl || this.GAME_PLACEHOLDER;
        const badgeUrl = `item.html?id=${badge.id}&type=badge`;

        return `
            <li class="section-row badge-row">
                <div class="badge-image">
                    <a href="${badgeUrl}" data-badge-id="${badge.id}">
                        <img src="${imgSrc}" alt="${this.escapeHtml(badge.name)}" data-badge-id="${badge.id}">
                    </a>
                </div>
                <div class="badge-data-container">
                    <a href="${badgeUrl}"><strong>${this.escapeHtml(badge.name)}</strong></a>
                    <p class="text-overflow">
                        ${this.escapeHtml(badge.description || '')}
                    </p>
                </div>
                <ul class="badge-stats-container">
                    <li>Rarity: ${rarity}</li>
                    <li>Won Yesterday: ${wonYesterday.toLocaleString()}</li>
                    <li>Won Ever: ${wonEver.toLocaleString()}</li>
                </ul>
            </li>
        `;
    }

    getRarityLabel(percentage) {
        if (percentage >= 50) return 'Freebie';
        if (percentage >= 20) return 'Easy';
        if (percentage >= 10) return 'Moderate';
        if (percentage >= 5) return 'Challenging';
        if (percentage >= 1) return 'Hard';
        return 'Insane';
    }

    async loadRecommendations(universeId) {
        const api = window.robloxAPI || window.roblox;
        const container = document.getElementById('RecommendationsContainer');
        const recommendationsSection = document.querySelector('.recommended-games-section');
        
        if (!container) {
            if (recommendationsSection) recommendationsSection.style.display = 'none';
            return;
        }

        try {
            let games = [];

            if (api?.getGameRecommendations) {
                try {
                    const result = await api.getGameRecommendations(universeId, 6);
                    if (result?.games && result.games.length > 0) {
                        games = result.games.slice(0, 6);
                    } else if (result?.data && result.data.length > 0) {
                        games = result.data.slice(0, 6);
                    }
                } catch (e) {
                    console.warn('[GameDetailPage] Game recommendations failed:', e);
                }
            }

            if (games.length === 0 && api?.getOmniRecommendations) {
                try {
                    const recs = await api.getOmniRecommendations('Game', null);
                    
                    if (recs?.sorts && Array.isArray(recs.sorts)) {
                        for (const sort of recs.sorts) {
                            if (sort.topic && sort.topic.id) {
                                const topicGames = sort.topic.id.map(id => recs.contentMetadata?.Game?.[id]).filter(g => g);
                                if (topicGames.length > 0) {
                                    games = topicGames.slice(0, 6);
                                    break;
                                }
                            } else if (sort.games && sort.games.length > 0) {
                                games = sort.games.slice(0, 6);
                                break;
                            }
                        }
                    }

                    if (games.length === 0 && recs?.contentRows) {
                        for (const row of recs.contentRows) {
                            if (row.contents && row.contents.length > 0) {
                                games = row.contents.slice(0, 6);
                                break;
                            }
                        }
                    }
                } catch (e) {
                    console.warn('[GameDetailPage] Omni recommendations failed:', e);
                }
            }

            if (games.length === 0 && api?.getPopularGames) {
                try {
                    const popular = await api.getPopularGames();
                    if (popular?.data) {
                        games = popular.data.slice(0, 6);
                    }
                } catch (e) {
                    console.warn('[GameDetailPage] Popular games failed:', e);
                }
            }

            if (games.length > 0) {

                await Promise.all([
                    this.loadRecommendationThumbnailsDirect(games),
                    this.loadRecommendationDetails(games)
                ]);
                container.innerHTML = this.renderRecommendations(games);
            } else {

                if (recommendationsSection) recommendationsSection.style.display = 'none';
            }
        } catch (e) {
            console.error('[GameDetailPage] Failed to load recommendations:', e);
            if (recommendationsSection) recommendationsSection.style.display = 'none';
        }
    }

    async loadRecommendationThumbnailsDirect(games) {
        const api = window.robloxAPI || window.roblox;
        const universeIds = games.map(g => g.universeId || g.id).filter(id => id);

        if (universeIds.length === 0) return;

        try {
            if (api?.getGameIcons) {
                const icons = await api.getGameIcons(universeIds, '150x150');
                if (icons?.data) {
                    icons.data.forEach(icon => {
                        const game = games.find(g => (g.universeId || g.id) === icon.targetId);
                        if (game && icon.imageUrl) {
                            game.imageUrl = icon.imageUrl;
                        }
                    });
                }
            }
        } catch (e) {
            console.warn('[GameDetailPage] Failed to load recommendation thumbnails:', e);
        }
    }

    async loadRecommendationDetails(games) {
        const api = window.robloxAPI || window.roblox;
        const universeIds = games.map(g => g.universeId || g.id).filter(id => id);

        if (universeIds.length === 0) return;

        try {

            const [detailsResult, votesResult] = await Promise.all([
                api?.getGameDetails ? api.getGameDetails(universeIds) : null,
                api?.getGameVotes ? api.getGameVotes(universeIds) : null
            ]);

            if (detailsResult?.data) {
                detailsResult.data.forEach(details => {
                    const game = games.find(g => (g.universeId || g.id) === details.id);
                    if (game) {
                        game.playing = details.playing;
                        game.creator = details.creator;
                        game.rootPlaceId = details.rootPlaceId || game.rootPlaceId;
                    }
                });
            }

            if (votesResult?.data) {
                votesResult.data.forEach(votes => {
                    const game = games.find(g => (g.universeId || g.id) === votes.id);
                    if (game) {
                        game.totalUpVotes = votes.upVotes;
                        game.totalDownVotes = votes.downVotes;
                    }
                });
            }
        } catch (e) {
            console.warn('[GameDetailPage] Failed to load recommendation details:', e);
        }
    }

    renderRecommendations(games) {
        return games.map(game => this.renderRecommendationCard(game)).join('');
    }

    renderRecommendationCard(game) {
        const universeId = game.universeId || game.id;
        const placeId = game.rootPlaceId || game.placeId;
        const upVotes = game.totalUpVotes || 0;
        const downVotes = game.totalDownVotes || 0;
        const total = upVotes + downVotes;
        const votePercent = total > 0 ? Math.round((upVotes / total) * 100) : 50;
        const imageUrl = game.imageUrl || game.thumbnailUrl || this.GAME_PLACEHOLDER;
        const gameName = this.truncateText(game.name || 'Unknown Game', 20);
        const playerCount = this.formatNumber(game.playing || 0);
        const creatorName = game.creator?.name || 'Unknown';
        
        return `
            <li class="game-card" data-universe-id="${universeId}" data-place-id="${placeId}">
                <a href="game-detail.html?placeId=${placeId}" class="game-card-container">
                    <div class="game-card-thumb-container">
                        <img src="${imageUrl}" class="game-card-thumb" alt="${this.escapeHtml(game.name)}" data-universe-id="${universeId}"/>
                    </div>
                    <div class="game-card-name" title="${this.escapeHtml(game.name)}">${this.escapeHtml(gameName)}</div>
                    <div class="game-card-name-secondary">${playerCount} Playing</div>
                    <div class="game-card-vote">
                        <div class="vote-bar">
                            <div class="vote-thumbs-up">
                                <span class="icon-thumbs-up"></span>
                            </div>
                            <div class="vote-thumbs-down">
                                <span class="icon-thumbs-down"></span>
                            </div>
                            <div class="vote-container">
                                <div class="vote-background${total === 0 ? ' no-votes' : ''}"></div>
                                <div class="vote-percentage" style="width: ${votePercent}%"></div>
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
                        <span class="vote-up-count">${this.formatVoteCount(upVotes)}</span>
                        <span class="vote-down-count">${this.formatVoteCount(downVotes)}</span>
                    </div>
                    <div class="game-card-footer">
                        <div class="game-creator">by <span class="creator-link">${this.escapeHtml(creatorName)}</span></div>
                    </div>
                </a>
            </li>
        `;
    }

    async loadRovlooStats(placeId, universeId) {
        console.log('[GameDetailPage] loadRovlooStats called with placeId:', placeId);
        
        const sectionEl = document.getElementById('RovlooStatsSection');
        const receptionEl = document.getElementById('ReviewReception');
        const playtimeSectionEl = document.getElementById('RovlooPlaytimeSection');
        const playtimeEl = document.getElementById('UserPlaytime');

        console.log('[GameDetailPage] Rovloo elements found:', { 
            sectionEl: !!sectionEl, 
            receptionEl: !!receptionEl, 
            playtimeSectionEl: !!playtimeSectionEl,
            playtimeEl: !!playtimeEl 
        });

        if (!sectionEl || !receptionEl) {
            console.warn('[GameDetailPage] Missing Rovloo stats elements');
            return;
        }

        const api = window.roblox;
        const robloxAPI = window.robloxAPI || window.roblox;
        console.log('[GameDetailPage] API available:', !!api, 'reviews API:', !!api?.reviews);
        
        if (!api?.reviews) {
            console.warn('[GameDetailPage] Reviews API not available');
            return;
        }

        try {
            let currentUserId = null;
            try {
                const user = await robloxAPI.getCurrentUser();
                currentUserId = user?.id;
                console.log('[GameDetailPage] Current user ID:', currentUserId);
            } catch (e) {
                console.log('[GameDetailPage] Not logged in');
            }

            console.log('[GameDetailPage] Fetching Rovloo stats...');
            const [stats, userReview, localPlaytime] = await Promise.all([
                api.reviews?.getStats?.(placeId).catch((e) => { console.log('[GameDetailPage] getStats error:', e); return null; }),
                currentUserId ? api.reviews?.getUserReview?.(placeId, currentUserId).catch((e) => { console.log('[GameDetailPage] getUserReview error:', e); return null; }) : null,
                currentUserId && window.PlaytimeTracker ? window.PlaytimeTracker.getPlaytimeDataAsync(placeId).catch((e) => { console.log('[GameDetailPage] getPlaytimeData error:', e); return null; }) : null
            ]);

            console.log('[GameDetailPage] Rovloo stats results:', { stats, userReview, localPlaytime });

            sectionEl.style.display = '';

            if (stats && stats.totalReviews > 0) {
                const likes = stats.likes || 0;
                const dislikes = stats.dislikes || 0;
                const total = likes + dislikes;
                const likePercentage = total > 0 ? Math.round((likes / total) * 100) : 0;

                let receptionBadge = '';
                let receptionColor = '';
                
                if (likePercentage >= 95) {
                    receptionBadge = 'Overwhelmingly Positive';
                    receptionColor = '#0a6e2d';
                } else if (likePercentage >= 80) {
                    receptionBadge = 'Very Positive';
                    receptionColor = '#1a8f44';
                } else if (likePercentage >= 70) {
                    receptionBadge = 'Positive';
                    receptionColor = '#2ecc71';
                } else if (likePercentage >= 50) {
                    receptionBadge = 'Mostly Positive';
                    receptionColor = '#5dade2';
                } else if (likePercentage >= 40) {
                    receptionBadge = 'Mixed';
                    receptionColor = '#95a5a6';
                } else if (likePercentage >= 20) {
                    receptionBadge = 'Mostly Negative';
                    receptionColor = '#e67e22';
                } else {
                    receptionBadge = 'Overwhelmingly Negative';
                    receptionColor = '#c0392b';
                }

                receptionEl.innerHTML = `
                    <span class="reception-badge" style="background: ${receptionColor};">${receptionBadge}</span>
                    <span class="reception-count">
                        <img src="../images/rovloo/btn-thumbsup.png" alt=""> ${likes} / 
                        <img src="../images/rovloo/btn-thumbsdown.png" alt=""> ${dislikes}
                    </span>
                `;
            } else {
                receptionEl.innerHTML = '<span style="color: #999;">No reviews</span>';
            }

            if (!playtimeSectionEl || !playtimeEl) {
                console.log('[GameDetailPage] Playtime elements not found, skipping playtime');
                return;
            }
            
            let totalMinutes = 0;
            let playtimeSource = '';

            let serverMinutes = userReview?.playtimeData?.totalMinutes || 0;
            console.log('[GameDetailPage] Server minutes from review:', serverMinutes);

            if (serverMinutes === 0 && currentUserId) {
                try {
                    const rovlooPlaytime = await api.reviews?.getUserPlaytime?.(currentUserId);
                    console.log('[GameDetailPage] Rovloo playtime response:', rovlooPlaytime);
                    if (rovlooPlaytime?.sessions) {

                        const placeIdStr = String(placeId);
                        const gameSession = rovlooPlaytime.sessions.find(s => 
                            String(s.placeId) === placeIdStr || String(s.gameId) === placeIdStr
                        );
                        if (gameSession?.totalMinutes) {
                            serverMinutes = gameSession.totalMinutes;
                            console.log('[GameDetailPage] Found playtime in Rovloo server:', serverMinutes);
                        }
                    }
                } catch (e) {
                    console.log('[GameDetailPage] getUserPlaytime error:', e);
                }
            }

            const localMinutes = localPlaytime?.totalMinutes || 0;
            console.log('[GameDetailPage] Local minutes:', localMinutes);
            
            totalMinutes = serverMinutes + localMinutes;
            console.log('[GameDetailPage] Total minutes:', totalMinutes);

            if (serverMinutes > 0 && localMinutes > 0) {
                playtimeSource = 'combined';
            } else if (serverMinutes > 0) {
                playtimeSource = 'server';
            } else if (localMinutes > 0) {
                playtimeSource = 'local';
            }

            if (currentUserId) {
                playtimeSectionEl.style.display = '';
                console.log('[GameDetailPage] Showing playtime section, totalMinutes:', totalMinutes);
                
                if (totalMinutes > 0) {
                    const hours = Math.floor(totalMinutes / 60);
                    const minutes = totalMinutes % 60;
                    let playtimeText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

                    let sourceNote = '';
                    if (playtimeSource === 'local') {
                        sourceNote = '<span class="playtime-note">(local)</span>';
                    }

                    playtimeEl.textContent = playtimeText;
                    console.log('[GameDetailPage] Set playtime text:', playtimeText);
                } else {
                    playtimeEl.innerHTML = '<span style="color: #999;">None</span>';
                }
            } else {
                console.log('[GameDetailPage] Not logged in, hiding playtime section');
            }

        } catch (e) {
            console.error('[GameDetailPage] Failed to load Rovloo stats:', e);
        }
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    async loadRecommendationThumbnails(games) {
        if (!this.thumbnailLoader) return;

        games.forEach(game => {
            const universeId = game.universeId || game.id;
            const img = document.querySelector(`.game-thumb[data-universe-id="${universeId}"]`);
            if (img) {
                this.thumbnailLoader.queueGameIcon(universeId, img);
            }
        });
    }

    setupEventHandlers() {

        const playBtn = document.getElementById('PlayButton');
        if (playBtn) {
            playBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handlePlay();
            });
        }

        const favBtn = document.getElementById('FavoriteButton');
        if (favBtn) {
            favBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleFavorite();
            });
        }

        const voteUpBtn = document.getElementById('VoteUpButton');
        const voteDownBtn = document.getElementById('VoteDownButton');
        if (voteUpBtn) {
            voteUpBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleVote(true);
            });
        }
        if (voteDownBtn) {
            voteDownBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleVote(false);
            });
        }

        const refreshBtn = document.getElementById('RefreshServers');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadServers(this.currentPlaceId));
        }

        this.setupServerFilters();

        this.setupGamePassPurchaseHandlers();

        const genreLink = document.getElementById('GenreLink');
        if (genreLink) {
            genreLink.addEventListener('click', (e) => {
                e.preventDefault();
                const genre = genreLink.textContent;
                if (genre && genre !== 'All') {
                    window.location.href = `games.html?genre=${encodeURIComponent(genre)}`;
                } else {
                    window.location.href = 'games.html';
                }
            });
        }
    }
    
    setupGamePassPurchaseHandlers() {

        const storeContainer = document.getElementById('store');
        if (storeContainer) {
            storeContainer.addEventListener('click', (e) => {
                const btn = e.target.closest('.rbx-gear-passes-purchase');
                if (btn) {
                    e.preventDefault();
                    const passId = btn.dataset.itemId;
                    const passName = btn.dataset.itemName;
                    const price = parseInt(btn.dataset.expectedPrice, 10) || 0;
                    this.handleGamePassPurchase(passId, passName, price);
                }
            });
        }
    }
    
    async handleGamePassPurchase(passId, passName, price) {
        console.log('[GameDetailPage] Purchasing game pass:', passId, passName, price);
        
        const api = window.roblox || window.robloxAPI;
        if (!api) {
            alert('Purchase not available');
            return;
        }

        let currentUserId = null;
        try {
            const currentUser = await api.getCurrentUser();
            currentUserId = currentUser?.id;
        } catch (e) {
            console.log('[GameDetailPage] Not logged in');
        }
        
        if (!currentUserId) {
            alert('Please log in to purchase game passes.');
            return;
        }

        const confirmed = confirm(`Purchase "${passName}" for R$ ${price.toLocaleString()}?`);
        if (!confirmed) return;
        
        try {
            let result = null;
            
            if (api.purchaseGamePass) {
                result = await api.purchaseGamePass(passId, price);
            } else {
                throw new Error('Purchase API not available');
            }
            
            console.log('[GameDetailPage] Purchase result:', result);

            if (result?.requiresChallenge || result?.challengeId) {
                const challengeType = result.challengeType;
                console.log('[GameDetailPage] Challenge required:', challengeType);

                if (challengeType === 'twostepverification' || challengeType === 'forcetwostepverification') {
                    await this.handlePurchaseTwoStepChallenge(result, passId, passName, price, currentUserId);
                    return;
                }

                alert('This purchase requires verification that cannot be completed in the app.\n\nPlease complete the purchase on Roblox.com');
                return;
            }
            
            if (result?.purchased) {
                alert('Purchase successful!');

            } else {
                throw new Error(result?.reason || result?.errorMessage || 'Purchase failed');
            }
        } catch (e) {
            console.error('[GameDetailPage] Purchase failed:', e);
            alert('Purchase failed: ' + e.message);
        }
    }
    
    async handlePurchaseTwoStepChallenge(challengeResult, passId, passName, price, userId) {
        const metadata = challengeResult.challengeMetadata;
        
        console.log('[GameDetailPage] Handling 2FA challenge for game pass:', challengeResult);
        
        const code = prompt(
            `Two-Step Verification Required\n\n` +
            `To purchase "${passName}", enter the 6-digit code from your authenticator app:`
        );
        
        if (!code || code.trim().length !== 6) {
            console.log('[GameDetailPage] 2FA cancelled or invalid code');
            return;
        }
        
        try {
            const api = window.roblox || window.robloxAPI;
            const challengeIdToUse = metadata?.challengeId || challengeResult.challengeId;
            const userIdToUse = metadata?.userId || userId;
            
            console.log('[GameDetailPage] Verifying 2FA with challengeId:', challengeIdToUse);

            const verifyResult = await api.verifyTwoStepForChallenge(
                userIdToUse,
                challengeIdToUse,
                code.trim(),
                'authenticator'
            );
            
            if (!verifyResult?.success) {
                throw new Error(verifyResult?.error || 'Verification failed');
            }
            
            console.log('[GameDetailPage] 2FA verified, continuing challenge...');

            await api.continueChallenge(
                challengeResult.challengeId,
                'twostepverification',
                verifyResult.verificationToken,
                verifyResult.rememberTicket,
                metadata?.challengeId
            );
            
            console.log('[GameDetailPage] Retrying purchase after 2FA...');

            const result = await api.purchaseGamePass(passId, price);
            
            console.log('[GameDetailPage] Retry purchase result:', result);
            
            if (result?.requiresChallenge) {
                alert('Verification failed. Please try again.');
            } else if (result?.purchased) {
                alert('Purchase successful!');
            } else {
                throw new Error(result?.errorMessage || result?.reason || 'Purchase failed after verification');
            }
            
        } catch (error) {
            console.error('[GameDetailPage] 2FA verification failed:', error);
            alert('Verification failed: ' + (error.message || 'Unknown error'));
        }
    }

    setupServerJoinButtons() {
        const joinBtns = document.querySelectorAll('.rbx-game-server-join');
        joinBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const serverId = btn.dataset.serverId;
                this.handleJoinServer(serverId);
            });
        });
    }

    async handlePlay() {
        console.log('[GameDetailPage] Play clicked for placeId:', this.currentPlaceId);

        try {
            const isLoggedIn = await window.RobloxClient?.auth?.isLoggedIn?.();
            if (!isLoggedIn) {
                console.log('[GameDetailPage] User not logged in, showing sign-in prompt');
                if (window.showGameLaunchOverlay) {
                    window.showGameLaunchOverlay('Sign in required to play games. Returning to Rovloo Hub...');
                }
                setTimeout(() => {
                    if (window.hideGameLaunchOverlay) {
                        window.hideGameLaunchOverlay();
                    }
                    if (window.RobloxClient?.auth?.returnToHub) {
                        window.RobloxClient.auth.returnToHub();
                    }
                }, 2500);
                return;
            }
        } catch (authError) {
            console.error('[GameDetailPage] Auth check failed:', authError);
        }

        if (window.showGameLaunchOverlay) {
            window.showGameLaunchOverlay('Starting Roblox...');
        }

        try {
            let launched = false;
            let errorMessage = null;
            let wasCancelled = false;

            if (window.roblox?.launchGame) {
                console.log('[GameDetailPage] Using window.roblox.launchGame...');
                try {
                    const result = await window.roblox.launchGame(this.currentPlaceId, this.gameData?.name, this.gameData?.thumbnail);
                    console.log('[GameDetailPage] launchGame result:', result);
                    launched = result?.success === true;
                    wasCancelled = result?.cancelled === true;
                    if (!launched && result?.error) {
                        errorMessage = result.error;
                    }
                } catch (launchError) {
                    console.error('[GameDetailPage] launchGame threw error:', launchError);
                    errorMessage = launchError.message || 'Unknown launch error';
                    launched = false;
                }

                if (wasCancelled) {
                    console.log('[GameDetailPage] Game launch was cancelled');
                    if (window.hideGameLaunchOverlay) {
                        window.hideGameLaunchOverlay();
                    }
                    return;
                }

                if (launched) {

                    if (window.updateGameLaunchStatus) {
                        setTimeout(() => {
                            if (!window.isGameLaunchCancelled || !window.isGameLaunchCancelled()) {
                                window.updateGameLaunchStatus('The server is ready. Joining the game...');
                            }
                        }, 2000);
                    }

                    if (window.autoHideGameLaunchOverlay) {
                        window.autoHideGameLaunchOverlay(6000);
                    }
                }
            } else if (window.RobloxClient?.game?.launch) {
                console.log('[GameDetailPage] Using window.RobloxClient.game.launch...');
                await window.RobloxClient.game.launch(this.currentPlaceId);
                launched = true;
                if (window.autoHideGameLaunchOverlay) {
                    window.autoHideGameLaunchOverlay(6000);
                }
            } else {

                console.log('[GameDetailPage] Using fallback roblox-player protocol...');
                const launchUrl = `roblox-player:1+launchmode:play+gameinfo:+placelauncherurl:https://assetgame.roblox.com/game/PlaceLauncher.ashx?request=RequestGame&placeId=${this.currentPlaceId}`;
                window.location.href = launchUrl;
                launched = true;
                if (window.autoHideGameLaunchOverlay) {
                    window.autoHideGameLaunchOverlay(6000);
                }
            }

            if (!launched) {
                throw new Error(errorMessage || 'Failed to launch game. Make sure Roblox is installed.');
            }
        } catch (error) {
            console.error('[GameDetailPage] Failed to launch game:', error);

            if (window.updateGameLaunchStatus) {
                let displayError = error.message || 'Failed to launch game';
                if (displayError.includes('authentication ticket')) {
                    displayError = 'Login expired. Please log in again.';
                } else if (displayError.includes('Not logged in')) {
                    displayError = 'Please log in to play games.';
                }
                window.updateGameLaunchStatus(displayError);
            }

            setTimeout(() => {
                if (window.hideGameLaunchOverlay) {
                    window.hideGameLaunchOverlay();
                }
            }, 3000);
        }
    }

    async handleJoinServer(serverId) {
        console.log('[GameDetailPage] Join server clicked:', serverId);

        try {
            const isLoggedIn = await window.RobloxClient?.auth?.isLoggedIn?.();
            if (!isLoggedIn) {
                console.log('[GameDetailPage] User not logged in');
                if (window.showGameLaunchOverlay) {
                    window.showGameLaunchOverlay('Sign in required to play games. Returning to Rovloo Hub...');
                }
                setTimeout(() => {
                    if (window.hideGameLaunchOverlay) {
                        window.hideGameLaunchOverlay();
                    }
                    if (window.RobloxClient?.auth?.returnToHub) {
                        window.RobloxClient.auth.returnToHub();
                    }
                }, 2500);
                return;
            }
        } catch (authError) {
            console.error('[GameDetailPage] Auth check failed:', authError);
        }

        if (window.showGameLaunchOverlay) {
            window.showGameLaunchOverlay('Joining server...');
        }

        try {
            if (window.roblox?.joinServer) {
                const result = await window.roblox.joinServer(this.currentPlaceId, serverId);
                if (result?.success) {
                    if (window.autoHideGameLaunchOverlay) {
                        window.autoHideGameLaunchOverlay(6000);
                    }
                } else {
                    throw new Error(result?.error || 'Failed to join server');
                }
            } else if (window.RobloxClient?.game?.joinServer) {
                await window.RobloxClient.game.joinServer(this.currentPlaceId, serverId);
                if (window.autoHideGameLaunchOverlay) {
                    window.autoHideGameLaunchOverlay(6000);
                }
            } else if (window.roblox?.launchGame) {

                await window.roblox.launchGame(this.currentPlaceId);
                if (window.autoHideGameLaunchOverlay) {
                    window.autoHideGameLaunchOverlay(6000);
                }
            } else {
                throw new Error('Join server not available');
            }
        } catch (error) {
            console.error('[GameDetailPage] Failed to join server:', error);
            if (window.updateGameLaunchStatus) {
                window.updateGameLaunchStatus(error.message || 'Failed to join server');
            }
            setTimeout(() => {
                if (window.hideGameLaunchOverlay) {
                    window.hideGameLaunchOverlay();
                }
            }, 3000);
        }
    }

    async handleFavorite() {
        if (!this.currentUniverseId) return;

        let isLoggedIn = false;
        try {
            const currentUser = await window.roblox?.getCurrentUser();
            isLoggedIn = !!currentUser?.id;
        } catch (e) {}
        
        if (!isLoggedIn) {
            alert('You must be logged in to favorite games.');
            return;
        }

        const favIcon = document.getElementById('FavoriteIcon');
        const favText = document.querySelector('.favoriteCount');
        const isFavorited = favIcon?.classList.contains('favorited') || false;

        try {

            if (window.roblox?.setGameFavorite) {
                await window.roblox.setGameFavorite(this.currentUniverseId, !isFavorited);
            } else {
                console.warn('[GameDetailPage] No favorite API available');
                return;
            }

            if (favIcon) {
                if (!isFavorited) {
                    favIcon.classList.add('favorited');
                    favIcon.title = 'Remove from favorites';
                } else {
                    favIcon.classList.remove('favorited');
                    favIcon.title = 'Add to favorites';
                }
            }

            const favCountEl = document.querySelector('.favoriteCount');
            if (favCountEl) {
                const currentCount = parseInt(favCountEl.textContent.replace(/[^\d]/g, '')) || 0;
                const newCount = isFavorited ? Math.max(0, currentCount - 1) : currentCount + 1;
                favCountEl.textContent = this.formatNumber(newCount);
            }

            await this.loadFavorites(this.currentUniverseId);
        } catch (e) {
            console.error('[GameDetailPage] Failed to toggle favorite:', e);
            alert('Failed to update favorite status. Please try again.');
        }
    }

    async handleVote(isUpvote) {
        if (!this.currentUniverseId) return;

        let isLoggedIn = false;
        try {
            const currentUser = await window.roblox?.getCurrentUser();
            isLoggedIn = !!currentUser?.id;
        } catch (e) {}
        
        if (!isLoggedIn) {
            alert('You must be logged in to vote on games.');
            return;
        }

        const upvoteBtn = document.getElementById('VoteUpButton');
        const downvoteBtn = document.getElementById('VoteDownButton');
        const upIcon = upvoteBtn?.querySelector('.rbx-icon-like');
        const downIcon = downvoteBtn?.querySelector('.rbx-icon-dislike');

        try {

            if (window.roblox?.voteGame) {
                const result = await window.roblox.voteGame(this.currentUniverseId, isUpvote);

                if (result?.errors && result.errors.length > 0) {
                    const errorMsg = result.errors[0]?.message || result.errors[0]?.userFacingMessage || 'Unknown error';
                    alert(errorMsg);
                    return;
                }

                if (isUpvote) {
                    upIcon?.classList.add('selected');
                    downIcon?.classList.remove('selected');
                } else {
                    downIcon?.classList.add('selected');
                    upIcon?.classList.remove('selected');
                }

                if (window.roblox?.getGameVotes) {
                    const votes = await window.roblox.getGameVotes([this.currentUniverseId]);
                    if (votes?.data?.[0]) {
                        const upVotes = votes.data[0].upVotes || 0;
                        const downVotes = votes.data[0].downVotes || 0;

                        const upVotesEl = document.querySelector('.upvote .vote-text');
                        const downVotesEl = document.querySelector('.downvote .vote-text');

                        if (upVotesEl) upVotesEl.textContent = this.formatNumber(upVotes);
                        if (downVotesEl) downVotesEl.textContent = this.formatNumber(downVotes);

                        this.updateVoteBar(upVotes, downVotes);
                    }
                }

                if (window.ReviewComponent) {
                    window.ReviewComponent.userGameVote = isUpvote;
                    if (window.ReviewComponent.renderReviewForm) {
                        window.ReviewComponent.renderReviewForm();
                    }
                }
            } else {
                console.warn('[GameDetailPage] No vote API available');
                return;
            }
        } catch (error) {
            console.error('[GameDetailPage] Failed to vote:', error);
            const errorMsg = error.message || '';
            if (errorMsg.includes('play') || errorMsg.includes('Play')) {
                alert('You must play the game before you can vote on it.');
            } else if (errorMsg.includes('already voted')) {
                alert('You have already voted on this game.');
            } else {
                alert(errorMsg || 'Failed to submit vote. Please try again.');
            }
        }
    }

    updateVoteBar(upVotes, downVotes) {
        const voteBar = document.querySelector('.vote-bar .votes');
        if (!voteBar) return;

        const total = upVotes + downVotes;
        if (total === 0) {
            voteBar.style.width = '50%';
        } else {
            const percentage = (upVotes / total) * 100;
            voteBar.style.width = `${percentage}%`;
        }
    }

    async checkFavoriteStatus() {
        if (!this.currentUniverseId) return;

        try {
            let isLoggedIn = false;
            try {
                const currentUser = await window.roblox?.getCurrentUser();
                isLoggedIn = !!currentUser?.id;
            } catch (e) {}
            
            if (!isLoggedIn) return;

            if (window.roblox?.getGameFavoriteStatus) {
                const status = await window.roblox.getGameFavoriteStatus(this.currentUniverseId);
                const favIcon = document.getElementById('FavoriteIcon');
                if (status?.isFavorited && favIcon) {
                    favIcon.classList.add('favorited');
                    favIcon.title = 'Remove from favorites';
                }
            }
        } catch (error) {
            console.error('[GameDetailPage] Failed to check favorite status:', error);
        }
    }

    showError(message) {
        const container = document.querySelector('.game-main-content');
        if (container) {
            container.innerHTML = `
                <div class="error-container">
                    <h2>Error Loading Game</h2>
                    <p>${this.escapeHtml(message)}</p>
                    <a href="#games" class="rbx-btn-primary-lg">Back to Games</a>
                </div>
            `;
        }
    }

    formatNumber(num) {
        if (num >= 1000000000) {
            return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B+';
        }
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M+';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K+';
        }
        return num.toString();
    }

    formatVoteCount(count) {
        if (count >= 1000000) {
            return Math.floor(count / 1000000) + 'M+';
        }
        if (count >= 1000) {
            return Math.floor(count / 1000) + 'K+';
        }
        return count.toString();
    }

    formatDate(dateStr) {
        try {
            const date = new Date(dateStr);
            return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
        } catch (e) {
            return '--';
        }
    }

    formatRelativeTime(dateStr) {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now - date;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) return 'Today';
            if (diffDays === 1) return 'Yesterday';
            if (diffDays < 7) return `${diffDays} days ago`;
            if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
            if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
            return `${Math.floor(diffDays / 365)} years ago`;
        } catch (e) {
            return '--';
        }
    }

    formatDescription(text) {
        if (!text) return '';

        let escaped = this.escapeHtml(text);

        escaped = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        escaped = escaped.replace(/__(.+?)__/g, '<strong>$1</strong>');

        escaped = escaped.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
        escaped = escaped.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '<em>$1</em>');

        escaped = escaped.replace(/~~(.+?)~~/g, '<del>$1</del>');

        escaped = escaped.replace(/\n/g, '<br>');

        const urlRegex = /(https?:\/\/[^\s<]+)/g;
        escaped = escaped.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener">$1</a>');
        
        return escaped;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameDetailPageRenderer;
}

if (typeof window !== 'undefined') {
    window.GameDetailPageRenderer = GameDetailPageRenderer;

    window.gameDetailPageRenderer = null;

    window.initGameDetailPage = async function(placeId, universeId) {
        if (!window.gameDetailPageRenderer) {
            window.gameDetailPageRenderer = new GameDetailPageRenderer();
        }
        await window.gameDetailPageRenderer.init(placeId, universeId);
    };

    window.loadRovlooStats = function(placeId) {
        if (window.gameDetailPageRenderer) {
            window.gameDetailPageRenderer.loadRovlooStats(placeId, window.gameDetailPageRenderer.currentUniverseId);
        }
    };
}

