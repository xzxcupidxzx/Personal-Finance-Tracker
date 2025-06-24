/**
 * FINANCIAL APP UTILITIES - FIXED VERSION
 * Sửa lỗi CSV parsing, export, và validation
 */

// ===== CONSTANTS =====
const CONFIG = {
    USD_TO_VND_RATE: 25000,
    USD_RATE_MIN: 1000,
    USD_RATE_MAX: 50000,
    // ==========================================================
    // === THAY ĐỔI: Đổi tên các giá trị của danh mục hệ thống ===
    // ==========================================================
    TRANSFER_CATEGORY_OUT: "Danh mục hệ thống chi 1",
    TRANSFER_CATEGORY_IN: "Danh mục hệ thống thu 1",
    RECONCILE_ADJUST_INCOME_CAT: "Danh mục hệ thống thu 2",
    RECONCILE_ADJUST_EXPENSE_CAT: "Danh mục hệ thống chi 2",
    // ==========================================================
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
            try { 
                localStorage.setItem(key, JSON.stringify(data)); 
                return true; 
            } catch (error) { 
                console.error(`Error saving ${key}:`, error); 
                return false; 
            }
        },
        load(key, defaultValue = null) {
            try { 
                const data = localStorage.getItem(key); 
                return data ? JSON.parse(data) : defaultValue; 
            } catch (error) { 
                console.error(`Error loading ${key}:`, error); 
                return defaultValue; 
            }
        },
        remove(key) {
            try { 
                localStorage.removeItem(key); 
                return true; 
            } catch (error) { 
                console.error(`Error removing ${key}:`, error); 
                return false; 
            }
        },
        clearAll() {
            try { 
                Object.values(CONFIG.STORAGE_KEYS).forEach(key => localStorage.removeItem(key)); 
                return true; 
            } catch (error) { 
                console.error('Error clearing storage:', error); 
                return false; 
            }
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

    // ========== FIXED CSV UTILS ==========
    CSVUtils: {
        /**
         * SỬA LỖI: Enhanced CSV parser with robust handling of quotes and delimiters
         */
        parse(csvText) {
            if (!csvText || typeof csvText !== 'string') {
                return [];
            }

            const lines = csvText.trim().split(/\r\n|\n/).filter(line => line.trim() !== '');
            if (lines.length < 2) {
                throw new Error("File CSV cần ít nhất một dòng tiêu đề và một dòng dữ liệu.");
            }

            // Detect delimiter
            const headerLine = lines[0];
            const delimiter = this.detectDelimiter(headerLine);
            
            // Parse header
            const headers = this.parseCsvLine(headerLine, delimiter)
                .map(h => h.trim().toLowerCase());
            
            const results = [];

            // Parse data lines
            for (let i = 1; i < lines.length; i++) {
                try {
                    const values = this.parseCsvLine(lines[i], delimiter);
                    
                    if (values.length === 0) continue; // Skip empty lines
                    
                    const rowObject = {};
                    headers.forEach((header, index) => {
                        rowObject[header] = values[index] || '';
                    });
                    
                    results.push(rowObject);
                } catch (error) {
                    console.warn(`CSV parsing error at line ${i + 1}:`, error.message);
                    // Continue parsing other lines
                }
            }

            return results;
        },

        /**
         * Detect CSV delimiter
         */
        detectDelimiter(line) {
            const delimiters = [',', ';', '\t', '|'];
            let bestDelimiter = ',';
            let maxCount = 0;

            delimiters.forEach(delimiter => {
                // Count occurrences outside of quotes
                let count = 0;
                let inQuotes = false;
                
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === delimiter && !inQuotes) {
                        count++;
                    }
                }
                
                if (count > maxCount) {
                    maxCount = count;
                    bestDelimiter = delimiter;
                }
            });

            return bestDelimiter;
        },

        /**
         * SỬA LỖI: Robust CSV line parser that handles quotes properly
         */
        parseCsvLine(line, delimiter = ',') {
            const result = [];
            let current = '';
            let inQuotes = false;
            let i = 0;

            while (i < line.length) {
                const char = line[i];
                const nextChar = line[i + 1];

                if (char === '"') {
                    if (inQuotes && nextChar === '"') {
                        // Escaped quote
                        current += '"';
                        i += 2;
                    } else {
                        // Toggle quote state
                        inQuotes = !inQuotes;
                        i++;
                    }
                } else if (char === delimiter && !inQuotes) {
                    // Field separator
                    result.push(current.trim());
                    current = '';
                    i++;
                } else {
                    // Regular character
                    current += char;
                    i++;
                }
            }

            // Add the last field
            result.push(current.trim());

            return result;
        },

        /**
         * SỬA LỖI: Generate CSV with proper escaping
         */
        stringify(data, headers = null) {
            if (!Array.isArray(data) || data.length === 0) {
                return '';
            }

            const actualHeaders = headers || Object.keys(data[0]);
            const csvLines = [];

            // Add header
            csvLines.push(actualHeaders.map(h => this.escapeField(h)).join(','));

            // Add data rows
            data.forEach(row => {
                const values = actualHeaders.map(header => {
                    const value = row[header];
                    return this.escapeField(value);
                });
                csvLines.push(values.join(','));
            });

            return csvLines.join('\n');
        },

        /**
         * Properly escape CSV field
         */
        escapeField(value) {
            if (value === null || value === undefined) {
                return '';
            }

            const str = String(value);
            
            // If field contains comma, quote, or newline, wrap in quotes
            if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
                // Escape internal quotes by doubling them
                const escaped = str.replace(/"/g, '""');
                return `"${escaped}"`;
            }

            return str;
        }
    },

    // ========== ENHANCED PARSING UTILS ==========
    ParsingUtils: {
        /**
         * SỬA LỖI: More robust flexible date parsing
         */
        parseFlexibleDate(dateString) {
            if (!dateString || typeof dateString !== 'string') return null;

            const ds = dateString.trim();
            
            // Try standard Date constructor first
            let date = new Date(ds);
            if (!isNaN(date.getTime()) && date.getFullYear() > 1900) {
                return date;
            }

            // Try various date formats
            const formats = [
                // DD/MM/YYYY or DD-MM-YYYY
                /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/,
                // MM/DD/YYYY or MM-DD-YYYY  
                /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/,
                // YYYY/MM/DD or YYYY-MM-DD
                /^(\d{4})[./-](\d{1,2})[./-](\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/
            ];

            for (const format of formats) {
                const match = ds.match(format);
                if (match) {
                    let year, month, day, hour = 0, minute = 0, second = 0;
                    
                    if (format.source.startsWith('^(\\d{4})')) {
                        // YYYY-MM-DD format
                        [, year, month, day, hour = 0, minute = 0, second = 0] = match;
                    } else {
                        // DD/MM/YYYY or MM/DD/YYYY - assume DD/MM/YYYY for international format
                        [, day, month, year, hour = 0, minute = 0, second = 0] = match;
                    }
                    
                    year = parseInt(year, 10);
                    month = parseInt(month, 10) - 1; // JS months are 0-based
                    day = parseInt(day, 10);
                    hour = parseInt(hour, 10);
                    minute = parseInt(minute, 10);
                    second = parseInt(second, 10);
                    
                    // Validate ranges
                    if (year >= 1900 && year <= 2100 && 
                        month >= 0 && month <= 11 && 
                        day >= 1 && day <= 31 &&
                        hour >= 0 && hour <= 23 &&
                        minute >= 0 && minute <= 59 &&
                        second >= 0 && second <= 59) {
                        
                        date = new Date(year, month, day, hour, minute, second);
                        if (!isNaN(date.getTime())) {
                            return date;
                        }
                    }
                }
            }
            
            return null;
        },

        /**
         * SỬA LỖI: Enhanced amount parsing with better number detection
         */
        parseFlexibleAmount(amountString) {
            if (!amountString || typeof amountString !== 'string') return 0;
            
            let cleanStr = amountString.trim();
            
            // Remove currency symbols and common text
            cleanStr = cleanStr.replace(/[₫$€£¥%]/g, '');
            cleanStr = cleanStr.replace(/\s+/g, '');
            
            // Handle negative signs
            const isNegative = cleanStr.includes('-') || cleanStr.includes('(');
            cleanStr = cleanStr.replace(/[-()]/g, '');
            
            // Determine decimal separator
            const lastComma = cleanStr.lastIndexOf(',');
            const lastDot = cleanStr.lastIndexOf('.');
            
            if (lastComma > lastDot) {
                // European format: 1.234.567,89
                cleanStr = cleanStr.replace(/\./g, '').replace(',', '.');
            } else if (lastDot > lastComma) {
                // US format: 1,234,567.89
                cleanStr = cleanStr.replace(/,/g, '');
            } else if (lastComma !== -1 && lastDot === -1) {
                // Only comma - could be thousands or decimal
                const commaPos = cleanStr.indexOf(',');
                const afterComma = cleanStr.substring(commaPos + 1);
                
                if (afterComma.length <= 2 && !/\d{4,}/.test(cleanStr.substring(0, commaPos))) {
                    // Likely decimal separator
                    cleanStr = cleanStr.replace(',', '.');
                } else {
                    // Likely thousands separator
                    cleanStr = cleanStr.replace(/,/g, '');
                }
            }
            
            // Final cleanup - only keep digits and one decimal point
            const match = cleanStr.match(/^\d*\.?\d*$/);
            if (!match) return 0;
            
            const amount = parseFloat(cleanStr);
            if (isNaN(amount)) return 0;
            
            return isNegative ? -Math.abs(amount) : Math.abs(amount);
        }
    },

    // ========== CURRENCY ==========
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
                        currency, 
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
                    let formattedNum, unit = '';
                    
                    if (absNum < 1000) { 
                        formattedNum = new Intl.NumberFormat('vi-VN').format(absNum); 
                        return sign + formattedNum; 
                    } else if (absNum < 1000000) { 
                        formattedNum = (absNum / 1000).toFixed(0); 
                        unit = ' Ng'; 
                    } else if (absNum < 1000000000) { 
                        formattedNum = (absNum / 1000000).toFixed(1); 
                        unit = ' Tr'; 
                    } else { 
                        formattedNum = (absNum / 1000000000).toFixed(2); 
                        unit = ' Tỷ'; 
                    }
                    return sign + formattedNum + unit;
                } else {
                    return new Intl.NumberFormat('en-US', { 
                        style: 'currency', 
                        currency, 
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
                if (currency === 'USD') return amount * CONFIG.USD_TO_VND_RATE;
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
                if (fromCurrency === 'USD' && toCurrency === 'VND') return amount * CONFIG.USD_TO_VND_RATE;
                if (fromCurrency === 'VND' && toCurrency === 'USD') return amount / CONFIG.USD_TO_VND_RATE;
                return amount;
            } catch (error) { 
                console.error('convertCurrency error:', error); 
                return amount; 
            }
        }
    },

    // ========== DATE ==========
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
                return { time: `${hours}:${minutes}`, date: `${day}-${month}-${year}` };
            } catch (error) { 
                return { time: '00:00', date: '00-00-00' }; 
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
					const dayOfWeek = now.getDay(); // 0 (CN) -> 6 (T7)
					// Nếu là Chủ Nhật (0), coi như là ngày thứ 7 của tuần.
					const mondayOffset = now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
					start = new Date(now.getFullYear(), now.getMonth(), mondayOffset);
					start.setHours(0, 0, 0, 0); // Đảm bảo bắt đầu từ 00:00:00
					end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
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

    // ========== UI ==========
    UIUtils: {
        categoryIcons: {
            "Lương": "fa-solid fa-wallet",
            "Thưởng": "fa-solid fa-gift",
            "Tiền được trả nợ": "fa-solid fa-hand-holding-dollar",
            "Lãi tiết kiệm": "fa-solid fa-piggy-bank",
            "Thu nhập từ đầu tư": "fa-solid fa-arrow-trend-up",
            "Thu nhập phụ": "fa-solid fa-briefcase",
            "Thu nhập khác": "fa-solid fa-ellipsis",
            "Nhận tiền chuyển": "fa-solid fa-arrow-down-to-bracket",
            "Ăn uống": "fa-solid fa-utensils",
            "Đi lại": "fa-solid fa-car",
            "Nhà ở": "fa-solid fa-house",
            "Hóa đơn": "fa-solid fa-file-invoice-dollar",
            "Mua sắm": "fa-solid fa-cart-shopping",
            "Giải trí": "fa-solid fa-gamepad",
            "Sức khỏe": "fa-solid fa-heart-pulse",
            "Giáo dục": "fa-solid fa-graduation-cap",
            "Chi cho đầu tư": "fa-solid fa-arrow-trend-down",
            "Trả nợ": "fa-solid fa-money-bill-transfer",
            "Chi phí khác": "fa-solid fa-ellipsis",
            "Điều chỉnh Đối Soát (Thu)": "fa-solid fa-file-circle-plus",
            "Điều chỉnh Đối Soát (Chi)": "fa-solid fa-file-circle-minus",
            "Tiền mặt": "fa-solid fa-money-bill-wave",
            "Momo": "fa-solid fa-mobile-screen-button",
            "Thẻ tín dụng": "fa-regular fa-credit-card",
            "Techcombank": "fa-solid fa-building-columns",
            "BIDV": "fa-solid fa-building-columns",
            "Khác": "fa-solid fa-circle-question"
        },
        
		getCategoryIcon(category) {
			const categoryObject = (typeof category === 'object' && category !== null) ? category : null;
			const categoryName = categoryObject ? categoryObject.value : category;

			// --- ƯU TIÊN SỐ 1: Luôn dùng thuộc tính .icon nếu tồn tại trên đối tượng ---
			if (categoryObject && categoryObject.icon) {
				const customIcon = categoryObject.icon;

				// Kiểm tra xem icon có phải là ảnh (data:image, URL) hay không
				if (customIcon.startsWith('data:image') || customIcon.includes('/')) {
					return { type: 'img', value: customIcon, unicode: '🖼️' };
				}

				// Nếu là class Font Awesome, tìm thông tin chi tiết (bao gồm cả unicode)
				for (const set of this.getIconList()) {
					const found = set.icons.find(i => i.class === customIcon);
					if (found) {
						return { type: 'fa', value: found.class, unicode: found.unicode };
					}
				}

				// Nếu là class Font Awesome nhưng không có trong danh sách, vẫn trả về để hiển thị
				return { type: 'fa', value: customIcon, unicode: '?' };
			}

			// --- ƯU TIÊN SỐ 2: Nếu không có .icon, tìm icon mặc định theo TÊN ---
			if (categoryName) {
				for (const set of this.getIconList()) {
					const found = set.icons.find(i => i.name.toLowerCase() === String(categoryName).trim().toLowerCase());
					if (found) {
						return { type: 'fa', value: found.class, unicode: found.unicode };
					}
				}
			}

			// --- ƯU TIÊN SỐ 3: Icon dự phòng cuối cùng nếu không tìm thấy gì ---
			return { type: 'fa', value: 'fa-solid fa-box', unicode: '\uf466' };
		},
        
		getIconList() {
			return [
				{
					set: "Tài chính & Tiền tệ",
					icons: [
						{ name: "Lương", class: "fa-solid fa-wallet", unicode: "\uf555" },
						{ name: "Thưởng", class: "fa-solid fa-gift", unicode: "\uf06b" },
						{ name: "Tiền được trả nợ", class: "fa-solid fa-hand-holding-dollar", unicode: "\uf4c0" },
						{ name: "Lãi tiết kiệm", class: "fa-solid fa-piggy-bank", unicode: "\uf4d3" },
						{ name: "Thu nhập từ đầu tư", class: "fa-solid fa-arrow-trend-up", unicode: "\ue098" },
						{ name: "Chi cho đầu tư", class: "fa-solid fa-arrow-trend-down", unicode: "\ue097" },
						{ name: "Hóa đơn", class: "fa-solid fa-file-invoice-dollar", unicode: "\uf571" },
						{ name: "Tiền mặt", class: "fa-solid fa-money-bill-wave", unicode: "\uf53a" },
						{ name: "Thẻ tín dụng", class: "fa-regular fa-credit-card", unicode: "\uf09d" },
						{ name: "Ngân hàng", class: "fa-solid fa-building-columns", unicode: "\uf19c" },
						{ name: "Techcombank", class: "fa-solid fa-building-columns", unicode: "\uf19c" },
						{ name: "BIDV", class: "fa-solid fa-building-columns", unicode: "\uf19c" },
					]
				},
				{
					set: "Ăn uống",
					icons: [
						{ name: "Ăn uống", class: "fa-solid fa-utensils", unicode: "\uf2e7" },
						{ name: "Cà phê", class: "fa-solid fa-mug-saucer", unicode: "\uf0f4" },
						{ name: "Đồ uống", class: "fa-solid fa-martini-glass-citrus", unicode: "\uf561" },
					]
				},
				{
					set: "Di chuyển & Du lịch",
					icons: [
						{ name: "Đi lại", class: "fa-solid fa-car", unicode: "\uf1b9" },
						{ name: "Xăng dầu", class: "fa-solid fa-gas-pump", unicode: "\uf52f" },
						{ name: "Du lịch", class: "fa-solid fa-umbrella-beach", unicode: "\uf5ca" },
					]
				},
				{
					set: "Gia đình & Nhà cửa",
					icons: [
						{ name: "Nhà ở", class: "fa-solid fa-house", unicode: "\uf015" },
						{ name: "Gia đình", class: "fa-solid fa-people-roof", unicode: "\ue532" },
						{ name: "Thú cưng", class: "fa-solid fa-paw", unicode: "\uf1b0" },
					]
				},
				{
					set: "Mua sắm & Giải trí",
					icons: [
						{ name: "Mua sắm", class: "fa-solid fa-cart-shopping", unicode: "\uf07a" }, // Đã thêm unicode
						{ name: "Quần áo", class: "fa-solid fa-shirt", unicode: "\uf553" },        // Đã thêm unicode
						{ name: "Quà tặng", class: "fa-solid fa-gift", unicode: "\uf06b" },         // Đã thêm unicode
						{ name: "Giải trí", class: "fa-solid fa-gamepad", unicode: "\uf11b" },      // Đã thêm unicode
						{ name: "Xem phim", class: "fa-solid fa-film", unicode: "\uf008" },         // Đã thêm unicode
					]
				},
				{
					set: "Sức khỏe & Giáo dục",
					icons: [
						{ name: "Sức khỏe", class: "fa-solid fa-heart-pulse", unicode: "\uf21e" },
						{ name: "Bệnh viện", class: "fa-solid fa-hospital", unicode: "\uf0f8" },
						{ name: "Giáo dục", class: "fa-solid fa-graduation-cap", unicode: "\uf19d" },
						{ name: "Sách", class: "fa-solid fa-book", unicode: "\uf02d" },
					]
				},
				{
					set: "Hệ thống & Khác",
					icons: [
						{ name: "Thu nhập phụ", class: "fa-solid fa-briefcase", unicode: "\uf0b1" },
						{ name: "Trả nợ", class: "fa-solid fa-money-bill-transfer", unicode: "\ue528" },
						{ name: "Thu nhập khác", class: "fa-solid fa-ellipsis", unicode: "\uf141" },
						{ name: "Chi phí khác", class: "fa-solid fa-ellipsis", unicode: "\uf141" },
						{ name: "Nhận tiền chuyển khoản", class: "fa-solid fa-arrow-down-to-bracket", unicode: "\ue094" },
						{ name: "Chuyển tiền đi", class: "fa-solid fa-arrow-up-from-bracket", unicode: "\ue09a" },
						{ name: "Điều chỉnh Đối Soát (Thu)", class: "fa-solid fa-file-circle-plus", unicode: "\ue494" },
						{ name: "Điều chỉnh Đối Soát (Chi)", class: "fa-solid fa-file-circle-minus", unicode: "\ue493" },
						{ name: "Momo", class: "fa-solid fa-mobile-screen-button", unicode: "\uf3cd" },
						{ name: "Khác", class: "fa-solid fa-circle-question", unicode: "\uf059" },
					]
				}
			];
		},

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
                input.value = Utils.CurrencyUtils.formatAmountInput(value);
            }
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

    // ========== VALIDATION ==========
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
            return { isValid: errors.length === 0, errors };
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

    // ========== MATH ==========
    MathUtils: {
        calculatePercentageChange(oldValue, newValue) {
            const old = parseFloat(oldValue) || 0;
            const newVal = parseFloat(newValue) || 0;
            if (old === 0) return newVal === 0 ? 0 : 100;
            return Math.round(((newVal - old) / old) * 100);
        },

        calculatePercentage(value, total) {
            if (!total || total === 0) return 0;
            return Math.round((value / total) * 100);
        }
    },

    // ========== FIXED EXPORT UTILS ==========
    ExportUtils: {
        /**
         * SỬA LỖI: Enhanced JSON export with better error handling
         */
        exportJSON(data, filename = 'financial_data') {
            try {
                // Validate data before export
                if (!data || typeof data !== 'object') {
                    throw new Error('Dữ liệu export không hợp lệ');
                }

                // Clean data for export
                const cleanData = this.cleanDataForExport(data);
                
                // Add export metadata
                const exportData = {
                    ...cleanData,
                    exportInfo: {
                        exportedAt: new Date().toISOString(),
                        version: '2.0',
                        source: 'Financial App'
                    }
                };

                const jsonString = JSON.stringify(exportData, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
                
                this.downloadFile(blob, `${filename}_${new Date().toISOString().split('T')[0]}.json`);
                
                console.log('✅ JSON export successful');
                return true;
            } catch (error) { 
                console.error('❌ Error exporting JSON:', error); 
                Utils.UIUtils.showMessage(`Lỗi xuất JSON: ${error.message}`, 'error');
                return false; 
            }
        },

        /**
         * SỬA LỖI: Enhanced CSV export with proper formatting
         */
        exportCSV(transactions, accounts = []) {
            try {
                if (!Array.isArray(transactions)) {
                    throw new Error('Dữ liệu giao dịch không hợp lệ');
                }

                const headers = [
                    'Ngày giờ', 
                    'Loại', 
                    'Số tiền', 
                    'Hạng mục', 
                    'Tài khoản', 
                    'Mô tả',
                    'Ghi chú chuyển khoản'
                ];

                const csvData = transactions
                    .filter(tx => tx && typeof tx === 'object')
                    .map(tx => ({
                        'Ngày giờ': this.formatDateForCSV(tx.datetime),
                        'Loại': tx.type || '',
                        'Số tiền': this.formatAmountForCSV(tx.amount),
                        'Hạng mục': tx.category || '',
                        'Tài khoản': tx.account || '',
                        'Mô tả': this.cleanTextForCSV(tx.description || ''),
                        'Ghi chú chuyển khoản': tx.isTransfer ? 'Giao dịch chuyển khoản' : ''
                    }));

                const csvContent = Utils.CSVUtils.stringify(csvData, headers);
                
                // Add BOM for proper UTF-8 encoding
                const blob = new Blob(['\uFEFF' + csvContent], { 
                    type: 'text/csv;charset=utf-8;' 
                });
                
                this.downloadFile(blob, `transactions_${new Date().toISOString().split('T')[0]}.csv`);
                
                console.log(`✅ CSV export successful: ${transactions.length} transactions`);
                return true;
            } catch (error) { 
                console.error('❌ Error exporting CSV:', error); 
                Utils.UIUtils.showMessage(`Lỗi xuất CSV: ${error.message}`, 'error');
                return false; 
            }
        },

        /**
         * Clean data for export by removing sensitive or unnecessary fields
         */
        cleanDataForExport(data) {
            const cleaned = { ...data };
            
            // Remove sensitive data or clean up
            if (cleaned.settings) {
                // Remove sensitive settings
                delete cleaned.settings.apiKeys;
                delete cleaned.settings.tokens;
            }

            // Clean transactions
            if (Array.isArray(cleaned.transactions)) {
                cleaned.transactions = cleaned.transactions
                    .filter(tx => tx && typeof tx === 'object')
                    .map(tx => ({
                        id: tx.id,
                        datetime: tx.datetime,
                        type: tx.type,
                        category: tx.category,
                        amount: parseFloat(tx.amount) || 0,
                        account: tx.account,
                        description: tx.description || '',
                        originalAmount: parseFloat(tx.originalAmount) || parseFloat(tx.amount) || 0,
                        originalCurrency: tx.originalCurrency || 'VND',
                        isTransfer: Boolean(tx.isTransfer),
                        transferPairId: tx.transferPairId || null,
                        createdAt: tx.createdAt,
                        updatedAt: tx.updatedAt || null
                    }));
            }

            return cleaned;
        },

        /**
         * Format date for CSV export
         */
        formatDateForCSV(datetime) {
            try {
                const date = new Date(datetime);
                if (isNaN(date.getTime())) return datetime;
                
                return date.toLocaleString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch (error) {
                return datetime || '';
            }
        },

        /**
         * Format amount for CSV export
         */
        formatAmountForCSV(amount) {
            try {
                const num = parseFloat(amount);
                if (isNaN(num)) return '0';
                return num.toLocaleString('vi-VN');
            } catch (error) {
                return '0';
            }
        },

        /**
         * Clean text for CSV export
         */
        cleanTextForCSV(text) {
            if (!text) return '';
            return String(text)
                .replace(/[\r\n]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        },

        /**
         * SỬA LỖI: Enhanced download function with better error handling
         */
        downloadFile(blob, filename) {
            try {
                if (!blob || !filename) {
                    throw new Error('Thiếu thông tin file để tải');
                }

                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.style.display = 'none';
                
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                
                // Clean up object URL after a delay
                setTimeout(() => {
                    URL.revokeObjectURL(url);
                }, 1000);
                
                console.log(`✅ File download initiated: ${filename}`);
            } catch (error) { 
                console.error('❌ Error downloading file:', error);
                Utils.UIUtils.showMessage(`Lỗi tải file: ${error.message}`, 'error');
            }
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
        }
    },

    // ========== THEME ==========
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
 * ✅ FIXED UPDATE MANAGER
 */
Utils.UpdateManager = {
    currentVersion: '0.0.0',
    swRegistration: null,
    isUpdateAvailable: false,
    isRefreshing: false,
    swVersion: null,
    lastCheck: null,
    checkInterval: null,

    init(clientVersion = null) {
        console.log('🔄 UpdateManager: Initializing...');
        
        if (clientVersion && clientVersion !== '0.0.0') {
            this.currentVersion = clientVersion;
        }
        
        console.log(`📱 UpdateManager: Effective client version for checks: ${this.currentVersion}`);
        
        if ('serviceWorker' in navigator) {
            this.registerServiceWorker();
            this.setupUpdateDetection();
            this.checkForUpdatesOnFocus();
            
            this.checkInterval = setInterval(() => {
                if (!document.hidden) {
                    this.checkForUpdates();
                }
            }, 30000);
        } else {
            console.warn('⚠️ UpdateManager: Service Worker not supported');
        }
    },

    async registerServiceWorker() {
        try {
            console.log('📋 UpdateManager: Registering Service Worker...');

            this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
                updateViaCache: 'none'
            });

            console.log('✅ UpdateManager: Service Worker registered successfully. Scope:', this.swRegistration.scope);

            this.swRegistration.addEventListener('updatefound', () => {
                console.log('🆕 UpdateManager: Update found! Installing new worker.');
                const newWorker = this.swRegistration.installing;

                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        console.log(`[SW New] State changed: ${newWorker.state}`);
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('🎯 UpdateManager: New worker ready. Showing update notification.');
                            this.isUpdateAvailable = true;
                            this.showUpdateNotification();
                        }
                    });
                }
            });

            await this.checkForUpdates();

        } catch (error) {
            console.error('❌ UpdateManager: Failed to register Service Worker.', error);
        }
    },

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
                const waitingWorkerVersionInfo = await this.getVersionFromSpecificWorker(this.swRegistration.waiting);
                if (waitingWorkerVersionInfo && waitingWorkerVersionInfo.version) {
                    this.swVersion = waitingWorkerVersionInfo.version;
                }
                this.showUpdateNotification();
                return true;
            }
    
            await this.getVersionFromSW();
    
            if (this.swVersion === 'fallback-version') {
                console.error('❌ UpdateManager: Service Worker is using a fallback version.');
                this.isUpdateAvailable = false;
                this.dismissUpdate();
                return false;
            }
    
            console.log(`ℹ️ UpdateManager: Comparing versions - Client: ${this.currentVersion}, SW: ${this.swVersion}`);
            if (this.swVersion && this.swVersion !== this.currentVersion) {
                console.log(`🆕 UpdateManager: Version mismatch! Client: ${this.currentVersion}, SW: ${this.swVersion}`);
                this.isUpdateAvailable = true;
                this.showUpdateNotification();
                return true;
            }
    
            console.log('✅ UpdateManager: No updates available after checks.');
            this.isUpdateAvailable = false;
            this.dismissUpdate();
            return false;
    
        } catch (error) {
            console.error('❌ UpdateManager: Update check failed:', error);
            return false;
        }
    },

    async getVersionFromSpecificWorker(worker) {
        if (!worker) return null;
        return new Promise((resolve) => {
            const messageChannel = new MessageChannel();
            messageChannel.port1.onmessage = (event) => resolve(event.data);
            worker.postMessage({ type: 'CHECK_VERSION' }, [messageChannel.port2]);
            setTimeout(() => resolve(null), 2000);
        });
    },

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

    async applyUpdate() {
        console.log('🔄 UpdateManager: Applying update...');

        if (!this.isUpdateAvailable || !this.swRegistration || !this.swRegistration.waiting) {
            console.warn('applyUpdate called but no waiting worker found. Forcing refresh as a fallback.');
            await this.forceRefresh();
            return;
        }

        this.showLoadingMessage('Đang hoàn tất cập nhật... Vui lòng không tắt ứng dụng!');

        const waitingWorker = this.swRegistration.waiting;
        waitingWorker.postMessage({ type: 'SKIP_WAITING' });

        let refreshInterval = setInterval(async () => {
            if (!this.swRegistration.waiting) {
                if (this.swRegistration.active === waitingWorker || navigator.serviceWorker.controller === waitingWorker) {
                    clearInterval(refreshInterval);
                    console.log('✅ UpdateManager: New worker is now active. Reloading page!');
                    window.location.reload(true);
                }
            }
        }, 200);

        setTimeout(() => {
            clearInterval(refreshInterval);
            console.error('❌ UpdateManager: Update timed out after 10 seconds.');
            Utils.UIUtils.showMessage('Cập nhật thất bại. Vui lòng đóng hoàn toàn và mở lại ứng dụng.', 'error', 10000);
            const loadingDiv = document.getElementById('update-loading');
            if (loadingDiv) loadingDiv.remove();
        }, 10000);
    },

    dismissUpdate() {
        const updateBar = document.getElementById('update-notification');
        if (updateBar) {
            updateBar.remove();
        }
        this.isUpdateAvailable = false;
        console.log('👋 UpdateManager: Update notification dismissed');
    },

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

    showUpdateAppliedMessage() {
        const loadingDiv = document.getElementById('update-loading');
        if (loadingDiv) {
            loadingDiv.remove();
        }
        
        Utils.UIUtils.showMessage('✅ Ứng dụng đã được cập nhật thành công! Trang sẽ tự tải lại.', 'success', 3000);
    },

    async forceRefresh() {
        try {
            console.log('🔄 UpdateManager: Force refreshing application...');
            this.showLoadingMessage('Đang làm mới ứng dụng hoàn toàn...');

            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    await registration.unregister();
                    console.log('✅ Service Worker đã được gỡ bỏ.');
                }
            }

            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
                console.log('✅ Toàn bộ cache đã được xóa.');
            }

            Utils.UIUtils.showMessage('Đã dọn dẹp xong, đang tải lại...', 'success');
            
            setTimeout(() => {
                const url = new URL(window.location.href);
                url.searchParams.set('_force_reload', Date.now());
                window.location.href = url.href;
            }, 1500);

        } catch (error) {
            console.error('❌ UpdateManager: Force refresh thất bại:', error);
            Utils.UIUtils.showMessage('Lỗi khi làm mới, đang thử lại...', 'error');
            setTimeout(() => {
                const url = new URL(window.location.href);
                url.searchParams.set('_force_reload_fallback', Date.now());
                window.location.href = url.href;
            }, 1000);
        }
    },

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

    getVersionInfo() {
        return {
            currentVersion: this.currentVersion,
            swVersion: this.swVersion,
            isUpdateAvailable: this.isUpdateAvailable,
            lastCheck: this.lastCheck ? this.lastCheck.toLocaleString('vi-VN') : 'Chưa kiểm tra'
        };
    },

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

