/**
 * FINANCIAL APP - MAIN APPLICATION CONTROLLER - REFINED
 * Handles app initialization, navigation, global state management, and module coordination.
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
            settings: {}, // Sẽ được hợp nhất với defaultData.settings
            reconciliationHistory: []
        };

        this.eventListeners = []; // Lưu trữ các event listener để dễ dàng gỡ bỏ

        this.defaultData = {
            incomeCategories: [
                { value: "Lương", text: "Lương", system: false }, // Thêm thuộc tính system
                { value: "Thưởng", text: "Thưởng", system: false },
                { value: "Tiền được trả nợ", text: "Tiền được trả nợ", system: false },
                { value: "Lãi tiết kiệm", text: "Lãi tiết kiệm", system: false },
                { value: "Thu nhập từ đầu tư", text: "Thu nhập từ đầu tư", system: false },
                { value: "Thu nhập phụ", text: "Thu nhập phụ", system: false },
                { value: "Thu nhập khác", text: "Thu nhập khác", system: false },
            ],
            expenseCategories: [
                { value: "Ăn uống", text: "Ăn uống", system: false },
                { value: "Đi lại", text: "Đi lại", system: false },
                { value: "Nhà ở", text: "Nhà ở", system: false },
                { value: "Hóa đơn", text: "Hóa đơn (Điện, nước, internet)", system: false },
                { value: "Mua sắm", text: "Mua sắm (Quần áo, đồ dùng)", system: false },
                { value: "Giải trí", text: "Giải trí", system: false },
                { value: "Sức khỏe", text: "Sức khỏe", system: false },
                { value: "Giáo dục", text: "Giáo dục", system: false },
                { value: "Chi cho đầu tư", text: "Chi cho đầu tư", system: false },
                { value: "Trả nợ", text: "Trả nợ", system: false },
                { value: "Chi phí khác", text: "Chi phí khác", system: false },
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
                usdRate: Utils?.CONFIG?.USD_TO_VND_RATE || 25000, // Lấy từ Utils.CONFIG nếu có
                language: 'vi',
                clientVersion: '0.0.0' // Sẽ được cập nhật từ version.js hoặc UpdateManager
            }
        };
        
        this.updateManager = null; // Sẽ được khởi tạo trong init()
        this.modules = {}; // Để lưu trữ các instance của module
    }

    async init() {
        if (this.isInitialized) {
            console.warn("App already initialized.");
            return;
        }

        try {
            console.log('🚀 Initializing Financial App...');
            
            // 1. Load data (bao gồm cả clientVersion ban đầu từ settings nếu có)
            this.loadData(); // Cần đảm bảo clientVersion được load đúng ở đây

            // 2. Khởi tạo UpdateManager sớm để nó có thể lấy clientVersion chính xác
            this.initializeUpdateManager(); // UpdateManager sẽ cập nhật this.data.settings.clientVersion nếu cần

            // 3. Khởi tạo các thành phần UI cơ bản và navigation
            Utils.ThemeUtils.initializeTheme();
            this.initializeNavigation();
            this.initializeGlobalEventListeners(); // Ví dụ: theme toggle

            // 4. Khởi tạo các module con
            const modulesLoaded = await this.initializeModules();
            if (!modulesLoaded) {
                console.warn('Not all modules were successfully loaded. App might be in a limited state.');
            }

            // 5. Cập nhật UI ban đầu và xử lý hash
            this.updateHeaderSummary();
            this.handleInitialTab();
            
            this.isInitialized = true;
            console.log('✅ Financial App initialized successfully');

            if (this.data.transactions.length === 0) {
                Utils.UIUtils.showMessage('Chào mừng bạn đến với ứng dụng quản lý tài chính!', 'info', 5000);
            }
            this.handlePWAShortcuts();

        } catch (error) {
            console.error('❌ Failed to initialize app:', error);
            Utils.UIUtils.showMessage('Có lỗi xảy ra khi khởi tạo ứng dụng. Vui lòng tải lại trang.', 'error');
            this.initializeFallbackMode(error);
        }
    }

    initializeUpdateManager() {
        try {
            if (typeof Utils !== 'undefined' && Utils.UpdateManager) {
                console.log('🔄 Initializing Update Manager...');
                // Truyền clientVersion hiện tại từ this.data.settings
                Utils.UpdateManager.init(this.data.settings.clientVersion); 
                this.updateManager = Utils.UpdateManager; // Lưu instance để dùng sau nếu cần

                // Nghe thông điệp từ Service Worker (ví dụ, khi SW đã xóa cache và sẵn sàng để client reload)
                if (navigator.serviceWorker) {
                    navigator.serviceWorker.addEventListener('message', event => {
                        if (event.data && event.data.type === 'FORCE_UPDATE_COMPLETE') {
                            console.log('[App] Received FORCE_UPDATE_COMPLETE from SW. Reloading window...');
                            Utils.UIUtils.showMessage('Ứng dụng đã được làm mới hoàn toàn!', 'success', 2000);
                            // SW thường sẽ tự reload client, nhưng để chắc chắn:
                            setTimeout(() => Utils.UpdateManager.hardReload(), 2100); 
                        }
                    });
                }
            } else {
                console.warn('⚠️ Update Manager (Utils.UpdateManager) not available or not loaded yet.');
            }
        } catch (error) {
            console.error('❌ Failed to initialize Update Manager:', error);
        }
    }
    
    loadData() {
        console.log('📂 Loading data from storage...');
        try {
            const transactions = Utils.StorageUtils.load(Utils.CONFIG.STORAGE_KEYS.TRANSACTIONS, []);
            this.data.transactions = Array.isArray(transactions) ? transactions : [];

            const incomeCategories = Utils.StorageUtils.load(Utils.CONFIG.STORAGE_KEYS.INCOME_CATEGORIES, []);
            this.data.incomeCategories = (!Array.isArray(incomeCategories) || incomeCategories.length === 0) 
                ? JSON.parse(JSON.stringify(this.defaultData.incomeCategories)) // Deep clone
                : incomeCategories;

            const expenseCategories = Utils.StorageUtils.load(Utils.CONFIG.STORAGE_KEYS.EXPENSE_CATEGORIES, []);
            this.data.expenseCategories = (!Array.isArray(expenseCategories) || expenseCategories.length === 0)
                ? JSON.parse(JSON.stringify(this.defaultData.expenseCategories)) // Deep clone
                : expenseCategories;

            this.ensureSystemCategories(); // Gộp ensureTransferCategories và ensureAdjustmentCategories

            const accounts = Utils.StorageUtils.load(Utils.CONFIG.STORAGE_KEYS.ACCOUNTS, []);
            this.data.accounts = (!Array.isArray(accounts) || accounts.length === 0)
                ? JSON.parse(JSON.stringify(this.defaultData.accounts)) // Deep clone
                : accounts;

            const settings = Utils.StorageUtils.load(Utils.CONFIG.STORAGE_KEYS.SETTINGS, {});
            // Merge default settings với settings đã lưu, ưu tiên settings đã lưu
            this.data.settings = {
                ...this.defaultData.settings, // Bắt đầu với default
                ...(typeof settings === 'object' && settings !== null ? settings : {}) // Ghi đè bằng cái đã lưu
            };
            
            // Đảm bảo clientVersion được cập nhật từ version.js nếu có, trừ khi đã có giá trị khác '0.0.0'
            const globalAppVersion = typeof APP_VERSION !== 'undefined' ? APP_VERSION : this.defaultData.settings.clientVersion;
            if (!this.data.settings.clientVersion || this.data.settings.clientVersion === '0.0.0') {
                 this.data.settings.clientVersion = globalAppVersion;
            }
            console.log(`[App LoadData] Client version set to: ${this.data.settings.clientVersion}`);


            const reconciliationHistory = Utils.StorageUtils.load(Utils.CONFIG.STORAGE_KEYS.RECONCILIATION_HISTORY, []);
            this.data.reconciliationHistory = Array.isArray(reconciliationHistory) ? reconciliationHistory : [];

            // Cập nhật Utils.CONFIG.USD_TO_VND_RATE từ settings đã load
            const loadedRate = parseFloat(this.data.settings.usdRate);
            Utils.CONFIG.USD_TO_VND_RATE = (!isNaN(loadedRate) && loadedRate >= Utils.CONFIG.USD_RATE_MIN && loadedRate <= Utils.CONFIG.USD_RATE_MAX)
                ? loadedRate
                : this.defaultData.settings.usdRate;
            this.data.settings.usdRate = Utils.CONFIG.USD_TO_VND_RATE; // Đảm bảo settings cũng được cập nhật
            
            this.saveData(); // Quan trọng: Lưu lại ngay để đảm bảo settings (bao gồm cả clientVersion) được persist

            console.log(`📊 Loaded ${this.data.transactions.length} transactions.`);
        } catch (error) {
            console.error('Error loading data:', error);
            // Fallback to default data if loading fails critically
            this.data = JSON.parse(JSON.stringify(this.defaultData)); // Deep clone default
            this.data.settings.clientVersion = typeof APP_VERSION !== 'undefined' ? APP_VERSION : '0.0.0-loaderror';
            this.ensureSystemCategories();
             Utils.CONFIG.USD_TO_VND_RATE = this.defaultData.settings.usdRate;
            Utils.UIUtils.showMessage('Có lỗi khi tải dữ liệu, một số cài đặt có thể đã được khôi phục mặc định.', 'warning');
            this.saveData(); // Cố gắng lưu lại dữ liệu mặc định
        }
    }
    
    ensureSystemCategories() {
        const categoriesToAdd = [
            { type: 'income', value: Utils.CONFIG.TRANSFER_CATEGORY_IN, text: "Nhận tiền chuyển khoản", system: true },
            { type: 'expense', value: Utils.CONFIG.TRANSFER_CATEGORY_OUT, text: "Chuyển tiền đi", system: true },
            { type: 'income', value: Utils.CONFIG.RECONCILE_ADJUST_INCOME_CAT, text: "Điều chỉnh Đối Soát (Thu)", system: true },
            { type: 'expense', value: Utils.CONFIG.RECONCILE_ADJUST_EXPENSE_CAT, text: "Điều chỉnh Đối Soát (Chi)", system: true }
        ];

        categoriesToAdd.forEach(catInfo => {
            const targetArray = catInfo.type === 'income' ? this.data.incomeCategories : this.data.expenseCategories;
            const existingCategory = targetArray.find(c => c && c.value === catInfo.value);
            if (!existingCategory) {
                targetArray.push({ value: catInfo.value, text: catInfo.text, system: catInfo.system });
            } else if (!existingCategory.system) { // Đảm bảo thuộc tính system được đặt nếu category đã tồn tại
                existingCategory.system = true;
                existingCategory.text = catInfo.text; // Cập nhật text nếu cần
            }
        });
    }

    async waitForModules() {
        const moduleNames = ['TransactionsModule', 'HistoryModule', 'StatisticsModule', 'CategoriesModule', 'SettingsModule'];
        let attempts = 0;
        const maxAttempts = 50; // Chờ tối đa 5 giây

        return new Promise((resolve) => {
            const check = () => {
                attempts++;
                const allLoaded = moduleNames.every(name => window[name] && typeof window[name].init === 'function');
                
                if (allLoaded) {
                    console.log('✅ All JS modules appear to be loaded.');
                    resolve(true);
                    return;
                }
                if (attempts >= maxAttempts) {
                    console.error(`❌ Modules failed to load within ${maxAttempts * 100}ms. Missing:`, 
                        moduleNames.filter(name => !(window[name] && typeof window[name].init === 'function'))
                    );
                    resolve(false);
                    return;
                }
                setTimeout(check, 100);
            };
            check();
        });
    }

    async initializeModules() {
        console.log('🔧 Initializing sub-modules...');
        const modulesAvailable = await this.waitForModules();
        if (!modulesAvailable) {
            Utils.UIUtils.showMessage('Lỗi tải một số thành phần của ứng dụng. Vui lòng thử làm mới trang.', 'error', 10000);
            return false;
        }
            
        const moduleConfig = [
            { name: 'TransactionsModule', instance: window.TransactionsModule },
            { name: 'HistoryModule', instance: window.HistoryModule },
            { name: 'StatisticsModule', instance: window.StatisticsModule }, // Đảm bảo StatisticsModule được đổi tên thành StatisticsModule nếu cần
            { name: 'CategoriesModule', instance: window.CategoriesModule },
            { name: 'SettingsModule', instance: window.SettingsModule }
        ];
        let successCount = 0;

        for (const config of moduleConfig) {
            try {
                if (config.instance) { // instance đã được tạo global (vd: window.TransactionsModule = new TransactionsModule())
                    this.modules[config.name] = config.instance;
                    await this.modules[config.name].init(this); // Gọi init
                    successCount++;
                } else {
                    console.warn(`❌ ${config.name} not available globally.`);
                }
            } catch (error) {
                console.error(`❌ Failed to initialize ${config.name}:`, error);
                Utils.UIUtils.showMessage(`Lỗi khởi tạo module ${config.name}.`, 'error');
            }
        }
        console.log(`🔧 Initialized ${successCount}/${moduleConfig.length} modules.`);
        return successCount > 0;
    }

    initializeNavigation() {
        const navItems = document.querySelectorAll('.bottom-nav .nav-item');
        if (!navItems || navItems.length === 0) {
            console.warn("Bottom navigation items not found.");
            return;
        }
        navItems.forEach(item => {
            const clickHandler = (e) => {
                e.preventDefault();
                const tabId = item.dataset.tab;
                if (tabId) {
                    this.switchTab(tabId);
                    // Chỉ cập nhật hash nếu nó khác với tabId hiện tại để tránh loop
                    if (window.location.hash !== `#${tabId}`) {
                        window.history.pushState({ tab: tabId }, '', `#${tabId}`);
                    }
                }
            };
            item.addEventListener('click', clickHandler);
            this.eventListeners.push({ element: item, event: 'click', handler: clickHandler });
        });

        // Handle popstate for browser back/forward navigation
        const popstateHandler = (event) => {
            const tabId = event.state?.tab || window.location.hash.slice(1) || 'transactions';
            this.switchTab(tabId);
        };
        window.addEventListener('popstate', popstateHandler);
        this.eventListeners.push({ element: window, event: 'popstate', handler: popstateHandler });
    }

    initializeGlobalEventListeners() {
        const themeToggle = document.getElementById('darkModeToggleCheckbox');
        if (themeToggle) {
            // Sync checkbox with current theme
            const currentThemeSetting = Utils.ThemeUtils.getCurrentTheme(); // 'light', 'dark', or 'auto'
            if (currentThemeSetting === 'dark') {
                themeToggle.checked = true;
            } else if (currentThemeSetting === 'light') {
                themeToggle.checked = false;
            } else { // auto
                themeToggle.checked = window.matchMedia('(prefers-color-scheme: dark)').matches;
            }

            const themeToggleHandler = () => {
                const newTheme = themeToggle.checked ? 'dark' : 'light';
                 // Khi người dùng chủ động toggle, ta không set là 'auto' nữa
                Utils.ThemeUtils.applyTheme(newTheme);
            };
            themeToggle.addEventListener('change', themeToggleHandler);
            this.eventListeners.push({ element: themeToggle, event: 'change', handler: themeToggleHandler });
        }
    }
    
    handleInitialTab() {
        const hash = window.location.hash.slice(1);
        const validTabs = ['transactions', 'history', 'statistics', 'categories', 'settings'];
        const initialTab = validTabs.includes(hash) ? hash : 'transactions';
        
        if (hash !== initialTab) { // Nếu hash không hợp lệ hoặc rỗng, set lại hash
            window.location.hash = initialTab;
        }
        this.switchTab(initialTab);
    }

    switchTab(tabId) {
        console.log(`Switching to tab: ${tabId}`);
        const activeTabContent = document.querySelector('.tab-content.active');
        if (activeTabContent) activeTabContent.classList.remove('active');
        const activeNavItem = document.querySelector('.nav-item.active');
        if (activeNavItem) activeNavItem.classList.remove('active');

        const newTabContent = document.getElementById(`tab-${tabId}`);
        if (newTabContent) {
            newTabContent.classList.add('active');
        } else {
            console.warn(`Tab content for '${tabId}' not found.`);
            // Fallback to default tab if requested tab content doesn't exist
            document.getElementById('tab-transactions').classList.add('active');
            document.querySelector('.nav-item[data-tab="transactions"]').classList.add('active');
            this.currentTab = 'transactions';
            window.location.hash = 'transactions'; // Update hash to default
            this.refreshActiveModule(this.currentTab);
            return;
        }

        const newNavItem = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
        if (newNavItem) {
            newNavItem.classList.add('active');
        } else {
             console.warn(`Nav item for '${tabId}' not found.`);
        }

        this.currentTab = tabId;
        this.refreshActiveModule(tabId);
    }

    addTransferTransaction(data) {
        const datetime = data.datetime || Utils.DateUtils.formatDateTimeLocal();
        const timestamp = new Date(datetime).getTime();
        const randomPart = Math.random().toString(36).substr(2, 9);
        
        // Tạo ID duy nhất hơn
        const outId = `transfer_out_${timestamp}_${this.data.transactions.length}_${randomPart}`;
        const inId = `transfer_in_${timestamp}_${this.data.transactions.length}_${randomPart}`;

        const fromAccountName = this.getAccountName(data.account) || data.account;
        const toAccountName = this.getAccountName(data.toAccount) || data.toAccount;

        const outTransaction = {
            id: outId, datetime, type: 'Chi', category: Utils.CONFIG.TRANSFER_CATEGORY_OUT, 
            amount: data.amount, account: data.account, 
            description: data.description || `Chuyển tiền đến ${toAccountName}`,
            originalAmount: data.originalAmount || data.amount, originalCurrency: data.originalCurrency || 'VND',
            isTransfer: true, transferPairId: inId, createdAt: new Date().toISOString()
        };
        const inTransaction = {
            id: inId, datetime, type: 'Thu', category: Utils.CONFIG.TRANSFER_CATEGORY_IN,
            amount: data.amount, account: data.toAccount,
            description: data.description || `Nhận tiền từ ${fromAccountName}`,
            originalAmount: data.originalAmount || data.amount, originalCurrency: data.originalCurrency || 'VND',
            isTransfer: true, transferPairId: outId, createdAt: new Date().toISOString()
        };
        try {
            this.data.transactions.push(outTransaction, inTransaction);
            this.saveData(); 
            this.updateHeaderSummary();
            return { outTransaction, inTransaction };
        } catch (error) {
            console.error('Error adding transfer transaction:', error); 
            Utils.UIUtils.showMessage('Lỗi khi thêm giao dịch chuyển tiền.', 'error');
            throw error;
        }
    }

    addRegularTransaction(data) {
        const amount = parseFloat(data.amount) || 0;
        if (isNaN(amount) || amount <= 0) {
            throw new Error('Số tiền giao dịch không hợp lệ.');
        }
        const transaction = {
            id: Utils.UIUtils.generateId(), 
            datetime: data.datetime || Utils.DateUtils.formatDateTimeLocal(), 
            type: data.type, 
            category: data.category,
            amount, 
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
    
    addTransaction(transactionData) {
        // Thêm validation cơ bản ở đây nếu cần, hoặc để TransactionsModule xử lý
        try {
            return transactionData.type === 'Transfer' 
                ? this.addTransferTransaction(transactionData) 
                : this.addRegularTransaction(transactionData);
        } catch (error) {
            console.error("Error in App.addTransaction:", error);
            Utils.UIUtils.showMessage(`Lỗi thêm giao dịch: ${error.message}`, 'error');
            return null; // Hoặc false
        }
    }

    updateTransaction(transactionId, transactionData) {
        const index = this.data.transactions.findIndex(tx => tx && tx.id === transactionId);
        if (index === -1) {
            Utils.UIUtils.showMessage('Không tìm thấy giao dịch để cập nhật.', 'error');
            return null;
        }
        
        const existingTransaction = this.data.transactions[index];
        
        try {
            // Validation (có thể dùng Utils.ValidationUtils.validateTransaction)
            // ...

            if (existingTransaction.isTransfer) {
                // Xóa cặp transfer cũ
                this.data.transactions = this.data.transactions.filter(tx => 
                    tx && tx.id !== existingTransaction.id && tx.id !== existingTransaction.transferPairId
                );
                // Thêm cặp transfer mới với dữ liệu đã cập nhật
                // (cần đảm bảo transactionData chứa đủ thông tin cho cả fromAccount và toAccount nếu là transfer)
                const newTransferData = {
                    ...transactionData, // Dữ liệu từ form
                    // Nếu form chỉ có 1 account, cần lấy account còn lại từ existingTransaction hoặc pair
                };
                // Nếu transactionData không có toAccount (ví dụ form chỉ sửa 1 phía), cần lấy từ pair cũ.
                if (transactionData.type === "Transfer" && !transactionData.toAccount) {
                    const pair = this.data.transactions.find(tx => tx.id === existingTransaction.transferPairId);
                    if (existingTransaction.type === "Chi") newTransferData.toAccount = pair ? pair.account : existingTransaction.account; // fallback
                    else newTransferData.toAccount = existingTransaction.account; // if existing was "Thu"
                }


                const newTransfer = this.addTransferTransaction(newTransferData);
                if (newTransfer) { 
                    Utils.UIUtils.showMessage('Giao dịch chuyển tiền đã được cập nhật', 'success'); 
                    this.saveData();
                    this.updateHeaderSummary();
                    return newTransfer.outTransaction; // Hoặc cả hai
                } else {
                    throw new Error('Lỗi khi cập nhật giao dịch chuyển tiền.');
                }
            } else {
                const updatedTransaction = {
                    ...existingTransaction, 
                    ...transactionData,
                    amount: parseFloat(transactionData.amount) || 0,
                    originalAmount: parseFloat(transactionData.originalAmount) || (parseFloat(transactionData.amount) || 0),
                    updatedAt: new Date().toISOString()
                };
                this.data.transactions[index] = updatedTransaction; 
                this.saveData(); 
                this.updateHeaderSummary();
                Utils.UIUtils.showMessage('Giao dịch đã được cập nhật', 'success');
                return updatedTransaction;
            }
        } catch (error) {
            console.error("Error in App.updateTransaction:", error);
            Utils.UIUtils.showMessage(`Lỗi cập nhật giao dịch: ${error.message}`, 'error');
            return null;
        }
    }

    deleteTransaction(transactionId) {
        const transactionToDelete = this.data.transactions.find(tx => tx && tx.id === transactionId);
        if (!transactionToDelete) {
            Utils.UIUtils.showMessage('Không tìm thấy giao dịch để xóa.', 'error');
            return false;
        }
        
        try {
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
        } catch (error) {
            console.error("Error in App.deleteTransaction:", error);
            Utils.UIUtils.showMessage('Lỗi xóa giao dịch.', 'error');
            return false;
        }
    }

    getFilteredTransactions(filters = {}) {
        let filtered = [...this.data.transactions];
        try {
            if (filters.period && filters.period !== 'all' && filters.period !== 'custom') {
                const { start, end } = Utils.DateUtils.getPeriodDates(filters.period);
                if (start && end) {
                    filtered = filtered.filter(tx => { 
                        if (!tx || !tx.datetime) return false; 
                        const d = new Date(tx.datetime); 
                        return !isNaN(d.getTime()) && d >= start && d <= end; 
                    });
                }
            } else if (filters.period === 'custom' && filters.date) {
                // Lọc theo ngày cụ thể (YYYY-MM-DD)
                const targetDateStr = filters.date.split('T')[0]; // Chỉ lấy phần ngày
                filtered = filtered.filter(tx => { 
                    if (!tx || !tx.datetime) return false; 
                    return new Date(tx.datetime).toISOString().split('T')[0] === targetDateStr; 
                });
            } else if (filters.period === 'custom_range' && filters.startDate && filters.endDate) {
                // Lọc theo khoảng ngày tùy chỉnh (đã là đối tượng Date)
                filtered = filtered.filter(tx => { 
                    if (!tx || !tx.datetime) return false; 
                    const d = new Date(tx.datetime); 
                    return !isNaN(d.getTime()) && d >= filters.startDate && d <= filters.endDate; 
                });
            }

            if (filters.type) filtered = filtered.filter(tx => tx?.type === filters.type);
            if (filters.account) filtered = filtered.filter(tx => tx?.account === filters.account);
            if (filters.category) filtered = filtered.filter(tx => tx?.category === filters.category);
            if (filters.excludeTransfers) filtered = filtered.filter(tx => !tx?.isTransfer);
        } catch (error) {
            console.error("Error in getFilteredTransactions:", error);
            return []; // Trả về mảng rỗng nếu có lỗi
        }
        return filtered;
    }

    getAccountBalance(accountValue) {
        let balance = 0; 
        if (!accountValue) return 0;
        this.data.transactions.forEach(tx => {
            if (tx && tx.account === accountValue) {
                const amount = parseFloat(tx.amount) || 0;
                if (tx.type === 'Thu') balance += amount;
                else if (tx.type === 'Chi') balance -= amount;
            }
        });
        return balance;
    }

    getAllAccountBalances() {
        const balances = {};
        if (!Array.isArray(this.data.accounts)) return {};
        this.data.accounts.forEach(account => { 
            if (account && account.value) balances[account.value] = this.getAccountBalance(account.value); 
        });
        return balances;
    }

    getAccountName(accountValue) {
        if (!this.data || !Array.isArray(this.data.accounts)) return accountValue || 'Tài khoản không xác định';
        const account = this.data.accounts.find(acc => acc && acc.value === accountValue);
        return account ? account.text : (accountValue || 'Tài khoản không xác định');
    }

    updateHeaderSummary() {
        try {
            let totalIncomeCurrentMonth = 0;
            let totalExpenseCurrentMonth = 0;
            const currentMonthRange = Utils.DateUtils.getPeriodDates('month');

            this.data.transactions.forEach(tx => {
                try {
                    if (!tx || !tx.datetime || tx.isTransfer) return;
                    const txDate = new Date(tx.datetime);
                    if (isNaN(txDate.getTime())) return;

                    if (txDate >= currentMonthRange.start && txDate <= currentMonthRange.end) {
                        const amount = parseFloat(tx.amount) || 0;
                        if (tx.type === 'Thu') totalIncomeCurrentMonth += amount;
                        else if (tx.type === 'Chi') totalExpenseCurrentMonth += amount;
                    }
                } catch (error) { console.warn('Invalid transaction in header summary detail:', tx, error); }
            });
            
            const allBalances = this.getAllAccountBalances();
            const totalRealBalance = Object.values(allBalances).reduce((sum, balance) => sum + (parseFloat(balance) || 0), 0);

            const headerIncomeEl = document.getElementById('header-income');
            const headerExpenseEl = document.getElementById('header-expense');
            const headerBalanceEl = document.getElementById('header-balance');

            if (headerIncomeEl) headerIncomeEl.textContent = Utils.CurrencyUtils.formatCurrency(totalIncomeCurrentMonth);
            if (headerExpenseEl) headerExpenseEl.textContent = Utils.CurrencyUtils.formatCurrency(totalExpenseCurrentMonth);
            if (headerBalanceEl) {
                headerBalanceEl.textContent = Utils.CurrencyUtils.formatCurrency(totalRealBalance);
                headerBalanceEl.className = `summary-value ${totalRealBalance >= 0 ? 'text-success' : 'text-danger'}`;
            }

            // Cập nhật labels cho rõ ràng hơn
            const incomeLabel = headerIncomeEl?.parentNode?.querySelector('.summary-label');
            const expenseLabel = headerExpenseEl?.parentNode?.querySelector('.summary-label');
            const balanceLabel = headerBalanceEl?.parentNode?.querySelector('.summary-label');
            if (incomeLabel) incomeLabel.textContent = 'Thu nhập tháng';
            if (expenseLabel) expenseLabel.textContent = 'Chi tiêu tháng';
            if (balanceLabel) balanceLabel.textContent = 'Số dư hiện tại';

        } catch (error) { console.error('Error updating header summary:', error); }
    }
    
    saveData() {
        try {
            const success = Utils.StorageUtils.save(Utils.CONFIG.STORAGE_KEYS.TRANSACTIONS, this.data.transactions) &&
                           Utils.StorageUtils.save(Utils.CONFIG.STORAGE_KEYS.INCOME_CATEGORIES, this.data.incomeCategories) &&
                           Utils.StorageUtils.save(Utils.CONFIG.STORAGE_KEYS.EXPENSE_CATEGORIES, this.data.expenseCategories) &&
                           Utils.StorageUtils.save(Utils.CONFIG.STORAGE_KEYS.ACCOUNTS, this.data.accounts) &&
                           Utils.StorageUtils.save(Utils.CONFIG.STORAGE_KEYS.SETTINGS, this.data.settings) &&
                           Utils.StorageUtils.save(Utils.CONFIG.STORAGE_KEYS.RECONCILIATION_HISTORY, this.data.reconciliationHistory);
            
            if (!success) throw new Error('Một hoặc nhiều thành phần dữ liệu không lưu được.');
            console.log('💾 Data saved successfully.');
            return true;
        } catch (error) {
            console.error('Error saving data:', error); 
            Utils.UIUtils.showMessage('Có lỗi nghiêm trọng khi lưu dữ liệu. Dữ liệu của bạn có thể không được bảo toàn.', 'error', 5000); 
            return false;
        }
    }

    refreshAllModules() {
        console.log('🔄 Refreshing all modules...');
        this.updateHeaderSummary(); // Luôn cập nhật header
        this.refreshActiveModule(this.currentTab); // Chỉ refresh module của tab hiện tại
        
        // Các module khác có thể cần refresh dữ liệu nền mà không cần render lại UI đầy đủ
        // Ví dụ, SettingsModule cần cập nhật thông tin app (số lượng giao dịch, v.v.)
        if (this.modules.CategoriesModule?.isInitialized && this.currentTab !== 'categories') {
            this.modules.CategoriesModule.refresh(); // Categories ít thay đổi, có thể refresh
        }
        if (this.modules.SettingsModule?.isInitialized && this.currentTab !== 'settings') {
            this.modules.SettingsModule.refresh(); // Settings cần cập nhật app info
        }
        
        document.dispatchEvent(new CustomEvent('appDataChanged', { detail: { app: this } }));
    }

    refreshActiveModule(tabId = this.currentTab) {
        console.log(`💡 Refreshing active module: ${tabId}`);
        let moduleToRefresh = null;
        switch (tabId) {
            case 'transactions': moduleToRefresh = this.modules.TransactionsModule; break;
            case 'history': moduleToRefresh = this.modules.HistoryModule; break;
            case 'statistics': moduleToRefresh = this.modules.StatisticsModule; break;
            case 'categories': moduleToRefresh = this.modules.CategoriesModule; break;
            case 'settings': moduleToRefresh = this.modules.SettingsModule; break;
        }
        if (moduleToRefresh && typeof moduleToRefresh.refresh === 'function' && moduleToRefresh.isInitialized) {
            moduleToRefresh.refresh();
        } else if (moduleToRefresh && !moduleToRefresh.isInitialized) {
            console.warn(`Module ${tabId} not initialized, cannot refresh.`);
        }
    }
    
    exportData() { // Dùng cho SettingsModule
        return {
            version: this.data.settings.clientVersion || (typeof APP_VERSION !== 'undefined' ? APP_VERSION : '0.0.0'),
            exportDate: new Date().toISOString(),
            transactions: this.data.transactions,
            incomeCategories: this.data.incomeCategories,
            expenseCategories: this.data.expenseCategories,
            accounts: this.data.accounts,
            settings: this.data.settings,
            reconciliationHistory: this.data.reconciliationHistory
        };
    }

    importData(importedData) { // Dùng cho SettingsModule
        try {
            // Validation cơ bản
            if (!importedData || typeof importedData !== 'object') throw new Error('Dữ liệu không hợp lệ.');
            
            // Backup dữ liệu hiện tại phòng trường hợp import lỗi
            const backupData = JSON.parse(JSON.stringify(this.data));

            try {
                // Ghi đè có chọn lọc, giữ lại một số cấu trúc nếu file import không có
                this.data.transactions = Array.isArray(importedData.transactions) ? importedData.transactions : backupData.transactions;
                this.data.incomeCategories = Array.isArray(importedData.incomeCategories) ? importedData.incomeCategories : backupData.incomeCategories;
                this.data.expenseCategories = Array.isArray(importedData.expenseCategories) ? importedData.expenseCategories : backupData.expenseCategories;
                this.data.accounts = Array.isArray(importedData.accounts) ? importedData.accounts : backupData.accounts;
                this.data.settings = (importedData.settings && typeof importedData.settings === 'object') 
                                     ? { ...this.defaultData.settings, ...importedData.settings } 
                                     : backupData.settings;
                this.data.reconciliationHistory = Array.isArray(importedData.reconciliationHistory) ? importedData.reconciliationHistory : backupData.reconciliationHistory;
                
                // Đảm bảo clientVersion hiện tại không bị ghi đè bởi file JSON cũ hơn
                this.data.settings.clientVersion = typeof APP_VERSION !== 'undefined' ? APP_VERSION : backupData.settings.clientVersion;

                this.ensureSystemCategories();
                this.validateDataIntegrity(); // Hàm này nên được thêm để kiểm tra và sửa lỗi dữ liệu sau import
                
                if (!this.saveData()) { // Nếu saveData trả về false (lỗi)
                    throw new Error("Không thể lưu dữ liệu đã nhập.");
                }

                this.refreshAllModules();
                Utils.UIUtils.showMessage(`Đã nhập thành công ${this.data.transactions.length} giao dịch.`, 'success');
                return true;

            } catch (processingError) {
                console.error('Error processing imported data, restoring backup:', processingError);
                this.data = backupData; // Khôi phục backup
                this.saveData(); // Cố gắng lưu lại backup
                throw new Error('Lỗi xử lý dữ liệu đã nhập: ' + processingError.message);
            }
        } catch (error) {
            console.error('Import failed:', error);
            Utils.UIUtils.showMessage(`Lỗi nhập dữ liệu: ${error.message}`, 'error');
            return false;
        }
    }
    
    validateDataIntegrity() { // Ví dụ hàm kiểm tra sơ bộ
        let issuesFound = 0;
        const initialTxCount = this.data.transactions.length;

        // Loại bỏ giao dịch null/undefined
        this.data.transactions = this.data.transactions.filter(tx => tx && typeof tx === 'object');
        if (this.data.transactions.length !== initialTxCount) {
            issuesFound += (initialTxCount - this.data.transactions.length);
        }
        
        // Kiểm tra ID duy nhất (ví dụ đơn giản)
        const seenIds = new Set();
        const uniqueTransactions = [];
        for (const tx of this.data.transactions) {
            if (tx.id && !seenIds.has(tx.id)) {
                seenIds.add(tx.id);
                uniqueTransactions.push(tx);
            } else {
                console.warn('Removed transaction with duplicate or missing ID:', tx.id || 'N/A');
                issuesFound++;
            }
        }
        this.data.transactions = uniqueTransactions;

        // Các bước kiểm tra khác (category, account tồn tại, date hợp lệ, amount hợp lệ...)
        // ...

        if (issuesFound > 0) {
            console.warn(`Data integrity check found and fixed ${issuesFound} issues.`);
            Utils.UIUtils.showMessage(`Đã tự động sửa ${issuesFound} lỗi nhỏ trong dữ liệu.`, 'info');
        }
    }


    clearAllData() { // Dùng cho SettingsModule
        try {
            // Giữ lại clientVersion hiện tại
            const currentClientVersion = this.data.settings.clientVersion || (typeof APP_VERSION !== 'undefined' ? APP_VERSION : '0.0.0');
            
            this.data.transactions = [];
            this.data.incomeCategories = JSON.parse(JSON.stringify(this.defaultData.incomeCategories));
            this.data.expenseCategories = JSON.parse(JSON.stringify(this.defaultData.expenseCategories));
            this.data.accounts = JSON.parse(JSON.stringify(this.defaultData.accounts));
            this.data.settings = { ...this.defaultData.settings, clientVersion: currentClientVersion }; // Khôi phục settings mặc định nhưng giữ clientVersion
            this.data.reconciliationHistory = [];
            
            this.ensureSystemCategories();
            
            // Xóa hết localStorage liên quan đến app, trừ theme nếu muốn giữ
            const theme = Utils.ThemeUtils.getCurrentTheme(); // Lưu theme hiện tại
            Utils.StorageUtils.clearAll(); // Hàm này xóa tất cả keys trong CONFIG.STORAGE_KEYS
            
            // Lưu lại settings mặc định (bao gồm theme đã lưu và clientVersion)
            this.data.settings.theme = theme; 
            Utils.CONFIG.USD_TO_VND_RATE = this.defaultData.settings.usdRate; // Reset cả config rate

            if (!this.saveData()) { // saveDate sẽ lưu tất cả this.data
                throw new Error("Không thể lưu dữ liệu sau khi xóa.");
            }

            this.refreshAllModules();
            return true;
        } catch (error) { 
            console.error('Error clearing all data:', error); 
            Utils.UIUtils.showMessage(`Lỗi xóa dữ liệu: ${error.message}`, 'error');
            return false; 
        }
    }
    
    handlePWAShortcuts() { // Xử lý các shortcut PWA
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const action = urlParams.get('action');
            const source = urlParams.get('source');

            if (source === 'shortcut') {
                console.log('🚀 PWA Shortcut detected:', action);
                
                // Xóa query params khỏi URL để tránh xử lý lại khi reload
                window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);

                if (action === 'statistics') {
                    this.switchTab('statistics');
                    return;
                }
                
                // Các action khác (income, expense, transfer) đều mở tab transactions
                this.switchTab('transactions'); 
                
                // Chờ tab transactions render xong rồi mới thực hiện action
                setTimeout(() => {
                    const typeMap = { 'income': 'Thu', 'expense': 'Chi', 'transfer': 'Transfer' };
                    if (typeMap[action]) {
                        this.setTransactionTypeFromShortcut(typeMap[action]);
                        const messageType = typeMap[action] === 'Thu' ? 'Thu nhập' : (typeMap[action] === 'Chi' ? 'Chi tiêu' : 'Chuyển tiền');
                        Utils.UIUtils.showMessage(`💰 Sẵn sàng nhập ${messageType}!`, 'success', 2000);
                    } else {
                        console.warn('Unknown shortcut action:', action);
                    }
                }, 500); // Delay để đảm bảo UI tab transactions đã sẵn sàng
            }
        } catch (error) {
            console.error('Error handling PWA shortcuts:', error);
        }
    }

    setTransactionTypeFromShortcut(type) { // Hỗ trợ PWA shortcuts
        try {
            const typeRadio = document.querySelector(`input[name="type"][value="${type}"]`);
            if (typeRadio) {
                typeRadio.checked = true;
                // Kích hoạt event 'change' để form cập nhật UI tương ứng
                typeRadio.dispatchEvent(new Event('change', { bubbles: true })); 
            }
            // Focus vào ô amount sau một khoảng trễ nhỏ
            setTimeout(() => {
                const amountInput = document.getElementById('amount-input');
                if (amountInput) {
                    amountInput.focus();
                    // Cuộn tới ô amount nếu nó không trong tầm nhìn
                    amountInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 200);
        } catch (error) {
            console.error('Error setting transaction type from shortcut:', error);
        }
    }
    
    initializeFallbackMode(error) {
        console.error('Entering Fallback Mode due to error:', error);
        document.body.innerHTML = `
            <div style="padding: 20px; text-align: center; font-family: sans-serif;">
                <h1 style="color: #D32F2F;">⚠️ Lỗi Khởi Tạo Ứng Dụng</h1>
                <p style="margin: 15px 0;">Rất tiếc, ứng dụng đã gặp sự cố không mong muốn.</p>
                <p style="margin-bottom: 20px;">Bạn có thể thử các cách sau:</p>
                <button onclick="location.reload(true);" 
                        style="padding: 10px 15px; background-color: #1976D2; color: white; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">
                    Tải Lại Trang (Cache)
                </button>
                <button onclick="window.FinancialApp.attemptHardResetAndReload();"
                        style="padding: 10px 15px; background-color: #C62828; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Xóa Dữ Liệu & Tải Lại
                </button>
                <p style="margin-top: 20px; font-size: 0.9em; color: #757575;">
                    Nếu lỗi vẫn tiếp diễn, vui lòng liên hệ hỗ trợ hoặc kiểm tra console (F12) để biết thêm chi tiết.
                </p>
                <p style="margin-top:5px; font-size: 0.8em; color: #9E9E9E;">Chi tiết lỗi: ${error.message || 'Không rõ'}</p>
            </div>
        `;
    }

    static attemptHardResetAndReload() { // Static method để có thể gọi từ fallback UI
        try {
            console.warn("Attempting hard reset...");
            // Cố gắng xóa tất cả localStorage keys mà ứng dụng sử dụng
            if (typeof Utils !== 'undefined' && Utils.CONFIG && Utils.CONFIG.STORAGE_KEYS) {
                Object.values(Utils.CONFIG.STORAGE_KEYS).forEach(key => {
                    try { localStorage.removeItem(key); } catch (e) { console.warn(`Failed to remove ${key}`)}
                });
            } else { // Fallback nếu Utils không có
                const keysToRemove = ['financial_transactions_v2', 'financial_income_categories_v2', 'financial_expense_categories_v2', 'financial_accounts_v2', 'financial_settings_v2', 'financial_reconciliation_history_v2', 'theme', 'lastTransactionType'];
                keysToRemove.forEach(key => {
                    try { localStorage.removeItem(key); } catch (e) { console.warn(`Failed to remove ${key}`)}
                });
            }
            console.log("Local storage potentially cleared.");

            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    for(let registration of registrations) {
                        registration.unregister();
                        console.log("Service Worker unregistered.");
                    }
                }).catch(function(err) {
                    console.error("Service Worker unregistration failed: ", err);
                }).finally(() => {
                     window.location.reload(true); // Hard reload
                });
            } else {
                 window.location.reload(true); // Hard reload
            }
        } catch(e) {
            console.error("Critical error during hard reset:", e);
            alert("Không thể tự động xóa dữ liệu. Vui lòng thử xóa cache và dữ liệu trang web thủ công trong cài đặt trình duyệt.");
            window.location.reload(true);
        }
    }


    cleanup() { // Gỡ bỏ event listeners khi cần (ví dụ, nếu app có thể "tắt" mà không reload trang)
        console.log("🧹 Cleaning up app event listeners...");
        this.eventListeners.forEach(({ element, event, handler }) => {
            if (element && typeof element.removeEventListener === 'function') {
                element.removeEventListener(event, handler);
            }
        });
        this.eventListeners = [];

        // Gọi destroy cho các module con nếu chúng có
        Object.values(this.modules).forEach(module => {
            if (module && typeof module.destroy === 'function') {
                module.destroy();
            }
        });
        this.modules = {};
        this.isInitialized = false;
        console.log("🧼 App cleanup complete.");
    }
}

// Khởi tạo ứng dụng khi DOM đã sẵn sàng
document.addEventListener('DOMContentLoaded', async () => {
    try {
        if (!window.FinancialAppInstance) { // Đảm bảo chỉ khởi tạo một lần
            window.FinancialAppInstance = new FinancialApp();
            await window.FinancialAppInstance.init();
        }
    } catch (error) {
        // Lỗi ở đây thường là lỗi nghiêm trọng không thể phục hồi từ bên trong class FinancialApp.init
        console.error('CRITICAL: Failed to initialize app from DOMContentLoaded listener:', error);
        // Hiển thị một UI lỗi tối giản nhất có thể
        document.body.innerHTML = `<div style="position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:white;color:red;font-family:sans-serif;padding:20px;text-align:center;"><h1>Ứng dụng gặp lỗi nghiêm trọng</h1><p>Không thể khởi động. Vui lòng thử tải lại hoặc xóa dữ liệu trang.</p><button onclick="location.reload(true)" style="padding:8px 12px;margin:10px;cursor:pointer;">Tải lại</button></div>`;
    }
});