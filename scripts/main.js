



const DEBUG_KEY = 'rovloo_debug_mode';


const _originalConsole = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    info: console.info.bind(console)
};


function isDebugMode() {
    return localStorage.getItem(DEBUG_KEY) === 'true';
}


function setDebugMode(enabled) {
    localStorage.setItem(DEBUG_KEY, enabled ? 'true' : 'false');
    _originalConsole.log(`[Rovloo] Debug mode ${enabled ? 'ENABLED' : 'DISABLED'}. Refresh the page to apply.`);
}


function isRovlooMessage(args) {
    if (args.length === 0) return false;
    const first = args[0];
    if (typeof first !== 'string') return false;

    return /^\[[A-Za-z0-9_-]+\]/.test(first);
}


console.log = function(...args) {
    if (isRovlooMessage(args) && !isDebugMode()) return;
    _originalConsole.log(...args);
};

console.warn = function(...args) {
    if (isRovlooMessage(args) && !isDebugMode()) return;
    _originalConsole.warn(...args);
};

console.info = function(...args) {
    if (isRovlooMessage(args) && !isDebugMode()) return;
    _originalConsole.info(...args);
};


console.error = function(...args) {
    _originalConsole.error(...args);
};


window.isDebugMode = isDebugMode;
window.setDebugMode = setDebugMode;
window._originalConsole = _originalConsole;




const TimerManager = {
    _timeouts: new Set(),
    _intervals: new Set(),
    _animationFrames: new Set(),
    

    setTimeout: function(callback, delay, ...args) {
        const id = window.setTimeout(() => {
            this._timeouts.delete(id);
            callback(...args);
        }, delay);
        this._timeouts.add(id);
        return id;
    },
    

    setInterval: function(callback, delay, ...args) {
        const id = window.setInterval(callback, delay, ...args);
        this._intervals.add(id);
        return id;
    },
    

    requestAnimationFrame: function(callback) {
        const id = window.requestAnimationFrame((timestamp) => {
            this._animationFrames.delete(id);
            callback(timestamp);
        });
        this._animationFrames.add(id);
        return id;
    },
    

    clearTimeout: function(id) {
        window.clearTimeout(id);
        this._timeouts.delete(id);
    },
    

    clearInterval: function(id) {
        window.clearInterval(id);
        this._intervals.delete(id);
    },
    

    cancelAnimationFrame: function(id) {
        window.cancelAnimationFrame(id);
        this._animationFrames.delete(id);
    },
    

    clearAll: function() {
        this._timeouts.forEach(id => window.clearTimeout(id));
        this._intervals.forEach(id => window.clearInterval(id));
        this._animationFrames.forEach(id => window.cancelAnimationFrame(id));
        this._timeouts.clear();
        this._intervals.clear();
        this._animationFrames.clear();
        console.log('[TimerManager] All timers cleared');
    },
    

    getActiveCount: function() {
        return {
            timeouts: this._timeouts.size,
            intervals: this._intervals.size,
            animationFrames: this._animationFrames.size
        };
    }
};


window.TimerManager = TimerManager;


window.addEventListener('beforeunload', () => {
    TimerManager.clearAll();
});


document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {

        TimerManager._intervals.forEach(id => window.clearInterval(id));
        TimerManager._intervals.clear();
        console.log('[TimerManager] Intervals cleared (tab hidden)');
    }
});




