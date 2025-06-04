/**
 * SETTINGS MODULE - PRODUCTION READY VERSION
 * Handles app settings, theme, backup, and data management
 * Features: Enhanced security, better validation, improved performance, robust error handling
 */
class SettingsModule {
    constructor() {
        this.app = null;
        this.elements = {};
        this.eventListeners = [];
        this.isInitialized = false;
        this.isDestroyed = false;

        // Enhanced file processing state
        this.fileProcessing = {
            isProcessing: false,
            currentOperation: null,
            progress: 0,
            startTime: null
        };

        // Enhanced validation rules with security considerations
        this.validationRules = {
            usdRate: {
                min: 1000,
                max: 50000,
                allowedDecimals: 2
            },
            fileUpload: {
                maxFileSize: 10 * 1024 * 1024, // 10MB
                allowedTypes: ['application/json', 'text/json', 'text/plain'],
                allowedExtensions: ['.json'],
                maxTransactions: 100000,
                maxDataSize: 50 * 1024 * 1024 // 50MB uncompressed
            },
            backup: {
                maxBackupsToKeep: 10,
                autoBackupInterval: 7 * 24 * 60 * 60 * 1000 // 7 days
            }
        };

        // State management
        this.state = {
            lastBackupCheck: null,
            backupHistory: [],
            updateCheckInProgress: false,
            lastUpdateCheck: null,
            pendingOperations: new Set()
        };

        // Performance tracking
        this.performance = {
            lastOperationTime: 0,
            operationCount: 0,
            slowOperations: []
        };

        // Debounce timers
        this.debounceTimers = new Map();
    }

    /**
     * Enhanced initialization with comprehensive error handling
     */
    async init(app) {
        if (this.isDestroyed) {
            throw new Error('Cannot initialize destroyed SettingsModule instance');
        }

        if (this.isInitialized) {
            console.warn('SettingsModule already initialized.');
            return;
        }

        if (!app) {
            throw new Error('App instance is required for SettingsModule initialization');
        }

        this.app = app;
        console.log('⚙️ Initializing Settings Module...');

        try {
            // Wait for dependencies
            await this.waitForDependencies();
            
            // Update validation rules from config
            this.updateValidationRulesFromConfig();
            
            // Initialize components
            await this.initializeElements();
            this.initializeEventListeners();
            this.setupPerformanceMonitoring();
            this.setupAutoBackup();
            
            // Initial refresh
            await this.refresh();
            
            this.isInitialized = true;
            console.log('✅ Settings Module initialized successfully');
            
            this.emitEvent('module:initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize Settings Module:', error);
            this.handleInitializationError(error);
            throw error;
        }
    }

    /**
     * Wait for required dependencies
     */
    async waitForDependencies() {
        const maxWaitTime = 10000;
        const checkInterval = 100;
        let waitedTime = 0;

        return new Promise((resolve, reject) => {
            const checkDependencies = () => {
                if (typeof Utils !== 'undefined' && 
                    Utils.UIUtils && 
                    Utils.StorageUtils && 
                    Utils.ThemeUtils &&
                    Utils.ExportUtils &&
                    Utils.CONFIG) {
                    resolve();
                } else if (waitedTime >= maxWaitTime) {
                    reject(new Error('Required dependencies not available after timeout'));
                } else {
                    waitedTime += checkInterval;
                    setTimeout(checkDependencies, checkInterval);
                }
            };
            checkDependencies();
        });
    }

    /**
     * Update validation rules from Utils.CONFIG
     */
    updateValidationRulesFromConfig() {
        if (Utils?.CONFIG) {
            this.validationRules.usdRate.min = Utils.CONFIG.USD_RATE_MIN || 1000;
            this.validationRules.usdRate.max = Utils.CONFIG.USD_RATE_MAX || 50000;
        }
    }

    /**
     * Enhanced element initialization
     */
    async initializeElements() {
        const elementSelectors = {
            // Theme elements
            themeRadios: 'input[name="theme"]',

            // Data management elements
            exportJsonBtn: '#export-json',
            exportCsvBtn: '#export-csv',
            importDataBtn: '#import-data',
            importFileInput: '#import-file',
            clearDataBtn: '#clear-data',

            // Currency elements
            usdRateInput: '#usd-rate',
            defaultCurrencySelect: '#default-currency',

            // App info elements
            totalTransactionsEl: '#total-transactions',
            dataSizeEl: '#data-size',
            lastBackupEl: '#last-backup',
            appInfoVersionEl: '#app-info-version',

            // Loading indicator
            loadingIndicator: '#settings-loading',

            // Update elements
            checkUpdatesBtn: '#check-updates',
            forceRefreshBtn: '#force-refresh-app',
            clearCacheBtn: '#clear-app-cache',
            currentVersionEl: '#current-app-version',
            updateStatusEl: '#update-status',
            lastUpdateCheckEl: '#last-update-check'
        };

        this.elements = {};
        const missingElements = [];

        for (const [key, selector] of Object.entries(elementSelectors)) {
            try {
                if (key === 'themeRadios') {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        this.elements[key] = elements;
                    } else {
                        missingElements.push(selector);
                    }
                } else {
                    const element = document.querySelector(selector);
                    if (element) {
                        this.elements[key] = element;
                    } else {
                        missingElements.push(selector);
                    }
                }
            } catch (error) {
                console.warn(`Error finding element ${selector}:`, error);
                missingElements.push(selector);
            }
        }

        // Log missing elements but don't fail initialization
        if (missingElements.length > 0) {
            console.warn(`Settings Module: Missing elements: ${missingElements.join(', ')}`);
        }

