/**
 * FINANCIAL APP UTILITIES - FIXED UPDATE MANAGER
 * Simplified version management using single source of truth
 */

// ===== CONSTANTS =====
const CONFIG = {
    USD_TO_VND_RATE: 25000,
    USD_RATE_MIN: 1000,
    USD_RATE_MAX: 50000,
    TRANSFER_CATEGORY_OUT: "Chuyển tiền đi",
    TRANSFER_CATEGORY_IN: "Nhận tiền chuyển",
    RECONCILE_ADJUST_INCOME_CAT: "Điều chỉnh Đối Soát (Thu)",
    RECONCILE_ADJUST_EXPENSE_CAT: "Điều chỉnh Đối Soát (Chi)",
    STORAGE_KEYS: {
        TRANSACTIONS: 'financial_transactions_v2',
        INCOME_CATEGORIES: 'financial_income_categories_v2',
        EXPENSE_CATEGORIES: 'financial_expense_categories_v2',
        ACCOUNTS: 'financial_accounts_v2',
        SETTINGS: 'financial_settings_v2',
        RECONCILIATION_HISTORY: 'financial_reconciliation_history_v2'
    },
    CATEGORY_COLORS: [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
        '#C9CBCF', '#8366FF', '#289F40', '#D26384', '#3C64C8', '#C89632',
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#FAA41B', '#F47560', '#6A8EAE'
    ]
};

