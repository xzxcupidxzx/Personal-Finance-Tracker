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

        // Safely update from Utils.CONFIG after Utils is defined
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
            appInfoVersionEl: document.getElementById('app-info-version'),

            // Loading indicator
            loadingIndicator: document.getElementById('settings-loading'),

            // Update elements
            checkUpdatesBtn: document.getElementById('check-updates'),
            forceRefreshBtn: document.getElementById('force-refresh-app'),
            clearCacheBtn: document.getElementById('clear-app-cache'),
            currentVersionEl: document.getElementById('current-app-version'), // Hiển thị ở phần Cập nhật
            updateStatusEl: document.getElementById('update-status'),
            lastUpdateCheckEl: document.getElementById('last-update-check')
        };

        // Log missing critical elements
        const criticalElements = ['themeRadios', 'usdRateInput', 'appInfoVersionEl', 'currentVersionEl'];
        criticalElements.forEach(key => {
            const el = this.elements[key];
            if (!el || (NodeList.prototype.isPrototypeOf(el) && el.length === 0)) {
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
                this.eventListeners.push({ element: radio, event: 'change', handler: changeHandler });
            });

            this.initializeDataManagementEvents();
            this.initializeCurrencyEvents();
            this.initializeUpdateEvents();

        } catch (error) {
            console.error('Error initializing event listeners:', error);
        }
    }

    /**
     * Initialize update event listeners
     */
    initializeUpdateEvents() {
        if (this.elements.checkUpdatesBtn) {
            const checkHandler = () => this.checkForUpdates();
            this.elements.checkUpdatesBtn.addEventListener('click', checkHandler);
            this.eventListeners.push({ element: this.elements.checkUpdatesBtn, event: 'click', handler: checkHandler });
        }
        if (this.elements.forceRefreshBtn) {
            const refreshHandler = () => this.forceRefreshApp();
            this.elements.forceRefreshBtn.addEventListener('click', refreshHandler);
            this.eventListeners.push({ element: this.elements.forceRefreshBtn, event: 'click', handler: refreshHandler });
        }
        if (this.elements.clearCacheBtn) {
            const clearHandler = () => this.clearAppCache();
            this.elements.clearCacheBtn.addEventListener('click', clearHandler);
            this.eventListeners.push({ element: this.elements.clearCacheBtn, event: 'click', handler: clearHandler });
        }
    }

    /**
     * Initialize data management event listeners
     */
    initializeDataManagementEvents() {
        if (this.elements.exportJsonBtn) {
            const exportJsonHandler = () => this.exportData();
            this.elements.exportJsonBtn.addEventListener('click', exportJsonHandler);
            this.eventListeners.push({ element: this.elements.exportJsonBtn, event: 'click', handler: exportJsonHandler });
        }
        if (this.elements.exportCsvBtn) {
            const exportCsvHandler = () => this.exportCSV();
            this.elements.exportCsvBtn.addEventListener('click', exportCsvHandler);
            this.eventListeners.push({ element: this.elements.exportCsvBtn, event: 'click', handler: exportCsvHandler });
        }
        if (this.elements.importDataBtn) {
            const importHandler = () => {
                if (!this.isProcessingFile) {
                    this.elements.importFileInput?.click();
                }
            };
            this.elements.importDataBtn.addEventListener('click', importHandler);
            this.eventListeners.push({ element: this.elements.importDataBtn, event: 'click', handler: importHandler });
        }
        if (this.elements.importFileInput) {
            const fileChangeHandler = (e) => this.handleImportFile(e);
            this.elements.importFileInput.addEventListener('change', fileChangeHandler);
            this.eventListeners.push({ element: this.elements.importFileInput, event: 'change', handler: fileChangeHandler });
        }
        if (this.elements.clearDataBtn) {
            const clearHandler = () => this.clearAllData();
            this.elements.clearDataBtn.addEventListener('click', clearHandler);
            this.eventListeners.push({ element: this.elements.clearDataBtn, event: 'click', handler: clearHandler });
        }
    }

    /**
     * Initialize currency event listeners
     */
    initializeCurrencyEvents() {
        if (this.elements.usdRateInput) {
            const inputHandler = () => this.validateUSDRateInput();
            this.elements.usdRateInput.addEventListener('input', inputHandler);
            this.eventListeners.push({ element: this.elements.usdRateInput, event: 'input', handler: inputHandler });

            const changeHandler = () => this.updateUSDRate();
            this.elements.usdRateInput.addEventListener('change', changeHandler);
            this.eventListeners.push({ element: this.elements.usdRateInput, event: 'change', handler: changeHandler });

            const keydownHandler = (e) => this.handleUSDRateKeydown(e);
            this.elements.usdRateInput.addEventListener('keydown', keydownHandler);
            this.elements.usdRateInput.setAttribute('inputmode', 'numeric');
            this.eventListeners.push({ element: this.elements.usdRateInput, event: 'keydown', handler: keydownHandler });
        }
        if (this.elements.defaultCurrencySelect) {
            const currencyChangeHandler = () => this.updateDefaultCurrency();
            this.elements.defaultCurrencySelect.addEventListener('change', currencyChangeHandler);
            this.eventListeners.push({ element: this.elements.defaultCurrencySelect, event: 'change', handler: currencyChangeHandler });
        }
    }

    handleUSDRateKeydown(e) {
        if ([8, 9, 27, 13, 46].indexOf(e.keyCode) !== -1 ||
            (e.keyCode === 65 && e.ctrlKey === true) ||
            (e.keyCode === 67 && e.ctrlKey === true) ||
            (e.keyCode === 86 && e.ctrlKey === true) ||
            (e.keyCode === 88 && e.ctrlKey === true)) {
            return;
        }
        if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
            e.preventDefault();
        }
    }

    validateUSDRateInput() {
        if (!this.elements.usdRateInput) return;
        try {
            const value = this.elements.usdRateInput.value.trim();
            const rate = parseFloat(value);
            this.elements.usdRateInput.classList.remove('input-valid', 'input-invalid');
            if (value === '') return;
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
            this.elements.usdRateInput.classList.add('input-valid');
            this.clearUSDRateError();
        } catch (error) {
            console.error('Error validating USD rate input:', error);
        }
    }

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

    clearUSDRateError() {
        const errorEl = document.getElementById('usd-rate-error');
        if (errorEl) {
            errorEl.style.display = 'none';
        }
    }

    changeTheme(theme) {
        if (!theme || !['light', 'dark', 'auto'].includes(theme)) {
            console.error('Invalid theme value:', theme);
            return;
        }
        try {
            Utils.ThemeUtils.applyTheme(theme);
            if (this.app?.data?.settings) {
                this.app.data.settings.theme = theme;
                this.app.saveData();
            }
            Utils.UIUtils.showMessage(`Đã chuyển sang chế độ ${this.getThemeDisplayName(theme)}`, 'success', 2000);
            setTimeout(() => {
                if (window.StatisticsModule?.updateChartColors) {
                    window.StatisticsModule.updateChartColors();
                }
            }, 100);
        } catch (error) {
            console.error('Error changing theme:', error);
            Utils.UIUtils.showMessage('Có lỗi khi thay đổi giao diện', 'error');
        }
    }

    getThemeDisplayName(theme) {
        const names = { 'light': 'sáng', 'dark': 'tối', 'auto': 'tự động' };
        return names[theme] || theme;
    }

    exportData() {
        try {
            if (!this.app) throw new Error('App instance not available');
            this.showLoading(true);
            const exportData = this.app.exportData();
            if (!exportData) throw new Error('No data to export');
            if (!exportData.transactions || !Array.isArray(exportData.transactions)) {
                throw new Error('Invalid transaction data');
            }
            if (Utils.ExportUtils.exportJSON(exportData, 'financial_data')) {
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

    exportCSV() {
        try {
            if (!this.app?.data?.transactions) {
                throw new Error('Invalid app data or no transactions');
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

    async handleImportFile(event) {
        const file = event.target.files[0];
        event.target.value = '';
        if (!file) return;
        if (this.isProcessingFile) {
            Utils.UIUtils.showMessage('Đang xử lý file khác, vui lòng đợi', 'warning');
            return;
        }
        try {
            this.isProcessingFile = true;
            this.showLoading(true);
            if (!this.validationRules.allowedFileTypes.includes(file.type) && !file.name.endsWith('.json')) {
                throw new Error('File phải có định dạng JSON (.json)');
            }
            if (file.size > this.validationRules.maxFileSize) {
                const maxSizeMB = this.validationRules.maxFileSize / (1024 * 1024);
                throw new Error(`File quá lớn. Kích thước tối đa: ${maxSizeMB}MB`);
            }
            const confirmed = confirm(`Bạn có chắc chắn muốn nhập dữ liệu từ file "${file.name}"?\n\nHành động này sẽ ghi đè toàn bộ dữ liệu hiện tại.`);
            if (!confirmed) {
                 this.isProcessingFile = false; // Reset flag if cancelled
                 this.showLoading(false);
                 return;
            }
            const importedData = await this.readAndValidateFile(file);
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

    async readAndValidateFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target.result;
                    if (!content || typeof content !== 'string') throw new Error('File content is empty or invalid');
                    let data;
                    try {
                        data = JSON.parse(content);
                    } catch (parseError) {
                        throw new Error('File JSON không hợp lệ: ' + parseError.message);
                    }
                    this.validateImportData(data);
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Không thể đọc file'));
            reader.readAsText(file);
        });
    }

    validateImportData(data) {
        if (!data || typeof data !== 'object') throw new Error('Dữ liệu file không hợp lệ');
        const requiredFields = ['transactions'];
        for (const field of requiredFields) {
            if (!(field in data)) throw new Error(`File thiếu trường bắt buộc: ${field}`);
            if (!Array.isArray(data[field])) throw new Error(`Trường ${field} phải là mảng`);
        }
        if (data.transactions.length > 0) {
            const sampleTransaction = data.transactions[0];
            if (!sampleTransaction || typeof sampleTransaction !== 'object') throw new Error('Dữ liệu giao dịch mẫu không hợp lệ');
            const requiredTxFields = ['id', 'type', 'datetime', 'amount', 'account'];
            for (const field of requiredTxFields) {
                if (!(field in sampleTransaction)) throw new Error(`Giao dịch thiếu trường bắt buộc: ${field}`);
            }
        }
        const estimatedSize = JSON.stringify(data).length;
        if (estimatedSize > 50 * 1024 * 1024) throw new Error('Dữ liệu quá lớn (> 50MB)'); // 50MB limit
        if (data.transactions.length > 100000) { // Warn for very large transaction counts
            if (!confirm(`File chứa ${data.transactions.length.toLocaleString()} giao dịch (rất nhiều). Bạn có chắc chắn muốn tiếp tục? Điều này có thể làm chậm ứng dụng.`)) {
                throw new Error('Import cancelled by user due to large data size.');
            }
        }
    }

    clearAllData() {
        try {
            const transactionCount = this.app?.data?.transactions?.length || 0;
            const confirmMessage = transactionCount > 0
                ? `Bạn có chắc chắn muốn xóa toàn bộ dữ liệu?\n\nBao gồm: ${transactionCount.toLocaleString()} giao dịch và tất cả cài đặt.\n\nHành động này không thể hoàn tác.`
                : 'Bạn có chắc chắn muốn xóa toàn bộ dữ liệu? Hành động này không thể hoàn tác.';
            if (!confirm(confirmMessage)) return;
            if (transactionCount > 100) { // Extra confirmation for large datasets
                if (!confirm('Xác nhận lần cuối: BẠN THỰC SỰ MUỐN XÓA TOÀN BỘ DỮ LIỆU?')) return;
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
            if (isNaN(rate) || rate <= 0) {
                Utils.UIUtils.showMessage('Tỷ giá phải là số dương', 'error');
                this.resetUSDRateInput();
                return;
            }
            if (rate < this.validationRules.usdRate.min) {
                Utils.UIUtils.showMessage(`Tỷ giá tối thiểu: ${this.validationRules.usdRate.min.toLocaleString()} VNĐ`, 'error');
                this.resetUSDRateInput();
                return;
            }
            if (rate > this.validationRules.usdRate.max) {
                Utils.UIUtils.showMessage(`Tỷ giá tối đa: ${this.validationRules.usdRate.max.toLocaleString()} VNĐ`, 'error');
                this.resetUSDRateInput();
                return;
            }
            Utils.CONFIG.USD_TO_VND_RATE = rate;
            if (this.app?.data?.settings) {
                this.app.data.settings.usdRate = rate;
                this.app.saveData();
            }
            this.elements.usdRateInput.classList.remove('input-invalid');
            this.elements.usdRateInput.classList.add('input-valid');
            this.clearUSDRateError();
            Utils.UIUtils.showMessage(`Đã cập nhật tỷ giá USD/VNĐ: ${rate.toLocaleString()} VNĐ`, 'success', 2000);
        } catch (error) {
            console.error('Error updating USD rate:', error);
            Utils.UIUtils.showMessage('Có lỗi khi cập nhật tỷ giá', 'error');
            this.resetUSDRateInput();
        }
    }

    resetUSDRateInput() {
        if (this.elements.usdRateInput && this.app?.data?.settings) {
            this.elements.usdRateInput.value = this.app.data.settings.usdRate || Utils.CONFIG.USD_TO_VND_RATE || 25000;
            this.elements.usdRateInput.classList.remove('input-invalid', 'input-valid');
            this.clearUSDRateError();
        }
    }

    updateDefaultCurrency() {
        if (!this.elements.defaultCurrencySelect) return;
        try {
            const currency = this.elements.defaultCurrencySelect.value;
            if (!currency || !['VND', 'USD'].includes(currency)) {
                Utils.UIUtils.showMessage('Tiền tệ không hợp lệ', 'error');
                return;
            }
            if (this.app?.data?.settings) {
                this.app.data.settings.defaultCurrency = currency;
                this.app.saveData();
            }
            Utils.UIUtils.showMessage(`Đã đặt tiền tệ mặc định: ${currency}`, 'success', 2000);
        } catch (error) {
            console.error('Error updating default currency:', error);
            Utils.UIUtils.showMessage('Có lỗi khi cập nhật tiền tệ mặc định', 'error');
        }
    }

    updateLastBackupTime() {
        try {
            const now = new Date().toISOString();
            if (this.app?.data?.settings) {
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

    showLoading(show) {
        try {
            if (this.elements.loadingIndicator) {
                this.elements.loadingIndicator.style.display = show ? 'flex' : 'none'; // Changed to flex for centering
            }
            const buttons = [
                this.elements.exportJsonBtn, this.elements.exportCsvBtn,
                this.elements.importDataBtn, this.elements.clearDataBtn,
                this.elements.checkUpdatesBtn, this.elements.forceRefreshBtn, this.elements.clearCacheBtn
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

            // App Version (trong phần "Thông tin ứng dụng")
            if (this.elements.appInfoVersionEl) {
                // Lấy trực tiếp từ APP_VERSION toàn cục là nguồn chân lý
                const version = (typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'N/A');
                this.elements.appInfoVersionEl.textContent = version;
            }

        } catch (error) {
            console.error('Error updating app info:', error);
        }
    }

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

    updateVersionInfo() {
        try {
            const appVersion = typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'N/A';
            if (this.elements.currentVersionEl) {
                this.elements.currentVersionEl.textContent = appVersion; // Phiên bản client (app) hiện tại
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
                    this.elements.lastUpdateCheckEl.textContent = updateManager.lastCheck.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
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

    async checkForUpdates() {
        try {
            this.updateUpdateStatus('Đang kiểm tra...');
            this.setButtonLoading(this.elements.checkUpdatesBtn, true);

            if (window.FinancialApp && window.FinancialApp.updateManager) {
                const updateManager = window.FinancialApp.updateManager;
                await updateManager.checkForUpdates(); // This updates updateManager.isUpdateAvailable and .swVersion

                const appVersion = typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'N/A';
                const swVersionDisplay = updateManager.swVersion || 'N/A';

                if (updateManager.isUpdateAvailable) {
                    // Thông báo này xuất hiện khi có phiên bản SW mới hơn (hoặc worker đang chờ)
                    this.updateUpdateStatus(`Có SW mới! (App v${appVersion}, SW mới v${swVersionDisplay})`);
                    // Thông báo của UpdateManager (showUpdateNotification) sẽ rõ ràng hơn về việc cập nhật SW
                } else {
                    this.updateUpdateStatus(`Đã cập nhật (App v${appVersion}, SW v${swVersionDisplay})`);
                    Utils.UIUtils.showMessage('✅ Bạn đang sử dụng phiên bản mới nhất hoặc Service Worker đã được cập nhật.', 'success');
                }
            } else {
                this.updateUpdateStatus('Service Worker không có');
                Utils.UIUtils.showMessage('Service Worker chưa sẵn sàng để kiểm tra cập nhật. Vui lòng tải lại trang.', 'warning');
            }
            this.updateLastCheckTime(); // Cập nhật thời gian kiểm tra cuối
        } catch (error) {
            console.error('Error checking for updates:', error);
            this.updateUpdateStatus('Lỗi kiểm tra');
            Utils.UIUtils.showMessage('Có lỗi khi kiểm tra cập nhật', 'error');
        } finally {
            this.setButtonLoading(this.elements.checkUpdatesBtn, false);
        }
    }


    async forceRefreshApp() {
        const confirmed = confirm('🔄 Làm mới ứng dụng sẽ:\n\n• Tải lại toàn bộ từ server\n• Xóa cache cũ\n• Đảm bảo có phiên bản mới nhất\n\nBạn có muốn tiếp tục không?');
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
        } finally {
            // Không reset loading ở đây vì forceRefresh sẽ tải lại trang
        }
    }

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

    hardReload() {
        // Thêm tham số query ngẫu nhiên để đảm bảo tải lại hoàn toàn
        const url = new URL(window.location.href);
        url.searchParams.set('_cacheBust', Date.now());
        window.location.href = url.toString();
    }


    async clearAppCache() {
        const confirmed = confirm('⚠️ XÓA CACHE ỨNG DỤNG\n\nĐiều này sẽ:\n• Xóa toàn bộ cache ứng dụng\n• Buộc tải lại từ server\n• Có thể gây mất kết nối tạm thời\n\nCHỈ LÀM ĐIỀU NÀY KHI CÓ LỖI!\n\nBạn có chắc chắn muốn tiếp tục?');
        if (!confirmed) return;
        try {
            this.setButtonLoading(this.elements.clearCacheBtn, true);
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
                console.log('🗑️ All caches cleared');
            }
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map(reg => reg.unregister()));
                console.log('🗑️ Service workers unregistered');
            }
            Utils.UIUtils.showMessage('✅ Cache đã được xóa. Đang tải lại...', 'success');
            setTimeout(() => this.hardReload(), 1500);
        } catch (error) {
            console.error('Error clearing cache:', error);
            Utils.UIUtils.showMessage('Có lỗi khi xóa cache. Đang tải lại...', 'error');
            setTimeout(() => this.hardReload(), 1000);
        } finally {
             // Không reset loading ở đây vì hardReload sẽ tải lại trang
        }
    }

    updateUpdateStatus(status) {
        if (this.elements.updateStatusEl) {
            this.elements.updateStatusEl.textContent = status;
            this.elements.updateStatusEl.className = 'info-value'; // Reset class
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

    updateLastCheckTime() {
        if (this.elements.lastUpdateCheckEl) {
            const now = new Date();
            this.elements.lastUpdateCheckEl.textContent = now.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
        }
    }

    setButtonLoading(button, isLoading) {
        if (!button) return;
        const originalContent = button.dataset.originalContent || button.innerHTML;
        if (isLoading) {
            button.dataset.originalContent = originalContent;
            button.disabled = true;
            button.style.opacity = '0.6';
            button.style.cursor = 'wait';
            
            let spinnerIcon = button.querySelector('.btn-icon.loader');
            if (!spinnerIcon) {
                const firstIcon = button.querySelector('.btn-icon');
                if(firstIcon) firstIcon.style.display = 'none'; // Hide original icon

                spinnerIcon = document.createElement('span');
                spinnerIcon.className = 'btn-icon loader';
                spinnerIcon.innerHTML = '⏳'; // Spinner icon
                spinnerIcon.style.animation = 'spin 1s linear infinite';
                button.insertBefore(spinnerIcon, button.firstChild); // Add spinner at the beginning
            }
            spinnerIcon.style.display = 'inline-block';
        } else {
            button.disabled = false;
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
            const spinnerIcon = button.querySelector('.btn-icon.loader');
            if (spinnerIcon) spinnerIcon.remove(); // Remove spinner

            const firstIcon = button.querySelector('.btn-icon');
            if(firstIcon) firstIcon.style.display = 'inline-flex'; // Show original icon
            
            delete button.dataset.originalContent;
        }
    }

    destroy() {
        this.eventListeners.forEach(({ element, event, handler }) => {
            if (element && typeof element.removeEventListener === 'function') {
                element.removeEventListener(event, handler);
            }
        });
        this.eventListeners = [];
        this.isProcessingFile = false;
        this.elements = {};
    }

    refresh() {
        try {
            this.updateThemeRadios();
            this.updateCurrencySettings();
            this.updateAppInfo();    // Cập nhật phiên bản trong "Thông tin ứng dụng"
            this.updateVersionInfo(); // Cập nhật phiên bản và trạng thái ở phần "Cập nhật"
        } catch (error) {
            console.error('Error refreshing settings module:', error);
            Utils.UIUtils.showMessage('Có lỗi khi cập nhật module cài đặt', 'error');
        }
    }

    showAppInfo() {
        Utils.UIUtils.showMessage('Chức năng thông tin chi tiết ứng dụng sẽ được triển khai sau.', 'info');
    }

    exportStatistics() {
        Utils.UIUtils.showMessage('Chức năng xuất thống kê sẽ được triển khai sau.', 'info');
    }

    resetToDefaults() {
        if (confirm('Bạn có chắc chắn muốn khôi phục cài đặt mặc định? Hành động này sẽ không xóa dữ liệu giao dịch.')) {
            try {
                if(this.app && this.app.data && this.app.defaultData) {
                    this.app.data.settings = { ...this.app.defaultData.settings };
                    if (this.app.defaultData.settings.usdRate) {
                         Utils.CONFIG.USD_TO_VND_RATE = this.app.defaultData.settings.usdRate;
                    }
                    this.app.saveData();
                    this.refresh();
                    Utils.UIUtils.showMessage('Cài đặt đã được khôi phục mặc định.', 'success');
                } else {
                    throw new Error("App data or default data not available.");
                }
            } catch (error) {
                console.error('Error resetting settings to defaults:', error);
                Utils.UIUtils.showMessage('Có lỗi khi khôi phục cài đặt mặc định.', 'error');
            }
        }
    }
}

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
            if (action) {
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
        // Add event listeners in capture phase to ensure they run before other listeners
        setTimeout(() => { // Timeout to allow current event cycle to complete
            document.addEventListener('click', removeMenuHandler, true);
            document.addEventListener('contextmenu', removeMenuHandler, true);
        },0);
    }
});

window.SettingsModule = new SettingsModule();