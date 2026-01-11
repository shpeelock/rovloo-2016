const ReviewComponent = {
    placeId: null,
    universeId: null,
    containerId: null,
    container: null,
    currentPage: 1,
    totalPages: 1,
    reviewsPerPage: 10,
    reviews: [],
    userReview: null,
    gameStats: null,
    currentUserId: null,
    currentUsername: null,
    currentDisplayName: null,
    sortOption: 'quality',
    filterOption: 'all',
    isLoading: false,
    isSubmitting: false,
    _requestId: 0,

    browseMode: false,
    searchQuery: '',
    adminPicksMode: false,
    myReviewsMode: false,
    myReviewsUserId: null,

    clientSideSort: false,
    allReviewsCache: null,

    replySummary: {},
    expandedReplies: new Set(),

    userVoteCache: {},
    userGameVote: null,  
    selectedLikeStatus: null,  

    cachedPlaytimeData: null,

    avatarCache: new Map(),
    donorStatusCache: {},
    DONOR_ITEM_ID: 86478952287791,

    rovlooAuthenticated: false,
    rovlooUser: null,

    CLIENT_SIDE_SORT_OPTIONS: [
        'quality', 'underrated', 'trending', 'hidden_gems',
        'highest-voted', 'lowest-voted', 'most-replies', 'least-replies',
        'most-playtime', 'least-playtime', 'highest-rated-user', 'lowest-rated-user',
        'oldest', 'highest_rated', 'lowest_rated', 'game', 'most_visits', 'least_visits'
    ],

    requiresClientSideSort(sort) {
        return this.CLIENT_SIDE_SORT_OPTIONS.includes(sort);
    },

    async init(placeId, containerId, options = {}) {
        console.log('[ReviewComponent] init:', { placeId, containerId, options });
        this._requestId++;
        const initRequestId = this._requestId;

        this.placeId = placeId;
        this.universeId = options.universeId || null;
        this.containerId = containerId;
        this.currentPage = 1;
        this.reviews = [];
        this.userReview = null;
        this.gameStats = null;
        this.replySummary = {};
        this.expandedReplies = new Set();
        this.allReviewsCache = null;
        this.cachedPlaytimeData = null;
        this.userGameVote = null;
        this.selectedLikeStatus = null;

        this.browseMode = options.browseMode || placeId === 'browse';
        this.searchQuery = options.searchQuery || '';
        this.adminPicksMode = options.adminPicksMode || false;
        this.myReviewsMode = options.myReviewsMode || false;
        this.myReviewsUserId = options.myReviewsUserId || null;
        this.sortOption = options.sortOption || 'quality';
        this.filterOption = options.filterOption || 'all';
        this.clientSideSort = options.clientSideSort || false;

        try {
            const user = await window.roblox.getCurrentUser();
            if (user) {
                this.currentUserId = user.id;
                this.currentUsername = user.name;
                this.currentDisplayName = user.displayName;

                if (!this.browseMode && window.PlaytimeTracker) {
                    this.cachedPlaytimeData = await window.PlaytimeTracker.getPlaytimeDataAsync(placeId, this.universeId);
                    console.log('[ReviewComponent] Playtime data:', this.cachedPlaytimeData);
                }

                if (!this.browseMode && this.universeId && window.roblox?.getUserVote) {
                    try {
                        const voteData = await window.roblox.getUserVote(this.universeId);
                        this.userGameVote = voteData?.userVote;
                        console.log('[ReviewComponent] User game vote:', this.userGameVote);
                    } catch (e) {
                        console.log('[ReviewComponent] Failed to get user vote:', e);
                    }
                }
            }
        } catch (e) {
            console.log('[ReviewComponent] Not logged in');
        }

        await this.checkRovlooAuth();

        this.renderContainer();
        await this.loadReviews(initRequestId);
    },

    async checkRovlooAuth() {
        try {
            const status = await window.roblox.reviews.getAuthStatus();
            this.rovlooAuthenticated = status.authenticated;
            this.rovlooUser = status.user;
            
            if (!this.rovlooAuthenticated && this.currentUserId) {
                const result = await window.roblox.reviews.login();
                if (result.success) {
                    this.rovlooAuthenticated = true;
                    this.rovlooUser = result.user;
                }
            }
        } catch (e) {
            console.log('[ReviewComponent] Rovloo auth check failed:', e);
            this.rovlooAuthenticated = false;
        }
    },

    async handleRovlooLogin() {
        try {
            const result = await window.roblox.reviews.login();
            if (result.success) {
                this.rovlooAuthenticated = true;
                this.rovlooUser = result.user;
                alert('Successfully connected to Rovloo!');
                return true;
            } else {
                alert(result.error || 'Failed to connect to Rovloo');
                return false;
            }
        } catch (e) {
            alert('Failed to connect to Rovloo: ' + e.message);
            return false;
        }
    },

    renderContainer() {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        this.container = container;
        const isInsideTab = container.closest('.tab-content') !== null;
        
        if (isInsideTab || this.browseMode) {
            container.innerHTML = `
                <div class="reviews-section reviews-tab-view">
                    <div class="review-form-container"></div>
                    <div class="reviews-list">
                        <div class="reviews-loading">
                            <img src="../images/spinners/spinner100x100.gif" alt="Loading...">
                            <p>Loading reviews...</p>
                        </div>
                    </div>
                    <div class="reviews-pagination"></div>
                </div>`;
        } else {
            container.innerHTML = `
                <div class="reviews-section">
                    <div class="reviews-header">
                        <img src="../images/rovloo/rovloo-ico64.png" alt="Rovloo" class="rovloo-icon" onerror="this.style.display='none'">
                        <span>Reviews</span>
                        <div class="review-stats"><span class="stats-loading">Loading...</span></div>
                    </div>
                    <div class="reviews-content">
                        <div class="review-form-container"></div>
                        <div class="review-controls">
                            <div class="review-sort"><label>Sort:</label>
                                <select class="review-select review-sort-select">
                                    <option value="quality">Quality</option>
                                    <option value="recent">Newest</option>
                                    <option value="highest-voted">Most Helpful</option>
                                    <option value="most-playtime">Most Playtime</option>
                                </select>
                            </div>
                            <div class="review-filter"><label>Filter:</label>
                                <select class="review-select review-filter-select">
                                    <option value="all">All Reviews</option>
                                    <option value="like">Likes Only</option>
                                    <option value="dislike">Dislikes Only</option>
                                </select>
                            </div>
                        </div>
                        <div class="reviews-list">
                            <div class="reviews-loading">
                                <img src="../images/spinners/spinner100x100.gif" alt="Loading...">
                                <p>Loading reviews...</p>
                            </div>
                        </div>
                        <div class="reviews-pagination"></div>
                    </div>
                </div>`;
        }
        this.setupEventListeners();
    },

    setupEventListeners() {
        if (!this.container) return;
        this.container.querySelector('.review-sort-select')?.addEventListener('change', (e) => {
            this.sortOption = e.target.value;
            this.currentPage = 1;
            this.allReviewsCache = null;
            this.clientSideSort = this.requiresClientSideSort(this.sortOption);
            this.loadReviews();
        });
        this.container.querySelector('.review-filter-select')?.addEventListener('change', (e) => {
            this.filterOption = e.target.value;
            this.currentPage = 1;
            this.allReviewsCache = null;
            this.loadReviews();
        });
    },

    async loadReviews(requestId) {
        const currentRequestId = requestId ?? this._requestId;
        if (this.isLoading) return;
        this.isLoading = true;

        const listContainer = this.container?.querySelector('.reviews-list');
        if (listContainer) {
            listContainer.innerHTML = `<div class="reviews-loading"><img src="../images/spinners/spinner100x100.gif" alt="Loading..."><p>Loading reviews...</p></div>`;
        }

        try {
            let reviewsData = [];
            
            if (this.browseMode) {
                if (this.adminPicksMode) {
                    const picksData = await window.roblox.reviews.getAdminPicks({ limit: this.reviewsPerPage, page: this.currentPage });
                    const picks = picksData.picks || picksData || [];
                    reviewsData = picks.map(p => p.review ? { ...p.review, adminPick: true, pickReason: p.reason } : p);
                    this.totalPages = picksData.totalPages || 1;
                } else if (this.myReviewsMode && this.myReviewsUserId) {
                    const response = await window.roblox.reviews.getAllReviews({ userId: this.myReviewsUserId, limit: this.reviewsPerPage, page: this.currentPage });
                    reviewsData = Array.isArray(response) ? response : (response.reviews || []);
                    this.totalPages = response.totalPages || Math.ceil(reviewsData.length / this.reviewsPerPage) || 1;
                } else if (this.clientSideSort) {

                    if (!this.allReviewsCache) {
                        let allReviews = [], page = 1, totalReviews = Infinity;
                        while (allReviews.length < totalReviews && page <= 100) {
                            const response = await window.roblox.reviews.getAllReviews({
                                search: this.searchQuery,
                                likeStatus: this.filterOption !== 'all' ? this.filterOption : undefined,
                                sort: 'balanced_discovery',
                                limit: 100,
                                page
                            });
                            const chunk = Array.isArray(response) ? response : (response.reviews || []);
                            if (page === 1) totalReviews = response.totalReviews || (chunk.length < 100 ? chunk.length : Infinity);
                            allReviews.push(...chunk);
                            if (chunk.length < 100) break;
                            page++;
                        }

                        if (['most-replies', 'least-replies'].includes(this.sortOption)) {
                            try {
                                const ids = allReviews.map(r => r.id).filter(Boolean);
                                if (ids.length) this.replySummary = this.processReplySummary(await window.roblox.reviews.getReplySummary(ids));
                            } catch (e) {}
                        }
                        this.allReviewsCache = allReviews;
                    }
                    const sorted = this.sortReviewsClientSide([...this.allReviewsCache], this.sortOption);
                    this.totalPages = Math.max(1, Math.ceil(sorted.length / this.reviewsPerPage));
                    reviewsData = sorted.slice((this.currentPage - 1) * this.reviewsPerPage, this.currentPage * this.reviewsPerPage);
                } else {
                    const response = await window.roblox.reviews.getAllReviews({
                        search: this.searchQuery || undefined,
                        likeStatus: this.filterOption !== 'all' ? this.filterOption : undefined,
                        sort: this.sortOption,
                        limit: this.reviewsPerPage,
                        page: this.currentPage
                    });
                    reviewsData = Array.isArray(response) ? response : (response.reviews || []);
                    this.totalPages = response.totalPages || 1;
                }
            } else {

                console.log('[ReviewComponent] Loading game-specific reviews for placeId:', this.placeId);
                
                const [stats, reviewsResponse] = await Promise.all([
                    window.roblox.reviews.getStats(this.placeId).catch((e) => {
                        console.log('[ReviewComponent] getStats failed:', e);
                        return null;
                    }),
                    window.roblox.reviews.getReviews(this.placeId, {
                        sort: this.sortOption,
                        likeStatus: this.filterOption !== 'all' ? this.filterOption : undefined,
                        limit: this.reviewsPerPage,
                        offset: (this.currentPage - 1) * this.reviewsPerPage
                    }).catch((e) => {
                        console.error('[ReviewComponent] getReviews failed:', e);
                        return [];
                    })
                ]);
                
                console.log('[ReviewComponent] Stats response:', stats);
                console.log('[ReviewComponent] Reviews response:', reviewsResponse, 'type:', typeof reviewsResponse, 'isArray:', Array.isArray(reviewsResponse));

                if (Array.isArray(reviewsResponse)) {
                    reviewsData = reviewsResponse;
                } else if (reviewsResponse && typeof reviewsResponse === 'object') {
                    reviewsData = reviewsResponse.reviews || reviewsResponse.data || [];
                } else {
                    reviewsData = [];
                }
                
                console.log('[ReviewComponent] Parsed reviewsData:', reviewsData.length, 'reviews');
                
                this.gameStats = stats;
                const totalReviews = stats?.totalReviews || reviewsData.length;
                this.totalPages = Math.max(1, Math.ceil(totalReviews / this.reviewsPerPage));
            }

            if (currentRequestId !== this._requestId) return;
            this.reviews = reviewsData;

            if (this.reviews.length) {
                const authorIds = [...new Set(this.reviews.map(r => r.author?.userId).filter(Boolean))];
                const ratings = await Promise.all(authorIds.map(id => window.roblox.reviews.getUserRating(id).catch(() => null)));
                const ratingMap = {};
                authorIds.forEach((id, i) => { if (ratings[i]) ratingMap[id] = ratings[i]; });
                this.reviews.forEach(r => { if (r.author?.userId && ratingMap[r.author.userId]) r.author.rating = ratingMap[r.author.userId]; });
            }

            if (this.reviews.length) {
                try {
                    const ids = this.reviews.map(r => r.id).filter(Boolean);
                    if (ids.length) this.replySummary = this.processReplySummary(await window.roblox.reviews.getReplySummary(ids));
                } catch (e) {}
            }

            if (this.currentUserId && this.reviews.length) {
                await this.fetchUserVotes();
            }

            if (!this.browseMode && this.currentUserId) {
                this.userReview = this.reviews.find(r => r.author?.userId === this.currentUserId) || null;
                if (!this.userReview) {
                    try {
                        this.userReview = await window.roblox.reviews.getUserReview(this.placeId, this.currentUserId);
                    } catch (e) {}
                }
            }

            if (!this.browseMode) {
                this.renderStats();
                this.renderReviewForm();
            }
            this.renderReviewsList();
            this.renderPagination();
            this.refreshExpiredAvatars();
            this.refreshDonorBadges();
            
            if (this.browseMode && !this.adminPicksMode && !this.myReviewsMode) {
                this.updateReviewsTabCount();
            }
        } catch (error) {
            console.error('[ReviewComponent] Failed to load reviews:', error);
            if (listContainer) listContainer.innerHTML = `<div class="reviews-error">Failed to load reviews: ${error.message}</div>`;
        } finally {
            this.isLoading = false;
        }
    },

    renderReviewForm() {
        const formContainer = this.container?.querySelector('.review-form-container');
        if (!formContainer) return;

        if (!this.currentUserId) {
            formContainer.innerHTML = `
                <div class="review-form-login">
                    <p>Log in to Roblox to write a review</p>
                </div>`;
            return;
        }

        if (!this.rovlooAuthenticated) {
            formContainer.innerHTML = `
                <div class="review-form-login rovloo-login">
                    <img src="../images/rovloo/rovloo-ico64.png" alt="Rovloo" class="rovloo-login-icon" onerror="this.style.display='none'">
                    <p>Connect to Rovloo to write reviews and vote</p>
                    <button class="btn-control rovloo-login-btn" onclick="ReviewComponent.handleRovlooLogin()">
                        <img src="../images/rovloo/rovloo-ico64.png" alt="" class="btn-icon" onerror="this.style.display='none'">
                        Connect to Rovloo
                    </button>
                    <p class="rovloo-info">This will authenticate you with Rovloo using your Roblox account</p>
                    <div id="formError" class="form-error" style="display: none;"></div>
                    <div id="formMessage" class="form-message" style="display: none;"></div>
                </div>`;
            return;
        }

        const playtimeData = this.cachedPlaytimeData || { totalMinutes: 0, formattedPlaytime: '< 1m' };
        const playtimeFormatted = playtimeData.formattedPlaytime || this.formatPlaytime(playtimeData.totalMinutes || 0);

        if (this.userReview) {
            formContainer.innerHTML = `
                <div class="review-form existing-review">
                    <div class="form-header">
                        <span class="review-submitted-badge">✓ Review Submitted</span>
                        <span class="playtime-badge">
                            <img src="../images/rovloo/playtime-indicator.png" alt="Playtime" class="playtime-icon" onerror="this.style.display='none'">
                            ${playtimeFormatted}
                        </span>
                    </div>
                    <div class="your-review-content">
                        <div class="like-status ${this.userReview.likeStatus}">
                            <img src="../images/rovloo/btn-thumbs${this.userReview.likeStatus === 'like' ? 'up' : 'down'}.png" alt="${this.userReview.likeStatus}">
                            ${this.userReview.likeStatus === 'like' ? 'Recommended' : 'Not Recommended'}
                        </div>
                        ${this.userReview.text ? `<p class="review-text-preview">${this.formatMarkdown(this.userReview.text)}</p>` : '<p class="no-text">(No written review)</p>'}
                    </div>
                    <div class="form-actions">
                        <button class="btn-control" onclick="ReviewComponent.showEditForm()">Edit Review</button>
                        <button class="btn-control delete-btn" onclick="ReviewComponent.handleDelete('${this.userReview.id}')">Delete</button>
                    </div>
                </div>`;
            return;
        }

        const hasVoted = this.userGameVote !== null && this.userGameVote !== undefined;
        const likeStatus = this.userGameVote === true ? 'like' : (this.userGameVote === false ? 'dislike' : null);
        const voteText = likeStatus === 'like' ? 'Recommended' : (likeStatus === 'dislike' ? 'Not Recommended' : 'Not Voted');
        this.selectedLikeStatus = likeStatus;

        if (!hasVoted) {
            formContainer.innerHTML = `
                <div class="review-form new-review">
                    <div class="form-header">
                        <span class="playtime-badge">
                            <img src="../images/rovloo/playtime-indicator.png" alt="Playtime" class="playtime-icon" onerror="this.style.display='none'">
                            ${playtimeFormatted}
                        </span>
                    </div>
                    <div class="review-form-content">
                        <div class="vote-required-message">
                            <img src="../images/rovloo/btn-thumbsup.png" alt="Vote" class="vote-icon">
                            <p>You need to <strong>like or dislike</strong> this game before writing a review.</p>
                            <p class="vote-hint">Use the thumbs up/down buttons above to vote on this game first.</p>
                        </div>
                    </div>
                </div>`;
            return;
        }

        formContainer.innerHTML = `
            <div class="review-form new-review">
                <div class="form-header">
                    <span class="write-review-label">Write a Review</span>
                    <span class="playtime-badge">
                        <img src="../images/rovloo/playtime-indicator.png" alt="Playtime" class="playtime-icon" onerror="this.style.display='none'">
                        ${playtimeFormatted}
                    </span>
                </div>
                <div class="review-form-content" id="reviewFormContent">
                    <div class="vote-status-display ${likeStatus}">
                        <img src="../images/rovloo/btn-thumbs${likeStatus === 'like' ? 'up' : 'down'}.png" alt="${likeStatus}">
                        <span>${voteText}</span>
                        <span class="vote-source">(based on your Roblox vote)</span>
                    </div>
                    <textarea id="reviewText" class="review-textarea" maxlength="1000" placeholder="Write your review (optional, max 1000 characters)..."></textarea>
                    <div class="char-count"><span id="charCount">0</span>/1000</div>
                    <div class="form-actions">
                        <button class="btn-control submit-btn" id="submitReviewBtn" onclick="ReviewComponent.submitReview()">Submit Review</button>
                    </div>
                    <div id="formError" class="form-error" style="display: none;"></div>
                    <div id="formMessage" class="form-message" style="display: none;"></div>
                </div>
            </div>`;

        const textarea = document.getElementById('reviewText');
        const charCount = document.getElementById('charCount');
        if (textarea && charCount) {
            textarea.addEventListener('input', () => {
                charCount.textContent = textarea.value.length;
            });
        }
    },

    showEditForm() {
        if (!this.userReview) return;
        const formContainer = this.container?.querySelector('.review-form-container');
        if (!formContainer) return;

        const playtimeData = this.cachedPlaytimeData || { totalMinutes: 0, formattedPlaytime: '< 1m' };
        const playtimeFormatted = playtimeData.formattedPlaytime || this.formatPlaytime(playtimeData.totalMinutes || 0);
        const likeStatus = this.userGameVote === true ? 'like' : (this.userGameVote === false ? 'dislike' : this.userReview.likeStatus);
        const voteText = likeStatus === 'like' ? 'Recommended' : 'Not Recommended';
        this.selectedLikeStatus = likeStatus;

        formContainer.innerHTML = `
            <div class="review-form edit-review">
                <div class="form-header">
                    <span class="edit-review-label">Edit Your Review</span>
                    <span class="playtime-badge">
                        <img src="../images/rovloo/playtime-indicator.png" alt="Playtime" class="playtime-icon" onerror="this.style.display='none'">
                        ${playtimeFormatted}
                    </span>
                </div>
                <div class="vote-status-display ${likeStatus}">
                    <img src="../images/rovloo/btn-thumbs${likeStatus === 'like' ? 'up' : 'down'}.png" alt="${likeStatus}">
                    <span>${voteText}</span>
                    <span class="vote-source">(based on your Roblox vote)</span>
                </div>
                <textarea id="reviewText" class="review-textarea" maxlength="1000" placeholder="Write your review...">${this.escapeHtml(this.userReview.text || '')}</textarea>
                <div class="char-count"><span id="charCount">${(this.userReview.text || '').length}</span>/1000</div>
                <div class="form-actions">
                    <button class="btn-control submit-btn" onclick="ReviewComponent.updateReview()">Update Review</button>
                    <button class="btn-control cancel-btn" onclick="ReviewComponent.renderReviewForm()">Cancel</button>
                </div>
                <div id="formError" class="form-error" style="display: none;"></div>
            </div>`;

        const textarea = document.getElementById('reviewText');
        const charCount = document.getElementById('charCount');
        if (textarea && charCount) {
            textarea.addEventListener('input', () => {
                charCount.textContent = textarea.value.length;
            });
        }
    },

    async submitReview() {
        if (this.isSubmitting || !this.selectedLikeStatus) return;
        if (!this.rovlooAuthenticated) {
            this.showFormError('Please connect to Rovloo first');
            return;
        }
        
        // Check if user already has a review (prevent duplicates)
        if (this.userReview) {
            this.showFormError('You already have a review for this game. Please edit your existing review instead.');
            return;
        }

        const submitBtn = document.getElementById('submitReviewBtn');
        const textarea = document.getElementById('reviewText');
        const text = textarea?.value?.trim() || '';

        if (text.length > 1000) {
            this.showFormError('Review text must be 1000 characters or less');
            return;
        }

        this.isSubmitting = true;
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';
        }

        try {
            const playtimeData = window.roblox?.playtime ? 
                await window.roblox.playtime.getPlaytimeData(this.currentUserId, this.placeId) : { totalMinutes: 0 };

            const reviewData = {
                likeStatus: this.selectedLikeStatus,
                text: text || '',
                playtimeData: playtimeData,
                author: {
                    userId: this.currentUserId,
                    username: this.currentUsername,
                    displayName: this.currentDisplayName || this.currentUsername
                }
            };

            await window.roblox.reviews.create(this.placeId, reviewData);

            if (window.roblox?.playtime && playtimeData.totalMinutes > 0) {
                await window.roblox.playtime.markSynced(this.currentUserId, this.placeId);
            }

            this.showFormMessage('Review submitted successfully!', 'success');
            await this.loadReviews();

            if (typeof window.loadRovlooStats === 'function') {
                window.loadRovlooStats(this.placeId);
            }

        } catch (error) {
            console.error('Failed to submit review:', error);
            if (error.message?.includes('authentication') || error.message?.includes('login')) {
                this.rovlooAuthenticated = false;
                this.showFormError('Session expired. Please connect to Rovloo again.');
                this.renderReviewForm();
            } else {
                this.showFormError(error.message || 'Failed to submit review. Please try again.');
            }
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit Review';
            }
        } finally {
            this.isSubmitting = false;
        }
    },

    async updateReview() {
        if (this.isSubmitting || !this.userReview) return;
        if (!this.rovlooAuthenticated) {
            this.showFormError('Please connect to Rovloo first');
            return;
        }

        const textarea = document.getElementById('reviewText');
        const text = textarea?.value?.trim() || '';

        if (text.length > 1000) {
            this.showFormError('Review text must be 1000 characters or less');
            return;
        }

        this.isSubmitting = true;

        try {
            const playtimeData = window.PlaytimeTracker ? 
                await window.PlaytimeTracker.getPlaytimeDataAsync(this.placeId, this.universeId) : { totalMinutes: 0 };

            const reviewData = {
                gameId: this.placeId,
                likeStatus: this.selectedLikeStatus || this.userReview.likeStatus,
                text: text || null,
                playtimeData: playtimeData
            };

            await window.roblox.reviews.update(this.userReview.id, reviewData);

            if (window.PlaytimeTracker && playtimeData.totalMinutes > 0) {
                await window.PlaytimeTracker.markPlaytimeSynced(this.placeId);
            }

            await this.loadReviews();

            if (typeof window.loadRovlooStats === 'function') {
                window.loadRovlooStats(this.placeId);
            }

        } catch (error) {
            console.error('Failed to update review:', error);
            if (error.message?.includes('authentication') || error.message?.includes('login')) {
                this.rovlooAuthenticated = false;
                this.showFormError('Session expired. Please connect to Rovloo again.');
                this.renderReviewForm();
            } else {
                this.showFormError(error.message || 'Failed to update review. Please try again.');
            }
        } finally {
            this.isSubmitting = false;
        }
    },

    showFormError(message) {
        const errorDiv = document.getElementById('formError');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            setTimeout(() => { errorDiv.style.display = 'none'; }, 5000);
        }
    },

    showFormMessage(message, type = 'info') {
        const messageDiv = document.getElementById('formMessage');
        if (messageDiv) {
            messageDiv.textContent = message;
            messageDiv.className = `form-message ${type}`;
            messageDiv.style.display = 'block';
            setTimeout(() => { messageDiv.style.display = 'none'; }, 3000);
        }
    },

    async fetchUserVotes() {

        try {
            const reviewIds = this.reviews.map(r => r.id).filter(Boolean);
            if (reviewIds.length && window.roblox.reviews.getUserVotes) {
                const votes = await window.roblox.reviews.getUserVotes(reviewIds);
                if (votes) {
                    Object.entries(votes).forEach(([reviewId, vote]) => {
                        this.userVoteCache[reviewId] = vote;
                    });
                }
            }
        } catch (e) {
            console.log('[ReviewComponent] Could not fetch user votes:', e);
        }
    },

    async handleVote(reviewId, voteType) {
        console.log('[ReviewComponent] handleVote:', reviewId, voteType);
        
        if (!this.currentUserId) {
            alert('Please log in to vote on reviews.');
            return;
        }

        if (!this.rovlooAuthenticated) {
            const connected = await this.handleRovlooLogin();
            if (!connected) return;
        }

        const review = this.reviews.find(r => r.id === reviewId);
        if (!review) return;

        if (review.author?.userId === this.currentUserId) {
            alert('You cannot vote on your own review.');
            return;
        }

        if (!review.voteStats) {
            review.voteStats = { upvotes: 0, downvotes: 0, score: 0 };
        }

        const key = String(reviewId);
        const currentVote = this.userVoteCache[key] ?? review.userVote ?? null;

        const oldVote = currentVote;
        const oldStats = { ...review.voteStats };

        try {
            if (currentVote === voteType) {

                this.userVoteCache[key] = null;
                review.userVote = null;
                if (voteType === 'upvote') {
                    review.voteStats.upvotes = Math.max(0, review.voteStats.upvotes - 1);
                } else {
                    review.voteStats.downvotes = Math.max(0, review.voteStats.downvotes - 1);
                }
                await window.roblox.reviews.removeVote(reviewId);
            } else {

                if (currentVote) {

                    if (currentVote === 'upvote') {
                        review.voteStats.upvotes = Math.max(0, review.voteStats.upvotes - 1);
                    } else {
                        review.voteStats.downvotes = Math.max(0, review.voteStats.downvotes - 1);
                    }
                }

                this.userVoteCache[key] = voteType;
                review.userVote = voteType;
                if (voteType === 'upvote') {
                    review.voteStats.upvotes++;
                } else {
                    review.voteStats.downvotes++;
                }
                await window.roblox.reviews.vote(reviewId, voteType);
            }

            review.voteStats.score = review.voteStats.upvotes - review.voteStats.downvotes;

            this.updateReviewVoteUI(reviewId);

        } catch (error) {
            console.error('[ReviewComponent] Vote failed:', error);

            this.userVoteCache[key] = oldVote;
            review.userVote = oldVote;
            review.voteStats = oldStats;
            this.updateReviewVoteUI(reviewId);
            
            if (error.message?.includes('authentication') || error.message?.includes('login')) {
                this.rovlooAuthenticated = false;
                alert('Session expired. Please try again.');
            } else {
                alert('Failed to vote: ' + (error.message || 'Unknown error'));
            }
        }
    },

    updateReviewVoteUI(reviewId) {
        const review = this.reviews.find(r => r.id === reviewId);
        if (!review) return;

        const reviewEl = this.container?.querySelector(`.review-item[data-review-id="${reviewId}"]`);
        if (!reviewEl) return;

        const upvotes = review.voteStats?.upvotes || 0;
        const downvotes = review.voteStats?.downvotes || 0;
        const voteScore = upvotes - downvotes;
        const userVote = this.userVoteCache[String(reviewId)] ?? review.userVote ?? null;

        const upvoteBtn = reviewEl.querySelector('.vote-btn.upvote');
        if (upvoteBtn) {
            upvoteBtn.classList.toggle('voted', userVote === 'upvote');
            upvoteBtn.querySelector('span').textContent = upvotes;
        }

        const downvoteBtn = reviewEl.querySelector('.vote-btn.downvote');
        if (downvoteBtn) {
            downvoteBtn.classList.toggle('voted', userVote === 'downvote');
            downvoteBtn.querySelector('span').textContent = downvotes;
        }

        const scoreEl = reviewEl.querySelector('.vote-score');
        if (scoreEl) {
            scoreEl.textContent = `Score: ${voteScore > 0 ? '+' : ''}${voteScore}`;
            scoreEl.className = 'vote-score ' + (voteScore > 0 ? 'positive' : voteScore < 0 ? 'negative' : 'neutral');
        }
    },

    processReplySummary(summary) {
        const processed = {};
        if (Array.isArray(summary)) {
            summary.forEach(item => { if (item?.reviewId !== undefined) processed[String(item.reviewId)] = { count: item.count }; });
        } else if (summary && typeof summary === 'object') {
            for (const [id, val] of Object.entries(summary)) {
                processed[id] = typeof val === 'number' ? { count: val } : (val?.count !== undefined ? val : { count: 0 });
            }
        }
        return processed;
    },

    async updateReviewsTabCount() {
        try {
            const response = await window.roblox.reviews.getAllReviews({ limit: 1 });
            const countEl = document.getElementById('totalReviewsCount');
            if (countEl) countEl.textContent = (response.totalReviews || 0).toLocaleString();
        } catch (e) {}
    },

    getAvatarUrl(avatarUrl, userId) {
        if (userId && this.avatarCache.has(userId)) return this.avatarCache.get(userId);
        if (avatarUrl && !avatarUrl.includes('30DAY-AvatarHeadshot')) return avatarUrl;
        return '../images/spinners/spinner100x100.gif';
    },

    async refreshExpiredAvatars() {
        if (!window.roblox?.getUserThumbnails) return;
        const avatarImages = this.container?.querySelectorAll('.author-avatar, .reply-avatar') || [];
        const userIdsToFetch = new Set();
        const imagesByUserId = new Map();
        avatarImages.forEach(img => {
            const authorLink = img.closest('.author-link') || img.closest('.reply-author-link');
            if (!authorLink) return;
            const match = (authorLink.getAttribute('href') || '').match(/id=(\d+)/);
            if (!match) return;
            const userId = parseInt(match[1]);
            const src = img.getAttribute('src') || '';
            if (src.includes('spinner') || src.includes('30DAY-AvatarHeadshot')) {
                userIdsToFetch.add(userId);
                if (!imagesByUserId.has(userId)) imagesByUserId.set(userId, []);
                imagesByUserId.get(userId).push(img);
            }
        });
        if (userIdsToFetch.size === 0) return;
        try {
            const result = await window.roblox.getUserThumbnails(Array.from(userIdsToFetch), '150x150', 'Headshot');
            if (result?.data) {
                result.data.forEach(item => {
                    if (item.imageUrl && item.targetId) {
                        this.avatarCache.set(item.targetId, item.imageUrl);
                        imagesByUserId.get(item.targetId)?.forEach(img => img.src = item.imageUrl);
                    }
                });
            }
        } catch (e) {}
    },

    async checkDonorStatus(userId) {
        if (!userId) return false;
        const key = String(userId);
        if (this.donorStatusCache.hasOwnProperty(key)) return this.donorStatusCache[key];
        try {
            const result = await window.roblox.userOwnsItem(userId, 'Asset', this.DONOR_ITEM_ID);
            this.donorStatusCache[key] = result?.data?.length > 0;
        } catch (e) { this.donorStatusCache[key] = false; }
        return this.donorStatusCache[key];
    },

    async refreshDonorBadges() {
        if (!this.container) return;
        const userIds = [...new Set(this.reviews.map(r => r.author?.userId).filter(Boolean))];
        if (!userIds.length) return;
        for (const userId of userIds.slice(0, 20)) {
            await this.checkDonorStatus(userId);
        }
        this.reviews.forEach(review => {
            const userId = review.author?.userId;
            if (!userId || !this.donorStatusCache[String(userId)]) return;
            const reviewItem = this.container.querySelector(`.review-item[data-review-id="${review.id}"]`);
            const nameRow = reviewItem?.querySelector('.author-name-row');
            if (!nameRow || nameRow.querySelector('.donor-badge')) return;
            const authorName = nameRow.querySelector('.author-name');
            if (authorName) {
                authorName.insertAdjacentHTML('afterend', 
                    `<a href="item.html?id=86478952287791" class="author-badge donor-badge" title="Supporter"><img src="../images/rovloo/donate128.png" alt="Supporter"></a>`);
            }
        });
    },

    sortReviewsClientSide(reviews, sortOption) {
        switch (sortOption) {
            case 'quality':
            case 'balanced_discovery':
                return reviews.sort((a, b) => this.calculateEngagementScore(b) - this.calculateEngagementScore(a));
            case 'highest-voted':
                return reviews.sort((a, b) => {
                    const scoreA = (a.voteStats?.upvotes ?? 0) - (a.voteStats?.downvotes ?? 0);
                    const scoreB = (b.voteStats?.upvotes ?? 0) - (b.voteStats?.downvotes ?? 0);
                    return scoreB - scoreA || new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
                });
            case 'lowest-voted':
                return reviews.sort((a, b) => {
                    const scoreA = (a.voteStats?.upvotes ?? 0) - (a.voteStats?.downvotes ?? 0);
                    const scoreB = (b.voteStats?.upvotes ?? 0) - (b.voteStats?.downvotes ?? 0);
                    return scoreA - scoreB || new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
                });
            case 'most-replies':
                return reviews.sort((a, b) => {
                    const repliesA = this.replySummary[String(a.id)]?.count ?? a.replyCount ?? 0;
                    const repliesB = this.replySummary[String(b.id)]?.count ?? b.replyCount ?? 0;
                    return repliesB - repliesA;
                });
            case 'least-replies':
                return reviews.sort((a, b) => {
                    const repliesA = this.replySummary[String(a.id)]?.count ?? a.replyCount ?? 0;
                    const repliesB = this.replySummary[String(b.id)]?.count ?? b.replyCount ?? 0;
                    return repliesA - repliesB;
                });
            case 'most-playtime':
                return reviews.sort((a, b) => (b.playtimeData?.totalMinutes ?? 0) - (a.playtimeData?.totalMinutes ?? 0));
            case 'least-playtime':
                return reviews.sort((a, b) => (a.playtimeData?.totalMinutes ?? 0) - (b.playtimeData?.totalMinutes ?? 0));
            case 'highest-rated-user':
                return reviews.sort((a, b) => (b.author?.rating?.totalScore ?? 0) - (a.author?.rating?.totalScore ?? 0));
            case 'lowest-rated-user':
                return reviews.sort((a, b) => (a.author?.rating?.totalScore ?? 0) - (b.author?.rating?.totalScore ?? 0));
            case 'oldest':
                return reviews.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
            case 'game':
                return reviews.sort((a, b) => (a.game?.name || '').localeCompare(b.game?.name || ''));
            case 'most_visits':
                return reviews.sort((a, b) => (b.game?.visits || 0) - (a.game?.visits || 0));
            case 'least_visits':
                return reviews.sort((a, b) => (a.game?.visits || 0) - (b.game?.visits || 0));
            case 'underrated':
                return reviews.filter(r => (r.game?.playing || 0) < 1000).sort((a, b) => this.calculateEngagementScore(b) - this.calculateEngagementScore(a));
            case 'hidden_gems':
                return reviews.sort((a, b) => {
                    const aHidden = (a.game?.visits || 0) < 10000;
                    const bHidden = (b.game?.visits || 0) < 10000;
                    if (aHidden !== bHidden) return aHidden ? -1 : 1;
                    return this.calculateEngagementScore(b) - this.calculateEngagementScore(a);
                });
            case 'trending':
                return reviews.sort((a, b) => {
                    const aRising = (a.game?.visits || 0) >= 1000 && (a.game?.visits || 0) <= 100000;
                    const bRising = (b.game?.visits || 0) >= 1000 && (b.game?.visits || 0) <= 100000;
                    if (aRising !== bRising) return aRising ? -1 : 1;
                    return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
                });
            default: 
                return reviews.sort((a, b) => new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0));
        }
    },

    calculateEngagementScore(review) {
        const daysOld = (Date.now() - new Date(review.timestamp || 0).getTime()) / (1000 * 60 * 60 * 24);
        const baseScore = review.discoveryScore || 1;
        const lengthMultiplier = Math.min(1 + ((review.text?.length || 0) / 300), 2.0);
        const voteCount = (review.voteStats?.upvotes ?? 0) + (review.voteStats?.downvotes ?? 0);
        const interactionMultiplier = 1 + Math.min(voteCount / 20, 1.5);
        const freshnessMultiplier = Math.max(0.3, 1 - (daysOld / 14));
        return baseScore * lengthMultiplier * interactionMultiplier * freshnessMultiplier;
    },

    renderStats() {
        if (this.browseMode || !this.gameStats) return;
        const statsEl = this.container?.querySelector('.review-stats');
        if (!statsEl) return;
        const { likes = 0, dislikes = 0, totalReviews = 0 } = this.gameStats;
        const total = likes + dislikes;
        const likePercent = total > 0 ? Math.round((likes / total) * 100) : 0;
        statsEl.innerHTML = `
            <span class="stat-item"><img src="../images/rovloo/btn-thumbsup.png" alt="Likes" class="stat-icon"> ${likes}</span>
            <span class="stat-item"><img src="../images/rovloo/btn-thumbsdown.png" alt="Dislikes" class="stat-icon"> ${dislikes}</span>
            <span class="stat-item">${totalReviews} reviews</span>
            ${total > 0 ? `<span class="stat-item">${likePercent}% positive</span>` : ''}`;
    },

    renderReviewsList() {
        const listContainer = this.container?.querySelector('.reviews-list');
        if (!listContainer) return;
        if (!this.reviews?.length) {
            listContainer.innerHTML = '<div class="no-reviews">No reviews yet. Be the first to review!</div>';
            return;
        }
        listContainer.innerHTML = this.reviews.map(review => this.renderReviewItem(review)).join('');
        if (this.browseMode) this.lazyLoadGameThumbnails();
    },

    renderReviewItem(review) {
        const author = review.author || {};
        const authorName = author.displayName || author.username || 'Unknown';
        const authorId = author.userId || author.id || 0;
        const avatarUrl = this.getAvatarUrl(author.avatarUrl, authorId);
        const isLike = review.likeStatus === 'like' || review.isLike === true;
        const thumbIcon = isLike ? 'btn-thumbsup.png' : 'btn-thumbsdown.png';
        const createdDate = this.formatDate(review.createdAt || review.created || review.timestamp);
        const editedDate = review.editedTimestamp ? this.formatDate(review.editedTimestamp) : '';
        const replyCount = this.replySummary[String(review.id)]?.count ?? review.replyCount ?? 0;
        const isExpanded = this.expandedReplies.has(review.id);
        const isOwnReview = authorId === this.currentUserId;

        const upvotes = review.voteStats?.upvotes || 0;
        const downvotes = review.voteStats?.downvotes || 0;
        const voteScore = upvotes - downvotes;
        const scoreClass = voteScore > 0 ? 'positive' : voteScore < 0 ? 'negative' : 'neutral';
        const userVote = this.userVoteCache[String(review.id)] ?? review.userVote ?? null;

        const authorRating = author.rating;
        const authorScore = authorRating?.totalScore ?? 0;
        const authorScoreClass = authorScore > 0 ? 'positive' : authorScore < 0 ? 'negative' : 'neutral';
        const authorScoreText = authorScore > 0 ? `+${authorScore}` : authorScore.toString();

        const badges = author.badges || [];
        const isAdmin = author.isAdmin || badges.some(b => b.id === 'admin');
        const isDonor = author.isDonor || badges.some(b => b.id === 'donation') || this.donorStatusCache[String(authorId)];
        let badgesHtml = '';
        if (isDonor) badgesHtml += `<a href="item.html?id=86478952287791" class="author-badge donor-badge" title="Supporter"><img src="../images/rovloo/donate128.png" alt="Supporter"></a>`;
        if (isAdmin) badgesHtml += `<span class="author-badge admin-badge" title="Administrator"><img src="../images/rovloo/admin64.png" alt="Admin"></span>`;

        const playtimeMinutes = review.playtimeData?.totalMinutes || review.playtimeMinutes || 0;
        const playtimeFormatted = this.formatPlaytime(playtimeMinutes);

        let reviewTextHtml = '';
        if (review.text) {
            const MAX_LENGTH = 300;
            if (review.text.length > MAX_LENGTH) {
                const truncateAt = Math.min(MAX_LENGTH, review.text.lastIndexOf(' ', MAX_LENGTH) > MAX_LENGTH * 0.7 ? review.text.lastIndexOf(' ', MAX_LENGTH) : MAX_LENGTH);
                const truncatedRaw = review.text.substring(0, truncateAt).trim();
                let truncatedFormatted = this.formatMarkdown(truncatedRaw);

                truncatedFormatted = truncatedFormatted.replace(/(<br\s*\/?>)+$/gi, '');
                const fullFormatted = this.formatMarkdown(review.text);
                reviewTextHtml = `<div class="review-text">
                    <span class="review-text-short" id="review-text-short-${review.id}">${truncatedFormatted}</span>
                    <span class="review-ellipsis" id="review-ellipsis-${review.id}">...</span>
                    <span class="review-text-full" id="review-text-full-${review.id}" style="display: none;">${fullFormatted}</span>
                    <button class="show-more-btn" onclick="ReviewComponent.toggleReviewText('${review.id}')">
                        <span class="show-more-text">Show More</span>
                        <span class="show-less-text" style="display: none;">Show Less</span>
                    </button>
                </div>`;
            } else {
                reviewTextHtml = `<div class="review-text">${this.formatMarkdown(review.text)}</div>`;
            }
        }

        let gameInfo = '';
        if (this.browseMode && review.game) {
            const game = review.game;
            const gameId = game.gameId || game.id || review.gameId;
            const universeId = game.universeId || game.id;
            let thumbUrl = game.thumbnailUrl?.includes('rbxcdn.com') ? game.thumbnailUrl : '../images/spinners/spinner100x100.gif';
            const needsLazy = !game.thumbnailUrl?.includes('rbxcdn.com');
            gameInfo = `
                <div class="game-info-inline">
                    <a href="game-detail.html?placeId=${gameId}" class="game-link-inline">
                        <img src="${thumbUrl}" alt="${this.escapeHtml(game.name || 'Game')}" class="game-thumbnail-inline" 
                             ${needsLazy ? `data-universe-id="${universeId}" data-needs-thumbnail="true"` : ''} onerror="this.src='../images/spinners/spinner100x100.gif'">
                    </a>
                    <div class="game-details-inline">
                        <a href="game-detail.html?placeId=${gameId}" class="game-name-link">${this.escapeHtml(game.name || 'Unknown Game')}</a>
                        <div class="game-stats-inline">
                            ${game.playing ? `<span>👥 ${game.playing.toLocaleString()}</span>` : ''}
                            ${game.visits ? `<span>👁️ ${game.visits.toLocaleString()}</span>` : ''}
                        </div>
                    </div>
                </div>`;
        }

        const voteDisabled = !this.currentUserId || isOwnReview;
        const voteTitle = !this.currentUserId ? 'Log in to vote' : isOwnReview ? 'Cannot vote on own review' : '';

        return `
            <div class="review-item ${isOwnReview ? 'own-review' : ''} ${this.browseMode ? 'browse-mode' : ''}" data-review-id="${review.id}">
                <div class="review-header">
                    ${gameInfo}
                    <a href="profile.html?id=${authorId}" class="author-link">
                        <img src="${avatarUrl}" alt="${authorName}" class="author-avatar" onerror="this.src='../images/spinners/spinner100x100.gif'">
                    </a>
                    <div class="author-info">
                        <div class="author-name-row">
                            <a href="profile.html?id=${authorId}" class="author-name">${this.escapeHtml(authorName)}</a>
                            ${badgesHtml}
                            <span class="author-score ${authorScoreClass}" title="Rovloo Score">${authorScoreText}</span>
                        </div>
                        <span class="author-username">@${this.escapeHtml(author.username || 'unknown')}</span>
                    </div>
                    <div class="review-meta">
                        <span class="like-indicator ${review.likeStatus}">
                            <img src="../images/rovloo/${thumbIcon}" alt="${review.likeStatus}">
                            ${isLike ? 'Recommended' : 'Not Recommended'}
                        </span>
                        <span class="playtime-badge">
                            <img src="../images/rovloo/playtime-indicator.png" alt="Playtime" class="playtime-icon">
                            ${playtimeFormatted}
                        </span>
                        <span class="review-date">${createdDate}</span>
                        ${editedDate ? `<span class="edited-indicator">(edited ${editedDate})</span>` : ''}
                    </div>
                </div>
                ${reviewTextHtml}
                <div class="review-footer">
                    <div class="vote-buttons">
                        <button class="vote-btn upvote ${userVote === 'upvote' ? 'voted' : ''}" 
                                onclick="ReviewComponent.handleVote('${review.id}', 'upvote')" 
                                ${voteDisabled ? 'disabled' : ''} title="${voteTitle}">
                            <img src="../images/rovloo/btn-thumbsup.png" alt="Helpful">
                            <span>${upvotes}</span>
                        </button>
                        <button class="vote-btn downvote ${userVote === 'downvote' ? 'voted' : ''}" 
                                onclick="ReviewComponent.handleVote('${review.id}', 'downvote')" 
                                ${voteDisabled ? 'disabled' : ''} title="${voteTitle}">
                            <img src="../images/rovloo/btn-thumbsdown.png" alt="Not Helpful">
                            <span>${downvotes}</span>
                        </button>
                        <span class="vote-score ${scoreClass}">Score: ${voteScore > 0 ? '+' : ''}${voteScore}</span>
                    </div>
                    <div class="reply-section">
                        <button class="reply-toggle-btn ${isExpanded ? 'expanded' : ''}" onclick="ReviewComponent.toggleReplies('${review.id}')" data-review-id="${review.id}">
                            <span class="reply-icon">💬</span> Replies (<span class="reply-count">${replyCount}</span>) <span class="toggle-arrow">${isExpanded ? '▲' : '▼'}</span>
                        </button>
                        ${isOwnReview ? `
                            <button class="edit-review-btn-inline" onclick="ReviewComponent.showInlineEditForm('${review.id}')">Edit</button>
                            <button class="delete-review-btn-inline" onclick="ReviewComponent.handleDelete('${review.id}', '${review.gameId || review.game?.id || ''}')">Delete</button>
                        ` : ''}
                    </div>
                </div>
                <div class="replies-thread" data-review-id="${review.id}" style="display: ${isExpanded ? 'block' : 'none'};">
                    ${isExpanded ? '<div class="replies-loading">Loading replies...</div>' : ''}
                </div>
            </div>`;
    },

    toggleReviewText(reviewId) {
        const scope = this.container || document;
        const shortText = scope.querySelector(`#review-text-short-${reviewId}`);
        const fullText = scope.querySelector(`#review-text-full-${reviewId}`);
        const ellipsis = scope.querySelector(`#review-ellipsis-${reviewId}`);
        const btn = event.target.closest('.show-more-btn');
        if (!shortText || !fullText || !btn) return;
        const showMore = btn.querySelector('.show-more-text');
        const showLess = btn.querySelector('.show-less-text');
        const isExpanded = fullText.style.display !== 'none';
        shortText.style.display = isExpanded ? 'inline' : 'none';
        if (ellipsis) ellipsis.style.display = isExpanded ? 'inline' : 'none';
        fullText.style.display = isExpanded ? 'none' : 'inline';
        showMore.style.display = isExpanded ? 'inline' : 'none';
        showLess.style.display = isExpanded ? 'none' : 'inline';
    },

    async lazyLoadGameThumbnails() {
        const images = document.querySelectorAll('img[data-needs-thumbnail="true"]');
        if (!images.length || !window.RobloxClient?.api?.getGameIcons) return;
        const universeIds = [...new Set(Array.from(images).map(img => img.dataset.universeId).filter(Boolean))];
        if (!universeIds.length) return;
        try {
            const icons = await window.RobloxClient.api.getGameIcons(universeIds, '150x150');
            if (icons?.data) {
                const iconMap = {};
                icons.data.forEach(icon => { if (icon.targetId && icon.imageUrl) iconMap[icon.targetId] = icon.imageUrl; });
                images.forEach(img => {
                    const uid = img.dataset.universeId;
                    if (uid && iconMap[uid]) { img.src = iconMap[uid]; img.removeAttribute('data-needs-thumbnail'); }
                });
            }
        } catch (e) {}
    },

    async toggleReplies(reviewId) {
        const container = this.container?.querySelector(`.replies-thread[data-review-id="${reviewId}"]`);
        if (!container) return;
        
        if (this.expandedReplies.has(reviewId)) {
            container.style.display = 'none';
            this.expandedReplies.delete(reviewId);
            const btn = this.container?.querySelector(`.reply-toggle-btn[data-review-id="${reviewId}"]`);
            if (btn) { btn.classList.remove('expanded'); btn.querySelector('.toggle-arrow').textContent = '▼'; }
        } else {
            container.style.display = 'block';
            container.innerHTML = '<div class="replies-loading">Loading replies...</div>';
            this.expandedReplies.add(reviewId);
            const btn = this.container?.querySelector(`.reply-toggle-btn[data-review-id="${reviewId}"]`);
            if (btn) { btn.classList.add('expanded'); btn.querySelector('.toggle-arrow').textContent = '▲'; }
            
            try {
                const replies = await window.roblox.reviews.getReplies(reviewId);
                const replyList = Array.isArray(replies) ? replies : (replies?.items || replies?.replies || []);
                container.innerHTML = replyList.length ? replyList.map(r => this.renderReply(r)).join('') : '<div class="no-replies">No replies yet.</div>';
            } catch (e) {
                container.innerHTML = '<div class="replies-error">Failed to load replies.</div>';
            }
        }
    },

    renderReply(reply) {
        const author = reply.author || {};
        const authorName = author.displayName || author.username || 'Unknown';
        const authorId = author.userId || 0;
        const avatarUrl = this.getAvatarUrl(author.avatarUrl, authorId);
        const content = this.formatMarkdown(reply.content || reply.text || '');
        const date = this.formatDate(reply.createdAt || reply.created || reply.timestamp);
        return `
            <div class="reply-item" data-reply-id="${reply.id}">
                <a href="profile.html?id=${authorId}" class="reply-author-link">
                    <img src="${avatarUrl}" alt="${authorName}" class="reply-avatar" onerror="this.src='../images/spinners/spinner100x100.gif'">
                </a>
                <div class="reply-content-wrapper">
                    <div class="reply-header">
                        <a href="profile.html?id=${authorId}" class="reply-author-name">${this.escapeHtml(authorName)}</a>
                        <span class="reply-date">${date}</span>
                    </div>
                    <div class="reply-content">${content}</div>
                </div>
            </div>`;
    },

    showInlineEditForm(reviewId) {
        const review = this.reviews.find(r => r.id === reviewId);
        if (!review) return;
        const reviewItem = this.container?.querySelector(`.review-item[data-review-id="${reviewId}"]`);
        const textDiv = reviewItem?.querySelector('.review-text');
        if (!textDiv) {

            const footer = reviewItem?.querySelector('.review-footer');
            if (footer) {
                const newTextDiv = document.createElement('div');
                newTextDiv.className = 'review-text';
                footer.parentNode.insertBefore(newTextDiv, footer);
                this.showInlineEditForm(reviewId);
                return;
            }
            return;
        }
        const originalContent = textDiv.innerHTML;
        textDiv.innerHTML = `
            <div class="inline-edit-form">
                <div class="like-buttons-inline">
                    <button type="button" class="like-btn ${review.likeStatus === 'like' ? 'selected' : ''}" onclick="event.stopPropagation(); this.classList.add('selected'); this.nextElementSibling.classList.remove('selected');">
                        <img src="../images/rovloo/btn-thumbsup.png" alt="Like"><span>Recommend</span>
                    </button>
                    <button type="button" class="dislike-btn ${review.likeStatus === 'dislike' ? 'selected' : ''}" onclick="event.stopPropagation(); this.classList.add('selected'); this.previousElementSibling.classList.remove('selected');">
                        <img src="../images/rovloo/btn-thumbsdown.png" alt="Dislike"><span>Not Recommended</span>
                    </button>
                </div>
                <textarea class="inline-edit-textarea" maxlength="1000" placeholder="Write your review...">${this.escapeHtml(review.text || '')}</textarea>
                <div class="inline-edit-actions">
                    <button type="button" class="btn-control" onclick="event.stopPropagation(); ReviewComponent.saveInlineEdit('${reviewId}')">Save</button>
                    <button type="button" class="btn-control cancel" onclick="event.stopPropagation(); ReviewComponent.cancelInlineEdit('${reviewId}')">Cancel</button>
                </div>
            </div>`;
        textDiv.dataset.originalContent = originalContent;
    },

    async saveInlineEdit(reviewId) {
        const review = this.reviews.find(r => r.id === reviewId);
        if (!review) return;
        const reviewItem = this.container?.querySelector(`.review-item[data-review-id="${reviewId}"]`);
        const textarea = reviewItem?.querySelector('.inline-edit-textarea');
        const likeBtn = reviewItem?.querySelector('.like-btn');
        const dislikeBtn = reviewItem?.querySelector('.dislike-btn');
        const text = textarea?.value?.trim() || '';
        const likeStatus = likeBtn?.classList.contains('selected') ? 'like' : dislikeBtn?.classList.contains('selected') ? 'dislike' : review.likeStatus;
        
        if (text.length > 1000) { alert('Review must be 1000 characters or less'); return; }
        const gameId = review.gameId || review.game?.id || review.game?.gameId;
        if (!gameId) { alert('Unable to update: game ID not found'); return; }
        
        try {
            await window.roblox.reviews.update(review.id, { gameId, likeStatus, text: text || null });
            await this.loadReviews();
        } catch (e) { 
            alert('Failed to update: ' + (e.message || 'Unknown error')); 
        }
    },

    cancelInlineEdit(reviewId) {
        const reviewItem = this.container?.querySelector(`.review-item[data-review-id="${reviewId}"]`);
        const textDiv = reviewItem?.querySelector('.review-text');
        if (textDiv?.dataset.originalContent) {
            textDiv.innerHTML = textDiv.dataset.originalContent;
            delete textDiv.dataset.originalContent;
        } else {
            this.loadReviews();
        }
    },

    async handleDelete(reviewId, gameId) {
        if (!confirm('Are you sure you want to delete your review?')) return;
        const placeId = this.browseMode ? (gameId || this.getReviewGameId(reviewId)) : this.placeId;
        if (!placeId || placeId === 'browse') { alert('Unable to delete: game ID not found'); return; }
        try {
            await window.roblox.reviews.delete(placeId, reviewId);
            this.userReview = null;
            await this.loadReviews();
        } catch (e) { 
            alert('Failed to delete: ' + (e.message || 'Unknown error')); 
        }
    },

    getReviewGameId(reviewId) {
        const review = this.reviews.find(r => r.id === reviewId);
        return review?.gameId || review?.game?.id || review?.game?.gameId || null;
    },

    renderPagination() {
        const paginationEl = this.container?.querySelector('.reviews-pagination');
        if (!paginationEl || this.totalPages <= 1) { 
            if (paginationEl) paginationEl.innerHTML = ''; 
            return; 
        }
        
        let html = '<div class="pagination-controls">';
        html += `<button class="pagination-btn prev" onclick="ReviewComponent.goToPage(${this.currentPage - 1})" ${this.currentPage === 1 ? 'disabled' : ''}>&lt; Prev</button>`;
        html += '<div class="page-numbers">';
        
        const maxVisible = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(this.totalPages, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);
        
        if (startPage > 1) {
            html += `<button class="pagination-btn page" onclick="ReviewComponent.goToPage(1)">1</button>`;
            if (startPage > 2) html += '<span class="pagination-ellipsis">...</span>';
        }
        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="pagination-btn page ${i === this.currentPage ? 'current' : ''}" onclick="ReviewComponent.goToPage(${i})">${i}</button>`;
        }
        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) html += '<span class="pagination-ellipsis">...</span>';
            html += `<button class="pagination-btn page" onclick="ReviewComponent.goToPage(${this.totalPages})">${this.totalPages}</button>`;
        }
        
        html += '</div>';
        html += `<button class="pagination-btn next" onclick="ReviewComponent.goToPage(${this.currentPage + 1})" ${this.currentPage === this.totalPages ? 'disabled' : ''}>Next &gt;</button>`;
        html += '</div>';
        paginationEl.innerHTML = html;
    },

    goToPage(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage) return;
        this.currentPage = page;
        this.loadReviews();
    },

    formatDate(dateStr) {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now - date;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            if (diffDays === 0) return 'Today';
            if (diffDays === 1) return 'Yesterday';
            if (diffDays < 7) return `${diffDays} days ago`;
            if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
            return date.toLocaleDateString();
        } catch (e) { return ''; }
    },

    formatPlaytime(minutes) {
        if (!minutes || minutes < 1) return '< 1m';
        if (minutes < 60) return `${Math.round(minutes)}m`;
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    formatMarkdown(text) {
        if (!text) return '';

        let formatted = this.escapeHtml(text);

        formatted = formatted.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

        formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/__([^_]+)__/g, '<strong>$1</strong>');

        formatted = formatted.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
        formatted = formatted.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>');

        formatted = formatted.replace(/~~([^~]+)~~/g, '<del>$1</del>');

        formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
            const trimmedUrl = url.trim();
            if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
                const safeUrl = this.escapeHtml(trimmedUrl);
                return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="markdown-link">${linkText}</a>`;
            }
            return linkText;
        });

        formatted = formatted.replace(/\n/g, '<br>');
        
        return formatted;
    },

    formatMarkdownInline(text) {
        if (!text) return '';
        
        let formatted = this.escapeHtml(text);

        formatted = formatted.replace(/(`[^`]+`)/g, '<span class="md-code">$1</span>');

        formatted = formatted.replace(/(\*\*[^*]+\*\*)/g, '<span class="md-bold">$1</span>');

        formatted = formatted.replace(/(~~[^~]+~~)/g, '<span class="md-strike">$1</span>');

        formatted = formatted.replace(/(?<!\*)(\*[^*]+\*)(?!\*)/g, '<span class="md-italic">$1</span>');

        formatted = formatted.replace(/(\[[^\]]+\]\([^)]+\))/g, '<span class="md-link">$1</span>');

        formatted = formatted.replace(/\n/g, '<br>');
        
        return formatted;
    },

    destroy() {
        this.container = null;
        this.reviews = [];
        this.expandedReplies.clear();
        this.allReviewsCache = null;
        this.userVoteCache = {};
        this.userReview = null;
        this.userGameVote = null;
        this.selectedLikeStatus = null;
        this.cachedPlaytimeData = null;
        this.gameStats = null;
    }
};

if (typeof window !== 'undefined') window.ReviewComponent = ReviewComponent;

