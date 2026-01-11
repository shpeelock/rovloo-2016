(function() {
    'use strict';

    function getBasePath() {
        const path = window.location.pathname;

        if (path.includes('/pages/')) {
            return '../';
        }
        return '';
    }

    function getPagesPath() {
        const path = window.location.pathname;
        if (path.includes('/pages/')) {
            return ''; 
        }
        return 'pages/';
    }

    async function loadNavbar() {
        const basePath = getBasePath();
        const pagesPath = getPagesPath();

        try {

            const response = await fetch(basePath + 'components/navbar.html');
            if (!response.ok) {
                console.error('Failed to load navbar:', response.status);
                return;
            }

            const navbarHtml = await response.text();

            const navbarContainer = document.createElement('div');
            navbarContainer.id = 'navbar-container';
            navbarContainer.innerHTML = navbarHtml;
            document.body.insertBefore(navbarContainer, document.body.firstChild);

            setupNavigationLinks(basePath, pagesPath);

            initNavbarFunctionality();

        } catch (error) {
            console.error('Error loading navbar:', error);
        }
    }

    function setupNavigationLinks(basePath, pagesPath) {

        const homeLink = document.getElementById('navbar-home-link');
        if (homeLink) homeLink.href = basePath + 'index.html';

        const navLinks = {
            'nav-games-link': pagesPath + 'games.html',
            'nav-catalog-link': pagesPath + 'catalog.html',
            'nav-reviews-link': pagesPath + 'reviews.html',
            'nav-settings-link': pagesPath + 'settings.html'
        };

        for (const [id, href] of Object.entries(navLinks)) {
            const link = document.getElementById(id);
            if (link) link.href = href;
        }

        const sidebarLinks = {
            'sidebar-home-link': basePath + 'index.html',
            'sidebar-profile-link': pagesPath + 'profile.html',
            'sidebar-messages-link': pagesPath + 'messages.html',
            'sidebar-friends-link': pagesPath + 'friends.html',
            'sidebar-avatar-link': pagesPath + 'character.html',
            'sidebar-inventory-link': pagesPath + 'inventory.html',
            'sidebar-groups-link': pagesPath + 'groups.html'
        };

        for (const [id, href] of Object.entries(sidebarLinks)) {
            const link = document.getElementById(id);
            if (link) link.href = href;
        }
    }

    function initNavbarFunctionality() {

        loadCurrentUser();

        initSearchDropdown();

        applyNavbarSettings();

        const navbarToggle = document.querySelector('.navbar-toggle');
        const sidebar = document.getElementById('sidebar');

        if (navbarToggle && sidebar) {

            const sidebarAlwaysOpen = localStorage.getItem('rovloo_2016_sidebar_always_open') === 'true';

            const sidebarOpen = localStorage.getItem('sidebarOpen') === 'true';
            if (sidebarOpen || sidebarAlwaysOpen) {
                sidebar.classList.add('open');
            }
            if (sidebarAlwaysOpen) {
                sidebar.classList.add('always-open');

                document.body.classList.add('sidebar-always-open');
            }

            navbarToggle.addEventListener('click', function() {

                const alwaysOpen = localStorage.getItem('rovloo_2016_sidebar_always_open') === 'true';
                if (alwaysOpen) {
                    return; 
                }

                sidebar.classList.toggle('open');

                localStorage.setItem('sidebarOpen', sidebar.classList.contains('open'));
            });
        }

            const settingsBtn = document.getElementById('settings-btn');
            const settingsDropdown = document.getElementById('settings-dropdown');
            const logoutBtn = document.getElementById('logout-btn');

            const tixItem = document.getElementById('navbar-tix-item');
            const tixDropdown = document.getElementById('tix-dropdown');
            const robuxItem = document.getElementById('navbar-robux-item');
            const robuxDropdown = document.getElementById('robux-dropdown');
        
            if (tixItem && tixDropdown) {
              tixItem.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();

                if (robuxDropdown) robuxDropdown.classList.remove('open');
                if (settingsDropdown) settingsDropdown.classList.remove('open');
                
                tixDropdown.classList.toggle('open');
              });
            }
        
            if (robuxItem && robuxDropdown) {
              robuxItem.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();

                if (tixDropdown) tixDropdown.classList.remove('open');
                if (settingsDropdown) settingsDropdown.classList.remove('open');
        
                robuxDropdown.classList.toggle('open');
              });
            }
        
            if (settingsBtn && settingsDropdown) {

              settingsBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();

                if (tixDropdown) tixDropdown.classList.remove('open');
                if (robuxDropdown) robuxDropdown.classList.remove('open');
        
                settingsDropdown.classList.toggle('open');
              });

              document.addEventListener('click', function(e) {
                if (settingsBtn && !settingsBtn.contains(e.target) && !settingsDropdown.contains(e.target)) {
                  settingsDropdown.classList.remove('open');
                }
                
                if (tixItem && !tixItem.contains(e.target) && tixDropdown) {
                  tixDropdown.classList.remove('open');
                }
        
                if (robuxItem && !robuxItem.contains(e.target) && robuxDropdown) {
                  robuxDropdown.classList.remove('open');
                }
              });
            }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                if (window.RobloxClient && window.RobloxClient.auth && window.RobloxClient.auth.returnToHub) {
                    window.RobloxClient.auth.returnToHub();
                }
            });
        }

        const btnMinimize = document.getElementById('btn-minimize');
        const btnMaximize = document.getElementById('btn-maximize');
        const btnClose = document.getElementById('btn-close');

        if (btnMinimize) {
            btnMinimize.addEventListener('click', function() {
                if (window.RobloxClient && window.RobloxClient.window) {
                    window.RobloxClient.window.minimize();
                }
            });
        }

        if (btnMaximize) {
            btnMaximize.addEventListener('click', function() {
                if (window.RobloxClient && window.RobloxClient.window) {
                    window.RobloxClient.window.maximize();
                }
            });
        }

        if (btnClose) {
            btnClose.addEventListener('click', function() {
                if (window.RobloxClient && window.RobloxClient.window) {
                    window.RobloxClient.window.close();
                }
            });
        }

        const btnBack = document.getElementById('btn-back');
        const btnForward = document.getElementById('btn-forward');

        if (btnBack) {
            btnBack.addEventListener('click', function() {
                window.history.back();
            });
        }

        if (btnForward) {
            btnForward.addEventListener('click', function() {
                window.history.forward();
            });
        }

        // Update button states based on history
        updateNavigationButtonStates();
        window.addEventListener('load', updateNavigationButtonStates);
        window.addEventListener('popstate', updateNavigationButtonStates);
    }

    function applyNavbarSettings() {

        const useMinifiedLogo = localStorage.getItem('rovloo_2016_minified_logo') === 'true';
        const fullLogo = document.querySelector('.icon-logo');
        const miniLogo = document.querySelector('.icon-logo-r');

        if (fullLogo && miniLogo) {
            if (useMinifiedLogo) {
                fullLogo.style.display = 'none';
                miniLogo.style.display = 'inline-block';
            } else {
                fullLogo.style.display = 'inline-block';
                miniLogo.style.display = 'none';
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadNavbar);
    } else {
        loadNavbar();
    }

    function initSearchDropdown() {
        const searchInput = document.getElementById('navbar-search-input');
        const searchDropdown = document.getElementById('navbar-search-dropdown');
        const searchBtn = document.getElementById('navbar-search-btn');
        
        if (!searchInput || !searchDropdown) return;

        const queryTextElements = searchDropdown.querySelectorAll('.search-query-text');
        const dropdownItems = searchDropdown.querySelectorAll('.search-dropdown-item');

        searchInput.addEventListener('input', function() {
            const query = this.value.trim();
            
            if (query.length > 0) {

                queryTextElements.forEach(el => {
                    el.textContent = query;
                });
                searchDropdown.classList.add('open');
            } else {
                searchDropdown.classList.remove('open');
            }
        });

        searchInput.addEventListener('focus', function() {
            if (this.value.trim().length > 0) {
                searchDropdown.classList.add('open');
            }
        });

        dropdownItems.forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const searchType = this.dataset.searchType;
                const query = searchInput.value.trim();
                
                if (query.length > 0) {
                    performSearch(query, searchType);
                }
                
                searchDropdown.classList.remove('open');
            });
        });

        if (searchBtn) {
            searchBtn.addEventListener('click', function(e) {
                e.preventDefault();
                const query = searchInput.value.trim();
                
                if (query.length > 0) {
                    performSearch(query, 'games');
                }
                
                searchDropdown.classList.remove('open');
            });
        }

        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = this.value.trim();
                
                if (query.length > 0) {
                    performSearch(query, 'games');
                }
                
                searchDropdown.classList.remove('open');
            }
        });

        document.addEventListener('click', function(e) {
            const searchContainer = document.getElementById('navbar-universal-search');
            if (searchContainer && !searchContainer.contains(e.target)) {
                searchDropdown.classList.remove('open');
            }
        });
    }

    function performSearch(query, searchType) {
        const basePath = getBasePath();
        const pagesPath = getPagesPath();
        const encodedQuery = encodeURIComponent(query);

        if (searchType === 'games') {
            const isGamesPage = document.body.dataset.internalPageName === 'Games' || 
                                window.location.pathname.includes('games.html');
            
            if (isGamesPage && window.gamesPageRenderer) {

                window.gamesPageRenderer.searchWithAnimation(query);
                return;
            }
        }
        
        let targetUrl;
        
        switch (searchType) {
            case 'people':
                targetUrl = `${pagesPath}people.html?type=users&q=${encodedQuery}`;
                break;
            case 'games':
                targetUrl = `${pagesPath}games.html?search=${encodedQuery}`;
                break;
            case 'catalog':
                targetUrl = `${pagesPath}catalog.html?search=${encodedQuery}`;
                break;
            case 'groups':
                targetUrl = `${pagesPath}people.html?type=groups&q=${encodedQuery}`;
                break;
            default:
                targetUrl = `${pagesPath}games.html?search=${encodedQuery}`;
        }
        
        window.location.href = targetUrl;
    }

    async function loadCurrentUser() {
        try {
            const api = window.robloxAPI || window.RobloxClient?.api;
            if (!api) return;

            const user = await api.getCurrentUser();
            if (user && (user.name || user.displayName)) {

                const sidebarUsername = document.getElementById('sidebar-username');
                if (sidebarUsername) {
                    sidebarUsername.textContent = user.name || user.displayName;
                }

                await loadCurrencyBalances(user.id);
            }
        } catch (error) {
            console.log('[Navbar] Failed to load current user:', error);
        }
    }

    async function loadCurrencyBalances(userId) {
        try {

            const roblox = window.roblox;
            if (!roblox) {
                console.log('[Navbar] window.roblox not available');
                return;
            }

            if (roblox.getUserCurrency) {
                try {
                              const currencyData = await roblox.getUserCurrency(userId);
                              if (currencyData && typeof currencyData.robux === 'number') {
                                const robuxEl = document.getElementById('navbar-robux-amount');
                                if (robuxEl) {
                                  robuxEl.textContent = formatCurrency(currencyData.robux);
                                }

                                const robuxDropdownEl = document.getElementById('robux-dropdown-amount');
                                if (robuxDropdownEl) {
                                  robuxDropdownEl.textContent = currencyData.robux.toLocaleString();
                                }
                              }
                            } catch (e) {
                              console.log('[Navbar] Failed to load Robux balance:', e);
                            }
                          }

                          if (roblox.reviews?.getUserRating) {
                            try {
                              const rating = await roblox.reviews.getUserRating(userId);
                              const score = rating?.totalScore || 0;
                              const tixEl = document.getElementById('navbar-tix-amount');
                              if (tixEl) {
                                tixEl.textContent = score >= 0 ? `+${score}` : score.toString();
                                tixEl.title = `Rovloo Score: ${score} (${rating?.reviewCount || 0} reviews)`;
                              }

                              const tixDropdownEl = document.getElementById('tix-dropdown-amount');
                              if (tixDropdownEl) {
                                tixDropdownEl.textContent = score.toLocaleString();
                              }
                            } catch (e) {
                              console.log('[Navbar] Failed to load Rovloo score:', e);
                              const tixEl = document.getElementById('navbar-tix-amount');
                              if (tixEl) tixEl.textContent = '0';
                              
                              const tixDropdownEl = document.getElementById('tix-dropdown-amount');
                              if (tixDropdownEl) tixDropdownEl.textContent = '0';
                            }
                          } else {
                            const tixEl = document.getElementById('navbar-tix-amount');
                            if (tixEl) tixEl.textContent = '0';
                            
                            const tixDropdownEl = document.getElementById('tix-dropdown-amount');
                            if (tixDropdownEl) tixDropdownEl.textContent = '0';
                          }        } catch (error) {
            console.log('[Navbar] Failed to load currency balances:', error);
        }
    }

    function formatCurrency(num) {
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

    function updateNavigationButtonStates() {
        const btnBack = document.getElementById('btn-back');
        const btnForward = document.getElementById('btn-forward');

        if (btnBack) {
            // Note: We can't directly check history length, so we'll enable by default
            // and let the browser handle disabled state
            btnBack.disabled = false;
        }

        if (btnForward) {
            btnForward.disabled = false;
        }
    }

    // Keyboard shortcuts for navigation
    document.addEventListener('keydown', function(e) {
        // Alt+Left for back
        if (e.altKey && e.key === 'ArrowLeft') {
            e.preventDefault();
            window.history.back();
        }
        // Alt+Right for forward
        if (e.altKey && e.key === 'ArrowRight') {
            e.preventDefault();
            window.history.forward();
        }
    });
})();