        return { 
            found: Object.keys(this.elements).length, 
            missing: missingElements.length 
        };
    }

    /**
     * Enhanced event listener management
     */
    addEventListenerSafe(element, event, handler, options = {}) {
        if (!element || typeof element.addEventListener !== 'function') {
            console.warn('Invalid element for event listener:', { element, event });
            return false;
        }

        const wrappedHandler = this.wrapEventHandler(handler, event);
        element.addEventListener(event, wrappedHandler, options);
        
        this.eventListeners.push({ 
            element, 
            event, 
            handler: wrappedHandler, 
            originalHandler: handler,
            options 
        });
        
        return true;
    }

    /**
     * Wrap event handlers with error handling and performance monitoring
     */
    wrapEventHandler(handler, eventType) {
        return async (event) => {
            if (this.isDestroyed) return;
            
            const startTime = performance.now();
            
            try {
                const result = await handler.call(this, event);
                const endTime = performance.now();
                const duration = endTime - startTime;
                
                this.performance.operationCount++;
                this.performance.lastOperationTime = duration;
                
                if (duration > 500) {
                    console.warn(`Slow ${eventType} handler: ${duration.toFixed(2)}ms`);
                    this.performance.slowOperations.push({
                        type: eventType,
                        duration,
                        timestamp: Date.now()
                    });
                }
                
                return result;
            } catch (error) {
                console.error(`Event handler error (${eventType}):`, error);
                this.handleEventError(error, event);
            }
        };
    }

    /**
     * Enhanced event listener initialization
     */
    initializeEventListeners() {
        const eventConfigs = [
            // Theme change events
            ...(this.elements.themeRadios ? Array.from(this.elements.themeRadios).map(radio => ({
                element: radio,
                event: 'change',
                handler: () => {
                    if (radio.checked) {
                        this.changeTheme(radio.value);
                    }
                }
            })) : []),

            // Data management events
            {
                element: this.elements.exportJsonBtn,
                event: 'click',
                handler: () => this.exportData()
            },
            {
                element: this.elements.exportCsvBtn,
                event: 'click',
                handler: () => this.exportCSV()
            },
            {
                element: this.elements.importDataBtn,
                event: 'click',
                handler: () => this.triggerFileImport()
            },
            {
                element: this.elements.importFileInput,
                event: 'change',
                handler: (e) => this.handleImportFile(e)
            },
            {
                element: this.elements.clearDataBtn,
                event: 'click',
                handler: () => this.clearAllData()
            },

            // Currency events
            {
                element: this.elements.usdRateInput,
                event: 'input',
                handler: () => this.debouncedUSDRateValidation()
            },
            {
                element: this.elements.usdRateInput,
                event: 'change',
                handler: () => this.updateUSDRate()
            },
            {
                element: this.elements.usdRateInput,
                event: 'keydown',
                handler: (e) => this.handleUSDRateKeydown(e)
            },
            {
                element: this.elements.defaultCurrencySelect,
                event: 'change',
                handler: () => this.updateDefaultCurrency()
            },

            // Update events
            {
                element: this.elements.checkUpdatesBtn,
                event: 'click',
                handler: () => this.checkForUpdates()
            },
            {
                element: this.elements.forceRefreshBtn,
                event: 'click',
                handler: () => this.forceRefreshApp()
            },
            {
                element: this.elements.clearCacheBtn,
                event: 'click',
                handler: () => this.clearAppCache()
            }
        ];

        let listenersAdded = 0;
        eventConfigs.forEach(config => {
            if (config.element && this.addEventListenerSafe(config.element, config.event, config.handler)) {
                listenersAdded++;
            }
        });

        console.log(`Added ${listenersAdded} event listeners for Settings Module`);

        // Setup USD rate input attributes
        if (this.elements.usdRateInput) {
            this.elements.usdRateInput.setAttribute('inputmode', 'numeric');
            this.elements.usdRateInput.setAttribute('pattern', '[0-9]*');
        }
    }

    /**
     * Debounced USD rate validation
     */
    debouncedUSDRateValidation() {
        const key = 'usd_rate_validation';
        
        if (this.debounceTimers.has(key)) {
            clearTimeout(this.debounceTimers.get(key));
        }

        const timer = setTimeout(() => {
            this.validateUSDRateInput();
            this.debounceTimers.delete(key);
        }, 300);

        this.debounceTimers.set(key, timer);
    }

    /**
     * Enhanced USD rate keydown handler
     */
    handleUSDRateKeydown(e) {
        // Allow: backspace, delete, tab, escape, enter
        if ([8, 9, 27, 13, 46].includes(e.keyCode) ||
            // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
            (e.ctrlKey && [65, 67, 86, 88].includes(e.keyCode)) ||
            // Allow: home, end, left, right, down, up
            (e.keyCode >= 35 && e.keyCode <= 40)) {
            return;
        }
        
        // Ensure that it is a number and stop the keypress
        if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
            e.preventDefault();
        }
    }

    /**
     * Enhanced USD rate validation
     */
    validateUSDRateInput() {
        if (!this.elements.usdRateInput) return;
        
        try {
            const value = this.elements.usdRateInput.value.trim();
            const rate = parseFloat(value);
            
            this.elements.usdRateInput.classList.remove('input-valid', 'input-invalid');
            
            if (value === '') {
                this.clearUSDRateError();
                return;
            }

            // Enhanced validation
            if (isNaN(rate) || rate <= 0) {
                this.elements.usdRateInput.classList.add('input-invalid');
                this.showUSDRateError('Tỷ giá phải là số dương');
                return;
            }

            if (rate < this.validationRules.usdRate.min) {
                this.elements.usdRateInput.classList.add('input-invalid');
                this.showUSDRateError(`Tỷ giá tối thiểu: ${this.validationRules.usdRate.min.toLocaleString()} VNĐ`);
                return;
            }

            if (rate > this.validationRules.usdRate.max) {
                this.elements.usdRateInput.classList.add('input-invalid');
                this.showUSDRateError(`Tỷ giá tối đa: ${this.validationRules.usdRate.max.toLocaleString()} VNĐ`);
                return;
            }

            // Check decimal places
            const decimalPlaces = (value.split('.')[1] || '').length;
            if (decimalPlaces > this.validationRules.usdRate.allowedDecimals) {
                this.elements.usdRateInput.classList.add('input-invalid');
                this.showUSDRateError(`Tối đa ${this.validationRules.usdRate.allowedDecimals} chữ số thập phân`);
                return;
            }

            this.elements.usdRateInput.classList.add('input-valid');
            this.clearUSDRateError();
            
        } catch (error) {
            console.error('Error validating USD rate input:', error);
            this.showUSDRateError('Lỗi xác thực');
        }
    }

    /**
     * Enhanced error display for USD rate
     */
    showUSDRateError(message) {
        let errorEl = document.getElementById('usd-rate-error');
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.id = 'usd-rate-error';
            errorEl.className = 'input-error-message';
            errorEl.setAttribute('role', 'alert');
            errorEl.setAttribute('aria-live', 'polite');
            
            if (this.elements.usdRateInput?.parentNode) {
                this.elements.usdRateInput.parentNode.appendChild(errorEl);
            }
        }
        
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }

    /**
     * Clear USD rate error
     */
    clearUSDRateError() {
        const errorEl = document.getElementById('usd-rate-error');
        if (errorEl) {
            errorEl.style.display = 'none';
            errorEl.textContent = '';
        }
    }

    /**
     * Enhanced theme change with validation
     */
    async changeTheme(theme) {
        if (!theme || !['light', 'dark', 'auto'].includes(theme)) {
            console.error('Invalid theme value:', theme);
            Utils.UIUtils.showMessage('Chế độ giao diện không hợp lệ', 'error');
            return;
        }

        try {
            Utils.ThemeUtils.applyTheme(theme);
            
            if (this.app?.data?.settings) {
                this.app.data.settings.theme = theme;
                await this.app.saveData();
            }

            const themeName = this.getThemeDisplayName(theme);
            Utils.UIUtils.showMessage(`Đã chuyển sang chế độ ${themeName}`, 'success', 2000);
            
            // Update chart colors after a delay
            setTimeout(() => {
                if (window.StatisticsModule?.updateChartColors) {
                    window.StatisticsModule.updateChartColors();
                }
            }, 100);

            this.emitEvent('theme:changed', { theme, themeName });
            
        } catch (error) {
            console.error('Error changing theme:', error);
            Utils.UIUtils.showMessage('Có lỗi khi thay đổi giao diện', 'error');
        }
    }

    /**
     * Get theme display name
     */
    getThemeDisplayName(theme) {
        const names = { 
            'light': 'sáng', 
            'dark': 'tối', 
            'auto': 'tự động' 
        };
        return names[theme] || theme;
    }

    /**
     * Enhanced data export with progress tracking
     */
    async exportData() {
        if (this.fileProcessing.isProcessing) {
            Utils.UIUtils.showMessage('Đang xử lý tác vụ khác, vui lòng đợi', 'warning');
            return;
        }

        try {
            this.startOperation('export_json');
            
            if (!this.app) {
                throw new Error('App instance not available');
            }

            const exportData = this.app.exportData();
            if (!exportData) {
                throw new Error('No data to export');
            }

            if (!exportData.transactions || !Array.isArray(exportData.transactions)) {
                throw new Error('Invalid transaction data');
            }

            // Add export metadata
            exportData._exportMetadata = {
                exportedAt: new Date().toISOString(),
                version: typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'unknown',
                transactionCount: exportData.transactions.length,
                checksum: this.calculateDataChecksum(exportData)
            };

            const success = Utils.ExportUtils.exportJSON(exportData, 'financial_data');
            
            if (success) {
                await this.updateLastBackupTime();
                this.addToBackupHistory('json_export');
                Utils.UIUtils.showMessage('Đã xuất dữ liệu thành công', 'success');
                this.emitEvent('data:exported', { type: 'json', size: JSON.stringify(exportData).length });
            } else {
                throw new Error('Export function failed');
            }
            
        } catch (error) {
            console.error('Export error:', error);
            Utils.UIUtils.showMessage(`Có lỗi khi xuất dữ liệu: ${error.message}`, 'error');
            this.emitEvent('data:export_failed', { type: 'json', error: error.message });
        } finally {
            this.endOperation();
        }
    }

    /**
     * Enhanced CSV export
     */
    async exportCSV() {
        if (this.fileProcessing.isProcessing) {
            Utils.UIUtils.showMessage('Đang xử lý tác vụ khác, vui lòng đợi', 'warning');
            return;
        }

        try {
            this.startOperation('export_csv');
            
            if (!this.app?.data?.transactions) {
                throw new Error('Invalid app data or no transactions');
            }

            if (this.app.data.transactions.length === 0) {
                Utils.UIUtils.showMessage('Không có giao dịch nào để xuất', 'warning');
                return;
            }

            const accounts = this.app.data.accounts || [];
            const success = Utils.ExportUtils.exportCSV(this.app.data.transactions, accounts);
            
            if (success) {
                Utils.UIUtils.showMessage('Đã xuất file CSV thành công', 'success');
                this.emitEvent('data:exported', { type: 'csv', count: this.app.data.transactions.length });
            } else {
                throw new Error('CSV export function failed');
            }
            
        } catch (error) {
            console.error('CSV export error:', error);
            Utils.UIUtils.showMessage(`Có lỗi khi xuất file CSV: ${error.message}`, 'error');
            this.emitEvent('data:export_failed', { type: 'csv', error: error.message });
        } finally {
            this.endOperation();
        }
    }

    /**
     * Trigger file import with validation
     */
    triggerFileImport() {
        if (this.fileProcessing.isProcessing) {
            Utils.UIUtils.showMessage('Đang xử lý file khác, vui lòng đợi', 'warning');
            return;
        }

        if (!this.elements.importFileInput) {
            Utils.UIUtils.showMessage('Không tìm thấy input file', 'error');
            return;
        }

        this.elements.importFileInput.click();
    }

    /**
     * Enhanced file import handling
     */
    async handleImportFile(event) {
        const file = event.target.files[0];
        event.target.value = ''; // Clear input
        
        if (!file) return;

        if (this.fileProcessing.isProcessing) {
            Utils.UIUtils.showMessage('Đang xử lý file khác, vui lòng đợi', 'warning');
            return;
        }

        try {
            this.startOperation('import_data');
            
            // Enhanced file validation
            await this.validateImportFile(file);
            
            // Get user confirmation
            const confirmed = confirm(
                `Bạn có chắc chắn muốn nhập dữ liệu từ file "${file.name}"?\n\n` +
                `Kích thước: ${(file.size / 1024).toFixed(1)} KB\n` +
                `Hành động này sẽ ghi đè toàn bộ dữ liệu hiện tại.\n\n` +
                `Bạn có muốn tiếp tục?`
            );
            
            if (!confirmed) {
                return;
            }

            // Read and validate file content
            const importedData = await this.readAndValidateFile(file);
            
            // Perform import
            const success = await this.app.importData(importedData);
            
            if (success) {
                await this.refresh();
                Utils.UIUtils.showMessage('Đã nhập dữ liệu thành công', 'success');
                this.emitEvent('data:imported', { 
                    filename: file.name, 
                    size: file.size,
                    transactionCount: importedData.transactions?.length || 0
                });
            } else {
                throw new Error('Import operation failed');
            }
            
        } catch (error) {
            console.error('Import error:', error);
            Utils.UIUtils.showMessage(`Lỗi nhập dữ liệu: ${error.message}`, 'error');
            this.emitEvent('data:import_failed', { 
                filename: file?.name, 
                error: error.message 
            });
        } finally {
            this.endOperation();
        }
    }

    /**
     * Enhanced file validation
     */
    async validateImportFile(file) {
        // File type validation
        const validTypes = this.validationRules.fileUpload.allowedTypes;
        const validExtensions = this.validationRules.fileUpload.allowedExtensions;
        
        const isValidType = validTypes.includes(file.type) || 
                           validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
        
        if (!isValidType) {
            throw new Error(`File phải có định dạng JSON. Định dạng hiện tại: ${file.type || 'không xác định'}`);
        }

        // File size validation
        if (file.size > this.validationRules.fileUpload.maxFileSize) {
            const maxSizeMB = this.validationRules.fileUpload.maxFileSize / (1024 * 1024);
            throw new Error(`File quá lớn. Kích thước tối đa: ${maxSizeMB}MB`);
        }

        // Additional security check for file name
        if (!/^[a-zA-Z0-9\-_\.\s\(\)]+$/.test(file.name)) {
            throw new Error('Tên file chứa ký tự không được phép');
        }
    }

    /**
     * Enhanced file reading and validation
     */
    async readAndValidateFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const content = e.target.result;
                    
                    if (!content || typeof content !== 'string') {
                        throw new Error('File content is empty or invalid');
                    }

                    let data;
                    try {
                        data = JSON.parse(content);
                    } catch (parseError) {
                        throw new Error(`File JSON không hợp lệ: ${parseError.message}`);
                    }

                    // Enhanced validation
                    this.validateImportData(data);
                    
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => {
                reject(new Error('Không thể đọc file. File có thể bị hỏng hoặc không thể truy cập.'));
            };

            reader.readAsText(file);
        });
    }

    /**
     * Enhanced import data validation
     */
    validateImportData(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Dữ liệu file không hợp lệ');
        }

        // Required fields validation
        const requiredFields = ['transactions'];
        for (const field of requiredFields) {
            if (!(field in data)) {
                throw new Error(`File thiếu trường bắt buộc: ${field}`);
            }
            if (!Array.isArray(data[field])) {
                throw new Error(`Trường ${field} phải là mảng`);
            }
        }

        // Transaction validation
        if (data.transactions.length > 0) {
            const sampleTransaction = data.transactions[0];
            if (!sampleTransaction || typeof sampleTransaction !== 'object') {
                throw new Error('Dữ liệu giao dịch mẫu không hợp lệ');
            }

            const requiredTxFields = ['id', 'type', 'datetime', 'amount', 'account'];
            for (const field of requiredTxFields) {
                if (!(field in sampleTransaction)) {
                    throw new Error(`Giao dịch thiếu trường bắt buộc: ${field}`);
                }
            }

            // Validate transaction count
            if (data.transactions.length > this.validationRules.fileUpload.maxTransactions) {
                const confirmed = confirm(
                    `File chứa ${data.transactions.length.toLocaleString()} giao dịch ` +
                    `(nhiều hơn khuyến nghị ${this.validationRules.fileUpload.maxTransactions.toLocaleString()}).\n\n` +
                    `Điều này có thể làm chậm ứng dụng. Bạn có chắc chắn muốn tiếp tục?`
                );
                
                if (!confirmed) {
                    throw new Error('Import cancelled due to large transaction count');
                }
            }
        }

        // Data size validation
        const estimatedSize = JSON.stringify(data).length;
        if (estimatedSize > this.validationRules.fileUpload.maxDataSize) {
            throw new Error(`Dữ liệu quá lớn (> ${this.validationRules.fileUpload.maxDataSize / (1024 * 1024)}MB)`);
        }

        // Validate data integrity if checksum exists
        if (data._exportMetadata?.checksum) {
            const calculatedChecksum = this.calculateDataChecksum(data);
            if (calculatedChecksum !== data._exportMetadata.checksum) {
                console.warn('Data checksum mismatch - file may be corrupted or modified');
            }
        }
    }

    /**
     * Calculate simple checksum for data integrity
     */
    calculateDataChecksum(data) {
        try {
            const content = JSON.stringify(data.transactions || []);
            let hash = 0;
            for (let i = 0; i < content.length; i++) {
                const char = content.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            return hash.toString();
        } catch {
            return 'unknown';
        }
    }

    /**
     * Enhanced clear all data with better confirmation
     */
    async clearAllData() {
        if (this.fileProcessing.isProcessing) {
            Utils.UIUtils.showMessage('Đang xử lý tác vụ khác, vui lòng đợi', 'warning');
            return;
        }

        try {
            const transactionCount = this.app?.data?.transactions?.length || 0;
            const accountCount = this.app?.data?.accounts?.length || 0;
            const categoryCount = (this.app?.data?.incomeCategories?.length || 0) + 
                                 (this.app?.data?.expenseCategories?.length || 0);

            // Smart confirmation based on data amount
            let confirmMessage = 'Bạn có chắc chắn muốn xóa toàn bộ dữ liệu?\n\n';
            
            if (transactionCount > 0) {
                confirmMessage += `• ${transactionCount.toLocaleString()} giao dịch\n`;
            }
            if (accountCount > 0) {
                confirmMessage += `• ${accountCount} tài khoản\n`;
            }
            if (categoryCount > 0) {
                confirmMessage += `• ${categoryCount} danh mục\n`;
            }
            
            confirmMessage += '\nHành động này không thể hoàn tác.';

            if (!confirm(confirmMessage)) return;

            // Extra confirmation for large datasets
            if (transactionCount > 100) {
                if (!confirm('XÁC NHẬN LẦN CUỐI: BẠN THỰC SỰ MUỐN XÓA TOÀN BỘ DỮ LIỆU?')) {
                    return;
                }
            }

            this.startOperation('clear_data');
            
            const success = await this.app.clearAllData();
            
            if (success) {
                await this.refresh();
                Utils.UIUtils.showMessage('Đã xóa toàn bộ dữ liệu', 'success');
                this.emitEvent('data:cleared', { 
                    transactionCount, 
                    accountCount, 
                    categoryCount 
                });
            } else {
                throw new Error('Clear data operation failed');
            }
            
        } catch (error) {
            console.error('Error clearing data:', error);
            Utils.UIUtils.showMessage(`Có lỗi khi xóa dữ liệu: ${error.message}`, 'error');
            this.emitEvent('data:clear_failed', { error: error.message });
        } finally {
            this.endOperation();
        }
    }

    /**
     * Enhanced USD rate update
     */
    async updateUSDRate() {
        if (!this.elements.usdRateInput) {
            console.error('USD rate input element not found');
            return;
        }

        try {
            const inputValue = this.elements.usdRateInput.value.trim();
            
            if (!inputValue) {
                Utils.UIUtils.showMessage('Vui lòng nhập tỷ giá', 'error');
                this.resetUSDRateInput();
                return;
            }

            const rate = parseFloat(inputValue);
            
            if (isNaN(rate) || rate <= 0) {
                Utils.UIUtils.showMessage('Tỷ giá phải là số dương', 'error');
                this.resetUSDRateInput();
                return;
            }

            if (rate < this.validationRules.usdRate.min || rate > this.validationRules.usdRate.max) {
                const message = rate < this.validationRules.usdRate.min 
                    ? `Tỷ giá tối thiểu: ${this.validationRules.usdRate.min.toLocaleString()} VNĐ`
                    : `Tỷ giá tối đa: ${this.validationRules.usdRate.max.toLocaleString()} VNĐ`;
                
                Utils.UIUtils.showMessage(message, 'error');
                this.resetUSDRateInput();
                return;
            }

            // Update global config and app data
            Utils.CONFIG.USD_TO_VND_RATE = rate;
            
            if (this.app?.data?.settings) {
                this.app.data.settings.usdRate = rate;
                await this.app.saveData();
            }

            this.elements.usdRateInput.classList.remove('input-invalid');
            this.elements.usdRateInput.classList.add('input-valid');
            this.clearUSDRateError();

            Utils.UIUtils.showMessage(
                `Đã cập nhật tỷ giá USD/VNĐ: ${rate.toLocaleString()} VNĐ`, 
                'success', 
                2000
            );

            this.emitEvent('currency:rate_updated', { rate, currency: 'USD' });
            
        } catch (error) {
            console.error('Error updating USD rate:', error);
            Utils.UIUtils.showMessage('Có lỗi khi cập nhật tỷ giá', 'error');
            this.resetUSDRateInput();
        }
    }

    /**
     * Reset USD rate input to current value
     */
    resetUSDRateInput() {
        if (this.elements.usdRateInput && this.app?.data?.settings) {
            const currentRate = this.app.data.settings.usdRate || Utils.CONFIG.USD_TO_VND_RATE || 25000;
            this.elements.usdRateInput.value = currentRate;
            this.elements.usdRateInput.classList.remove('input-invalid', 'input-valid');
            this.clearUSDRateError();
        }
    }

    /**
     * Enhanced default currency update
     */
    async updateDefaultCurrency() {
        if (!this.elements.defaultCurrencySelect) return;

        try {
            const currency = this.elements.defaultCurrencySelect.value;
            
            if (!currency || !['VND', 'USD'].includes(currency)) {
                Utils.UIUtils.showMessage('Tiền tệ không hợp lệ', 'error');
                return;
            }

            if (this.app?.data?.settings) {
                this.app.data.settings.defaultCurrency = currency;
                await this.app.saveData();
            }

            Utils.UIUtils.showMessage(`Đã đặt tiền tệ mặc định: ${currency}`, 'success', 2000);
            this.emitEvent('currency:default_changed', { currency });
            
        } catch (error) {
            console.error('Error updating default currency:', error);
            Utils.UIUtils.showMessage('Có lỗi khi cập nhật tiền tệ mặc định', 'error');
        }
    }

    /**
     * Enhanced update last backup time
     */
    async updateLastBackupTime() {
        try {
            const now = new Date().toISOString();
            
            if (this.app?.data?.settings) {
                this.app.data.settings.lastBackup = now;
                await this.app.saveData();
            }

            if (this.elements.lastBackupEl) {
                this.elements.lastBackupEl.textContent = Utils.DateUtils.formatDisplayDateTime(now);
            }

            this.state.lastBackupCheck = now;
            
        } catch (error) {
            console.error('Error updating last backup time:', error);
        }
    }

    /**
     * Add to backup history
     */
    addToBackupHistory(type) {
        try {
            const backupEntry = {
                type,
                timestamp: new Date().toISOString(),
                size: this.calculateAppDataSize()
            };

            this.state.backupHistory.unshift(backupEntry);
            
            // Keep only recent backups
            if (this.state.backupHistory.length > this.validationRules.backup.maxBackupsToKeep) {
                this.state.backupHistory = this.state.backupHistory.slice(0, this.validationRules.backup.maxBackupsToKeep);
            }

            // Save to localStorage for persistence
            try {
                localStorage.setItem('backup_history', JSON.stringify(this.state.backupHistory));
            } catch (e) {
                console.warn('Could not save backup history to localStorage');
            }
            
        } catch (error) {
            console.error('Error adding to backup history:', error);
        }
    }

    /**
     * Calculate app data size
     */
    calculateAppDataSize() {
        try {
            const data = this.app?.data;
            if (!data) return 0;
            return JSON.stringify(data).length;
        } catch {
            return 0;
        }
    }

    /**
     * Enhanced loading state management
     */
    showLoading(show) {
        try {
            if (this.elements.loadingIndicator) {
                this.elements.loadingIndicator.style.display = show ? 'flex' : 'none';
            }

            const buttons = [
                this.elements.exportJsonBtn, this.elements.exportCsvBtn,
                this.elements.importDataBtn, this.elements.clearDataBtn,
                this.elements.checkUpdatesBtn, this.elements.forceRefreshBtn, 
                this.elements.clearCacheBtn
            ];

            buttons.forEach(btn => {
                if (btn) {
                    btn.disabled = show;
                    btn.style.opacity = show ? '0.6' : '1';
                    btn.style.cursor = show ? 'wait' : 'pointer';
                }
            });
            
        } catch (error) {
            console.error('Error showing loading state:', error);
        }
    }

    /**
     * Start operation tracking
     */
    startOperation(operationType) {
        this.fileProcessing.isProcessing = true;
        this.fileProcessing.currentOperation = operationType;
        this.fileProcessing.startTime = Date.now();
        this.fileProcessing.progress = 0;
        
        this.state.pendingOperations.add(operationType);
        this.showLoading(true);
        
        this.emitEvent('operation:started', { type: operationType });
    }

    /**
     * End operation tracking
     */
    endOperation() {
        const operationType = this.fileProcessing.currentOperation;
        const duration = this.fileProcessing.startTime ? Date.now() - this.fileProcessing.startTime : 0;
        
        this.fileProcessing.isProcessing = false;
        this.fileProcessing.currentOperation = null;
        this.fileProcessing.startTime = null;
        this.fileProcessing.progress = 100;
        
        if (operationType) {
            this.state.pendingOperations.delete(operationType);
        }
        
        this.showLoading(false);
        
        this.emitEvent('operation:completed', { type: operationType, duration });
        
        // Reset progress after delay
        setTimeout(() => {
            this.fileProcessing.progress = 0;
        }, 1000);
    }

    /**
     * Enhanced app info update
     */
    updateAppInfo() {
        try {
            // Total transactions
            if (this.elements.totalTransactionsEl) {
                const count = this.app?.data?.transactions?.length || 0;
                this.elements.totalTransactionsEl.textContent = count.toLocaleString();
            }

            // Data size with enhanced calculation
            if (this.elements.dataSizeEl) {
                try {
                    const sizeBytes = Utils.StorageUtils.getStorageSize();
                    this.elements.dataSizeEl.textContent = Utils.StorageUtils.formatStorageSize(sizeBytes);
                } catch (error) {
                    console.error('Error calculating storage size:', error);
                    this.elements.dataSizeEl.textContent = 'Không xác định';
                }
            }

            // Last backup with relative time
            if (this.elements.lastBackupEl) {
                const lastBackup = this.app?.data?.settings?.lastBackup;
                if (lastBackup) {
                    try {
                        const formattedDate = Utils.DateUtils.formatDisplayDateTime(lastBackup);
                        const relativeTime = this.getRelativeTime(new Date(lastBackup));
                        this.elements.lastBackupEl.textContent = formattedDate;
                        this.elements.lastBackupEl.title = `${relativeTime} trước`;
                    } catch (error) {
                        console.error('Error formatting backup date:', error);
                        this.elements.lastBackupEl.textContent = 'Lỗi hiển thị';
                    }
                } else {
                    this.elements.lastBackupEl.textContent = 'Chưa backup';
                    this.elements.lastBackupEl.title = '';
                }
            }

            // App Version
            if (this.elements.appInfoVersionEl) {
                const version = typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'N/A';
                this.elements.appInfoVersionEl.textContent = version;
            }

        } catch (error) {
            console.error('Error updating app info:', error);
        }
    }

    /**
     * Get relative time string
     */
    getRelativeTime(date) {
        try {
            const now = new Date();
            const diff = now - date;
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(diff / 3600000);
            const days = Math.floor(diff / 86400000);

            if (minutes < 1) return 'vừa xong';
            if (minutes < 60) return `${minutes} phút`;
            if (hours < 24) return `${hours} giờ`;
            return `${days} ngày`;
        } catch {
            return 'không xác định';
        }
    }

    /**
     * Enhanced theme radios update
     */
    updateThemeRadios() {
        try {
            if (!this.elements.themeRadios) return;

            const currentTheme = Utils.ThemeUtils.getCurrentTheme();
            
            Array.from(this.elements.themeRadios).forEach(radio => {
                if (radio && radio.value === currentTheme) {
                    radio.checked = true;
                }
            });
        } catch (error) {
            console.error('Error updating theme radios:', error);
        }
    }

    /**
     * Enhanced currency settings update
     */
    updateCurrencySettings() {
        try {
            if (this.elements.usdRateInput) {
                const rate = this.app?.data?.settings?.usdRate || Utils.CONFIG.USD_TO_VND_RATE || 25000;
                this.elements.usdRateInput.value = rate;
                this.elements.usdRateInput.classList.remove('input-invalid', 'input-valid');
                this.clearUSDRateError();
            }

            if (this.elements.defaultCurrencySelect) {
                const currency = this.app?.data?.settings?.defaultCurrency || 'VND';
                this.elements.defaultCurrencySelect.value = currency;
            }
        } catch (error) {
            console.error('Error updating currency settings:', error);
        }
    }

    /**
     * Enhanced version info update
     */
    updateVersionInfo() {
        try {
            const appVersion = typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'N/A';
            
            if (this.elements.currentVersionEl) {
                this.elements.currentVersionEl.textContent = appVersion;
            }

            if (window.FinancialApp?.updateManager) {
                const updateManager = window.FinancialApp.updateManager;
                const swVersionDisplay = updateManager.swVersion || 'N/A';

                if (updateManager.isUpdateAvailable) {
                    this.updateUpdateStatus(`Có SW mới! (App: v${appVersion}, SW mới: v${swVersionDisplay})`);
                } else {
                    this.updateUpdateStatus(`Đã cập nhật (App v${appVersion}, SW v${swVersionDisplay})`);
                }
                
                if (this.elements.lastUpdateCheckEl && updateManager.lastCheck) {
                    this.elements.lastUpdateCheckEl.textContent = updateManager.lastCheck.toLocaleString('vi-VN', { 
                        dateStyle: 'short', 
                        timeStyle: 'short' 
                    });
                } else if (this.elements.lastUpdateCheckEl) {
                    this.elements.lastUpdateCheckEl.textContent = 'Chưa kiểm tra';
                }
            } else {
                this.updateUpdateStatus('Service Worker chưa sẵn sàng');
                if (this.elements.lastUpdateCheckEl) {
                    this.elements.lastUpdateCheckEl.textContent = 'Chưa kiểm tra';
                }
            }
        } catch (error) {
            console.error('Error updating version info:', error);
            this.updateUpdateStatus('Lỗi hiển thị version');
        }
    }

    /**
     * Enhanced check for updates
     */
    async checkForUpdates() {
        if (this.state.updateCheckInProgress) {
            Utils.UIUtils.showMessage('Đang kiểm tra cập nhật...', 'info');
            return;
        }

        try {
            this.state.updateCheckInProgress = true;
            this.updateUpdateStatus('Đang kiểm tra...');
            this.setButtonLoading(this.elements.checkUpdatesBtn, true);

            if (window.FinancialApp?.updateManager) {
                const updateManager = window.FinancialApp.updateManager;
                await updateManager.checkForUpdates();

                const appVersion = typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'N/A';
                const swVersionDisplay = updateManager.swVersion || 'N/A';

                if (updateManager.isUpdateAvailable) {
                    this.updateUpdateStatus(`Có SW mới! (App v${appVersion}, SW mới v${swVersionDisplay})`);
                } else {
                    this.updateUpdateStatus(`Đã cập nhật (App v${appVersion}, SW v${swVersionDisplay})`);
                    Utils.UIUtils.showMessage('✅ Bạn đang sử dụng phiên bản mới nhất.', 'success');
                }
                
                this.state.lastUpdateCheck = new Date();
                this.updateLastCheckTime();
                
            } else {
                this.updateUpdateStatus('Service Worker không có');
                Utils.UIUtils.showMessage('Service Worker chưa sẵn sàng để kiểm tra cập nhật.', 'warning');
            }
            
        } catch (error) {
            console.error('Error checking for updates:', error);
            this.updateUpdateStatus('Lỗi kiểm tra');
            Utils.UIUtils.showMessage('Có lỗi khi kiểm tra cập nhật', 'error');
        } finally {
            this.state.updateCheckInProgress = false;
            this.setButtonLoading(this.elements.checkUpdatesBtn, false);
        }
    }

    /**
     * Enhanced force refresh app
     */
    async forceRefreshApp() {
        const confirmed = confirm(
            '🔄 Làm mới ứng dụng sẽ:\n\n' +
            '• Tải lại toàn bộ từ server\n' +
            '• Xóa cache cũ\n' +
            '• Đảm bảo có phiên bản mới nhất\n\n' +
            'Bạn có muốn tiếp tục không?'
        );
        
        if (!confirmed) return;

        try {
            this.setButtonLoading(this.elements.forceRefreshBtn, true);
            
            if (window.FinancialApp?.updateManager) {
                await window.FinancialApp.updateManager.forceRefresh();
            } else {
                this.fallbackForceRefresh();
            }
        } catch (error) {
            console.error('Error force refreshing app:', error);
            Utils.UIUtils.showMessage('Có lỗi khi làm mới ứng dụng. Đang thử phương pháp khác...', 'warning');
            setTimeout(() => this.fallbackForceRefresh(), 1000);
        }
    }

    /**
     * Fallback force refresh
     */
    fallbackForceRefresh() {
        try {
            if ('caches' in window) {
                caches.keys().then(names => {
                    names.forEach(name => caches.delete(name));
                }).finally(() => this.hardReload());
            } else {
                this.hardReload();
            }
        } catch (error) {
            console.error('Fallback refresh failed:', error);
            this.hardReload();
        }
    }

    /**
     * Hard reload with cache busting
     */
    hardReload() {
        const url = new URL(window.location.href);
        url.searchParams.set('_cacheBust', Date.now());
        url.searchParams.set('_forceReload', '1');
        window.location.href = url.toString();
    }

    /**
     * Enhanced clear app cache
     */
    async clearAppCache() {
        const confirmed = confirm(
            '⚠️ XÓA CACHE ỨNG DỤNG\n\n' +
            'Điều này sẽ:\n' +
            '• Xóa toàn bộ cache ứng dụng\n' +
            '• Buộc tải lại từ server\n' +
            '• Có thể gây mất kết nối tạm thời\n\n' +
            'CHỈ LÀM ĐIỀU NÀY KHI CÓ LỖI!\n\n' +
            'Bạn có chắc chắn muốn tiếp tục?'
        );
        
        if (!confirmed) return;

        try {
            this.setButtonLoading(this.elements.clearCacheBtn, true);
            
            // Clear caches
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
                console.log('🗑️ All caches cleared');
            }

            // Unregister service workers
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map(reg => reg.unregister()));
                console.log('🗑️ Service workers unregistered');
            }

            // Clear localStorage selectively (keep important data)
            try {
                const keysToKeep = ['financial_app_data', 'backup_history'];
                const allKeys = Object.keys(localStorage);
                
                allKeys.forEach(key => {
                    if (!keysToKeep.includes(key)) {
                        localStorage.removeItem(key);
                    }
                });
            } catch (e) {
                console.warn('Could not clear localStorage:', e);
            }

            Utils.UIUtils.showMessage('✅ Cache đã được xóa. Đang tải lại...', 'success');
            setTimeout(() => this.hardReload(), 1500);
            
        } catch (error) {
            console.error('Error clearing cache:', error);
            Utils.UIUtils.showMessage('Có lỗi khi xóa cache. Đang tải lại...', 'error');
            setTimeout(() => this.hardReload(), 1000);
        }
    }

    /**
     * Update update status display
     */
    updateUpdateStatus(status) {
        if (this.elements.updateStatusEl) {
            this.elements.updateStatusEl.textContent = status;
            this.elements.updateStatusEl.className = 'info-value';
            
            if (status.includes('Có SW mới') || status.includes('Có cập nhật')) {
                this.elements.updateStatusEl.style.color = 'var(--warning-color)';
            } else if (status.includes('Đã cập nhật')) {
                this.elements.updateStatusEl.style.color = 'var(--accent-color)';
            } else if (status.includes('Lỗi')) {
                this.elements.updateStatusEl.style.color = 'var(--danger-color)';
            } else {
                this.elements.updateStatusEl.style.color = 'var(--text-secondary)';
            }
        }
    }

    /**
     * Update last check time
     */
    updateLastCheckTime() {
        if (this.elements.lastUpdateCheckEl) {
            const now = new Date();
            this.elements.lastUpdateCheckEl.textContent = now.toLocaleString('vi-VN', { 
                dateStyle: 'short', 
                timeStyle: 'short' 
            });
        }
    }

    /**
     * Enhanced button loading state
     */
    setButtonLoading(button, isLoading) {
        if (!button) return;

        if (isLoading) {
            button.dataset.originalContent = button.innerHTML;
            button.disabled = true;
            button.style.opacity = '0.6';
            button.style.cursor = 'wait';
            
            const firstIcon = button.querySelector('.btn-icon:not(.loader)');
            if (firstIcon) firstIcon.style.display = 'none';

            let spinnerIcon = button.querySelector('.btn-icon.loader');
            if (!spinnerIcon) {
                spinnerIcon = document.createElement('span');
                spinnerIcon.className = 'btn-icon loader';
                spinnerIcon.innerHTML = '⏳';
                spinnerIcon.style.animation = 'spin 1s linear infinite';
                button.insertBefore(spinnerIcon, button.firstChild);
            }
            spinnerIcon.style.display = 'inline-block';
        } else {
            button.disabled = false;
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
            
            const spinnerIcon = button.querySelector('.btn-icon.loader');
            if (spinnerIcon) spinnerIcon.remove();

            const firstIcon = button.querySelector('.btn-icon:not(.loader)');
            if (firstIcon) firstIcon.style.display = 'inline-flex';
            
            delete button.dataset.originalContent;
        }
    }

    /**
     * Setup performance monitoring
     */
    setupPerformanceMonitoring() {
        // Monitor slow operations
        setInterval(() => {
            if (this.performance.slowOperations.length > 10) {
                console.warn('Multiple slow operations detected:', this.performance.slowOperations.length);
                this.performance.slowOperations = this.performance.slowOperations.slice(-5); // Keep last 5
            }
        }, 60000);

        // Monitor memory if available
        if (performance.memory) {
            setInterval(() => {
                const memoryInfo = performance.memory;
                if (memoryInfo.usedJSHeapSize > 100 * 1024 * 1024) { // 100MB
                    console.warn('High memory usage detected in SettingsModule');
                    this.cleanupMemory();
                }
            }, 30000);
        }
    }

    /**
     * Setup auto backup reminder
     */
    setupAutoBackup() {
        try {
            // Load backup history from localStorage
            const savedHistory = localStorage.getItem('backup_history');
            if (savedHistory) {
                this.state.backupHistory = JSON.parse(savedHistory);
            }

            // Check if auto backup reminder is needed
            setInterval(() => {
                this.checkAutoBackupReminder();
            }, 60000); // Check every minute

        } catch (error) {
            console.error('Error setting up auto backup:', error);
        }
    }

    /**
     * Check if auto backup reminder should be shown
     */
    checkAutoBackupReminder() {
        try {
            const lastBackup = this.app?.data?.settings?.lastBackup;
            if (!lastBackup) return;

            const lastBackupDate = new Date(lastBackup);
            const now = new Date();
            const daysSinceBackup = (now - lastBackupDate) / (1000 * 60 * 60 * 24);

            if (daysSinceBackup > 7) { // 7 days
                const transactionCount = this.app?.data?.transactions?.length || 0;
                if (transactionCount > 10) { // Only if there's significant data
                    this.showBackupReminder(Math.floor(daysSinceBackup));
                }
            }
        } catch (error) {
            console.error('Error checking auto backup reminder:', error);
        }
    }

    /**
     * Show backup reminder
     */
    showBackupReminder(daysSinceBackup) {
        const message = `💾 Bạn chưa backup dữ liệu ${daysSinceBackup} ngày. Bạn có muốn backup ngay không?`;
        
        if (confirm(message)) {
            this.exportData();
        }
    }

    /**
     * Cleanup memory
     */
    cleanupMemory() {
        // Clear old performance data
        this.performance.slowOperations = [];
        
        // Clear old debounce timers
        this.debounceTimers.forEach(timer => clearTimeout(timer));
        this.debounceTimers.clear();
        
        // Trigger garbage collection if available
        if (window.gc) {
            window.gc();
        }
    }

    /**
     * Event emission for module communication
     */
    emitEvent(eventName, data = {}) {
        try {
            const event = new CustomEvent(`settings:${eventName}`, { 
                detail: { ...data, module: 'settings', timestamp: Date.now() } 
            });
            document.dispatchEvent(event);
        } catch (error) {
            console.warn('Failed to emit event:', eventName, error);
        }
    }

    /**
     * Handle initialization errors
     */
    handleInitializationError(error) {
        if (Utils?.UIUtils) {
            Utils.UIUtils.showMessage('Có lỗi khi khởi tạo module cài đặt', 'error');
        }
        
        this.isInitialized = false;
        this.emitEvent('module:init_failed', { error: error.message });
    }

    /**
     * Handle event errors
     */
    handleEventError(error, event) {
        console.error('Settings event handler error:', error, event);
        
        if (Utils?.UIUtils) {
            Utils.UIUtils.showMessage('Đã xảy ra lỗi, vui lòng thử lại.', 'error');
        }
        
        this.emitEvent('event:error', { error: error.message, eventType: event?.type });
    }

    /**
     * Enhanced refresh method
     */
    async refresh() {
        if (this.isDestroyed) {
            console.warn('Cannot refresh destroyed SettingsModule');
            return;
        }

        try {
            this.updateThemeRadios();
            this.updateCurrencySettings();
            this.updateAppInfo();
            this.updateVersionInfo();
            
            this.emitEvent('module:refreshed');
            
        } catch (error) {
            console.error('Error refreshing settings module:', error);
            this.emitEvent('module:refresh_failed', { error: error.message });
        }
    }

    /**
     * Enhanced cleanup with proper memory management
     */
    destroy() {
        if (this.isDestroyed) return;
        
        try {
            // Clear all timers
            this.debounceTimers.forEach(timer => clearTimeout(timer));
            this.debounceTimers.clear();

            // Remove event listeners
            this.eventListeners.forEach(({ element, event, handler }) => {
                if (element && typeof element.removeEventListener === 'function') {
                    element.removeEventListener(event, handler);
                }
            });
            this.eventListeners = [];

            // Clear states
            this.state.pendingOperations.clear();
            this.performance.slowOperations = [];

            // Reset processing state
            this.fileProcessing.isProcessing = false;
            this.fileProcessing.currentOperation = null;

            // Clear element references
            this.elements = {};
            
            // Reset flags
            this.isInitialized = false;
            this.isDestroyed = true;

            this.emitEvent('module:destroyed');
            
        } catch (error) {
            console.error('Error during SettingsModule destruction:', error);
        }
    }

    /**
     * Health check for monitoring
     */
    getHealthStatus() {
        return {
            isInitialized: this.isInitialized,
            isDestroyed: this.isDestroyed,
            isProcessing: this.fileProcessing.isProcessing,
            currentOperation: this.fileProcessing.currentOperation,
            eventListeners: this.eventListeners.length,
            pendingOperations: Array.from(this.state.pendingOperations),
            lastOperationTime: this.performance.lastOperationTime,
            operationCount: this.performance.operationCount,
            slowOperationsCount: this.performance.slowOperations.length
        };
    }

    // Additional utility methods
    showAppInfo() {
        Utils.UIUtils.showMessage('Chức năng thông tin chi tiết ứng dụng sẽ được triển khai sau.', 'info');
    }

    exportStatistics() {
        Utils.UIUtils.showMessage('Chức năng xuất thống kê sẽ được triển khai sau.', 'info');
    }

    async resetToDefaults() {
        if (confirm('Bạn có chắc chắn muốn khôi phục cài đặt mặc định? Hành động này sẽ không xóa dữ liệu giao dịch.')) {
            try {
                if (this.app?.data && this.app.defaultData) {
                    this.app.data.settings = { ...this.app.defaultData.settings };
                    if (this.app.defaultData.settings.usdRate) {
                        Utils.CONFIG.USD_TO_VND_RATE = this.app.defaultData.settings.usdRate;
                    }
                    await this.app.saveData();
                    await this.refresh();
                    Utils.UIUtils.showMessage('Cài đặt đã được khôi phục mặc định.', 'success');
                } else {
                    throw new Error('App data or default data not available');
                }
            } catch (error) {
                console.error('Error resetting settings to defaults:', error);
                Utils.UIUtils.showMessage('Có lỗi khi khôi phục cài đặt mặc định.', 'error');
            }
        }
    }
}

