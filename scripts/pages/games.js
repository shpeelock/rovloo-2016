class GamesPageRenderer {
    constructor() {
            this.thumbnailLoader = null;
            this.gameSorts = null;
            this.gameSortsTimestamp = 0;
            this.isFilterMode = false;
            this.currentFilter = null;
            this.currentGenre = null;

            this.searchNextPageToken = '';
            this.searchSessionId = null;
            this.searchHasMore = true;
            this.isLoadingMore = false;
            this.loadedUniverseIds = new Set();
            this.searchScrollObserver = null;

            this.searchResultsCache = new Map(); 
            this.unfilteredSearchResults = []; 

            this.categoryCache = new Map(); 
            this.CACHE_TTL = 10 * 60 * 1000; 
            this.MAX_CATEGORY_CACHE_SIZE = 4; 

            this.gameSortsTimestamp = 0;

            this.categories = {
              mostPopular: { sortId: 'most-popular', containerId: 'GamesListContainer-popular', title: 'Most Popular', loaded: false },
              topTrending: { sortId: 'top-trending', containerId: 'GamesListContainer-trending', title: 'Top Trending', loaded: false },
              rovlooReviewed: { sortId: 'rovloo-reviewed', containerId: 'GamesListContainer-rovloo', title: 'Rovloo Reviewed', loaded: false, isRovloo: true },
              topRated: { sortId: 'top-rated', containerId: 'GamesListContainer-rated', title: 'Top Rated', loaded: false },
              topFavorites: { sortId: 'top-revisited', containerId: 'GamesListContainer-favorites', title: 'Top Favorites', loaded: false },
              featured: { sortId: 'up-and-coming', containerId: 'GamesListContainer-featured', title: 'Up-and-Coming', loaded: false },
              funWithFriends: { sortId: 'fun-with-friends', containerId: 'GamesListContainer-friends', title: 'Fun with Friends', loaded: false },
              topEarning: { sortId: 'top-earning', containerId: 'GamesListContainer-earning', title: 'Top Earning', loaded: false },
              topPaidAccess: { sortId: 'top-paid-access', containerId: 'GamesListContainer-paid', title: 'Top Paid Access', loaded: false }
            };

            this.filterNames = {
              'default': 'All Categories',
              'most-popular': 'Most Popular',
              'top-trending': 'Top Trending',
              'top-rated': 'Top Rated',
              'top-revisited': 'Top Favorites',
              'up-and-coming': 'Up-and-Coming',
              'fun-with-friends': 'Fun with Friends',
              'top-earning': 'Top Earning',
              'top-paid-access': 'Top Paid Access',
              'rovloo-reviewed': 'Rovloo Reviewed'
            };

            this.rovlooSortOptions = {
              'balanced_discovery': 'Balanced Discovery',
              'most_reviews': 'Most Reviews',
              'highest_rated': 'Highest Rated',
              'lowest_rated': 'Lowest Rated',
              'newest_reviews': 'Newest Reviews'
            };
            this.currentRovlooSort = 'balanced_discovery';

            this.rovlooGamesCache = null;
            this.rovlooGamesCacheTimestamp = 0;
            this.ROVLOO_CACHE_TTL = 5 * 60 * 1000; 
            this.isRovlooMode = false;
        
            this.genreNames = {
              'All': 'All Genres',
              'RPG': 'RPG',
              'Action': 'Action',
              'Adventure': 'Adventure',
              'Shooter': 'Shooter',
              'Sports': 'Sports',
              'Simulation': 'Simulation',
              'Roleplay': 'Roleplay',
              'Obby': 'Obby',
              'Survival': 'Survival',
              'Puzzle': 'Puzzle',
              'Strategy': 'Strategy'
            };

            this.genreToSortMapping = {
              'RPG': 'trending-in-rpg',
              'Sports': 'trending-in-sports-and-racing',
              'Shooter': 'trending-in-shooter',
              'Action': 'trending-in-action',
              'Adventure': 'trending-in-adventure',
              'Obby': 'trending-in-obby-and-platformer',
              'Simulation': 'trending-in-simulation',
              'Roleplay': 'trending-in-roleplay-and-avatar-sim',
              'Survival': 'trending-in-survival',
              'Puzzle': 'trending-in-puzzle',
              'Strategy': 'trending-in-strategy'
            };

            this.GAME_PLACEHOLDER = '../images/game-placeholder.png';

            this.MAX_RETRIES = 3;
            this.RETRY_DELAY = 1000; 
            this.MAX_SEARCH_RESULTS = 200; 
          }
        
          clearCache() {
            this.categoryCache.clear();
            this.searchResultsCache.clear();
            this.gameSorts = null;
            this.gameSortsTimestamp = 0;
            this.loadedUniverseIds.clear();
            this.unfilteredSearchResults = [];
            this.rovlooGamesCache = null;
            this.rovlooGamesCacheTimestamp = 0;
            console.log('[GamesPageRenderer] Cache cleared');
          }

          trimCategoryCache() {
            if (this.categoryCache.size <= this.MAX_CATEGORY_CACHE_SIZE) return;

            const entries = Array.from(this.categoryCache.entries());
            entries.sort((a, b) => (a[1].timestamp || 0) - (b[1].timestamp || 0));
            
            const toRemove = entries.length - this.MAX_CATEGORY_CACHE_SIZE;
            for (let i = 0; i < toRemove; i++) {
              this.categoryCache.delete(entries[i][0]);
            }
            console.log(`[GamesPageRenderer] Trimmed category cache, removed ${toRemove} entries`);
          }
        
          async getCachedGameSorts() {

            if (this.gameSorts && (Date.now() - this.gameSortsTimestamp) < this.CACHE_TTL) {
              return this.gameSorts;
            }
        
            const api = window.robloxAPI || window.roblox;
            if (!api || !api.getGameSorts) return null;
        
            try {

              const sortsData = await api.getGameSorts();
              if (sortsData?.sorts) {
                this.gameSorts = sortsData.sorts;
                this.gameSortsTimestamp = Date.now();
                console.log('[GamesPageRenderer] Loaded game sorts:', this.gameSorts.length);
                return this.gameSorts;
              }
            } catch (error) {
              console.warn('[GamesPageRenderer] Failed to load game sorts:', error);
            }
        
            return this.gameSorts; 
          }
    
    async init() {
        console.log('[GamesPageRenderer] Initializing...');

        if (window.ThumbnailLoader) {
            this.thumbnailLoader = new window.ThumbnailLoader({
                gamePlaceholder: this.GAME_PLACEHOLDER
            });
        }

        try {

            const urlParams = new URLSearchParams(window.location.search);
            const searchQuery = urlParams.get('search');
            
            if (searchQuery) {

                await this.showSearchResults(searchQuery);
                return;
            }

            this.createCategoryContainers();

            this.setupFilterHandlers();

            this.setupSeeAllHandlers();

            await this.loadAllCategories();

            this.setupCarouselHandlers();
            
            console.log('[GamesPageRenderer] Initialization complete');
        } catch (error) {
            console.error('[GamesPageRenderer] Initialization failed:', error);
        }
    }

    async showSearchResults(query) {
        console.log('[GamesPageRenderer] Showing search results for:', query);
        
        this.isFilterMode = true;
        this.currentSearchQuery = query;

        this.setFilterButtonsDisabled(true, true);
        
        const listsContainer = document.getElementById('GamesListsContainer');
        if (!listsContainer) return;

        const genreText = this.currentGenre && this.currentGenre !== 'All' 
            ? ` - ${this.genreNames[this.currentGenre] || this.currentGenre}` 
            : '';
        const searchViewHtml = `
            <div class="filtered-games-view" id="FilteredGamesView">
                <div class="games-list-header" style="float: left;">
                    <h3>Search results for "${this.escapeHtml(query)}"${genreText}</h3>
                </div>
                <div style="float: right; margin-right: 28px;">
                    <button class="see-all-button" id="FilteredGamesBack">
                        ← Back to All Games
                    </button>
                </div>
                <div style="clear: both; margin-bottom: 10px;"></div>
                <div class="filtered-games-grid" id="FilteredGamesGrid">
                    <div class="games-loading">
                        <div class="loading-spinner"></div>
                        <div class="loading-text">Searching games...</div>
                    </div>
                </div>
            </div>
        `;

        listsContainer.innerHTML = searchViewHtml;

        const backBtn = document.getElementById('FilteredGamesBack');
        if (backBtn) {
            backBtn.addEventListener('click', () => {

                window.location.href = window.location.pathname;
            });
        }

        await this.loadSearchResults(query);
    }

    async loadSearchResults(query, append = false) {
        const grid = document.getElementById('FilteredGamesGrid');
        if (!grid) return;

        if (!append) {
            this.searchNextPageToken = '';
            this.searchSessionId = null;
            this.searchHasMore = true;
            this.isLoadingMore = false;
            this.loadedUniverseIds = new Set();
            this.searchResultsCache = new Map();
            this.unfilteredSearchResults = [];
        }

        if (this.isLoadingMore || (append && !this.searchHasMore)) {
            return;
        }

        this.isLoadingMore = true;

        if (append) {
            const filteredView = document.getElementById('FilteredGamesView');
            if (filteredView) {
                filteredView.querySelectorAll('.pagination-error').forEach(el => el.remove());
            }
        }

        try {
            const api = window.robloxAPI || window.roblox;
            if (!api) throw new Error('API not available');

            let games = [];
            let nextPageToken = '';

            const searchApi = (window.robloxAPI?.searchGames) ? window.robloxAPI : 
                              (window.roblox?.searchGames) ? window.roblox : null;
            
            if (searchApi) {
                console.log(`[GamesPageRenderer] Calling searchGames API for: ${query}, pageToken: ${this.searchNextPageToken || 'none'}`);
                const searchResult = await searchApi.searchGames(query, this.searchNextPageToken, this.searchSessionId);
                console.log(`[GamesPageRenderer] Search result:`, searchResult);

                nextPageToken = searchResult?.nextPageToken || '';
                this.searchSessionId = searchResult?.sessionId || this.searchSessionId;
                this.searchNextPageToken = nextPageToken;

                this.searchHasMore = !!nextPageToken;
                
                if (searchResult?.games?.length > 0) {

                    games = searchResult.games.filter(g => {
                        const id = g.universeId || g.id;
                        if (this.loadedUniverseIds.has(id)) return false;
                        this.loadedUniverseIds.add(id);
                        return true;
                    });

                    this.unfilteredSearchResults = this.unfilteredSearchResults.concat(games);

                    if (this.unfilteredSearchResults.length >= this.MAX_SEARCH_RESULTS) {
                        console.log(`[GamesPageRenderer] Reached max search results (${this.MAX_SEARCH_RESULTS}), stopping pagination`);
                        this.searchHasMore = false;
                    }
                    
                    console.log(`[GamesPageRenderer] Found ${games.length} new games (${searchResult.games.length} total, filtered duplicates)`);
                }

                if (games.length === 0 && this.searchHasMore && append) {
                    console.log(`[GamesPageRenderer] All games were duplicates, loading next page...`);
                    this.isLoadingMore = false;
                    return this.loadSearchResults(query, true);
                }
            } else {
                console.log(`[GamesPageRenderer] searchGames API not available`);
                this.searchHasMore = false;
            }

                  if (games.length === 0 && !append && api.getGameSorts) {
                    await this.getCachedGameSorts();
            
                    if (this.gameSorts) {                    const allGames = new Map();
                    const queryLower = query.toLowerCase();
                    
                    for (const sort of this.gameSorts) {
                        if (sort.games) {
                            for (const game of sort.games) {
                                if (!allGames.has(game.universeId)) {
                                    allGames.set(game.universeId, game);
                                }
                            }
                        }
                    }

                    const universeIds = Array.from(allGames.keys()).slice(0, 50);
                    if (universeIds.length > 0 && api.getGameDetails) {
                        const detailsResult = await api.getGameDetails(universeIds);
                        if (detailsResult?.data) {
                            games = detailsResult.data.filter(game => 
                                game.name && game.name.toLowerCase().includes(queryLower)
                            ).map(g => ({ universeId: g.id, ...g }));
                        }
                    }
                }
                this.searchHasMore = false;
            }

            if (games.length === 0 && !append) {
                grid.innerHTML = `
                    <div class="no-games-message">
                        <h3>No games found</h3>
                        <p>No games matching "${this.escapeHtml(query)}" were found. Try a different search term.</p>
                    </div>
                `;
                this.isLoadingMore = false;
                return;
            }

            const universeIds = games.map(g => g.universeId || g.id).filter(Boolean);
            let gameDetails = new Map();
            let gameVotes = new Map();

            if (universeIds.length > 0) {

                const batchSize = 40;
                for (let i = 0; i < universeIds.length; i += batchSize) {
                    const batch = universeIds.slice(i, i + batchSize);

                    if (i > 0) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }

                    let retries = 2;
                    while (retries >= 0) {
                        try {
                            const [detailsResult, votesResult] = await Promise.all([
                                api.getGameDetails ? api.getGameDetails(batch) : null,
                                api.getGameVotes ? api.getGameVotes(batch) : null
                            ]);

                            if (detailsResult?.data) {
                                for (const game of detailsResult.data) {
                                    gameDetails.set(game.id, game);
                                }
                            }

                            if (votesResult?.data) {
                                for (const vote of votesResult.data) {
                                    gameVotes.set(vote.id, vote);
                                }
                            }
                            break; 
                        } catch (batchError) {
                            if (retries > 0 && batchError.message?.includes('Too many requests')) {
                                console.warn(`[GamesPageRenderer] Rate limited, retrying in 300ms... (${retries} retries left)`);
                                await new Promise(resolve => setTimeout(resolve, 300));
                                retries--;
                            } else {
                                console.warn(`[GamesPageRenderer] Failed to fetch details for batch:`, batchError.message);
                                break; 
                            }
                        }
                    }
                }
            }

            if (append) {

                const filteredView = document.getElementById('FilteredGamesView');
                if (filteredView) {
                    filteredView.querySelectorAll('.infinite-scroll-loading').forEach(el => el.remove());
                }
            } else {
                grid.innerHTML = '';
            }

            for (const game of games) {
                const universeId = game.universeId || game.id;
                const details = gameDetails.get(universeId) || {
                    id: universeId,
                    name: game.name,
                    playing: game.playerCount || 0,
                    rootPlaceId: game.rootPlaceId,
                    creator: { name: game.creatorName || '' },
                    genre: game.genre || game.genre_l1 || ''
                };
                const votes = gameVotes.get(universeId) || { 
                    upVotes: game.totalUpVotes || 0, 
                    downVotes: game.totalDownVotes || 0 
                };

                this.searchResultsCache.set(universeId, { game, details, votes });
            }

            let gamesToRender = games;
            if (this.currentGenre && this.currentGenre !== 'All') {
                const filterGenre = this.currentGenre.toLowerCase();
                gamesToRender = games.filter(game => {
                    const gameGenre = (game.genre || game.genre_l1 || '').toLowerCase();
                    
                    if (!gameGenre || gameGenre === 'all') return false;
                    if (gameGenre === filterGenre) return true;
                    if (gameGenre.startsWith(filterGenre + ' ') || gameGenre.startsWith(filterGenre + '-')) return true;
                    if (gameGenre.includes(' and ') && gameGenre.split(' and ')[0] === filterGenre) return true;
                    
                    return false;
                });
                console.log(`[GamesPageRenderer] Genre filter applied: ${gamesToRender.length}/${games.length} games match ${this.currentGenre}`);
            }

            const startIndex = grid.querySelectorAll('.game-card').length;
            for (const game of gamesToRender) {
                const universeId = game.universeId || game.id;
                const cached = this.searchResultsCache.get(universeId);
                if (!cached) continue;
                
                const card = this.renderGameCard({ ...cached.details, universeId }, cached.votes);
                grid.appendChild(card);
            }

            if (this.thumbnailLoader) {
                const thumbImages = Array.from(grid.querySelectorAll('.game-card-thumb')).slice(startIndex);
                thumbImages.forEach((img, index) => {
                    const universeId = gamesToRender[index]?.universeId || gamesToRender[index]?.id;
                    if (universeId) {
                        this.thumbnailLoader.queueGameIcon(universeId, img);
                    }
                });
            }

            if (this.searchHasMore) {
                this.setupSearchInfiniteScroll(query, grid);
            } else {

                const existingSentinel = grid.querySelector('.infinite-scroll-sentinel');
                if (existingSentinel) existingSentinel.remove();
            }

        } catch (error) {
            console.error('[GamesPageRenderer] Failed to search games:', error);
            if (!append) {
                grid.innerHTML = `
                    <div class="games-loading">
                        <div class="loading-text" style="color: #d32f2f;">Failed to search games</div>
                        <button class="retry-btn" onclick="window.gamesPageRenderer.loadSearchResults('${this.escapeHtml(query)}')">Retry</button>
                    </div>
                `;
            } else {

                const filteredView = document.getElementById('FilteredGamesView');
                if (filteredView) {
                    filteredView.querySelectorAll('.infinite-scroll-loading').forEach(el => el.remove());
                }

                const retryHtml = `
                    <div class="pagination-error" style="text-align: center; padding: 20px; width: 100%;">
                        <div style="color: #d32f2f; margin-bottom: 10px;">Failed to load more games</div>
                        <button class="retry-btn" onclick="window.gamesPageRenderer.loadSearchResults('${this.escapeHtml(query)}', true)">Retry</button>
                    </div>
                `;
                grid.insertAdjacentHTML('afterend', retryHtml);
            }
        } finally {
            this.isLoadingMore = false;
        }
    }

    setupSearchInfiniteScroll(query, grid) {

        if (this.searchScrollObserver) {
            this.searchScrollObserver.disconnect();
        }

        const existingSentinel = grid.querySelector('.infinite-scroll-sentinel');
        if (existingSentinel) existingSentinel.remove();

        const sentinel = document.createElement('div');
        sentinel.className = 'infinite-scroll-sentinel';
        sentinel.style.height = '1px';
        sentinel.style.width = '100%';
        grid.appendChild(sentinel);

        let observerEnabled = false;
        setTimeout(() => { observerEnabled = true; }, 500);

        this.searchScrollObserver = new IntersectionObserver((entries) => {
            const entry = entries[0];

            if (entry.isIntersecting && this.searchHasMore && !this.isLoadingMore && observerEnabled) {

                const filteredView = document.getElementById('FilteredGamesView');
                let loadingIndicator = filteredView?.querySelector('.infinite-scroll-loading');
                if (!loadingIndicator && filteredView) {

                    const loadingHtml = `
                        <div class="infinite-scroll-loading" style="text-align: center; padding: 20px; width: 100%;">
                            <div class="loading-spinner"></div>
                            <div class="loading-text">Loading more games...</div>
                        </div>
                    `;
                    grid.insertAdjacentHTML('afterend', loadingHtml);
                }

                this.loadSearchResults(query, true);
            }
        }, {
            root: null,
            rootMargin: '50px',
            threshold: 0
        });

        this.searchScrollObserver.observe(sentinel);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async searchWithAnimation(query) {
        console.log('[GamesPageRenderer] Search with animation:', query);

        if (this.isFilterMode) {
            const filteredView = document.getElementById('FilteredGamesView');
            if (filteredView) {
                filteredView.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                filteredView.style.opacity = '0';
                filteredView.style.transform = 'translateY(-20px)';
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        } else {

            await this.animateCollapse();
        }

        this.isFilterMode = true;
        this.currentSearchQuery = query;

        this.setFilterButtonsDisabled(true, true);
        
        const listsContainer = document.getElementById('GamesListsContainer');
        if (!listsContainer) return;

        const genreText = this.currentGenre && this.currentGenre !== 'All' 
            ? ` - ${this.genreNames[this.currentGenre] || this.currentGenre}` 
            : '';
        const searchViewHtml = `
            <div class="filtered-games-view" id="FilteredGamesView" style="opacity: 0; transform: translateY(20px);">
                <div class="games-list-header" style="float: left;">
                    <h3>Search results for "${this.escapeHtml(query)}"${genreText}</h3>
                </div>
                <div style="float: right; margin-right: 28px;">
                    <button class="see-all-button" id="FilteredGamesBack">
                        ← Back to All Games
                    </button>
                </div>
                <div style="clear: both; margin-bottom: 10px;"></div>
                <div class="filtered-games-grid" id="FilteredGamesGrid">
                    <div class="games-loading">
                        <div class="loading-spinner"></div>
                        <div class="loading-text">Searching games...</div>
                    </div>
                </div>
            </div>
        `;

        listsContainer.innerHTML = searchViewHtml;
        listsContainer.style.display = 'block';

        const backBtn = document.getElementById('FilteredGamesBack');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.exitFilterMode());
        }

        const filteredView = document.getElementById('FilteredGamesView');
        if (filteredView) {
            filteredView.offsetHeight; 
            filteredView.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            filteredView.style.opacity = '1';
            filteredView.style.transform = 'translateY(0)';
        }

        await this.loadSearchResults(query);
    }

    async applyGenreToSearch(query, genreValue) {
        console.log(`[GamesPageRenderer] Applying genre filter to search: ${genreValue}`);

        const header = document.querySelector('#FilteredGamesView .games-list-header h3');
        if (header) {
            if (genreValue && genreValue !== 'All') {
                header.textContent = `Search results for "${this.escapeHtml(query)}" - ${this.genreNames[genreValue] || genreValue}`;
            } else {
                header.textContent = `Search results for "${this.escapeHtml(query)}"`;
            }
        }

        this.filterCachedSearchResults(genreValue);
    }

    filterCachedSearchResults(genreValue) {
        const grid = document.getElementById('FilteredGamesGrid');
        if (!grid) return;
        
        console.log(`[GamesPageRenderer] Filtering search results by genre: ${genreValue}`);
        console.log(`[GamesPageRenderer] Unfiltered results: ${this.unfilteredSearchResults.length}`);

        if (this.searchScrollObserver) {
            this.searchScrollObserver.disconnect();
        }

        grid.innerHTML = '';
        
        const isFiltering = genreValue && genreValue !== 'All';
        let filteredGames;
        
        if (!isFiltering) {

            filteredGames = [...this.unfilteredSearchResults];
        } else {

            const filterGenre = genreValue.toLowerCase();
            filteredGames = this.unfilteredSearchResults.filter(game => {
                const gameGenre = (game.genre || game.genre_l1 || '').toLowerCase();
                
                if (!gameGenre || gameGenre === 'all') {
                    return false;
                }

                if (gameGenre === filterGenre) {
                    return true;
                }

                if (gameGenre.startsWith(filterGenre + ' ') || gameGenre.startsWith(filterGenre + '-')) {
                    return true;
                }

                if (gameGenre.includes(' and ') && gameGenre.split(' and ')[0] === filterGenre) {
                    return true;
                }
                
                return false;
            });
        }
        
        console.log(`[GamesPageRenderer] Filtered to ${filteredGames.length} games`);

        for (const game of filteredGames) {
            const universeId = game.universeId || game.id;
            const cached = this.searchResultsCache.get(universeId);

            const details = cached?.details || {
                id: universeId,
                name: game.name,
                playing: game.playerCount || 0,
                rootPlaceId: game.rootPlaceId,
                creator: { name: game.creatorName || '' },
                genre: game.genre || game.genre_l1 || ''
            };
            const votes = cached?.votes || { 
                upVotes: game.totalUpVotes || 0, 
                downVotes: game.totalDownVotes || 0 
            };
            
            const card = this.renderGameCard({ ...details, universeId }, votes);
            grid.appendChild(card);
        }

        if (this.thumbnailLoader) {
            const thumbImages = grid.querySelectorAll('.game-card-thumb');
            thumbImages.forEach(img => {
                const universeId = img.closest('.game-card')?.dataset?.universeId;
                if (universeId) {
                    this.thumbnailLoader.queueGameIcon(parseInt(universeId), img);
                }
            });
        }

        if (filteredGames.length === 0 && isFiltering) {
            grid.innerHTML = `
                <div class="no-games-message" style="grid-column: 1 / -1;">
                    <h3>No games found</h3>
                    <p>No games matching the "${this.genreNames[genreValue] || genreValue}" genre were found. Try selecting "All Genres".</p>
                </div>
            `;
        } else {

            if (!isFiltering && this.searchHasMore && this.currentSearchQuery) {
                this.setupSearchInfiniteScroll(this.currentSearchQuery, grid);
            }
        }
    }

    setupFilterHandlers() {

        const sortFilter = document.getElementById('SortFilter');
        if (sortFilter) {
            sortFilter.querySelectorAll('ul li').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    const filterValue = item.getAttribute('data-value');
                    const filterLabel = item.querySelector('a')?.textContent || 'Filter';

                    const label = sortFilter.querySelector('.rbx-selection-label');
                    if (label) label.textContent = filterLabel;

                    this.applyFilter(filterValue, this.currentGenre);
                });
            });
        }

        const genreFilter = document.getElementById('GenreFilter');
        if (genreFilter) {
            genreFilter.querySelectorAll('ul li').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    const genreValue = item.getAttribute('data-value');
                    const genreLabel = item.querySelector('a')?.textContent || 'Genre';

                    const label = genreFilter.querySelector('.rbx-selection-label');
                    if (label) label.textContent = genreLabel;

                    if (this.currentSearchQuery) {
                        this.currentGenre = genreValue;
                        this.applyGenreToSearch(this.currentSearchQuery, genreValue);
                    } else if (this.isRovlooMode && this.rovlooGamesCache) {

                        this.currentGenre = genreValue;
                        this.updateRovlooTitle(genreValue);
                        this.renderRovlooGames(this.rovlooGamesCache, genreValue);
                    } else {

                        this.applyFilter(this.currentFilter, genreValue);
                    }
                });
            });
        }
    }

    updateRovlooTitle(genreValue) {
        const header = document.querySelector('#FilteredGamesView .games-list-header h3');
        if (header) {
            const genreName = genreValue && genreValue !== 'All' ? this.genreNames[genreValue] : null;
            if (genreName) {
                header.textContent = `Rovloo Reviewed - ${genreName}`;
            } else {
                header.textContent = 'Rovloo Reviewed';
            }
        }
    }

    setupSeeAllHandlers() {
        document.querySelectorAll('.games-list-container').forEach(container => {
            const seeAllBtn = container.querySelector('.see-all-button');
            const categoryKey = container.dataset.category;
            
            if (!seeAllBtn || !categoryKey) return;
            
            const category = this.categories[categoryKey];
            if (!category) return;

            const newBtn = seeAllBtn.cloneNode(true);
            seeAllBtn.parentNode.replaceChild(newBtn, seeAllBtn);
            
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();

                const sortLabel = document.querySelector('#SortFilter .rbx-selection-label');
                if (sortLabel) sortLabel.textContent = category.title;

                this.applyFilter(category.sortId, this.currentGenre);
            });
        });
    }

    async applyFilter(filterValue, genreValue) {

        const isDefault = (!filterValue || filterValue === 'default') && (!genreValue || genreValue === 'All');
        
        if (isDefault && this.isFilterMode) {

            await this.exitFilterMode();
            return;
        }
        
        if (isDefault && !this.isFilterMode) {

            return;
        }

        this.currentFilter = filterValue;
        this.currentGenre = genreValue;

        await this.animateCollapse();

        await this.enterFilterMode(filterValue, genreValue);
    }

    async animateCollapse() {
        const containers = document.querySelectorAll('.games-list-container');
        const listsContainer = document.getElementById('GamesListsContainer');
        
        if (containers.length === 0) return;

        if (window.scrollY > 0) {
            window.scrollTo({ top: 0, behavior: 'smooth' });

            await new Promise(resolve => setTimeout(resolve, 300));
        }

        if (listsContainer) {
            listsContainer.style.minHeight = listsContainer.offsetHeight + 'px';
        }

        containers.forEach(container => {
            container.style.opacity = '1';
            container.style.transform = 'scaleY(1)';
            container.style.maxHeight = container.scrollHeight + 'px';
            container.offsetHeight; 
        });

        return new Promise(resolve => {
            let completedAnimations = 0;
            const totalContainers = containers.length;

            containers.forEach((container, index) => {

                setTimeout(() => {
                    container.style.transition = 'opacity 0.3s ease, transform 0.3s ease, max-height 0.3s ease';
                    container.style.opacity = '0';
                    container.style.transform = 'scaleY(0.8)';
                    container.style.maxHeight = '0';
                    container.style.overflow = 'hidden';
                    container.style.marginBottom = '0';

                    setTimeout(() => {
                        completedAnimations++;
                        if (completedAnimations === totalContainers) {

                            if (listsContainer) {
                                listsContainer.style.display = 'none';
                                listsContainer.style.minHeight = '';
                            }

                            containers.forEach(c => {
                                c.style.transition = '';
                                c.style.opacity = '';
                                c.style.transform = '';
                                c.style.maxHeight = '';
                                c.style.overflow = '';
                                c.style.marginBottom = '';
                            });
                            resolve();
                        }
                    }, 300);
                }, index * 80); 
            });
        });
    }

    async enterFilterMode(filterValue, genreValue) {
        this.isFilterMode = true;
        this.isRovlooMode = filterValue === 'rovloo-reviewed';

        this.setFilterButtonsDisabled(true, this.isRovlooMode);
        
        const listsContainer = document.getElementById('GamesListsContainer');
        if (!listsContainer) return;

        const isDefaultFilter = !this.currentFilter || this.currentFilter === 'default';
        const filterName = !isDefaultFilter ? this.filterNames[filterValue] : null;
        const genreName = genreValue && genreValue !== 'All' ? this.genreNames[genreValue] : null;
        
        let title;
        if (filterName && genreName) {
            title = `${filterName} - ${genreName}`;
        } else if (genreName && isDefaultFilter) {

            title = `Trending in ${genreName}`;
        } else if (genreName) {
            title = `${genreName} Games`;
        } else if (filterName) {
            title = filterName;
        } else {
            title = 'Games';
        }

        let rovlooSortHtml = '';
        if (this.isRovlooMode) {
            const sortOptions = Object.entries(this.rovlooSortOptions)
                .map(([value, label]) => `<li data-value="${value}"><a href="#">${label}</a></li>`)
                .join('');
            
            rovlooSortHtml = `
                <div class="input-group-btn rovloo-sort-filter" id="RovlooSortFilter" style="margin-left: 15px;">
                    <button type="button" class="input-dropdown-btn" data-toggle="dropdown">
                        <span class="rbx-selection-label">${this.rovlooSortOptions[this.currentRovlooSort]}</span>
                        <span class="icon-down-16x16"></span>
                    </button>
                    <ul data-toggle="dropdown-menu" class="dropdown-menu" role="menu">
                        ${sortOptions}
                    </ul>
                </div>
            `;
        }

        const filteredViewHtml = `
            <div class="filtered-games-view" id="FilteredGamesView" style="opacity: 0; transform: translateY(20px);">
                <div class="games-list-header" style="float: left; display: flex; align-items: center;">
                    <h3>${title}</h3>
                    ${rovlooSortHtml}
                </div>
                <div style="float: right; margin-right: 28px;">
                    <button class="see-all-button" id="FilteredGamesBack">
                        ← Back to All Games
                    </button>
                </div>
                <div style="clear: both; margin-bottom: 10px;"></div>
                <div class="filtered-games-grid" id="FilteredGamesGrid">
                    <div class="games-loading">
                        <div class="loading-spinner"></div>
                        <div class="loading-text">Loading games...</div>
                    </div>
                </div>
            </div>
        `;

        listsContainer.innerHTML = filteredViewHtml;
        listsContainer.style.display = 'block';

        const backBtn = document.getElementById('FilteredGamesBack');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.exitFilterMode());
        }

        if (this.isRovlooMode) {
            this.setupRovlooSortHandler();
        }

        const filteredView = document.getElementById('FilteredGamesView');
        if (filteredView) {

            filteredView.offsetHeight;

            filteredView.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            filteredView.style.opacity = '1';
            filteredView.style.transform = 'translateY(0)';
        }

        if (this.isRovlooMode) {
            await this.loadRovlooGames(genreValue);
        } else {
            await this.loadFilteredGames(filterValue, genreValue);
        }
    }

    setupRovlooSortHandler() {
        const rovlooSortFilter = document.getElementById('RovlooSortFilter');
        if (!rovlooSortFilter) return;

        const btn = rovlooSortFilter.querySelector('.input-dropdown-btn');
        const menu = rovlooSortFilter.querySelector('.dropdown-menu');
        
        if (btn && menu) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.classList.toggle('open');
            });

            document.addEventListener('click', () => {
                menu.classList.remove('open');
            });
        }

        rovlooSortFilter.querySelectorAll('ul li').forEach(item => {
            item.addEventListener('click', async (e) => {
                e.preventDefault();
                const sortValue = item.getAttribute('data-value');
                const sortLabel = item.querySelector('a')?.textContent || 'Sort';

                const label = rovlooSortFilter.querySelector('.rbx-selection-label');
                if (label) label.textContent = sortLabel;

                if (menu) menu.classList.remove('open');

                if (sortValue !== this.currentRovlooSort) {
                    this.currentRovlooSort = sortValue;

                    this.rovlooGamesCache = null;

                    const grid = document.getElementById('FilteredGamesGrid');
                    if (grid) {
                        grid.innerHTML = `
                            <div class="games-loading">
                                <div class="loading-spinner"></div>
                                <div class="loading-text">Sorting games...</div>
                            </div>
                        `;
                    }

                    await this.loadRovlooGames(this.currentGenre);
                }
            });
        });
    }

    setFilterButtonsDisabled(disabled, keepGenreEnabled = false) {
        const filterButtons = document.querySelectorAll('#FiltersAndSort .input-dropdown-btn');
        
        filterButtons.forEach(btn => {
            const isGenreFilter = btn.closest('#GenreFilter');

            if (keepGenreEnabled && isGenreFilter) {
                btn.classList.remove('disabled');
                return;
            }
            
            if (disabled) {
                btn.classList.add('disabled');
            } else {
                btn.classList.remove('disabled');
            }
        });
    }

    async exitFilterMode() {
        this.isFilterMode = false;
        this.isRovlooMode = false;
        this.currentFilter = null;
        this.currentGenre = null;

        if (this.searchScrollObserver) {
            this.searchScrollObserver.disconnect();
            this.searchScrollObserver = null;
        }
        this.searchHasMore = false;
        this.isLoadingMore = false;

        const filteredView = document.getElementById('FilteredGamesView');
        const listsContainer = document.getElementById('GamesListsContainer');

        if (filteredView) {
            filteredView.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            filteredView.style.opacity = '0';
            filteredView.style.transform = 'translateY(-20px)';
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        const sortLabel = document.querySelector('#SortFilter .rbx-selection-label');
        if (sortLabel) sortLabel.textContent = 'Filter by';
        
        const genreLabel = document.querySelector('#GenreFilter .rbx-selection-label');
        if (genreLabel) genreLabel.textContent = 'Genre';

        if (listsContainer) {
            listsContainer.innerHTML = '';
        }

        let index = 0;
        for (const [categoryKey, category] of Object.entries(this.categories)) {
            const containerHtml = `
                <div class="games-list-container container-${index}" id="${category.containerId}" data-category="${categoryKey}" style="opacity: 0; transform: translateY(20px);">
                    <div class="games-list-header games-filter-changer">
                        <h3>${category.title}</h3>
                    </div>
                    <div class="show-in-multiview-mode-only" style="float: right;">
                        <div class="see-all-button games-filter-changer btn-fixed-width btn-secondary-xs btn-more">
                            See All
                        </div>
                    </div>
                    <div class="games-list">
                        <div class="show-in-multiview-mode-only">
                            <div class="scroller prev disabled">
                                <div class="arrow">
                                    <span class="icon-games-carousel-left"></span>
                                </div>
                            </div>
                            <div class="horizontally-scrollable">
                                <ul class="hlist games game-cards">
                                    <div class="games-loading">
                                        <div class="loading-spinner"></div>
                                        <div class="loading-text">Loading games...</div>
                                    </div>
                                </ul>
                            </div>
                            <div class="scroller next">
                                <div class="arrow">
                                    <span class="icon-games-carousel-right"></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            listsContainer.insertAdjacentHTML('beforeend', containerHtml);
            index++;
        }

        const containers = document.querySelectorAll('.games-list-container');

        if (containers.length > 0) {
            containers[0].offsetHeight;
        }

        containers.forEach((container, idx) => {
            setTimeout(() => {
                container.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                container.style.opacity = '1';
                container.style.transform = 'translateY(0)';
            }, idx * 80);
        });

        Object.values(this.categories).forEach(cat => cat.loaded = false);

        this.loadAllCategories().then(() => {
            this.setupCarouselHandlers();
            this.setupSeeAllHandlers();
        });

        await new Promise(resolve => setTimeout(resolve, 500 + (containers.length * 80)));
        containers.forEach(container => {
            container.style.transition = '';
            container.style.opacity = '';
            container.style.transform = '';
        });

        this.setFilterButtonsDisabled(false);
    }

      async loadFilteredGames(filterValue, genreValue) {
        const grid = document.getElementById('FilteredGamesGrid');
        if (!grid) return;
    
        try {
          const api = window.robloxAPI || window.roblox;
          if (!api) throw new Error('API not available');
    
          let games = [];
          let gameDetails = new Map();
          let gameVotes = new Map();

          const hasGenreFilter = genreValue && genreValue !== 'All';
          const isDefaultFilter = !this.currentFilter || this.currentFilter === 'default';

          let sortId;
          if (hasGenreFilter && isDefaultFilter) {

            sortId = this.genreToSortMapping[genreValue];
            console.log(`[GamesPageRenderer] Using genre sort: ${sortId} for genre: ${genreValue}`);
          } else {

            sortId = filterValue || 'most-popular';
          }

          if (api.getGameSorts) {
            await this.getCachedGameSorts();
          }

          if (this.gameSorts && sortId) {
            const matchedSort = this.gameSorts.find(s => {
              const id = (s.sortId || s.id || '').toLowerCase();
              return id === sortId.toLowerCase();
            });
    
            if (matchedSort?.games?.length > 0) {

              const limit = (hasGenreFilter && !isDefaultFilter) ? 200 : 50;
              games = matchedSort.games.slice(0, limit);
              console.log(`[GamesPageRenderer] Found ${games.length} games from sort: ${sortId} (Limit: ${limit})`);
            }
          }

          if (games.length > 0 && hasGenreFilter && !isDefaultFilter) {

            const universeIds = games.map(g => g.universeId).filter(Boolean);
            
            if (universeIds.length > 0 && api.getGameDetails) {

              const batchSize = 50;
              let allDetails = [];

              const loadingText = document.querySelector('#FilteredGamesGrid .loading-text');
              
              for (let i = 0; i < universeIds.length; i += batchSize) {
                if (loadingText && i > 0) {
                  loadingText.textContent = `Filtering games... (${Math.min(i, universeIds.length)}/${universeIds.length})`;
                }
                
                const batch = universeIds.slice(i, i + batchSize);

                if (i > 0) await new Promise(r => setTimeout(r, 100));
                
                try {
                  const detailsResult = await api.getGameDetails(batch);
                  if (detailsResult?.data) {
                    allDetails = allDetails.concat(detailsResult.data);
                  }
                } catch (e) {
                  console.warn('[GamesPageRenderer] Failed to fetch details for filtering batch', e);
                }
              }
    
              if (allDetails.length > 0) {
                const filterGenre = genreValue.toLowerCase();
                const genreFilteredGames = allDetails.filter(game => {
                  const gameGenre = (game.genre || game.genre_l1 || '').toLowerCase();
                  
                  if (!gameGenre || gameGenre === 'all') return false;
                  if (gameGenre === filterGenre) return true;
                  if (gameGenre.startsWith(filterGenre + ' ') || gameGenre.startsWith(filterGenre + '-')) return true;
                  if (gameGenre.includes(' and ') && gameGenre.split(' and ')[0] === filterGenre) return true;
                  
                  return false;
                });
                
                if (genreFilteredGames.length > 0) {
                  games = genreFilteredGames.map(g => ({ universeId: g.id, ...g }));

                  genreFilteredGames.forEach(g => gameDetails.set(g.id, g));
                  
                  console.log(`[GamesPageRenderer] Filtered to ${games.length} games matching genre: ${genreValue}`);
                } else {
                  games = []; 
                }
              }
            }
          }

          if (games.length === 0 && api.getOmniRecommendations) {
            const recommendations = await api.getOmniRecommendations('Games');
            if (recommendations?.sorts) {
              for (const sort of recommendations.sorts) {
                if (sort.games?.length > 0) {
                  games = sort.games.slice(0, 50);
                  break;
                }
              }
            }
          }
    
          if (games.length === 0) {
            grid.innerHTML = `
              <div class="no-games-message">
                <h3>No games found</h3>
                <p>Try a different filter combination</p>
              </div>
            `;
            return;
          }

          const universeIds = games.map(g => g.universeId).filter(Boolean);
          const idsToFetch = universeIds.filter(id => !gameDetails.has(id));

          if (idsToFetch.length > 0) {
            const batchSize = 50;
            for (let i = 0; i < idsToFetch.length; i += batchSize) {
              const batch = idsToFetch.slice(i, i + batchSize);

              if (i > 0) await new Promise(r => setTimeout(r, 200));
    
              const [detailsResult, votesResult] = await Promise.all([
                api.getGameDetails ? api.getGameDetails(batch) : null,
                api.getGameVotes ? api.getGameVotes(batch) : null
              ]);
    
              if (detailsResult?.data) {
                for (const game of detailsResult.data) {
                  gameDetails.set(game.id, game);
                }
              }
    
              if (votesResult?.data) {
                for (const vote of votesResult.data) {
                  gameVotes.set(vote.id, vote);
                }
              }
            }
          } else if (universeIds.length > 0 && api.getGameVotes) {

             const batchSize = 50;
             for (let i = 0; i < universeIds.length; i += batchSize) {
                const batch = universeIds.slice(i, i + batchSize);
                const votesResult = await api.getGameVotes(batch);
                if (votesResult?.data) {
                  for (const vote of votesResult.data) {
                    gameVotes.set(vote.id, vote);
                  }
                }
             }
          }

          grid.innerHTML = '';
          for (const game of games) {
            const details = gameDetails.get(game.universeId) || game;
            const votes = gameVotes.get(game.universeId) || { upVotes: 0, downVotes: 0 };
            const card = this.renderGameCard(details, votes);
            grid.appendChild(card);
          }

          if (this.thumbnailLoader) {
            const thumbImages = grid.querySelectorAll('.game-card-thumb');
            thumbImages.forEach((img, index) => {
              if (games[index]?.universeId) {
                this.thumbnailLoader.queueGameIcon(games[index].universeId, img);
              }
            });
          }
    
        } catch (error) {
          console.error('[GamesPageRenderer] Failed to load filtered games:', error);
          grid.innerHTML = `
            <div class="games-loading">
              <div class="loading-text" style="color: #d32f2f;">Failed to load games</div>
              <button class="retry-btn" onclick="window.gamesPageRenderer.loadFilteredGames('${filterValue}', '${genreValue}')">Retry</button>
            </div>
          `;
        }
      }

    async loadRovlooGames(genreValue) {
        const grid = document.getElementById('FilteredGamesGrid');
        if (!grid) return;

        console.log(`[GamesPageRenderer] Loading Rovloo reviewed games with sort: ${this.currentRovlooSort}`);

        if (this.rovlooGamesCache && (Date.now() - this.rovlooGamesCacheTimestamp) < this.ROVLOO_CACHE_TTL) {
            console.log('[GamesPageRenderer] Using cached Rovloo games');
            this.renderRovlooGames(this.rovlooGamesCache, genreValue);
            return;
        }

        try {

            if (!window.roblox?.reviews?.getReviewedGames) {
                console.warn('[GamesPageRenderer] Rovloo reviews API not available');
                grid.innerHTML = `
                    <div class="no-games-message">
                        <h3>Rovloo Reviews Not Available</h3>
                        <p>The Rovloo reviews feature is not available. Make sure you're logged in and have the Rovloo extension enabled.</p>
                    </div>
                `;
                return;
            }

            const reviewedGames = await window.roblox.reviews.getReviewedGames({
                sort: this.currentRovlooSort
            });

            console.log('[GamesPageRenderer] Got Rovloo reviewed games:', reviewedGames?.length || 0);

            if (!reviewedGames || reviewedGames.length === 0) {
                grid.innerHTML = `
                    <div class="no-games-message">
                        <h3>No Rovloo Reviewed Games</h3>
                        <p>No games have been reviewed on Rovloo yet. Be the first to review games!</p>
                    </div>
                `;
                return;
            }

            const gamesWithCompleteData = [];
            const gamesNeedingEnrichment = [];

            for (const g of reviewedGames) {
                const hasCompleteData = g.universeId && g.name && g.name !== 'Unknown Game';
                if (hasCompleteData) {
                    gamesWithCompleteData.push(this.formatRovlooGame(g));
                } else {
                    gamesNeedingEnrichment.push(g);
                }
            }

            console.log(`[GamesPageRenderer] Rovloo: ${gamesWithCompleteData.length} complete, ${gamesNeedingEnrichment.length} need enrichment`);

            const formattedGames = [...gamesWithCompleteData];

            if (gamesNeedingEnrichment.length > 0) {
                const loadingText = grid.querySelector('.loading-text');
                if (loadingText) {
                    loadingText.textContent = `Processing ${gamesNeedingEnrichment.length} games...`;
                }

                const MIN_VALID_ID = 100000;
                const MAX_VALID_ID = 99999999999;
                const validGames = gamesNeedingEnrichment.filter(g => {
                    const id = typeof g.gameId === 'string' ? parseInt(g.gameId, 10) : g.gameId;
                    return id && !isNaN(id) && id >= MIN_VALID_ID && id <= MAX_VALID_ID;
                });

                const placeToUniverse = new Map();
                const placeIdToRovlooData = new Map();
                
                for (const g of validGames) {
                    const id = typeof g.gameId === 'string' ? parseInt(g.gameId, 10) : g.gameId;
                    placeIdToRovlooData.set(id, g);
                }

                const placeIds = Array.from(placeIdToRovlooData.keys());
                
                if (placeIds.length > 0 && window.roblox?.getPlaceDetails) {
                    const BATCH_SIZE = 3;
                    const BATCH_DELAY = 500;

                    for (let i = 0; i < placeIds.length; i += BATCH_SIZE) {
                        const batch = placeIds.slice(i, Math.min(i + BATCH_SIZE, placeIds.length));
                        
                        if (loadingText) {
                            const percent = Math.round((i / placeIds.length) * 100);
                            loadingText.textContent = `Converting place IDs... ${percent}%`;
                        }

                        const promises = batch.map(async (placeId) => {
                            try {
                                const placeDetails = await window.roblox.getPlaceDetails([placeId]);
                                if (placeDetails?.[0]?.universeId) {
                                    return { placeId, universeId: placeDetails[0].universeId };
                                }
                            } catch (e) {
                                console.warn(`[GamesPageRenderer] Failed to convert placeId ${placeId}:`, e.message);
                            }
                            return null;
                        });

                        const results = await Promise.all(promises);
                        for (const result of results) {
                            if (result) {
                                placeToUniverse.set(result.placeId, result.universeId);
                            }
                        }

                        if (i + BATCH_SIZE < placeIds.length) {
                            await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
                        }
                    }
                }

                if (placeToUniverse.size > 0) {
                    const universeIds = Array.from(placeToUniverse.values());
                    const api = window.robloxAPI || window.roblox;

                    if (loadingText) {
                        loadingText.textContent = `Loading ${universeIds.length} game details...`;
                    }

                    const gameDetailsMap = new Map();
                    const GAME_BATCH_SIZE = 30;

                    for (let i = 0; i < universeIds.length; i += GAME_BATCH_SIZE) {
                        const batch = universeIds.slice(i, i + GAME_BATCH_SIZE);
                        
                        try {
                            const result = await api.getGameDetails(batch);
                            if (result?.data) {
                                for (const game of result.data) {
                                    gameDetailsMap.set(game.id, game);
                                }
                            }
                        } catch (e) {
                            console.warn('[GamesPageRenderer] Game details batch failed:', e.message);
                        }

                        if (i + GAME_BATCH_SIZE < universeIds.length) {
                            await new Promise(resolve => setTimeout(resolve, 200));
                        }
                    }

                    for (const [placeId, universeId] of placeToUniverse) {
                        const rovlooData = placeIdToRovlooData.get(placeId);
                        const gameData = gameDetailsMap.get(universeId);

                        if (gameData) {
                            formattedGames.push({
                                universeId: gameData.id,
                                placeId: gameData.rootPlaceId || placeId,
                                name: gameData.name,
                                playerCount: gameData.playing || 0,
                                playing: gameData.playing || 0,
                                genre: gameData.genre || 'All',
                                visits: gameData.visits || 0,
                                favoritedCount: gameData.favoritedCount || 0,
                                creator: gameData.creator,
                                creatorName: gameData.creator?.name || 'Unknown',
                                rovlooReviewCount: rovlooData?.reviewCount || 0,
                                rovlooLikeRatio: rovlooData?.likeRatio || 0,
                                rovlooLikeCount: rovlooData?.likeCount || 0,
                                rovlooDislikeCount: rovlooData?.dislikeCount || 0,
                                newestReviewTimestamp: rovlooData?.newestReviewTimestamp || 0,
                                isBlacklisted: rovlooData?.isBlacklisted || false
                            });
                        }
                    }
                }
            }

            const sortedGames = this.sortRovlooGames(formattedGames);

            this.rovlooGamesCache = sortedGames;
            this.rovlooGamesCacheTimestamp = Date.now();

            this.renderRovlooGames(sortedGames, genreValue);

        } catch (error) {
            console.error('[GamesPageRenderer] Failed to load Rovloo games:', error);
            grid.innerHTML = `
                <div class="games-loading">
                    <div class="loading-text" style="color: #d32f2f;">Failed to load Rovloo games</div>
                    <button class="retry-btn" onclick="window.gamesPageRenderer.loadRovlooGames('${genreValue || ''}')">Retry</button>
                </div>
            `;
        }
    }

    formatRovlooGame(g) {
        return {
            universeId: g.universeId,
            placeId: g.placeId || g.gameId,
            name: g.name,
            playerCount: g.playing || g.playerCount || 0,
            playing: g.playing || g.playerCount || 0,
            genre: g.genre || 'All',
            visits: g.visits || 0,
            favoritedCount: g.favoritedCount || 0,
            creator: g.creator ? { name: g.creator } : null,
            creatorName: g.creatorName || g.creator || 'Unknown',
            thumbnailUrl: g.thumbnailUrl || '',
            rovlooReviewCount: g.rovlooReviewCount || g.reviewCount || 0,
            rovlooLikeRatio: g.rovlooLikeRatio || g.likeRatio || 0,
            rovlooLikeCount: g.rovlooLikeCount || g.likeCount || 0,
            rovlooDislikeCount: g.rovlooDislikeCount || g.dislikeCount || 0,
            newestReviewTimestamp: g.newestReviewTimestamp || 0,
            isBlacklisted: g.isBlacklisted || false
        };
    }

    calculateWilsonScore(likes, dislikes) {
        const total = likes + dislikes;
        if (total < 5) return 0.5;

        const z = 1.96;
        const phat = likes / total;
        const score = (phat + z * z / (2 * total) - z * Math.sqrt((phat * (1 - phat) + z * z / (4 * total)) / total)) / (1 + z * z / total);
        return score;
    }

    calculateGameDiscoveryScore(game) {
        const playerCount = game.playing || game.playerCount || 0;
        const visits = game.visits || 0;
        const reviewCount = game.rovlooReviewCount || 0;
        const likeCount = game.rovlooLikeCount || 0;
        const dislikeCount = game.rovlooDislikeCount || 0;

        if (reviewCount < 1) return 0;

        const wilsonScore = this.calculateWilsonScore(likeCount, dislikeCount);
        if (wilsonScore < 0.5) return 0;

        let baseScore = 0;
        if (playerCount >= 10 && playerCount <= 99) {
            baseScore = 100;
        } else if (playerCount >= 100 && playerCount <= 999) {
            baseScore = 80;
        } else if (playerCount > 0 && playerCount < 10) {
            baseScore = 60;
        } else if (playerCount === 0 && visits < 10000) {
            baseScore = 40;
        } else if (playerCount >= 1000 && playerCount < 5000) {
            baseScore = 30;
        } else {
            baseScore = 10;
        }

        if (baseScore > 0 && visits < 10000) {
            baseScore += 15;
        } else if (baseScore > 0 && visits < 50000) {
            baseScore += 5;
        }

        const reviewMultiplier = Math.min(1 + (reviewCount / 10), 2.0);
        const ratingMultiplier = 0.5 + (wilsonScore * 1.5);
        const finalScore = baseScore * reviewMultiplier * ratingMultiplier;

        return Math.round(finalScore * 100) / 100;
    }

    sortRovlooGames(games) {
        const sortedGames = [...games];

        switch (this.currentRovlooSort) {
            case 'balanced_discovery':
                sortedGames.sort((a, b) => {
                    const scoreA = this.calculateGameDiscoveryScore(a);
                    const scoreB = this.calculateGameDiscoveryScore(b);
                    if (scoreA !== scoreB) return scoreB - scoreA;
                    const wilsonA = this.calculateWilsonScore(a.rovlooLikeCount, a.rovlooDislikeCount);
                    const wilsonB = this.calculateWilsonScore(b.rovlooLikeCount, b.rovlooDislikeCount);
                    return wilsonB - wilsonA;
                });
                break;

            case 'highest_rated':
                sortedGames.sort((a, b) => {
                    const scoreA = this.calculateWilsonScore(a.rovlooLikeCount, a.rovlooDislikeCount);
                    const scoreB = this.calculateWilsonScore(b.rovlooLikeCount, b.rovlooDislikeCount);
                    if (scoreA !== scoreB) return scoreB - scoreA;
                    return b.rovlooReviewCount - a.rovlooReviewCount;
                });
                break;

            case 'lowest_rated':
                sortedGames.sort((a, b) => {
                    const scoreA = this.calculateWilsonScore(a.rovlooLikeCount, a.rovlooDislikeCount);
                    const scoreB = this.calculateWilsonScore(b.rovlooLikeCount, b.rovlooDislikeCount);
                    if (scoreA !== scoreB) return scoreA - scoreB;
                    return b.rovlooReviewCount - a.rovlooReviewCount;
                });
                break;

            case 'newest_reviews':
                sortedGames.sort((a, b) => {
                    const timestampA = a.newestReviewTimestamp || 0;
                    const timestampB = b.newestReviewTimestamp || 0;
                    return timestampB - timestampA;
                });
                break;

            case 'most_reviews':
                sortedGames.sort((a, b) => b.rovlooReviewCount - a.rovlooReviewCount);
                break;

            default:
                sortedGames.sort((a, b) => {
                    const scoreA = this.calculateGameDiscoveryScore(a);
                    const scoreB = this.calculateGameDiscoveryScore(b);
                    return scoreB - scoreA;
                });
                break;
        }

        const nonBlacklisted = sortedGames.filter(g => !g.isBlacklisted);
        const blacklisted = sortedGames.filter(g => g.isBlacklisted);
        return [...nonBlacklisted, ...blacklisted];
    }

    async renderRovlooGames(games, genreValue) {
        const grid = document.getElementById('FilteredGamesGrid');
        if (!grid) return;

        let filteredGames = games;
        if (genreValue && genreValue !== 'All') {
            const filterGenre = genreValue.toLowerCase();
            filteredGames = games.filter(game => {
                const gameGenre = (game.genre || '').toLowerCase();
                if (!gameGenre || gameGenre === 'all') return false;
                if (gameGenre === filterGenre) return true;
                if (gameGenre.startsWith(filterGenre + ' ') || gameGenre.startsWith(filterGenre + '-')) return true;
                if (gameGenre.includes(' and ') && gameGenre.split(' and ')[0] === filterGenre) return true;
                return false;
            });
        }

        if (filteredGames.length === 0) {
            grid.innerHTML = `
                <div class="no-games-message">
                    <h3>No Games Found</h3>
                    <p>No Rovloo reviewed games match the selected genre. Try selecting "All Genres".</p>
                </div>
            `;
            return;
        }

        const api = window.robloxAPI || window.roblox;
        const universeIds = filteredGames.map(g => g.universeId).filter(Boolean);
        const gameVotes = new Map();

        if (universeIds.length > 0 && api?.getGameVotes) {
            try {
                const batchSize = 50;
                for (let i = 0; i < universeIds.length; i += batchSize) {
                    const batch = universeIds.slice(i, i + batchSize);
                    const votesResult = await api.getGameVotes(batch);
                    if (votesResult?.data) {
                        for (const vote of votesResult.data) {
                            gameVotes.set(vote.id, vote);
                        }
                    }
                }
            } catch (e) {
                console.warn('[GamesPageRenderer] Failed to fetch votes:', e.message);
            }
        }

        grid.innerHTML = '';
        for (const game of filteredGames) {
            const votes = gameVotes.get(game.universeId) || { upVotes: 0, downVotes: 0 };
            const card = this.renderRovlooGameCard(game, votes);
            grid.appendChild(card);
        }

        if (this.thumbnailLoader) {
            const thumbImages = grid.querySelectorAll('.game-card-thumb');
            thumbImages.forEach((img, index) => {
                if (filteredGames[index]?.universeId) {
                    this.thumbnailLoader.queueGameIcon(filteredGames[index].universeId, img);
                }
            });
        }
    }

    renderRovlooGameCard(game, votes) {
        const card = document.createElement('li');
        card.className = 'game-card rovloo-game-card';
        card.dataset.universeId = game.universeId;
        card.dataset.placeId = game.placeId;

        const gameName = this.truncateText(game.name || 'Unknown Game', 20);
        const playerCount = this.formatNumber(game.playing || 0);
        const votePercentage = this.calculateVotePercentage(votes.upVotes, votes.downVotes);
        const creatorName = game.creator?.name || game.creatorName || 'Unknown';

        const reviewCount = game.rovlooReviewCount || 0;
        const likeCount = game.rovlooLikeCount || 0;
        const dislikeCount = game.rovlooDislikeCount || 0;
        const rovlooRatio = reviewCount > 0 ? Math.round((likeCount / (likeCount + dislikeCount)) * 100) : 0;

        card.innerHTML = `
            <a href="game-detail.html?placeId=${game.placeId}" class="game-card-container">
                <div class="game-card-thumb-container">
                    <img src="${this.GAME_PLACEHOLDER}" class="game-card-thumb" alt="${game.name}" data-universe-id="${game.universeId}"/>
                    <div class="rovloo-badge" title="Rovloo Reviewed">
                        <span class="rovloo-icon">★</span>
                    </div>
                </div>
                <div class="game-card-name" title="${game.name}">${gameName}</div>
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
                <div class="rovloo-stats">
                    <span class="rovloo-reviews" title="Rovloo Reviews">${reviewCount} reviews</span>
                    <span class="rovloo-rating" title="Rovloo Rating">${rovlooRatio}% liked</span>
                </div>
                <div class="game-card-footer">
                    <div class="game-creator">by <span class="creator-link" data-creator-id="${game.creator?.id}" data-creator-type="${game.creator?.type}">${creatorName}</span></div>
                </div>
            </a>
        `;

        const container = card.querySelector('.game-card-container');
        container.addEventListener('click', (e) => {
            e.preventDefault();
            this.navigateToGame(game.placeId);
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

    async loadRovlooCategorySection(categoryKey) {
        const category = this.categories[categoryKey];
        if (!category) return;

        console.log('[GamesPageRenderer] Loading Rovloo category section');

        if (this.rovlooGamesCache && (Date.now() - this.rovlooGamesCacheTimestamp) < this.ROVLOO_CACHE_TTL) {
            console.log('[GamesPageRenderer] Using cached Rovloo games for category');
            const sortedGames = this.sortRovlooGames([...this.rovlooGamesCache]);
            await this.renderRovlooCategorySection(categoryKey, sortedGames.slice(0, 12));
            category.loaded = true;
            return;
        }

        try {

            if (!window.roblox?.reviews?.getReviewedGames) {
                console.warn('[GamesPageRenderer] Rovloo reviews API not available');
                this.showCategoryError(categoryKey);
                return;
            }

            const reviewedGames = await window.roblox.reviews.getReviewedGames({
                sort: 'highest_rated'
            });

            if (!reviewedGames || reviewedGames.length === 0) {
                console.log('[GamesPageRenderer] No Rovloo reviewed games found');
                this.showCategoryError(categoryKey);
                return;
            }

            const gamesWithCompleteData = [];
            const gamesNeedingEnrichment = [];

            for (const g of reviewedGames) {
                const hasCompleteData = g.universeId && g.name && g.name !== 'Unknown Game';
                if (hasCompleteData) {
                    gamesWithCompleteData.push(this.formatRovlooGame(g));
                } else {
                    gamesNeedingEnrichment.push(g);
                }
            }

            const formattedGames = [...gamesWithCompleteData];

            if (gamesNeedingEnrichment.length > 0 && formattedGames.length < 12) {
                const MIN_VALID_ID = 100000;
                const MAX_VALID_ID = 99999999999;
                const validGames = gamesNeedingEnrichment.slice(0, 20).filter(g => {
                    const id = typeof g.gameId === 'string' ? parseInt(g.gameId, 10) : g.gameId;
                    return id && !isNaN(id) && id >= MIN_VALID_ID && id <= MAX_VALID_ID;
                });

                const placeToUniverse = new Map();
                const placeIdToRovlooData = new Map();

                for (const g of validGames) {
                    const id = typeof g.gameId === 'string' ? parseInt(g.gameId, 10) : g.gameId;
                    placeIdToRovlooData.set(id, g);
                }

                const placeIds = Array.from(placeIdToRovlooData.keys());

                if (placeIds.length > 0 && window.roblox?.getPlaceDetails) {

                    for (let i = 0; i < placeIds.length; i += 3) {
                        const batch = placeIds.slice(i, Math.min(i + 3, placeIds.length));
                        const promises = batch.map(async (placeId) => {
                            try {
                                const placeDetails = await window.roblox.getPlaceDetails([placeId]);
                                if (placeDetails?.[0]?.universeId) {
                                    return { placeId, universeId: placeDetails[0].universeId };
                                }
                            } catch (e) {  }
                            return null;
                        });

                        const results = await Promise.all(promises);
                        for (const result of results) {
                            if (result) placeToUniverse.set(result.placeId, result.universeId);
                        }

                        if (i + 3 < placeIds.length) {
                            await new Promise(resolve => setTimeout(resolve, 300));
                        }
                    }
                }

                if (placeToUniverse.size > 0) {
                    const universeIds = Array.from(placeToUniverse.values());
                    const api = window.robloxAPI || window.roblox;

                    try {
                        const result = await api.getGameDetails(universeIds);
                        if (result?.data) {
                            for (const gameData of result.data) {
                                const placeId = Array.from(placeToUniverse.entries())
                                    .find(([_, uid]) => uid === gameData.id)?.[0];
                                const rovlooData = placeIdToRovlooData.get(placeId);

                                if (gameData && rovlooData) {
                                    formattedGames.push({
                                        universeId: gameData.id,
                                        placeId: gameData.rootPlaceId || placeId,
                                        name: gameData.name,
                                        playerCount: gameData.playing || 0,
                                        playing: gameData.playing || 0,
                                        genre: gameData.genre || 'All',
                                        visits: gameData.visits || 0,
                                        creator: gameData.creator,
                                        creatorName: gameData.creator?.name || 'Unknown',
                                        rovlooReviewCount: rovlooData?.reviewCount || 0,
                                        rovlooLikeCount: rovlooData?.likeCount || 0,
                                        rovlooDislikeCount: rovlooData?.dislikeCount || 0,
                                        newestReviewTimestamp: rovlooData?.newestReviewTimestamp || 0,
                                        isBlacklisted: rovlooData?.isBlacklisted || false
                                    });
                                }
                            }
                        }
                    } catch (e) {
                        console.warn('[GamesPageRenderer] Failed to fetch game details for Rovloo:', e.message);
                    }
                }
            }

            const sortedGames = this.sortRovlooGames(formattedGames);
            this.rovlooGamesCache = sortedGames;
            this.rovlooGamesCacheTimestamp = Date.now();

            await this.renderRovlooCategorySection(categoryKey, sortedGames.slice(0, 12));
            category.loaded = true;

        } catch (error) {
            console.error('[GamesPageRenderer] Failed to load Rovloo category:', error);
            this.showCategoryError(categoryKey);
        }
    }

    async renderRovlooCategorySection(categoryKey, games) {
        const category = this.categories[categoryKey];
        const container = document.getElementById(category.containerId);
        if (!container) return;

        const gameCardsContainer = container.querySelector('.game-cards');
        if (!gameCardsContainer) return;

        gameCardsContainer.innerHTML = '';

        if (games.length === 0) {
            gameCardsContainer.innerHTML = `
                <div class="games-loading">
                    <div class="loading-text">No Rovloo reviewed games available</div>
                </div>
            `;
            return;
        }

        const api = window.robloxAPI || window.roblox;
        const universeIds = games.map(g => g.universeId).filter(Boolean);
        const gameVotes = new Map();

        if (universeIds.length > 0 && api?.getGameVotes) {
            try {
                const votesResult = await api.getGameVotes(universeIds);
                if (votesResult?.data) {
                    for (const vote of votesResult.data) {
                        gameVotes.set(vote.id, vote);
                    }
                }
            } catch (e) {
                console.warn('[GamesPageRenderer] Failed to fetch votes for Rovloo category:', e.message);
            }
        }

        for (const game of games) {
            const votes = gameVotes.get(game.universeId) || { upVotes: 0, downVotes: 0 };
            const card = this.renderRovlooGameCard(game, votes);
            gameCardsContainer.appendChild(card);
        }

        if (this.thumbnailLoader) {
            const thumbImages = gameCardsContainer.querySelectorAll('.game-card-thumb');
            thumbImages.forEach((img, index) => {
                if (games[index]?.universeId) {
                    this.thumbnailLoader.queueGameIcon(games[index].universeId, img);
                }
            });
        }

        setTimeout(() => {
            this.updateCarouselButtons(container);
        }, 100);
    }

    createCategoryContainers() {
        const listsContainer = document.getElementById('GamesListsContainer');
        if (!listsContainer) {
            console.error('[GamesPageRenderer] GamesListsContainer not found');
            return;
        }

        listsContainer.innerHTML = '';

        let index = 0;
        for (const [categoryKey, category] of Object.entries(this.categories)) {
            const containerHtml = `
                <div class="games-list-container container-${index}" id="${category.containerId}" data-category="${categoryKey}">
                    <div class="games-list-header games-filter-changer">
                        <h3>${category.title}</h3>
                    </div>
                    <div class="show-in-multiview-mode-only" style="float: right;">
                        <div class="see-all-button games-filter-changer btn-fixed-width btn-secondary-xs btn-more">
                            See All
                        </div>
                    </div>
                    <div class="games-list">
                        <div class="show-in-multiview-mode-only">
                            <div class="scroller prev disabled">
                                <div class="arrow">
                                    <span class="icon-games-carousel-left"></span>
                                </div>
                            </div>
                            <div class="horizontally-scrollable">
                                <ul class="hlist games game-cards">
                                    <div class="games-loading">
                                        <div class="loading-spinner"></div>
                                        <div class="loading-text">Loading games...</div>
                                    </div>
                                </ul>
                            </div>
                            <div class="scroller next">
                                <div class="arrow">
                                    <span class="icon-games-carousel-right"></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            listsContainer.insertAdjacentHTML('beforeend', containerHtml);
            index++;
        }
    }

    showLoadingState() {
        for (const [categoryKey, category] of Object.entries(this.categories)) {
            const container = document.getElementById(category.containerId);
            if (!container) continue;
            
            const gameCardsContainer = container.querySelector('.game-cards');
            if (gameCardsContainer) {
                gameCardsContainer.innerHTML = `
                    <div class="games-loading">
                        <div class="loading-spinner"></div>
                        <div class="loading-text">Loading games...</div>
                    </div>
                `;
            }
        }
    }

    createGameSkeletons(count) {
        let html = '';
        for (let i = 0; i < count; i++) {
            html += `
                <li class="game-card skeleton-card">
                    <div class="game-card-container">
                        <div class="skeleton skeleton-game-thumb"></div>
                        <div class="skeleton skeleton-text skeleton-text-medium"></div>
                        <div class="skeleton skeleton-text skeleton-text-short"></div>
                    </div>
                </li>
            `;
        }
        return html;
    }

    async loadAllCategories() {
        const loadPromises = Object.entries(this.categories).map(([key, category]) => {
            console.log(`[GamesPageRenderer] Loading ${category.title}...`);
            return this.loadGameCategory(key, category.sortId);
        });
        
        await Promise.all(loadPromises);
    }

    async loadGameCategory(categoryKey, sortId) {
        const category = this.categories[categoryKey];
        if (!category || category.loaded) return;

        if (category.isRovloo) {
            await this.loadRovlooCategorySection(categoryKey);
            return;
        }

        const cached = this.categoryCache.get(categoryKey);
        if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
            console.log(`[GamesPageRenderer] Using cached data for ${categoryKey}`);
            this.renderGameCategory(categoryKey, cached.games, cached.gameDetails, cached.gameVotes);
            category.loaded = true;
            return;
        }

        try {
            const api = window.robloxAPI || window.roblox;
            if (!api) throw new Error('API not available');

            let games = [];

                  if (api.getGameSorts) {

                    await this.getCachedGameSorts();
            
                    if (this.gameSorts) {                    
                    const matchedSort = this.gameSorts.find(s => {
                        const id = (s.sortId || s.id || '').toLowerCase();
                        return id === sortId.toLowerCase();
                    });

                    if (matchedSort?.games?.length > 0) {
                        games = matchedSort.games.slice(0, 12);
                        console.log(`[GamesPageRenderer] Found ${games.length} games for ${categoryKey} (sortId: ${sortId})`);
                    }
                }
            }

            if (games.length === 0 && api.getOmniRecommendations) {
                console.log(`[GamesPageRenderer] Falling back to omni recommendations for ${categoryKey}`);
                const recommendations = await api.getOmniRecommendations('Games');
                if (recommendations?.sorts) {
                    for (const sort of recommendations.sorts) {
                        if (sort.recommendationList?.length > 0) {
                            games = sort.recommendationList
                                .filter(rec => rec.contentType === 'Game' && rec.contentId)
                                .slice(0, 12)
                                .map(rec => ({ universeId: rec.contentId }));
                            break;
                        } else if (sort.games?.length > 0) {
                            games = sort.games.slice(0, 12);
                            break;
                        }
                    }
                }
            }

            if (games.length === 0) {
                console.log(`[GamesPageRenderer] No games found for ${categoryKey}`);
                this.showCategoryError(categoryKey);
                return;
            }

            const universeIds = games.map(g => g.universeId).filter(Boolean);

            let gameDetails = new Map();
            let gameVotes = new Map();

            if (universeIds.length > 0) {
                const batchSize = 50;
                for (let i = 0; i < universeIds.length; i += batchSize) {
                    const batch = universeIds.slice(i, i + batchSize);
                    const [detailsResult, votesResult] = await Promise.all([
                        api.getGameDetails ? api.getGameDetails(batch) : null,
                        api.getGameVotes ? api.getGameVotes(batch) : null
                    ]);

                    if (detailsResult?.data) {
                        for (const game of detailsResult.data) {
                            gameDetails.set(game.id, game);
                        }
                    }

                    if (votesResult?.data) {
                        for (const vote of votesResult.data) {
                            gameVotes.set(vote.id, vote);
                        }
                    }
                }
            }

            this.categoryCache.set(categoryKey, {
                games,
                gameDetails,
                gameVotes,
                timestamp: Date.now()
            });
            this.trimCategoryCache(); 

            this.renderGameCategory(categoryKey, games, gameDetails, gameVotes);
            category.loaded = true;

            console.log(`[GamesPageRenderer] ${categoryKey} games loaded successfully`);
        } catch (error) {
            console.error(`[GamesPageRenderer] Failed to load ${categoryKey} games:`, error);
            this.showCategoryError(categoryKey);
        }
    }

    renderGameCategory(categoryKey, games, gameDetails, gameVotes) {
        const category = this.categories[categoryKey];
        const container = document.getElementById(category.containerId);
        if (!container) return;

        const gameCardsContainer = container.querySelector('.game-cards');
        if (!gameCardsContainer) return;

        gameCardsContainer.innerHTML = '';

        for (const game of games) {
            const details = gameDetails.get(game.universeId) || game;
            const votes = gameVotes.get(game.universeId) || { upVotes: 0, downVotes: 0 };
            const card = this.renderGameCard(details, votes);
            gameCardsContainer.appendChild(card);
        }

        if (this.thumbnailLoader) {
            const thumbImages = gameCardsContainer.querySelectorAll('.game-card-thumb');
            thumbImages.forEach((img, index) => {
                if (games[index]?.universeId) {
                    this.thumbnailLoader.queueGameIcon(games[index].universeId, img);
                }
            });
        }

        setTimeout(() => {
            this.updateCarouselButtons(container);
        }, 100);
    }

    renderGameCard(game, votes) {
        const card = document.createElement('li');
        card.className = 'game-card';
        card.dataset.universeId = game.universeId || game.id;
        card.dataset.placeId = game.rootPlaceId || game.placeId;

        const gameName = this.truncateText(game.name || 'Unknown Game', 20);
        const playerCount = this.formatNumber(game.playing || 0);
        const votePercentage = this.calculateVotePercentage(votes.upVotes, votes.downVotes);
        const creatorName = game.creator?.name || 'Unknown';

        card.innerHTML = `
            <a href="game-detail.html?placeId=${game.rootPlaceId || game.placeId}" class="game-card-container">
                <div class="game-card-thumb-container">
                    <img src="${this.GAME_PLACEHOLDER}" class="game-card-thumb" alt="${game.name}" data-universe-id="${game.universeId || game.id}"/>
                </div>
                <div class="game-card-name" title="${game.name}">${gameName}</div>
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

    setupCarouselHandlers() {
        document.querySelectorAll('.games-list-container').forEach(container => {
            const scrollableDiv = container.querySelector('.horizontally-scrollable');
            const prevButton = container.querySelector('.scroller.prev');
            const nextButton = container.querySelector('.scroller.next');

            if (!scrollableDiv || !prevButton || !nextButton) return;

            const scrollCarousel = (direction) => {
                const cardWidth = 150; 
                const gap = 12; 
                const scrollAmount = (cardWidth + gap) * 3; 

                const currentScroll = scrollableDiv.scrollLeft;
                const targetScroll = direction === 'next'
                    ? currentScroll + scrollAmount
                    : currentScroll - scrollAmount;

                scrollableDiv.scrollTo({
                    left: targetScroll,
                    behavior: 'smooth'
                });
            };

            const newPrevButton = prevButton.cloneNode(true);
            const newNextButton = nextButton.cloneNode(true);
            prevButton.parentNode.replaceChild(newPrevButton, prevButton);
            nextButton.parentNode.replaceChild(newNextButton, nextButton);

            newPrevButton.addEventListener('click', () => {
                if (!newPrevButton.classList.contains('disabled')) {
                    scrollCarousel('prev');
                }
            });

            newNextButton.addEventListener('click', () => {
                if (!newNextButton.classList.contains('disabled')) {
                    scrollCarousel('next');
                }
            });

            scrollableDiv.addEventListener('scroll', () => {
                this.updateCarouselButtons(container);
            });

            requestAnimationFrame(() => {
                this.updateCarouselButtons(container);
            });
        });
    }

    updateCarouselButtons(container) {
        const scrollableDiv = container.querySelector('.horizontally-scrollable');
        const prevButton = container.querySelector('.scroller.prev');
        const nextButton = container.querySelector('.scroller.next');

        if (!scrollableDiv || !prevButton || !nextButton) return;

        const scrollLeft = Math.round(scrollableDiv.scrollLeft);
        const scrollWidth = scrollableDiv.scrollWidth;
        const clientWidth = scrollableDiv.clientWidth;
        const maxScroll = scrollWidth - clientWidth;

        if (scrollLeft <= 1) {
            prevButton.classList.add('disabled');
        } else {
            prevButton.classList.remove('disabled');
        }

        if (maxScroll <= 1 || scrollLeft >= maxScroll - 1) {
            nextButton.classList.add('disabled');
        } else {
            nextButton.classList.remove('disabled');
        }
    }

    showCategoryError(categoryKey) {
        const category = this.categories[categoryKey];
        const container = document.getElementById(category.containerId);
        if (!container) return;

        const gameCardsContainer = container.querySelector('.game-cards');
        if (gameCardsContainer) {
            gameCardsContainer.innerHTML = `
                <div class="games-loading">
                    <div class="loading-text" style="color: #d32f2f;">Failed to load games</div>
                    <button class="retry-btn" style="margin-top: 10px; background: #00a2ff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Retry</button>
                </div>
            `;

            const retryBtn = gameCardsContainer.querySelector('.retry-btn');
            if (retryBtn) {
                retryBtn.addEventListener('click', () => {
                    category.loaded = false;
                    this.loadGameCategory(categoryKey, category.sortId);
                });
            }
        }
    }

    calculateVotePercentage(upVotes, downVotes) {
        const total = upVotes + downVotes;
        if (total === 0) return 0;
        return Math.round((upVotes / total) * 100);
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

    navigateToGame(placeId) {
        if (placeId) {
            window.location.href = `game-detail.html?placeId=${placeId}`;
        }
    }

    navigateToProfile(userId) {
        if (userId) {
            window.location.href = `profile.html?userId=${userId}`;
        }
    }

    navigateToGroup(groupId) {
        if (groupId) {
            window.location.href = `groups.html?groupId=${groupId}`;
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GamesPageRenderer;
}

if (typeof window !== 'undefined') {
    window.GamesPageRenderer = GamesPageRenderer;
}

document.addEventListener('DOMContentLoaded', () => {

    const isGamesPage = document.body.dataset.internalPageName === 'Games' || 
                        window.location.pathname.includes('games.html');
    
    if (isGamesPage) {
        const renderer = new GamesPageRenderer();

        window.gamesPageRenderer = renderer;
        renderer.init();
    }
});

