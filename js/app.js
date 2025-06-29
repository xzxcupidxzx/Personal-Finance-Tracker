/**
 * ===================================================================
 * APP.JS - FIXED VERSION WITH ROBUST IMPORT/EXPORT & CLEAR DATA
 * Sửa lỗi CSV/JSON import/export và clear data functionality
 * ===================================================================
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
        this.modules = {}; 
        
        // Trạng thái ẩn/hiện header
        this.isSummaryHidden = localStorage.getItem('summary_hidden') === 'true';
        
        // Dữ liệu mặc định
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
                { value: "Hóa đơn", text: "Hóa đơn" },
                { value: "Mua sắm", text: "Mua sắm" }, 
                { value: "Giải trí", text: "Giải trí" },
                { value: "Sức khỏe", text: "Sức khỏe" }, 
                { value: "Giáo dục", text: "Giáo dục" },
                { value: "Chi cho đầu tư", text: "Chi cho đầu tư" }, 
                { value: "Trả nợ", text: "Trả nợ" },
                { value: "Chi phí khác", text: "Chi phí khác" },
            ],
            accounts: [
                { value: "Tiền mặt hệ thống", text: "Tiền mặt hệ thống" }, 
                { value: "Momo", text: "Momo" },
                { value: "Thẻ tín dụng", text: "Thẻ tín dụng" }, 
                { value: "Techcombank", text: "Techcombank" }
            ],
            settings: {
                theme: 'auto',
                defaultCurrency: 'VND',
                usdRate: Utils?.CONFIG?.USD_TO_VND_RATE || 25000,
                clientVersion: '1.0.0'
            }
        };
        this.installPromptEvent = null;
    }

    async init() {
        if (this.isInitialized) return;
        console.log('🚀 Initializing Financial App...');
        
        this.loadData();
        
        Utils.ThemeUtils.initializeTheme();
        this.initializeNavigation();
        this.initializeGlobalEventListeners();
        this.initializeVisibilityToggle();
        
        // Initialize UpdateManager
        try {
            if (Utils.UpdateManager) {
                const clientVersion = typeof APP_VERSION !== 'undefined' ? APP_VERSION : (this.data.settings.clientVersion || '0.0.0');
                Utils.UpdateManager.init(clientVersion); 
                this.updateManager = Utils.UpdateManager; 
                console.log(`🚀 UpdateManager initialized with client version: ${clientVersion}`);
            }
        } catch(e) {
            console.error('❌ Failed to initialize UpdateManager:', e);
        }
        
        await this.initializeModules();

        this.updateHeaderSummary();
        this.handleInitialTab();
        
        this.isInitialized = true;
        console.log('✅ Financial App initialized successfully');
    }

    loadData() {
        console.log('📂 Loading data...');
        try {
            const transactions = Utils.StorageUtils.load(Utils.CONFIG.STORAGE_KEYS.TRANSACTIONS, []);
            this.data.transactions = Array.isArray(transactions) ? transactions : [];

            // =========================================================================
            // === THAY ĐỔI LỚN: CHỈ THÊM DỮ LIỆU MẶC ĐỊNH KHI DỮ LIỆU RỖNG ===
            // =========================================================================

            // 1. Tải danh mục thu nhập
            const incomeCategories = Utils.StorageUtils.load(Utils.CONFIG.STORAGE_KEYS.INCOME_CATEGORIES, null);
            // Nếu không có dữ liệu (lần đầu sử dụng), mới thêm danh sách mặc định
            if (incomeCategories === null || incomeCategories.length === 0) {
                this.data.incomeCategories = JSON.parse(JSON.stringify(this.defaultData.incomeCategories));
            } else {
                this.data.incomeCategories = incomeCategories;
            }

            // 2. Tải danh mục chi tiêu
            const expenseCategories = Utils.StorageUtils.load(Utils.CONFIG.STORAGE_KEYS.EXPENSE_CATEGORIES, null);
            if (expenseCategories === null || expenseCategories.length === 0) {
                this.data.expenseCategories = JSON.parse(JSON.stringify(this.defaultData.expenseCategories));
            } else {
                this.data.expenseCategories = expenseCategories;
            }
            
            // 3. Tải tài khoản
            const accounts = Utils.StorageUtils.load(Utils.CONFIG.STORAGE_KEYS.ACCOUNTS, null);
            if (accounts === null || accounts.length === 0) {
                this.data.accounts = JSON.parse(JSON.stringify(this.defaultData.accounts));
            } else {
                this.data.accounts = accounts;
            }

            // Luôn đảm bảo các mục CẦN THIẾT cho hệ thống tồn tại
            this.ensureSystemItems();

            const settings = Utils.StorageUtils.load(Utils.CONFIG.STORAGE_KEYS.SETTINGS, {});
            this.data.settings = { ...this.defaultData.settings, ...settings };
            
            this.data.reconciliationHistory = Utils.StorageUtils.load(Utils.CONFIG.STORAGE_KEYS.RECONCILIATION_HISTORY, []);
            
            console.log(`✅ Data loaded: ${this.data.transactions.length} transactions, ${this.data.accounts.length} accounts`);
        } catch (error) {
            console.error('❌ Error loading data:', error);
            this.initializeFallbackMode(error);
        }
    }

    // Đổi tên hàm để bao gồm cả tài khoản
    ensureSystemItems() {
        this.ensureSystemCategories();
        this.ensureSystemAccounts();
    }

	ensureSystemCategories() {
        // CHỈ định nghĩa các danh mục THỰC SỰ cần cho hệ thống
		const systemCats = [
			{ type: 'income', value: Utils.CONFIG.TRANSFER_CATEGORY_IN, text: "Danh mục hệ thống thu 1" },
			{ type: 'expense', value: Utils.CONFIG.TRANSFER_CATEGORY_OUT, text: "Danh mục hệ thống chi 1" },
			{ type: 'income', value: Utils.CONFIG.RECONCILE_ADJUST_INCOME_CAT, text: "Danh mục hệ thống thu 2" },
			{ type: 'expense', value: Utils.CONFIG.RECONCILE_ADJUST_EXPENSE_CAT, text: "Danh mục hệ thống chi 2" }
		];

		systemCats.forEach(catInfo => {
			const targetArray = catInfo.type === 'income' ? this.data.incomeCategories : this.data.expenseCategories;
			// TÌM KIẾM KHÔNG PHÂN BIỆT HOA-THƯỜNG
			const existingCat = targetArray.find(c => c.value.toLowerCase() === catInfo.value.toLowerCase());

			if (existingCat) {
				existingCat.system = true;
			} else {
				targetArray.push({ ...catInfo, system: true });
			}
		});
	}

	ensureSystemAccounts() {
		const systemAccounts = [
			{ value: "Tiền mặt hệ thống", text: "Tiền mặt hệ thống" }
		];

		systemAccounts.forEach(accInfo => {
			// TÌM KIẾM KHÔNG PHÂN BIỆT HOA-THƯỜNG
			const existingAcc = this.data.accounts.find(acc => acc.value.toLowerCase() === accInfo.value.toLowerCase());

			if (existingAcc) {
				if (!existingAcc.system) {
					existingAcc.system = true;
				}
			} else {
				this.data.accounts.push({ ...accInfo, system: true });
			}
		});
	}
    // ===================================================================
    // FIXED IMPORT/EXPORT METHODS
    // ===================================================================

    /**
     * SỬA LỖI: Enhanced JSON import with comprehensive validation
     */
	async importData(importedData) {
		const loadingMessage = "Đang xử lý dữ liệu nhập...";
		this.showImportProgress(loadingMessage);

		try {
			console.log('📥 Starting JSON data import...');
			
			if (!importedData || typeof importedData !== 'object') {
				throw new Error('Dữ liệu JSON không hợp lệ - phải là object.');
			}
			
			const backupData = this.createDataBackup();
			console.log('💾 Created backup of current data');

			try {
				this.validateImportedDataStructure(importedData);
				
				this.showImportProgress("Đang validate dữ liệu...");
				
				const processedData = await this.processImportData(importedData, backupData);
				
				this.showImportProgress("Đang áp dụng thay đổi...");
				
				this.applyImportedData(processedData);
				
				// === THAY ĐỔI QUAN TRỌNG: BỎ QUA postImportProcessing() ===
				// Chúng ta tin tưởng hoàn toàn vào dữ liệu từ file backup.
				// Việc chạy lại ensureSystem... sau khi import là không cần thiết và gây lỗi.
				this.saveData();
				this.refreshAllModules();
				// =========================================================
				
				const transactionCount = this.data.transactions.length;
				const categoryCount = this.data.incomeCategories.length + this.data.expenseCategories.length;
				const accountCount = this.data.accounts.length;
				
				this.hideImportProgress();
				
				console.log(`✅ Import successful: ${transactionCount} transactions, ${categoryCount} categories, ${accountCount} accounts`);
				Utils.UIUtils.showMessage(
					`✅ Nhập dữ liệu thành công!\n📊 ${transactionCount} giao dịch\n🏷️ ${categoryCount} danh mục\n💳 ${accountCount} tài khoản`, 
					'success', 
					5000
				);
				
				return true;

			} catch (processingError) {
				console.error('❌ Error processing imported data, restoring backup:', processingError);
				this.restoreFromBackup(backupData);
				this.hideImportProgress();
				Utils.UIUtils.showMessage(`❌ Lỗi xử lý dữ liệu: ${processingError.message}`, 'error');
				return false;
			}
		} catch (error) {
			console.error('❌ Import failed:', error);
			this.hideImportProgress();
			Utils.UIUtils.showMessage(`❌ Lỗi nhập dữ liệu: ${error.message}`, 'error');
			return false;
		}
	}

    /**
     * Show import progress modal
     */
    showImportProgress(message) {
        let progressModal = document.getElementById('import-progress-modal');
        if (!progressModal) {
            progressModal = document.createElement('div');
            progressModal.id = 'import-progress-modal';
            progressModal.innerHTML = `
                <div style="
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    color: white;
                    backdrop-filter: blur(5px);
                ">
                    <div style="
                        background: rgba(255,255,255,0.1);
                        backdrop-filter: blur(10px);
                        padding: 2rem;
                        border-radius: 16px;
                        text-align: center;
                        border: 1px solid rgba(255,255,255,0.2);
                        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                        min-width: 300px;
                    ">
                        <div style="
                            width: 40px; height: 40px;
                            border: 4px solid rgba(255,255,255,0.3);
                            border-top: 4px solid white;
                            border-radius: 50%;
                            animation: spin 1s linear infinite;
                            margin: 0 auto 1rem;
                        "></div>
                        <div id="import-progress-message" style="font-size: 1.1rem; font-weight: 500;">${message}</div>
                    </div>
                </div>
            `;
            document.body.appendChild(progressModal);
        } else {
            const messageEl = document.getElementById('import-progress-message');
            if (messageEl) messageEl.textContent = message;
        }
    }

    hideImportProgress() {
        const progressModal = document.getElementById('import-progress-modal');
        if (progressModal) {
            progressModal.remove();
        }
    }

    /**
     * Create comprehensive data backup
     */
    createDataBackup() {
        return {
            transactions: JSON.parse(JSON.stringify(this.data.transactions || [])),
            incomeCategories: JSON.parse(JSON.stringify(this.data.incomeCategories || [])),
            expenseCategories: JSON.parse(JSON.stringify(this.data.expenseCategories || [])),
            accounts: JSON.parse(JSON.stringify(this.data.accounts || [])),
            settings: JSON.parse(JSON.stringify(this.data.settings || {})),
            reconciliationHistory: JSON.parse(JSON.stringify(this.data.reconciliationHistory || [])),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Validate imported data structure
     */
    validateImportedDataStructure(importedData) {
        console.log('🔍 Validating imported data structure...');
        
        // Check if it has required structure
        if (!importedData.transactions && !importedData.incomeCategories && 
            !importedData.expenseCategories && !importedData.accounts) {
            throw new Error('Dữ liệu không chứa thông tin giao dịch, danh mục hoặc tài khoản nào.');
        }

        // Validate transactions array
        if (importedData.transactions !== undefined) {
            if (!Array.isArray(importedData.transactions)) {
                throw new Error('Trường "transactions" phải là mảng.');
            }

            // Check sample transaction if array not empty
            if (importedData.transactions.length > 0) {
                const sampleTx = importedData.transactions[0];
                const requiredFields = ['id', 'type', 'datetime', 'amount', 'account'];
                
                for (const field of requiredFields) {
                    if (!(field in sampleTx)) {
                        throw new Error(`Giao dịch thiếu trường bắt buộc: "${field}"`);
                    }
                }

                // Validate transaction types
                const invalidTx = importedData.transactions.find(tx => 
                    tx && (!tx.type || !['Thu', 'Chi'].includes(tx.type))
                );
                if (invalidTx) {
                    throw new Error(`Giao dịch có loại không hợp lệ: "${invalidTx.type}". Chỉ chấp nhận "Thu" hoặc "Chi".`);
                }
            }
        }

        // Validate other arrays
        const arrayFields = ['incomeCategories', 'expenseCategories', 'accounts'];
        arrayFields.forEach(field => {
            if (field in importedData && !Array.isArray(importedData[field])) {
                throw new Error(`Trường "${field}" phải là mảng.`);
            }
        });

        console.log('✅ Import data structure validation passed');
    }

    /**
     * Process imported data with validation and cleaning
     */
    async processImportData(importedData, backupData) {
        console.log('🔄 Processing imported data...');
        
        const processedData = {};

        // Process transactions
        if (importedData.transactions) {
            processedData.transactions = await this.processImportedTransactions(importedData.transactions);
        } else {
            processedData.transactions = backupData.transactions;
        }

        // Process categories
        processedData.incomeCategories = this.processImportedCategories(
            importedData.incomeCategories, 
            backupData.incomeCategories, 
            'income'
        );
        
        processedData.expenseCategories = this.processImportedCategories(
            importedData.expenseCategories, 
            backupData.expenseCategories, 
            'expense'
        );

        // Process accounts
        processedData.accounts = this.processImportedAccounts(
            importedData.accounts, 
            backupData.accounts
        );

        // Process settings
        processedData.settings = this.processImportedSettings(
            importedData.settings, 
            backupData.settings
        );

        // Process reconciliation history
        processedData.reconciliationHistory = Array.isArray(importedData.reconciliationHistory) 
            ? importedData.reconciliationHistory 
            : backupData.reconciliationHistory;

        return processedData;
    }

    /**
     * Process imported transactions with validation
     */
    async processImportedTransactions(importedTransactions) {
        if (!Array.isArray(importedTransactions)) {
            return this.data.transactions;
        }

        console.log(`📊 Processing ${importedTransactions.length} transactions...`);
        
        const validTransactions = [];
        const seenIds = new Set();
        let duplicateCount = 0;
        let invalidCount = 0;
        let fixedCount = 0;

        for (let i = 0; i < importedTransactions.length; i++) {
            const tx = importedTransactions[i];
            
            try {
                // Basic validation
                if (!tx || typeof tx !== 'object') {
                    throw new Error('Invalid transaction object');
                }

                // Required fields check
                if (!tx.id || !tx.type || !tx.datetime || tx.amount === undefined || !tx.account) {
                    throw new Error('Missing required fields');
                }

                // Type validation
                if (!['Thu', 'Chi'].includes(tx.type)) {
                    throw new Error(`Invalid type: ${tx.type}`);
                }

                // Amount validation and fixing
                let amount = parseFloat(tx.amount);
                if (isNaN(amount)) {
                    // Try to parse from string
                    amount = Utils.ParsingUtils.parseFlexibleAmount(tx.amount);
                    if (amount <= 0) {
                        throw new Error(`Invalid amount: ${tx.amount}`);
                    }
                    fixedCount++;
                }

                // Date validation and fixing
                let datetime = tx.datetime;
                const date = new Date(datetime);
                if (isNaN(date.getTime())) {
                    // Try flexible date parsing
                    const parsedDate = Utils.ParsingUtils.parseFlexibleDate(datetime);
                    if (!parsedDate) {
                        throw new Error(`Invalid date: ${datetime}`);
                    }
                    datetime = Utils.DateUtils.formatDateTimeLocal(parsedDate);
                    fixedCount++;
                }

                // Duplicate ID check
                if (seenIds.has(tx.id)) {
                    // Generate new ID for duplicate
                    const newId = Utils.UIUtils.generateId();
                    tx.id = newId;
                    duplicateCount++;
                }

                seenIds.add(tx.id);
                
                // Create clean transaction object
                const cleanTx = {
                    id: tx.id,
                    datetime: datetime,
                    type: tx.type,
                    category: tx.category || 'Chưa phân loại',
                    amount: amount,
                    account: tx.account,
                    description: tx.description || '',
                    originalAmount: parseFloat(tx.originalAmount) || amount,
                    originalCurrency: tx.originalCurrency || 'VND',
                    isTransfer: Boolean(tx.isTransfer),
                    transferPairId: tx.transferPairId || null,
                    createdAt: tx.createdAt || new Date().toISOString(),
                    updatedAt: tx.updatedAt || null
                };

                validTransactions.push(cleanTx);

            } catch (error) {
                console.warn(`❌ Invalid transaction at index ${i}:`, error.message, tx);
                invalidCount++;
            }

            // Show progress every 100 transactions
            if (i % 100 === 0) {
                this.showImportProgress(`Đang xử lý giao dịch ${i}/${importedTransactions.length}...`);
                await new Promise(resolve => setTimeout(resolve, 1)); // Allow UI update
            }
        }

        console.log(`✅ Transaction processing complete:`);
        console.log(`   - Valid: ${validTransactions.length}`);
        console.log(`   - Fixed: ${fixedCount}`);
        console.log(`   - Duplicates: ${duplicateCount}`);
        console.log(`   - Invalid: ${invalidCount}`);

        return validTransactions;
    }

    /**
     * Process imported categories
     */
    processImportedCategories(importedCategories, backupCategories, type) {
        if (!Array.isArray(importedCategories) || importedCategories.length === 0) {
            return backupCategories || (type === 'income' ? this.defaultData.incomeCategories : this.defaultData.expenseCategories);
        }

        const validCategories = [];
        const seenValues = new Set();

        importedCategories.forEach(cat => {
            if (cat && typeof cat === 'object' && cat.value && cat.text) {
                const lowerValue = cat.value.toLowerCase();
                if (!seenValues.has(lowerValue)) {
                    seenValues.add(lowerValue);
                    validCategories.push({
                        value: cat.value,
                        text: cat.text,
                        icon: cat.icon || null,
                        system: Boolean(cat.system),
                        createdAt: cat.createdAt || new Date().toISOString(),
                        createdBy: cat.createdBy || 'import'
                    });
                }
            }
        });

        return validCategories.length > 0 ? validCategories : backupCategories;
    }

    /**
     * Process imported accounts
     */
    processImportedAccounts(importedAccounts, backupAccounts) {
        if (!Array.isArray(importedAccounts) || importedAccounts.length === 0) {
            return backupAccounts || this.defaultData.accounts;
        }

        const validAccounts = [];
        const seenValues = new Set();

        importedAccounts.forEach(acc => {
            if (acc && typeof acc === 'object' && acc.value && acc.text) {
                const lowerValue = acc.value.toLowerCase();
                if (!seenValues.has(lowerValue)) {
                    seenValues.add(lowerValue);
                    validAccounts.push({
                        value: acc.value,
                        text: acc.text,
                        icon: acc.icon || null,
                        createdAt: acc.createdAt || new Date().toISOString(),
                        createdBy: acc.createdBy || 'import'
                    });
                }
            }
        });

        return validAccounts.length > 0 ? validAccounts : backupAccounts;
    }

    /**
     * Process imported settings
     */
    processImportedSettings(importedSettings, backupSettings) {
        const mergedSettings = { ...this.defaultData.settings, ...backupSettings };
        
        if (importedSettings && typeof importedSettings === 'object') {
            // Safely merge allowed settings
            const allowedSettings = ['theme', 'defaultCurrency', 'usdRate', 'lastBackup'];
            allowedSettings.forEach(key => {
                if (key in importedSettings) {
                    if (key === 'theme' && ['light', 'dark', 'auto'].includes(importedSettings[key])) {
                        mergedSettings[key] = importedSettings[key];
                    } else if (key === 'defaultCurrency' && ['VND', 'USD'].includes(importedSettings[key])) {
                        mergedSettings[key] = importedSettings[key];
                    } else if (key === 'usdRate') {
                        const rate = parseFloat(importedSettings[key]);
                        if (!isNaN(rate) && rate > 0 && rate >= 1000 && rate <= 50000) {
                            mergedSettings[key] = rate;
                        }
                    } else if (key === 'lastBackup' && importedSettings[key]) {
                        mergedSettings[key] = importedSettings[key];
                    }
                }
            });
        }

        // Preserve current client version
        const currentClientVersion = typeof APP_VERSION !== 'undefined' ? APP_VERSION : backupSettings.clientVersion;
        mergedSettings.clientVersion = currentClientVersion;

        return mergedSettings;
    }

    /**
     * Apply processed data to app
     */
    applyImportedData(processedData) {
        this.data.transactions = processedData.transactions;
        this.data.incomeCategories = processedData.incomeCategories;
        this.data.expenseCategories = processedData.expenseCategories;
        this.data.accounts = processedData.accounts;
        this.data.settings = processedData.settings;
        this.data.reconciliationHistory = processedData.reconciliationHistory;
        
        console.log('✅ Data import merge completed');
    }

    /**
     * Restore data from backup
     */
    restoreFromBackup(backupData) {
        this.data = {
            transactions: backupData.transactions,
            incomeCategories: backupData.incomeCategories,
            expenseCategories: backupData.expenseCategories,
            accounts: backupData.accounts,
            settings: backupData.settings,
            reconciliationHistory: backupData.reconciliationHistory
        };
        this.saveData();
        console.log('🔄 Data restored from backup');
    }

    /**
     * Post-import processing
     */
    postImportProcessing() {
        this.ensureSystemCategories();
        this.validateDataIntegrity();
        this.saveData();
        this.refreshAllModules();
    }

    /**
     * SỬA LỖI: Enhanced CSV import with robust parsing
     */
    async importFromCSV(parsedData) {
        console.log('📊 Starting CSV import...');
        
        if (!Array.isArray(parsedData) || parsedData.length === 0) {
            throw new Error("Không tìm thấy dữ liệu hợp lệ trong file CSV.");
        }

        this.showImportProgress(`Đang xử lý ${parsedData.length} dòng dữ liệu CSV...`);

        let successCount = 0;
        let failedRows = [];
        let addedCategories = { income: [], expense: [] };
        let addedAccounts = [];

        // Enhanced header mapping with more variations
        const headerMapping = {
            // Date fields
            'ngày giờ': 'datetime', 'ngày': 'datetime', 'date': 'datetime', 'time': 'datetime',
            'thời gian': 'datetime', 'datetime': 'datetime', 'timestamp': 'datetime',
            
            // Type fields
            'loại': 'type', 'type': 'type', 'kind': 'type', 'transaction_type': 'type',
            'phân loại': 'type', 'direction': 'type',
            
            // Amount fields
            'số tiền': 'amount', 'amount': 'amount', 'money': 'amount', 'value': 'amount',
            'giá trị': 'amount', 'sum': 'amount', 'total': 'amount',
            
            // Category fields
            'hạng mục': 'category', 'category': 'category', 'cat': 'category',
            'danh mục': 'category', 'nhóm': 'category',
            
            // Account fields
            'tài khoản': 'account', 'account': 'account', 'acc': 'account',
            'tk': 'account', 'bank': 'account', 'wallet': 'account',
            
            // Description fields
            'mô tả': 'description', 'description': 'description', 'note': 'description', 
            'memo': 'description', 'notes': 'description', 'ghi chú': 'description',
            'chi tiết': 'description', 'detail': 'description'
        };

        console.log(`📋 Processing ${parsedData.length} CSV rows...`);

        for (const [index, row] of parsedData.entries()) {
            try {
                const transaction = {};
                
                // Map headers to standard fields
                for (const key in row) {
                    const standardizedKey = headerMapping[key.toLowerCase().trim()];
                    if (standardizedKey) {
                        transaction[standardizedKey] = row[key];
                    }
                }

                // Validate and transform data
                const processedTx = this.processCSVTransaction(transaction, index);
                
                // Track new categories and accounts
                this.trackNewCSVData(processedTx, addedCategories, addedAccounts);
                
                // Add transaction
                this.addRegularTransaction(processedTx);
                successCount++;

            } catch (error) {
                failedRows.push({ 
                    line: index + 2, 
                    reason: error.message, 
                    data: this.sanitizeRowData(row)
                });
            }

            // Show progress every 50 rows
            if (index % 50 === 0) {
                this.showImportProgress(`Đang xử lý dòng ${index + 1}/${parsedData.length}...`);
                await new Promise(resolve => setTimeout(resolve, 1)); // Allow UI update
            }
        }

        // Save all data including new categories/accounts
        this.saveData();
        this.hideImportProgress();

        // Report results
        this.reportCSVImportResults(successCount, failedRows, addedCategories, addedAccounts);

        return { success: successCount, failed: failedRows.length };
    }

    /**
     * Process individual CSV transaction with enhanced validation
     */
    processCSVTransaction(transaction, index) {
        // 1. Validate required fields
        const requiredFields = ['amount', 'type', 'datetime', 'account'];
        const missingFields = requiredFields.filter(field => !transaction[field]);
        
        if (missingFields.length > 0) {
            throw new Error(`Thiếu các cột bắt buộc: ${missingFields.join(', ')}`);
        }

        // 2. Process amount
        const amount = Utils.ParsingUtils.parseFlexibleAmount(transaction.amount);
        if (amount <= 0) {
            throw new Error(`Số tiền không hợp lệ: "${transaction.amount}"`);
        }

        // 3. Process type
        const type = this.parseCSVType(transaction.type);

        // 4. Process datetime
        const datetime = this.parseCSVDateTime(transaction.datetime);

        // 5. Process strings
        const category = String(transaction.category || "Chưa phân loại").trim();
        const account = String(transaction.account).trim();
        const description = String(transaction.description || "").trim();

        // 6. Additional validation
        if (account.length > 100) {
            throw new Error("Tên tài khoản quá dài");
        }
        if (category.length > 100) {
            throw new Error("Tên danh mục quá dài");
        }

        return {
            type,
            amount,
            datetime,
            category,
            account,
            description: description.substring(0, 500) // Limit description length
        };
    }

    /**
     * Parse CSV transaction type with more flexibility
     */
    parseCSVType(typeStr) {
        const typeStr_lower = String(typeStr).toLowerCase().trim();
        
        // Income patterns
        const incomePatterns = ['thu', 'income', 'credit', 'in', '+', 'receive', 'nhận', 'thu nhập'];
        // Expense patterns
        const expensePatterns = ['chi', 'expense', 'debit', 'out', '-', 'spend', 'trả', 'chi tiêu'];
        
        for (const pattern of incomePatterns) {
            if (typeStr_lower.includes(pattern)) {
                return 'Thu';
            }
        }
        
        for (const pattern of expensePatterns) {
            if (typeStr_lower.includes(pattern)) {
                return 'Chi';
            }
        }
        
        throw new Error(`Loại giao dịch không hợp lệ: "${typeStr}"`);
    }

    /**
     * Parse CSV datetime with enhanced flexibility
     */
    parseCSVDateTime(datetimeStr) {
        const date = Utils.ParsingUtils.parseFlexibleDate(datetimeStr);
        if (!date) {
            throw new Error(`Định dạng ngày không hợp lệ: "${datetimeStr}"`);
        }
        return Utils.DateUtils.formatDateTimeLocal(date);
    }

    /**
     * Track new categories and accounts from CSV
     */
    trackNewCSVData(transaction, addedCategories, addedAccounts) {
        // Track new categories
        if (transaction.type === 'Thu' && !this.data.incomeCategories.some(c => c.value === transaction.category)) {
            this.data.incomeCategories.push({ 
                value: transaction.category, 
                text: transaction.category,
                createdAt: new Date().toISOString(),
                createdBy: 'csv_import'
            });
            addedCategories.income.push(transaction.category);
        } else if (transaction.type === 'Chi' && !this.data.expenseCategories.some(c => c.value === transaction.category)) {
            this.data.expenseCategories.push({ 
                value: transaction.category, 
                text: transaction.category,
                createdAt: new Date().toISOString(),
                createdBy: 'csv_import'
            });
            addedCategories.expense.push(transaction.category);
        }

        // Track new accounts
        if (!this.data.accounts.some(a => a.value === transaction.account)) {
            this.data.accounts.push({ 
                value: transaction.account, 
                text: transaction.account,
                createdAt: new Date().toISOString(),
                createdBy: 'csv_import'
            });
            addedAccounts.push(transaction.account);
        }
    }

    /**
     * Sanitize row data for error reporting
     */
    sanitizeRowData(row) {
        const sanitized = {};
        for (const key in row) {
            const value = String(row[key] || '').substring(0, 100);
            sanitized[key] = value.replace(/[<>\"'&]/g, '');
        }
        return JSON.stringify(sanitized).substring(0, 200);
    }

    /**
     * Report CSV import results with detailed breakdown
     */
    reportCSVImportResults(successCount, failedRows, addedCategories, addedAccounts) {
        console.log("====== BÁO CÁO KẾT QUẢ NHẬP CSV ======");
        console.log(`✅ Thành công: ${successCount} giao dịch`);
        console.log(`❌ Thất bại: ${failedRows.length} dòng`);
        
        const totalNewCategories = addedCategories.income.length + addedCategories.expense.length;
        if (totalNewCategories > 0) {
            console.log(`🏷️ Tạo mới: ${totalNewCategories} danh mục`);
            console.log(`   - Thu nhập: ${addedCategories.income.length}`);
            console.log(`   - Chi tiêu: ${addedCategories.expense.length}`);
        }
        if (addedAccounts.length > 0) {
            console.log(`💳 Tạo mới: ${addedAccounts.length} tài khoản`);
        }
        
        if (failedRows.length > 0) {
            console.table(failedRows.slice(0, 10)); // Show first 10 errors
            if (failedRows.length > 10) {
                console.log(`... và ${failedRows.length - 10} lỗi khác`);
            }
        }

        // Show user-friendly message
        if (failedRows.length === 0) {
            Utils.UIUtils.showMessage(
                `🎉 Nhập CSV thành công!\n📊 ${successCount} giao dịch\n🏷️ ${totalNewCategories} danh mục mới\n💳 ${addedAccounts.length} tài khoản mới`, 
                'success', 
                5000
            );
        } else {
            const errorRate = Math.round((failedRows.length / (successCount + failedRows.length)) * 100);
            const messageType = errorRate > 50 ? 'error' : 'warning';
            Utils.UIUtils.showMessage(
                `Hoàn tất nhập CSV!\n✅ ${successCount} thành công\n❌ ${failedRows.length} lỗi (${errorRate}%)\n\nXem Console (F12) để biết chi tiết lỗi.`, 
                messageType, 
                8000
            );
        }
    }

    /**
     * SỬA LỖI: Enhanced data integrity validation
     */
    validateDataIntegrity() {
        console.log('🔍 Validating data integrity...');
        let issuesFound = 0;
        
        try {
            // 1. Clean up null/undefined transactions
            const initialTxCount = this.data.transactions.length;
            this.data.transactions = this.data.transactions.filter(tx => 
                tx && 
                typeof tx === 'object' && 
                tx.id && 
                tx.type && 
                tx.datetime && 
                tx.amount !== undefined && 
                tx.account
            );
            const nullRemoved = initialTxCount - this.data.transactions.length;
            issuesFound += nullRemoved;
            
            if (nullRemoved > 0) {
                console.warn(`🗑️ Removed ${nullRemoved} null/invalid transactions`);
            }

            // 2. Fix duplicate IDs
            const seenIds = new Set();
            const uniqueTransactions = [];
            let duplicatesFixed = 0;
            
            for (const tx of this.data.transactions) {
                if (tx.id && !seenIds.has(tx.id)) {
                    seenIds.add(tx.id);
                    uniqueTransactions.push(tx);
                } else {
                    // Generate new ID for duplicate
                    const newId = Utils.UIUtils.generateId();
                    const originalId = tx.id;
                    tx.id = newId;
                    seenIds.add(newId);
                    uniqueTransactions.push(tx);
                    duplicatesFixed++;
                    console.warn(`🔧 Fixed duplicate ID: ${originalId} -> ${newId}`);
                }
            }
            this.data.transactions = uniqueTransactions;
            issuesFound += duplicatesFixed;

            // 3. Validate and fix transaction data
            let dataFixed = 0;
            this.data.transactions.forEach(tx => {
                // Fix amount
                if (typeof tx.amount !== 'number' || isNaN(tx.amount) || tx.amount <= 0) {
                    const parsed = parseFloat(tx.amount);
                    if (!isNaN(parsed) && parsed > 0) {
                        tx.amount = parsed;
                        dataFixed++;
                    } else {
                        tx.amount = 0; // Mark for removal
                        dataFixed++;
                    }
                }

                // Fix type
                if (!['Thu', 'Chi'].includes(tx.type)) {
                    tx.type = tx.amount > 0 ? 'Thu' : 'Chi';
                    dataFixed++;
                }

                // Fix datetime format
                if (!tx.datetime || isNaN(new Date(tx.datetime).getTime())) {
                    tx.datetime = new Date().toISOString();
                    dataFixed++;
                }

                // Ensure required fields exist
                if (!tx.category) {
                    tx.category = 'Chưa phân loại';
                    dataFixed++;
                }
                if (!tx.account) {
                    tx.account = 'Không xác định';
                    dataFixed++;
                }
                if (tx.description === undefined) {
                    tx.description = '';
                }
                if (!tx.createdAt) {
                    tx.createdAt = new Date().toISOString();
                }
                if (!tx.originalAmount) {
                    tx.originalAmount = tx.amount;
                }
                if (!tx.originalCurrency) {
                    tx.originalCurrency = 'VND';
                }
            });

            // Remove transactions with invalid amounts
            const beforeZeroFilter = this.data.transactions.length;
            this.data.transactions = this.data.transactions.filter(tx => tx.amount > 0);
            const zeroAmountRemoved = beforeZeroFilter - this.data.transactions.length;
            issuesFound += zeroAmountRemoved;

            if (zeroAmountRemoved > 0) {
                console.warn(`🗑️ Removed ${zeroAmountRemoved} transactions with invalid amounts`);
            }

            issuesFound += dataFixed;

            // 4. Validate and clean categories
            ['incomeCategories', 'expenseCategories'].forEach(catType => {
                const initialCount = this.data[catType].length;
                this.data[catType] = this.data[catType].filter(cat => 
                    cat && typeof cat === 'object' && cat.value && cat.text
                );
                
                // Remove duplicates (case-insensitive)
                const seenValues = new Set();
                this.data[catType] = this.data[catType].filter(cat => {
                    const lowerValue = cat.value.toLowerCase();
                    if (seenValues.has(lowerValue)) {
                        return false;
                    }
                    seenValues.add(lowerValue);
                    return true;
                });
                
                const removed = initialCount - this.data[catType].length;
                if (removed > 0) {
                    console.warn(`🗑️ Cleaned ${removed} invalid/duplicate ${catType}`);
                    issuesFound += removed;
                }
            });

            // 5. Validate and clean accounts
            const initialAccCount = this.data.accounts.length;
            this.data.accounts = this.data.accounts.filter(acc => 
                acc && typeof acc === 'object' && acc.value && acc.text
            );
            
            // Remove duplicate accounts (case-insensitive)
            const seenAccValues = new Set();
            this.data.accounts = this.data.accounts.filter(acc => {
                const lowerValue = acc.value.toLowerCase();
                if (seenAccValues.has(lowerValue)) {
                    return false;
                }
                seenAccValues.add(lowerValue);
                return true;
            });
            
            const accRemoved = initialAccCount - this.data.accounts.length;
            if (accRemoved > 0) {
                console.warn(`🗑️ Cleaned ${accRemoved} invalid/duplicate accounts`);
                issuesFound += accRemoved;
            }

            // 6. Validate settings
            if (!this.data.settings || typeof this.data.settings !== 'object') {
                this.data.settings = { ...this.defaultData.settings };
                issuesFound++;
                console.warn('🔧 Reset invalid settings to defaults');
            }

            // Final report
            if (issuesFound > 0) {
                console.warn(`⚠️ Data integrity check found and fixed ${issuesFound} issues.`);
                Utils.UIUtils.showMessage(`Đã tự động sửa ${issuesFound} lỗi dữ liệu.`, 'info');
            } else {
                console.log('✅ Data integrity check passed - no issues found');
            }

        } catch (error) {
            console.error('❌ Error during data integrity validation:', error);
            Utils.UIUtils.showMessage('Có lỗi khi kiểm tra tính toàn vẹn dữ liệu.', 'error');
        }
    }

    /**
     * SỬA LỖI: Enhanced clear all data with comprehensive cleanup
     */
    async clearAllData() {
        console.log('🗑️ Starting comprehensive clear all data operation...');
        
        try {
            // Get current state for confirmation
            const currentState = {
                transactions: this.data.transactions.length,
                incomeCategories: this.data.incomeCategories.length,
                expenseCategories: this.data.expenseCategories.length,
                accounts: this.data.accounts.length,
                reconciliations: this.data.reconciliationHistory.length
            };

            console.log('📊 Current data state:', currentState);

            // Create backup before clearing
            const finalBackup = {
                ...this.createDataBackup(),
                clearedAt: new Date().toISOString()
            };

            // Store backup in localStorage for recovery
            try {
                localStorage.setItem('last_clear_backup', JSON.stringify(finalBackup));
                console.log('💾 Created recovery backup');
            } catch (e) {
                console.warn('⚠️ Could not create recovery backup:', e);
            }

            // Preserve important settings
            const currentClientVersion = this.data.settings.clientVersion || 
                (typeof APP_VERSION !== 'undefined' ? APP_VERSION : '0.0.0');
            const currentTheme = this.data.settings.theme || 'auto';
            const currentCurrency = this.data.settings.defaultCurrency || 'VND';
            const currentUsdRate = this.data.settings.usdRate || 25000;
            
            // Reset all data to defaults
            this.data.transactions = [];
            this.data.incomeCategories = JSON.parse(JSON.stringify(this.defaultData.incomeCategories));
            this.data.expenseCategories = JSON.parse(JSON.stringify(this.defaultData.expenseCategories));
            this.data.accounts = JSON.parse(JSON.stringify(this.defaultData.accounts));
            this.data.reconciliationHistory = [];
            
            // Reset settings but preserve important values
            this.data.settings = { 
                ...this.defaultData.settings, 
                clientVersion: currentClientVersion,
                theme: currentTheme,
                defaultCurrency: currentCurrency,
                usdRate: currentUsdRate,
                lastClear: new Date().toISOString()
            };
            
            // Ensure system categories
            this.ensureSystemCategories();
            
            // Clear app-specific localStorage
            await this.clearAppLocalStorage();
            
            // Update global USD rate
            Utils.CONFIG.USD_TO_VND_RATE = this.data.settings.usdRate;

            // Save the cleared data
            if (!this.saveData()) {
                throw new Error("Không thể lưu dữ liệu sau khi xóa.");
            }

            // Clear any cached data in modules
            this.clearModuleCache();

            // Refresh all modules
            this.refreshAllModules();
            
            console.log(`✅ Data cleared successfully. Removed: ${currentState.transactions} transactions, ${currentState.accounts} accounts, ${currentState.incomeCategories + currentState.expenseCategories} categories`);
            
            // Show success message with recovery option
            Utils.UIUtils.showMessage(
                `✅ Đã xóa toàn bộ dữ liệu thành công!\n\n📊 Đã xóa:\n- ${currentState.transactions} giao dịch\n- ${currentState.accounts} tài khoản\n- ${currentState.incomeCategories + currentState.expenseCategories} danh mục\n\n💡 Dữ liệu đã được sao lưu để khôi phục nếu cần.`,
                'success',
                8000
            );
            
            return true;
            
        } catch (error) { 
            console.error('❌ Error clearing all data:', error); 
            Utils.UIUtils.showMessage(`❌ Lỗi xóa dữ liệu: ${error.message}`, 'error');
            return false; 
        }
    }

    /**
     * Clear app-specific localStorage with enhanced cleanup
     */
    async clearAppLocalStorage() {
        try {
            const keysToKeep = [
                'theme', 
                'last_clear_backup',
                'version_check_count'
            ];
            
            // Clear app storage keys
            if (Utils.CONFIG && Utils.CONFIG.STORAGE_KEYS) {
                Object.values(Utils.CONFIG.STORAGE_KEYS).forEach(key => {
                    if (!keysToKeep.includes(key)) {
                        try { 
                            localStorage.removeItem(key); 
                        } catch (e) { 
                            console.warn(`Failed to remove localStorage key: ${key}`, e);
                        }
                    }
                });
            }
            
            // Clear other app-specific keys
            const otherKeysToRemove = [
                'summary_hidden', 
                'lastTransactionType',
                'backup_history',
                'filter_preferences',
                'chart_preferences',
                'export_history'
            ];
            
            otherKeysToRemove.forEach(key => {
                try { 
                    localStorage.removeItem(key); 
                } catch (e) { 
                    console.warn(`Failed to remove localStorage key: ${key}`, e);
                }
            });

            // Clear any keys starting with 'balance_hidden_'
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && key.startsWith('balance_hidden_')) {
                    try {
                        localStorage.removeItem(key);
                    } catch (e) {
                        console.warn(`Failed to remove balance visibility key: ${key}`, e);
                    }
                }
            }
            
            console.log('🧹 App localStorage cleaned comprehensively');
            
        } catch (error) {
            console.error('❌ Error clearing localStorage:', error);
        }
    }

    /**
     * Clear module-specific cache data
     */
    clearModuleCache() {
        try {
            // Clear any module-specific cached data
            Object.values(this.modules).forEach(module => {
                if (module && typeof module.clearCache === 'function') {
                    module.clearCache();
                }
            });
            
            // Clear any global caches
            if (window.chartCache) {
                window.chartCache = {};
            }
            
            console.log('🧹 Module cache cleared');
        } catch (error) {
            console.error('❌ Error clearing module cache:', error);
        }
    }

    /**
     * Recovery function to restore from last clear backup
     */
    recoverFromLastClear() {
        try {
            const backup = localStorage.getItem('last_clear_backup');
            if (!backup) {
                Utils.UIUtils.showMessage('Không tìm thấy dữ liệu sao lưu để khôi phục.', 'error');
                return false;
            }

            const confirmRecover = confirm(
                'Bạn có chắc muốn khôi phục dữ liệu từ lần xóa gần nhất?\n\n' +
                'Thao tác này sẽ ghi đè toàn bộ dữ liệu hiện tại.'
            );

            if (!confirmRecover) return false;

            const backupData = JSON.parse(backup);
            
            // Validate backup data
            if (!backupData.transactions || !backupData.accounts) {
                throw new Error('Dữ liệu sao lưu không hợp lệ');
            }

            // Restore data
            this.data = {
                transactions: backupData.transactions,
                incomeCategories: backupData.incomeCategories,
                expenseCategories: backupData.expenseCategories,
                accounts: backupData.accounts,
                settings: backupData.settings,
                reconciliationHistory: backupData.reconciliationHistory || []
            };

            // Save restored data
            this.saveData();
            this.refreshAllModules();

            // Remove the backup after successful recovery
            localStorage.removeItem('last_clear_backup');

            Utils.UIUtils.showMessage(
                `✅ Đã khôi phục thành công!\n📊 ${backupData.transactions.length} giao dịch\n💳 ${backupData.accounts.length} tài khoản`,
                'success',
                5000
            );

            console.log('✅ Data recovered from last clear backup');
            return true;

        } catch (error) {
            console.error('❌ Error recovering data:', error);
            Utils.UIUtils.showMessage(`❌ Lỗi khôi phục dữ liệu: ${error.message}`, 'error');
            return false;
        }
    }

    // ===================================================================
    // REMAINING METHODS (unchanged)
    // ===================================================================

    async initializeModules() {
        console.log('🔧 Initializing sub-modules...');
		this.modules.VirtualKeyboardModule = new VirtualKeyboardModule();
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
		// Listener cho sự kiện cài đặt PWA
		window.addEventListener('beforeinstallprompt', (e) => {
			e.preventDefault();
			this.installPromptEvent = e;
			console.log('👍 `beforeinstallprompt` event fired. App is installable.');
			// Cập nhật trạng thái của nút thay vì tạo mới
			this.updateInstallButtonState(true);
		});

		// Listener cho nút cài đặt đã có sẵn trong HTML
		const installBtn = document.getElementById('install-pwa-btn');
		if (installBtn) {
			installBtn.addEventListener('click', () => {
				this.promptInstall();
			});
		}
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

    showInstallButton() {
        const settingsSection = document.querySelector('#tab-settings .data-actions');
        if (settingsSection && !document.getElementById('install-pwa-btn')) {
            const installButton = document.createElement('button');
            installButton.id = 'install-pwa-btn';
            installButton.className = 'action-btn import';
            installButton.innerHTML = `
                <span class="btn-icon">🚀</span>
                <div class="btn-content">
                    <span class="btn-title">Cài đặt ứng dụng</span>
                    <span class="btn-subtitle">Trải nghiệm tốt nhất trên màn hình chính</span>
                </div>
            `;
            
            installButton.addEventListener('click', async () => {
                await this.promptInstall();
            });
            
            settingsSection.prepend(installButton);
        }
    }
	updateInstallButtonState(isAvailable) {
		const installBtn = document.getElementById('install-pwa-btn');
		if (!installBtn) return;

		const subtitle = installBtn.querySelector('.btn-subtitle');
		const icon = installBtn.querySelector('.btn-icon');

		if (isAvailable) {
			installBtn.style.display = 'flex'; // Hiển thị nút
			installBtn.disabled = false;
			if (subtitle) subtitle.textContent = 'Sẵn sàng để cài đặt lên thiết bị của bạn!';
			if (icon) icon.style.animation = 'bounce 2s infinite'; // Thêm hiệu ứng để thu hút
			installBtn.style.opacity = '1';
			installBtn.style.cursor = 'pointer';
		} else {
			// Hiển thị nút ở trạng thái không thể nhấn, thay vì ẩn đi
			installBtn.style.display = 'flex';
			installBtn.disabled = true;
			if (subtitle) subtitle.textContent = 'Đã cài đặt hoặc không được hỗ trợ';
			if (icon) icon.style.animation = 'none';
			installBtn.style.opacity = '0.6';
			installBtn.style.cursor = 'not-allowed';
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
            console.log('💾 Data saved successfully.');
            return true;
        } catch (error) {
            console.error('❌ Error saving data:', error);
            Utils.UIUtils.showMessage('Lỗi nghiêm trọng khi lưu dữ liệu.', 'error');
            return false;
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

    addTransferTransaction(data) {
        const datetime = data.datetime || Utils.DateUtils.formatDateTimeLocal();
        const timestamp = new Date(datetime).getTime();
        const randomPart = Math.random().toString(36).substr(2, 9);
        
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

    addRegularTransaction(transaction) {
        const amount = parseFloat(transaction.amount) || 0;
        if (isNaN(amount) || amount <= 0) {
            throw new Error('Số tiền giao dịch không hợp lệ.');
        }
        const newTransaction = {
            id: Utils.UIUtils.generateId(), 
            datetime: transaction.datetime || Utils.DateUtils.formatDateTimeLocal(), 
            type: transaction.type, 
            category: transaction.category,
            amount, 
            account: transaction.account, 
            description: transaction.description || '',
            originalAmount: transaction.originalAmount || amount, 
            originalCurrency: transaction.originalCurrency || 'VND',
            isTransfer: false, 
            transferPairId: null, 
            createdAt: new Date().toISOString()
        };
        this.data.transactions.unshift(newTransaction);
        this.saveData(); 
        this.updateHeaderSummary();
        return newTransaction;
    }
    
    addTransaction(transactionData) {
        try {
            return transactionData.type === 'Transfer' 
                ? this.addTransferTransaction(transactionData) 
                : this.addRegularTransaction(transactionData);
        } catch (error) {
            console.error("Error in App.addTransaction:", error);
            Utils.UIUtils.showMessage(`Lỗi thêm giao dịch: ${error.message}`, 'error');
            return null;
        }
    }

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
                const pairIndex = this.data.transactions.findIndex(tx => tx && tx.id === existingTransaction.transferPairId);
                if (pairIndex === -1) {
                    throw new Error('Không tìm thấy giao dịch đối ứng trong cặp chuyển khoản.');
                }
                const pairTransaction = this.data.transactions[pairIndex];

                const newAmount = parseFloat(transactionData.amount) || 0;
                const fromAccount = transactionData.account;
                const toAccount = transactionData.toAccount;
                const newDatetime = transactionData.datetime;
                const newDescription = transactionData.description || '';

                const fromAccountName = this.getAccountName(fromAccount);
                const toAccountName = this.getAccountName(toAccount);

                const expenseTx = existingTransaction.type === 'Chi' ? existingTransaction : pairTransaction;
                const incomeTx = existingTransaction.type === 'Thu' ? existingTransaction : pairTransaction;

                Object.assign(expenseTx, {
                    amount: newAmount,
                    account: fromAccount,
                    datetime: newDatetime,
                    description: newDescription || `Chuyển tiền đến ${toAccountName}`,
                    originalAmount: transactionData.originalAmount || newAmount,
                    originalCurrency: transactionData.originalCurrency,
                    updatedAt: nowISO
                });

                Object.assign(incomeTx, {
                    amount: newAmount,
                    account: toAccount,
                    datetime: newDatetime,
                    description: newDescription || `Nhận tiền từ ${fromAccountName}`,
                    originalAmount: transactionData.originalAmount || newAmount,
                    originalCurrency: transactionData.originalCurrency,
                    updatedAt: nowISO
                });

            } else {
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
            this.refreshAllModules();
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
			} else if (filters.period === 'custom' && filters.startDate && filters.endDate) { // Thay đổi điều kiện để khớp với logic mới
				filtered = filtered.filter(tx => { 
					if (!tx || !tx.datetime) return false; 
					const d = new Date(tx.datetime); 
					return !isNaN(d.getTime()) && d >= filters.startDate && d <= filters.endDate; 
				});
            } else if (filters.period === 'custom_range' && filters.startDate && filters.endDate) {
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
            return [];
        }
        return filtered;
    }

	async promptInstall() {
		if (this.installPromptEvent) {
			this.installPromptEvent.prompt();

			const { outcome } = await this.installPromptEvent.userChoice;
			console.log(`PWA install prompt outcome: ${outcome}`);

			if (outcome === 'accepted') {
				console.log('User accepted the PWA installation.');
				this.updateInstallButtonState(false); // Cập nhật trạng thái nút sau khi cài
			} else {
				console.log('User dismissed the PWA installation.');
			}

			this.installPromptEvent = null;
		} else {
			// Thông báo cho người dùng khi không thể cài đặt
			Utils.UIUtils.showMessage('Ứng dụng đã được cài đặt hoặc trình duyệt không hỗ trợ.', 'info');
			console.log('Install prompt not available.');
		}
	}

    handlePWAShortcuts() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const action = urlParams.get('action');
            const source = urlParams.get('source');

            if (source === 'shortcut') {
                console.log('🚀 PWA Shortcut detected:', action);
                
                window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);

                if (action === 'statistics') {
                    this.switchTab('statistics');
                    return;
                }
                
                this.switchTab('transactions'); 
                
                setTimeout(() => {
                    const typeMap = { 'income': 'Thu', 'expense': 'Chi', 'transfer': 'Transfer' };
                    if (typeMap[action]) {
                        this.setTransactionTypeFromShortcut(typeMap[action]);
                        const messageType = typeMap[action] === 'Thu' ? 'Thu nhập' : (typeMap[action] === 'Chi' ? 'Chi tiêu' : 'Chuyển tiền');
                        Utils.UIUtils.showMessage(`💰 Sẵn sàng nhập ${messageType}!`, 'success', 2000);
                    } else {
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
                typeRadio.dispatchEvent(new Event('change', { bubbles: true })); 
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

    initializeFallbackMode(error) {
        console.error('Entering Fallback Mode due to error:', error);
        document.body.innerHTML = `
            <div style="padding: 20px; text-align: center; font-family: sans-serif;">
                <h1 style="color: #D32F2F;">⚠️ Lỗi Khởi Tạo Ứng Dụng</h1>
                <p style="margin: 15px 0;">Rất tiếc, ứng dụng đã gặp sự cố không mong muốn.</p>
                <p style="margin-bottom: 20px;">Bạn có thể thử các cách sau:</p>
                <button onclick="location.reload(true);" 
                        style="padding: 10px 15px; background-color: #1976D2; color: white; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">
                    Tải Lại Trang
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
    
    static attemptHardResetAndReload() {
        try {
            console.warn("Attempting hard reset...");
            if (typeof Utils !== 'undefined' && Utils.CONFIG && Utils.CONFIG.STORAGE_KEYS) {
                Object.values(Utils.CONFIG.STORAGE_KEYS).forEach(key => {
                    try { localStorage.removeItem(key); } catch (e) { console.warn(`Failed to remove ${key}`)}
                });
            } else {
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
                     window.location.reload(true);
                });
            } else {
                 window.location.reload(true);
            }
        } catch(e) {
            console.error("Critical error during hard reset:", e);
            alert("Không thể tự động xóa dữ liệu. Vui lòng thử xóa cache và dữ liệu trang web thủ công trong cài đặt trình duyệt.");
            window.location.reload(true);
        }
    }

    cleanup() {
        console.log("🧹 Cleaning up app event listeners...");
        this.eventListeners.forEach(({ element, event, handler }) => {
            if (element && typeof element.removeEventListener === 'function') {
                element.removeEventListener(event, handler);
            }
        });
        this.eventListeners = [];

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

/* Import progress modal styles */
#import-progress-modal {
    z-index: 10000;
}

#import-progress-modal .spinner {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}
</style>
`;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('mobile-enhancement-css')) {
        const styleElement = document.createElement('div');
        styleElement.id = 'mobile-enhancement-css';
        styleElement.innerHTML = mobileEnhancementCSS;
        document.head.appendChild(styleElement);
    }

    window.MobileChartEnhancements = new MobileChartEnhancements();
    
    setTimeout(() => {
        window.MobileChartEnhancements.init();
    }, 500);
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileChartEnhancements;
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        if (!window.FinancialAppInstance) {
            window.FinancialAppInstance = new FinancialApp();
            await window.FinancialAppInstance.init();
        }
    } catch (error) {
        console.error('CRITICAL: Failed to initialize app from DOMContentLoaded listener:', error);
        document.body.innerHTML = `<div style="position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:white;color:red;font-family:sans-serif;padding:20px;text-align:center;"><h1>Ứng dụng gặp lỗi nghiêm trọng</h1><p>Không thể khởi động. Vui lòng thử tải lại hoặc xóa dữ liệu trang.</p><button onclick="location.reload(true)" style="padding:8px 12px;margin:10px;cursor:pointer;">Tải lại</button></div>`;
    }
});

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.deferredPrompt = e;
    console.log('👍 `beforeinstallprompt` event fired. App is installable.');
});

console.log("✅ App.js with FIXED import/export and clear data functionality loaded.");