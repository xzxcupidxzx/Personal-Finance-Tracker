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
            reconciliationHistory: []
        };

        this.eventListeners = [];

        this.defaultData = {
            incomeCategories: [
                { value: "Lương", text: "Lương" },
                { value: "Thưởng", text: "Thưởng" },
                { value: "Tiền được trả nợ", text: "Tiền được trả nợ" },
                { value: "Lãi tiết kiệm", text: "Lãi tiết kiệm" },
                { value: "Thu nhập từ đầu tư", text: "Thu nhập từ đầu tư" },
                { value: "Thu nhập phụ", text: "Thu nhập phụ" },
                { value: "Thu nhập khác", text: "Thu nhập khác" },
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
                usdRate: 25000, // Tỷ giá mặc định
                language: 'vi',
                // Thêm một trường để lưu phiên bản client, sẽ được cập nhật từ UpdateManager
                clientVersion: '0.0.0' 
            }
        };
        
        this.updateManager = null;
    }

    async init() {
        try {
            console.log('🚀 Initializing Financial App...');
            this.loadData();
            
            // Lấy phiên bản từ Utils.UpdateManager (nếu có) và cập nhật vào settings
            // Điều này giả định Utils.UpdateManager.currentVersion đã được đồng bộ (ví dụ bởi GitHub Action)
            if (Utils && Utils.UpdateManager && Utils.UpdateManager.currentVersion) {
                this.data.settings.clientVersion = Utils.UpdateManager.currentVersion;
            } else if (typeof APP_VERSION !== 'undefined') { // Fallback to global APP_VERSION from version.js if available
                this.data.settings.clientVersion = APP_VERSION;
            }
            console.log(`[App] Client version set to: ${this.data.settings.clientVersion}`);


            Utils.ThemeUtils.initializeTheme();
            this.initializeNavigation();

            const modulesLoaded = await this.initializeModules();
            if (!modulesLoaded) {
                console.warn('Not all modules were successfully loaded.');
            }

            this.updateHeaderSummary();
            this.isInitialized = true;
            console.log('✅ Financial App initialized successfully');

            this.initializeUpdateManager(); // Khởi tạo UpdateManager

            const initialTab = window.location.hash.slice(1);
            if (initialTab && ['transactions', 'history', 'statistics', 'categories', 'settings'].includes(initialTab)) {
                this.switchTab(initialTab);
            } else if (!initialTab || initialTab === '') {
                window.location.hash = 'transactions';
                this.switchTab('transactions');
            }

            window.addEventListener('popstate', () => {
                const hash = window.location.hash.slice(1);
                if (hash && ['transactions', 'history', 'statistics', 'categories', 'settings'].includes(hash)) {
                    this.switchTab(hash);
                } else if (hash === '') {
                    this.switchTab('transactions');
                }
            });

            const themeToggle = document.getElementById('darkModeToggleCheckbox');
            if (themeToggle) {
                const themeToggleHandler = () => Utils.ThemeUtils.toggleTheme();
                themeToggle.addEventListener('change', themeToggleHandler);
                this.eventListeners.push({ element: themeToggle, event: 'change', handler: themeToggleHandler });
            }

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

    initializeUpdateManager() {
        try {
            if (typeof Utils.UpdateManager !== 'undefined') {
                console.log('🔄 Initializing Update Manager...');
                // Truyền phiên bản client hiện tại (từ settings) cho UpdateManager
                Utils.UpdateManager.init(this.data.settings.clientVersion); 
                this.updateManager = Utils.UpdateManager;
                this.addUpdateControls();

                // Lắng nghe sự kiện FORCE_UPDATE_COMPLETE từ Service Worker
                if (navigator.serviceWorker) {
                    navigator.serviceWorker.addEventListener('message', event => {
                        if (event.data && event.data.type === 'FORCE_UPDATE_COMPLETE') {
                            console.log('[App] Received FORCE_UPDATE_COMPLETE from SW. Reloading window...');
                            Utils.UIUtils.showMessage('Ứng dụng đã được làm mới hoàn toàn!', 'success', 2000);
                            setTimeout(() => window.location.reload(), 2100);
                        }
                    });
                }

            } else {
                console.warn('⚠️ Update Manager not available');
            }
        } catch (error) {
            console.error('❌ Failed to initialize Update Manager:', error);
        }
    }

    addUpdateControls() {
        console.log('📱 Update controls available');
        // Logic thêm nút vào UI (ví dụ trong SettingsModule) có thể được gọi từ đây
        // hoặc SettingsModule tự kiểm tra this.updateManager.
    }

    handlePWAShortcuts() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const action = urlParams.get('action');
            
            if (action) {
                console.log('🚀 PWA Shortcut detected:', action);
                setTimeout(() => {
                    this.switchTab('transactions');
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

    setTransactionTypeFromShortcut(type) {
        try {
            const typeRadio = document.querySelector(`input[name="type"][value="${type}"]`);
            if (typeRadio) {
                typeRadio.checked = true;
                typeRadio.dispatchEvent(new Event('change'));
            }
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

    initializeFallbackMode() {
        console.log('🔄 Initializing fallback mode...');
        try {
            this.initializeNavigation();
            Utils.UIUtils.showMessage('Ứng dụng đang chạy ở chế độ hạn chế. Vui lòng kiểm tra console để biết thêm chi tiết lỗi.', 'warning', 8000);
            document.body.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #ef4444;">
                    <h1>⚠️ Lỗi khởi tạo ứng dụng</h1>
                    <p>Vui lòng tải lại trang hoặc xóa dữ liệu trình duyệt nếu lỗi vẫn tiếp diễn.</p>
                    <button onclick="location.reload()" style="padding: 1rem 2rem; margin: 1rem; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer;">Tải lại trang</button>
                    <button onclick="localStorage.clear(); location.reload()" style="padding: 1rem 2rem; margin: 1rem; background: #ef4444; color: white; border: none; border-radius: 8px; cursor: pointer;">Xóa dữ liệu & Tải lại</button>
                </div>`;
        } catch (error) {
            console.error('Even fallback mode failed:', error);
            document.body.innerHTML = `<div style="text-align: center; padding: 2rem; color: #ef4444;"><h1>❌ Lỗi nghiêm trọng!</h1><p>Ứng dụng không thể khởi động.</p></div>`;
        }
    }

    loadData() {
        console.log('📂 Loading data from storage...');
        try {
            const transactions = Utils.StorageUtils.load(Utils.CONFIG.STORAGE_KEYS.TRANSACTIONS, []);
            this.data.transactions = Array.isArray(transactions) ? transactions : [];

            const incomeCategories = Utils.StorageUtils.load(Utils.CONFIG.STORAGE_KEYS.INCOME_CATEGORIES, []);
            this.data.incomeCategories = (!Array.isArray(incomeCategories) || incomeCategories.length === 0) 
                ? [...this.defaultData.incomeCategories] 
                : [...incomeCategories];

            const expenseCategories = Utils.StorageUtils.load(Utils.CONFIG.STORAGE_KEYS.EXPENSE_CATEGORIES, []);
            this.data.expenseCategories = (!Array.isArray(expenseCategories) || expenseCategories.length === 0)
                ? [...this.defaultData.expenseCategories]
                : [...expenseCategories];

            this.ensureTransferCategories();
            this.ensureAdjustmentCategories();

            const accounts = Utils.StorageUtils.load(Utils.CONFIG.STORAGE_KEYS.ACCOUNTS, []);
            this.data.accounts = (!Array.isArray(accounts) || accounts.length === 0)
                ? [...this.defaultData.accounts]
                : accounts;

            const settings = Utils.StorageUtils.load(Utils.CONFIG.STORAGE_KEYS.SETTINGS, {});
            this.data.settings = {
                ...this.defaultData.settings,
                ...(typeof settings === 'object' && settings !== null ? settings : {})
            };
             // Client version sẽ được set ở init() sau khi UpdateManager có thể đã được khởi tạo

            const reconciliationHistory = Utils.StorageUtils.load(Utils.CONFIG.STORAGE_KEYS.RECONCILIATION_HISTORY, []);
            this.data.reconciliationHistory = Array.isArray(reconciliationHistory) ? reconciliationHistory : [];

            if (this.data.settings.usdRate) {
                const rate = parseFloat(this.data.settings.usdRate);
                Utils.CONFIG.USD_TO_VND_RATE = (!isNaN(rate) && rate >= Utils.CONFIG.USD_RATE_MIN && rate <= Utils.CONFIG.USD_RATE_MAX)
                    ? rate
                    : this.defaultData.settings.usdRate;
                this.data.settings.usdRate = Utils.CONFIG.USD_TO_VND_RATE;
            } else {
                 Utils.CONFIG.USD_TO_VND_RATE = this.defaultData.settings.usdRate;
                 this.data.settings.usdRate = this.defaultData.settings.usdRate;
            }
            
            this.saveData(); // Lưu lại để đảm bảo settings (bao gồm clientVersion ban đầu) được persist

            console.log(`📊 Loaded ${this.data.transactions.length} transactions`);
        } catch (error) {
            console.error('Error loading data:', error);
            this.data = {
                transactions: [],
                incomeCategories: [...this.defaultData.incomeCategories],
                expenseCategories: [...this.defaultData.expenseCategories],
                accounts: [...this.defaultData.accounts],
                settings: { ...this.defaultData.settings, clientVersion: '0.0.0-errorload' }, // Ghi nhận lỗi load
                reconciliationHistory: []
            };
            this.ensureTransferCategories();
            this.ensureAdjustmentCategories();
            Utils.CONFIG.USD_TO_VND_RATE = this.defaultData.settings.usdRate;
            Utils.UIUtils.showMessage('Có lỗi khi tải dữ liệu, đã khôi phục mặc định', 'warning');
            this.saveData();
        }
    }

    ensureTransferCategories() {
        const transferIn = { value: Utils.CONFIG.TRANSFER_CATEGORY_IN, text: "Nhận tiền chuyển khoản", system: true };
        const transferOut = { value: Utils.CONFIG.TRANSFER_CATEGORY_OUT, text: "Chuyển tiền đi", system: true };
        if (!this.data.incomeCategories.some(cat => cat && cat.value === transferIn.value)) {
            this.data.incomeCategories.push(transferIn);
        } else {
            const existing = this.data.incomeCategories.find(cat => cat && cat.value === transferIn.value);
            if (existing && !existing.system) existing.system = true;
        }
        if (!this.data.expenseCategories.some(cat => cat && cat.value === transferOut.value)) {
            this.data.expenseCategories.push(transferOut);
        } else {
            const existing = this.data.expenseCategories.find(cat => cat && cat.value === transferOut.value);
            if (existing && !existing.system) existing.system = true;
        }
    }

    ensureAdjustmentCategories() {
        const adjustIncome = { value: Utils.CONFIG.RECONCILE_ADJUST_INCOME_CAT, text: "Điều chỉnh Đối Soát (Thu)", system: true };
        const adjustExpense = { value: Utils.CONFIG.RECONCILE_ADJUST_EXPENSE_CAT, text: "Điều chỉnh Đối Soát (Chi)", system: true };
        if (!this.data.incomeCategories.some(cat => cat && cat.value === adjustIncome.value)) {
            this.data.incomeCategories.push(adjustIncome);
        } else {
            const existing = this.data.incomeCategories.find(cat => cat && cat.value === adjustIncome.value);
            if (existing && !existing.system) existing.system = true;
        }
        if (!this.data.expenseCategories.some(cat => cat && cat.value === adjustExpense.value)) {
            this.data.expenseCategories.push(adjustExpense);
        } else {
            const existing = this.data.expenseCategories.find(cat => cat && cat.value === adjustExpense.value);
            if (existing && !existing.system) existing.system = true;
        }
    }

    waitForModules() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 50;
            const checkModules = () => {
                attempts++;
                if (window.TransactionsModule && window.HistoryModule && window.StatisticsModule && window.CategoriesModule && window.SettingsModule) {
                    resolve(true); return;
                }
                if (attempts >= maxAttempts) {
                    console.error(`❌ Modules failed to load within ${maxAttempts * 100}ms`);
                    resolve(false); return;
                }
                setTimeout(checkModules, 100);
            };
            checkModules();
        });
    }

    async initializeModules() {
        console.log('🔧 Initializing modules...');
        try {
            const modulesAvailable = await this.waitForModules();
            if (!modulesAvailable) console.warn('Not all modules are available, initializing available ones...');
            
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
                    } else {
                        console.warn(`❌ ${module.name} not available or invalid`);
                    }
                } catch (error) {
                    console.error(`❌ Failed to initialize ${module.name}:`, error);
                }
            }
            console.log(`🔧 Initialized ${successCount}/${modules.length} modules`);
            return successCount > 0;
        } catch (error) {
            console.error('❌ Failed to initialize modules:', error);
            return false;
        }
    }

    initializeNavigation() {
        const navItems = document.querySelectorAll('.bottom-nav .nav-item');
        navItems.forEach(item => {
            const clickHandler = (e) => {
                e.preventDefault();
                const tabId = item.dataset.tab;
                if (tabId) {
                    this.switchTab(tabId);
                    history.pushState(null, '', `#${tabId}`);
                }
            };
            item.addEventListener('click', clickHandler);
            this.eventListeners.push({ element: item, event: 'click', handler: clickHandler });
        });
    }

    switchTab(tabId) {
        const activeTabContent = document.querySelector('.tab-content.active');
        if (activeTabContent) activeTabContent.classList.remove('active');
        const activeNavItem = document.querySelector('.nav-item.active');
        if (activeNavItem) activeNavItem.classList.remove('active');

        const newTabContent = document.getElementById(`tab-${tabId}`);
        if (newTabContent) newTabContent.classList.add('active');
        const newNavItem = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
        if (newNavItem) newNavItem.classList.add('active');

        this.currentTab = tabId;
        console.log(`Switched to tab: ${tabId}`);
        this.refreshActiveModule(tabId);
    }

    addTransferTransaction(data) {
        const datetime = data.datetime || new Date().toISOString();
        const timestamp = new Date(datetime).getTime();
        const random1 = Math.random().toString(36).substr(2, 9);
        const random2 = Math.random().toString(36).substr(2, 9);
        const baseId = `${timestamp}_${random1}`;
        const outId = `transfer_out_${baseId}_${random2}`;
        const inId = `transfer_in_${baseId}_${random2}`;

        const existingIds = new Set(this.data.transactions.map(tx => tx.id));
        if (existingIds.has(outId) || existingIds.has(inId)) {
            return this.addTransferTransaction(data);
        }

        const outTransaction = {
            id: outId, datetime, type: 'Chi', category: Utils.CONFIG.TRANSFER_CATEGORY_OUT, 
            amount: data.amount, account: data.account, 
            description: data.description || `Chuyển tiền đến ${this.getAccountName(data.toAccount)}`,
            originalAmount: data.originalAmount || data.amount, originalCurrency: data.originalCurrency || 'VND',
            isTransfer: true, transferPairId: inId, createdAt: new Date().toISOString()
        };
        const inTransaction = {
            id: inId, datetime, type: 'Thu', category: Utils.CONFIG.TRANSFER_CATEGORY_IN,
            amount: data.amount, account: data.toAccount,
            description: data.description || `Nhận tiền từ ${this.getAccountName(data.account)}`,
            originalAmount: data.originalAmount || data.amount, originalCurrency: data.originalCurrency || 'VND',
            isTransfer: true, transferPairId: outId, createdAt: new Date().toISOString()
        };
        try {
            this.data.transactions.push(outTransaction, inTransaction);
            this.saveData(); this.updateHeaderSummary();
            return { outTransaction, inTransaction };
        } catch (error) {
            console.error('Error adding transfer transaction:', error); throw error;
        }
    }

    importData(importedData) {
        try {
            if (!importedData || typeof importedData !== 'object') throw new Error('Dữ liệu không hợp lệ.');
            const requiredTopLevelFields = ['transactions', 'incomeCategories', 'expenseCategories', 'accounts'];
            for (const field of requiredTopLevelFields) {
                if (importedData[field] && !Array.isArray(importedData[field])) throw new Error(`Trường "${field}" phải là mảng.`);
            }
            if (importedData.transactions) {
                importedData.transactions.forEach((tx, index) => {
                    if (!tx || typeof tx !== 'object') throw new Error(`Giao dịch ${index + 1} không hợp lệ.`);
                    const requiredTxFields = ['id', 'type', 'datetime', 'amount', 'account'];
                    for (const field of requiredTxFields) if (tx[field] === undefined) throw new Error(`Giao dịch ${index + 1} thiếu trường "${field}".`);
                    if (isNaN(parseFloat(tx.amount)) || parseFloat(tx.amount) < 0) throw new Error(`Giao dịch ${index + 1} có số tiền không hợp lệ.`);
                    if (!['Thu', 'Chi', 'Transfer'].includes(tx.type)) throw new Error(`Giao dịch ${index + 1} có loại không hợp lệ.`);
                    if (isNaN(new Date(tx.datetime).getTime())) throw new Error(`Giao dịch ${index + 1} có ngày/giờ không hợp lệ.`);
                });
            }
            const backup = { transactions: [...this.data.transactions], incomeCategories: [...this.data.incomeCategories], expenseCategories: [...this.data.expenseCategories], accounts: [...this.data.accounts], settings: { ...this.data.settings }, reconciliationHistory: [...this.data.reconciliationHistory] };
            try {
                if (importedData.transactions) this.data.transactions = [...importedData.transactions];
                if (importedData.incomeCategories) this.data.incomeCategories = [...importedData.incomeCategories];
                if (importedData.expenseCategories) this.data.expenseCategories = [...importedData.expenseCategories];
                if (importedData.accounts) this.data.accounts = [...importedData.accounts];
                if (importedData.settings && typeof importedData.settings === 'object') this.data.settings = { ...this.data.settings, ...importedData.settings };
                if (importedData.reconciliationHistory) this.data.reconciliationHistory = [...importedData.reconciliationHistory];
                
                this.ensureTransferCategories(); this.ensureAdjustmentCategories();
                this.validateDataIntegrity();
                this.saveData(); this.refreshAllModules();
                Utils.UIUtils.showMessage(`Đã nhập thành công ${this.data.transactions.length} giao dịch.`, 'success');
                return true;
            } catch (saveError) {
                console.error('Error saving imported data, restoring backup:', saveError);
                this.data = backup; this.saveData();
                throw new Error('Lỗi khi lưu dữ liệu đã nhập: ' + saveError.message);
            }
        } catch (error) {
            console.error('Import failed:', error);
            Utils.UIUtils.showMessage(`Lỗi nhập dữ liệu: ${error.message}`, 'error');
            return false;
        }
    }

    validateDataIntegrity() {
        let issuesFound = 0; const initialTransactionCount = this.data.transactions.length;
        this.data.transactions = this.data.transactions.filter(tx => tx && typeof tx === 'object');
        const seenIds = new Set(); const uniqueTransactions = [];
        for (const tx of this.data.transactions) {
            if (tx.id && !seenIds.has(tx.id)) { seenIds.add(tx.id); uniqueTransactions.push(tx); } 
            else { console.warn('Duplicate/invalid ID removed:', tx.id || 'N/A'); issuesFound++; }
        }
        this.data.transactions = uniqueTransactions;
        const transferTransactions = this.data.transactions.filter(tx => tx.isTransfer);
        const validTransactionIds = new Set(this.data.transactions.map(tx => tx.id));
        const filteredTransfers = [];
        for (const tx of transferTransactions) {
            if (tx.transferPairId) {
                if (tx.id === tx.transferPairId) { console.warn('Self-ref transfer removed:', tx.id); issuesFound++; continue; }
                if (!validTransactionIds.has(tx.transferPairId)) { console.warn('Orphaned transfer removed:', tx.id); issuesFound++; continue; }
            } else { console.warn('Transfer w/o pairId removed:', tx.id); issuesFound++; continue; }
            filteredTransfers.push(tx);
        }
        this.data.transactions = this.data.transactions.filter(tx => !tx.isTransfer).concat(filteredTransfers);
        this.data.transactions = this.data.transactions.filter(tx => {
            if (!tx.id || !tx.type || !tx.datetime || tx.amount === undefined || !tx.account) { issuesFound++; return false; }
            if (isNaN(parseFloat(tx.amount)) || parseFloat(tx.amount) < 0) { issuesFound++; return false; }
            if (isNaN(new Date(tx.datetime).getTime())) { issuesFound++; return false; }
            if (tx.type !== 'Transfer' && !tx.category) { issuesFound++; return false; }
            return true;
        });
        this.data.incomeCategories = this.data.incomeCategories.filter(c => c && c.value && c.text);
        this.data.expenseCategories = this.data.expenseCategories.filter(c => c && c.value && c.text);
        this.data.accounts = this.data.accounts.filter(a => a && a.value && a.text);
        if (issuesFound > 0 || this.data.transactions.length !== initialTransactionCount) {
            console.log(`Data integrity: Fixed ${issuesFound} issues. Count: ${initialTransactionCount} -> ${this.data.transactions.length}.`);
            Utils.UIUtils.showMessage(`Đã sửa ${issuesFound} lỗi dữ liệu.`, 'info');
            this.saveData();
        }
    }

    saveData() {
        try {
            const success = Utils.StorageUtils.save(Utils.CONFIG.STORAGE_KEYS.TRANSACTIONS, this.data.transactions) &&
                           Utils.StorageUtils.save(Utils.CONFIG.STORAGE_KEYS.INCOME_CATEGORIES, this.data.incomeCategories) &&
                           Utils.StorageUtils.save(Utils.CONFIG.STORAGE_KEYS.EXPENSE_CATEGORIES, this.data.expenseCategories) &&
                           Utils.StorageUtils.save(Utils.CONFIG.STORAGE_KEYS.ACCOUNTS, this.data.accounts) &&
                           Utils.StorageUtils.save(Utils.CONFIG.STORAGE_KEYS.SETTINGS, this.data.settings) &&
                           Utils.StorageUtils.save(Utils.CONFIG.STORAGE_KEYS.RECONCILIATION_HISTORY, this.data.reconciliationHistory);
            if (!success) throw new Error('Failed to save one or more data components');
        } catch (error) {
            console.error('Error saving data:', error); Utils.UIUtils.showMessage('Có lỗi khi lưu dữ liệu', 'error'); throw error;
        }
    }

	updateHeaderSummary() {
		try {
			let totalIncome = 0; let totalExpense = 0;
			this.data.transactions.forEach(tx => {
				try {
					if (!tx || !tx.datetime) return;
					const amount = parseFloat(tx?.amount) || 0;
					if (tx?.type === 'Thu' && !tx?.isTransfer) totalIncome += amount;
					else if (tx?.type === 'Chi' && !tx?.isTransfer) totalExpense += amount;
				} catch (error) { console.warn('Invalid transaction in header summary:', tx, error); }
			});
			const realTotalBalance = this.getAllAccountBalances();
			const totalRealBalance = Object.values(realTotalBalance).reduce((sum, balance) => sum + (parseFloat(balance) || 0), 0);
			const headerIncome = document.getElementById('header-income');
			const headerExpense = document.getElementById('header-expense');
			const headerBalance = document.getElementById('header-balance');
			if (headerIncome) headerIncome.textContent = Utils.CurrencyUtils.formatCurrency(totalIncome);
			if (headerExpense) headerExpense.textContent = Utils.CurrencyUtils.formatCurrency(totalExpense);
			if (headerBalance) {
				headerBalance.textContent = Utils.CurrencyUtils.formatCurrency(totalRealBalance);
				headerBalance.className = `summary-value ${totalRealBalance >= 0 ? 'text-success' : 'text-danger'}`;
			}
			const incomeLabel = headerIncome?.parentNode?.querySelector('.summary-label');
			const expenseLabel = headerExpense?.parentNode?.querySelector('.summary-label');
			const balanceLabel = headerBalance?.parentNode?.querySelector('.summary-label');
			if (incomeLabel) incomeLabel.textContent = 'Tổng thu nhập';
			if (expenseLabel) expenseLabel.textContent = 'Tổng chi tiêu';
			if (balanceLabel) balanceLabel.textContent = 'Số dư hiện tại';
		} catch (error) { console.error('Error updating header summary:', error); }
	}

    cleanup() {
        this.eventListeners.forEach(({ element, event, handler }) => {
            if (element && typeof element.removeEventListener === 'function') element.removeEventListener(event, handler);
        });
        this.eventListeners = [];
        const modules = [window.TransactionsModule, window.HistoryModule, window.StatisticsModule, window.CategoriesModule, window.SettingsModule];
        modules.forEach(module => { if (module && typeof module.destroy === 'function') module.destroy(); });
    }

    addTransaction(transactionData) {
        return transactionData.type === 'Transfer' ? this.addTransferTransaction(transactionData) : this.addRegularTransaction(transactionData);
    }

    addRegularTransaction(data) {
        const amount = parseFloat(data.amount) || 0;
        if (isNaN(amount) || amount <= 0) throw new Error('Số tiền giao dịch không hợp lệ.');
        const transaction = {
            id: Utils.UIUtils.generateId(), datetime: data.datetime, type: data.type, category: data.category,
            amount, account: data.account, description: data.description || '',
            originalAmount: data.originalAmount || amount, originalCurrency: data.originalCurrency || 'VND',
            isTransfer: false, transferPairId: null, createdAt: new Date().toISOString()
        };
        this.data.transactions.push(transaction); this.saveData(); this.updateHeaderSummary();
        return transaction;
    }

    updateTransaction(transactionId, transactionData) {
        const index = this.data.transactions.findIndex(tx => tx && tx.id === transactionId);
        if (index === -1) return null;
        const existingTransaction = this.data.transactions[index];
        const validation = Utils.ValidationUtils.validateTransaction(transactionData);
        if (!validation.isValid) throw new Error(validation.errors[0]);
        if (existingTransaction.isTransfer) {
            this.data.transactions = this.data.transactions.filter(tx => tx && tx.id !== existingTransaction.id && tx.id !== existingTransaction.transferPairId);
            const newTransfer = this.addTransferTransaction(transactionData);
            if (newTransfer) { Utils.UIUtils.showMessage('Giao dịch chuyển tiền đã được cập nhật', 'success'); return newTransfer; }
            else throw new Error('Lỗi khi cập nhật giao dịch chuyển tiền.');
        } else {
            const updatedTransaction = {
                ...existingTransaction, ...transactionData,
                amount: parseFloat(transactionData.amount) || 0,
                originalAmount: parseFloat(transactionData.originalAmount) || (parseFloat(transactionData.amount) || 0),
                updatedAt: new Date().toISOString()
            };
            this.data.transactions[index] = updatedTransaction; this.saveData(); this.updateHeaderSummary();
            return updatedTransaction;
        }
    }

    deleteTransaction(transactionId) {
        const transactionToDelete = this.data.transactions.find(tx => tx && tx.id === transactionId);
        if (!transactionToDelete) return false;
        if (transactionToDelete.isTransfer) {
            this.data.transactions = this.data.transactions.filter(tx => tx && tx.id !== transactionToDelete.id && tx.id !== transactionToDelete.transferPairId);
        } else {
            this.data.transactions = this.data.transactions.filter(tx => tx && tx.id !== transactionId);
        }
        this.saveData(); this.updateHeaderSummary();
        return true;
    }

    getFilteredTransactions(filters = {}) {
        let filtered = [...this.data.transactions];
        if (filters.period && filters.period !== 'all' && filters.period !== 'custom') {
            const { start, end } = Utils.DateUtils.getPeriodDates(filters.period);
            if (start && end) filtered = filtered.filter(tx => { try { if (!tx || !tx.datetime) return false; const d = new Date(tx.datetime); return !isNaN(d.getTime()) && d >= start && d <= end; } catch (e) { return false; } });
        } else if (filters.period === 'custom' && filters.date) {
            const targetDateStr = filters.date.split('T')[0];
            filtered = filtered.filter(tx => { if (!tx || !tx.datetime) return false; return new Date(tx.datetime).toISOString().split('T')[0] === targetDateStr; });
        } else if (filters.period === 'custom_range' && filters.startDate && filters.endDate) {
            filtered = filtered.filter(tx => { if (!tx || !tx.datetime) return false; const d = new Date(tx.datetime); return !isNaN(d.getTime()) && d >= filters.startDate && d <= filters.endDate; });
        }
        if (filters.type) filtered = filtered.filter(tx => tx?.type === filters.type);
        if (filters.account) filtered = filtered.filter(tx => tx?.account === filters.account);
        if (filters.category) filtered = filtered.filter(tx => tx?.category === filters.category);
        if (filters.excludeTransfers) filtered = filtered.filter(tx => !tx?.isTransfer);
        return filtered;
    }

    getAccountBalance(accountValue) {
        let balance = 0; if (!accountValue) return 0;
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
        this.data.accounts.forEach(account => { if (account && account.value) balances[account.value] = this.getAccountBalance(account.value); });
        return balances;
    }

    getAccountName(accountValue) {
        if (!this.data || !Array.isArray(this.data.accounts)) return accountValue || 'Unknown Account';
        const account = this.data.accounts.find(acc => acc && acc.value === accountValue);
        return account ? account.text : accountValue || 'Unknown Account';
    }

    refreshAllModules() {
        this.updateHeaderSummary();
        this.refreshActiveModule(this.currentTab);
        if (window.CategoriesModule?.refresh) window.CategoriesModule.refresh();
        if (window.SettingsModule?.refresh) window.SettingsModule.refresh();
        document.dispatchEvent(new CustomEvent('appDataChanged', { detail: { app: this } }));
    }

    refreshActiveModule(tabId = this.currentTab) {
        let moduleToRefresh = null;
        switch (tabId) {
            case 'transactions': moduleToRefresh = window.TransactionsModule; break;
            case 'history': moduleToRefresh = window.HistoryModule; break;
            case 'statistics': moduleToRefresh = window.StatisticsModule; break;
            case 'categories': moduleToRefresh = window.CategoriesModule; break;
            case 'settings': moduleToRefresh = window.SettingsModule; break;
        }
        if (moduleToRefresh?.refresh) moduleToRefresh.refresh();
    }

    exportData() {
        return {
            version: this.data.settings.clientVersion || '1.0.0', // Sử dụng clientVersion
            exportDate: new Date().toISOString(),
            transactions: this.data.transactions,
            incomeCategories: this.data.incomeCategories,
            expenseCategories: this.data.expenseCategories,
            accounts: this.data.accounts,
            settings: this.data.settings,
            reconciliationHistory: this.data.reconciliationHistory
        };
    }

    clearAllData() {
        try {
            this.data.transactions = [];
            this.data.incomeCategories = [...this.defaultData.incomeCategories];
            this.data.expenseCategories = [...this.defaultData.expenseCategories];
            this.data.accounts = [...this.defaultData.accounts];
            this.data.settings = { ...this.defaultData.settings, clientVersion: this.data.settings.clientVersion }; // Giữ lại clientVersion
            this.data.reconciliationHistory = [];
            this.ensureTransferCategories(); this.ensureAdjustmentCategories();
            Utils.StorageUtils.clearAll(); this.saveData();
            this.refreshAllModules();
            return true;
        } catch (error) { console.error('Error clearing all data:', error); return false; }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        window.FinancialApp = new FinancialApp();
        await window.FinancialApp.init();
    } catch (error) {
        console.error('Failed to initialize app from DOMContentLoaded:', error);
        document.body.innerHTML = `<div style="text-align: center; padding: 2rem; color: #ef4444;"><h1>⚠️ Lỗi khởi tạo ứng dụng</h1><p>Vui lòng tải lại trang hoặc xóa dữ liệu trình duyệt nếu lỗi vẫn tiếp diễn.</p><button onclick="location.reload()" style="padding: 1rem 2rem; margin: 1rem; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer;">Tải lại trang</button><button onclick="localStorage.clear(); location.reload()" style="padding: 1rem 2rem; margin: 1rem; background: #ef4444; color: white; border: none; border-radius: 8px; cursor: pointer;">Xóa dữ liệu & Tải lại</button></div>`;
    }
});