const ScriptLoader = {
    _loaded: new Set(),
    _loading: new Map(),
    
    /**
     * Load a script dynamically
     * @param {string} src - Script source URL
     * @param {Object} options - Options: { async, defer, onLoad, onError }
     * @returns {Promise} Resolves when script is loaded
     */
    load: function(src, options = {}) {

        if (this._loaded.has(src)) {
            return Promise.resolve();
        }
        

        if (this._loading.has(src)) {
            return this._loading.get(src);
        }
        
        const promise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = options.async !== false;
            if (options.defer) script.defer = true;
            
            script.onload = () => {
                this._loaded.add(src);
                this._loading.delete(src);
                console.log('[ScriptLoader] Loaded:', src);
                if (options.onLoad) options.onLoad();
                resolve();
            };
            
            script.onerror = (error) => {
                this._loading.delete(src);
                console.error('[ScriptLoader] Failed to load:', src);
                if (options.onError) options.onError(error);
                reject(error);
            };
            
            document.head.appendChild(script);
        });
        
        this._loading.set(src, promise);
        return promise;
    },
    
    /**
     * Load multiple scripts in sequence
     * @param {string[]} sources - Array of script URLs
     * @returns {Promise} Resolves when all scripts are loaded
     */
    loadSequence: async function(sources) {
        for (const src of sources) {
            await this.load(src);
        }
    },
    
    /**
     * Load multiple scripts in parallel
     * @param {string[]} sources - Array of script URLs
     * @returns {Promise} Resolves when all scripts are loaded
     */
    loadParallel: function(sources) {
        return Promise.all(sources.map(src => this.load(src)));
    },
    
    /**
     * Check if a script is loaded
     * @param {string} src - Script source URL
     * @returns {boolean}
     */
    isLoaded: function(src) {
        return this._loaded.has(src);
    },
    
    /**
     * Preload a script (download but don't execute)
     * @param {string} src - Script source URL
     */
    preload: function(src) {
        if (this._loaded.has(src)) return;
        
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'script';
        link.href = src;
        document.head.appendChild(link);
    }
};


window.ScriptLoader = ScriptLoader;




const LazyImageLoader = {
    _observer: null,
    _options: {
        root: null,
        rootMargin: '50px',
        threshold: 0.01
    },
    
    /**
     * Initialize the lazy loader
     */
    init: function() {
        if (this._observer) return;
        
        if ('IntersectionObserver' in window) {
            this._observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this._loadImage(entry.target);
                        this._observer.unobserve(entry.target);
                    }
                });
            }, this._options);
            console.log('[LazyImageLoader] Initialized with IntersectionObserver');
        } else {

            console.log('[LazyImageLoader] IntersectionObserver not supported, using fallback');
        }
    },
    
    /**
     * Observe an image for lazy loading
     * @param {HTMLImageElement} img - Image element
     * @param {string} dataSrc - The actual image source (stored in data-src)
     */
    observe: function(img, dataSrc) {
        if (!img) return;
        

        img.dataset.src = dataSrc;
        img.dataset.lazy = 'pending';
        
        if (this._observer) {
            this._observer.observe(img);
        } else {

            this._loadImage(img);
        }
    },
    
    /**
     * Load the actual image
     * @param {HTMLImageElement} img - Image element
     */
    _loadImage: function(img) {
        const src = img.dataset.src;
        if (!src) return;
        
        img.dataset.lazy = 'loading';
        

        const tempImg = new Image();
        tempImg.onload = () => {
            img.src = src;
            img.dataset.lazy = 'loaded';
            delete img.dataset.src;
        };
        tempImg.onerror = () => {
            img.dataset.lazy = 'error';

        };
        tempImg.src = src;
    },
    
    /**
     * Stop observing an image
     * @param {HTMLImageElement} img - Image element
     */
    unobserve: function(img) {
        if (this._observer && img) {
            this._observer.unobserve(img);
        }
    },
    
    /**
     * Disconnect the observer (cleanup)
     */
    disconnect: function() {
        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }
    },
    
    /**
     * Force load all pending lazy images (useful before print, etc.)
     */
    loadAll: function() {
        document.querySelectorAll('img[data-lazy="pending"]').forEach(img => {
            this._loadImage(img);
            if (this._observer) {
                this._observer.unobserve(img);
            }
        });
    }
};


document.addEventListener('DOMContentLoaded', () => {
    LazyImageLoader.init();
});


window.addEventListener('beforeunload', () => {
    LazyImageLoader.disconnect();
});


window.LazyImageLoader = LazyImageLoader;

document.addEventListener('DOMContentLoaded', function() {
    applyTheme();
    initializeTitlebar();
    checkLoginState();
});


const SUBTHEME_KEY = 'rovloo_2016_subtheme';


function applyTheme() {
    const savedTheme = localStorage.getItem(SUBTHEME_KEY) || 'light';
    document.body.classList.remove('dark-theme', 'light-theme');
    document.body.classList.add(`${savedTheme}-theme`);
}
window.applyTheme = applyTheme;


