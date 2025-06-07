/**
 * ===================================================================
 * FILE: APP.JS - COMBINED & UPDATED VERSION
 * Chứa cả class điều khiển chính (FinancialApp) và class tối ưu di động (MobileChartEnhancements).
 * Logic khởi tạo đã được sửa lại để đảm bảo chạy đúng thứ tự.
 * ===================================================================
 */

// ===================================================================
// PHẦN 1: CLASS ĐIỀU KHIỂN CHÍNH CỦA ỨNG DỤNG
// ===================================================================
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
        this.modules = {}; 
        
        // Trạng thái ẩn/hiện header, được đọc từ localStorage
        this.isSummaryHidden = localStorage.getItem('summary_hidden') === 'true';

        // Dữ liệu mặc định
        this.defaultData = {
            incomeCategories: [
                { value: "Lương", text: "Lương" }, { value: "Thưởng", text: "Thưởng" },
                { value: "Tiền được trả nợ", text: "Tiền được trả nợ" }, { value: "Lãi tiết kiệm", text: "Lãi tiết kiệm" },
                { value: "Thu nhập từ đầu tư", text: "Thu nhập từ đầu tư" }, { value: "Thu nhập phụ", text: "Thu nhập phụ" },
                { value: "Thu nhập khác", text: "Thu nhập khác" },
            ],
            expenseCategories: [
                { value: "Ăn uống", text: "Ăn uống" }, { value: "Đi lại", text: "Đi lại" },
                { value: "Nhà ở", text: "Nhà ở" }, { value: "Hóa đơn", text: "Hóa đơn" },
                { value: "Mua sắm", text: "Mua sắm" }, { value: "Giải trí", text: "Giải trí" },
                { value: "Sức khỏe", text: "Sức khỏe" }, { value: "Giáo dục", text: "Giáo dục" },
                { value: "Chi cho đầu tư", text: "Chi cho đầu tư" }, { value: "Trả nợ", text: "Trả nợ" },
                { value: "Chi phí khác", text: "Chi phí khác" },
            ],
            accounts: [
                { value: "Tiền mặt", text: "Tiền mặt" }, { value: "Momo", text: "Momo" },
                { value: "Thẻ tín dụng", text: "Thẻ tín dụng" }, { value: "Techcombank", text: "Techcombank" }
            ],
            settings: {
                theme: 'auto',
                defaultCurrency: 'VND',
                usdRate: Utils?.CONFIG?.USD_TO_VND_RATE || 25000,
                clientVersion: '1.0.0'
            }
        };
    }

    async init() {
        if (this.isInitialized) return;
        console.log('🚀 Initializing Financial App...');
        
        this.loadData();
        
        Utils.ThemeUtils.initializeTheme();
        this.initializeNavigation();
        this.initializeGlobalEventListeners();
        this.initializeVisibilityToggle(); // Khởi tạo nút con mắt
        
        await this.initializeModules();

        this.updateHeaderSummary();
        this.handleInitialTab();
        
        this.isInitialized = true;
        console.log('✅ Financial App initialized successfully');
    }

    loadData() {
        console.log('📂 Loading data...');
        const transactions = Utils.StorageUtils.load(Utils.CONFIG.STORAGE_KEYS.TRANSACTIONS, []);
        this.data.transactions = Array.isArray(transactions) ? transactions : [];

        const incomeCategories = Utils.StorageUtils.load(Utils.CONFIG.STORAGE_KEYS.INCOME_CATEGORIES, this.defaultData.incomeCategories);
        this.data.incomeCategories = Array.isArray(incomeCategories) && incomeCategories.length > 0 ? incomeCategories : JSON.parse(JSON.stringify(this.defaultData.incomeCategories));

        const expenseCategories = Utils.StorageUtils.load(Utils.CONFIG.STORAGE_KEYS.EXPENSE_CATEGORIES, this.defaultData.expenseCategories);
        this.data.expenseCategories = Array.isArray(expenseCategories) && expenseCategories.length > 0 ? expenseCategories : JSON.parse(JSON.stringify(this.defaultData.expenseCategories));
        
        this.ensureSystemCategories();

        const accounts = Utils.StorageUtils.load(Utils.CONFIG.STORAGE_KEYS.ACCOUNTS, this.defaultData.accounts);
        this.data.accounts = Array.isArray(accounts) && accounts.length > 0 ? accounts : JSON.parse(JSON.stringify(this.defaultData.accounts));
        
        const settings = Utils.StorageUtils.load(Utils.CONFIG.STORAGE_KEYS.SETTINGS, {});
        this.data.settings = { ...this.defaultData.settings, ...settings };
        
        this.data.reconciliationHistory = Utils.StorageUtils.load(Utils.CONFIG.STORAGE_KEYS.RECONCILIATION_HISTORY, []);
    }
    
    ensureSystemCategories() {
        const systemCats = [
            { type: 'income', value: Utils.CONFIG.TRANSFER_CATEGORY_IN, text: "Nhận tiền chuyển khoản" },
            { type: 'expense', value: Utils.CONFIG.TRANSFER_CATEGORY_OUT, text: "Chuyển tiền đi" },
            { type: 'income', value: Utils.CONFIG.RECONCILE_ADJUST_INCOME_CAT, text: "Điều chỉnh Đối Soát (Thu)" },
            { type: 'expense', value: Utils.CONFIG.RECONCILE_ADJUST_EXPENSE_CAT, text: "Điều chỉnh Đối Soát (Chi)" }
        ];

        systemCats.forEach(catInfo => {
            const targetArray = catInfo.type === 'income' ? this.data.incomeCategories : this.data.expenseCategories;
            if (!targetArray.some(c => c.value === catInfo.value)) {
                targetArray.push({ ...catInfo, system: true });
            }
        });
    }

    async initializeModules() {
        console.log('🔧 Initializing sub-modules...');
        const moduleInitializers = {
            'TransactionsModule': window.TransactionsModule,
            'HistoryModule': window.HistoryModule,
            'StatisticsModule': window.StatisticsModule,
            'CategoriesModule': window.CategoriesModule,
            'SettingsModule': window.SettingsModule
        };

        for (const name in moduleInitializers) {
            if (moduleInitializers[name]) {
                try {
                    this.modules[name] = moduleInitializers[name];
                    await this.modules[name].init(this);
                } catch (error) {
                    console.error(`❌ Failed to initialize ${name}:`, error);
                }
            }
        }
    }

    initializeNavigation() {
        document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchTab(item.dataset.tab);
            });
        });
    }

    initializeGlobalEventListeners() {
        // Có thể thêm các event listener toàn cục khác ở đây
    }
    
    initializeVisibilityToggle() {
        const toggleBtn = document.getElementById('toggle-summary-visibility');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.isSummaryHidden = !this.isSummaryHidden;
                localStorage.setItem('summary_hidden', this.isSummaryHidden);
                this.updateHeaderSummary();
            });
        }
    }

    handleInitialTab() {
        const hash = window.location.hash.slice(1);
        const validTabs = ['transactions', 'history', 'statistics', 'categories', 'settings'];
        this.switchTab(validTabs.includes(hash) ? hash : 'transactions');
    }
    
    switchTab(tabId) {
        document.querySelector('.tab-content.active')?.classList.remove('active');
        document.querySelector('.nav-item.active')?.classList.remove('active');
        document.getElementById(`tab-${tabId}`)?.classList.add('active');
        document.querySelector(`.nav-item[data-tab="${tabId}"]`)?.classList.add('active');
        this.currentTab = tabId;
        window.location.hash = tabId;
        this.refreshActiveModule();
    }
    
    updateHeaderSummary() {
        try {
            const range = Utils.DateUtils.getPeriodDates('month');
            let income = 0, expense = 0;

            this.data.transactions.forEach(tx => {
                const txDate = new Date(tx.datetime);
                if (txDate >= range.start && txDate <= range.end && !tx.isTransfer) {
                    if (tx.type === 'Thu') income += tx.amount;
                    else if (tx.type === 'Chi') expense += tx.amount;
                }
            });

            const balance = this.data.accounts.reduce((sum, acc) => sum + this.getAccountBalance(acc.value), 0);
            
            const incomeEl = document.getElementById('header-income');
            const expenseEl = document.getElementById('header-expense');
            const balanceEl = document.getElementById('header-balance');
            const toggleBtn = document.getElementById('toggle-summary-visibility');

            if(toggleBtn) {
                toggleBtn.innerHTML = this.isSummaryHidden ? '🙈' : '👁️';
            }

            if (this.isSummaryHidden) {
                incomeEl.textContent = '****** ₫';
                expenseEl.textContent = '****** ₫';
                balanceEl.textContent = '****** ₫';
            } else {
                incomeEl.textContent = Utils.CurrencyUtils.formatCurrency(income);
                expenseEl.textContent = Utils.CurrencyUtils.formatCurrency(expense);
                balanceEl.textContent = Utils.CurrencyUtils.formatCurrency(balance);
            }
            
            balanceEl.className = `summary-value ${balance >= 0 ? 'text-success' : 'text-danger'}`;
        } catch (error) {
            console.error("Error updating header:", error);
        }
    }
    
    getAccountBalance(accountValue) {
        let balance = 0;
        this.data.transactions.forEach(tx => {
            if (tx.account === accountValue) {
                balance += (tx.type === 'Thu' ? tx.amount : -tx.amount);
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
    saveData() {
        try {
            Utils.StorageUtils.save(Utils.CONFIG.STORAGE_KEYS.TRANSACTIONS, this.data.transactions);
            Utils.StorageUtils.save(Utils.CONFIG.STORAGE_KEYS.INCOME_CATEGORIES, this.data.incomeCategories);
            Utils.StorageUtils.save(Utils.CONFIG.STORAGE_KEYS.EXPENSE_CATEGORIES, this.data.expenseCategories);
            Utils.StorageUtils.save(Utils.CONFIG.STORAGE_KEYS.ACCOUNTS, this.data.accounts);
            Utils.StorageUtils.save(Utils.CONFIG.STORAGE_KEYS.SETTINGS, this.data.settings);
            Utils.StorageUtils.save(Utils.CONFIG.STORAGE_KEYS.RECONCILIATION_HISTORY, this.data.reconciliationHistory);
            console.log('💾 Data saved.');
        } catch (error) {
            console.error('Error saving data:', error);
            Utils.UIUtils.showMessage('Lỗi nghiêm trọng khi lưu dữ liệu.', 'error');
        }
    }

    refreshAllModules() {
        console.log('🔄 Refreshing all modules...');
        this.updateHeaderSummary();
        Object.values(this.modules).forEach(module => {
            if (module && typeof module.refresh === 'function') {
                module.refresh();
            }
        });
    }
    refreshActiveModule() {
        const moduleMap = {
            'transactions': 'TransactionsModule',
            'history': 'HistoryModule',
            'statistics': 'StatisticsModule',
            'categories': 'CategoriesModule',
            'settings': 'SettingsModule',
        };
        const moduleToRefresh = this.modules[moduleMap[this.currentTab]];
        if (moduleToRefresh && typeof moduleToRefresh.refresh === 'function') {
            moduleToRefresh.refresh();
        }
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

                this.refreshAllModules(); // <<--- DÒNG NÀY QUAN TRỌNG ---<<
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
			// SỬA ĐỔI: Ưu tiên mô tả của người dùng, nếu không có thì tự động tạo
			description: data.description || `Chuyển tiền đến ${toAccountName}`,
			originalAmount: data.originalAmount || data.amount, originalCurrency: data.originalCurrency || 'VND',
			isTransfer: true, transferPairId: inId, createdAt: new Date().toISOString()
		};
		const inTransaction = {
			id: inId, datetime, type: 'Thu', category: Utils.CONFIG.TRANSFER_CATEGORY_IN,
			amount: data.amount, account: data.toAccount,
			// SỬA ĐỔI: Ưu tiên mô tả của người dùng, nếu không có thì tự động tạo
			description: data.description || `Nhận tiền từ ${fromAccountName}`,
			originalAmount: data.originalAmount || data.amount, originalCurrency: data.originalCurrency || 'VND',
			isTransfer: true, transferPairId: outId, createdAt: new Date().toISOString()
		};
        try {
            this.data.transactions.unshift(inTransaction, outTransaction);
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
        this.data.transactions.unshift(transaction);
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

// Thay thế hàm updateTransaction cũ trong app.js bằng hàm này
	updateTransaction(transactionId, transactionData) {
		const index = this.data.transactions.findIndex(tx => tx && tx.id === transactionId);
		if (index === -1) {
			Utils.UIUtils.showMessage('Không tìm thấy giao dịch để cập nhật.', 'error');
			return false;
		}

		const existingTransaction = this.data.transactions[index];
		const nowISO = new Date().toISOString();

		try {
			if (existingTransaction.isTransfer) {
				// Xử lý cập nhật cho giao dịch chuyển khoản
				const pairIndex = this.data.transactions.findIndex(tx => tx && tx.id === existingTransaction.transferPairId);
				if (pairIndex === -1) {
					throw new Error('Không tìm thấy giao dịch đối ứng trong cặp chuyển khoản.');
				}
				const pairTransaction = this.data.transactions[pairIndex];

				// Cập nhật thông tin chung cho cả hai
				const newAmount = parseFloat(transactionData.amount) || 0;
				const fromAccountName = this.getAccountName(transactionData.account);
				const toAccountName = this.getAccountName(transactionData.toAccount);

				// Cập nhật giao dịch CHI (out)
				const expenseTx = existingTransaction.type === 'Chi' ? existingTransaction : pairTransaction;
				Object.assign(expenseTx, {
					amount: newAmount,
					account: transactionData.account, // Tài khoản nguồn
					toAccount: transactionData.toAccount, // Tài khoản đích
					datetime: transactionData.datetime,
					description: `Chuyển tiền đến ${toAccountName}`,
					originalAmount: transactionData.originalAmount || newAmount,
					originalCurrency: transactionData.originalCurrency,
					updatedAt: nowISO
				});

				// Cập nhật giao dịch THU (in)
				const incomeTx = existingTransaction.type === 'Thu' ? existingTransaction : pairTransaction;
				Object.assign(incomeTx, {
					amount: newAmount,
					account: transactionData.toAccount, // Tài khoản đích
					fromAccount: transactionData.account, // Tài khoản nguồn
					datetime: transactionData.datetime,
					description: `Nhận tiền từ ${fromAccountName}`,
					originalAmount: transactionData.originalAmount || newAmount,
					originalCurrency: transactionData.originalCurrency,
					updatedAt: nowISO
				});

			} else {
				// Xử lý cập nhật cho giao dịch thường
				const updatedTransaction = {
					...existingTransaction,
					...transactionData,
					amount: parseFloat(transactionData.amount) || 0,
					originalAmount: parseFloat(transactionData.originalAmount) || parseFloat(transactionData.amount) || 0,
					updatedAt: nowISO
				};
				this.data.transactions[index] = updatedTransaction;
			}

			this.saveData();
			this.refreshAllModules(); // Dùng refreshAllModules để đảm bảo mọi thứ được cập nhật
			Utils.UIUtils.showMessage('Giao dịch đã được cập nhật thành công', 'success');
			return true;

		} catch (error) {
			console.error("Lỗi trong App.updateTransaction:", error);
			Utils.UIUtils.showMessage(`Lỗi cập nhật giao dịch: ${error.message}`, 'error');
			return false;
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

	checkForUpdates() {
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.getRegistration().then(reg => {
				if (!reg) return;

				// Lắng nghe sự kiện khi có một service worker mới được tìm thấy
				reg.addEventListener('updatefound', () => {
					const newWorker = reg.installing;
					console.log('Service Worker: Update found. New worker is installing.');

					newWorker.addEventListener('statechange', () => {
						// Khi service worker mới đã cài đặt và đang chờ...
						if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
							console.log('Service Worker: New version is ready to be activated.');
							// Hiển thị thông báo cho người dùng
							const messageBox = document.getElementById('message-box');
							if (messageBox) {
								messageBox.innerHTML = `
									<div class="update-notification">
										<span>🎉 Đã có phiên bản mới!</span>
										<button id="reload-page-button">Cập Nhật</button>
									</div>`;
								messageBox.style.display = 'block';

								document.getElementById('reload-page-button').addEventListener('click', () => {
									// Gửi tín hiệu để service worker mới kích hoạt
									// Vì sw.js đã có self.skipWaiting(), chỉ cần tải lại trang là đủ.
									window.location.reload();
								});
							}
						}
					});
				});

				// Chủ động kiểm tra cập nhật từ server (chạy ngầm)
				// Lệnh này sẽ so sánh file sw.js trên server và file đang cài đặt
				reg.update().catch(err => console.error('Service Worker: Update check failed.', err));

			}).catch(err => {
				console.error('Service Worker: Error getting registration.', err);
			});
		}
	}
}

// ===================================================================
// PHẦN 2: CLASS TỐI ƯU GIAO DIỆN CHO DI ĐỘNG
// ===================================================================
class MobileChartEnhancements {
    constructor() {
        this.isInitialized = false;
        this.touchStartY = 0;
        this.touchStartX = 0;
        this.isScrolling = false;
        this.orientation = this.getOrientation();
        this.setupEventListeners();
    }

    init() {
        if (this.isInitialized) return;
        
        console.log('📱 Initializing Mobile Chart Enhancements...');
        
        this.addMobileSpecificClasses();
        this.setupTouchOptimizations();
        this.setupOrientationChange();
        this.setupViewportOptimization();
        this.setupPerformanceOptimizations();
        
        this.isInitialized = true;
        console.log('✅ Mobile Chart Enhancements initialized');
    }

    getOrientation() {
        return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
    }

    setupEventListeners() {
        // Orientation change
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.handleOrientationChange(), 100);
        });

        // Resize with debounce
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.handleResize(), 150);
        });

        // Visibility change (app goes background)
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });
    }

    addMobileSpecificClasses() {
        const isMobile = this.isMobileDevice();
        const isSmallMobile = window.innerWidth <= 480;
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

        if (isMobile) {
            document.body.classList.add('mobile-device');
        }
        if (isSmallMobile) {
            document.body.classList.add('small-mobile');
        }
        if (isIOS) {
            document.body.classList.add('ios-device');
        }

        // Add orientation class
        document.body.classList.add(`orientation-${this.orientation}`);
    }

    setupTouchOptimizations() {
        // Prevent double-tap zoom on chart elements
        const chartElements = document.querySelectorAll('.chart-container, .chart-legend');
        
        chartElements.forEach(element => {
            element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
            element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
            element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
        });

        // Optimize legend scrolling
        const legends = document.querySelectorAll('.chart-legend');
        legends.forEach(legend => {
            legend.style.webkitOverflowScrolling = 'touch';
            legend.style.scrollBehavior = 'smooth';
        });
    }

    handleTouchStart(e) {
        this.touchStartY = e.touches[0].clientY;
        this.touchStartX = e.touches[0].clientX;
        this.isScrolling = false;
    }

    handleTouchMove(e) {
        if (!this.touchStartY || !this.touchStartX) return;

        const currentY = e.touches[0].clientY;
        const currentX = e.touches[0].clientX;
        const deltaY = Math.abs(currentY - this.touchStartY);
        const deltaX = Math.abs(currentX - this.touchStartX);

        // Detect if user is scrolling
        if (deltaY > deltaX && deltaY > 10) {
            this.isScrolling = true;
        }

        // Prevent zoom on chart interaction if not scrolling
        if (!this.isScrolling && e.target.closest('.chart-container')) {
            e.preventDefault();
        }
    }

    handleTouchEnd(e) {
        this.touchStartY = 0;
        this.touchStartX = 0;
        this.isScrolling = false;
    }

    setupOrientationChange() {
        // Handle orientation change with delay for iOS
        const handleOrientationChange = () => {
            setTimeout(() => {
                this.orientation = this.getOrientation();
                document.body.classList.remove('orientation-portrait', 'orientation-landscape');
                document.body.classList.add(`orientation-${this.orientation}`);
                
                this.adjustChartsForOrientation();
                this.triggerChartRefresh();
            }, 300); // iOS needs delay for accurate viewport
        };

        window.addEventListener('orientationchange', handleOrientationChange);
        window.addEventListener('resize', handleOrientationChange);
    }

    adjustChartsForOrientation() {
        const chartContainers = document.querySelectorAll('.chart-container');
        const isLandscape = this.orientation === 'landscape';
        const isMobile = this.isMobileDevice();

        if (!isMobile) return;

        chartContainers.forEach(container => {
            if (isLandscape) {
                container.style.height = '180px';
            } else {
                const isSmallMobile = window.innerWidth <= 480;
                container.style.height = isSmallMobile ? '220px' : '250px';
            }
        });

        // Adjust trend and comparison charts
        const trendContainer = document.querySelector('.trend-chart-container');
        const comparisonContainer = document.querySelector('.comparison-chart-container');

        if (trendContainer) {
            trendContainer.style.height = isLandscape ? '160px' : '200px';
        }
        if (comparisonContainer) {
            comparisonContainer.style.height = isLandscape ? '150px' : '180px';
        }
    }

    setupViewportOptimization() {
        // Prevent viewport zoom on input focus
        const metaViewport = document.querySelector('meta[name="viewport"]');
        if (metaViewport) {
            metaViewport.setAttribute('content', 
                'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
            );
        }

        // Handle iOS keyboard appearance
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
            window.addEventListener('focusin', () => {
                document.body.classList.add('keyboard-open');
            });
            
            window.addEventListener('focusout', () => {
                document.body.classList.remove('keyboard-open');
                setTimeout(() => {
                    window.scrollTo(0, 0);
                }, 100);
            });
        }
    }

    setupPerformanceOptimizations() {
        // Reduce motion for better performance
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.body.classList.add('reduce-motion');
        }

        // Monitor performance
        this.setupPerformanceMonitoring();
    }

    setupPerformanceMonitoring() {
        let frameCount = 0;
        let lastTime = performance.now();

        const checkFPS = () => {
            frameCount++;
            const currentTime = performance.now();
            
            if (currentTime >= lastTime + 1000) {
                const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
                
                if (fps < 30) {
                    console.warn(`Low FPS detected: ${fps}`);
                    this.enablePerformanceMode();
                }
                
                frameCount = 0;
                lastTime = currentTime;
            }
            
            requestAnimationFrame(checkFPS);
        };

        // Only monitor on mobile
        if (this.isMobileDevice()) {
            requestAnimationFrame(checkFPS);
        }
    }

    enablePerformanceMode() {
        document.body.classList.add('performance-mode');
        
        // Reduce chart animations
        const charts = window.StatisticsModule?.charts || {};
        Object.values(charts).forEach(chart => {
            if (chart && chart.options) {
                chart.options.animation = { duration: 0 };
                chart.update('none');
            }
        });
    }

    handleOrientationChange() {
        console.log('📱 Orientation changed to:', this.orientation);
        
        // Update layout
        this.adjustChartsForOrientation();
        
        // Refresh charts after orientation stabilizes
        setTimeout(() => {
            this.triggerChartRefresh();
        }, 500);
    }

    handleResize() {
        if (!this.isMobileDevice()) return;
        
        console.log('📱 Mobile resize detected');
        this.addMobileSpecificClasses();
        this.adjustChartsForOrientation();
        
        // Debounced chart refresh
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            this.triggerChartRefresh();
        }, 300);
    }

    handleVisibilityChange() {
        if (document.hidden) {
            // App went to background - pause animations
            this.pauseChartAnimations();
        } else {
            // App came to foreground - resume and refresh
            this.resumeChartAnimations();
            setTimeout(() => {
                this.triggerChartRefresh();
            }, 100);
        }
    }

    pauseChartAnimations() {
        const charts = window.StatisticsModule?.charts || {};
        Object.values(charts).forEach(chart => {
            if (chart && chart.options) {
                chart.options.animation = { duration: 0 };
            }
        });
    }

    resumeChartAnimations() {
        const charts = window.StatisticsModule?.charts || {};
        const isMobile = this.isMobileDevice();
        
        Object.values(charts).forEach(chart => {
            if (chart && chart.options) {
                chart.options.animation = { 
                    duration: isMobile ? 400 : 800,
                    easing: 'easeOutQuart'
                };
            }
        });
    }

    triggerChartRefresh() {
        if (window.StatisticsModule && window.StatisticsModule.isInitialized) {
            try {
                // SỬA Ở ĐÂY: Gọi phương thức refresh() hoặc refreshAll()
                // Giả sử refresh() là public API để làm mới module thống kê
                window.StatisticsModule.refresh(); 
                console.log('MobileChartEnhancements: Called StatisticsModule.refresh()');
            } catch (error) {
                console.error('Error calling StatisticsModule.refresh() from MobileChartEnhancements:', error);
            }
        } else {
            console.warn('MobileChartEnhancements: StatisticsModule not available or not initialized for chart refresh.');
        }
    }

    isMobileDevice() {
        return window.innerWidth <= 768 || 
               /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    // Public method to manually trigger optimizations
    optimize() {
        this.adjustChartsForOrientation();
        this.triggerChartRefresh();
        console.log('📱 Manual mobile optimization triggered');
    }

    // Debug method
    getDebugInfo() {
        return {
            isMobile: this.isMobileDevice(),
            orientation: this.orientation,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            devicePixelRatio: window.devicePixelRatio,
            userAgent: navigator.userAgent,
            classes: Array.from(document.body.classList),
            isInitialized: this.isInitialized
        };
    }
}

