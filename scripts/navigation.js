


function initNavigation() {

    document.querySelectorAll('.nav-menu-title').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const href = link.getAttribute('href');

            if (href && href.startsWith('#')) {
                const page = href.slice(1);
                navigateTo(page);
            }
        });
    });


    const logo = document.querySelector('.navbar-brand');
    if (logo) {
        logo.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('home');
        });
    }


    const loginLink = document.getElementById('head-login');
    if (loginLink) {
        loginLink.addEventListener('click', (e) => {
            e.preventDefault();
            showLoginModal();
        });
    }


    initSearch();
}

function initSearch() {
    const searchBtn = document.getElementById('navbar-search-btn');
    const searchInput = document.getElementById('navbar-search-input');

    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            performSearch(searchInput.value);
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                performSearch(searchInput.value);
            }
        });
    }
}

function performSearch(query) {
    if (!query || query.trim() === '') return;


    navigateTo('search-users', { keyword: query.trim() });
}

function showLoginModal() {

    if (window.RobloxClient && window.RobloxClient.auth && window.RobloxClient.auth.returnToHub) {
        window.RobloxClient.auth.returnToHub();
    }
}

async function doLogout() {
    if (window.RobloxClient && window.RobloxClient.auth) {
        await window.RobloxClient.auth.returnToHub();
    }
}


if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigation);
} else {
    initNavigation();
}


window.showLoginModal = showLoginModal;
window.doLogout = doLogout;