function getCurrentTheme() {
    return localStorage.getItem(SUBTHEME_KEY) || 'light';
}
window.getCurrentTheme = getCurrentTheme;


function setTheme(theme) {
    if (theme !== 'light' && theme !== 'dark') return;
    localStorage.setItem(SUBTHEME_KEY, theme);
    applyTheme();
}
window.setTheme = setTheme;


function initializeTitlebar() {
    var btnMinimize = document.getElementById('btn-minimize');
    var btnMaximize = document.getElementById('btn-maximize');
    var btnClose = document.getElementById('btn-close');

    if (btnMinimize) {
        btnMinimize.addEventListener('click', function() {
            if (window.electron && window.electron.minimize) {
                window.electron.minimize();
            }
        });
    }

    if (btnMaximize) {
        btnMaximize.addEventListener('click', function() {
            if (window.electron && window.electron.maximize) {
                window.electron.maximize();
            }
        });
    }

    if (btnClose) {
        btnClose.addEventListener('click', function() {
            if (window.electron && window.electron.close) {
                window.electron.close();
            }
        });
    }
}


async function checkLoginState() {
    try {
        if (window.RobloxClient && window.RobloxClient.auth) {
            var isLoggedIn = await window.RobloxClient.auth.isLoggedIn();
            if (isLoggedIn) {
                var user = await window.RobloxClient.api.getCurrentUser();
                if (user && user.name) {
                    updateAuthUI(user);
                }
            }
        }
    } catch (error) {
        console.log('Not logged in or error checking login state');
    }
}


function updateAuthUI(user) {
    var loginLink = document.getElementById('head-login');
    if (loginLink && user) {
        loginLink.textContent = user.displayName || user.name;
        loginLink.href = '#profile';
    }

    var signupLink = document.querySelector('.rbx-navbar-signup');
    if (signupLink && user) {
        signupLink.style.display = 'none';
    }
}


function navigateTo(page, params) {
    params = params || {};
    var hash = '#' + page;

    if (Object.keys(params).length > 0) {
        var pairs = [];
        for (var key in params) {
            if (params.hasOwnProperty(key)) {
                pairs.push(key + '=' + encodeURIComponent(params[key]));
            }
        }
        hash += '?' + pairs.join('&');
    }

    window.location.hash = hash;
}


window.addEventListener('hashchange', function() {
    var hash = window.location.hash.slice(1);
    var parts = hash.split('?');
    var page = parts[0];
    var query = parts[1];

    console.log('Navigating to:', page, query);
});


window.navigateTo = navigateTo;
window.updateAuthUI = updateAuthUI;



const RANDOMIZE_BC_KEY = 'rovloo_randomize_bc';


function isRandomizeBCEnabled() {
    return localStorage.getItem(RANDOMIZE_BC_KEY) === 'true';
}
window.isRandomizeBCEnabled = isRandomizeBCEnabled;


function getBCTypeForUser(userId) {
    const id = parseInt(userId, 10);
    if (isNaN(id)) return 'OBC';


    let hash = id;
    hash = ((hash >> 16) ^ hash) * 0x45d9f3b;
    hash = ((hash >> 16) ^ hash) * 0x45d9f3b;
    hash = (hash >> 16) ^ hash;

    const bucket = Math.abs(hash) % 3;

    switch (bucket) {
        case 0: return 'BC';
        case 1: return 'TBC';
        case 2: return 'OBC';
        default: return 'OBC';
    }
}
window.getBCTypeForUser = getBCTypeForUser;


function getBCOverlayImage(bcType, basePath = '../images/Overlays/') {
    switch (bcType) {
        case 'BC': return basePath + 'overlay_bcOnly.png';
        case 'TBC': return basePath + 'overlay_tbcOnly.png';
        case 'OBC':
        default: return basePath + 'overlay_obcOnly.png';
    }
}
window.getBCOverlayImage = getBCOverlayImage;


const premiumStatusCache = new Map();
window.premiumStatusCache = premiumStatusCache;


