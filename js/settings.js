/**
 * SETTINGS MODULE - FIXED VERSION
 * Handles app settings, theme, backup, and data management
 */
class SettingsModule {
    constructor() {
        this.app = null;

        // DOM elements
        this.elements = {};

        // Event listeners for cleanup
        this.eventListeners = [];

        // File processing state
        this.isProcessingFile = false;

        // Validation constants
        this.validationRules = {
            usdRate: {
                min: 1000, // will be updated in init
                max: 50000
            },
            maxFileSize: 10 * 1024 * 1024, // 10MB
            allowedFileTypes: ['application/json', 'text/json']
        };
    }

    /**
     * Initialize the module with comprehensive error handling
     */
    init(app) {
        this.app = app;

        // ✅ Fix: safely update from Utils.CONFIG after Utils is defined
        this.validationRules.usdRate.min = Utils?.CONFIG?.USD_RATE_MIN || 1000;
        this.validationRules.usdRate.max = Utils?.CONFIG?.USD_RATE_MAX || 50000;

        console.log('⚙️ Initializing Settings Module...');

        try {
            this.initializeElements();
            this.initializeEventListeners();

            this.refresh();

            console.log('✅ Settings Module initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Settings Module:', error);
            Utils.UIUtils.showMessage('Có lỗi khi khởi tạo module cài đặt', 'error');
        }
    }

    /**
     * Initialize DOM elements with validation
     */
    initializeElements() {
        this.elements = {
            // Theme elements
            themeRadios: document.querySelectorAll('input[name="theme"]'),

            // Data management elements
            exportJsonBtn: document.getElementById('export-json'),
            exportCsvBtn: document.getElementById('export-csv'),
            importDataBtn: document.getElementById('import-data'),
            importFileInput: document.getElementById('import-file'),
            clearDataBtn: document.getElementById('clear-data'),

            // Currency elements
            usdRateInput: document.getElementById('usd-rate'),
            defaultCurrencySelect: document.getElementById('default-currency'),

            // App info elements
            totalTransactionsEl: document.getElementById('total-transactions'),
            dataSizeEl: document.getElementById('data-size'),
            lastBackupEl: document.getElementById('last-backup'),

            // Loading indicator
            loadingIndicator: document.getElementById('settings-loading')
        };

        // Log missing critical elements
        const criticalElements = ['themeRadios', 'usdRateInput'];
        criticalElements.forEach(key => {
            if (!this.elements[key] || (Array.isArray(this.elements[key]) && this.elements[key].length === 0)) {
                console.warn(`Critical settings element missing: ${key}`);
            }
        });
    }

    /**
     * Initialize event listeners with proper cleanup tracking
     */
    initializeEventListeners() {
        try {
            // Theme change events
            this.elements.themeRadios.forEach(radio => {
                const changeHandler = () => {
                    if (radio.checked) {
                        this.changeTheme(radio.value);
                    }
                };

                radio.addEventListener('change', changeHandler);
                this.eventListeners.push({
                    element: radio,
                    event: 'change',
                    handler: changeHandler
                });
            });

            // Data management events
            this.initializeDataManagementEvents();

            // Currency settings events
            this.initializeCurrencyEvents();

        } catch (error) {
            console.error('Error initializing event listeners:', error);
        }
    }

    /**
     * Initialize data management event listeners
     */
    initializeDataManagementEvents() {
        if (this.elements.exportJsonBtn) {
            const exportJsonHandler = () => this.exportData();
            this.elements.exportJsonBtn.addEventListener('click', exportJsonHandler);
            this.eventListeners.push({
                element: this.elements.exportJsonBtn,
                event: 'click',
                handler: exportJsonHandler
            });
        }

        if (this.elements.exportCsvBtn) {
            const exportCsvHandler = () => this.exportCSV();
            this.elements.exportCsvBtn.addEventListener('click', exportCsvHandler);
            this.eventListeners.push({
                element: this.elements.exportCsvBtn,
                event: 'click',
                handler: exportCsvHandler
            });
        }

        if (this.elements.importDataBtn) {
            const importHandler = () => {
                if (!this.isProcessingFile) {
                    this.elements.importFileInput?.click();
                }
            };
            this.elements.importDataBtn.addEventListener('click', importHandler);
            this.eventListeners.push({
                element: this.elements.importDataBtn,
                event: 'click',
                handler: importHandler
            });
        }

        if (this.elements.importFileInput) {
            const fileChangeHandler = (e) => this.handleImportFile(e);
            this.elements.importFileInput.addEventListener('change', fileChangeHandler);
            this.eventListeners.push({
                element: this.elements.importFileInput,
                event: 'change',
                handler: fileChangeHandler
            });
        }

        if (this.elements.clearDataBtn) {
            const clearHandler = () => this.clearAllData();
            this.elements.clearDataBtn.addEventListener('click', clearHandler);
            this.eventListeners.push({
                element: this.elements.clearDataBtn,
                event: 'click',
                handler: clearHandler
            });
        }
    }

