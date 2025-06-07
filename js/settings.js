/**
 * SETTINGS MODULE - PHIÊN BẢN ĐẦY ĐỦ VÀ HOÀN CHỈNH
 * Quản lý cài đặt, giao diện, sao lưu và quản lý dữ liệu.
 */
class SettingsModule {
    constructor() {
        this.app = null;
        this.elements = {};
        this.isInitialized = false;
        this.fileProcessing = { isProcessing: false };
    }

    async init(app) {
        if (this.isInitialized) return;
        this.app = app;
        console.log('⚙️ Initializing Settings Module...');

        try {
            this.initializeElements();
            this.initializeEventListeners();
            await this.refresh();
            this.isInitialized = true;
            console.log('✅ Settings Module initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Settings Module:', error);
            Utils.UIUtils.showMessage('Lỗi khởi tạo module Cài đặt.', 'error');
        }
    }

    initializeElements() {
        this.elements = {
            // Giao diện
            themeRadios: document.querySelectorAll('input[name="theme"]'),
            checkUpdatesBtn: document.getElementById('check-updates'),
            forceRefreshBtn: document.getElementById('force-refresh-app'),
            currentVersionEl: document.getElementById('current-app-version'),
            updateStatusEl: document.getElementById('update-status'),
            lastUpdateCheckEl: document.getElementById('last-update-check'),
            
            // Quản lý dữ liệu
            exportJsonBtn: document.getElementById('export-json'),
            exportCsvBtn: document.getElementById('export-csv'),
            importDataBtn: document.getElementById('import-data'),
            importFileInput: document.getElementById('import-file'),
            importCsvBtn: document.getElementById('import-csv-btn'),
            importCsvFileInput: document.getElementById('import-csv-file'),
            
            // Tiền tệ
            usdRateInput: document.getElementById('usd-rate'),
            defaultCurrencySelect: document.getElementById('default-currency'),
            
            // Thông tin
            totalTransactionsEl: document.getElementById('total-transactions'),
            dataSizeEl: document.getElementById('data-size'),
            lastBackupEl: document.getElementById('last-backup'),
            appInfoVersionEl: document.getElementById('app-info-version'),

            // Vùng nguy hiểm
            clearDataBtn: document.getElementById('clear-data'),
        };
    }

    initializeEventListeners() {
        // Giao diện
        this.elements.themeRadios.forEach(radio => radio.addEventListener('change', () => this.changeTheme(radio.value)));
        this.elements.checkUpdatesBtn?.addEventListener('click', () => this.checkForUpdates());
        this.elements.forceRefreshBtn?.addEventListener('click', () => this.forceRefreshApp());

        // Dữ liệu
        this.elements.exportJsonBtn?.addEventListener('click', () => this.exportData('json'));
        this.elements.exportCsvBtn?.addEventListener('click', () => this.exportData('csv'));
        this.elements.importDataBtn?.addEventListener('click', () => this.triggerFileImport('json'));
        this.elements.importCsvBtn?.addEventListener('click', () => this.triggerFileImport('csv'));
        this.elements.importFileInput?.addEventListener('change', (e) => this.handleImportFile(e, 'json'));
        this.elements.importCsvFileInput?.addEventListener('change', (e) => this.handleImportFile(e, 'csv'));
        this.elements.clearDataBtn?.addEventListener('click', () => this.clearAllData());
        
        // Tiền tệ
        this.elements.usdRateInput?.addEventListener('change', () => this.updateUSDRate());
        this.elements.defaultCurrencySelect?.addEventListener('change', () => this.updateDefaultCurrency());
    }

    async changeTheme(theme) {
        Utils.ThemeUtils.applyTheme(theme);
        if (this.app?.data?.settings) {
            this.app.data.settings.theme = theme;
            await this.app.saveData();
        }
        // Refresh charts if the module is available
        if (window.StatisticsModule) {
            window.StatisticsModule.refreshCharts();
        }
    }