const Utils = {
    CONFIG,
    // ========== STORAGE ==========
    StorageUtils: {
        save(key, data) {
            try { localStorage.setItem(key, JSON.stringify(data)); return true; }
            catch (error) { console.error(`Error saving ${key}:`, error); return false; }
        },
        load(key, defaultValue = null) {
            try { const data = localStorage.getItem(key); return data ? JSON.parse(data) : defaultValue; }
            catch (error) { console.error(`Error loading ${key}:`, error); return defaultValue; }
        },
        remove(key) {
            try { localStorage.removeItem(key); return true; }
            catch (error) { console.error(`Error removing ${key}:`, error); return false; }
        },
        clearAll() {
            try { Object.values(CONFIG.STORAGE_KEYS).forEach(key => localStorage.removeItem(key)); return true; }
            catch (error) { console.error('Error clearing storage:', error); return false; }
        },
        getStorageSize() {
            let total = 0;
            Object.values(CONFIG.STORAGE_KEYS).forEach(key => {
                const item = localStorage.getItem(key);
                if (item) total += item.length;
            });
            return total;
        },
        formatStorageSize(bytes) {
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
            return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        }
    },
    // ========== CURRENCY ==========
    CurrencyUtils: {
        formatCurrency(amount, currency = 'VND') {
            try {
                const num = parseFloat(amount) || 0;
                if (currency === 'VND') {
                    const formatted = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
                    return formatted.replace(/\./g, ',');
                } else {
                    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
                }
            } catch (error) { console.error('formatCurrency error:', error); return `${amount || 0} ${currency}`; }
        },
        formatCurrencyShort(amount, currency = 'VND') {
            try {
                const num = parseFloat(amount) || 0;
                if (currency === 'VND') {
                    const sign = num < 0 ? '-' : '', absNum = Math.abs(num);
                    let formattedNum, unit = '';
                    if (absNum < 1000) { formattedNum = new Intl.NumberFormat('vi-VN').format(absNum); return sign + formattedNum; }
                    else if (absNum < 1000000) { formattedNum = (absNum / 1000).toFixed(0); unit = ' Ng'; }
                    else if (absNum < 1000000000) { formattedNum = (absNum / 1000000).toFixed(1); unit = ' Tr'; }
                    else { formattedNum = (absNum / 1000000000).toFixed(2); unit = ' Tỷ'; }
                    return sign + formattedNum + unit;
                } else {
                    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
                }
            } catch (error) { console.error('formatCurrencyShort error:', error); return `${amount || 0} ${currency}`; }
        },
        parseAmountInput(value, currency = 'VND') {
            try {
                if (!value) return 0;
                const cleaned = value.toString().replace(/[^\d.-]/g, '');
                const amount = parseFloat(cleaned) || 0;
                if (currency === 'USD') return amount * CONFIG.USD_TO_VND_RATE;
                return amount;
            } catch (error) { console.error('parseAmountInput error:', error); return 0; }
        },
        formatAmountInput(amount) {
            try {
                if (amount === undefined || amount === null) return '';
                const str = typeof amount === 'string' ? amount.replace(/[^\d]/g, '') : amount.toString();
                const num = parseInt(str, 10);
                if (isNaN(num)) return '';
                return num.toLocaleString('en-US');
            } catch (error) { console.error('formatAmountInput error:', error); return ''; }
        },
        convertCurrency(amount, fromCurrency, toCurrency) {
            try {
                if (fromCurrency === toCurrency) return amount;
                if (fromCurrency === 'USD' && toCurrency === 'VND') return amount * CONFIG.USD_TO_VND_RATE;
                if (fromCurrency === 'VND' && toCurrency === 'USD') return amount / CONFIG.USD_TO_VND_RATE;
                return amount;
            } catch (error) { console.error('convertCurrency error:', error); return amount; }
        }
    },
    // ========== DATE ==========
    DateUtils: {
        formatDateTimeLocal(date = new Date()) {
            const d = new Date(date), year = d.getFullYear(), month = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0'), hours = String(d.getHours()).padStart(2, '0'), minutes = String(d.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        },
        formatDisplayDateTime(datetime) {
            try {
                const date = new Date(datetime);
                return date.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            } catch (error) { return datetime; }
        },
        formatCompactDateTime(datetime) {
            try {
                const date = new Date(datetime);
                const hours = String(date.getHours()).padStart(2, '0'), minutes = String(date.getMinutes()).padStart(2, '0'), day = String(date.getDate()).padStart(2, '0'), month = String(date.getMonth() + 1).padStart(2, '0'), year = String(date.getFullYear()).slice(-2);
                return { time: `${hours}:${minutes}`, date: `${day}-${month}-${year}` };
            } catch (error) { return { time: '00:00', date: '00-00-00' }; }
        },
        getPeriodDates(period) {
            const now = new Date(); let start, end;
            switch (period) {
                case 'today': start = new Date(now.getFullYear(), now.getMonth(), now.getDate()); end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59); break;
                case 'week': const monday = now.getDate() - now.getDay() + 1; start = new Date(now.getFullYear(), now.getMonth(), monday); end = new Date(now.getFullYear(), now.getMonth(), monday + 6, 23, 59, 59); break;
                case 'month': start = new Date(now.getFullYear(), now.getMonth(), 1); end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59); break;
                case 'quarter': const quarter = Math.floor(now.getMonth() / 3); start = new Date(now.getFullYear(), quarter * 3, 1); end = new Date(now.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59); break;
                case 'year': start = new Date(now.getFullYear(), 0, 1); end = new Date(now.getFullYear(), 11, 31, 23, 59, 59); break;
                default: start = new Date(now.getFullYear(), now.getMonth(), 1); end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            }
            return { start, end };
        },
        isDateInPeriod(datetime, period, customStart = null, customEnd = null) {
            try {
                const date = new Date(datetime);
                if (period === 'custom' && customStart && customEnd) return date >= customStart && date <= customEnd;
                const { start, end } = this.getPeriodDates(period);
                return date >= start && date <= end;
            } catch (error) { return false; }
        },
        getISOWeek(date) {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
            const week1 = new Date(d.getFullYear(), 0, 4);
            return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
        }
    },
    // ========== UI ==========
    UIUtils: {
        showMessage(message, type = 'info', duration = 3000) {
            const messageBox = document.getElementById('message-box');
            if (!messageBox) { alert(`${type.toUpperCase()}: ${message}`); return; }
            messageBox.textContent = message;
            messageBox.className = `message-box ${type}`;
            messageBox.style.display = 'block';
            setTimeout(() => { messageBox.style.display = 'none'; }, duration);
        },
        generateId() {
            return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        },
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => { clearTimeout(timeout); func(...args); };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },
        formatAmountInputWithCursor(input, value) {
            try {
                const start = input.selectionStart, oldLength = input.value.length;
                const cleaned = value.replace(/[^\d]/g, '');
                const formatted = Utils.CurrencyUtils.formatAmountInput(cleaned);
                input.value = formatted;
                const newLength = formatted.length, newPos = start + (newLength - oldLength);
                input.setSelectionRange(newPos, newPos);
            } catch (error) {
                input.value = Utils.CurrencyUtils.formatAmountInput(value);
            }
        },
        getCategoryIcon(category) {
            const icons = {
                'Lương': '💼', 'Thưởng': '🎁', 'Ăn uống': '🍽️', 'Đi lại': '🚗', 'Nhà ở': '🏠', 'Hóa đơn': '📄',
                'Mua sắm': '🛒', 'Giải trí': '🎮', 'Sức khỏe': '⚕️', 'Giáo dục': '📚', 'Tiền mặt': '💵', 'Thẻ tín dụng': '💳'
            };
            return icons[category] || '📦';
        },
        getCategoryColor(category, index = 0) {
            if (typeof category === 'string') {
                let hash = 0;
                for (let i = 0; i < category.length; i++) {
                    hash = category.charCodeAt(i) + ((hash << 5) - hash);
                }
                return CONFIG.CATEGORY_COLORS[Math.abs(hash) % CONFIG.CATEGORY_COLORS.length];
            }
            return CONFIG.CATEGORY_COLORS[index % CONFIG.CATEGORY_COLORS.length];
        },
        hexToRgba(hex, alpha = 1) {
            if (!hex) return null;
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            if (!result) return null;
            const r = parseInt(result[1], 16), g = parseInt(result[2], 16), b = parseInt(result[3], 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
    },
    // ========== VALIDATION ==========
    ValidationUtils: {
        validateTransaction(data) {
            const errors = [];
            if (!data.type || !['Thu', 'Chi', 'Transfer'].includes(data.type)) errors.push('Loại giao dịch không hợp lệ');
            if (!data.amount || isNaN(data.amount) || data.amount <= 0) errors.push('Số tiền phải lớn hơn 0');
            if (!data.account) errors.push('Vui lòng chọn tài khoản');
            if (!data.datetime) errors.push('Vui lòng chọn ngày và giờ');
            if (data.type === 'Transfer' && !data.toAccount) errors.push('Vui lòng chọn tài khoản đích');
            if (data.type !== 'Transfer' && !data.category) errors.push('Vui lòng chọn hạng mục');
            return { isValid: errors.length === 0, errors };
        },
        validateCategoryName(name, existingCategories = []) {
            if (!name || name.trim().length === 0) return { isValid: false, error: 'Tên danh mục không được để trống' };
            if (name.length > 50) return { isValid: false, error: 'Tên danh mục không được quá 50 ký tự' };
            const exists = existingCategories.some(cat => cat && cat.value && cat.value.toLowerCase() === name.toLowerCase());
            if (exists) return { isValid: false, error: 'Danh mục này đã tồn tại' };
            return { isValid: true };
        },
        validateAccountName(name, existingAccounts = []) {
            if (!name || name.trim().length === 0) return { isValid: false, error: 'Tên tài khoản không được để trống' };
            if (name.length > 50) return { isValid: false, error: 'Tên tài khoản không được quá 50 ký tự' };
            const exists = existingAccounts.some(acc => acc && acc.value && acc.value.toLowerCase() === name.toLowerCase());
            if (exists) return { isValid: false, error: 'Tài khoản này đã tồn tại' };
            return { isValid: true };
        }
    },
    // ========== MATH ==========
    MathUtils: {
        calculatePercentageChange(oldValue, newValue) {
            const old = parseFloat(oldValue) || 0, newVal = parseFloat(newValue) || 0;
            if (old === 0) return newVal === 0 ? 0 : 100;
            return Math.round(((newVal - old) / old) * 100);
        },
        calculatePercentage(value, total) {
            if (!total || total === 0) return 0;
            return Math.round((value / total) * 100);
        }
    },
    // ========== EXPORT ==========
    ExportUtils: {
        exportJSON(data, filename = 'financial_data') {
            try {
                const jsonString = JSON.stringify(data, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                this.downloadFile(blob, `${filename}_${new Date().toISOString().split('T')[0]}.json`);
                return true;
            } catch (error) { console.error('Error exporting JSON:', error); return false; }
        },
        exportCSV(transactions, accounts = []) {
            try {
                const headers = ['Ngày giờ', 'Loại', 'Số tiền', 'Hạng mục', 'Tài khoản', 'Mô tả'];
                const rows = [headers];
                transactions.forEach(tx => {
                    if (tx) rows.push([
                        Utils.DateUtils.formatDisplayDateTime(tx.datetime), tx.type, tx.amount || 0, tx.category || '', tx.account || '', tx.description || ''
                    ]);
                });
                const csvContent = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
                const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
                this.downloadFile(blob, `transactions_${new Date().toISOString().split('T')[0]}.csv`);
                return true;
            } catch (error) { console.error('Error exporting CSV:', error); return false; }
        },
        downloadFile(blob, filename) {
            try {
                const url = URL.createObjectURL(blob), a = document.createElement('a');
                a.href = url; a.download = filename; document.body.appendChild(a); a.click();
                document.body.removeChild(a); URL.revokeObjectURL(url);
            } catch (error) { console.error('Error downloading file:', error); }
        }
    },
    // ========== NOTIFICATION ==========
    NotificationUtils: {
        async requestPermission() {
            if (!('Notification' in window)) return false;
            if (Notification.permission === 'granted') return true;
            if (Notification.permission === 'denied') return false;
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        },
        showNotification(title, options = {}) {
            if (Notification.permission === 'granted') {
                const defaultOptions = { icon: '/LogoFinance.png', badge: '/LogoFinance.png', tag: 'finance-app', requireInteraction: false, ...options };
                return new Notification(title, defaultOptions);
            }
            return null;
        }
    },
    // ========== THEME ==========
    ThemeUtils: {
        applyTheme(theme) {
            const body = document.body; if (!body) return;
            let actualTheme = theme;
            if (theme === 'auto') actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            body.setAttribute('data-theme', actualTheme);
            this.saveTheme(theme);
        },
        toggleTheme() {
            const current = this.getCurrentTheme();
            const newTheme = current === 'light' ? 'dark' : 'light';
            this.applyTheme(newTheme);
        },
        getCurrentTheme() {
            return Utils.StorageUtils.load('theme', 'auto');
        },
        saveTheme(theme) {
            Utils.StorageUtils.save('theme', theme);
        },
        initializeTheme() {
            const saved = this.getCurrentTheme();
            this.applyTheme(saved);
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
                if (this.getCurrentTheme() === 'auto') this.applyTheme('auto');
            });
        }
    }
};