async function getPremiumStatus(userId) {
    if (!userId) return null;

    const cacheKey = String(userId);
    const cached = premiumStatusCache.get(cacheKey);
    const CACHE_TTL = 5 * 60 * 1000;

    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        return cached.value;
    }

    try {
        const api = window.roblox || window.robloxAPI;
        if (!api?.validatePremiumMembership) return null;

        const hasPremium = await api.validatePremiumMembership(userId);
        premiumStatusCache.set(cacheKey, { value: hasPremium, timestamp: Date.now() });
        return hasPremium;
    } catch (e) {
        console.debug('Premium status check failed:', e);
        return null;
    }
}
window.getPremiumStatus = getPremiumStatus;


async function addObcOverlayIfPremium(container, userId, overlayStyle = {}) {
    if (!container || !userId) return false;


    const existingOverlay = container.querySelector('.obc-overlay, .bc-badge-img');
    if (existingOverlay) {
        existingOverlay.remove();
    }

    try {
        const hasPremium = await getPremiumStatus(userId);

        if (hasPremium === true) {
            const bcType = isRandomizeBCEnabled() ? getBCTypeForUser(userId) : 'OBC';
            const overlayImage = getBCOverlayImage(bcType, overlayStyle.basePath || '../images/Overlays/');

            const overlay = document.createElement('img');
            overlay.src = overlayImage;
            overlay.alt = bcType;
            overlay.className = 'obc-overlay bc-badge-img';

            const bottomPos = overlayStyle.bottom || '0';
            const leftPos = overlayStyle.left || '0';
            let styleStr = `position: absolute; bottom: ${bottomPos}; left: ${leftPos}; height: auto; pointer-events: none;`;

            if (overlayStyle.width) {
                styleStr += ` width: ${overlayStyle.width};`;
            }

            overlay.style.cssText = styleStr;
            container.appendChild(overlay);
            return true;
        }
    } catch (e) {
        console.debug('Failed to add BC overlay:', e);
    }
    return false;
}
window.addObcOverlayIfPremium = addObcOverlayIfPremium;




let gameLaunchCancelled = false;
let madStatusInterval = null;


const MadStatus = {
    participle: [
        "Accelerating", "Aggregating", "Allocating", "Acquiring", "Automating",
        "Backtracing", "Bloxxing", "Bootstrapping", "Calibrating", "Charging",
        "Compiling", "Computing", "Configuring", "Connecting", "Decrypting",
        "Downloading", "Encrypting", "Executing", "Generating", "Initializing",
        "Loading", "Optimizing", "Processing", "Rendering", "Synchronizing"
    ],
    modifier: [
        "Blox", "Count Zero", "Cylon", "Data", "Ectoplasm", "Flux Capacitor",
        "Fusion", "Game", "Gravity", "Hyper", "Infinite", "Laser", "Mega",
        "Neural", "Omega", "Plasma", "Quantum", "Rocket", "Turbo", "Virtual"
    ],
    subject: [
        "Analogs", "Blocks", "Cannon", "Channels", "Core", "Database",
        "Dimensions", "Engine", "Frames", "Grid", "Matrix", "Modules",
        "Network", "Nodes", "Particles", "Pixels", "Protocols", "Servers",
        "Streams", "Systems"
    ],
    
    newLib: function() {
        const p = this.participle[Math.floor(Math.random() * this.participle.length)];
        const m = this.modifier[Math.floor(Math.random() * this.modifier.length)];
        const s = this.subject[Math.floor(Math.random() * this.subject.length)];
        return p + " " + m + " " + s + "...";
    }
};

/**
 * Show the 2016-style game launch overlay with MadStatus
 * @param {string} statusText - Initial status message to display
 */