// CSS for mobile enhancements
const mobileEnhancementCSS = `
<style>
/* Performance mode optimizations */
.performance-mode * {
    animation-duration: 0s !important;
    transition-duration: 0s !important;
}

/* Keyboard open state for iOS */
.keyboard-open {
    height: 100vh;
    overflow: hidden;
}

/* Reduce motion support */
.reduce-motion * {
    animation-duration: 0.01s !important;
    transition-duration: 0.01s !important;
}

/* Mobile device specific */
.mobile-device .chart-legend {
    -webkit-overflow-scrolling: touch;
    scroll-behavior: smooth;
}

.ios-device .chart-container {
    -webkit-transform: translateZ(0);
    transform: translateZ(0);
}

/* Small mobile adjustments */
.small-mobile .stats-card {
    min-height: 80px;
}

.small-mobile .legend-item {
    min-height: 40px;
}

/* Orientation specific */
.orientation-landscape .chart-container-wrapper {
    flex-direction: row;
    align-items: flex-start;
}

.orientation-portrait .chart-container-wrapper {
    flex-direction: column;
}

/* Touch optimization */
.chart-legend,
.chart-type-selector,
.legend-item {
    -webkit-tap-highlight-color: rgba(0,0,0,0.1);
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
}

/* Scrollbar for mobile legend */
.chart-legend::-webkit-scrollbar {
    width: 4px;
}

.chart-legend::-webkit-scrollbar-track {
    background: var(--bg-tertiary);
}

.chart-legend::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 2px;
}

/* High DPI optimization */
@media (-webkit-min-device-pixel-ratio: 2) {
    .chart-container canvas {
        image-rendering: -webkit-optimize-contrast;
        image-rendering: crisp-edges;
    }
}
</style>
`;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Add CSS
    if (!document.getElementById('mobile-enhancement-css')) {
        const styleElement = document.createElement('div');
        styleElement.id = 'mobile-enhancement-css';
        styleElement.innerHTML = mobileEnhancementCSS;
        document.head.appendChild(styleElement);
    }

    // Initialize enhancements
    window.MobileChartEnhancements = new MobileChartEnhancements();
    
    // Wait for other modules to load
    setTimeout(() => {
        window.MobileChartEnhancements.init();
    }, 500);
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileChartEnhancements;
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