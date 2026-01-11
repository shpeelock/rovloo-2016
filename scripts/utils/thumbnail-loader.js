class ThumbnailLoader {
    constructor(options = {}) {

        this.pendingGameThumbnails = new Map();
        this.pendingGameIcons = new Map();
        this.pendingUserAvatars = new Map();

        this.gameBatchTimeout = null;
        this.gameIconBatchTimeout = null;
        this.avatarBatchTimeout = null;

        this.BATCH_DELAY = options.batchDelay || 30;

        this.DEFAULT_GAME_SIZE = options.gameSize || '768x432';
        this.DEFAULT_GAME_ICON_SIZE = options.gameIconSize || '150x150';
        this.DEFAULT_AVATAR_SIZE = options.avatarSize || '150x150';

        this.GAME_PLACEHOLDER = options.gamePlaceholder || 'images/game-placeholder.png';
        this.AVATAR_PLACEHOLDER = options.avatarPlaceholder || 'images/avatar-placeholder.png';

        this.MAX_BATCH_SIZE = options.maxBatchSize || 50;

        this.useLazyLoading = options.lazyLoading !== false; 
        this._lazyObserver = null;
        this._lazyQueue = new Map(); 

        if (this.useLazyLoading) {
            this._initLazyObserver();
        }
    }
    
    _initLazyObserver() {
        if (!('IntersectionObserver' in window)) {
            this.useLazyLoading = false;
            return;
        }
        
        this._lazyObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    const loadCallback = this._lazyQueue.get(element);
                    
                    if (loadCallback) {
                        loadCallback();
                        this._lazyQueue.delete(element);
                    }
                    
                    this._lazyObserver.unobserve(element);
                }
            });
        }, {
            root: null,
            rootMargin: '100px', 
            threshold: 0.01
        });
    }

    queueGameThumbnail(universeId, imgElement, size, immediate = false) {
        if (!universeId || !imgElement) return;

        this.setPlaceholder(imgElement, 'game');
        
        const queueFn = () => {
            const key = `${universeId}_${size || this.DEFAULT_GAME_SIZE}`;

            if (!this.pendingGameThumbnails.has(key)) {
                this.pendingGameThumbnails.set(key, {
                    universeId: universeId,
                    size: size || this.DEFAULT_GAME_SIZE,
                    elements: []
                });
            }
            
            this.pendingGameThumbnails.get(key).elements.push(imgElement);

            this.scheduleBatch('game');
        };

        if (this.useLazyLoading && !immediate && this._lazyObserver) {
            this._lazyQueue.set(imgElement, queueFn);
            this._lazyObserver.observe(imgElement);
        } else {
            queueFn();
        }
    }

    queueGameIcon(universeId, imgElement, size, immediate = false) {
        if (!universeId || !imgElement) return;

        this.setPlaceholder(imgElement, 'game');
        
        const queueFn = () => {
            const key = `${universeId}_${size || this.DEFAULT_GAME_ICON_SIZE}`;

            if (!this.pendingGameIcons.has(key)) {
                this.pendingGameIcons.set(key, {
                    universeId: universeId,
                    size: size || this.DEFAULT_GAME_ICON_SIZE,
                    elements: []
                });
            }
            
            this.pendingGameIcons.get(key).elements.push(imgElement);

            this.scheduleBatch('gameIcon');
        };

        if (this.useLazyLoading && !immediate && this._lazyObserver) {
            this._lazyQueue.set(imgElement, queueFn);
            this._lazyObserver.observe(imgElement);
        } else {
            queueFn();
        }
    }

    queueUserAvatar(userId, imgElement, size, immediate = false) {
        if (!userId || !imgElement) return;

        this.setPlaceholder(imgElement, 'avatar');
        
        const queueFn = () => {
            const key = `${userId}_${size || this.DEFAULT_AVATAR_SIZE}`;

            if (!this.pendingUserAvatars.has(key)) {
                this.pendingUserAvatars.set(key, {
                    userId: userId,
                    size: size || this.DEFAULT_AVATAR_SIZE,
                    elements: []
                });
            }
            
            this.pendingUserAvatars.get(key).elements.push(imgElement);

            this.scheduleBatch('avatar');
        };

        if (this.useLazyLoading && !immediate && this._lazyObserver) {
            this._lazyQueue.set(imgElement, queueFn);
            this._lazyObserver.observe(imgElement);
        } else {
            queueFn();
        }
    }

    setPlaceholder(imgElement, type) {
        if (!imgElement) return;
        
        const placeholder = type === 'game' ? this.GAME_PLACEHOLDER : this.AVATAR_PLACEHOLDER;

        if (!imgElement.dataset.loaded) {
            imgElement.src = placeholder;
            imgElement.dataset.loading = 'true';
        }
    }

    scheduleBatch(type) {
        if (type === 'game') {
            if (this.gameBatchTimeout) {
                clearTimeout(this.gameBatchTimeout);
            }
            this.gameBatchTimeout = setTimeout(() => {
                this.processBatch('game');
            }, this.BATCH_DELAY);
        } else if (type === 'gameIcon') {
            if (this.gameIconBatchTimeout) {
                clearTimeout(this.gameIconBatchTimeout);
            }
            this.gameIconBatchTimeout = setTimeout(() => {
                this.processBatch('gameIcon');
            }, this.BATCH_DELAY);
        } else {
            if (this.avatarBatchTimeout) {
                clearTimeout(this.avatarBatchTimeout);
            }
            this.avatarBatchTimeout = setTimeout(() => {
                this.processBatch('avatar');
            }, this.BATCH_DELAY);
        }
    }

    async processBatch(type) {
        let pendingMap;
        if (type === 'game') {
            pendingMap = this.pendingGameThumbnails;
        } else if (type === 'gameIcon') {
            pendingMap = this.pendingGameIcons;
        } else {
            pendingMap = this.pendingUserAvatars;
        }
        
        if (pendingMap.size === 0) return;

        const requests = Array.from(pendingMap.values());
        pendingMap.clear();

        const bySize = new Map();
        for (const request of requests) {
            const size = request.size;
            if (!bySize.has(size)) {
                bySize.set(size, []);
            }
            bySize.get(size).push(request);
        }

        for (const [size, sizeRequests] of bySize) {
            await this.processSizeBatch(type, size, sizeRequests);
        }
    }

    async processSizeBatch(type, size, requests) {

        const chunks = [];
        for (let i = 0; i < requests.length; i += this.MAX_BATCH_SIZE) {
            chunks.push(requests.slice(i, i + this.MAX_BATCH_SIZE));
        }
        
        for (const chunk of chunks) {
            try {
                if (type === 'game') {
                    await this.fetchGameThumbnails(chunk, size);
                } else if (type === 'gameIcon') {
                    await this.fetchGameIcons(chunk, size);
                } else {
                    await this.fetchUserAvatars(chunk, size);
                }
            } catch (error) {
                console.error(`Failed to fetch ${type} thumbnails:`, error);

            }
        }
    }

    async fetchGameThumbnails(requests, size) {
        const universeIds = requests.map(r => r.universeId);

        const api = window.robloxAPI || window.RobloxClient?.api;
        if (!api || !api.getGameThumbnails) {
            console.warn('Game thumbnails API not available');
            return;
        }
        
        try {
            const result = await api.getGameThumbnails(universeIds, size);
            
            if (result?.data) {

                const thumbnailMap = new Map();
                
                for (const item of result.data) {
                    if (item.thumbnails && item.thumbnails.length > 0) {
                        const thumb = item.thumbnails[0];
                        if (thumb.state === 'Completed' && thumb.imageUrl) {
                            thumbnailMap.set(item.universeId || item.targetId, thumb.imageUrl);
                        }
                    }
                }

                for (const request of requests) {
                    const imageUrl = thumbnailMap.get(request.universeId);
                    if (imageUrl) {
                        for (const element of request.elements) {
                            this.updateImageElement(element, imageUrl);
                        }
                    }

                }
            }
        } catch (error) {
            console.error('Error fetching game thumbnails:', error);

        }
    }

    async fetchGameIcons(requests, size) {
        const universeIds = requests.map(r => r.universeId);

        const api = window.robloxAPI || window.RobloxClient?.api;
        if (!api || !api.getGameIcons) {
            console.warn('Game icons API not available');
            return;
        }
        
        try {
            const result = await api.getGameIcons(universeIds, size);
            
            if (result?.data) {

                const iconMap = new Map();
                
                for (const item of result.data) {
                    if (item.state === 'Completed' && item.imageUrl) {
                        iconMap.set(item.targetId, item.imageUrl);
                    }
                }

                for (const request of requests) {
                    const imageUrl = iconMap.get(request.universeId);
                    if (imageUrl) {
                        for (const element of request.elements) {
                            this.updateImageElement(element, imageUrl);
                        }
                    }

                }
            }
        } catch (error) {
            console.error('Error fetching game icons:', error);

        }
    }

    async fetchUserAvatars(requests, size) {
        const userIds = requests.map(r => r.userId);

        const api = window.robloxAPI || window.RobloxClient?.api;
        if (!api || !api.getUserAvatars) {
            console.warn('User avatars API not available');
            return;
        }
        
        try {
            const result = await api.getUserAvatars(userIds, size);
            
            if (result?.data) {

                const avatarMap = new Map();
                
                for (const item of result.data) {
                    if (item.state === 'Completed' && item.imageUrl) {
                        avatarMap.set(item.targetId, item.imageUrl);
                    }
                }

                for (const request of requests) {
                    const imageUrl = avatarMap.get(request.userId);
                    if (imageUrl) {
                        for (const element of request.elements) {
                            this.updateImageElement(element, imageUrl);
                        }
                    }

                }
            }
        } catch (error) {
            console.error('Error fetching user avatars:', error);

        }
    }

    updateImageElement(element, imageUrl) {
        if (!element || !imageUrl) return;

        element.dataset.loaded = 'true';
        delete element.dataset.loading;
        element.src = imageUrl;
    }

    clearPending() {
        if (this.gameBatchTimeout) {
            clearTimeout(this.gameBatchTimeout);
            this.gameBatchTimeout = null;
        }
        if (this.gameIconBatchTimeout) {
            clearTimeout(this.gameIconBatchTimeout);
            this.gameIconBatchTimeout = null;
        }
        if (this.avatarBatchTimeout) {
            clearTimeout(this.avatarBatchTimeout);
            this.avatarBatchTimeout = null;
        }
        this.pendingGameThumbnails.clear();
        this.pendingGameIcons.clear();
        this.pendingUserAvatars.clear();

        if (this._lazyObserver) {
            this._lazyQueue.forEach((_, element) => {
                this._lazyObserver.unobserve(element);
            });
        }
        this._lazyQueue.clear();
    }
    
    destroy() {
        this.clearPending();
        if (this._lazyObserver) {
            this._lazyObserver.disconnect();
            this._lazyObserver = null;
        }
    }
    
    loadAllLazy() {
        this._lazyQueue.forEach((loadFn, element) => {
            if (this._lazyObserver) {
                this._lazyObserver.unobserve(element);
            }
            loadFn();
        });
        this._lazyQueue.clear();
    }

    getPendingCount() {
        return {
            game: this.pendingGameThumbnails.size,
            gameIcon: this.pendingGameIcons.size,
            avatar: this.pendingUserAvatars.size
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThumbnailLoader;
}

if (typeof window !== 'undefined') {
    window.ThumbnailLoader = ThumbnailLoader;
}