// Enhanced context menu for settings tab
document.addEventListener('contextmenu', (e) => {
    if (e.target.closest('#tab-settings')) {
        e.preventDefault();
        
        const existingMenu = document.querySelector('.custom-context-menu');
        if (existingMenu) existingMenu.remove();

        const contextMenu = document.createElement('div');
        contextMenu.className = 'custom-context-menu fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl py-2 z-[100] text-sm';
        contextMenu.style.left = `${e.pageX}px`;
        contextMenu.style.top = `${e.pageY}px`;
        
        contextMenu.innerHTML = `
            <button class="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200" data-action="show-app-info">📊 Thông tin chi tiết</button>
            <button class="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200" data-action="export-statistics">📈 Xuất thống kê</button>
            <div class="my-1 border-t border-gray-200 dark:border-gray-600"></div>
            <button class="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200" data-action="reset-defaults">🔄 Khôi phục cài đặt</button>
        `;
        
        document.body.appendChild(contextMenu);

        contextMenu.addEventListener('click', (event) => {
            const action = event.target.closest('button')?.dataset.action;
            if (action && window.SettingsModule) {
                switch (action) {
                    case 'show-app-info': window.SettingsModule.showAppInfo(); break;
                    case 'export-statistics': window.SettingsModule.exportStatistics(); break;
                    case 'reset-defaults': window.SettingsModule.resetToDefaults(); break;
                }
                contextMenu.remove();
            }
        });

        const removeMenuHandler = (event) => {
            if (!contextMenu.contains(event.target)) {
                contextMenu.remove();
                document.removeEventListener('click', removeMenuHandler, true);
                document.removeEventListener('contextmenu', removeMenuHandler, true);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', removeMenuHandler, true);
            document.addEventListener('contextmenu', removeMenuHandler, true);
        }, 0);
    }
});

// Create global instance
window.SettingsModule = new SettingsModule();