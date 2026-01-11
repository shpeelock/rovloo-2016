const PlaytimeTracker = {
    _currentUserId: null,
    _playtimeCache: {},
    _cacheExpiry: 20000, 
    _maxCacheEntries: 20, 

    async _getUserId() {
        if (this._currentUserId) {
            return this._currentUserId;
        }
        
        try {

            const api = window.robloxAPI || window.roblox;
            if (api?.getCurrentUser) {
                const user = await api.getCurrentUser();
                if (user) {
                    this._currentUserId = String(user.id);
                    return this._currentUserId;
                }
            }
        } catch (e) {
            console.error('[PlaytimeTracker] Failed to get current user:', e);
        }
        return null;
    },

    formatPlaytime(seconds) {
        if (seconds < 60) {
            return '< 1m';
        }
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) {
            if (minutes > 0) {
                return `${hours}h ${minutes}m`;
            }
            return `${hours}h`;
        }
        
        return `${minutes}m`;
    },

    formatPlaytimeMinutes(minutes) {
        return this.formatPlaytime(minutes * 60);
    },

    async getPlaytimeDataAsync(placeId, universeId = null) {
        try {
            const userId = await this._getUserId();
            if (!userId) {
                return this._getDefaultPlaytimeData();
            }

            const cacheKey = `${userId}_${placeId}`;
            const cached = this._playtimeCache[cacheKey];
            if (cached && Date.now() - cached.timestamp < this._cacheExpiry) {
                if (universeId && !cached.data.universeId) {
                    cached.data.universeId = universeId;
                }
                return cached.data;
            }

            const playtimeApi = window.roblox?.playtime || window.robloxAPI?.playtime;
            if (!playtimeApi?.getPlaytimeData) {
                return this._getDefaultPlaytimeData();
            }

            const data = await playtimeApi.getPlaytimeData(userId, placeId);

            if (universeId) {
                data.universeId = universeId;
            }
            data.source = 'native';

            this._playtimeCache[cacheKey] = {
                data: data,
                timestamp: Date.now()
            };

            this._trimCache();
            
            return data;
        } catch (e) {
            console.error('[PlaytimeTracker] Failed to get playtime data:', e);
            return this._getDefaultPlaytimeData();
        }
    },

    _trimCache() {
        const keys = Object.keys(this._playtimeCache);
        if (keys.length <= this._maxCacheEntries) return;

        const entries = keys.map(k => ({ key: k, ts: this._playtimeCache[k].timestamp }));
        entries.sort((a, b) => a.ts - b.ts);
        
        const toRemove = entries.length - this._maxCacheEntries;
        for (let i = 0; i < toRemove; i++) {
            delete this._playtimeCache[entries[i].key];
        }
    },

    getPlaytimeData(placeId) {
        const userId = this._currentUserId;
        if (userId) {
            const cacheKey = `${userId}_${placeId}`;
            const cached = this._playtimeCache[cacheKey];
            if (cached) {
                return cached.data;
            }
        }

        this.getPlaytimeDataAsync(placeId).catch(() => {});

        return this._getDefaultPlaytimeData();
    },

    _getDefaultPlaytimeData() {
        return {
            totalMinutes: 0,
            currentMinutes: 0,
            formattedPlaytime: '< 1m',
            source: 'native'
        };
    },

    async getAllPlaytime() {
        try {
            const userId = await this._getUserId();
            if (!userId) {
                return {};
            }

            const playtimeApi = window.roblox?.playtime || window.robloxAPI?.playtime;
            if (!playtimeApi?.getAllPlaytime) {
                return {};
            }
            
            return await playtimeApi.getAllPlaytime(userId);
        } catch (e) {
            console.error('[PlaytimeTracker] Failed to get all playtime:', e);
            return {};
        }
    },

    async getCurrentSession() {
        try {

            const playtimeApi = window.roblox?.playtime || window.robloxAPI?.playtime;
            if (!playtimeApi?.getCurrentSession) {
                return null;
            }
            return await playtimeApi.getCurrentSession();
        } catch (e) {
            console.error('[PlaytimeTracker] Failed to get current session:', e);
            return null;
        }
    },

    clearCache() {
        this._playtimeCache = {};
    }
};

window.PlaytimeTracker = PlaytimeTracker;