// ==========================================
// PWA CODE - GLOBAL SCOPE
// ==========================================
window.deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.deferredPrompt = e;
    Utils.UIUtils.showMessage('💡 Cài đặt ứng dụng để trải nghiệm tốt hơn!', 'info', 5000);
});
window.addEventListener('appinstalled', () => {
    Utils.UIUtils.showMessage('🎉 Ứng dụng đã được cài đặt thành công!', 'success');
    window.deferredPrompt = null;
});

/**
 * ✅ SIMPLIFIED UPDATE MANAGER - Single Source of Truth
 */
Utils.UpdateManager = {
    // 🎯 ALWAYS use APP_VERSION as single source of truth
    get currentVersion() {
        return typeof APP_VERSION !== 'undefined' ? APP_VERSION : '1.0.3';
    },
    
    swRegistration: null,
    isUpdateAvailable: false,
    isRefreshing: false,
    swVersion: null,
    lastCheck: null,
    checkInterval: null,

    // ✅ Simplified init - no more complex clientVersion logic
    init() {
        console.log('🔄 UpdateManager: Initializing...');
        console.log(`📱 UpdateManager: Current version: ${this.currentVersion}`);
        
        if ('serviceWorker' in navigator) {
            this.registerServiceWorker();
            this.setupUpdateDetection();
            this.checkForUpdatesOnFocus();
            
            // Auto-check every 30 seconds
            this.checkInterval = setInterval(() => {
                if (!document.hidden) {
                    this.checkForUpdates();
                }
            }, 30000);
        } else {
            console.warn('⚠️ UpdateManager: Service Worker not supported');
        }
    },

    // ✅ Service Worker registration (unchanged)
    async registerServiceWorker() {
        try {
            console.log('📋 UpdateManager: Registering Service Worker...');
            
            this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
                updateViaCache: 'none'
            });
            
            console.log('✅ UpdateManager: Service Worker registered:', this.swRegistration.scope);
            
            this.swRegistration.addEventListener('updatefound', () => {
                console.log('🆕 UpdateManager: Update found on registration object!');
                const newWorker = this.swRegistration.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('🎯 UpdateManager: New SW installed and ready.');
                            this.isUpdateAvailable = true;
                            this.showUpdateNotification();
                        }
                    });
                }
            });
            
            if (this.swRegistration.active) {
                await this.getVersionFromSW();
            }
            
            await this.checkForUpdates();
            
        } catch (error) {
            console.error('❌ UpdateManager: Service worker registration failed:', error);
        }
    },

    // ✅ Get version from SW (unchanged)
    async getVersionFromSW() {
        try {
            if (!this.swRegistration || !this.swRegistration.active) {
                console.log('ℹ️ UpdateManager: No active SW to get version from.');
                return null;
            }

            return new Promise((resolve, reject) => {
                const messageChannel = new MessageChannel();
                
                messageChannel.port1.onmessage = (event) => {
                    if (event.data && event.data.error) {
                        console.error('❌ UpdateManager: Error from SW on CHECK_VERSION:', event.data.error);
                        this.swVersion = null;
                        reject(new Error(event.data.error));
                    } else if (event.data && event.data.version) {
                        this.swVersion = event.data.version;
                        console.log(`🔧 UpdateManager: Received SW version: ${this.swVersion}`);
                        resolve(event.data);
                    } else {
                        this.swVersion = null;
                        resolve(null);
                    }
                };
                
                this.swRegistration.active.postMessage(
                    { type: 'CHECK_VERSION' }, 
                    [messageChannel.port2]
                );
                
                setTimeout(() => {
                    console.warn('⏳ UpdateManager: Timeout getting SW version.');
                    this.swVersion = this.swVersion || null;
                    resolve(null); 
                }, 5000);
            });
        } catch (error) {
            console.error('❌ UpdateManager: Error getting SW version:', error);
            this.swVersion = null;
            return null;
        }
    },

    // ✅ Setup update detection (unchanged)
    setupUpdateDetection() {
        if (!navigator.serviceWorker) return;
        
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('🔄 UpdateManager: Controller changed');
            if (this.isRefreshing) return;
            
            this.isRefreshing = true;
            this.showUpdateAppliedMessage();
            setTimeout(() => this.hardReload(), 1000);
        });
        
        navigator.serviceWorker.addEventListener('message', event => {
            this.handleServiceWorkerMessage(event.data);
        });
        
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                setTimeout(() => this.checkForUpdates(), 1000);
            }
        });
    },

    // ✅ Handle SW messages (unchanged)
    handleServiceWorkerMessage(data) {
        if (!data || !data.type) return;
        
        console.log('📨 UpdateManager: Received SW message:', data.type, data);
        
        switch (data.type) {
            case 'SW_UPDATED':
                this.isUpdateAvailable = true;
                this.showUpdateNotification();
                break;
                
            case 'FORCE_UPDATE_COMPLETE':
                this.showUpdateAppliedMessage();
                setTimeout(() => window.location.reload(), 1500); 
                break;
                
            case 'VERSION_INFO':
                if (data.version) {
                    this.swVersion = data.version;
                    console.log(`🔧 UpdateManager: Updated SW version from message: ${this.swVersion}`);
                    if (this.swVersion !== this.currentVersion) {
                        this.isUpdateAvailable = true;
                        this.showUpdateNotification();
                    }
                }
                break;
        }
    },

    // ✅ Check for updates (simplified comparison)
    async checkForUpdates() {
        if (!this.swRegistration) {
            console.log('⚠️ UpdateManager: No SW registration for update check');
            return false;
        }
        
        try {
            console.log('🔍 UpdateManager: Checking for updates...');
            this.lastCheck = new Date();
            
            await this.swRegistration.update();
            
            if (this.swRegistration.waiting) {
                console.log('🆕 UpdateManager: Update available (waiting worker found).');
                this.isUpdateAvailable = true;
                this.showUpdateNotification();
                return true;
            }
            
            await this.getVersionFromSW();
            
            // ✅ SIMPLIFIED: Only compare with APP_VERSION
            console.log(`ℹ️ UpdateManager: Comparing versions - App: ${this.currentVersion}, SW: ${this.swVersion}`);
            if (this.swVersion && this.swVersion !== this.currentVersion) {
                console.log(`🆕 UpdateManager: Version mismatch! Triggering notification.`);
                this.isUpdateAvailable = true;
                this.showUpdateNotification();
                return true;
            }
            
            console.log('✅ UpdateManager: No updates available.');
            this.isUpdateAvailable = false;
            this.dismissUpdate();
            return false;
            
        } catch (error) {
            console.error('❌ UpdateManager: Update check failed:', error);
            return false;
        }
    },

    // ✅ Show update notification (unchanged)
    showUpdateNotification() {
        const existingNotification = document.getElementById('update-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        this.isUpdateAvailable = true;
        
        const updateBar = document.createElement('div');
        updateBar.id = 'update-notification';
        updateBar.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                color: white;
                padding: 1rem;
                text-align: center;
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: space-between;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                backdrop-filter: blur(10px);
            ">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-size: 1.5rem;">🆕</span>
                    <div>
                        <div style="font-weight: 600; margin-bottom: 0.25rem;">Có phiên bản mới! (SW: ${this.swVersion || 'N/A'})</div>
                        <div style="font-size: 0.85rem; opacity: 0.9;">Nhấn "Cập nhật" để sử dụng tính năng mới nhất</div>
                    </div>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button onclick="Utils.UpdateManager.applyUpdate()" style="
                        background: white;
                        color: #3b82f6;
                        border: none;
                        padding: 0.75rem 1.5rem;
                        border-radius: 8px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    ">🔄 Cập nhật ngay</button>
                    <button onclick="Utils.UpdateManager.dismissUpdate()" style="
                        background: rgba(255,255,255,0.2);
                        color: white;
                        border: 1px solid rgba(255,255,255,0.3);
                        padding: 0.75rem 1rem;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    ">⏰ Để sau</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(updateBar);
        console.log('📢 UpdateManager: Update notification shown');
    },

    // ✅ Apply update (unchanged)
    async applyUpdate() {
        try {
            console.log('🔄 UpdateManager: Applying update...');
            this.showLoadingMessage('Đang cập nhật ứng dụng...');
            
            if (this.swRegistration && this.swRegistration.waiting) {
                this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
                console.log('📤 UpdateManager: Sent SKIP_WAITING message');
            } else {
                console.log('🔄 UpdateManager: No waiting worker, forcing refresh...');
                await this.forceRefresh();
            }
            
            this.dismissUpdate();
            
        } catch (error) {
            console.error('❌ UpdateManager: Error applying update:', error);
            Utils.UIUtils.showMessage('Có lỗi khi cập nhật. Đang thử làm mới mạnh...', 'warning');
            
            setTimeout(() => {
                this.forceRefresh();
            }, 1000);
        }
    },

    // ✅ Dismiss update (unchanged)
    dismissUpdate() {
        const updateBar = document.getElementById('update-notification');
        if (updateBar) {
            updateBar.remove();
        }
        this.isUpdateAvailable = false;
        console.log('👋 UpdateManager: Update notification dismissed');
    },

    // ✅ Show loading message (unchanged)
    showLoadingMessage(message) {
        const existingLoading = document.getElementById('update-loading');
        if (existingLoading) {
            existingLoading.remove();
        }
        
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'update-loading';
        loadingDiv.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
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
                ">
                    <div style="
                        width: 40px;
                        height: 40px;
                        border: 4px solid rgba(255,255,255,0.3);
                        border-top: 4px solid white;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 1rem;
                    "></div>
                    <div style="font-size: 1.1rem; font-weight: 500;">${message}</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(loadingDiv);
    },

    // ✅ Show update applied message (unchanged)
    showUpdateAppliedMessage() {
        const loadingDiv = document.getElementById('update-loading');
        if (loadingDiv) {
            loadingDiv.remove();
        }
        
        Utils.UIUtils.showMessage('✅ Ứng dụng đã được cập nhật thành công! Trang sẽ tự tải lại.', 'success', 3000);
    },

    // ✅ Force refresh (unchanged)
    async forceRefresh() {
        try {
            console.log('🔄 UpdateManager: Force refreshing application...');
            this.showLoadingMessage('Đang làm mới ứng dụng hoàn toàn...');
            
            if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ type: 'FORCE_UPDATE' });
                console.log('📤 UpdateManager: Sent FORCE_UPDATE message to SW');
            } else {
                console.log('🔄 UpdateManager: No SW controller, clearing caches and hard reloading...');
                await this.clearCachesAndReload();
            }
            
        } catch (error) {
            console.error('❌ UpdateManager: Force refresh failed:', error);
            this.hardReload();
        }
    },

    // ✅ Clear caches and reload (unchanged)
    async clearCachesAndReload() {
        try {
            if ('caches' in window) {
                console.log('🗑️ UpdateManager: Clearing all caches...');
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => {
                    console.log(`🗑️ UpdateManager: Deleting cache: ${name}`);
                    return caches.delete(name);
                }));
                console.log('✅ UpdateManager: All caches cleared');
            }
            
            this.hardReload();
        } catch (error) {
            console.error('❌ UpdateManager: Error clearing caches:', error);
            this.hardReload();
        }
    },

    // ✅ Hard reload (unchanged)
    hardReload() {
        try {
            console.log('🔄 UpdateManager: Performing hard reload...');
            
            if (typeof window.location.reload === 'function') {
                const url = new URL(window.location.href);
                url.searchParams.set('_refresh', Date.now());
                window.location.href = url.toString();
            } else {
                window.location.href = window.location.href.split('?')[0] + '?_refresh=' + Date.now();
            }
        } catch (error) {
            console.error('❌ UpdateManager: Hard reload failed:', error);
            window.location.reload(true);
        }
    },

    // ✅ Check for updates on focus (unchanged)
    checkForUpdatesOnFocus() {
        let lastFocusTime = Date.now();
        
        window.addEventListener('focus', () => {
            const now = Date.now();
            if (now - lastFocusTime > 30000) {
                setTimeout(() => {
                    this.checkForUpdates();
                }, 1000);
            }
            lastFocusTime = now;
        });
        
        window.addEventListener('blur', () => {
            lastFocusTime = Date.now();
        });
    },

    // ✅ Get version info for UI - SIMPLIFIED
    getVersionInfo() {
        return {
            currentVersion: this.currentVersion, // Always use APP_VERSION
            swVersion: this.swVersion,
            isUpdateAvailable: this.isUpdateAvailable,
            lastCheck: this.lastCheck ? this.lastCheck.toLocaleString('vi-VN') : 'Chưa kiểm tra'
        };
    },

    // ✅ Cleanup (unchanged)
    destroy() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        
        this.dismissUpdate();
        
        const loadingDiv = document.getElementById('update-loading');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }
};

// CSS cho animation update
const updateAnimationCSS = `
<style>
@keyframes slideUpAndFade { 
    to { 
        transform: translateY(-100%); 
        opacity: 0; 
    } 
}
@keyframes spin { 
    from { transform: rotate(0deg); } 
    to { transform: rotate(360deg); } 
}
</style>
`;

if (!document.getElementById('update-animation-css')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'update-animation-css';
    styleElement.innerHTML = updateAnimationCSS;
    document.head.appendChild(styleElement);
}

console.log("✅ Utils.js with SIMPLIFIED UpdateManager loaded.");