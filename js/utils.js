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
					return new Intl.NumberFormat('vi-VN', {
						style: 'currency',
						currency: 'VND',
						minimumFractionDigits: 0,
						maximumFractionDigits: 0
					}).format(num);
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
				return num.toLocaleString('en-US'); // kết quả: 222,222
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

console.log("🛠️ Complete Utils loaded successfully.");