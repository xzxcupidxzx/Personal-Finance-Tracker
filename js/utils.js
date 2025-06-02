/**
 * FINANCIAL APP UTILITIES - COMPLETE VERSION
 * Core utility functions for the financial management app.
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

// ===== UTILITIES OBJECT =====
const Utils = {
    CONFIG,

    /**
     * Storage Utilities
     */
    StorageUtils: {
        save(key, data) {
            try {
                localStorage.setItem(key, JSON.stringify(data));
                return true;
            } catch (error) {
                console.error(`Error saving data to localStorage (key: ${key}):`, error);
                return false;
            }
        },
        
        load(key, defaultValue = null) {
            try {
                const data = localStorage.getItem(key);
                return data ? JSON.parse(data) : defaultValue;
            } catch (error) {
                console.error(`Error loading data from localStorage (key: ${key}):`, error);
                return defaultValue;
            }
        },
        
        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.error(`Error removing data from localStorage (key: ${key}):`, error);
                return false;
            }
        },

        clearAll() {
            try {
                Object.values(CONFIG.STORAGE_KEYS).forEach(key => {
                    localStorage.removeItem(key);
                });
                return true;
            } catch (error) {
                console.error('Error clearing storage:', error);
                return false;
            }
        },

        getStorageSize() {
            let totalSize = 0;
            Object.values(CONFIG.STORAGE_KEYS).forEach(key => {
                const item = localStorage.getItem(key);
                if (item) {
                    totalSize += item.length;
                }
            });
            return totalSize;
        },

        formatStorageSize(bytes) {
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
            return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        }
    },

    /**
     * Currency Utilities
     */
    CurrencyUtils: {
        formatCurrency(amount, currency = 'VND') {
            try {
                const num = parseFloat(amount) || 0;
                if (currency === 'VND') {
                    const formatted = new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    }).format(num);
                    
                    return formatted.replace(/\./g, ',');
                } else {
                    return new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: currency,
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    }).format(num);
                }
            } catch (error) {
                console.error('formatCurrency error:', error);
                return `${amount || 0} ${currency}`;
            }
        },

        formatCurrencyShort(amount, currency = 'VND') {
            try {
                const num = parseFloat(amount) || 0;

                if (currency === 'VND') {
                    const sign = num < 0 ? '-' : '';
                    const absNum = Math.abs(num);
                    let formattedNum;
                    let unit = '';

                    if (absNum < 1000) {
                        formattedNum = new Intl.NumberFormat('vi-VN').format(absNum);
                        return sign + formattedNum;
                    } else if (absNum < 1000000) {
                        formattedNum = new Intl.NumberFormat('vi-VN', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 3
                        }).format(absNum / 1000);
                        unit = ' Ng';
                    } else if (absNum < 1000000000) {
                        formattedNum = new Intl.NumberFormat('vi-VN', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 3
                        }).format(absNum / 1000000);
                        unit = ' Tr';
                    } else {
                        formattedNum = new Intl.NumberFormat('vi-VN', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 3
                        }).format(absNum / 1000000000);
                        unit = ' Tỷ';
                    }

                    if (formattedNum.includes(',')) {
                         formattedNum = formattedNum.replace(/,0+$/, '').replace(/(\,\d*?[1-9])0+$/, '$1');
                    }

                    return sign + formattedNum + unit;
                } else {
                    return new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: currency,
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    }).format(num);
                }
            } catch (error) {
                console.error('formatCurrencyShort error:', error);
                return `${amount || 0} ${currency}`;
            }
        },

        parseAmountInput(value, currency = 'VND') {
            try {
                if (!value) return 0;
                const cleaned = value.toString().replace(/[^\d.-]/g, '');
                const amount = parseFloat(cleaned) || 0;

                if (currency === 'USD') {
                    return amount * CONFIG.USD_TO_VND_RATE;
                }
                return amount;
            } catch (error) {
                console.error('parseAmountInput error:', error);
                return 0;
            }
        },

        formatAmountInput(amount) {
            try {
                if (amount === undefined || amount === null) return '';
                const str = typeof amount === 'string' ? amount.replace(/[^\d]/g, '') : amount.toString();
                const num = parseInt(str, 10);
                if (isNaN(num)) return '';
                return num.toLocaleString('en-US');
            } catch (error) {
                console.error('formatAmountInput error:', error);
                return '';
            }
        },

        convertCurrency(amount, fromCurrency, toCurrency) {
            try {
                if (fromCurrency === toCurrency) return amount;

                if (fromCurrency === 'USD' && toCurrency === 'VND') {
                    return amount * CONFIG.USD_TO_VND_RATE;
                }

                if (fromCurrency === 'VND' && toCurrency === 'USD') {
                    return amount / CONFIG.USD_TO_VND_RATE;
                }

                return amount;
            } catch (error) {
                console.error('convertCurrency error:', error);
                return amount;
            }
        }
    },

    /**
     * Date Utilities
     */
    DateUtils: {
        formatDateTimeLocal(date = new Date()) {
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        },

        formatDisplayDateTime(datetime) {
            try {
                const date = new Date(datetime);
                return date.toLocaleString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch (error) {
                return datetime;
            }
        },

        formatCompactDateTime(datetime) {
            try {
                const date = new Date(datetime);
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = String(date.getFullYear()).slice(-2);
                
                return {
                    time: `${hours}:${minutes}`,
                    date: `${day}-${month}-${year}`
                };
            } catch (error) {
                console.error('formatCompactDateTime error:', error);
                return {
                    time: '00:00',
                    date: '00-00-00'
                };
            }
        },

        getPeriodDates(period) {
            const now = new Date();
            let start, end;

            switch (period) {
                case 'today':
                    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
                    break;
                case 'week':
                    const monday = now.getDate() - now.getDay() + 1;
                    start = new Date(now.getFullYear(), now.getMonth(), monday);
                    end = new Date(now.getFullYear(), now.getMonth(), monday + 6, 23, 59, 59);
                    break;
                case 'month':
                    start = new Date(now.getFullYear(), now.getMonth(), 1);
                    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                    break;
                case 'quarter':
                    const quarter = Math.floor(now.getMonth() / 3);
                    start = new Date(now.getFullYear(), quarter * 3, 1);
                    end = new Date(now.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59);
                    break;
                case 'year':
                    start = new Date(now.getFullYear(), 0, 1);
                    end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
                    break;
                default:
                    start = new Date(now.getFullYear(), now.getMonth(), 1);
                    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            }

            return { start, end };
        },

        isDateInPeriod(datetime, period, customStart = null, customEnd = null) {
            try {
                const date = new Date(datetime);
                
                if (period === 'custom' && customStart && customEnd) {
                    return date >= customStart && date <= customEnd;
                }

                const { start, end } = this.getPeriodDates(period);
                return date >= start && date <= end;
            } catch (error) {
                return false;
            }
        },

        getISOWeek(date) {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
            const week1 = new Date(d.getFullYear(), 0, 4);
            return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
        }
    },

    /**
     * UI Utilities
     */
    UIUtils: {
        showMessage(message, type = 'info', duration = 3000) {
            const messageBox = document.getElementById('message-box');
            if (!messageBox) {
                alert(`${type.toUpperCase()}: ${message}`);
                return;
            }

            messageBox.textContent = message;
            messageBox.className = `message-box ${type}`;
            messageBox.style.display = 'block';

            setTimeout(() => {
                messageBox.style.display = 'none';
            }, duration);
        },

        generateId() {
            return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        },

        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        formatAmountInputWithCursor(input, value) {
            try {
                const start = input.selectionStart;
                const oldLength = input.value.length;

                const cleaned = value.replace(/[^\d]/g, '');
                const formatted = Utils.CurrencyUtils.formatAmountInput(cleaned);

                input.value = formatted;

                const newLength = formatted.length;
                const newPos = start + (newLength - oldLength);
                input.setSelectionRange(newPos, newPos);
            } catch (error) {
                console.error('formatAmountInputWithCursor error:', error);
                input.value = Utils.CurrencyUtils.formatAmountInput(value);
            }
        },

        getCategoryIcon(category) {
            const icons = {
                'Lương': '💼',
                'Thưởng': '🎁',
                'Ăn uống': '🍽️',
                'Đi lại': '🚗',
                'Nhà ở': '🏠',
                'Hóa đơn': '📄',
                'Mua sắm': '🛒',
                'Giải trí': '🎮',
                'Sức khỏe': '⚕️',
                'Giáo dục': '📚',
                'Tiền mặt': '💵',
                'Thẻ tín dụng': '💳'
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
            
            const r = parseInt(result[1], 16);
            const g = parseInt(result[2], 16);
            const b = parseInt(result[3], 16);
            
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
    },

    /**
     * Validation Utilities
     */
    ValidationUtils: {
        validateTransaction(data) {
            const errors = [];

            if (!data.type || !['Thu', 'Chi', 'Transfer'].includes(data.type)) {
                errors.push('Loại giao dịch không hợp lệ');
            }

            if (!data.amount || isNaN(data.amount) || data.amount <= 0) {
                errors.push('Số tiền phải lớn hơn 0');
            }

            if (!data.account) {
                errors.push('Vui lòng chọn tài khoản');
            }

            if (!data.datetime) {
                errors.push('Vui lòng chọn ngày và giờ');
            }

            if (data.type === 'Transfer' && !data.toAccount) {
                errors.push('Vui lòng chọn tài khoản đích');
            }

            if (data.type !== 'Transfer' && !data.category) {
                errors.push('Vui lòng chọn hạng mục');
            }

            return {
                isValid: errors.length === 0,
                errors: errors
            };
        },

        validateCategoryName(name, existingCategories = []) {
            if (!name || name.trim().length === 0) {
                return { isValid: false, error: 'Tên danh mục không được để trống' };
            }

            if (name.length > 50) {
                return { isValid: false, error: 'Tên danh mục không được quá 50 ký tự' };
            }

            const exists = existingCategories.some(cat => 
                cat && cat.value && cat.value.toLowerCase() === name.toLowerCase()
            );

            if (exists) {
                return { isValid: false, error: 'Danh mục này đã tồn tại' };
            }

            return { isValid: true };
        },

        validateAccountName(name, existingAccounts = []) {
            if (!name || name.trim().length === 0) {
                return { isValid: false, error: 'Tên tài khoản không được để trống' };
            }

            if (name.length > 50) {
                return { isValid: false, error: 'Tên tài khoản không được quá 50 ký tự' };
            }

            const exists = existingAccounts.some(acc => 
                acc && acc.value && acc.value.toLowerCase() === name.toLowerCase()
            );

            if (exists) {
                return { isValid: false, error: 'Tài khoản này đã tồn tại' };
            }

            return { isValid: true };
        }
    },

    /**
     * Math Utilities
     */
    MathUtils: {
        calculatePercentageChange(oldValue, newValue) {
            const old = parseFloat(oldValue) || 0;
            const newVal = parseFloat(newValue) || 0;
            
            if (old === 0) {
                return newVal === 0 ? 0 : 100;
            }
            
            return Math.round(((newVal - old) / old) * 100);
        },

        calculatePercentage(value, total) {
            if (!total || total === 0) return 0;
            return Math.round((value / total) * 100);
        }
    },

    /**
     * Export Utilities
     */
    ExportUtils: {
        exportJSON(data, filename = 'financial_data') {
            try {
                const jsonString = JSON.stringify(data, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                this.downloadFile(blob, `${filename}_${new Date().toISOString().split('T')[0]}.json`);
                return true;
            } catch (error) {
                console.error('Error exporting JSON:', error);
                return false;
            }
        },

        exportCSV(transactions, accounts = []) {
            try {
                const headers = ['Ngày giờ', 'Loại', 'Số tiền', 'Hạng mục', 'Tài khoản', 'Mô tả'];
                const rows = [headers];

                transactions.forEach(tx => {
                    if (tx) {
                        rows.push([
                            Utils.DateUtils.formatDisplayDateTime(tx.datetime),
                            tx.type,
                            tx.amount || 0,
                            tx.category || '',
                            tx.account || '',
                            tx.description || ''
                        ]);
                    }
                });

                const csvContent = rows.map(row => 
                    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
                ).join('\n');

                const blob = new Blob(['\uFEFF' + csvContent], { 
                    type: 'text/csv;charset=utf-8;' 
                });
                
                this.downloadFile(blob, `transactions_${new Date().toISOString().split('T')[0]}.csv`);
                return true;
            } catch (error) {
                console.error('Error exporting CSV:', error);
                return false;
            }
        },

        downloadFile(blob, filename) {
            try {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } catch (error) {
                console.error('Error downloading file:', error);
            }
        }
    },

    /**
     * Notification Utilities
     */
    NotificationUtils: {
        // Request notification permission
        async requestPermission() {
            if (!('Notification' in window)) {
                console.warn('This browser does not support notifications');
                return false;
            }
            
            if (Notification.permission === 'granted') {
                return true;
            }
            
            if (Notification.permission === 'denied') {
                return false;
            }
            
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        },
        
        // Show notification
        showNotification(title, options = {}) {
            if (Notification.permission === 'granted') {
                const defaultOptions = {
                    icon: '/LogoFinance.png',
                    badge: '/LogoFinance.png',
                    tag: 'finance-app',
                    requireInteraction: false,
                    ...options
                };
                
                return new Notification(title, defaultOptions);
            }
            return null;
        },
        
        // Schedule reminder notification
        scheduleReminder(message, delayMinutes = 60) {
            if ('serviceWorker' in navigator && 'Notification' in window) {
                setTimeout(() => {
                    this.showNotification('💰 Nhắc nhở tài chính', {
                        body: message,
                        tag: 'reminder',
                        requireInteraction: true,
                        actions: [
                            {
                                action: 'add-expense',
                                title: '💸 Thêm chi tiêu'
                            },
                            {
                                action: 'add-income', 
                                title: '💰 Thêm thu nhập'
                            }
                        ]
                    });
                }, delayMinutes * 60 * 1000);
            }
        },
        
        // Quick action notifications
        showQuickAddNotification() {
            this.showNotification('💰 Thêm giao dịch nhanh', {
                body: 'Nhấn để mở form nhập nhanh',
                tag: 'quick-add',
                requireInteraction: true,
                onclick: () => {
                    window.open('/quick-add.html', '_blank');
                }
            });
        }
    },

    /**
     * Widget Utilities for PWA
     */
    WidgetUtils: {
        // Add to home screen prompt
        async addToHomeScreen() {
            if (window.deferredPrompt) {
                window.deferredPrompt.prompt();
                const choiceResult = await window.deferredPrompt.userChoice;
                
                if (choiceResult.outcome === 'accepted') {
                    Utils.UIUtils.showMessage('Đã thêm vào màn hình chính!', 'success');
                }
                
                window.deferredPrompt = null;
            } else {
                Utils.UIUtils.showMessage('Ứng dụng đã được cài đặt hoặc trình duyệt không hỗ trợ', 'info');
            }
        },
        
        // Check if app is installed
        isInstalled() {
            return window.matchMedia('(display-mode: standalone)').matches ||
                   window.navigator.standalone === true;
        },
        
        // Register background sync for offline transactions
        async registerBackgroundSync(data) {
            if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
                try {
                    const registration = await navigator.serviceWorker.ready;
                    
                    // Store transaction data for background sync
                    this.storePendingTransaction(data);
                    
                    // Register sync event
                    await registration.sync.register('background-transaction');
                    
                    Utils.UIUtils.showMessage('Giao dịch sẽ được đồng bộ khi có kết nối', 'info');
                    return true;
                } catch (error) {
                    console.error('Background sync registration failed:', error);
                    return false;
                }
            }
            return false;
        },
        
        // Store pending transaction for offline sync
        storePendingTransaction(transaction) {
            const pending = Utils.StorageUtils.load('pending_transactions', []);
            pending.push({
                ...transaction,
                timestamp: Date.now(),
                id: Utils.UIUtils.generateId()
            });
            Utils.StorageUtils.save('pending_transactions', pending);
        }
    },

    /**
     * Theme Utilities
     */
    ThemeUtils: {
        applyTheme(theme) {
            const body = document.body;
            if (!body) return;

            let actualTheme = theme;
            
            if (theme === 'auto') {
                actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }

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

            // Listen for system theme changes
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
                if (this.getCurrentTheme() === 'auto') {
                    this.applyTheme('auto');
                }
            });
        }
    }
};