    /**
     * Initialize currency event listeners
     */
    initializeCurrencyEvents() {
        if (this.elements.usdRateInput) {
            // Use input event for real-time validation
            const inputHandler = () => this.validateUSDRateInput();
            this.elements.usdRateInput.addEventListener('input', inputHandler);
            this.eventListeners.push({
                element: this.elements.usdRateInput,
                event: 'input',
                handler: inputHandler
            });

            // Use change event for final validation and saving
            const changeHandler = () => this.updateUSDRate();
            this.elements.usdRateInput.addEventListener('change', changeHandler);
            this.eventListeners.push({
                element: this.elements.usdRateInput,
                event: 'change',
                handler: changeHandler
            });

            // Prevent invalid characters
            const keydownHandler = (e) => this.handleUSDRateKeydown(e);
            this.elements.usdRateInput.addEventListener('keydown', keydownHandler);
            this.eventListeners.push({
                element: this.elements.usdRateInput,
                event: 'keydown',
                handler: keydownHandler
            });
        }

        if (this.elements.defaultCurrencySelect) {
            const currencyChangeHandler = () => this.updateDefaultCurrency();
            this.elements.defaultCurrencySelect.addEventListener('change', currencyChangeHandler);
            this.eventListeners.push({
                element: this.elements.defaultCurrencySelect,
                event: 'change',
                handler: currencyChangeHandler
            });
        }
    }