    async exportData(type) {
        if (this.fileProcessing.isProcessing) {
            Utils.UIUtils.showMessage('Đang xử lý tác vụ khác...', 'info');
            return;
        }
        this.startOperation();
        try {
            const success = (type === 'json')
                ? Utils.ExportUtils.exportJSON(this.app.data, 'financial_data_backup')
                : Utils.ExportUtils.exportCSV(this.app.data.transactions);
            
            if (success) {
                await this.updateLastBackupTime();
                Utils.UIUtils.showMessage(`Đã xuất dữ liệu ${type.toUpperCase()} thành công.`, 'success');
            } else {
                throw new Error('Hàm xuất file thất bại.');
            }
        } catch (error) {
            console.error(`Lỗi xuất ${type.toUpperCase()}:`, error);
            Utils.UIUtils.showMessage(`Lỗi khi xuất file ${type.toUpperCase()}`, 'error');
        } finally {
            this.endOperation();
        }
    }

    triggerFileImport(type) {
        if (this.fileProcessing.isProcessing) return;
        const fileInput = type === 'csv' ? this.elements.importCsvFileInput : this.elements.importFileInput;
        fileInput?.click();
    }

    async handleImportFile(event, type) {
        const file = event.target.files[0];
        event.target.value = ''; // Reset để có thể chọn lại cùng file
        if (!file) return;

        this.startOperation();
        try {
            const fileContent = await file.text();

            if (type === 'json') {
                if (!confirm(`Bạn có chắc muốn nhập dữ liệu từ file JSON? Hành động này sẽ GHI ĐÈ toàn bộ dữ liệu hiện tại.`)) return;
                const importedData = JSON.parse(fileContent);
                if (this.app.importData(importedData)) {
                    await this.refresh();
                    Utils.UIUtils.showMessage('Đã nhập dữ liệu từ JSON thành công!', 'success');
                }
            } else if (type === 'csv') {
                const parsedData = Utils.CSVUtils.parse(fileContent);
                if (parsedData.length === 0) throw new Error("Không tìm thấy dữ liệu hợp lệ trong file CSV.");
                
                if (!confirm(`Tìm thấy ${parsedData.length} giao dịch. Bạn có muốn THÊM các giao dịch này vào dữ liệu hiện tại không?`)) return;

                const result = await this.app.importFromCSV(parsedData);
                await this.refresh();
                Utils.UIUtils.showMessage(`Hoàn tất! Đã thêm ${result.success} giao dịch. Lỗi ${result.failed} dòng.`, 'info', 5000);
            }
        } catch (error) {
            console.error(`Lỗi nhập file ${type.toUpperCase()}:`, error);
            Utils.UIUtils.showMessage(`Lỗi nhập file: ${error.message}`, 'error');
        } finally {
            this.endOperation();
        }
    }
    
    async clearAllData() {
        if (this.fileProcessing.isProcessing) return;
        
        const transactionCount = this.app?.data?.transactions?.length || 0;
        const confirmMessage = `Bạn có chắc chắn muốn xóa toàn bộ dữ liệu, bao gồm ${transactionCount} giao dịch? Hành động này KHÔNG THỂ hoàn tác.`;
        
        if (!confirm(confirmMessage)) return;
        
        this.startOperation();
        try {
            if (await this.app.clearAllData()) {
                await this.refresh();
                Utils.UIUtils.showMessage('Đã xóa toàn bộ dữ liệu.', 'success');
            } else {
                throw new Error('Thao tác xóa dữ liệu thất bại.');
            }
        } catch (error) {
            console.error('Lỗi khi xóa dữ liệu:', error);
            Utils.UIUtils.showMessage('Lỗi khi xóa dữ liệu.', 'error');
        } finally {
            this.endOperation();
        }
    }

    async updateUSDRate() {
        const rate = parseFloat(this.elements.usdRateInput.value);
        if (isNaN(rate) || rate < CONFIG.USD_RATE_MIN || rate > CONFIG.USD_RATE_MAX) {
            Utils.UIUtils.showMessage('Tỷ giá không hợp lệ.', 'error');
            this.elements.usdRateInput.value = this.app?.data?.settings?.usdRate || CONFIG.USD_TO_VND_RATE;
            return;
        }
        CONFIG.USD_TO_VND_RATE = rate;
        if (this.app?.data?.settings) {
            this.app.data.settings.usdRate = rate;
            await this.app.saveData();
        }
        Utils.UIUtils.showMessage(`Đã cập nhật tỷ giá USD/VNĐ.`, 'success');
    }

