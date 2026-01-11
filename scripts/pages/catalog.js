class CatalogPageRenderer {
    constructor() {
        this.currentCategory = 'featured';
        this.currentKeyword = '';
        this.currentPage = 1;
        this.itemsPerPage = 30;
        this.totalItems = 0;
        this.isLoading = false;

        this.currentSortType = '0';
        this.currentSortAggregation = '3';
        this.currentSubcategory = null;
        this.currentGenres = null;
        this.currentCreator = null;
        this.currentPriceFilter = null;
        this.currentPriceMin = null;
        this.currentPriceMax = null;
        this.includeNotForSale = false;
        this.collectiblesOnlyOverride = false;

        this.currentCursor = '';
        this.cursorHistory = [''];
        this.hasMorePages = false;
        
        this.ITEM_PLACEHOLDER = '../images/game-placeholder.png';

        this.sortTypeMap = {
            '0': 0,  
            '1': 1,  
            '2': 2,  
            '3': 3,  
            '4': 5,  
            '5': 4   
        };
        
        this.categoryMap = {
            'featured': { category: 'Featured', subcategory: null, title: 'Featured Items on ROBLOX' },
            'collectibles': { category: 'Collectibles', subcategory: null, title: 'Collectibles', collectiblesOnly: true },
            'all': { category: 'All', subcategory: null, title: 'All Categories' },

            'accessories': { taxonomy: 'wNYJso48d1XnhMyFWT3oX3', title: 'Accessories' },
            'hats': { categoryFilter: 8, title: 'Hats' },
            'hair': { categoryFilter: 41, title: 'Hair' },
            'face-accessories': { categoryFilter: 42, title: 'Face Accessories' },
            'neck': { categoryFilter: 43, title: 'Neck' },
            'shoulder': { categoryFilter: 44, title: 'Shoulder' },
            'front': { categoryFilter: 45, title: 'Front' },
            'back': { categoryFilter: 46, title: 'Back' },
            'waist': { categoryFilter: 47, title: 'Waist' },

            'clothing': { taxonomy: '5G3bZScC9Hxp2D2EUtGSNm', title: 'Clothing' },
            't-shirts': { categoryFilter: 2, title: 'T-Shirts' },
            'shirts': { categoryFilter: 11, title: 'Shirts' },
            'pants': { categoryFilter: 12, title: 'Pants' },

            '3d-clothing': { taxonomy: '5G3bZScC9Hxp2D2EUtGSNm', title: '3D Clothing' },
            '3d-tshirts': { taxonomy: 'fLRqNzGqjX7MzcqeMro9hc', title: '3D T-Shirts' },
            '3d-shirts': { taxonomy: 'pJ71PxerdfEuarTNRtSZYs', title: '3D Shirts' },
            'sweaters': { taxonomy: '31M6WgEMmyq9TTfk3pUUpZ', title: 'Sweaters' },
            'jackets': { taxonomy: 'kPZpEVNdProGcqMbj1jDKJ', title: 'Jackets' },
            '3d-pants': { taxonomy: '1MvRtnnsy2FJWmkErSBxBa', title: '3D Pants' },
            'shorts': { taxonomy: 'etAPg889P243JyjdbZCXhw', title: 'Shorts' },
            'dresses-skirts': { taxonomy: 'oSSCBSqkQPZu6HataAUAxB', title: 'Dresses & Skirts' },
            'bodysuits': { taxonomy: 'u5jaNLyf2ZhvR95GS37ui5', title: 'Bodysuits' },
            'shoes': { taxonomy: 'uLRgNoJ1awZkhpVw9WyvKo', title: 'Shoes' },

            'body-parts': { category: 'BodyParts', subcategory: null, title: 'Body Parts' },
            'heads': { categoryFilter: 17, title: 'Heads' },
            'faces': { categoryFilter: 18, title: 'Faces' },
            'packages': { category: 'BodyParts', subcategory: 'Bundles', title: 'Packages' },

            'gear': { categoryFilter: 19, title: 'Gear' },

            'emotes': { categoryFilter: 61, title: 'Emotes' },
            'animations': { taxonomy: 'whf6kUVBwk2xdwKUmRYN6G', title: 'Animations' }
        };

        this.subcategoryDefinitions = {
            'featured': {
                title: 'Featured Type',
                items: [
                    { name: 'All Featured', category: 'featured' }
                ]
            },
            'collectibles': {
                title: 'Collectible Type',
                items: [
                    { name: 'All Collectibles', category: 'collectibles' },
                    { name: 'Hats', category: 'hats', collectiblesOnly: true },
                    { name: 'Hair', category: 'hair', collectiblesOnly: true },
                    { name: 'Face Accessories', category: 'face-accessories', collectiblesOnly: true },
                    { name: 'Faces', category: 'faces', collectiblesOnly: true },
                    { name: 'Gear', category: 'gear', collectiblesOnly: true }
                ]
            },
            'accessories': {
                title: 'Accessory Type',
                items: [
                    { name: 'All Accessories', category: 'accessories' },
                    { name: 'Hats', category: 'hats' },
                    { name: 'Hair', category: 'hair' },
                    { name: 'Face', category: 'face-accessories' },
                    { name: 'Neck', category: 'neck' },
                    { name: 'Shoulder', category: 'shoulder' },
                    { name: 'Front', category: 'front' },
                    { name: 'Back', category: 'back' },
                    { name: 'Waist', category: 'waist' }
                ]
            },
            'clothing': {
                title: 'Clothing Type',
                items: [
                    { name: 'All Clothing', category: 'clothing' },
                    { name: 'T-Shirts', category: 't-shirts' },
                    { name: 'Shirts', category: 'shirts' },
                    { name: 'Pants', category: 'pants' },
                    { name: '3D T-Shirts', category: '3d-tshirts' },
                    { name: '3D Shirts', category: '3d-shirts' },
                    { name: 'Sweaters', category: 'sweaters' },
                    { name: 'Jackets', category: 'jackets' },
                    { name: '3D Pants', category: '3d-pants' },
                    { name: 'Shorts', category: 'shorts' },
                    { name: 'Dresses & Skirts', category: 'dresses-skirts' },
                    { name: 'Bodysuits', category: 'bodysuits' },
                    { name: 'Shoes', category: 'shoes' }
                ]
            },
            'body-parts': {
                title: 'Body Parts Type',
                items: [
                    { name: 'All Body Parts', category: 'body-parts' },
                    { name: 'Heads', category: 'heads' },
                    { name: 'Faces', category: 'faces' },
                    { name: 'Packages', category: 'packages' }
                ]
            },
            'gear': {
                title: 'Gear Type',
                items: [
                    { name: 'All Gear', category: 'gear' }
                ]
            }
        };
    }

    async init(category = 'featured', keyword = '') {
        if (this.isLoading) return;
        
        this.currentCategory = category;
        this.currentKeyword = keyword;
        
        this.setupEventHandlers();
        this.updateActiveCategory(category);
        this.updateSubcategoryFilters(category);
        
        if (keyword) {
            const searchInput = document.getElementById('keywordTextbox');
            if (searchInput) searchInput.value = keyword;
        }
        
        await this.loadItems();
    }

    setupEventHandlers() {
        document.querySelectorAll('#dropdownUl li[data-category]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.changeCategory(item.dataset.category);
            });
        });

        const searchBtn = document.getElementById('submitSearchButton');
        if (searchBtn) {
            searchBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.performSearch();
            });
        }

        const searchInput = document.getElementById('keywordTextbox');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.performSearch();
                }
            });
        }

        const legendHeader = document.querySelector('#legend .header');
        if (legendHeader) {
            legendHeader.addEventListener('click', () => {
                this.toggleLegend();
            });
        }

        const sortMain = document.getElementById('SortMain');
        const sortAggregation = document.getElementById('SortAggregation');
        
        if (sortMain) {

            if (sortAggregation) {
                sortAggregation.style.display = sortMain.value === '0' ? 'none' : '';
            }
            
            sortMain.addEventListener('change', () => {
                this.currentSortType = sortMain.value;
                this.currentPage = 1;
                this.currentCursor = '';
                this.cursorHistory = [''];
                this.hasMorePages = false;

                if (sortAggregation) {
                    sortAggregation.style.display = sortMain.value === '0' ? 'none' : '';
                }
                
                this.loadItems();
            });
        }

        if (sortAggregation) {
            sortAggregation.addEventListener('change', () => {
                this.currentSortAggregation = sortAggregation.value;
                this.currentPage = 1;
                this.currentCursor = '';
                this.cursorHistory = [''];
                this.hasMorePages = false;
                this.loadItems();
            });
        }

        document.querySelectorAll('.categoryFilter').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const category = link.dataset.category;
                const parentLi = link.parentElement;
                const subcategoryUl = parentLi.querySelector('.subcategoryUl');

                document.querySelectorAll('.subcategoryUl').forEach(ul => {
                    if (ul !== subcategoryUl) {
                        ul.style.display = 'none';
                    }
                });

                if (subcategoryUl) {
                    subcategoryUl.style.display = subcategoryUl.style.display === 'none' ? 'block' : 'none';
                }

                this.currentSubcategory = null;

                this.changeCategory(category);

                document.querySelectorAll('.categoryFilter').forEach(l => l.classList.remove('selected'));
                document.querySelectorAll('.subcategoryFilter').forEach(l => l.classList.remove('selected'));
                link.classList.add('selected');
            });
        });

        document.querySelectorAll('.subcategoryFilter').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const category = link.dataset.category;
                const subcategory = link.dataset.subcategory;
                
                this.currentCategory = category;
                this.currentSubcategory = subcategory;
                this.currentPage = 1;
                this.currentCursor = '';
                this.cursorHistory = [''];
                this.hasMorePages = false;

                document.querySelectorAll('.categoryFilter').forEach(l => l.classList.remove('selected'));
                document.querySelectorAll('.subcategoryFilter').forEach(l => l.classList.remove('selected'));
                link.classList.add('selected');

                const parentCategoryLink = link.closest('.has-subcategories')?.querySelector('.categoryFilter');
                if (parentCategoryLink) {
                    parentCategoryLink.classList.add('selected');
                }

                const titleEl = document.getElementById('CategoryTitle');
                if (titleEl) {
                    titleEl.textContent = link.textContent;
                }
                
                this.loadItems();
            });
        });

        document.querySelectorAll('.creatorFilter').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const creator = link.dataset.creator;
                this.currentCreator = creator === 'all' ? null : creator;
                this.currentPage = 1;
                this.currentCursor = '';
                this.cursorHistory = [''];
                this.hasMorePages = false;
                this.loadItems();

                document.querySelectorAll('.creatorFilter').forEach(l => l.classList.remove('selected'));
                link.classList.add('selected');
            });
        });

        document.querySelectorAll('.priceFilter').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const price = link.dataset.price;
                this.applyPriceRangeFilter(price);

                document.querySelectorAll('.priceFilter').forEach(l => l.classList.remove('selected'));
                link.classList.add('selected');

                const pxMinInput = document.getElementById('pxMinInput');
                const pxMaxInput = document.getElementById('pxMaxInput');
                if (pxMinInput) {
                    pxMinInput.value = 'Min';
                    pxMinInput.classList.add('Watermark');
                }
                if (pxMaxInput) {
                    pxMaxInput.value = 'Max';
                    pxMaxInput.classList.add('Watermark');
                }
            });
        });

        const creatorTextbox = document.getElementById('creatorTextbox');
        const submitCreatorBtn = document.getElementById('submitCreatorButton');
        
        if (creatorTextbox) {
            creatorTextbox.addEventListener('focus', function() {
                if (this.value === 'Name') {
                    this.value = '';
                    this.classList.remove('Watermark');
                }
            });
            creatorTextbox.addEventListener('blur', function() {
                if (this.value === '') {
                    this.value = 'Name';
                    this.classList.add('Watermark');
                }
            });
            creatorTextbox.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.applyCreatorFilter();
                }
            });
        }
        
        if (submitCreatorBtn) {
            submitCreatorBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.applyCreatorFilter();
            });
        }

        document.querySelectorAll('.pxInput').forEach(input => {
            input.addEventListener('focus', function() {
                const watermark = this.dataset.watermarktext;
                if (this.value === watermark) {
                    this.value = '';
                    this.classList.remove('Watermark');
                }
            });
            input.addEventListener('blur', function() {
                const watermark = this.dataset.watermarktext;
                if (this.value === '') {
                    this.value = watermark;
                    this.classList.add('Watermark');
                }
            });
        });

        const submitPxBtn = document.getElementById('submitPxButton');
        if (submitPxBtn) {
            submitPxBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.applyPriceFilter();
            });
        }

        const notForSaleCheckbox = document.getElementById('includeNotForSaleCheckbox');
        if (notForSaleCheckbox) {
            notForSaleCheckbox.addEventListener('change', () => {
                this.includeNotForSale = notForSaleCheckbox.checked;
                this.currentPage = 1;
                this.currentCursor = '';
                this.cursorHistory = [''];
                this.hasMorePages = false;
                this.loadItems();
            });
        }

        document.getElementById('PrevPageBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.changePage(this.currentPage - 1);
        });
        document.getElementById('NextPageBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.changePage(this.currentPage + 1);
        });
    }

    updateGenreFilters() {
        const checkedGenres = [];
        document.querySelectorAll('.genreFilter:checked').forEach(checkbox => {
            checkedGenres.push(checkbox.dataset.genreid);
        });
        this.currentGenres = checkedGenres.length > 0 ? checkedGenres : null;
    }

    applyCreatorFilter() {
        const creatorTextbox = document.getElementById('creatorTextbox');
        if (creatorTextbox && creatorTextbox.value && creatorTextbox.value !== 'Name') {
            this.currentCreator = creatorTextbox.value;
            this.currentPage = 1;
            this.currentCursor = '';
            this.cursorHistory = [''];
            this.hasMorePages = false;
            this.loadItems();
        }
    }

    applyPriceFilter() {
        const minInput = document.getElementById('pxMinInput');
        const maxInput = document.getElementById('pxMaxInput');
        
        const minVal = minInput?.value;
        const maxVal = maxInput?.value;
        
        this.currentPriceMin = (minVal && minVal !== 'Min' && !isNaN(minVal)) ? parseInt(minVal) : null;
        this.currentPriceMax = (maxVal && maxVal !== 'Max' && !isNaN(maxVal)) ? parseInt(maxVal) : null;
        this.currentPriceFilter = null; 

        document.querySelectorAll('.priceFilter').forEach(l => l.classList.remove('selected'));
        const anyPriceLink = document.querySelector('.priceFilter[data-price="all"]');
        if (anyPriceLink && this.currentPriceMin === null && this.currentPriceMax === null) {
            anyPriceLink.classList.add('selected');
        }
        
        this.currentPage = 1;
        this.currentCursor = '';
        this.cursorHistory = [''];
        this.hasMorePages = false;
        this.loadItems();
    }

    applyPriceRangeFilter(priceRange) {
        this.currentPriceFilter = priceRange;

        if (priceRange === 'all') {
            this.currentPriceMin = null;
            this.currentPriceMax = null;
        } else if (priceRange === 'free') {
            this.currentPriceMin = 0;
            this.currentPriceMax = 0;
        } else if (priceRange.endsWith('+')) {

            this.currentPriceMin = parseInt(priceRange.replace('+', ''));
            this.currentPriceMax = null;
        } else if (priceRange.includes('-')) {

            const [min, max] = priceRange.split('-').map(v => parseInt(v));
            this.currentPriceMin = min;
            this.currentPriceMax = max;
        }
        
        this.currentPage = 1;
        this.currentCursor = '';
        this.cursorHistory = [''];
        this.hasMorePages = false;
        this.loadItems();
    }

    toggleLegend() {
        const legendHeader = document.querySelector('#legend .header');
        const legendContent = document.getElementById('legendcontent');
        
        if (!legendHeader || !legendContent) return;
        
        if (legendHeader.classList.contains('expanded')) {

            legendHeader.classList.remove('expanded');
            legendContent.style.display = 'none';
        } else {

            legendHeader.classList.add('expanded');
            legendContent.style.display = 'block';
        }
    }

    async changeCategory(category) {
        if (category === this.currentCategory && !this.currentKeyword) return;
        
        this.currentCategory = category;
        this.currentPage = 1;
        this.currentKeyword = '';

        this.currentCursor = '';
        this.cursorHistory = [''];
        this.hasMorePages = false;

        this.currentSubcategory = null;
        this.currentGenres = null;
        this.currentCreator = null;
        this.currentPriceFilter = null;
        this.currentPriceMin = null;
        this.currentPriceMax = null;
        this.collectiblesOnlyOverride = false;

        const searchInput = document.getElementById('keywordTextbox');
        if (searchInput) searchInput.value = '';
        
        document.querySelectorAll('.genreFilter').forEach(cb => cb.checked = false);
        document.querySelectorAll('.assetTypeFilter').forEach(l => l.classList.remove('selected'));
        document.querySelectorAll('.creatorFilter').forEach(l => l.classList.remove('selected'));
        document.querySelectorAll('.priceFilter').forEach(l => l.classList.remove('selected'));

        const allCreatorsLink = document.querySelector('.creatorFilter[data-creator="all"]');
        if (allCreatorsLink) allCreatorsLink.classList.add('selected');
        
        const creatorInput = document.getElementById('creatorTextbox');
        if (creatorInput) {
            creatorInput.value = 'Name';
            creatorInput.classList.add('Watermark');
        }
        
        const pxMinInput = document.getElementById('pxMinInput');
        const pxMaxInput = document.getElementById('pxMaxInput');
        if (pxMinInput) {
            pxMinInput.value = 'Min';
            pxMinInput.classList.add('Watermark');
        }
        if (pxMaxInput) {
            pxMaxInput.value = 'Max';
            pxMaxInput.classList.add('Watermark');
        }

        this.updateSubcategoryFilters(category);
        
        this.updateActiveCategory(category);
        await this.loadItems();
    }

    updateSubcategoryFilters(category) {
        const subcategoryFilters = document.getElementById('subcategoryFilters');
        const subcategoryTitle = document.getElementById('subcategoryTitle');
        const subcategoryUl = document.getElementById('subcategoryUl');
        
        if (!subcategoryFilters || !subcategoryUl) return;
        
        const definition = this.subcategoryDefinitions[category];
        
        if (!definition) {

            subcategoryFilters.style.display = 'none';
            return;
        }

        if (subcategoryTitle) {
            subcategoryTitle.textContent = definition.title;
        }

        let html = '';
        definition.items.forEach((item, index) => {
            const selectedClass = index === 0 ? ' selected' : '';
            const collectiblesAttr = item.collectiblesOnly ? ' data-collectibles="true"' : '';
            html += `<li><a href="#subcategory=${encodeURIComponent(item.name)}" class="assetTypeFilter${selectedClass}" data-category="${item.category}"${collectiblesAttr}>${item.name}</a></li>\n`;
        });
        
        subcategoryUl.innerHTML = html;

        subcategoryFilters.style.display = 'block';

        subcategoryUl.querySelectorAll('.assetTypeFilter').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleSubcategoryClick(link);
            });
        });
    }

    handleSubcategoryClick(link) {
        const categoryKey = link.dataset.category;
        const collectiblesOnly = link.dataset.collectibles === 'true';

        document.querySelectorAll('#subcategoryUl .assetTypeFilter').forEach(l => l.classList.remove('selected'));
        link.classList.add('selected');

        this.currentCategory = categoryKey;
        this.collectiblesOnlyOverride = collectiblesOnly; 
        this.currentPage = 1;
        this.currentCursor = '';
        this.cursorHistory = [''];
        this.hasMorePages = false;

        const titleEl = document.getElementById('CategoryTitle');
        if (titleEl) {
            const categoryInfo = this.categoryMap[categoryKey];
            titleEl.textContent = categoryInfo?.title || link.textContent;
            titleEl.style.fontSize = '16px';
            titleEl.style.fontWeight = 'bold';
        }

        this.loadItems();
    }

    updateActiveCategory(category) {
        document.querySelectorAll('#dropdownUl li a').forEach(a => a.classList.remove('selected'));
        const activeItem = document.querySelector(`#dropdownUl li[data-category="${category}"] > a`);
        if (activeItem) activeItem.classList.add('selected');

        const titleEl = document.getElementById('CategoryTitle');
        const itemCountSortRow = document.getElementById('ItemCountSortRow');
        
        if (titleEl) {
            const info = this.categoryMap[category];
            const titleText = this.currentKeyword 
                ? `Search Results for "${this.currentKeyword}"` 
                : (info?.title || 'Catalog');
            titleEl.textContent = titleText;

            const isFeatured = category === 'featured' && !this.currentKeyword;
            titleEl.style.fontSize = isFeatured ? '' : '16px';
            titleEl.style.fontWeight = isFeatured ? '' : 'bold';

            if (itemCountSortRow) {
                itemCountSortRow.style.display = isFeatured ? 'none' : 'block';
            }
        }
    }

    updateItemCount(itemCount) {
        const itemCountEl = document.getElementById('ItemCountDisplay');
        const itemCountSortRow = document.getElementById('ItemCountSortRow');
        const isFeatured = this.currentCategory === 'featured' && !this.currentKeyword;
        
        if (itemCountSortRow) {
            itemCountSortRow.style.display = isFeatured ? 'none' : 'block';
        }
        
        if (itemCountEl && !isFeatured) {
            itemCountEl.textContent = `Showing 1 to ${itemCount} items`;
        }
    }

    async performSearch() {
        const keyword = document.getElementById('keywordTextbox')?.value?.trim() || '';
        if (!keyword) return;

        const categoryDropdown = document.getElementById('categoriesForKeyword');
        const selectedCategory = categoryDropdown?.value || 'all';
        
        this.currentKeyword = keyword;
        this.currentCategory = selectedCategory;
        this.currentPage = 1;
        this.currentCursor = '';
        this.cursorHistory = [''];
        this.hasMorePages = false;

        this.currentSubcategory = null;
        
        const titleEl = document.getElementById('CategoryTitle');
        if (titleEl) {
            const categoryInfo = this.categoryMap[selectedCategory];
            const categoryName = categoryInfo?.title || 'All Categories';
            titleEl.textContent = `Search Results for "${keyword}" in ${categoryName}`;
            titleEl.style.fontSize = '16px';
            titleEl.style.fontWeight = 'bold';
        }

        this.updateActiveCategory(selectedCategory);
        this.updateSubcategoryFilters(selectedCategory);
        
        await this.loadItems();
    }

    async changePage(page) {
        if (this.isLoading) return;
        
        if (page < 1) return;
        if (page > this.currentPage && !this.hasMorePages) return;

        if (page < this.currentPage) {
            this.currentPage = page;
            this.currentCursor = this.cursorHistory[page - 1] || '';
        } else {
            this.currentPage = page;
        }
        
        await this.loadItems();
    }

    async loadItems() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        const container = document.getElementById('CatalogItemsContainer');
        const loadingEl = document.getElementById('CatalogLoading');
        
        if (loadingEl) loadingEl.style.display = 'block';

        try {
            const api = window.roblox || window.robloxAPI;
            if (!api?.searchCatalog) {
                throw new Error('Catalog API not available');
            }

            const categoryInfo = this.categoryMap[this.currentCategory] || { category: 'Featured' };

            const sortType = this.sortTypeMap[this.currentSortType] ?? 0;

            let sortAggregation = null;
            if (this.currentSortType === '1' || this.currentSortType === '2') {

                sortAggregation = parseInt(this.currentSortAggregation) || 3;
            }
            
            let result;

            if (this.currentCategory === 'all') {
                result = await this.loadAllCategoriesMixed(api, sortType, sortAggregation);
            } else {
                const params = {
                    category: categoryInfo.category,
                    subcategory: categoryInfo.subcategory || this.currentSubcategory || '',
                    categoryFilter: categoryInfo.categoryFilter || null,
                    taxonomy: categoryInfo.taxonomy || '',
                    keyword: this.currentKeyword || '',
                    sortType: sortType,
                    sortAggregation: sortAggregation,
                    limit: this.itemsPerPage,
                    cursor: this.cursorHistory[this.currentPage - 1] || '',
                    collectiblesOnly: categoryInfo.collectiblesOnly || this.collectiblesOnlyOverride || false,
                    creatorName: this.currentCreator || '',
                    minPrice: this.currentPriceMin,
                    maxPrice: this.currentPriceMax
                };
                
                console.log('[CatalogPage] Loading with params:', params);
                
                result = await api.searchCatalog(params);
            }
            
            console.log('[CatalogPage] Result:', result);
            
            if (loadingEl) loadingEl.style.display = 'none';
            
            if (result?.data?.length > 0) {

                if (result.nextPageCursor) {
                    this.currentCursor = result.nextPageCursor;

                    if (this.cursorHistory.length <= this.currentPage) {
                        this.cursorHistory.push(this.currentCursor);
                    } else {
                        this.cursorHistory[this.currentPage] = this.currentCursor;
                    }
                    this.hasMorePages = true;
                } else {
                    this.currentCursor = '';
                    this.hasMorePages = false;
                }
                
                this.totalItems = result.totalResults || (this.hasMorePages ? (this.currentPage + 1) * this.itemsPerPage : this.currentPage * result.data.length);
                
                this.renderItems(result.data, container);
                this.updatePagination();
                this.updateItemCount(result.data.length);
                await this.loadItemThumbnails(result.data);
            } else {
                this.hasMorePages = false;
                this.showEmptyState(container);
                this.updateItemCount(0);
            }
        } catch (error) {
            console.error('[CatalogPage] Load failed:', error);
            if (loadingEl) loadingEl.style.display = 'none';
            this.showError(container, error.message);
        } finally {
            this.isLoading = false;
        }
    }

    async loadAllCategoriesMixed(api, sortType, sortAggregation) {

        const categories = [
            { categoryFilter: 8 },   
            { categoryFilter: 41 },  
            { categoryFilter: 46 },  
            { categoryFilter: 18 },  
            { categoryFilter: 11 },  
            { categoryFilter: 12 },  
        ];

        const itemsPerCategory = 30;

        console.log('[CatalogPage] Loading All Categories with parallel requests');
        const startTime = Date.now();
        
        const promises = categories.map(async (cat) => {
            try {
                const params = {
                    categoryFilter: cat.categoryFilter || null,
                    subcategory: cat.subcategory || '',
                    taxonomy: cat.taxonomy || '',
                    keyword: this.currentKeyword || '',
                    sortType: sortType,
                    sortAggregation: sortAggregation,
                    limit: itemsPerCategory,
                    cursor: '',
                    creatorName: this.currentCreator || '',
                    minPrice: this.currentPriceMin,
                    maxPrice: this.currentPriceMax
                };
                
                const result = await api.searchCatalog(params);
                return result?.data || [];
            } catch (e) {
                console.warn(`[CatalogPage] Failed to fetch category:`, cat, e);
                return [];
            }
        });
        
        const results = await Promise.all(promises);
        console.log(`[CatalogPage] Parallel fetch completed in ${Date.now() - startTime}ms`);

        const seenIds = new Set();
        let allItems = [];

        const maxLength = Math.max(...results.map(r => r.length));
        for (let i = 0; i < maxLength; i++) {
            for (const categoryItems of results) {
                if (i < categoryItems.length) {
                    const item = categoryItems[i];
                    const itemId = item.id || item.assetId;
                    if (itemId && !seenIds.has(itemId)) {
                        seenIds.add(itemId);
                        allItems.push(item);
                    }
                }
            }
        }

        const startIdx = (this.currentPage - 1) * this.itemsPerPage;
        const pageItems = allItems.slice(startIdx, startIdx + this.itemsPerPage);

        const hasMore = allItems.length > startIdx + this.itemsPerPage;
        
        return {
            data: pageItems,
            nextPageCursor: hasMore ? 'mixed_' + (this.currentPage + 1) : null,
            totalResults: allItems.length
        };
    }

    renderItems(items, container) {
        if (!container) return;
        
        const loadingEl = document.getElementById('CatalogLoading');
        let html = loadingEl ? loadingEl.outerHTML : '';

        const showBigItems = this.currentCategory === 'featured' && !this.currentKeyword && this.currentPage === 1;

        const itemsToRender = showBigItems ? items.slice(0, -2) : items;
        
        itemsToRender.forEach((item, index) => {
            html += this.renderItemCard(item, showBigItems && index < 4);

            if (showBigItems && index === 3) {
                html += '<div style="clear:both;"></div>';
            }
        });
        
        container.innerHTML = html;
    }

    renderItemCard(item, isBig = false) {

        const itemId = item.id || item.assetId || item.itemId;
        const itemType = item.itemType || 'Asset';
        const isBundle = itemType === 'Bundle';
        const typeParam = isBundle ? '&type=bundle' : '';

        const hasLimitedRestriction = item.itemRestrictions?.includes('Limited');
        const hasLimitedUniqueRestriction = item.itemRestrictions?.includes('LimitedUnique');
        const hasCollectibleRestriction = item.itemRestrictions?.includes('Collectible');
        
        const isLimitedUnique = item.isLimitedUnique || 
            item.collectibleItemType === 'LimitedUnique' || 
            hasLimitedUniqueRestriction ||
            hasCollectibleRestriction;
        
        const isLimited = !isLimitedUnique && (
            item.isLimited || 
            item.collectibleItemType === 'Limited' || 
            hasLimitedRestriction
        );
        
        const isBCOnly = item.itemRestrictions?.includes('BuildersClubOnly');
        const isNew = item.isNew || false;

        let displayPrice = item.price;
        let priceLabel = '';

        if (isLimited || isLimitedUnique) {
            if (item.lowestPrice && item.lowestPrice > 0) {
                displayPrice = item.lowestPrice;
                priceLabel = 'Lowest Price';
            } else if (item.lowestResalePrice && item.lowestResalePrice > 0) {
                displayPrice = item.lowestResalePrice;
                priceLabel = 'Lowest Price';
            }
        }

        let priceHtml = '';
        if (displayPrice === 0) {
            priceHtml = '<span class="NotAPrice">Free</span>';
        } else if (displayPrice === null || displayPrice === undefined) {
            priceHtml = '<span class="NotAPrice">Off Sale</span>';
        } else {
            priceHtml = `<span class="robux">${displayPrice.toLocaleString()}</span>`;
        }

        if (priceLabel) {
            priceHtml += `<div class="price-label" style="font-size:10px;color:#666;font-style:italic;">${priceLabel}</div>`;
        }

        let remainingHtml = '';
        if (isLimitedUnique && item.unitsAvailableForConsumption !== undefined) {
            remainingHtml = `<div class="remaining-count" style="font-size:10px;color:#cc0000;">Remaining: ${item.unitsAvailableForConsumption.toLocaleString()}</div>`;
        }

        let overlays = '';
        if (isNew) {
            overlays += '<img src="../images/Overlays/overlay_new.png" alt="New"/>';
        }
        if (isLimitedUnique) {
            overlays += '<img src="../images/limitedu-minified-legend.png" alt="Limited Unique" class="limited-overlay"/>';
        } else if (isLimited) {
            overlays += '<img src="../images/limited-minified-legend.png" alt="Limited" class="limited-overlay"/>';
        }
        if (isBCOnly) {
            overlays += '<img src="../images/bc-minified-legend.png" alt="Builders Club" class="bc-overlay"/>';
        }

        const outerClass = isBig ? 'BigOuter' : 'CatalogItemOuter';
        const viewClass = isBig ? 'BigView' : 'SmallCatalogItemView';
        const innerClass = isBig ? 'BigInner' : 'CatalogItemInner';
        const imageClass = isBig ? 'image-large' : 'image-small';

        return `<div class="${outerClass}" data-item-type="${itemType}" data-item-id="${itemId}">
<div class="${viewClass}">
<div class="${innerClass}">
<div class="roblox-item-image ${imageClass}" data-item-id="${itemId}" data-item-type="${itemType}">
<div class="item-image-wrapper">
<a href="item.html?id=${itemId}${typeParam}" data-item-id="${itemId}">
<img src="${this.ITEM_PLACEHOLDER}" alt="${this.escapeHtml(item.name)}" title="${this.escapeHtml(item.name)}" data-item-id="${itemId}" data-item-type="${itemType}" class="original-image"/>
</a>
${overlays}
</div>
</div>
<div id="textDisplay">
<div class="CatalogItemName"><a href="item.html?id=${itemId}${typeParam}" title="${this.escapeHtml(item.name)}">${this.escapeHtml(item.name)}</a></div>
${priceHtml}
${remainingHtml}
</div>
<div class="CatalogHoverContent">
<div><span class="CatalogItemInfoLabel">Creator:</span><span class="HoverInfo">${this.escapeHtml(item.creatorName || 'ROBLOX')}</span></div>
</div>
</div>
</div>
</div>`;
    }

    async loadItemThumbnails(items) {
        const api = window.roblox;
        if (!api) return;

        try {

            const assetItems = items.filter(i => i.itemType !== 'Bundle');
            const bundleItems = items.filter(i => i.itemType === 'Bundle');

            if (assetItems.length > 0 && api.getAssetThumbnails) {
                const ids = assetItems.map(i => i.id || i.assetId || i.itemId).filter(Boolean);
                const result = await api.getAssetThumbnails(ids, '150x150');
                
                if (result?.data) {
                    result.data.forEach(t => {
                        if (t.imageUrl && t.targetId) {
                            document.querySelectorAll(`img[data-item-id="${t.targetId}"]`).forEach(img => {
                                img.src = t.imageUrl;
                            });
                        }
                    });
                }
            }

            if (bundleItems.length > 0 && api.getBundleThumbnails) {
                const ids = bundleItems.map(i => i.id || i.assetId || i.itemId).filter(Boolean);
                const result = await api.getBundleThumbnails(ids, '150x150');
                
                if (result?.data) {
                    result.data.forEach(t => {
                        if (t.imageUrl && t.targetId) {
                            document.querySelectorAll(`img[data-item-id="${t.targetId}"]`).forEach(img => {
                                img.src = t.imageUrl;
                            });
                        }
                    });
                }
            }

            await this.fetchLimitedItemEconomyData(items);
        } catch (e) {
            console.error('[CatalogPage] Thumbnail load failed:', e);
        }
    }

    async fetchLimitedItemEconomyData(items) {
        const api = window.roblox;
        if (!api?.getAssetEconomyDetails) return;

        const limitedItems = items.filter(item => {
            const hasLimitedRestriction = item.itemRestrictions?.includes('Limited') || 
                item.itemRestrictions?.includes('LimitedUnique') ||
                item.itemRestrictions?.includes('Collectible');
            const isLimited = item.isLimited || item.isLimitedUnique ||
                item.collectibleItemType === 'Limited' || item.collectibleItemType === 'LimitedUnique' ||
                hasLimitedRestriction;

            return isLimited && !item.lowestPrice && !item.lowestResalePrice;
        });
        
        if (limitedItems.length === 0) return;
        
        console.log('[CatalogPage] Fetching economy data for', limitedItems.length, 'limited items');

        for (const item of limitedItems) {
            const itemId = item.id || item.assetId || item.itemId;
            if (!itemId) continue;
            
            try {
                const economyData = await api.getAssetEconomyDetails(itemId);
                
                if (economyData) {
                    const isLimitedUnique = economyData.IsLimitedUnique || economyData.isLimitedUnique;
                    const lowestPrice = economyData.LowestSellerPrice ?? economyData.lowestSellerPrice;
                    const remaining = economyData.Remaining ?? economyData.remaining;

                    this.applyEconomyDataToDOM(itemId, {
                        isLimited: economyData.IsLimited || economyData.isLimited,
                        isLimitedUnique: isLimitedUnique,
                        lowestSellerPrice: lowestPrice,
                        remaining: remaining
                    });
                }
            } catch (e) {
                console.warn('[CatalogPage] Failed to fetch economy data for item', itemId, e);
            }
        }
    }

    applyEconomyDataToDOM(itemId, data) {
        const itemEl = document.querySelector(`.CatalogItemOuter[data-item-id="${itemId}"], .BigOuter[data-item-id="${itemId}"]`);
        if (!itemEl) return;
        
        const isLimited = data.isLimited || data.isLimitedUnique;

        if (isLimited && data.lowestSellerPrice && data.lowestSellerPrice > 0) {
            const priceEl = itemEl.querySelector('.robux, .NotAPrice');
            if (priceEl) {
                priceEl.className = 'robux';
                priceEl.textContent = data.lowestSellerPrice.toLocaleString();
            }

            const textDisplay = itemEl.querySelector('#textDisplay');
            if (textDisplay && !textDisplay.querySelector('.price-label')) {
                const label = document.createElement('div');
                label.className = 'price-label';
                label.style.cssText = 'font-size:10px;color:#666;font-style:italic;';
                label.textContent = 'Lowest Price';
                textDisplay.appendChild(label);
            }
        }

        if (data.isLimitedUnique && data.remaining !== undefined && data.remaining !== null) {
            const textDisplay = itemEl.querySelector('#textDisplay');
            if (textDisplay && !textDisplay.querySelector('.remaining-count')) {
                const remainingEl = document.createElement('div');
                remainingEl.className = 'remaining-count';
                remainingEl.style.cssText = 'font-size:10px;color:#cc0000;';
                remainingEl.textContent = `Remaining: ${data.remaining.toLocaleString()}`;
                textDisplay.appendChild(remainingEl);
            }
        }

        if (data.isLimitedUnique) {
            const imageWrapper = itemEl.querySelector('.item-image-wrapper');
            if (imageWrapper && !imageWrapper.querySelector('.limited-overlay')) {
                const overlay = document.createElement('img');
                overlay.src = '../images/limitedu-minified-legend.png';
                overlay.alt = 'Limited Unique';
                overlay.className = 'limited-overlay';
                imageWrapper.appendChild(overlay);
            }
        } else if (data.isLimited) {
            const imageWrapper = itemEl.querySelector('.item-image-wrapper');
            if (imageWrapper && !imageWrapper.querySelector('.limited-overlay')) {
                const overlay = document.createElement('img');
                overlay.src = '../images/limited-minified-legend.png';
                overlay.alt = 'Limited';
                overlay.className = 'limited-overlay';
                imageWrapper.appendChild(overlay);
            }
        }
    }

    updatePagination() {
        const el = document.getElementById('CatalogPagination');

        const showPagination = this.currentPage > 1 || this.hasMorePages;
        
        if (!el || !showPagination) {
            if (el) el.style.display = 'none';
            return;
        }
        
        el.style.display = 'block';
        
        const prev = document.getElementById('PrevPageBtn');
        const next = document.getElementById('NextPageBtn');
        const pageInfo = document.getElementById('PageInfo');

        if (prev) {
            if (this.currentPage <= 1) {
                prev.classList.add('disabled');
                prev.style.pointerEvents = 'none';
            } else {
                prev.classList.remove('disabled');
                prev.style.pointerEvents = '';
            }
        }
        if (next) {
            if (!this.hasMorePages) {
                next.classList.add('disabled');
                next.style.pointerEvents = 'none';
            } else {
                next.classList.remove('disabled');
                next.style.pointerEvents = '';
            }
        }
        if (pageInfo) {
            pageInfo.textContent = `Page ${this.currentPage}`;
        }
    }

    showEmptyState(container) {
        if (!container) return;
        const loadingEl = document.getElementById('CatalogLoading');
        container.innerHTML = (loadingEl?.outerHTML || '') + '<div style="text-align:center;padding:40px;color:#666;">No items found.</div>';
        document.getElementById('CatalogPagination')?.style.setProperty('display', 'none');
    }

    showError(container, message) {
        if (!container) return;
        const loadingEl = document.getElementById('CatalogLoading');
        container.innerHTML = (loadingEl?.outerHTML || '') + `<div style="text-align:center;padding:40px;color:#c00;">Error: ${this.escapeHtml(message)}</div>`;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

if (typeof window !== 'undefined') {
    window.CatalogPageRenderer = CatalogPageRenderer;
    window.catalogPageRenderer = null;
    
    window.initCatalogPage = async function(category, keyword) {
        if (!window.catalogPageRenderer) {
            window.catalogPageRenderer = new CatalogPageRenderer();
        }
        await window.catalogPageRenderer.init(category, keyword);
    };
}

