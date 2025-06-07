/**
 * FINANCIAL APP UTILITIES - UPDATED FOR ICON PICKER & ICON SETS
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
	// SỬA LỖI & CẢI TIẾN: Hàm phân tích CSV được viết lại hoàn toàn.
	CSVUtils: {
		/**
		 * Phân tích nội dung text của file CSV thành một mảng các đối tượng.
		 * @param {string} csvText - Nội dung file CSV.
		 * @returns {Array<Object>} Mảng các giao dịch đã được phân tích.
		 */
		parse(csvText) {
			if (!csvText || typeof csvText !== 'string') {
				return [];
			}

			// Tách các dòng, bỏ qua các dòng trống
			const lines = csvText.trim().split(/\r\n|\n/).filter(line => line.trim() !== '');
			if (lines.length < 2) {
				throw new Error("File CSV cần ít nhất một dòng tiêu đề và một dòng dữ liệu.");
			}

			const headerLine = lines.shift();
			// Xử lý dấu phân cách có thể là dấu phẩy hoặc chấm phẩy
			const delimiter = headerLine.includes(';') ? ';' : ',';
			const headers = headerLine.split(delimiter).map(h => h.trim().toLowerCase());
			
			const results = [];

			lines.forEach((line, index) => {
				// Biểu thức chính quy để xử lý các trường có dấu ngoặc kép chứa dấu phân cách
				const regex = new RegExp(`(\\"[^\\"]*\\"|[^\\${delimiter}\\"]+)(\\${delimiter}|$)`, 'g');
				const values = [];
				let match;
				while (match = regex.exec(line)) {
					let value = match[1];
					if (value.startsWith('"') && value.endsWith('"')) {
						value = value.substring(1, value.length - 1).replace(/""/g, '"');
					}
					values.push(value.trim());
				}

				if (values.length !== headers.length) {
					console.warn(`Dòng ${index + 2} có số cột không khớp với tiêu đề. Bỏ qua dòng này.`);
					return;
				}

				const rowObject = {};
				headers.forEach((header, i) => {
					rowObject[header] = values[i];
				});
				results.push(rowObject);
			});

			return results;
		}
	},
	// SỬA LỖI & CẢI TIẾN: Các hàm phân tích cú pháp linh hoạt hơn.
	ParsingUtils: {
		/**
		 * Chuyển đổi một chuỗi ngày tháng với nhiều định dạng khác nhau thành đối tượng Date.
		 * Hỗ trợ: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, và các biến thể có giờ.
		 * @param {string} dateString - Chuỗi ngày tháng cần chuyển đổi.
		 * @returns {Date|null} Đối tượng Date nếu thành công, null nếu thất bại.
		 */
		parseFlexibleDate(dateString) {
			if (!dateString || typeof dateString !== 'string') return null;

			const ds = dateString.trim();
			let date = new Date(ds);

			// Nếu new Date() parse thành công và hợp lệ (thường cho định dạng ISO, MM/DD/YYYY)
			if (!isNaN(date.getTime())) return date;

			// Thử parse định dạng DD/MM/YYYY
			const parts = ds.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
			if (parts) {
				// parts[1]=DD, parts[2]=MM, parts[3]=YYYY
				const day = parseInt(parts[1], 10);
				const month = parseInt(parts[2], 10) - 1; // Tháng trong JS bắt đầu từ 0
				const year = parseInt(parts[3], 10);
				const hour = parseInt(parts[4], 10) || 0;
				const minute = parseInt(parts[5], 10) || 0;
				const second = parseInt(parts[6], 10) || 0;
				
				// Kiểm tra tính hợp lệ của ngày tháng năm
				if (year > 1000 && month >= 0 && month < 12 && day > 0 && day <= 31) {
					date = new Date(year, month, day, hour, minute, second);
					if (!isNaN(date.getTime())) return date;
				}
			}
			
			return null; // Trả về null nếu không thể parse
		},

		/**
		 * Chuyển đổi một chuỗi tiền tệ có dấu phân cách (cả . và ,) thành số.
		 * Ví dụ: "1.200.000,50" hoặc "1,200,000.50" đều thành 1200000.5
		 * @param {string} amountString - Chuỗi tiền tệ.
		 * @returns {number} Số đã được chuyển đổi.
		 */
		parseFlexibleAmount(amountString) {
			if (!amountString || typeof amountString !== 'string') return 0;
			
			let cleanStr = amountString.trim();

			// Xác định dấu thập phân (dấu cuối cùng là . hoặc ,)
			const lastComma = cleanStr.lastIndexOf(',');
			const lastDot = cleanStr.lastIndexOf('.');
			
			if (lastComma > lastDot) {
				// Dấu phẩy là dấu thập phân (kiểu Việt Nam: 1.234,56)
				// Xóa hết dấu chấm, thay dấu phẩy bằng dấu chấm
				cleanStr = cleanStr.replace(/\./g, '').replace(',', '.');
			} else {
				// Dấu chấm là dấu thập phân (kiểu quốc tế: 1,234.56)
				// Xóa hết dấu phẩy
				cleanStr = cleanStr.replace(/,/g, '');
			}

			// Parse số sau khi đã làm sạch
			const amount = parseFloat(cleanStr);
			return isNaN(amount) ? 0 : amount;
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
			// Nếu category là object và có thuộc tính 'icon'
			if (typeof category === 'object' && category !== null && category.icon) {
				const iconIdentifier = category.icon;
				// Nếu là đường dẫn file ảnh
				if (iconIdentifier.includes('/') || iconIdentifier.includes('.')) {
					return { type: 'img', value: iconIdentifier };
				}
				// Nếu là class Font Awesome
				return { type: 'fa', value: iconIdentifier };
			}

			// --- Logic cũ để tìm icon mặc định ---
			const categoryName = (typeof category === 'object' && category !== null) ? category.value : category;
			if (!categoryName || typeof categoryName !== 'string' || categoryName.trim() === '') {
				return { type: 'fa', value: 'fa-solid fa-box' }; // Fallback
			}

			const cleanName = categoryName.trim();
			if (this.categoryIcons[cleanName]) {
				return { type: 'fa', value: this.categoryIcons[cleanName] };
			}

			return { type: 'fa', value: 'fa-solid fa-box' }; // Fallback cuối cùng
		},
        
        getIconList() {
            return [
                {
                    set: "Tài chính & Tiền tệ",
                    icons: [
                        { name: "Tiền mặt", class: "fa-solid fa-money-bill-wave" },
                        { name: "Ví tiền", class: "fa-solid fa-wallet" },
                        { name: "Thẻ tín dụng", class: "fa-regular fa-credit-card" },
                        { name: "Ngân hàng", class: "fa-solid fa-building-columns" },
                        { name: "Heo đất", class: "fa-solid fa-piggy-bank" },
                        { name: "Đồng Dollar", class: "fa-solid fa-dollar-sign" },
                        { name: "Đầu tư tăng", class: "fa-solid fa-arrow-trend-up" },
                        { name: "Đầu tư giảm", class: "fa-solid fa-arrow-trend-down" },
                        { name: "Hóa đơn", class: "fa-solid fa-file-invoice-dollar" },
                        { name: "Biểu đồ", class: "fa-solid fa-chart-pie" },
                    ]
                },
                {
                    set: "Ăn uống",
                    icons: [
                        { name: "Ăn uống chung", class: "fa-solid fa-utensils" },
                        { name: "Cà phê", class: "fa-solid fa-mug-saucer" },
                        { name: "Pizza", class: "fa-solid fa-pizza-slice" },
                        { name: "Bánh Hamburger", class: "fa-solid fa-burger" },
                        { name: "Đồ uống", class: "fa-solid fa-martini-glass-citrus" },
                        { name: "Bánh kem", class: "fa-solid fa-cake-candles" },
                    ]
                },
                {
                    set: "Di chuyển & Du lịch",
                    icons: [
                        { name: "Xe hơi", class: "fa-solid fa-car" },
                        { name: "Bus", class: "fa-solid fa-bus-simple" },
                        { name: "Xe máy", class: "fa-solid fa-motorcycle" },
                        { name: "Máy bay", class: "fa-solid fa-plane" },
                        { name: "Tàu hỏa", class: "fa-solid fa-train" },
                        { name: "Tàu thủy", class: "fa-solid fa-ship" },
                        { name: "Xăng dầu", class: "fa-solid fa-gas-pump" },
                        { name: "Du lịch", class: "fa-solid fa-umbrella-beach" },
                        { name: "Vali", class: "fa-solid fa-briefcase" },
                    ]
                },
                {
                    set: "Gia đình & Nhà cửa",
                    icons: [
                         { name: "Nhà", class: "fa-solid fa-house" },
                         { name: "Gia đình", class: "fa-solid fa-people-roof" },
                         { name: "Trẻ em", class: "fa-solid fa-children" },
                         { name: "Thú cưng", class: "fa-solid fa-paw" },
                         { name: "Điện", class: "fa-solid fa-bolt" },
                         { name: "Nước", class: "fa-solid fa-droplet" },
                    ]
                },
                {
                    set: "Mua sắm & Giải trí",
                    icons: [
                        { name: "Giỏ hàng", class: "fa-solid fa-cart-shopping" },
                        { name: "Quần áo", class: "fa-solid fa-shirt" },
                        { name: "Quà tặng", class: "fa-solid fa-gift" },
                        { name: "Trò chơi", class: "fa-solid fa-gamepad" },
                        { name: "Xem phim", class: "fa-solid fa-film" },
                        { name: "Âm nhạc", class: "fa-solid fa-music" },
                    ]
                },
                 {
                    set: "Sức khỏe & Giáo dục",
                    icons: [
                        { name: "Sức khỏe", class: "fa-solid fa-heart-pulse" },
                        { name: "Bệnh viện", class: "fa-solid fa-hospital" },
                        { name: "Thuốc", class: "fa-solid fa-pills" },
                        { name: "Giáo dục", class: "fa-solid fa-graduation-cap" },
                        { name: "Sách", class: "fa-solid fa-book" },
                    ]
                },
                {
                    set: "Công nghệ & Tiện ích",
                    icons: [
                        { name: "Điện thoại", class: "fa-solid fa-mobile-screen-button" },
                        { name: "Laptop", class: "fa-solid fa-laptop" },
                        { name: "Internet", class: "fa-solid fa-wifi" },
                    ]
                },
                {
                    set: "Hệ thống & Khác",
                    icons: [
                        { name: "Tag", class: "fa-solid fa-tag" },
                        { name: "Câu hỏi", class: "fa-solid fa-circle-question" },
                        { name: "Chuyển tiền đi", class: "fa-solid fa-arrow-up-from-bracket" },
                        { name: "Nhận tiền", class: "fa-solid fa-arrow-down-to-bracket" },
                        { name: "Điều chỉnh cộng", class: "fa-solid fa-file-circle-plus" },
                        { name: "Điều chỉnh trừ", class: "fa-solid fa-file-circle-minus" }
                    ]
                }
            ];
        },

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
 * ✅ FIXED UPDATE MANAGER - Sửa lỗi kiểm tra cập nhật
 */
Utils.UpdateManager = {
    // 🚨 Lấy version từ global APP_VERSION (từ version.js)
    // GitHub Action sẽ cập nhật giá trị chuỗi '1.0.3' này
    currentVersion: '0.0.0',
	swRegistration: null,
    isUpdateAvailable: false,
    isRefreshing: false,
    swVersion: null, // Version từ Service Worker
    lastCheck: null,
    checkInterval: null,

    // ✅ Khởi tạo với clientVersion từ app
    init(clientVersion = null) {
        console.log('🔄 UpdateManager: Initializing...');
        
        // Cập nhật currentVersion nếu được truyền vào (từ app.js, đã lấy từ settings)
        // Hoặc nếu GHA đã cập nhật trực tiếp currentVersion ở trên
        if (clientVersion && clientVersion !== '0.0.0') { // 0.0.0 là giá trị clientVersion mặc định trong FinancialApp
            this.currentVersion = clientVersion;
        }
        // Nếu clientVersion không hợp lệ, this.currentVersion vẫn giữ giá trị được GHA cập nhật hoặc APP_VERSION.
        
        console.log(`📱 UpdateManager: Effective client version for checks: ${this.currentVersion}`);
        
        if ('serviceWorker' in navigator) {
            this.registerServiceWorker();
            this.setupUpdateDetection();
            this.checkForUpdatesOnFocus();
            
            // Auto-check mỗi 30 giây
            this.checkInterval = setInterval(() => {
                if (!document.hidden) { // Chỉ kiểm tra khi tab đang active
                    this.checkForUpdates();
                }
            }, 30000); // 30 giây
        } else {
            console.warn('⚠️ UpdateManager: Service Worker not supported');
        }
    },

    // ✅ Đăng ký Service Worker với error handling tốt hơn

	async registerServiceWorker() {
		try {
			console.log('📋 UpdateManager: Bắt đầu đăng ký Service Worker...');

			// Bước 1: Đăng ký Service Worker với tùy chọn `updateViaCache: 'none'`.
			// Tùy chọn này rất quan trọng: nó yêu cầu trình duyệt luôn kiểm tra file `sw.js`
			// trên server mỗi khi trang được tải, thay vì sử dụng phiên bản từ cache HTTP.
			// Điều này khắc phục vấn đề trình duyệt không phát hiện được bản cập nhật.
			this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
				updateViaCache: 'none'
			});

			console.log('✅ UpdateManager: Service Worker đã được đăng ký thành công. Scope:', this.swRegistration.scope);

			// Bước 2: Lắng nghe sự kiện 'updatefound'.
			// Sự kiện này được kích hoạt khi trình duyệt tìm thấy một phiên bản sw.js mới.
			this.swRegistration.addEventListener('updatefound', () => {
				console.log('🆕 UpdateManager: Đã tìm thấy một bản cập nhật! Service Worker mới đang được cài đặt.');
				const newWorker = this.swRegistration.installing;

				if (newWorker) {
					// Theo dõi trạng thái của Service Worker mới.
					newWorker.addEventListener('statechange', () => {
						console.log(`[SW Mới] Trạng thái thay đổi: ${newWorker.state}`);
						// Khi SW mới đã cài đặt xong và SW cũ vẫn đang kiểm soát trang...
						if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
							console.log('🎯 UpdateManager: Service Worker mới đã sẵn sàng. Hiển thị thông báo cập nhật.');
							this.isUpdateAvailable = true;
							this.showUpdateNotification(); // Hiển thị thông báo cho người dùng.
						}
					});
				}
			});

			// Bước 3: Kiểm tra ngay sau khi đăng ký thành công.
			// Điều này giúp phát hiện các bản cập nhật đang chờ ngay khi người dùng truy cập.
			await this.checkForUpdates();

		} catch (error) {
			// Ghi lại lỗi một cách chi tiết nếu quá trình đăng ký thất bại.
			console.error('❌ UpdateManager: Không thể đăng ký Service Worker. Chức năng offline và cập nhật tự động sẽ không hoạt động.', error);
		}
	},

    // ✅ Lấy version từ Service Worker
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
                        this.swVersion = null; // Không nhận được version
                        resolve(null);
                    }
                };
                
                this.swRegistration.active.postMessage(
                    { type: 'CHECK_VERSION' }, 
                    [messageChannel.port2]
                );
                
                // Timeout sau 5 giây
                setTimeout(() => {
                    console.warn('⏳ UpdateManager: Timeout getting SW version.');
                    this.swVersion = this.swVersion || null; // Giữ version cũ nếu đã có, nếu không thì null
                    resolve(null); 
                }, 5000);
            });
        } catch (error) {
            console.error('❌ UpdateManager: Error getting SW version:', error);
            this.swVersion = null;
            return null;
        }
    },

    // ✅ Setup update detection với message handling
    setupUpdateDetection() {
        if (!navigator.serviceWorker) return;
        
        // Lắng nghe controller change
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('🔄 UpdateManager: Controller changed');
            if (this.isRefreshing) return;
            
            this.isRefreshing = true;
            this.showUpdateAppliedMessage();
            // ✅ SỬA Ở ĐÂY: Sử dụng hardReload
            setTimeout(() => this.hardReload(), 1000);
        });
        
        // Lắng nghe messages từ SW
        navigator.serviceWorker.addEventListener('message', event => {
            this.handleServiceWorkerMessage(event.data);
        });
        
        // Kiểm tra khi trang được focus lại
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) { // Chỉ khi tab được focus
                setTimeout(() => this.checkForUpdates(), 1000); // Delay nhỏ để tránh spam
            }
        });
    },

    // ✅ Xử lý messages từ Service Worker
    handleServiceWorkerMessage(data) {
        if (!data || !data.type) return;
        
        console.log('📨 UpdateManager: Received SW message:', data.type, data);
        
        switch (data.type) {
            case 'SW_UPDATED': // Custom message, có thể không cần nếu updatefound hoạt động tốt
                this.isUpdateAvailable = true;
                this.showUpdateNotification();
                break;
                
            case 'FORCE_UPDATE_COMPLETE': // Từ SW sau khi xóa cache
                this.showUpdateAppliedMessage();
                // SW sẽ tự reload các client, nhưng có thể thêm reload ở đây nếu cần
                setTimeout(() => window.location.reload(), 1500); 
                break;
                
            case 'VERSION_INFO': // Phản hồi từ CHECK_VERSION
                if (data.version) {
                    this.swVersion = data.version;
                    console.log(`🔧 UpdateManager: Updated SW version from message: ${this.swVersion}`);
                    // Sau khi nhận version từ SW, có thể check lại logic cập nhật
                    if (this.swVersion !== this.currentVersion) {
                        this.isUpdateAvailable = true;
                        this.showUpdateNotification();
                    }
                }
                break;
        }
    },

    // ✅ Kiểm tra cập nhật với logic tốt hơn
    async checkForUpdates() {
        if (!this.swRegistration) {
            console.log('⚠️ UpdateManager: No SW registration for update check');
            return false;
        }
    
        try {
            console.log('🔍 UpdateManager: Checking for updates...');
            this.lastCheck = new Date();
    
            // Buộc trình duyệt kiểm tra file sw.js trên server
            await this.swRegistration.update();
    
            // Kiểm tra xem có worker mới đang chờ kích hoạt không
            if (this.swRegistration.waiting) {
                console.log('🆕 UpdateManager: Update available (waiting worker found).');
                this.isUpdateAvailable = true;
                // Cố gắng lấy version từ worker đang chờ
                const waitingWorkerVersionInfo = await this.getVersionFromSpecificWorker(this.swRegistration.waiting);
                if (waitingWorkerVersionInfo && waitingWorkerVersionInfo.version) {
                    this.swVersion = waitingWorkerVersionInfo.version;
                }
                this.showUpdateNotification();
                return true;
            }
    
            // Nếu không, lấy version từ worker đang hoạt động
            await this.getVersionFromSW(); // Thao tác này sẽ cập nhật this.swVersion
    
            // === THAY ĐỔI QUAN TRỌNG NHẤT NẰM Ở ĐÂY ===
            // Nếu SW trả về 'fallback-version', coi như có lỗi và không so sánh.
            if (this.swVersion === 'fallback-version') {
                console.error('❌ UpdateManager: Service Worker is using a fallback version. This indicates an error loading `version.js` inside the worker. Update check is aborted to prevent false notifications.');
                this.isUpdateAvailable = false; // Đảm bảo không hiển thị thông báo sai
                this.dismissUpdate(); // Ẩn thông báo nếu nó đang hiển thị
                return false; // Dừng kiểm tra tại đây
            }
            // ==========================================
    
            console.log(`ℹ️ UpdateManager: Comparing versions - Client: ${this.currentVersion}, SW: ${this.swVersion}`);
            if (this.swVersion && this.swVersion !== this.currentVersion) {
                console.log(`🆕 UpdateManager: Version mismatch! Client: ${this.currentVersion}, SW: ${this.swVersion}. Triggering notification.`);
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
            setTimeout(() => resolve(null), 2000); // Timeout
        });
    },

    // ✅ Hiển thị thông báo cập nhật với UI đẹp hơn
    showUpdateNotification() {
        // Xóa notification cũ nếu có
        const existingNotification = document.getElementById('update-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        this.isUpdateAvailable = true; // Đảm bảo flag này đúng
        
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

    // ✅ Áp dụng cập nhật
	async applyUpdate() {
		console.log('🔄 UpdateManager: Applying update with iOS-robust method...');

		if (!this.isUpdateAvailable || !this.swRegistration || !this.swRegistration.waiting) {
			console.warn('applyUpdate called but no waiting worker found. Forcing refresh as a fallback.');
			await this.forceRefresh();
			return;
		}

		// Hiển thị màn hình loading không thể tắt để ngăn người dùng tương tác
		this.showLoadingMessage('Đang hoàn tất cập nhật... Vui lòng không tắt ứng dụng!');

		const waitingWorker = this.swRegistration.waiting;

		// Gửi message để worker mới bỏ qua trạng thái waiting
		waitingWorker.postMessage({ type: 'SKIP_WAITING' });

		// Bắt đầu "chờ" một cách chủ động cho đến khi worker mới nắm quyền kiểm soát
		// thay vì chỉ dựa vào sự kiện 'controllerchange'
		let refreshInterval = setInterval(async () => {
			// Nếu Service Worker đang chờ biến mất, nghĩa là nó đã bị kích hoạt hoặc bị hủy bỏ.
			// Chúng ta sẽ kiểm tra xem controller mới đã đúng là worker chúng ta đang chờ chưa.
			if (!this.swRegistration.waiting) {
				// Kiểm tra xem controller hiện tại có phải là worker mới không
				if (this.swRegistration.active === waitingWorker || navigator.serviceWorker.controller === waitingWorker) {
					clearInterval(refreshInterval);
					console.log('✅ UpdateManager: New worker is now active. Reloading page!');
					// Sử dụng hard reload để đảm bảo tải lại toàn bộ tài nguyên
					window.location.reload(true);
				}
			}
		}, 200); // Kiểm tra mỗi 200ms

		// Thêm một cơ chế an toàn: nếu sau 10 giây mà vẫn chưa cập nhật được, thông báo cho người dùng
		setTimeout(() => {
			clearInterval(refreshInterval);
			console.error('❌ UpdateManager: Update timed out after 10 seconds.');
			Utils.UIUtils.showMessage('Cập nhật thất bại. Vui lòng đóng hoàn toàn và mở lại ứng dụng.', 'error', 10000);
			// Có thể ẩn màn hình loading ở đây nếu muốn
			const loadingDiv = document.getElementById('update-loading');
			if (loadingDiv) loadingDiv.remove();
		}, 10000);
	},

    // ✅ Ẩn thông báo cập nhật
    dismissUpdate() {
        const updateBar = document.getElementById('update-notification');
        if (updateBar) {
            // Thêm animation nếu muốn, ví dụ: updateBar.style.animation = 'slideUpAndFade 0.3s ease forwards';
            // setTimeout(() => { updateBar.remove(); }, 300);
            updateBar.remove(); // Xóa ngay
        }
        this.isUpdateAvailable = false; // Quan trọng: reset lại flag này
        console.log('👋 UpdateManager: Update notification dismissed');
    },

    // ✅ Hiển thị loading message
    showLoadingMessage(message) {
        // Xóa loading cũ nếu có
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

    // ✅ Hiển thị thông báo cập nhật thành công
    showUpdateAppliedMessage() {
        const loadingDiv = document.getElementById('update-loading');
        if (loadingDiv) {
            loadingDiv.remove();
        }
        
        Utils.UIUtils.showMessage('✅ Ứng dụng đã được cập nhật thành công! Trang sẽ tự tải lại.', 'success', 3000);
    },

    // ✅ Force refresh toàn bộ ứng dụng
	async forceRefresh() {
		try {
			console.log('🔄 UpdateManager: Force refreshing application...');
			this.showLoadingMessage('Đang làm mới ứng dụng hoàn toàn...');

			// Unregister service workers để đảm bảo không còn phiên bản cũ nào chạy
			if ('serviceWorker' in navigator) {
				const registrations = await navigator.serviceWorker.getRegistrations();
				for (const registration of registrations) {
					await registration.unregister();
					console.log('✅ Service Worker đã được gỡ bỏ.');
				}
			}

			// Xóa toàn bộ cache của ứng dụng
			if ('caches' in window) {
				const cacheNames = await caches.keys();
				await Promise.all(cacheNames.map(name => caches.delete(name)));
				console.log('✅ Toàn bộ cache đã được xóa.');
			}

			// Hiển thị thông báo và thực hiện hard reload sau một khoảng trễ ngắn
			Utils.UIUtils.showMessage('Đã dọn dẹp xong, đang tải lại...', 'success');
			
			// === THAY ĐỔI CỐT LÕI NẰM Ở ĐÂY ===
			// Thay thế window.location.reload(true) bằng phương pháp cache-busting.
			setTimeout(() => {
				const url = new URL(window.location.href);
				// Thêm một tham số ngẫu nhiên để buộc trình duyệt tải lại từ mạng
				url.searchParams.set('_force_reload', Date.now());
				window.location.href = url.href;
			}, 1500);

		} catch (error) {
			console.error('❌ UpdateManager: Force refresh thất bại:', error);
			Utils.UIUtils.showMessage('Lỗi khi làm mới, đang thử lại...', 'error');
			// Fallback: thực hiện hard reload ngay lập tức
			setTimeout(() => {
				const url = new URL(window.location.href);
				url.searchParams.set('_force_reload_fallback', Date.now());
				window.location.href = url.href;
			}, 1000);
		}
	},

    // ✅ Xóa cache và reload
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

    // ✅ Hard reload trang
    hardReload() {
        try {
            console.log('🔄 UpdateManager: Performing hard reload...');
            
            if (typeof window.location.reload === 'function') {
                // Thêm timestamp để bypass cache trình duyệt mạnh mẽ hơn
                const url = new URL(window.location.href);
                url.searchParams.set('_refresh', Date.now());
                window.location.href = url.toString(); // Điều hướng lại sẽ đảm bảo tải mới
            } else {
                // Fallback nếu window.location.reload không có
                window.location.href = window.location.href.split('?')[0] + '?_refresh=' + Date.now();
            }
        } catch (error) {
            console.error('❌ UpdateManager: Hard reload failed:', error);
            // Last resort
            window.location.reload(true); // Cố gắng reload mạnh nhất có thể
        }
    },

    // ✅ Kiểm tra cập nhật khi focus
    checkForUpdatesOnFocus() {
        let lastFocusTime = Date.now();
        
        window.addEventListener('focus', () => {
            const now = Date.now();
            // Chỉ kiểm tra nếu đã mất focus hơn 30 giây
            if (now - lastFocusTime > 30000) { // 30 giây
                setTimeout(() => {
                    this.checkForUpdates();
                }, 1000); // Delay 1 giây để tránh spam
            }
            lastFocusTime = now;
        });
        
        window.addEventListener('blur', () => {
            lastFocusTime = Date.now(); // Cập nhật thời gian khi mất focus
        });
    },

    // ✅ Lấy thông tin version cho UI (có thể dùng trong Settings)
    getVersionInfo() {
        return {
            currentVersion: this.currentVersion,
            swVersion: this.swVersion,
            isUpdateAvailable: this.isUpdateAvailable,
            lastCheck: this.lastCheck ? this.lastCheck.toLocaleString('vi-VN') : 'Chưa kiểm tra'
        };
    },

    // ✅ Cleanup khi destroy (nếu app có cơ chế destroy module)
    destroy() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        
        this.dismissUpdate(); // Bỏ thông báo nếu có
        
        const loadingDiv = document.getElementById('update-loading');
        if (loadingDiv) {
            loadingDiv.remove();
        }
        // Xóa các event listener khác nếu có
    }
};

const VietnameseNumberFormatter = {
    /**
     * Format số tiền thành dạng rút gọn tiếng Việt
     * @param {number} amount - Số tiền cần format
     * @param {boolean} showCurrency - Có hiển thị ký hiệu tiền tệ không
     * @returns {string} - Số đã format
     */
    formatVietnameseShort(amount, showCurrency = false) {
        if (!amount || isNaN(amount)) return showCurrency ? '0 ₫' : '0';
        
        const absAmount = Math.abs(amount);
        const sign = amount < 0 ? '-' : '';
        let result = '';

        if (absAmount >= 1000000000) {
            // Tỷ
            const billions = absAmount / 1000000000;
            if (billions >= 100) {
                result = `${sign}${Math.round(billions)} tỷ`;
            } else if (billions >= 10) {
                result = `${sign}${billions.toFixed(1)} tỷ`;
            } else {
                result = `${sign}${billions.toFixed(2)} tỷ`;
            }
        } else if (absAmount >= 1000000) {
            // Triệu
            const millions = absAmount / 1000000;
            if (millions >= 100) {
                result = `${sign}${Math.round(millions)} tr`;
            } else if (millions >= 10) {
                result = `${sign}${millions.toFixed(1)} tr`;
            } else {
                result = `${sign}${millions.toFixed(2)} tr`;
            }
        } else if (absAmount >= 1000) {
            // Nghìn
            const thousands = absAmount / 1000;
            if (thousands >= 100) {
                result = `${sign}${Math.round(thousands)} ng`;
            } else if (thousands >= 10) {
                result = `${sign}${thousands.toFixed(1)} ng`;
            } else {
                result = `${sign}${thousands.toFixed(2)} ng`;
            }
        } else {
            // Dưới 1000
            result = `${sign}${Math.round(absAmount)}`;
        }

        return showCurrency ? `${result} ₫` : result;
    },

    /**
     * Format số tiền cho tooltip (chi tiết hơn)
     * @param {number} amount - Số tiền
     * @returns {string} - Số đã format cho tooltip
     */
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

    /**
     * Format cho legend (ngắn gọn)
     * @param {number} amount - Số tiền
     * @returns {string} - Số đã format cho legend
     */
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

    /**
     * Format cho trục Y của chart (siêu ngắn gọn)
     * @param {number} amount - Số tiền
     * @returns {string} - Số đã format cho trục Y
     */
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
    // Thêm các method vào Utils.CurrencyUtils
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


console.log("✅ Utils.js with FIXED UpdateManager loaded.");