function showGameLaunchOverlay(statusText = 'Starting Roblox...') {
    gameLaunchCancelled = false;
    
    const overlay = document.getElementById('PlaceLauncherOverlay');
    const panel = document.getElementById('PlaceLauncherStatusPanel');
    const startingEl = panel?.querySelector('.MadStatusStarting');
    const fieldEl = panel?.querySelector('.MadStatusField');
    const cancelBtn = panel?.querySelector('.CancelPlaceLauncherButton');
    
    if (overlay && panel) {

        if (startingEl) {
            startingEl.textContent = statusText;
            startingEl.style.display = 'block';
        }
        if (fieldEl) {
            fieldEl.style.display = 'none';
        }
        

        overlay.style.display = 'flex';
        

        overlay.appendChild(panel);
        panel.style.display = 'block';
        

        setTimeout(() => {
            if (!gameLaunchCancelled && startingEl && fieldEl) {
                startingEl.style.display = 'none';
                fieldEl.style.display = 'block';
                fieldEl.textContent = 'Connecting to Players...';
                startMadStatus();
            }
        }, 1500);
        

        if (cancelBtn) {
            cancelBtn.onclick = async (e) => {
                e.preventDefault();
                gameLaunchCancelled = true;
                stopMadStatus();
                
                if (startingEl) {
                    startingEl.textContent = 'Cancelling...';
                    startingEl.style.display = 'block';
                }
                if (fieldEl) {
                    fieldEl.style.display = 'none';
                }
                
                try {
                    if (window.roblox?.cancelGameLaunch) {
                        await window.roblox.cancelGameLaunch();
                        console.log('[2016 Theme] Game launch cancelled via API');
                    } else if (window.robloxAPI?.cancelGameLaunch) {
                        await window.robloxAPI.cancelGameLaunch();
                        console.log('[2016 Theme] Game launch cancelled via robloxAPI');
                    }
                } catch (err) {
                    console.error('[2016 Theme] Error cancelling game launch:', err);
                }
                
                hideGameLaunchOverlay();
            };
        }
    } else {
        console.error('[2016 Theme] Game launch overlay elements not found!');
    }
}

/**
 * Start the MadStatus text cycling effect
 */
function startMadStatus() {
    stopMadStatus();
    
    const fieldEl = document.querySelector('#PlaceLauncherStatusPanel .MadStatusField');
    if (!fieldEl) return;
    
    madStatusInterval = setInterval(() => {
        if (gameLaunchCancelled) {
            stopMadStatus();
            return;
        }
        

        fieldEl.style.opacity = '0';
        
        setTimeout(() => {

            fieldEl.textContent = MadStatus.newLib();
            fieldEl.style.opacity = '1';
        }, 300);
    }, 2000);
}

/**
 * Stop the MadStatus text cycling
 */
function stopMadStatus() {
    if (madStatusInterval) {
        clearInterval(madStatusInterval);
        madStatusInterval = null;
    }
}

/**
 * Update the status text in the game launch overlay
 * @param {string} statusText - New status message to display
 */
function updateGameLaunchStatus(statusText) {
    const startingEl = document.querySelector('#PlaceLauncherStatusPanel .MadStatusStarting');
    const fieldEl = document.querySelector('#PlaceLauncherStatusPanel .MadStatusField');
    

    stopMadStatus();
    
    if (startingEl) {
        startingEl.textContent = statusText;
        startingEl.style.display = 'block';
    }
    if (fieldEl) {
        fieldEl.style.display = 'none';
    }
}

/**
 * Hide the game launch overlay
 */
function hideGameLaunchOverlay() {
    stopMadStatus();
    
    const overlay = document.getElementById('PlaceLauncherOverlay');
    const panel = document.getElementById('PlaceLauncherStatusPanel');
    
    if (overlay) {
        overlay.style.display = 'none';
    }
    if (panel) {
        panel.style.display = 'none';
    }
}

/**
 * Check if the game launch was cancelled
 * @returns {boolean} True if cancelled
 */
function isGameLaunchCancelled() {
    return gameLaunchCancelled;
}

/**
 * Auto-hide the game launch overlay after a delay
 * @param {number} delay - Delay in milliseconds before hiding
 */
function autoHideGameLaunchOverlay(delay = 5000) {
    setTimeout(() => {
        if (!gameLaunchCancelled) {
            hideGameLaunchOverlay();
        }
    }, delay);
}


window.showGameLaunchOverlay = showGameLaunchOverlay;
window.updateGameLaunchStatus = updateGameLaunchStatus;
window.hideGameLaunchOverlay = hideGameLaunchOverlay;
window.isGameLaunchCancelled = isGameLaunchCancelled;
window.autoHideGameLaunchOverlay = autoHideGameLaunchOverlay;


// ============================================
// Party Game Launch Toast Notification
// ============================================

/**
 * Show a toast notification for party game launches
 * @param {Object} data - Game launch data { gameName, gameThumbnail, countdown, placeId }
 */