// Vietnamese Number Formatter
const VietnameseNumberFormatter = {
    formatVietnameseShort(amount, showCurrency = false) {
        if (!amount || isNaN(amount)) return showCurrency ? '0 ₫' : '0';
        
        const absAmount = Math.abs(amount);
        const sign = amount < 0 ? '-' : '';
        let result = '';

        if (absAmount >= 1000000000) {
            const billions = absAmount / 1000000000;
            if (billions >= 100) {
                result = `${sign}${Math.round(billions)} tỷ`;
            } else if (billions >= 10) {
                result = `${sign}${billions.toFixed(1)} tỷ`;
            } else {
                result = `${sign}${billions.toFixed(2)} tỷ`;
            }
        } else if (absAmount >= 1000000) {
            const millions = absAmount / 1000000;
            if (millions >= 100) {
                result = `${sign}${Math.round(millions)} tr`;
            } else if (millions >= 10) {
                result = `${sign}${millions.toFixed(1)} tr`;
            } else {
                result = `${sign}${millions.toFixed(2)} tr`;
            }
        } else if (absAmount >= 1000) {
            const thousands = absAmount / 1000;
            if (thousands >= 100) {
                result = `${sign}${Math.round(thousands)} ng`;
            } else if (thousands >= 10) {
                result = `${sign}${thousands.toFixed(1)} ng`;
            } else {
                result = `${sign}${thousands.toFixed(2)} ng`;
            }
        } else {
            result = `${sign}${Math.round(absAmount)}`;
        }

        return showCurrency ? `${result} ₫` : result;
    },

    formatTooltip(amount) {
        if (!amount || isNaN(amount)) return '0 ₫';
        
        const absAmount = Math.abs(amount);
        const sign = amount < 0 ? '-' : '';
        
        if (absAmount >= 1000000000) {
            const billions = absAmount / 1000000000;
            return `${sign}${billions.toFixed(2)} tỷ ₫`;
        } else if (absAmount >= 1000000) {
            const millions = absAmount / 1000000;
            return `${sign}${millions.toFixed(2)} triệu ₫`;
        } else if (absAmount >= 1000) {
            const thousands = absAmount / 1000;
            return `${sign}${thousands.toFixed(0)} nghìn ₫`;
        } else {
            return `${sign}${Math.round(absAmount)} ₫`;
        }
    },

    formatLegend(amount) {
        if (!amount || isNaN(amount)) return '0₫';
        
        const absAmount = Math.abs(amount);
        const sign = amount < 0 ? '-' : '';
        
        if (absAmount >= 1000000000) {
            const billions = absAmount / 1000000000;
            return `${sign}${billions.toFixed(1)}T₫`;
        } else if (absAmount >= 1000000) {
            const millions = absAmount / 1000000;
            return `${sign}${millions.toFixed(1)}M₫`;
        } else if (absAmount >= 1000) {
            const thousands = absAmount / 1000;
            return `${sign}${thousands.toFixed(0)}K₫`;
        } else {
            return `${sign}${Math.round(absAmount)}₫`;
        }
    },

    formatAxis(amount) {
        if (!amount || isNaN(amount)) return '0';
        
        const absAmount = Math.abs(amount);
        const sign = amount < 0 ? '-' : '';
        
        if (absAmount >= 1000000000) {
            const billions = absAmount / 1000000000;
            return `${sign}${billions.toFixed(0)}T`;
        } else if (absAmount >= 1000000) {
            const millions = absAmount / 1000000;
            return `${sign}${millions.toFixed(0)}M`;
        } else if (absAmount >= 1000) {
            const thousands = absAmount / 1000;
            return `${sign}${thousands.toFixed(0)}K`;
        } else {
            return `${sign}${Math.round(absAmount)}`;
        }
    }
};

// Thêm vào Utils.CurrencyUtils
if (typeof Utils !== 'undefined' && Utils.CurrencyUtils) {
    Utils.CurrencyUtils.formatVietnameseShort = VietnameseNumberFormatter.formatVietnameseShort;
    Utils.CurrencyUtils.formatTooltip = VietnameseNumberFormatter.formatTooltip;
    Utils.CurrencyUtils.formatLegend = VietnameseNumberFormatter.formatLegend;
    Utils.CurrencyUtils.formatAxis = VietnameseNumberFormatter.formatAxis;
}

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

console.log("✅ Utils.js with FIXED CSV, Export, and UpdateManager loaded.");