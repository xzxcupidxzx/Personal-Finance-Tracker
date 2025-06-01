/**
 * FINANCIAL APP - MAIN APPLICATION CONTROLLER - FIXED VERSION
 * Handles app initialization, navigation, and global state management
 */

class FinancialApp {
    constructor() {
        this.currentTab = 'transactions';
        this.isInitialized = false;
        this.data = {
            transactions: [],
            incomeCategories: [],
            expenseCategories: [],
            accounts: [],
            settings: {},
            reconciliationHistory: [] // Thêm lịch sử đối soát
        };

        // Event listeners tracking for cleanup
        this.eventListeners = [];

        // Default data - FIXED: Complete default categories
        this.defaultData = {
            incomeCategories: [
                { value: "Lương", text: "Lương" },
                { value: "Thưởng", text: "Thưởng" },
                { value: "Tiền được trả nợ", text: "Tiền được trả nợ" },
                { value: "Lãi tiết kiệm", text: "Lãi tiết kiệm" },
                { value: "Thu nhập từ đầu tư", text: "Thu nhập từ đầu tư" },
                { value: "Thu nhập phụ", text: "Thu nhập phụ" },
                { value: "Thu nhập khác", text: "Thu nhập khác" },
                // System categories will be ensured by ensureTransferCategories/ensureAdjustmentCategories
            ],
            expenseCategories: [
                { value: "Ăn uống", text: "Ăn uống" },
                { value: "Đi lại", text: "Đi lại" },
                { value: "Nhà ở", text: "Nhà ở" },
                { value: "Hóa đơn", text: "Hóa đơn (Điện, nước, internet)" },
                { value: "Mua sắm", text: "Mua sắm (Quần áo, đồ dùng)" },
                { value: "Giải trí", text: "Giải trí" },
                { value: "Sức khỏe", text: "Sức khỏe" },
                { value: "Giáo dục", "text": "Giáo dục" },
                { value: "Chi cho đầu tư", text: "Chi cho đầu tư" },
                { value: "Trả nợ", text: "Trả nợ" },
                { value: "Chi phí khác", text: "Chi phí khác" },
                // System categories will be ensured by ensureTransferCategories/ensureAdjustmentCategories
            ],
            accounts: [
                { value: "Tiền mặt", text: "Tiền mặt" },
                { value: "Momo", text: "Momo" },
                { value: "Thẻ tín dụng", text: "Thẻ tín dụng" },
                { value: "Techcombank", text: "Techcombank" },
                { value: "BIDV", text: "BIDV" },
                { value: "Khác", text: "Khác" }
            ],
            settings: {
                theme: 'auto',
                defaultCurrency: 'VND',
                usdRate: 25000,
                language: 'vi'
            }
        };
    }

    /**
     * Initialize the application with proper error handling
     */
    async init() {
        try {
            console.log('🚀 Initializing Financial App...');

            // Load data from storage FIRST
            this.loadData();

            // Initialize theme (should be done before other modules)
            Utils.ThemeUtils.initializeTheme();

            // Initialize navigation
            this.initializeNavigation();

            // Initialize all modules with timeout
            const modulesLoaded = await this.initializeModules();
            if (!modulesLoaded) {
                console.warn('Not all modules were successfully loaded.');
            }

            // Update header summary
            this.updateHeaderSummary();

            // Set initialized flag
            this.isInitialized = true;

            console.log('✅ Financial App initialized successfully');

            // Set initial hash if not present and switch tab
            // This logic is moved here from DOMContentLoaded listener to ensure app is ready
            const initialTab = window.location.hash.slice(1);
            if (initialTab && ['transactions', 'history', 'statistics', 'categories', 'settings'].includes(initialTab)) {
                this.switchTab(initialTab);
            } else if (!initialTab || initialTab === '') {
                window.location.hash = 'transactions';
                this.switchTab('transactions');
            }


            // Handle browser back/forward
            window.addEventListener('popstate', () => {
                const hash = window.location.hash.slice(1);
                if (hash && ['transactions', 'history', 'statistics', 'categories', 'settings'].includes(hash)) {
                    this.switchTab(hash);
                } else if (hash === '') {
                    this.switchTab('transactions');
                }
            });

            // Handle theme toggle
            const themeToggle = document.getElementById('darkModeToggleCheckbox');
            if (themeToggle) {
                const themeToggleHandler = () => {
                    Utils.ThemeUtils.toggleTheme();
                };
                themeToggle.addEventListener('change', themeToggleHandler);
                this.eventListeners.push({
                    element: themeToggle,
                    event: 'change',
                    handler: themeToggleHandler
                });
            }

            // Show welcome message for new users
            if (this.data.transactions.length === 0) {
                Utils.UIUtils.showMessage('Chào mừng bạn đến với ứng dụng quản lý tài chính!', 'info', 5000);
            }
			this.handlePWAShortcuts();
        } catch (error) {
            console.error('❌ Failed to initialize app:', error);
            Utils.UIUtils.showMessage('Có lỗi xảy ra khi khởi tạo ứng dụng. Vui lòng tải lại trang.', 'error');
            this.initializeFallbackMode();
        }
    }
    handlePWAShortcuts() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const action = urlParams.get('action');
            