    async updateDefaultCurrency() {
        const currency = this.elements.defaultCurrencySelect.value;
        if (this.app?.data?.settings) {
            this.app.data.settings.defaultCurrency = currency;
            await this.app.saveData();
        }
        Utils.UIUtils.showMessage(`Đã đặt tiền tệ mặc định: ${currency}.`, 'success');
    }

    // ===== LOGIC CẬP NHẬT & LÀM MỚI =====
    async checkForUpdates() {
        if (Utils.UpdateManager) {
            await Utils.UpdateManager.checkForUpdates();
            this.updateVersionInfo();
        } else {
            Utils.UIUtils.showMessage('Trình quản lý cập nhật chưa sẵn sàng.', 'error');
        }
    }

    async forceRefreshApp() {
        if (confirm("Bạn có chắc muốn làm mới hoàn toàn ứng dụng? Thao tác này sẽ tải lại mọi thứ từ máy chủ.")) {
            if (Utils.UpdateManager) {
                await Utils.UpdateManager.forceRefresh();
            } else {
                Utils.UIUtils.showMessage('Không thể làm mới, trình quản lý cập nhật bị lỗi.', 'error');
            }
        }
    }

    // ===== CÁC HÀM TIỆN ÍCH KHÁC =====
    async updateLastBackupTime() {
        const now = new Date().toISOString();
        if (this.app?.data?.settings) {
            this.app.data.settings.lastBackup = now;
            await this.app.saveData();
        }
        this.updateAppInfo();
    }

    updateAppInfo() {
        if (!this.app) return;
        const { transactions, settings } = this.app.data;
        if (this.elements.totalTransactionsEl) this.elements.totalTransactionsEl.textContent = transactions?.length || 0;
        if (this.elements.dataSizeEl) this.elements.dataSizeEl.textContent = Utils.StorageUtils.formatStorageSize(Utils.StorageUtils.getStorageSize());
        if (this.elements.lastBackupEl) this.elements.lastBackupEl.textContent = settings?.lastBackup ? Utils.DateUtils.formatDisplayDateTime(settings.lastBackup) : 'Chưa backup';
        if (this.elements.appInfoVersionEl) this.elements.appInfoVersionEl.textContent = typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'N/A';
        this.updateVersionInfo();
    }
    
    updateVersionInfo() {
        if (!this.isInitialized || !Utils.UpdateManager) return;
        const info = Utils.UpdateManager.getVersionInfo();
        if (this.elements.currentVersionEl) this.elements.currentVersionEl.textContent = info.currentVersion;
        if (this.elements.updateStatusEl) {
             this.elements.updateStatusEl.textContent = info.isUpdateAvailable ? `Có bản cập nhật!` : 'Đã cập nhật';
             this.elements.updateStatusEl.style.color = info.isUpdateAvailable ? 'var(--warning-color)' : 'var(--accent-color)';
        }
    }


    updateThemeRadios() {
        const currentTheme = Utils.ThemeUtils.getCurrentTheme();
        this.elements.themeRadios.forEach(radio => {
            if (radio.value === currentTheme) radio.checked = true;
        });
    }

    updateCurrencySettings() {
        if (this.elements.usdRateInput) this.elements.usdRateInput.value = this.app?.data?.settings?.usdRate || CONFIG.USD_TO_VND_RATE;
        if (this.elements.defaultCurrencySelect) this.elements.defaultCurrencySelect.value = this.app?.data?.settings?.defaultCurrency || 'VND';
    }

    startOperation() {
        this.fileProcessing.isProcessing = true;
        document.body.classList.add('processing');
    }

    endOperation() {
        this.fileProcessing.isProcessing = false;
        document.body.classList.remove('processing');
    }

    async refresh() {
        if (!this.isInitialized) return;
        this.updateThemeRadios();
        this.updateCurrencySettings();
        this.updateAppInfo();
    }

    destroy() {
        this.isInitialized = false;
    }
}

window.SettingsModule = new SettingsModule();