function showPartyGameLaunchToast(data) {
    // Remove any existing toast
    const existingToast = document.getElementById('party-game-toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.id = 'party-game-toast';
    toast.className = 'party-game-toast';
    
    const thumbnailHtml = data.gameThumbnail 
        ? `<img src="${data.gameThumbnail}" alt="${data.gameName}" class="toast-game-icon" onerror="this.style.display='none'">`
        : '<div class="toast-game-icon-placeholder"></div>';
    
    toast.innerHTML = `
        <div class="toast-content">
            ${thumbnailHtml}
            <div class="toast-text">
                <div class="toast-title">Party Game Launch</div>
                <div class="toast-game-name">${data.gameName || 'Unknown Game'}</div>
                <div class="toast-countdown">Launching in <span id="toast-countdown-num">${data.countdown || 5}</span>s...</div>
            </div>
        </div>
    `;
    
    // Add styles if not already present
    if (!document.getElementById('party-toast-styles')) {
        const style = document.createElement('style');
        style.id = 'party-toast-styles';
        style.textContent = `
            .party-game-toast {
                position: fixed;
                top: 80px;
                right: 20px;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border: 1px solid #00a2ff;
                border-radius: 8px;
                padding: 16px;
                z-index: 100000;
                box-shadow: 0 4px 20px rgba(0, 162, 255, 0.3);
                animation: toast-slide-in 0.3s ease-out;
                max-width: 320px;
            }
            
            @keyframes toast-slide-in {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            .party-game-toast .toast-content {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .party-game-toast .toast-game-icon {
                width: 64px;
                height: 64px;
                border-radius: 6px;
                object-fit: cover;
                flex-shrink: 0;
            }
            
            .party-game-toast .toast-game-icon-placeholder {
                width: 64px;
                height: 64px;
                border-radius: 6px;
                background: #2a2a4a;
                flex-shrink: 0;
            }
            
            .party-game-toast .toast-text {
                flex: 1;
                min-width: 0;
            }
            
            .party-game-toast .toast-title {
                font-size: 12px;
                color: #00a2ff;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 4px;
            }
            
            .party-game-toast .toast-game-name {
                font-size: 16px;
                color: #fff;
                font-weight: 500;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                margin-bottom: 4px;
            }
            
            .party-game-toast .toast-countdown {
                font-size: 14px;
                color: #aaa;
            }
            
            .party-game-toast .toast-countdown span {
                color: #00a2ff;
                font-weight: 600;
            }
            
            .party-game-toast.toast-fade-out {
                animation: toast-fade-out 0.3s ease-in forwards;
            }
            
            @keyframes toast-fade-out {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    // Countdown timer
    let countdown = data.countdown || 5;
    const countdownEl = document.getElementById('toast-countdown-num');
    
    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdownEl) {
            countdownEl.textContent = countdown;
        }
        
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            toast.classList.add('toast-fade-out');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }
    }, 1000);
    
    // Store interval for cleanup
    toast.dataset.intervalId = countdownInterval;
}

/**
 * Initialize party event listeners for themes
 */
function initPartyListeners() {
    if (window.roblox?.party?.onGameLaunching) {
        const cleanup = window.roblox.party.onGameLaunching((data) => {
            console.log('[2016 Theme] Party game launching:', data);
            showPartyGameLaunchToast(data);
            
            // Also launch the game after countdown
            if (data.placeId) {
                setTimeout(() => {
                    if (window.roblox?.launchGameDirect) {
                        window.roblox.launchGameDirect(data.placeId, data.gameName, data.gameThumbnail);
                    } else if (window.robloxAPI?.launchGameDirect) {
                        window.robloxAPI.launchGameDirect(data.placeId, data.gameName, data.gameThumbnail);
                    }
                }, (data.countdown || 5) * 1000);
            }
        });
        
        // Store cleanup function for later
        window._partyCleanup = cleanup;
    }
}

// Initialize party listeners when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPartyListeners);
} else {
    initPartyListeners();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window._partyCleanup) {
        window._partyCleanup();
    }
});

// Export for external use
window.showPartyGameLaunchToast = showPartyGameLaunchToast;