            if (action) {
                console.log('🚀 PWA Shortcut detected:', action);
                
                // Đợi app khởi tạo xong
                setTimeout(() => {
                    this.switchTab('transactions');
                    
                    // Clear URL sau khi xử lý
                    window.history.replaceState({}, '', window.location.pathname);
                    
                    switch (action) {
                        case 'income':
                            this.setTransactionTypeFromShortcut('Thu');
                            Utils.UIUtils.showMessage('💰 Sẵn sàng nhập thu nhập!', 'success', 2000);
                            break;
                            
                        case 'expense':
                            this.setTransactionTypeFromShortcut('Chi');
                            Utils.UIUtils.showMessage('💸 Sẵn sàng nhập chi tiêu!', 'success', 2000);
                            break;
                            
                        case 'transfer':
                            this.setTransactionTypeFromShortcut('Transfer');
                            Utils.UIUtils.showMessage('↔️ Sẵn sàng chuyển tiền!', 'success', 2000);
                            break;
                            
                        default:
                            console.warn('Unknown shortcut action:', action);
                    }
                }, 500);
            }
        } catch (error) {
            console.error('Error handling PWA shortcuts:', error);
        }
    }

    /**
     * Set transaction type from shortcut and focus amount input
     */
    setTransactionTypeFromShortcut(type) {
        try {
            // Set radio button
            const typeRadio = document.querySelector(`input[name="type"][value="${type}"]`);
            if (typeRadio) {
                typeRadio.checked = true;
                typeRadio.dispatchEvent(new Event('change'));
            }
            
            // Focus amount input sau khi UI update
            setTimeout(() => {
                const amountInput = document.getElementById('amount-input');
                if (amountInput) {
                    amountInput.focus();
                    amountInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 200);
            
        } catch (error) {
            console.error('Error setting transaction type from shortcut:', error);
        }
    }
    /**
     * Initialize fallback mode when main initialization fails
     */
    initializeFallbackMode() {
        console.log('🔄 Initializing fallback mode...');
        try {
            // Basic navigation only
            this.initializeNavigation();
            Utils.UIUtils.showMessage('Ứng dụng đang chạy ở chế độ hạn chế. Vui lòng kiểm tra console để biết thêm chi tiết lỗi.', 'warning', 8000);
            document.body.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #ef4444;">
                    <h1>⚠️ Lỗi khởi tạo ứng dụng</h1>
                    <p>Vui lòng tải lại trang hoặc xóa dữ liệu trình duyệt nếu lỗi vẫn tiếp diễn.</p>
                    <button onclick="location.reload()" style="padding: 1rem 2rem; margin: 1rem; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer;">
                        Tải lại trang
                    </button>
                    <button onclick="localStorage.clear(); location.reload()" style="padding: 1rem 2rem; margin: 1rem; background: #ef4444; color: white; border: none; border-radius: 8px; cursor: pointer;">
                        Xóa dữ liệu & Tải lại
                    </button>
                </div>
            `;
        } catch (error) {
            console.error('Even fallback mode failed:', error);
            document.body.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #ef4444;">
                    <h1>❌ Lỗi nghiêm trọng!</h1>
                    <p>Ứng dụng không thể khởi động.</p>
                </div>
            `;
        }
    }

    /**
     * Load data from localStorage with better validation - FIXED
     */
    loadData() {
        console.log('📂 Loading data from storage...');

        try {
            // Load transactions with validation
            const transactions = Utils.StorageUtils.load(Utils.CONFIG.STORAGE_KEYS.TRANSACTIONS, []);
            this.data.transactions = Array.isArray(transactions) ? transactions : [];

            // FIXED: Load categories with proper fallback to defaults
            const incomeCategories = Utils.StorageUtils.load(
                Utils.CONFIG.STORAGE_KEYS.INCOME_CATEGORIES,
                []
            );
            // If empty or invalid, use defaults
            if (!Array.isArray(incomeCategories) || incomeCategories.length === 0) {
                this.data.incomeCategories = [...this.defaultData.incomeCategories];
                console.log('📝 Using default income categories');
            } else {
                this.data.incomeCategories = [...incomeCategories];
            }

            const expenseCategories = Utils.StorageUtils.load(
                Utils.CONFIG.STORAGE_KEYS.EXPENSE_CATEGORIES,
                []
            );
            // If empty or invalid, use defaults
            if (!Array.isArray(expenseCategories) || expenseCategories.length === 0) {
                this.data.expenseCategories = [...this.defaultData.expenseCategories];
                console.log('📝 Using default expense categories');
            } else {
                this.data.expenseCategories = [...expenseCategories];
            }

            // Ensure transfer and adjustment categories exist (AFTER loading/setting initial categories)
            this.ensureTransferCategories();
            this.ensureAdjustmentCategories();

            // Load accounts with validation
            const accounts = Utils.StorageUtils.load(Utils.CONFIG.STORAGE_KEYS.ACCOUNTS, []);
            if (!Array.isArray(accounts) || accounts.length === 0) {
                this.data.accounts = [...this.defaultData.accounts];
                console.log('📝 Using default accounts');
            } else {
                this.data.accounts = accounts;
            }

            // Load settings with validation
            const settings = Utils.StorageUtils.load(Utils.CONFIG.STORAGE_KEYS.SETTINGS, {});
            this.data.settings = {
                ...this.defaultData.settings,
                ...(typeof settings === 'object' && settings !== null ? settings : {})
            };

            // Load reconciliation history
            const reconciliationHistory = Utils.StorageUtils.load(Utils.CONFIG.STORAGE_KEYS.RECONCILIATION_HISTORY, []);
            this.data.reconciliationHistory = Array.isArray(reconciliationHistory) ? reconciliationHistory : [];


            // Validate and update USD rate
            if (this.data.settings.usdRate) {
                const rate = parseFloat(this.data.settings.usdRate);
                if (!isNaN(rate) && rate >= Utils.CONFIG.USD_RATE_MIN && rate <= Utils.CONFIG.USD_RATE_MAX) {
                    Utils.CONFIG.USD_TO_VND_RATE = rate;
                } else {
                    Utils.CONFIG.USD_TO_VND_RATE = this.defaultData.settings.usdRate;
                    this.data.settings.usdRate = this.defaultData.settings.usdRate;
                }
            }

            // IMPORTANT: Save data after loading defaults to persist them
            this.saveData();

            console.log(`📊 Loaded ${this.data.transactions.length} transactions`);
            console.log(`🏷️ Loaded ${this.data.incomeCategories.length} income categories`);
            console.log(`🏷️ Loaded ${this.data.expenseCategories.length} expense categories`);
            console.log(`🏦 Loaded ${this.data.accounts.length} accounts`);
            console.log(`📜 Loaded ${this.data.reconciliationHistory.length} reconciliation history items`);


        } catch (error) {
            console.error('Error loading data:', error);

            // Reset to defaults on error
            this.data = {
                transactions: [],
                incomeCategories: [...this.defaultData.incomeCategories],
                expenseCategories: [...this.defaultData.expenseCategories],
                accounts: [...this.defaultData.accounts],
                settings: { ...this.defaultData.settings },
                reconciliationHistory: [] // Reset history as well
            };

            this.ensureTransferCategories();
            this.ensureAdjustmentCategories();
            Utils.CONFIG.USD_TO_VND_RATE = this.defaultData.settings.usdRate;

            Utils.UIUtils.showMessage('Có lỗi khi tải dữ liệu, đã khôi phục mặc định', 'warning');

            // Save default data
            this.saveData();
        }
    }

    /**
     * Ensure transfer categories exist in the data
     */
    ensureTransferCategories() {
        const transferIn = { value: Utils.CONFIG.TRANSFER_CATEGORY_IN, text: "Nhận tiền chuyển khoản", system: true };
        const transferOut = { value: Utils.CONFIG.TRANSFER_CATEGORY_OUT, text: "Chuyển tiền đi", system: true };

        // Ensure income category for transfer in
        if (!this.data.incomeCategories.some(cat => cat && cat.value === transferIn.value)) {
            this.data.incomeCategories.push(transferIn);
            console.log('Added missing income transfer category.');
        } else {
            // Ensure existing system category has 'system: true' property
            const existing = this.data.incomeCategories.find(cat => cat && cat.value === transferIn.value);
            if (existing && !existing.system) existing.system = true;
        }


        // Ensure expense category for transfer out
        if (!this.data.expenseCategories.some(cat => cat && cat.value === transferOut.value)) {
            this.data.expenseCategories.push(transferOut);
            console.log('Added missing expense transfer category.');
        } else {
            // Ensure existing system category has 'system: true' property
            const existing = this.data.expenseCategories.find(cat => cat && cat.value === transferOut.value);
            if (existing && !existing.system) existing.system = true;
        }
    }

    /**
     * Ensure reconciliation adjustment categories exist in the data
     */
    ensureAdjustmentCategories() {
        const adjustIncome = { value: Utils.CONFIG.RECONCILE_ADJUST_INCOME_CAT, text: "Điều chỉnh Đối Soát (Thu)", system: true };
        const adjustExpense = { value: Utils.CONFIG.RECONCILE_ADJUST_EXPENSE_CAT, text: "Điều chỉnh Đối Soát (Chi)", system: true };

        // Ensure income category for reconciliation adjustment
        if (!this.data.incomeCategories.some(cat => cat && cat.value === adjustIncome.value)) {
            this.data.incomeCategories.push(adjustIncome);
            console.log('Added missing income adjustment category.');
        } else {
            const existing = this.data.incomeCategories.find(cat => cat && cat.value === adjustIncome.value);
            if (existing && !existing.system) existing.system = true;
        }

        // Ensure expense category for reconciliation adjustment
        if (!this.data.expenseCategories.some(cat => cat && cat.value === adjustExpense.value)) {
            this.data.expenseCategories.push(adjustExpense);
            console.log('Added missing expense adjustment category.');
        } else {
            const existing = this.data.expenseCategories.find(cat => cat && cat.value === adjustExpense.value);
            if (existing && !existing.system) existing.system = true;
        }
    }

    /**
     * Wait for all modules to be loaded with timeout
     */
    waitForModules() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds with 100ms intervals

            const checkModules = () => {
                attempts++;

                // Check if all modules are available
                if (window.TransactionsModule &&
                    window.HistoryModule &&
                    window.StatisticsModule &&
                    window.CategoriesModule &&
                    window.SettingsModule) {

                    console.log(`✅ All modules loaded after ${attempts * 100}ms`);
                    resolve(true);
                    return;
                }

                // Check timeout
                if (attempts >= maxAttempts) {
                    console.error(`❌ Modules failed to load within ${maxAttempts * 100}ms`);
                    console.log('Available modules:', {
                        TransactionsModule: !!window.TransactionsModule,
                        HistoryModule: !!window.HistoryModule,
                        StatisticsModule: !!window.StatisticsModule,
                        CategoriesModule: !!window.CategoriesModule,
                        SettingsModule: !!window.SettingsModule
                    });
                    resolve(false);
                    return;
                }

                // Continue checking
                setTimeout(checkModules, 100);
            };

            checkModules();
        });
    }

    /**
     * Initialize all modules with proper error handling
     */
    async initializeModules() {
        console.log('🔧 Initializing modules...');

        try {
            // Wait for modules to be available
            const modulesAvailable = await this.waitForModules();

            if (!modulesAvailable) {
                console.warn('Not all modules are available, initializing available ones...');
            }

            // Initialize each module with error handling
            const modules = [
                { name: 'TransactionsModule', instance: window.TransactionsModule },
                { name: 'HistoryModule', instance: window.HistoryModule },
                { name: 'StatisticsModule', instance: window.StatisticsModule },
                { name: 'CategoriesModule', instance: window.CategoriesModule },
                { name: 'SettingsModule', instance: window.SettingsModule }
            ];

            let successCount = 0;

            for (const module of modules) {
                try {
                    if (module.instance && typeof module.instance.init === 'function') {
                        module.instance.init(this);
                        successCount++;
                        console.log(`✅ ${module.name} initialized`);
                    } else {
                        console.warn(`❌ ${module.name} not available or invalid`);
                    }
                } catch (error) {
                    console.error(`❌ Failed to initialize ${module.name}:`, error);
                }
            }

            console.log(`🔧 Initialized ${successCount}/${modules.length} modules`);
            return successCount > 0; // Return true if at least one module initialized

        } catch (error) {
            console.error('❌ Failed to initialize modules:', error);
            return false;
        }
    }

    /**
     * Initialize navigation functionality (tab switching)
     */
    initializeNavigation() {
        const navItems = document.querySelectorAll('.bottom-nav .nav-item');
        navItems.forEach(item => {
            const clickHandler = (e) => {
                e.preventDefault();
                const tabId = item.dataset.tab;
                if (tabId) {
                    this.switchTab(tabId);
                    // Update URL hash for direct linking/bookmarking and back button support
                    history.pushState(null, '', `#${tabId}`);
                }
            };
            item.addEventListener('click', clickHandler);
            this.eventListeners.push({ element: item, event: 'click', handler: clickHandler });
        });
    }

    /**
     * Switch between application tabs
     */
    switchTab(tabId) {
        // Deactivate current tab content and navigation item
        const activeTabContent = document.querySelector('.tab-content.active');
        if (activeTabContent) {
            activeTabContent.classList.remove('active');
        }
        const activeNavItem = document.querySelector('.nav-item.active');
        if (activeNavItem) {
            activeNavItem.classList.remove('active');
        }

        // Activate new tab content and navigation item
        const newTabContent = document.getElementById(`tab-${tabId}`);
        if (newTabContent) {
            newTabContent.classList.add('active');
        }
        const newNavItem = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
        if (newNavItem) {
            newNavItem.classList.add('active');
        }

        this.currentTab = tabId;
        console.log(`Switched to tab: ${tabId}`);

        // Trigger refresh for the newly active module
        this.refreshActiveModule(tabId);
    }

    /**
     * Add transfer transaction with improved ID generation
     */
    addTransferTransaction(data) {
        // Ensure data.datetime is a string that can be parsed
        const datetime = data.datetime || new Date().toISOString();
        const timestamp = new Date(datetime).getTime();
        const random1 = Math.random().toString(36).substr(2, 9);
        const random2 = Math.random().toString(36).substr(2, 9);

        const baseId = `${timestamp}_${random1}`;
        const outId = `transfer_out_${baseId}_${random2}`;
        const inId = `transfer_in_${baseId}_${random2}`;

        // Validate that IDs don't already exist
        const existingIds = new Set(this.data.transactions.map(tx => tx.id));
        if (existingIds.has(outId) || existingIds.has(inId)) {
            console.warn('ID collision detected for transfer, regenerating...');
            return this.addTransferTransaction(data); // Recurse to generate new IDs
        }

        const outTransaction = {
            id: outId,
            datetime: datetime,
            type: 'Chi',
            category: Utils.CONFIG.TRANSFER_CATEGORY_OUT, // Use system category
            amount: data.amount,
            account: data.account,
            description: data.description || `Chuyển tiền đến ${this.getAccountName(data.toAccount)}`,
            originalAmount: data.originalAmount || data.amount,
            originalCurrency: data.originalCurrency || 'VND',
            isTransfer: true,
            transferPairId: inId,
            createdAt: new Date().toISOString()
        };

        const inTransaction = {
            id: inId,
            datetime: datetime,
            type: 'Thu',
            category: Utils.CONFIG.TRANSFER_CATEGORY_IN, // Use system category
            amount: data.amount,
            account: data.toAccount,
            description: data.description || `Nhận tiền từ ${this.getAccountName(data.account)}`,
            originalAmount: data.originalAmount || data.amount,
            originalCurrency: data.originalCurrency || 'VND',
            isTransfer: true,
            transferPairId: outId,
            createdAt: new Date().toISOString()
        };

        try {
            this.data.transactions.push(outTransaction, inTransaction);
            this.saveData();
            this.updateHeaderSummary();
            return { outTransaction, inTransaction };
        } catch (error) {
            console.error('Error adding transfer transaction:', error);
            throw error;
        }
    }

    /**
     * Handle app data import with comprehensive validation
     */
    importData(importedData) {
        try {
            // Validate imported data structure
            if (!importedData || typeof importedData !== 'object') {
                throw new Error('Dữ liệu không hợp lệ. Vui lòng kiểm tra định dạng.');
            }

            // Validate required fields
            const requiredTopLevelFields = ['transactions', 'incomeCategories', 'expenseCategories', 'accounts'];
            for (const field of requiredTopLevelFields) {
                if (importedData[field] && !Array.isArray(importedData[field])) {
                    throw new Error(`Trường "${field}" trong file phải là một mảng dữ liệu.`);
                }
            }

            // Validate transactions structure
            if (importedData.transactions) {
                importedData.transactions.forEach((tx, index) => {
                    if (!tx || typeof tx !== 'object') {
                        throw new Error(`Giao dịch thứ ${index + 1} không hợp lệ (không phải đối tượng).`);
                    }

                    const requiredTxFields = ['id', 'type', 'datetime', 'amount', 'account'];
                    for (const field of requiredTxFields) {
                        if (tx[field] === undefined || tx[field] === null) {
                            throw new Error(`Giao dịch thứ ${index + 1} thiếu trường bắt buộc "${field}".`);
                        }
                    }

                    const amount = parseFloat(tx.amount);
                    if (isNaN(amount) || amount < 0) {
                        throw new Error(`Giao dịch thứ ${index + 1} có số tiền không hợp lệ: "${tx.amount}".`);
                    }

                    if (!['Thu', 'Chi', 'Transfer'].includes(tx.type)) {
                        throw new Error(`Giao dịch thứ ${index + 1} có loại không hợp lệ: "${tx.type}".`);
                    }

                    const date = new Date(tx.datetime);
                    if (isNaN(date.getTime())) {
                        throw new Error(`Giao dịch thứ ${index + 1} có ngày/giờ không hợp lệ: "${tx.datetime}".`);
                    }
                });
            }

            // Backup current data
            const backup = {
                transactions: [...this.data.transactions],
                incomeCategories: [...this.data.incomeCategories],
                expenseCategories: [...this.data.expenseCategories],
                accounts: [...this.data.accounts],
                settings: { ...this.data.settings },
                reconciliationHistory: [...this.data.reconciliationHistory]
            };

            try {
                // Import data with validation (only if present in importedData)
                if (importedData.transactions) {
                    this.data.transactions = [...importedData.transactions];
                }
                if (importedData.incomeCategories) {
                    this.data.incomeCategories = [...importedData.incomeCategories];
                }
                if (importedData.expenseCategories) {
                    this.data.expenseCategories = [...importedData.expenseCategories];
                }
                if (importedData.accounts) {
                    this.data.accounts = [...importedData.accounts];
                }
                if (importedData.settings && typeof importedData.settings === 'object') {
                    // Merge settings to avoid overwriting all new settings
                    this.data.settings = { ...this.data.settings, ...importedData.settings };
                }
                if (importedData.reconciliationHistory) {
                    this.data.reconciliationHistory = [...importedData.reconciliationHistory];
                }

                // Ensure system categories exist (after importing user-defined ones)
                this.ensureTransferCategories();
                this.ensureAdjustmentCategories();

                // Validate data integrity after import (e.g., duplicates, orphaned transfers)
                this.validateDataIntegrity();

                // Save imported data
                this.saveData();

                // Refresh all modules to reflect new data
                this.refreshAllModules();

                Utils.UIUtils.showMessage(
                    `Đã nhập thành công ${this.data.transactions.length} giao dịch và các dữ liệu khác.`,
                    'success'
                );

                return true;

            } catch (saveError) {
                // Restore backup on save error
                console.error('Error saving imported data, restoring backup:', saveError);

                this.data.transactions = backup.transactions;
                this.data.incomeCategories = backup.incomeCategories;
                this.data.expenseCategories = backup.expenseCategories;
                this.data.accounts = backup.accounts;
                this.data.settings = backup.settings;
                this.data.reconciliationHistory = backup.reconciliationHistory;
                this.saveData(); // Save restored data

                throw new Error('Lỗi khi lưu dữ liệu đã nhập: ' + saveError.message);
            }

        } catch (error) {
            console.error('Import failed:', error);
            Utils.UIUtils.showMessage(`Lỗi nhập dữ liệu: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Validate data integrity after import or load
     */
    validateDataIntegrity() {
        let issuesFound = 0;
        const initialTransactionCount = this.data.transactions.length;

        // Filter out null/undefined transactions at the start
        this.data.transactions = this.data.transactions.filter(tx => tx && typeof tx === 'object');

        // Check for duplicate transaction IDs
        const seenIds = new Set();
        const uniqueTransactions = [];
        for (const tx of this.data.transactions) {
            if (tx.id && !seenIds.has(tx.id)) {
                seenIds.add(tx.id);
                uniqueTransactions.push(tx);
            } else {
                console.warn('Duplicate or invalid transaction ID found and removed:', tx.id || 'N/A');
                issuesFound++;
            }
        }
        this.data.transactions = uniqueTransactions;


        // Check for orphaned transfer transactions and self-referencing pairs
        const transferTransactions = this.data.transactions.filter(tx => tx.isTransfer);
        const validTransactionIds = new Set(this.data.transactions.map(tx => tx.id));
        const filteredTransfers = [];

        for (const tx of transferTransactions) {
            if (tx.transferPairId) {
                if (tx.id === tx.transferPairId) {
                    console.warn('Self-referencing transfer transaction found and removed:', tx.id);
                    issuesFound++;
                    continue;
                }
                const pairExists = validTransactionIds.has(tx.transferPairId);
                if (!pairExists) {
                    console.warn('Orphaned transfer transaction found (pair missing) and removed:', tx.id, 'Pair ID:', tx.transferPairId);
                    issuesFound++;
                    continue;
                }
            } else {
                console.warn('Transfer transaction without transferPairId found and removed:', tx.id);
                issuesFound++;
                continue;
            }
            filteredTransfers.push(tx);
        }

        // Reconstruct transactions, keeping non-transfers and validated transfers
        this.data.transactions = this.data.transactions.filter(tx => !tx.isTransfer)
                                    .concat(filteredTransfers);


        // Check for missing required fields and invalid values
        this.data.transactions = this.data.transactions.filter(tx => {
            if (!tx.id || !tx.type || !tx.datetime || tx.amount === undefined || tx.amount === null || !tx.account) {
                console.warn('Transaction with missing critical fields removed:', tx);
                issuesFound++;
                return false;
            }
            const amount = parseFloat(tx.amount);
            if (isNaN(amount) || amount < 0) {
                 console.warn('Transaction with invalid amount removed:', tx.id, tx.amount);
                 issuesFound++;
                 return false;
            }
            const date = new Date(tx.datetime);
            if (isNaN(date.getTime())) {
                console.warn('Transaction with invalid datetime removed:', tx.id, tx.datetime);
                issuesFound++;
                return false;
            }

            if (tx.type !== 'Transfer' && !tx.category) {
                 console.warn('Non-transfer transaction without category removed:', tx.id);
                 issuesFound++;
                 return false;
            }
            if (tx.type === 'Transfer' && (!tx.toAccount && !tx.transferPairId)) { // Redundant check for transferPairId as it's filtered above
                console.warn('Transfer transaction without toAccount removed:', tx.id);
                issuesFound++;
                return false;
            }
            return true;
        });

        // Additional: Clean up categories/accounts if they are null/undefined or malformed
        this.data.incomeCategories = this.data.incomeCategories.filter(c => c && c.value && c.text);
        this.data.expenseCategories = this.data.expenseCategories.filter(c => c && c.value && c.text);
        this.data.accounts = this.data.accounts.filter(a => a && a.value && a.text);

        if (issuesFound > 0 || this.data.transactions.length !== initialTransactionCount) {
            console.log(`Data integrity check completed. Fixed ${issuesFound} issues and adjusted transaction count from ${initialTransactionCount} to ${this.data.transactions.length}.`);
            Utils.UIUtils.showMessage(`Đã sửa ${issuesFound} lỗi dữ liệu (trùng lặp, thiếu thông tin, v.v.).`, 'info');
            this.saveData();
        }
    }

    /**
     * Save data to localStorage with error handling
     */
    saveData() {
        try {
            const success = Utils.StorageUtils.save(Utils.CONFIG.STORAGE_KEYS.TRANSACTIONS, this.data.transactions) &&
                           Utils.StorageUtils.save(Utils.CONFIG.STORAGE_KEYS.INCOME_CATEGORIES, this.data.incomeCategories) &&
                           Utils.StorageUtils.save(Utils.CONFIG.STORAGE_KEYS.EXPENSE_CATEGORIES, this.data.expenseCategories) &&
                           Utils.StorageUtils.save(Utils.CONFIG.STORAGE_KEYS.ACCOUNTS, this.data.accounts) &&
                           Utils.StorageUtils.save(Utils.CONFIG.STORAGE_KEYS.SETTINGS, this.data.settings) &&
                           Utils.StorageUtils.save(Utils.CONFIG.STORAGE_KEYS.RECONCILIATION_HISTORY, this.data.reconciliationHistory);

            if (!success) {
                throw new Error('Failed to save one or more data components');
            }

        } catch (error) {
            console.error('Error saving data:', error);
            Utils.UIUtils.showMessage('Có lỗi khi lưu dữ liệu', 'error');
            throw error;
        }
    }

    /**
     * Update header summary with error handling
     */
	updateHeaderSummary() {
		try {
			// Tính TỔNG thu nhập và chi tiêu từ trước đến nay (không giới hạn thời gian)
			let totalIncome = 0;
			let totalExpense = 0;

			this.data.transactions.forEach(tx => {
				try {
					if (!tx || !tx.datetime) return;
					const amount = parseFloat(tx?.amount) || 0;

					if (tx?.type === 'Thu' && !tx?.isTransfer) {
						totalIncome += amount;
					} else if (tx?.type === 'Chi' && !tx?.isTransfer) {
						totalExpense += amount;
					}
				} catch (error) {
					console.warn('Invalid transaction in header summary:', tx, error);
				}
			});

			// Tính tổng số dư thực tế của tất cả tài khoản
			const realTotalBalance = this.getAllAccountBalances();
			const totalRealBalance = Object.values(realTotalBalance).reduce((sum, balance) => {
				return sum + (parseFloat(balance) || 0);
			}, 0);

			// Cập nhật giao diện
			const headerIncome = document.getElementById('header-income');
			const headerExpense = document.getElementById('header-expense');
			const headerBalance = document.getElementById('header-balance');

			if (headerIncome) {
				headerIncome.textContent = Utils.CurrencyUtils.formatCurrency(totalIncome);
			}

			if (headerExpense) {
				headerExpense.textContent = Utils.CurrencyUtils.formatCurrency(totalExpense);
			}

			if (headerBalance) {
				headerBalance.textContent = Utils.CurrencyUtils.formatCurrency(totalRealBalance);
				headerBalance.className = `summary-value ${totalRealBalance >= 0 ? 'text-success' : 'text-danger'}`;
			}

			// Cập nhật labels để rõ ràng
			const incomeLabel = headerIncome?.parentNode?.querySelector('.summary-label');
			const expenseLabel = headerExpense?.parentNode?.querySelector('.summary-label');
			const balanceLabel = headerBalance?.parentNode?.querySelector('.summary-label');
			
			if (incomeLabel) incomeLabel.textContent = 'Tổng thu nhập';
			if (expenseLabel) expenseLabel.textContent = 'Tổng chi tiêu';
			if (balanceLabel) balanceLabel.textContent = 'Số dư hiện tại';

		} catch (error) {
			console.error('Error updating header summary:', error);
		}
	}

    /**
     * Cleanup method to prevent memory leaks
     */
    cleanup() {
        // Remove event listeners
        this.eventListeners.forEach(({ element, event, handler }) => {
            if (element && typeof element.removeEventListener === 'function') {
                element.removeEventListener(event, handler);
            }
        });
        this.eventListeners = [];

        // Cleanup modules
        const modules = [
            window.TransactionsModule,
            window.HistoryModule,
            window.StatisticsModule,
            window.CategoriesModule,
            window.SettingsModule
        ];

        modules.forEach(module => {
            if (module && typeof module.destroy === 'function') {
                module.destroy();
            }
        });
    }

    /**
     * Add transaction (delegates to regular or transfer)
     */
    addTransaction(transactionData) {
        if (transactionData.type === 'Transfer') {
            return this.addTransferTransaction(transactionData);
        } else {
            return this.addRegularTransaction(transactionData);
        }
    }

    /**
     * Add regular transaction
     */
    addRegularTransaction(data) {
        const amount = parseFloat(data.amount) || 0;
        if (isNaN(amount) || amount <= 0) {
            console.error('Invalid amount for regular transaction:', data.amount);
            throw new Error('Số tiền giao dịch không hợp lệ.');
        }

        const transaction = {
            id: Utils.UIUtils.generateId(),
            datetime: data.datetime,
            type: data.type,
            category: data.category,
            amount: amount,
            account: data.account,
            description: data.description || '',
            originalAmount: data.originalAmount || amount,
            originalCurrency: data.originalCurrency || 'VND',
            isTransfer: false,
            transferPairId: null,
            createdAt: new Date().toISOString()
        };

        this.data.transactions.push(transaction);
        this.saveData();
        this.updateHeaderSummary();

        return transaction;
    }

    /**
     * Update transaction
     */
    updateTransaction(transactionId, transactionData) {
        const index = this.data.transactions.findIndex(tx => tx && tx.id === transactionId);
        if (index === -1) {
            console.warn(`Transaction with ID ${transactionId} not found for update.`);
            return null;
        }

        const existingTransaction = this.data.transactions[index];

        // Validate data before update
        const validation = Utils.ValidationUtils.validateTransaction(transactionData);
        if (!validation.isValid) {
            throw new Error(validation.errors[0]);
        }

        // Handle transfer updates: delete old pair, create new one
        if (existingTransaction.isTransfer) {
            // Remove the old transfer pair
            this.data.transactions = this.data.transactions.filter(tx =>
                tx && tx.id !== existingTransaction.id && tx.id !== existingTransaction.transferPairId
            );
            // Add a new transfer pair based on updated data
            const newTransfer = this.addTransferTransaction(transactionData);
            if (newTransfer) {
                 Utils.UIUtils.showMessage('Giao dịch chuyển tiền đã được cập nhật', 'success');
                 return newTransfer;
            } else {
                 throw new Error('Lỗi khi cập nhật giao dịch chuyển tiền.');
            }
        } else {
            // Handle regular transaction update
            const updatedTransaction = {
                ...existingTransaction,
                ...transactionData,
                amount: parseFloat(transactionData.amount) || 0, // Ensure amount is number
                originalAmount: parseFloat(transactionData.originalAmount) || (parseFloat(transactionData.amount) || 0), // Ensure originalAmount is number
                updatedAt: new Date().toISOString()
            };

            this.data.transactions[index] = updatedTransaction;
            this.saveData();
            this.updateHeaderSummary();

            return updatedTransaction;
        }
    }

    /**
     * Delete transaction
     */
    deleteTransaction(transactionId) {
        const transactionToDelete = this.data.transactions.find(tx => tx && tx.id === transactionId);
        if (!transactionToDelete) {
            console.warn(`Transaction with ID ${transactionId} not found for deletion.`);
            return false;
        }

        if (transactionToDelete.isTransfer) {
            this.data.transactions = this.data.transactions.filter(tx =>
                tx && tx.id !== transactionToDelete.id && tx.id !== transactionToDelete.transferPairId
            );
        } else {
            this.data.transactions = this.data.transactions.filter(tx => tx && tx.id !== transactionId);
        }

        this.saveData();
        this.updateHeaderSummary();
        return true;
    }

    /**
     * Get filtered transactions
     */
    getFilteredTransactions(filters = {}) {
        let filtered = [...this.data.transactions];

        if (filters.period && filters.period !== 'all' && filters.period !== 'custom') {
            const { start, end } = Utils.DateUtils.getPeriodDates(filters.period);
            if (start && end) {
                filtered = filtered.filter(tx => {
                    try {
                        // Ensure tx is valid and datetime is present
                        if (!tx || !tx.datetime) return false;
                        const txDate = new Date(tx.datetime);
                        return !isNaN(txDate.getTime()) && txDate >= start && txDate <= end;
                    } catch (e) {
                        console.warn('Invalid transaction date for period filter:', tx?.datetime, e);
                        return false;
                    }
                });
            } else {
                console.warn(`Invalid period dates for filter: ${filters.period}`);
            }
        }
        else if (filters.period === 'custom' && filters.date) {
            // For custom date filter, filter by the exact date (day, month, year)
            // It's assumed filters.date is in 'YYYY-MM-DD' format if from a date input
            const targetDateStr = filters.date.split('T')[0]; // Extract only the date part
            filtered = filtered.filter(tx => {
                // Ensure tx is valid and datetime is present
                if (!tx || !tx.datetime) return false;
                const txDateStr = new Date(tx.datetime).toISOString().split('T')[0];
                return txDateStr === targetDateStr;
            });
        }
        // For custom date range (e.g., in statistics module)
        else if (filters.period === 'custom_range' && filters.startDate && filters.endDate) {
            filtered = filtered.filter(tx => {
                if (!tx || !tx.datetime) return false;
                const txDate = new Date(tx.datetime);
                return !isNaN(txDate.getTime()) && txDate >= filters.startDate && txDate <= filters.endDate;
            });
        }

        if (filters.type) {
            filtered = filtered.filter(tx => tx?.type === filters.type);
        }

        if (filters.account) {
            filtered = filtered.filter(tx => tx?.account === filters.account);
        }

        if (filters.category) {
            filtered = filtered.filter(tx => tx?.category === filters.category);
        }

        if (filters.excludeTransfers) {
            filtered = filtered.filter(tx => !tx?.isTransfer);
        }

        return filtered;
    }

    /**
     * Get account balance
     */
    getAccountBalance(accountValue) {
        let balance = 0;
        if (!accountValue) return 0;

        this.data.transactions.forEach(tx => {
            if (tx && tx.account === accountValue) {
                const amount = parseFloat(tx.amount) || 0;
                if (tx.type === 'Thu') {
                    balance += amount;
                } else if (tx.type === 'Chi') {
                    balance -= amount;
                }
            }
            // For transfers, if this account is the *destination* of a transfer
            // We need to check if the current transaction is the 'out' part of a transfer
            // and its pair is the 'in' part to the accountValue.
            // Or if it's the 'in' part and its pair is 'out' from accountValue.
            // Simplified: if tx.isTransfer and tx.toAccount (if it exists) matches accountValue, it's an income
            // But this is handled by the account property itself now, so no special logic needed.
            // A transaction is always tied to one account.
            // For transfer transactions, the 'Chi' side has 'account' as sender, 'Thu' side has 'account' as receiver.
            // So the above logic for 'tx.account === accountValue' correctly captures it.
        });

        return balance;
    }

    /**
     * Get all account balances
     */
    getAllAccountBalances() {
        const balances = {};
        if (!Array.isArray(this.data.accounts)) {
            console.warn('Accounts data is not an array.');
            return {};
        }

        this.data.accounts.forEach(account => {
            if (account && account.value) {
                 balances[account.value] = this.getAccountBalance(account.value);
            }
        });

        return balances;
    }

    /**
     * Get account name safely
     */
    getAccountName(accountValue) {
        if (!this.data || !Array.isArray(this.data.accounts)) {
            return accountValue || 'Unknown Account';
        }
        const account = this.data.accounts.find(acc => acc && acc.value === accountValue);
        return account ? account.text : accountValue || 'Unknown Account';
    }

    /**
     * Refresh all modules
     */
    refreshAllModules() {
        this.updateHeaderSummary();
        // Refresh active module by calling its refresh method
        this.refreshActiveModule(this.currentTab);

        // Also refresh other modules that might not be the active tab but need data update
        // (e.g., categories dropdowns in transactions, settings data)
        if (window.CategoriesModule && typeof window.CategoriesModule.refresh === 'function') {
            window.CategoriesModule.refresh();
        }
        if (window.SettingsModule && typeof window.SettingsModule.refresh === 'function') {
            window.SettingsModule.refresh();
        }

        // Dispatch a custom event for other components to listen to
        document.dispatchEvent(new CustomEvent('appDataChanged', {
            detail: { app: this }
        }));
    }

    /**
     * Refresh the currently active module
     */
    refreshActiveModule(tabId = this.currentTab) {
        let moduleToRefresh = null;
        switch (tabId) {
            case 'transactions':
                moduleToRefresh = window.TransactionsModule;
                break;
            case 'history':
                moduleToRefresh = window.HistoryModule;
                break;
            case 'statistics':
                moduleToRefresh = window.StatisticsModule;
                break;
            case 'categories':
                moduleToRefresh = window.CategoriesModule;
                break;
            case 'settings':
                moduleToRefresh = window.SettingsModule;
                break;
            default:
                break;
        }

        if (moduleToRefresh && typeof moduleToRefresh.refresh === 'function') {
            moduleToRefresh.refresh();
        }
    }


    /**
     * Export app data
     */
    exportData() {
        const exportData = {
            version: '2.0.0', // Current app version
            exportDate: new Date().toISOString(),
            transactions: this.data.transactions,
            incomeCategories: this.data.incomeCategories,
            expenseCategories: this.data.expenseCategories,
            accounts: this.data.accounts,
            settings: this.data.settings,
            reconciliationHistory: this.data.reconciliationHistory
        };

        return exportData;
    }

    /**
     * Clear all data
     */
    clearAllData() {
        // Confirmation is handled in SettingsModule for better UX
        // This function only performs the data clearing logic.
        try {
            this.data.transactions = [];
            this.data.incomeCategories = [...this.defaultData.incomeCategories];
            this.data.expenseCategories = [...this.defaultData.expenseCategories];
            this.data.accounts = [...this.defaultData.accounts];
            this.data.settings = { ...this.defaultData.settings };
            this.data.reconciliationHistory = []; // Clear history as well

            this.ensureTransferCategories(); // Re-add system categories
            this.ensureAdjustmentCategories(); // Re-add system adjustment categories

            // Clear all data from localStorage
            Utils.StorageUtils.clearAll();
            // Then save the reset default data to localStorage
            this.saveData();

            this.refreshAllModules(); // Refresh UI after clearing data

            return true;
        } catch (error) {
            console.error('Error clearing all data:', error);
            return false;
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Create global app instance
        window.FinancialApp = new FinancialApp();

        // Initialize the app (this will handle tab switching, popstate, theme toggle etc.)
        await window.FinancialApp.init();

    } catch (error) {
        console.error('Failed to initialize app from DOMContentLoaded:', error);
        // Fallback UI in case of critical error during app initialization
        document.body.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #ef4444;">
                <h1>⚠️ Lỗi khởi tạo ứng dụng</h1>
                <p>Vui lòng tải lại trang hoặc xóa dữ liệu trình duyệt nếu lỗi vẫn tiếp diễn.</p>
                <button onclick="location.reload()" style="padding: 1rem 2rem; margin: 1rem; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer;">
                    Tải lại trang
                </button>
                <button onclick="localStorage.clear(); location.reload()" style="padding: 1rem 2rem; margin: 1rem; background: #ef4444; color: white; border: none; border-radius: 8px; cursor: pointer;">
                    Xóa dữ liệu & Tải lại
                </button>
            </div>
        `;
    }
});