// ==========================================
// PWA CODE - GLOBAL SCOPE
// ==========================================

// Global variables for PWA
window.deferredPrompt = null;

// Listen for beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.deferredPrompt = e;
    Utils.UIUtils.showMessage('💡 Cài đặt ứng dụng để trải nghiệm tốt hơn!', 'info', 5000);
});

// Check if app is launched from home screen
window.addEventListener('appinstalled', () => {
    Utils.UIUtils.showMessage('🎉 Ứng dụng đã được cài đặt thành công!', 'success');
    window.deferredPrompt = null;
});

console.log("🛠️ Complete Utils loaded successfully.");

/**
 * Update Manager - Quản lý cập nhật ứng dụng
 */
Utils.UpdateManager = {
    currentVersion: '1.0.2', // Sync với version trong sw.js
    swRegistration: null,
    isUpdateAvailable: false,
    isRefreshing: false,

    /**
     * Khởi tạo update manager
     */
    init() {
        if ('serviceWorker' in navigator) {
            this.registerServiceWorker();
            this.setupUpdateDetection();
            this.checkForUpdatesOnFocus();
        }
    },

    /**
     * Đăng ký Service Worker với update detection
     */
    async registerServiceWorker() {
        try {
            console.log('🔧 UpdateManager: Registering service worker...');
            
            // Register service worker
            this.swRegistration = await navigator.serviceWorker.register('./sw.js');
            
            console.log('✅ UpdateManager: Service worker registered');
            
            // Check for updates immediately
            await this.checkForUpdates();
            
            // Setup auto-check for updates every 30 seconds when tab is active
            setInterval(() => {
                if (!document.hidden) {
                    this.checkForUpdates();
                }
            }, 30000);
            
        } catch (error) {
            console.error('❌ UpdateManager: Service worker registration failed:', error);
        }
    },

    /**
     * Setup update detection events
     */
    setupUpdateDetection() {
        if (!navigator.serviceWorker) return;

        // Listen for new service worker
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('🔄 UpdateManager: Controller changed');
            if (this.isRefreshing) return;
            this.isRefreshing = true;
            
            this.showUpdateAppliedMessage();
            
            // Refresh after short delay
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        });

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', event => {
            this.handleServiceWorkerMessage(event.data);
        });

        // Check when page becomes visible again
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                setTimeout(() => this.checkForUpdates(), 1000);
            }
        });
    },

    /**
     * Xử lý tin nhắn từ Service Worker
     */
    handleServiceWorkerMessage(data) {
        console.log('💬 UpdateManager: Message from SW:', data);
        
        switch (data.type) {
            case 'SW_UPDATED':
                console.log('🆕 UpdateManager: Service worker updated to version', data.version);
                this.showUpdateNotification();
                break;
                
            case 'FORCE_UPDATE_COMPLETE':
                this.showUpdateAppliedMessage();
                setTimeout(() => window.location.reload(), 1500);
                break;
                
            case 'SYNC_AVAILABLE':
                this.handleSyncAvailable();
                break;
        }
    },

    /**
     * Kiểm tra cập nhật
     */
    async checkForUpdates() {
        if (!this.swRegistration) return;

        try {
            // Force check for updates
            await this.swRegistration.update();
            
            // Check if there's a waiting service worker
            if (this.swRegistration.waiting) {
                console.log('🆕 UpdateManager: Update available');
                this.isUpdateAvailable = true;
                this.showUpdateNotification();
            }
            
        } catch (error) {
            console.error('❌ UpdateManager: Update check failed:', error);
        }
    },

    /**
     * Hiển thị thông báo cập nhật
     */
    showUpdateNotification() {
        if (this.isUpdateAvailable && document.getElementById('update-notification')) return; // Tránh hiển thị nhiều lần nếu đã có
        
        this.isUpdateAvailable = true;
        
        // Tạo notification bar
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
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            ">
                <div style="flex: 1;">
                    <strong>🆕 Có phiên bản mới!</strong>
                    <span style="margin-left: 0.5rem; font-size: 0.9rem;">
                        Nhấn "Cập nhật" để sử dụng tính năng mới nhất
                    </span>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button onclick="Utils.UpdateManager.applyUpdate()" style="
                        background: white;
                        color: #3b82f6;
                        border: none;
                        padding: 0.5rem 1rem;
                        border-radius: 6px;
                        font-weight: 600;
                        cursor: pointer;
                        font-size: 0.9rem;
                    ">
                        🔄 Cập nhật ngay
                    </button>
                    <button onclick="Utils.UpdateManager.dismissUpdate()" style="
                        background: rgba(255,255,255,0.2);
                        color: white;
                        border: none;
                        padding: 0.5rem 1rem;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 0.9rem;
                    ">
                        ⏰ Để sau
                    </button>
                </div>
            </div>
        `;
        
        // Remove existing notification
        const existing = document.getElementById('update-notification');
        if (existing) {
            existing.remove();
        }
        
        document.body.appendChild(updateBar);
        
        // Auto dismiss after 30 seconds
        setTimeout(() => {
            // Only dismiss if the bar still exists (user might have clicked a button)
            if (document.getElementById('update-notification')) {
                this.dismissUpdate();
            }
        }, 30000);
    },

    /**
     * Áp dụng cập nhật
     */
    async applyUpdate() {
        try {
            console.log('🔄 UpdateManager: Applying update...');
            
            this.showLoadingMessage('Đang cập nhật ứng dụng...');
            
            if (this.swRegistration && this.swRegistration.waiting) {
                // Tell the waiting service worker to skip waiting
                this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            
            // Remove notification
            this.dismissUpdate();
            
        } catch (error) {
            console.error('❌ UpdateManager: Failed to apply update:', error);
            Utils.UIUtils.showMessage('Có lỗi khi cập nhật. Vui lòng thử lại.', 'error');
        }
    },

    /**
     * Ẩn thông báo cập nhật
     */
    dismissUpdate() {
        const updateBar = document.getElementById('update-notification');
        if (updateBar) {
            updateBar.style.animation = 'slideUpAndFade 0.3s ease forwards';
            setTimeout(() => updateBar.remove(), 300);
        }
        this.isUpdateAvailable = false; // Allow re-showing if detected again later
    },

    /**
     * Hiển thị tin nhắn loading
     */
    showLoadingMessage(message) {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'update-loading';
        loadingDiv.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                color: white;
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            ">
                <div style="
                    background: rgba(255,255,255,0.1);
                    backdrop-filter: blur(10px);
                    padding: 2rem;
                    border-radius: 16px;
                    text-align: center;
                    border: 1px solid rgba(255,255,255,0.2);
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
                    <div style="font-size: 1.1rem; font-weight: 500;">
                        ${message}
                    </div>
                </div>
            </div>
        `;
        
        const existingLoading = document.getElementById('update-loading');
        if (existingLoading) existingLoading.remove();

        document.body.appendChild(loadingDiv);
    },

    /**
     * Hiển thị thông báo cập nhật thành công
     */
    showUpdateAppliedMessage() {
        const loadingDiv = document.getElementById('update-loading');
        if (loadingDiv) loadingDiv.remove();
        Utils.UIUtils.showMessage('✅ Ứng dụng đã được cập nhật!', 'success', 2000);
    },

    /**
     * Force refresh toàn bộ cache
     */
    async forceRefresh() {
        try {
            console.log('🔄 UpdateManager: Force refresh requested');
            
            this.showLoadingMessage('Đang làm mới ứng dụng...');
            
            // Send message to service worker
            if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'FORCE_UPDATE'
                });
            } else {
                // Fallback: clear cache manually and reload
                if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    await Promise.all(
                        cacheNames.map(name => caches.delete(name))
                    );
                }
                window.location.reload(true);
            }
            
        } catch (error) {
            console.error('❌ UpdateManager: Force refresh failed:', error);
            // Fallback to hard refresh
            window.location.reload(true);
        }
    },

    /**
     * Kiểm tra version hiện tại
     */
    async checkVersion() {
        try {
            if (!navigator.serviceWorker.controller) return null;
            
            const messageChannel = new MessageChannel();
            
            return new Promise((resolve) => {
                messageChannel.port1.onmessage = (event) => {
                    resolve(event.data);
                };
                
                navigator.serviceWorker.controller.postMessage(
                    { type: 'CHECK_VERSION' },
                    [messageChannel.port2]
                );
                
                // Timeout after 5 seconds
                setTimeout(() => resolve(null), 5000);
            });
            
        } catch (error) {
            console.error('❌ UpdateManager: Version check failed:', error);
            return null;
        }
    },

    /**
     * Xử lý sync available
     */
    handleSyncAvailable() {
        console.log('🔄 UpdateManager: Sync available');
        // Implement sync logic if needed
    },

    /**
     * Thiết lập kiểm tra cập nhật khi focus
     */
    checkForUpdatesOnFocus() {
        let lastFocusTime = Date.now();
        
        window.addEventListener('focus', () => {
            const now = Date.now();
            // Chỉ check nếu đã mất focus > 30 giây
            if (now - lastFocusTime > 30000) {
                setTimeout(() => this.checkForUpdates(), 1000);
            }
            lastFocusTime = now;
        });
    },

    /**
     * Thêm nút force refresh vào settings (optional)
     */
    addForceRefreshButton() {
        // This can be called from settings module to add a force refresh button
        const button = document.createElement('button');
        button.innerHTML = '🔄 Làm mới ứng dụng';
        button.className = 'action-btn import'; // Re-use existing styles if appropriate
        button.style.marginTop = '1rem';
        button.onclick = () => {
            if (confirm('Bạn có chắc muốn làm mới toàn bộ ứng dụng? Điều này sẽ tải lại tất cả dữ liệu mới nhất.')) {
                this.forceRefresh();
            }
        };
        return button;
    }
};

// CSS cho animations
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

// Inject CSS
if (!document.getElementById('update-animation-css')) {
    const styleElement = document.createElement('div'); // Changed to div as per original, though style tag is more appropriate for CSS
    styleElement.id = 'update-animation-css';
    styleElement.innerHTML = updateAnimationCSS;
    document.head.appendChild(styleElement);
}