    /**
     * Handle USD rate keydown for input validation
     */
    handleUSDRateKeydown(e) {
        // Allow: backspace, delete, tab, escape, enter
        if ([8, 9, 27, 13, 46].indexOf(e.keyCode) !== -1 ||
            // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
            (e.keyCode === 65 && e.ctrlKey === true) ||
            (e.keyCode === 67 && e.ctrlKey === true) ||
            (e.keyCode === 86 && e.ctrlKey === true) ||
            (e.keyCode === 88 && e.ctrlKey === true)) {
            return;
        }

        // Ensure that it is a number and stop the keypress
        if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
            e.preventDefault();
        }
    }

    /**
     * Validate USD rate input in real-time
     */
    validateUSDRateInput() {
        if (!this.elements.usdRateInput) return;

        try {
            const value = this.elements.usdRateInput.value.trim();
            const rate = parseFloat(value);

            // Remove any previous validation classes
            this.elements.usdRateInput.classList.remove('input-valid', 'input-invalid');

            if (value === '') {
                // Empty input - neutral state
                return;
            }

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

            // Valid input
            this.elements.usdRateInput.classList.add('input-valid');
            this.clearUSDRateError();

        } catch (error) {
            console.error('Error validating USD rate input:', error);
        }
    }

    /**
     * Show USD rate error message
     */
    showUSDRateError(message) {
        let errorEl = document.getElementById('usd-rate-error');

        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.id = 'usd-rate-error';
            errorEl.className = 'input-error-message';

            if (this.elements.usdRateInput && this.elements.usdRateInput.parentNode) {
                this.elements.usdRateInput.parentNode.appendChild(errorEl);
            }
        }

        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }

    /**
     * Clear USD rate error message
     */
    clearUSDRateError() {
        const errorEl = document.getElementById('usd-rate-error');
        if (errorEl) {
            errorEl.style.display = 'none';
        }
    }

    /**
     * Change theme with validation
     */
    changeTheme(theme) {
        if (!theme || !['light', 'dark', 'auto'].includes(theme)) {
            console.error('Invalid theme value:', theme);
            return;
        }

        try {
            Utils.ThemeUtils.applyTheme(theme);

            if (this.app && this.app.data && this.app.data.settings) {
                this.app.data.settings.theme = theme;
                this.app.saveData();
            }

            Utils.UIUtils.showMessage(`Đã chuyển sang chế độ ${this.getThemeDisplayName(theme)}`, 'success', 2000);

            // Update charts after theme change
            setTimeout(() => {
                if (window.StatisticsModule && typeof window.StatisticsModule.updateChartColors === 'function') {
                    window.StatisticsModule.updateChartColors();
                }
            }, 100);

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
     * Export data as JSON with enhanced error handling
     */
    exportData() {
        try {
            if (!this.app) {
                throw new Error('App instance not available');
            }

            this.showLoading(true);

            const exportData = this.app.exportData();

            if (!exportData) {
                throw new Error('No data to export');
            }

            // Validate export data
            if (!exportData.transactions || !Array.isArray(exportData.transactions)) {
                throw new Error('Invalid transaction data');
            }

            if (Utils.ExportUtils.exportJSON(exportData, 'financial_data')) {
                // Update last backup time
                this.updateLastBackupTime();
                Utils.UIUtils.showMessage('Đã xuất dữ liệu thành công', 'success');
            } else {
                throw new Error('Export function failed');
            }

        } catch (error) {
            console.error('Export error:', error);
            Utils.UIUtils.showMessage(`Có lỗi khi xuất dữ liệu: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Export transactions as CSV with validation
     */
    exportCSV() {
        try {
            if (!this.app || !this.app.data || !Array.isArray(this.app.data.transactions)) {
                throw new Error('Invalid app data');
            }

            if (this.app.data.transactions.length === 0) {
                Utils.UIUtils.showMessage('Không có giao dịch nào để xuất', 'warning');
                return;
            }

            this.showLoading(true);

            const accounts = this.app.data.accounts || [];

            if (Utils.ExportUtils.exportCSV(this.app.data.transactions, accounts)) {
                Utils.UIUtils.showMessage('Đã xuất file CSV thành công', 'success');
            } else {
                throw new Error('CSV export function failed');
            }

        } catch (error) {
            console.error('CSV export error:', error);
            Utils.UIUtils.showMessage(`Có lỗi khi xuất file CSV: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Handle import file with comprehensive validation
     */
    async handleImportFile(event) {
        const file = event.target.files[0];

        // Reset file input immediately
        event.target.value = '';

        if (!file) return;

        // Prevent multiple simultaneous imports
        if (this.isProcessingFile) {
            Utils.UIUtils.showMessage('Đang xử lý file khác, vui lòng đợi', 'warning');
            return;
        }

        try {
            this.isProcessingFile = true;
            this.showLoading(true);

            // Validate file type
            if (!this.validationRules.allowedFileTypes.includes(file.type) && !file.name.endsWith('.json')) {
                throw new Error('File phải có định dạng JSON (.json)');
            }

            // Validate file size
            if (file.size > this.validationRules.maxFileSize) {
                const maxSizeMB = this.validationRules.maxFileSize / (1024 * 1024);
                throw new Error(`File quá lớn. Kích thước tối đa: ${maxSizeMB}MB`);
            }

            // Show confirmation dialog
            const confirmed = confirm(
                `Bạn có chắc chắn muốn nhập dữ liệu từ file "${file.name}"?\n\n` +
                'Hành động này sẽ ghi đè toàn bộ dữ liệu hiện tại.'
            );

            if (!confirmed) {
                return;
            }

            // Read and validate file content
            const importedData = await this.readAndValidateFile(file);

            // Import data
            if (this.app.importData(importedData)) {
                this.refresh();
                Utils.UIUtils.showMessage('Đã nhập dữ liệu thành công', 'success');
            }

        } catch (error) {
            console.error('Import error:', error);
            Utils.UIUtils.showMessage(`Lỗi nhập dữ liệu: ${error.message}`, 'error');
        } finally {
            this.isProcessingFile = false;
            this.showLoading(false);
        }
    }

    /**
     * Read and validate file content
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

                    // Try to parse JSON
                    let data;
                    try {
                        data = JSON.parse(content);
                    } catch (parseError) {
                        throw new Error('File JSON không hợp lệ: ' + parseError.message);
                    }

                    // Validate data structure
                    this.validateImportData(data);

                    resolve(data);

                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => {
                reject(new Error('Không thể đọc file'));
            };

            reader.readAsText(file);
        });
    }

    /**
     * Validate import data structure
     */
    validateImportData(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Dữ liệu file không hợp lệ');
        }

        // Check required fields
        const requiredFields = ['transactions'];
        for (const field of requiredFields) {
            if (!data[field]) {
                throw new Error(`File thiếu trường bắt buộc: ${field}`);
            }

            if (!Array.isArray(data[field])) {
                throw new Error(`Trường ${field} phải là mảng`);
            }
        }

        // Validate transactions
        if (data.transactions.length > 0) {
            const sampleTransaction = data.transactions[0];
            const requiredTxFields = ['id', 'type', 'datetime', 'amount', 'account'];

            for (const field of requiredTxFields) {
                if (!(field in sampleTransaction)) {
                    throw new Error(`Giao dịch thiếu trường bắt buộc: ${field}`);
                }
            }
        }

        // Check data size
        const estimatedSize = JSON.stringify(data).length;
        if (estimatedSize > 50 * 1024 * 1024) { // 50MB limit
            throw new Error('Dữ liệu quá lớn (> 50MB)');
        }

        // Validate transactions count
        if (data.transactions.length > 100000) {
            if (!confirm(`File chứa ${data.transactions.length} giao dịch (rất nhiều). Bạn có chắc chắn muốn tiếp tục?`)) {
                throw new Error('Import cancelled by user');
            }
        }
    }

    /**
     * Clear all data with enhanced confirmation
     */
    clearAllData() {
        try {
            const transactionCount = this.app?.data?.transactions?.length || 0;

            const confirmMessage = transactionCount > 0
                ? `Bạn có chắc chắn muốn xóa toàn bộ dữ liệu?\n\n` +
                  `Bao gồm: ${transactionCount} giao dịch và tất cả cài đặt.\n\n` +
                  'Hành động này không thể hoàn tác.'
                : 'Bạn có chắc chắn muốn xóa toàn bộ dữ liệu? Hành động này không thể hoàn tác.';

            if (!confirm(confirmMessage)) {
                return;
            }

            // Double confirmation for large datasets
            if (transactionCount > 100) {
                if (!confirm('Xác nhận lần cuối: BẠN THỰC SỰ MUỐN XÓA TOÀN BỘ DỮ LIỆU?')) {
                    return;
                }
            }

            this.showLoading(true);

            if (this.app.clearAllData()) {
                this.refresh();
                Utils.UIUtils.showMessage('Đã xóa toàn bộ dữ liệu', 'success');
            } else {
                throw new Error('Clear data function failed');
            }

        } catch (error) {
            console.error('Error clearing data:', error);
            Utils.UIUtils.showMessage(`Có lỗi khi xóa dữ liệu: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Update USD exchange rate with comprehensive validation
     */
    updateUSDRate() {
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

            // Validate rate
            if (isNaN(rate) || rate <= 0) {
                Utils.UIUtils.showMessage('Tỷ giá phải là số dương', 'error');
                this.resetUSDRateInput();
                return;
            }

            if (rate < this.validationRules.usdRate.min) {
                Utils.UIUtils.showMessage(
                    `Tỷ giá tối thiểu: ${this.validationRules.usdRate.min.toLocaleString()} VNĐ`,
                    'error'
                );
                this.resetUSDRateInput();
                return;
            }

            if (rate > this.validationRules.usdRate.max) {
                Utils.UIUtils.showMessage(
                    `Tỷ giá tối đa: ${this.validationRules.usdRate.max.toLocaleString()} VNĐ`,
                    'error'
                );
                this.resetUSDRateInput();
                return;
            }

            // Update in config and settings
            Utils.CONFIG.USD_TO_VND_RATE = rate;

            if (this.app && this.app.data && this.app.data.settings) {
                this.app.data.settings.usdRate = rate;
                this.app.saveData();
            }

            // Clear validation styling
            this.elements.usdRateInput.classList.remove('input-invalid');
            this.elements.usdRateInput.classList.add('input-valid');
            this.clearUSDRateError();

            Utils.UIUtils.showMessage(
                `Đã cập nhật tỷ giá USD/VNĐ: ${rate.toLocaleString()} VNĐ`,
                'success',
                2000
            );

        } catch (error) {
            console.error('Error updating USD rate:', error);
            Utils.UIUtils.showMessage('Có lỗi khi cập nhật tỷ giá', 'error');
            this.resetUSDRateInput();
        }
    }

    /**
     * Reset USD rate input to last valid value
     */
    resetUSDRateInput() {
        if (this.elements.usdRateInput && this.app && this.app.data && this.app.data.settings) {
            this.elements.usdRateInput.value = this.app.data.settings.usdRate || 25000;
            this.elements.usdRateInput.classList.remove('input-invalid', 'input-valid');
            this.clearUSDRateError();
        }
    }

    /**
     * Update default currency
     */
    updateDefaultCurrency() {
        if (!this.elements.defaultCurrencySelect) return;

        try {
            const currency = this.elements.defaultCurrencySelect.value;

            if (!currency || !['VND', 'USD'].includes(currency)) {
                Utils.UIUtils.showMessage('Tiền tệ không hợp lệ', 'error');
                return;
            }

            if (this.app && this.app.data && this.app.data.settings) {
                this.app.data.settings.defaultCurrency = currency;
                this.app.saveData();
            }

            Utils.UIUtils.showMessage(`Đã đặt tiền tệ mặc định: ${currency}`, 'success', 2000);

        } catch (error) {
            console.error('Error updating default currency:', error);
            Utils.UIUtils.showMessage('Có lỗi khi cập nhật tiền tệ mặc định', 'error');
        }
    }

    /**
     * Update last backup time
     */
    updateLastBackupTime() {
        try {
            const now = new Date().toISOString();

            if (this.app && this.app.data && this.app.data.settings) {
                this.app.data.settings.lastBackup = now;
                this.app.saveData();
            }

            if (this.elements.lastBackupEl) {
                this.elements.lastBackupEl.textContent = Utils.DateUtils.formatDisplayDateTime(now);
            }
        } catch (error) {
            console.error('Error updating last backup time:', error);
        }
    }

    /**
     * Show/hide loading indicator
     */
    showLoading(show) {
        try {
            if (this.elements.loadingIndicator) {
                this.elements.loadingIndicator.style.display = show ? 'block' : 'none';
            }

            // Disable/enable buttons during loading
            const buttons = [
                this.elements.exportJsonBtn,
                this.elements.exportCsvBtn,
                this.elements.importDataBtn,
                this.elements.clearDataBtn
            ];

            buttons.forEach(btn => {
                if (btn) {
                    btn.disabled = show;
                    btn.style.opacity = show ? '0.6' : '1';
                }
            });

        } catch (error) {
            console.error('Error showing loading state:', error);
        }
    }

    /**
     * Calculate and display app statistics with error handling
     */
    updateAppInfo() {
        try {
            // Total transactions
            if (this.elements.totalTransactionsEl) {
                const count = this.app?.data?.transactions?.length || 0;
                this.elements.totalTransactionsEl.textContent = count.toLocaleString();
            }

            // Data size
            if (this.elements.dataSizeEl) {
                try {
                    const sizeBytes = Utils.StorageUtils.getStorageSize();
                    this.elements.dataSizeEl.textContent = Utils.StorageUtils.formatStorageSize(sizeBytes);
                } catch (error) {
                    console.error('Error calculating storage size:', error);
                    this.elements.dataSizeEl.textContent = 'Không xác định';
                }
            }

            // Last backup
            if (this.elements.lastBackupEl) {
                const lastBackup = this.app?.data?.settings?.lastBackup;
                if (lastBackup) {
                    try {
                        this.elements.lastBackupEl.textContent = Utils.DateUtils.formatDisplayDateTime(lastBackup);
                    } catch (error) {
                        console.error('Error formatting backup date:', error);
                        this.elements.lastBackupEl.textContent = 'Lỗi hiển thị';
                    }
                } else {
                    this.elements.lastBackupEl.textContent = 'Chưa backup';
                }
            }

        } catch (error) {
            console.error('Error updating app info:', error);
        }
    }

    /**
     * Update theme radio buttons
     */
    updateThemeRadios() {
        try {
            const currentTheme = Utils.ThemeUtils.getCurrentTheme();

            this.elements.themeRadios.forEach(radio => {
                if (radio && radio.value === currentTheme) {
                    radio.checked = true;
                }
            });
        } catch (error) {
            console.error('Error updating theme radios:', error);
        }
    }

    /**
     * Update currency settings
     */
    updateCurrencySettings() {
        try {
            if (this.elements.usdRateInput) {
                const rate = this.app?.data?.settings?.usdRate || 25000;
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
     * Cleanup method to prevent memory leaks
     */
    destroy() { // This is the correct destroy method for SettingsModule
        // Cleanup event listeners
        this.eventListeners.forEach(({ element, event, handler }) => {
            if (element && typeof element.removeEventListener === 'function') {
                element.removeEventListener(event, handler);
            }
        });
        this.eventListeners = [];

        // Clear processing state
        this.isProcessingFile = false;

        // Clear DOM references
        this.elements = {};
    }

    /**
     * Refresh the module with error handling
     */
    refresh() {
        try {
            this.updateThemeRadios();
            this.updateCurrencySettings();
            this.updateAppInfo();
        } catch (error) {
            console.error('Error refreshing settings module:', error);
            Utils.UIUtils.showMessage('Có lỗi khi cập nhật module cài đặt', 'error');
        }
    }

    // Placeholder for advanced features (if implemented later)
    showAppInfo() {
        Utils.UIUtils.showMessage('Chức năng thông tin chi tiết ứng dụng sẽ được triển khai sau.', 'info');
    }

    exportStatistics() {
        Utils.UIUtils.showMessage('Chức năng xuất thống kê sẽ được triển khai sau.', 'info');
    }

    resetToDefaults() {
        if (confirm('Bạn có chắc chắn muốn khôi phục cài đặt mặc định? Hành động này sẽ không xóa dữ liệu giao dịch.')) {
            try {
                this.app.data.settings = { ...this.app.defaultData.settings };
                Utils.CONFIG.USD_TO_VND_RATE = this.app.defaultData.settings.usdRate;
                this.app.saveData();
                this.refresh();
                Utils.UIUtils.showMessage('Cài đặt đã được khôi phục mặc định.', 'success');
            } catch (error) {
                console.error('Error resetting settings to defaults:', error);
                Utils.UIUtils.showMessage('Có lỗi khi khôi phục cài đặt mặc định.', 'error');
            }
        }
    }
}

// Add context menu for advanced features
document.addEventListener('contextmenu', (e) => {
    if (e.target.closest('#tab-settings')) {
        e.preventDefault();

        const contextMenu = document.createElement('div');
        contextMenu.className = 'fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg py-2 z-50';
        contextMenu.style.left = e.pageX + 'px';
        contextMenu.style.top = e.pageY + 'px';

        contextMenu.innerHTML = `
            <button class="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm" id="show-app-info">
                📊 Thông tin chi tiết
            </button>
            <button class="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm" id="export-statistics">
                📈 Xuất thống kê
            </button>
            <button class="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm" id="reset-defaults">
                🔄 Khôi phục mặc định
            </button>
        `;

        document.body.appendChild(contextMenu);

        // Event listeners
        contextMenu.querySelector('#show-app-info').addEventListener('click', () => {
            window.SettingsModule.showAppInfo();
            contextMenu.remove(); // Use .remove() for modern browsers
        });

        contextMenu.querySelector('#export-statistics').addEventListener('click', () => {
            window.SettingsModule.exportStatistics();
            contextMenu.remove();
        });

        contextMenu.querySelector('#reset-defaults').addEventListener('click', () => {
            window.SettingsModule.resetToDefaults();
            contextMenu.remove();
        });

        // Remove on click outside
        const removeMenu = (event) => {
            if (!contextMenu.contains(event.target)) {
                contextMenu.remove();
                document.removeEventListener('click', removeMenu);
            }
        };

        setTimeout(() => {
            document.addEventListener('click', removeMenu);
        }, 0);
    }
});

// Create global instance
window.SettingsModule = new SettingsModule();