/**
 * PERSONAL FINANCIAL MANAGEMENT APPLICATION
 * Restructured and organized for better maintainability
 */

// ========================================================================================
// 1. CONSTANTS & CONFIGURATION
// ========================================================================================

const CONFIG = {
    USD_TO_VND_RATE: 25000,
    TRANSFER_CATEGORY_OUT: "Chuyển tiền đi",
    TRANSFER_CATEGORY_IN: "Nhận tiền chuyển",
    RECONCILE_ADJUST_INCOME_CAT: "Điều chỉnh Đối Soát (Thu)",
    RECONCILE_ADJUST_EXPENSE_CAT: "Điều chỉnh Đối Soát (Chi)",
    DARK_MODE_CLASS: 'dark-mode',
    THEME_STORAGE_KEY: 'themePreference',
    MIGRATION_KEY_ORIGINAL_AMOUNT_VND: 'migration_original_amount_vnd_v1_done'
};

const STORAGE_KEYS = {
    TRANSACTIONS: 'transactions_v2',
    INCOME_CATEGORIES: 'customIncomeCategories_v2',
    EXPENSE_CATEGORIES: 'customExpenseCategories_v2',
    ACCOUNTS: 'customAccounts_v2',
    RECONCILIATION_HISTORY: 'reconciliation_history_v2'
};

const CATEGORY_COLORS = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
    '#C9CBCF', '#8366FF', '#289F40', '#D26384', '#3C64C8', '#C89632'
];

const DEFAULT_DATA = {
    incomeCategories: [
        { value: "Lương", text: "Lương" },
        { value: "Thưởng", text: "Thưởng" },
        { value: "Tiền được trả nợ", text: "Tiền được trả nợ" },
        { value: CONFIG.TRANSFER_CATEGORY_IN, text: "Nhận tiền chuyển khoản" },
        { value: "Lãi tiết kiệm", text: "Lãi tiết kiệm" },
        { value: "Thu nhập từ đầu tư", text: "Thu nhập từ đầu tư" },
        { value: "Thu nhập phụ", text: "Thu nhập phụ" },
        { value: "Thu nhập khác", text: "Thu nhập khác (chung)" }
    ],
    expenseCategories: [
        { value: "Ăn uống", text: "Ăn uống" },
        { value: "Đi lại", text: "Đi lại" },
        { value: "Nhà ở", text: "Nhà ở" },
        { value: "Hóa đơn", text: "Hóa đơn (Điện, nước, internet)" },
        { value: "Mua sắm", text: "Mua sắm (Quần áo, đồ dùng)" },
        { value: "Giải trí", text: "Giải trí" },
        { value: "Sức khỏe", text: "Sức khỏe" },
        { value: "Giáo dục", text: "Giáo dục" },
        { value: "Chi cho đầu tư", text: "Chi cho đầu tư" },
        { value: "Trả nợ", text: "Trả nợ (cho người khác)" },
        { value: CONFIG.TRANSFER_CATEGORY_OUT, text: "Chuyển tiền đi" },
        { value: "Chi phí khác", text: "Chi phí khác (chung)" }
    ],
    accounts: [
        { value: "Tiền mặt", text: "Tiền mặt" },
        { value: "Momo", text: "Momo" },
        { value: "Thẻ tín dụng A", text: "Thẻ tín dụng A" },
        { value: "Techcombank", text: "Techcombank" },
        { value: "BIDV", text: "BIDV" },
        { value: "Khác", text: "Khác" }
    ]
};

// ========================================================================================
// 2. DOM ELEMENTS
// ========================================================================================

const DOM = {
    // Theme
    darkModeToggle: null,
    
    // Forms
    transactionForm: null,
    formTitle: null,
    submitButton: null,
    datetimeInput: null,
    categoryInput: null,
    amountInput: null,
    formCurrencySelector: null,
    descriptionInput: null,
    accountInput: null,
    accountLabel: null,
    toAccountInput: null,
    addTripleZeroButton: null,
    
    // Filters
    filterMonthSelect: null,
    filterSpecificDateInput: null,
    clearDateFilterButton: null,
    filterComparisonYearInput: null,
    filterComparisonWeekSelect: null,
    
    // Display
    messageBox: null,
    transactionList: null,
    noTransactionsMessage: null,
    totalIncomeEl: null,
    totalExpensesEl: null,
    currentBalanceEl: null,
    accountBalanceListEl: null,
    
    // Charts
    incomeExpenseChartCanvas: null,
    expenseCategoryChartCanvas: null,
    expenseCategoryBarCtx: null,
    last7DaysChartCanvas: null,
    monthComparisonChartCanvas: null,
    expenseChartTypeSelector: null,
    expensePieChartContainer: null,
    expenseBarChartContainer: null,
    
    // Categories Management
    newIncomeCategoryNameInput: null,
    addIncomeCategoryButton: null,
    incomeCategoryListAdmin: null,
    newExpenseCategoryNameInput: null,
    addExpenseCategoryButton: null,
    expenseCategoryListAdmin: null,
    newAccountNameInput: null,
    addAccountButton: null,
    accountListAdmin: null,
    
    // Import/Export
    exportButton: null,
    exportCsvButton: null,
    importButton: null,
    importFileInput: null,
    
    // Virtual Keyboard
    virtualKeyboard: null,
    
    // Suggestions
    transactionSuggestionArea: null,
    suggestedDescription: null,
    suggestedAmount: null,
    applySuggestionButton: null,
    dismissSuggestionButton: null,

    // Summary displays
    summaryIncomeMonthDisplay: null,
    summaryExpenseMonthDisplay: null,
    summaryBalanceMonthDisplay: null
};

// ========================================================================================
// 3. GLOBAL VARIABLES
// ========================================================================================

let transactions = [];
let incomeCategories = [];
let expenseCategories = [];
let accounts = [];
let editingTransactionId = null;
let currentSuggestedTransaction = null;
let activeInputForVirtualKeyboard = null;

// Chart instances
let incomeExpenseChart = null;
let expenseCategoryChart = null;
let expenseCategoryBarChart = null;
let last7DaysChart = null;
let monthComparisonChart = null;

// ========================================================================================
// 4. UTILITY FUNCTIONS
// ========================================================================================

const Utils = {
    // Format currency with proper decimal handling
    formatCurrency(amount, currencyCode = 'VND') {
        if (isNaN(amount) || amount === null) amount = 0;

        if (currencyCode === 'VND') {
            let actualFractionDigits = 0;
            const amountStrFull = String(amount);
            const decimalPartMatch = amountStrFull.match(/\.(\d+)$/);
            if (decimalPartMatch && decimalPartMatch[1]) {
                actualFractionDigits = decimalPartMatch[1].length;
            }

            const numberFormatter = new Intl.NumberFormat('en-US', {
                style: 'decimal',
                minimumFractionDigits: actualFractionDigits,
                maximumFractionDigits: actualFractionDigits
            });
            return numberFormatter.format(amount) + '\u00A0₫';
        } else if (currencyCode === 'USD') {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(amount);
        } else {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currencyCode,
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }).format(amount);
        }
    },

    // Format date-time for different purposes
    formatDateTimeLocalInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    },

    formatIsoDateTime(date) {
        if (!date || isNaN(new Date(date).getTime())) date = new Date();
        else date = new Date(date);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    },

    formatDisplayDateTime(isoString) {
        if (!isoString) return '';
        try {
            let date = new Date(isoString);
            if (isNaN(date.getTime())) return isoString;
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${day}/${month}/${year} ${hours}:${minutes}`;
        } catch (e) {
            console.error("Error formatting display date/time:", e, "Input:", isoString);
            return isoString;
        }
    },

    formatDateTimeForCSV(isoString) {
        if (!isoString) return '';
        try {
            const d = new Date(isoString);
            if (isNaN(d.getTime())) return isoString;
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
        } catch (e) {
            return isoString;
        }
    },

    getCurrentDateFormattedYYYYMMDD() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    // Amount parsing and normalization
    normalizeAmountString(amountStr) {
        if (typeof amountStr !== 'string' || !amountStr.trim()) return "";
        
        let str = amountStr.trim();
        const hasComma = str.includes(',');
        const hasPeriod = str.includes('.');

        if (hasComma && hasPeriod) {
            if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
                str = str.replace(/\./g, '').replace(',', '.');
            } else {
                str = str.replace(/,/g, '');
            }
        } else if (hasComma) {
            str = str.replace(/,/g, '');
        } else if (hasPeriod) {
            const periodCount = (str.match(/\./g) || []).length;
            if (periodCount > 1) {
                str = str.replace(/\.(?=.*\.)/g, '');
            }
        }
        return str;
    },

    parseAmountInput(amountStr, currency) {
        if (!amountStr) return 0;

        const normalizedStr = this.normalizeAmountString(amountStr);
        let val = parseFloat(normalizedStr);

        if (isNaN(val)) {
            console.warn(`NormalizeAmountString failed for input: '${amountStr}'`);
            let directParseStr = String(amountStr).trim();
            if (directParseStr.includes(',') && !directParseStr.includes('.')) {
                directParseStr = directParseStr.replace(/,/g, '');
            } else if (directParseStr.includes(',') && directParseStr.includes('.')) {
                if (directParseStr.lastIndexOf(',') > directParseStr.lastIndexOf('.')) {
                    directParseStr = directParseStr.replace(/\./g, '').replace(',', '.');
                } else {
                    directParseStr = directParseStr.replace(/,/g, '');
                }
            }
            val = parseFloat(directParseStr);
        }

        if (isNaN(val)) return 0;

        if (currency === 'USD') {
            val = val * CONFIG.USD_TO_VND_RATE;
            return Math.round(val);
        } else if (currency === 'VND') {
            return val;
        } else {
            return val;
        }
    },

    // Week calculations
    getISOWeekNumber(d) {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    },

    getISOWeek(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return weekNo;
    },

    getCurrentISOWeekId() {
        const now = new Date();
        const year = now.getFullYear();
        const weekNumber = this.getISOWeekNumber(now);
        return `${year}-W${String(weekNumber).padStart(2, '0')}`;
    },

    // Message display
    showMessage(message, type = 'success') {
        if (!DOM.messageBox) return;
        DOM.messageBox.textContent = message;
        DOM.messageBox.className = `p-4 mb-4 text-sm rounded-lg ${type === 'success' ? 'message-success' : 'message-error'}`;
        DOM.messageBox.style.display = 'block';
        setTimeout(() => {
            DOM.messageBox.style.display = 'none';
        }, 3000);
    },

    // Format amount input with thousand separators
    formatAndPreserveCursor(inputElement, valueToFormat) {
        const originalValue = valueToFormat;
        let cursorPos = inputElement.selectionStart;
        const originalLength = originalValue.length;

        let cleanValue = originalValue.replace(/[^0-9.]/g, "");
        const parts = cleanValue.split('.');
        let integerPart = parts[0];
        let decimalPart = parts.length > 1 ? parts.slice(1).join('') : "";

        if (parts.length > 2) {
            decimalPart = parts[1] + parts.slice(2).join('');
        }

        let formattedInteger = "";
        if (integerPart) {
            if (/^0+$/.test(integerPart) && integerPart.length > 1 && (decimalPart === "" || decimalPart === undefined)) {
                // Keep zeros for cases like "007"
            } else {
                const num = parseInt(integerPart, 10);
                if (!isNaN(num)) {
                    formattedInteger = new Intl.NumberFormat('en-US').format(num);
                } else if (integerPart === "" && (decimalPart !== "" || valueToFormat === ".")) {
                    formattedInteger = "0";
                } else {
                    formattedInteger = "";
                }
            }
        } else if (decimalPart !== "" || valueToFormat === ".") {
            formattedInteger = "0";
        }

        let newFormattedValue = formattedInteger;
        if (decimalPart !== "" || (valueToFormat.endsWith('.') && !valueToFormat.endsWith('..'))) {
            newFormattedValue += "." + decimalPart;
        }
        
        if (valueToFormat === ".") newFormattedValue = "0.";
        if (valueToFormat === "0." && decimalPart === "") newFormattedValue = "0.";

        if (integerPart === "0" && decimalPart === "" && !valueToFormat.includes('.')) {
            newFormattedValue = "0";
        }
        
        if (originalValue.trim() === "") {
            newFormattedValue = "";
        }

        inputElement.value = newFormattedValue;

        // Cursor position calculation
        if (cursorPos !== null) {
            let newCursorPos = cursorPos;
            const newLength = newFormattedValue.length;

            const oldCommasBefore = (originalValue.substring(0, cursorPos).match(/,/g) || []).length;
            let tempNewCursorPos = cursorPos + (newLength - originalLength);
            if (tempNewCursorPos < 0) tempNewCursorPos = 0;
            if (tempNewCursorPos > newLength) tempNewCursorPos = newLength;

            const newCommasBefore = (newFormattedValue.substring(0, tempNewCursorPos).match(/,/g) || []).length;
            newCursorPos = tempNewCursorPos + (newCommasBefore - oldCommasBefore);

            if (newCursorPos < 0) newCursorPos = 0;
            if (newCursorPos > newLength) newCursorPos = newLength;

            inputElement.setSelectionRange(newCursorPos, newCursorPos);
        }
    }
};

// ========================================================================================
// 5. DATA MANAGEMENT
// ========================================================================================

const DataManager = {
    // Load user preferences from localStorage
    loadUserPreferences() {
        // Load transactions
        const storedTransactions = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
        transactions = [];
        if (storedTransactions) {
            try {
                transactions = JSON.parse(storedTransactions);
                console.log("Loaded transactions:", transactions);
                if (!Array.isArray(transactions)) {
                    console.warn("Transactions data is not an array, resetting to empty array.");
                    transactions = [];
                }
            } catch (error) {
                console.error("Error parsing transactions from localStorage:", error);
                transactions = [];
                Utils.showMessage('Có lỗi khi tải dữ liệu giao dịch. Dữ liệu có thể đã bị hỏng.', 'error');
            }
        } else {
            console.log("No transactions found in localStorage, using empty array.");
            transactions = [];
        }

        // Load income categories
        const storedIncomeCategories = localStorage.getItem(STORAGE_KEYS.INCOME_CATEGORIES);
        incomeCategories = [];
        if (storedIncomeCategories) {
            try {
                incomeCategories = JSON.parse(storedIncomeCategories);
                if (!Array.isArray(incomeCategories) || incomeCategories.length === 0 || !incomeCategories.find(c => c.value === CONFIG.TRANSFER_CATEGORY_IN)) {
                    incomeCategories = [...DEFAULT_DATA.incomeCategories];
                }
            } catch (error) {
                console.error("Error parsing income categories:", error);
                incomeCategories = [...DEFAULT_DATA.incomeCategories];
            }
        } else {
            incomeCategories = [...DEFAULT_DATA.incomeCategories];
        }

        // Load expense categories
        const storedExpenseCategories = localStorage.getItem(STORAGE_KEYS.EXPENSE_CATEGORIES);
        expenseCategories = [];
        if (storedExpenseCategories) {
            try {
                expenseCategories = JSON.parse(storedExpenseCategories);
                if (!Array.isArray(expenseCategories) || expenseCategories.length === 0 || !expenseCategories.find(c => c.value === CONFIG.TRANSFER_CATEGORY_OUT)) {
                    expenseCategories = [...DEFAULT_DATA.expenseCategories];
                }
            } catch (error) {
                console.error("Error parsing expense categories:", error);
                expenseCategories = [...DEFAULT_DATA.expenseCategories];
            }
        } else {
            expenseCategories = [...DEFAULT_DATA.expenseCategories];
        }

        // Load accounts
        const storedAccounts = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
        accounts = [];
        if (storedAccounts) {
            try {
                accounts = JSON.parse(storedAccounts);
                if (!Array.isArray(accounts) || accounts.length === 0) {
                    accounts = [...DEFAULT_DATA.accounts];
                }
            } catch (error) {
                console.error("Error parsing accounts:", error);
                accounts = [...DEFAULT_DATA.accounts];
            }
        } else {
            accounts = [...DEFAULT_DATA.accounts];
        }

        console.log("Final data after loading:", { transactions, incomeCategories, expenseCategories, accounts });
    },

    // Save user preferences to localStorage
    saveUserPreferences() {
        localStorage.setItem(STORAGE_KEYS.INCOME_CATEGORIES, JSON.stringify(incomeCategories));
        localStorage.setItem(STORAGE_KEYS.EXPENSE_CATEGORIES, JSON.stringify(expenseCategories));
        localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
    },

    // Save transactions to localStorage
    saveTransactions() {
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    },

    // Save reconciliation result
    saveReconciliationResult(account, system, actual, diff) {
        const now = new Date();
        const year = now.getFullYear();
        const week = Utils.getISOWeekNumber(now);
        const data = { 
            account, 
            year, 
            week, 
            system, 
            actual, 
            diff, 
            timestamp: now.toISOString() 
        };
        let history = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECONCILIATION_HISTORY) || '[]');
        history.push(data);
        localStorage.setItem(STORAGE_KEYS.RECONCILIATION_HISTORY, JSON.stringify(history));
    }
};

// ========================================================================================
// 6. TRANSACTION MANAGEMENT
// ========================================================================================

const TransactionManager = {
    // Handle transaction form submission
    handleSubmit(e) {
        e.preventDefault();
        
        const datetimeValue = DOM.datetimeInput.value;
        const typeRadio = document.querySelector('input[name="type"]:checked');
        const type = typeRadio ? typeRadio.value : null;
        const amountRaw = DOM.amountInput.value;
        const currency = DOM.formCurrencySelector.value;
        let categoryValue = (type !== 'Transfer') ? DOM.categoryInput.value : null;
        const accountValue = DOM.accountInput.value;
        const toAccountValue = (type === 'Transfer') ? DOM.toAccountInput.value : null;
        const descriptionValue = DOM.descriptionInput.value.trim();
        
        // Validation
        if (!datetimeValue || !type || !amountRaw || !accountValue) {
            Utils.showMessage('Vui lòng điền đầy đủ các trường bắt buộc.', 'error');
            return;
        }
        if (type !== 'Transfer' && !categoryValue) {
            Utils.showMessage('Vui lòng chọn hạng mục.', 'error');
            return;
        }
        if (type === 'Transfer' && !toAccountValue) {
            Utils.showMessage('Vui lòng chọn tài khoản nhận cho giao dịch chuyển tiền.', 'error');
            return;
        }
        if (type === 'Transfer' && accountValue === toAccountValue) {
            Utils.showMessage('Tài khoản chuyển và tài khoản nhận không được trùng nhau.', 'error');
            return;
        }

        let amount = Utils.parseAmountInput(amountRaw, currency);
        if (isNaN(amount) || amount <= 0 && !(type === 'Transfer' && amount === 0)) {
            if (amount <= 0 && type !== 'Transfer') {
                Utils.showMessage('Số tiền không hợp lệ hoặc phải lớn hơn 0.', 'error');
                return;
            } else if (amount < 0) {
                Utils.showMessage('Số tiền không được là số âm.', 'error');
                return;
            }
        }

        const transactionDateTime = Utils.formatIsoDateTime(new Date(datetimeValue));
        const rawNumericValue = parseFloat(Utils.normalizeAmountString(amountRaw));
        
        if (isNaN(rawNumericValue)) {
            Utils.showMessage('Số tiền nhập vào không hợp lệ.', 'error');
            return;
        }

        if (editingTransactionId) {
            this.updateTransaction(editingTransactionId, {
                datetime: transactionDateTime,
                type,
                amount,
                category: categoryValue,
                account: accountValue,
                toAccount: toAccountValue,
                description: descriptionValue,
                originalAmount: rawNumericValue,
                originalCurrency: currency
            });
        } else {
            this.addTransaction({
                datetime: transactionDateTime,
                type,
                amount,
                category: categoryValue,
                account: accountValue,
                toAccount: toAccountValue,
                description: descriptionValue,
                originalAmount: rawNumericValue,
                originalCurrency: currency
            });
        }

        DataManager.saveTransactions();
        FilterManager.populateMonthFilter();
        FilterManager.applyMainFilter();
        this.resetForm(type);
    },

    // Add new transaction
    addTransaction(data) {
        const newIdBase = Date.now().toString();
        
        if (data.type === 'Transfer') {
            const transferOutId = `${newIdBase}_out`;
            const transferInId = `${newIdBase}_in`;
            
            transactions.push({
                id: transferOutId,
                datetime: data.datetime,
                description: data.description || `Chuyển tiền từ ${data.account} đến ${data.toAccount}`,
                category: CONFIG.TRANSFER_CATEGORY_OUT,
                amount: data.amount,
                type: 'Chi',
                account: data.account,
                currency: 'VND',
                isTransfer: true,
                transferPairId: transferInId,
                originalAmount: data.originalAmount,
                originalCurrency: data.originalCurrency
            });
            
            transactions.push({
                id: transferInId,
                datetime: data.datetime,
                description: data.description || `Nhận tiền từ ${data.account} vào ${data.toAccount}`,
                category: CONFIG.TRANSFER_CATEGORY_IN,
                amount: data.amount,
                type: 'Thu',
                account: data.toAccount,
                currency: 'VND',
                isTransfer: true,
                transferPairId: transferOutId,
                originalAmount: data.originalAmount,
                originalCurrency: data.originalCurrency
            });
            
            Utils.showMessage('Giao dịch chuyển tiền đã được thêm!', 'success');
        } else {
            transactions.push({
                id: newIdBase,
                datetime: data.datetime,
                description: data.description,
                category: data.category,
                amount: data.amount,
                type: data.type,
                account: data.account,
                currency: 'VND',
                isTransfer: false,
                transferPairId: null,
                originalAmount: data.originalAmount,
                originalCurrency: data.originalCurrency
            });
            
            Utils.showMessage(`Giao dịch ${data.type === 'Thu' ? 'thu' : 'chi'} đã được thêm!`, 'success');
        }
    },

    // Update existing transaction
    updateTransaction(transactionId, data) {
        const existingTransactionIndex = transactions.findIndex(t => t.id === transactionId || (t.isTransfer && (t.id.startsWith(transactionId) || t.transferPairId.startsWith(transactionId))));
        
        if (existingTransactionIndex === -1 && data.type !== 'Transfer') {
            Utils.showMessage('Lỗi: Giao dịch gốc để sửa không tìm thấy.', 'error');
            editingTransactionId = null;
            return;
        }
        
        // Remove old transaction
        if (transactions.find(t => t.id.startsWith(transactionId) && t.isTransfer) || data.type === 'Transfer') {
            transactions = transactions.filter(t => !t.id.startsWith(transactionId) && !(t.transferPairId && t.transferPairId.startsWith(transactionId)));
        } else if (existingTransactionIndex !== -1) {
            transactions.splice(existingTransactionIndex, 1);
        }
        
        const baseId = transactionId;
        
        if (data.type === 'Transfer') {
            const transferOutId = `${baseId}_out_edited_${Date.now()}`;
            const transferInId = `${baseId}_in_edited_${Date.now()}`;
            
            transactions.push({
                id: transferOutId,
                datetime: data.datetime,
                description: data.description || `Chuyển tiền từ ${data.account} đến ${data.toAccount}`,
                category: CONFIG.TRANSFER_CATEGORY_OUT,
                amount: data.amount,
                type: 'Chi',
                account: data.account,
                currency: 'VND',
                isTransfer: true,
                transferPairId: transferInId,
                originalAmount: data.originalAmount,
                originalCurrency: data.originalCurrency
            });
            
            transactions.push({
                id: transferInId,
                datetime: data.datetime,
                description: data.description || `Nhận tiền từ ${data.account} vào ${data.toAccount}`,
                category: CONFIG.TRANSFER_CATEGORY_IN,
                amount: data.amount,
                type: 'Thu',
                account: data.toAccount,
                currency: 'VND',
                isTransfer: true,
                transferPairId: transferOutId,
                originalAmount: data.originalAmount,
                originalCurrency: data.originalCurrency
            });
            
            Utils.showMessage('Giao dịch chuyển tiền đã được cập nhật!', 'success');
        } else {
            transactions.push({
                id: baseId,
                datetime: data.datetime,
                description: data.description,
                category: data.category,
                amount: data.amount,
                type: data.type,
                account: data.account,
                currency: 'VND',
                isTransfer: false,
                transferPairId: null,
                originalAmount: data.originalAmount,
                originalCurrency: data.originalCurrency
            });
            
            Utils.showMessage(`Giao dịch ${data.type === 'Thu' ? 'thu' : 'chi'} đã được cập nhật!`, 'success');
        }
        
        editingTransactionId = null;
    },

    // Delete transaction
    deleteTransaction(transactionId) {
        if (!confirm('Bạn có chắc muốn xóa giao dịch này?')) return;
        
        const transactionToDelete = transactions.find(t => t.id === transactionId);
        
        if (transactionToDelete && transactionToDelete.isTransfer) {
            transactions = transactions.filter(t => t.id !== transactionToDelete.id && t.transferPairId !== transactionToDelete.id);
        } else {
            const baseIdMatch = transactionId.match(/^(\d+)(_out|_in)?$/);
            if (baseIdMatch && baseIdMatch[1]) {
                const baseId = baseIdMatch[1];
                transactions = transactions.filter(t => !t.id.startsWith(baseId) && !(t.transferPairId && t.transferPairId.startsWith(baseId)));
            } else {
                transactions = transactions.filter(t => t.id !== transactionId);
            }
        }
        
        DataManager.saveTransactions();
        FilterManager.applyMainFilter();
        Utils.showMessage('Đã xóa giao dịch.', 'success');
    },

    // Load transaction for editing
    loadForEdit(transactionId) {
        let transactionToEdit = transactions.find(t => t.id === transactionId);
        let baseIdForEdit = transactionId;

        if (!transactionToEdit) {
            const transferPart = transactions.find(t => t.isTransfer && (t.id === transactionId || t.transferPairId === transactionId));
            if (transferPart) {
                baseIdForEdit = transferPart.id.split('_')[0];
                const outTx = transactions.find(t => t.id.startsWith(baseIdForEdit) && t.type === 'Chi' && t.isTransfer);
                const inTx = transactions.find(t => t.id.startsWith(baseIdForEdit) && t.type === 'Thu' && t.isTransfer);
                
                if (outTx && inTx) {
                    transactionToEdit = outTx;
                    DOM.datetimeInput.value = Utils.formatDateTimeLocalInput(new Date(outTx.datetime));
                    document.getElementById('type-transfer').checked = true;
                    DOM.amountInput.value = String(outTx.originalAmount);
                    DOM.formCurrencySelector.value = outTx.originalCurrency;
                    DOM.descriptionInput.value = outTx.description.startsWith("Chuyển tiền từ") ? outTx.description : (inTx.description.startsWith("Nhận tiền từ") ? inTx.description : outTx.description);
                    DOM.accountInput.value = outTx.account;
                    DOM.toAccountInput.value = inTx.account;
                } else {
                    Utils.showMessage('Lỗi: Không tìm thấy đủ thông tin giao dịch chuyển tiền để sửa.', 'error');
                    return;
                }
            } else {
                Utils.showMessage('Lỗi: Không tìm thấy giao dịch.', 'error');
                return;
            }
        } else {
            DOM.datetimeInput.value = Utils.formatDateTimeLocalInput(new Date(transactionToEdit.datetime));
            document.querySelector(`input[name="type"][value="${transactionToEdit.type}"]`).checked = true;
            DOM.amountInput.value = String(transactionToEdit.originalAmount);
            DOM.formCurrencySelector.value = transactionToEdit.originalCurrency;
            DOM.descriptionInput.value = transactionToEdit.description;
            DOM.accountInput.value = transactionToEdit.account;
            if (transactionToEdit.type !== 'Transfer') DOM.categoryInput.value = transactionToEdit.category;
        }

        editingTransactionId = baseIdForEdit;
        DOM.formTitle.textContent = 'Sửa Giao Dịch';
        DOM.submitButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>Lưu Thay Đổi`;
        
        FormManager.toggleFormFields();
        CategoryManager.populateAccountDropdowns();
        
        if (document.querySelector('input[name="type"]:checked').value !== 'Transfer') {
            CategoryManager.populateCategories();
            if (transactionToEdit && transactionToEdit.type !== 'Transfer') DOM.categoryInput.value = transactionToEdit.category;
        }
        
        const formSection = document.querySelector('.form-section .collapsible-header');
        if (formSection && !formSection.classList.contains('active')) formSection.click();
        formSection.scrollIntoView({ behavior: 'smooth' });
    },

    // Reset form
    resetForm(persistedType = null) {
        const previousAccountValue = DOM.accountInput.value;
        const previousToAccountValue = DOM.toAccountInput.value;

        DOM.transactionForm.reset();
        DOM.datetimeInput.value = Utils.formatDateTimeLocalInput(new Date());
        DOM.formCurrencySelector.value = 'VND';

        if (persistedType) {
            const radioToSelect = document.querySelector(`input[name="type"][value="${persistedType}"]`);
            if (radioToSelect) radioToSelect.checked = true;
        } else {
            const typeChiRadio = document.getElementById('type-chi');
            if (typeChiRadio) typeChiRadio.checked = true;
        }

        editingTransactionId = null;
        DOM.formTitle.textContent = 'Thêm Giao Dịch Mới';
        DOM.submitButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>Thêm Giao Dịch';

        FormManager.toggleFormFields();
        CategoryManager.populateAccountDropdowns();

        if (DOM.accountInput && Array.from(DOM.accountInput.options).some(opt => opt.value === previousAccountValue)) {
            DOM.accountInput.value = previousAccountValue;
        }
        
        if (document.querySelector('input[name="type"]:checked')?.value === 'Transfer' && 
            DOM.toAccountInput && 
            Array.from(DOM.toAccountInput.options).some(opt => opt.value === previousToAccountValue)) {
            DOM.toAccountInput.value = previousToAccountValue;
        }

        const currentTransactionType = document.querySelector('input[name="type"]:checked');
        if (currentTransactionType && currentTransactionType.value !== 'Transfer') {
            CategoryManager.populateCategories();
        }
    }
};

// ========================================================================================
// 7. CATEGORY & ACCOUNT MANAGEMENT
// ========================================================================================

const CategoryManager = {
    // Populate account dropdowns
    populateAccountDropdowns() {
        if (!DOM.accountInput || !DOM.toAccountInput) return;
        
        const currentFromAccount = DOM.accountInput.value;
        const currentToAccount = DOM.toAccountInput.value;
        
        DOM.accountInput.innerHTML = '';
        DOM.toAccountInput.innerHTML = '';
        
        if (!accounts || accounts.length === 0) accounts = [...DEFAULT_DATA.accounts];
        
        accounts.forEach(acc => {
            DOM.accountInput.add(new Option(acc.text, acc.value));
            DOM.toAccountInput.add(new Option(acc.text, acc.value));
        });
        
        if (accounts.some(acc => acc.value === currentFromAccount)) {
            DOM.accountInput.value = currentFromAccount;
        } else if (accounts.length > 0) {
            DOM.accountInput.value = accounts[0].value;
        }
        
        if (accounts.some(acc => acc.value === currentToAccount)) {
            DOM.toAccountInput.value = currentToAccount;
        } else if (accounts.length > 1) {
            DOM.toAccountInput.value = accounts[1].value;
        } else if (accounts.length > 0) {
            DOM.toAccountInput.value = accounts[0].value;
        }
    },

    // Populate categories based on transaction type
    populateCategories() {
        if (!DOM.categoryInput) return;
        
        const selectedTypeRadio = document.querySelector('input[name="type"]:checked');
        const selectedType = selectedTypeRadio ? selectedTypeRadio.value : 'Chi';
        const currentCategoryValue = DOM.categoryInput.value;
        
        DOM.categoryInput.innerHTML = '';
        
        let categoriesToPopulate = (selectedType === 'Thu') ? incomeCategories : expenseCategories;
        categoriesToPopulate = categoriesToPopulate.filter(cat => cat.value !== CONFIG.TRANSFER_CATEGORY_IN && cat.value !== CONFIG.TRANSFER_CATEGORY_OUT);
        
        if (!categoriesToPopulate || categoriesToPopulate.length === 0) {
            const defaultCats = (selectedType === 'Thu') ? [...DEFAULT_DATA.incomeCategories] : [...DEFAULT_DATA.expenseCategories];
            categoriesToPopulate = defaultCats.filter(cat => cat.value !== CONFIG.TRANSFER_CATEGORY_IN && cat.value !== CONFIG.TRANSFER_CATEGORY_OUT);
        }
        
        categoriesToPopulate.forEach(category => DOM.categoryInput.add(new Option(category.text, category.value)));
        
        if (categoriesToPopulate.some(cat => cat.value === currentCategoryValue)) {
            DOM.categoryInput.value = currentCategoryValue;
        } else if (categoriesToPopulate.length > 0) {
            DOM.categoryInput.value = categoriesToPopulate[0].value;
        }
    },

    // Add new category
    addCategory(name, type) {
        if (!name || name.trim() === '') {
            Utils.showMessage('Tên hạng mục không được để trống.', 'error');
            return false;
        }
        
        const newCategoryValue = name.trim();
        const newCategory = { value: newCategoryValue, text: newCategoryValue };
        
        if (type === 'income') {
            if (incomeCategories.some(cat => cat.value.toLowerCase() === newCategoryValue.toLowerCase())) {
                Utils.showMessage('Hạng mục thu này đã tồn tại.', 'error');
                return false;
            }
            incomeCategories.push(newCategory);
        } else {
            if (expenseCategories.some(cat => cat.value.toLowerCase() === newCategoryValue.toLowerCase())) {
                Utils.showMessage('Hạng mục chi này đã tồn tại.', 'error');
                return false;
            }
            expenseCategories.push(newCategory);
        }
        
        DataManager.saveUserPreferences();
        UIRenderer.renderCustomCategoryLists();
        this.populateCategories();
        Utils.showMessage(`Đã thêm hạng mục "${newCategory.text}"!`, 'success');
        return true;
    },

    // Add new account
    addAccount(name) {
        if (!name || name.trim() === '') {
            Utils.showMessage('Tên tài khoản không được để trống.', 'error');
            return false;
        }
        
        const newAccountName = name.trim();
        if (accounts.some(acc => acc.value.toLowerCase() === newAccountName.toLowerCase() || acc.text.toLowerCase() === newAccountName.toLowerCase())) {
            Utils.showMessage('Tài khoản này đã tồn tại.', 'error');
            return false;
        }
        
        const newAccount = { value: newAccountName, text: newAccountName };
        accounts.push(newAccount);
        
        DataManager.saveUserPreferences();
        UIRenderer.renderAccountListAdmin();
        this.populateAccountDropdowns();
        UIRenderer.updateAccountBalances();
        Utils.showMessage(`Đã thêm tài khoản "${newAccount.text}"!`, 'success');
        return true;
    }
};

// ========================================================================================
// 8. FORM MANAGEMENT
// ========================================================================================

const FormManager = {
    // Toggle form fields based on transaction type
    toggleFormFields() {
        const selectedTypeRadio = document.querySelector('input[name="type"]:checked');
        const selectedType = selectedTypeRadio ? selectedTypeRadio.value : 'Chi';

        const categoryFieldContainer = document.querySelector('.form-field-normal');
        const toAccountFieldContainer = document.querySelector('.form-field-transfer');

        if (!categoryFieldContainer) {
            console.error("Lỗi: Không tìm thấy container cho trường Hạng mục (class 'form-field-normal').");
        }
        if (!toAccountFieldContainer) {
            console.error("Lỗi: Không tìm thấy container cho trường Đến Tài khoản (class 'form-field-transfer').");
        }

        if (DOM.transactionForm) {
            DOM.transactionForm.dataset.transactionMode = selectedType;
        }

        if (selectedType === 'Transfer') {
            if (DOM.accountLabel) DOM.accountLabel.textContent = 'Từ Tài khoản:';
            if (categoryFieldContainer) categoryFieldContainer.style.display = 'none';
            if (DOM.categoryInput) DOM.categoryInput.removeAttribute('required');
            if (toAccountFieldContainer) toAccountFieldContainer.style.display = 'block';
            if (DOM.toAccountInput) DOM.toAccountInput.setAttribute('required', '');
        } else {
            if (DOM.accountLabel) DOM.accountLabel.textContent = 'Tài khoản:';
            if (categoryFieldContainer) categoryFieldContainer.style.display = 'block';
            if (DOM.categoryInput) DOM.categoryInput.setAttribute('required', '');
            if (toAccountFieldContainer) toAccountFieldContainer.style.display = 'none';
            if (DOM.toAccountInput) DOM.toAccountInput.removeAttribute('required');
            CategoryManager.populateCategories();
        }
    },

    // Set default form values
    setDefaults() {
        if (DOM.datetimeInput) DOM.datetimeInput.value = Utils.formatDateTimeLocalInput(new Date());
        if (DOM.filterComparisonYearInput) DOM.filterComparisonYearInput.value = new Date().getFullYear();
        if (DOM.filterSpecificDateInput) DOM.filterSpecificDateInput.value = Utils.getCurrentDateFormattedYYYYMMDD();
    }
};

// ========================================================================================
// 9. UI RENDERING
// ========================================================================================

const UIRenderer = {
    // Render main transaction list
    renderMainTransactions(txsToRender = transactions) {
        if (!DOM.transactionList) return;
        
        DOM.transactionList.innerHTML = '';
        if (txsToRender.length === 0) {
            if (DOM.noTransactionsMessage) DOM.noTransactionsMessage.style.display = 'block';
            return;
        }
        
        if (DOM.noTransactionsMessage) DOM.noTransactionsMessage.style.display = 'none';
        txsToRender.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
        
        txsToRender.forEach(tx => {
            const row = DOM.transactionList.insertRow();
            row.insertCell().textContent = Utils.formatDisplayDateTime(tx.datetime);
            
            let displayDescription = tx.description;
            let displayCategory = tx.category;
            let displayAccount = accounts.find(a => a.value === tx.account)?.text || tx.account;
            
            if (tx.isTransfer) {
                const pair = transactions.find(p => p.id === tx.transferPairId);
                const pairAccountName = pair ? (accounts.find(a => a.value === pair.account)?.text || pair.account) : 'N/A';
                if (tx.type === 'Chi') {
                    displayDescription = displayDescription || `Chuyển đến ${pairAccountName}`;
                } else {
                    displayDescription = displayDescription || `Nhận từ ${pairAccountName}`;
                }
            }
            
            row.insertCell().textContent = displayDescription;
            row.insertCell().textContent = displayCategory;
            
            const amountCell = row.insertCell();
            const vndAmountFormatted = Utils.formatCurrency(tx.amount);
            if (tx.originalCurrency === 'USD' && typeof tx.originalAmount === 'number') {
                const originalUsdFormatted = Utils.formatCurrency(tx.originalAmount, 'USD');
                amountCell.innerHTML = `${vndAmountFormatted} <span class="text-xs text-gray-500 block sm:inline ml-1">(${originalUsdFormatted} gốc)</span>`;
            } else {
                amountCell.textContent = vndAmountFormatted;
            }
            amountCell.classList.add(tx.type === 'Thu' ? 'text-green-600' : 'text-red-600');
            
            row.insertCell().textContent = tx.type === 'Thu' ? 'Thu Nhập' : (tx.type === 'Chi' ? 'Chi Tiêu' : 'Chuyển Tiền');
            row.insertCell().textContent = displayAccount;
            
            const actionsCell = row.insertCell();
            actionsCell.classList.add('text-center');
            
            const editBtn = document.createElement('button');
            editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square mr-1" viewBox="0 0 16 16"> <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/> <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/> </svg>Sửa`;
            editBtn.classList.add('btn-edit');
            const editId = tx.isTransfer ? tx.id.split('_')[0] : tx.id;
            editBtn.onclick = () => TransactionManager.loadForEdit(editId);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash mr-1" viewBox="0 0 16 16"> <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/> <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/> </svg>Xóa`;
            deleteBtn.classList.add('btn-delete');
            const deleteId = tx.isTransfer ? tx.id.split('_')[0] : tx.id;
            deleteBtn.onclick = () => TransactionManager.deleteTransaction(deleteId);
            
            actionsCell.appendChild(editBtn);
            actionsCell.appendChild(deleteBtn);
        });
    },

    // Update account balances
    updateAccountBalances() {
        if (!DOM.accountBalanceListEl) return;
        
        DOM.accountBalanceListEl.innerHTML = '<h3>Số Dư Theo Tài Khoản (Tổng thể - VNĐ):</h3>';
        const balances = {};
        
        accounts.forEach(acc => balances[acc.value] = 0);
        
        transactions.forEach(tx => {
            if (balances[tx.account] !== undefined) {
                if (tx.type === 'Thu') balances[tx.account] += tx.amount;
                else if (tx.type === 'Chi') balances[tx.account] -= tx.amount;
            }
        });
        
        Object.keys(balances).forEach(accValue => {
            const acc = accounts.find(a => a.value === accValue);
            if (acc) {
                const balanceItem = document.createElement('div');
                balanceItem.classList.add('summary-item');
                balanceItem.innerHTML = `<span>${acc.text}: </span><span class="${balances[accValue] >= 0 ? 'text-green-600' : 'text-red-600'}">${Utils.formatCurrency(balances[accValue])}</span>`;
                DOM.accountBalanceListEl.appendChild(balanceItem);
            }
        });
    },

    // Render custom category lists
    renderCustomCategoryLists() {
        this.renderCategoryList(DOM.incomeCategoryListAdmin, incomeCategories, 'income');
        this.renderCategoryList(DOM.expenseCategoryListAdmin, expenseCategories, 'expense');
    },

    renderCategoryList(listElement, categoriesArray, type) {
        if (!listElement) return;
        
        listElement.innerHTML = '';
        categoriesArray.forEach(cat => {
            const isSpecialTransferCategory = (cat.value === CONFIG.TRANSFER_CATEGORY_IN || cat.value === CONFIG.TRANSFER_CATEGORY_OUT);
            const li = document.createElement('li');
            li.textContent = cat.text;
            
            if (!isSpecialTransferCategory) {
                const deleteButton = document.createElement('button');
                deleteButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash mr-1" viewBox="0 0 16 16"> <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/> <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/> </svg>Xóa`;
                deleteButton.classList.add('btn-delete', 'text-xs', 'px-2', 'py-1', 'ml-2');
                deleteButton.onclick = () => {
                    if (confirm(`Bạn có chắc muốn xóa hạng mục "${cat.text}" không?`)) {
                        if (type === 'income') {
                            incomeCategories = incomeCategories.filter(c => c.value !== cat.value);
                        } else {
                            expenseCategories = expenseCategories.filter(c => c.value !== cat.value);
                        }
                        DataManager.saveUserPreferences();
                        this.renderCustomCategoryLists();
                        CategoryManager.populateCategories();
                        FilterManager.applyMainFilter();
                    }
                };
                li.appendChild(deleteButton);
            } else {
                const lockIcon = document.createElement('span');
                lockIcon.innerHTML = ` <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-lock-fill inline-block ml-2 text-gray-400" viewBox="0 0 16 16"><path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/></svg>`;
                li.appendChild(lockIcon);
            }
            listElement.appendChild(li);
        });
    },

    renderAccountListAdmin() {
        if (!DOM.accountListAdmin) return;
        
        DOM.accountListAdmin.innerHTML = '';
        accounts.forEach(acc => {
            const li = document.createElement('li');
            li.textContent = acc.text;
            const deleteButton = document.createElement('button');
            deleteButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash mr-1" viewBox="0 0 16 16"> <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/> <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/> </svg>Xóa`;
            deleteButton.classList.add('btn-delete', 'text-xs', 'px-2', 'py-1', 'ml-2');
            deleteButton.onclick = () => {
                if (confirm(`Bạn có chắc muốn xóa tài khoản "${acc.text}" không? Lưu ý: Các giao dịch cũ liên quan đến tài khoản này sẽ không tự động cập nhật.`)) {
                    accounts = accounts.filter(a => a.value !== acc.value);
                    DataManager.saveUserPreferences();
                    this.renderAccountListAdmin();
                    CategoryManager.populateAccountDropdowns();
                    this.updateAccountBalances();
                    Utils.showMessage(`Đã xóa tài khoản "${acc.text}".`, 'success');
                }
            };
            li.appendChild(deleteButton);
            DOM.accountListAdmin.appendChild(li);
        });
    },

    // Update summary section text
    updateSummarySectionText(summaryTransactions, monthForDisplay) {
        let totalIncome = 0;
        let totalExpenses = 0;

        if (typeof summaryTransactions !== 'undefined' && Array.isArray(summaryTransactions)) {
            summaryTransactions.forEach(tx => {
                if (tx.type === 'Thu' && !tx.isTransfer) {
                    totalIncome += tx.amount;
                } else if (tx.type === 'Chi' && !tx.isTransfer) {
                    totalExpenses += tx.amount;
                }
            });
        }

        const monthDisplayTextForLabels = this.getMonthDisplayText(monthForDisplay, true);

        if (DOM.summaryIncomeMonthDisplay) DOM.summaryIncomeMonthDisplay.textContent = monthDisplayTextForLabels;
        if (DOM.summaryExpenseMonthDisplay) DOM.summaryExpenseMonthDisplay.textContent = monthDisplayTextForLabels;
        if (DOM.summaryBalanceMonthDisplay) DOM.summaryBalanceMonthDisplay.textContent = monthDisplayTextForLabels;

        if (DOM.totalIncomeEl) DOM.totalIncomeEl.textContent = Utils.formatCurrency(totalIncome);
        if (DOM.totalExpensesEl) DOM.totalExpensesEl.textContent = Utils.formatCurrency(totalExpenses);

        if (DOM.currentBalanceEl) {
            const balance = totalIncome - totalExpenses;
            DOM.currentBalanceEl.textContent = Utils.formatCurrency(balance);
            let balanceClasses = 'font-bold';
            if (balance >= 0) {
                balanceClasses += ' text-blue-600 dark:text-blue-400';
            } else {
                balanceClasses += ' text-red-600 dark:text-red-400';
            }
            DOM.currentBalanceEl.className = balanceClasses;
        }
    },

    getMonthDisplayText(selectedMonthValue, withParentheses = true) {
        let text;
        if (selectedMonthValue === 'all' || !selectedMonthValue) {
            text = "Tất cả";
        } else {
            const parts = selectedMonthValue.split('-');
            if (parts.length === 2) {
                const [year, month] = parts;
                text = `Tháng ${month}/${year}`;
            } else {
                text = "Đã chọn";
            }
        }
        return withParentheses ? `(${text})` : text;
    }
};

// ========================================================================================
// 10. CHARTS & ANALYTICS
// ========================================================================================

const ChartManager = {
    // Initialize Chart.js
    init() {
        if (typeof Chart !== 'undefined' && typeof ChartDataLabels !== 'undefined') {
            Chart.register(ChartDataLabels);
        }
    },

    // Update all summaries and charts
    updateAllSummariesAndCharts(transactionsToAnalyze = transactions) {
        this.updateMainSummaryAndChart(transactionsToAnalyze);
        this.renderExpenseCategoryChartAndList(transactionsToAnalyze);
        UIRenderer.updateAccountBalances();
        this.renderLast7DaysChart();
        this.renderMonthComparisonChart();
    },

    // Update main summary chart
    updateMainSummaryAndChart(summaryTransactionsToUse = transactions, monthForDisplay = (DOM.filterMonthSelect ? DOM.filterMonthSelect.value : 'all')) {
        let totalIncome = 0;
        let totalExpenses = 0;

        if (typeof summaryTransactionsToUse !== 'undefined' && Array.isArray(summaryTransactionsToUse)) {
            summaryTransactionsToUse.forEach(tx => {
                if (tx.type === 'Thu') totalIncome += tx.amount;
                else if (tx.type === 'Chi') totalExpenses += tx.amount;
            });
        } else {
            console.warn("updateMainSummaryAndChart: summaryTransactionsToUse is not an array");
        }

        if (typeof this.renderOrUpdateMainChart === 'function' && DOM.incomeExpenseChartCanvas) {
            this.renderOrUpdateMainChart(totalIncome, totalExpenses);
        }
    },

    // Render or update main chart
    renderOrUpdateMainChart(income, expenses) {
        const data = {
            labels: ['Tổng Thu', 'Tổng Chi'],
            datasets: [{
                label: 'Số tiền (VNĐ)',
                data: [income, expenses],
                backgroundColor: [CATEGORY_COLORS[1], CATEGORY_COLORS[0]],
            }]
        };
        
        if (incomeExpenseChart) {
            incomeExpenseChart.data = data;
            incomeExpenseChart.update();
        } else {
            incomeExpenseChart = new Chart(DOM.incomeExpenseChartCanvas, {
                type: 'bar',
                data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        datalabels: { display: false }
                    }
                }
            });
        }
    },

    // Render expense category charts and list
    renderExpenseCategoryChartAndList(transactionsToAnalyze = transactions) {
        const expenseTransactions = transactionsToAnalyze.filter(t => t.type === 'Chi' && !t.isTransfer);
        const expenseByCategory = {};
        let totalExpensesInFilteredPeriod = 0;

        expenseTransactions.forEach(tx => {
            const category = tx.category || "Chưa phân loại";
            expenseByCategory[category] = (expenseByCategory[category] || 0) + tx.amount;
            totalExpensesInFilteredPeriod += tx.amount;
        });

        // Handle no expense data
        const noExpenseDataChartEl = document.getElementById('no-expense-data-chart');
        const noExpenseDataListEl = document.getElementById('no-expense-data-list');
        const expenseCategoryListContainerEl = document.getElementById('expense-category-list-container');
        
        if (totalExpensesInFilteredPeriod === 0) {
            if (DOM.expensePieChartContainer) DOM.expensePieChartContainer.style.display = 'none';
            if (DOM.expenseBarChartContainer) DOM.expenseBarChartContainer.style.display = 'none';
            if (noExpenseDataChartEl) noExpenseDataChartEl.style.display = 'block';

            if (expenseCategoryChart) { expenseCategoryChart.destroy(); expenseCategoryChart = null; }
            if (expenseCategoryBarChart) { expenseCategoryBarChart.destroy(); expenseCategoryBarChart = null; }

            if (expenseCategoryListContainerEl) expenseCategoryListContainerEl.innerHTML = '';
            if (noExpenseDataListEl) noExpenseDataListEl.style.display = 'block';
            return;
        }

        // Hide no data messages
        if (noExpenseDataChartEl) noExpenseDataChartEl.style.display = 'none';
        if (noExpenseDataListEl) noExpenseDataListEl.style.display = 'none';

        const sortedCategoriesArray = Object.entries(expenseByCategory).sort(([, a], [, b]) => b - a);
        const categoryLabels = sortedCategoriesArray.map(entry => entry[0]);
        const categoryData = sortedCategoriesArray.map(entry => entry[1]);
        const backgroundColors = categoryLabels.map((_, i) => CATEGORY_COLORS[i % CATEGORY_COLORS.length]);

        // Theme colors
        const currentThemeIsDark = document.body.classList.contains(CONFIG.DARK_MODE_CLASS);
        const pieBorderColor = '#FFFFFF';
        const legendAndTickColor = currentThemeIsDark ? '#9ca3af' : '#6b7280';
        const gridLineColor = currentThemeIsDark ? 'rgba(107, 114, 128, 0.2)' : 'rgba(209, 213, 219, 0.5)';
        const datalabelPieColor = '#ffffff';
        const datalabelBarColor = currentThemeIsDark ? '#e0e0e0' : '#333333';

        // Pie chart
        const pieChartData = {
            labels: categoryLabels,
            datasets: [{
                data: categoryData,
                backgroundColor: backgroundColors,
                borderColor: pieBorderColor,
                borderWidth: 2
            }]
        };

        const pieChartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, padding: 15, color: legendAndTickColor } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) { label += ': '; }
                            const value = context.raw;
                            label += Utils.formatCurrency(value, 'VND');
                            if (totalExpensesInFilteredPeriod > 0) {
                                const percentage = (value / totalExpensesInFilteredPeriod * 100).toFixed(1);
                                label += ` (${percentage}%)`;
                            }
                            return label;
                        }
                    }
                },
                datalabels: {
                    formatter: (value, ctx) => {
                        if (totalExpensesInFilteredPeriod === 0) return '';
                        const percentage = (value / totalExpensesInFilteredPeriod) * 100;
                        return percentage > 5 ? percentage.toFixed(0) + '%' : '';
                    },
                    color: datalabelPieColor,
                    font: { weight: 'bold' }
                }
            }
        };

        if (expenseCategoryChart) {
            expenseCategoryChart.data = pieChartData;
            expenseCategoryChart.options.plugins.legend.labels.color = legendAndTickColor;
            expenseCategoryChart.data.datasets[0].borderColor = pieBorderColor;
            expenseCategoryChart.options.plugins.datalabels.color = datalabelPieColor;
            expenseCategoryChart.update();
        } else {
            if (DOM.expenseCategoryChartCanvas) {
                expenseCategoryChart = new Chart(DOM.expenseCategoryChartCanvas, {
                    type: 'doughnut',
                    data: pieChartData,
                    options: pieChartOptions,
                    plugins: [ChartDataLabels]
                });
            }
        }

        // Bar chart
        const barChartData = {
            labels: categoryLabels,
            datasets: [{
                label: 'Số tiền chi',
                data: categoryData,
                backgroundColor: backgroundColors,
                borderColor: backgroundColors,
                borderWidth: 1
            }]
        };

        const barChartOptions = {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true,
                    title: { display: true, text: 'Số tiền (VNĐ)', color: legendAndTickColor },
                    ticks: {
                        callback: function(value) { return Utils.formatCurrency(value, 'VND').replace(/\s*VNĐ$/, ''); },
                        color: legendAndTickColor
                    },
                    grid: { color: gridLineColor }
                },
                y: {
                    ticks: { color: legendAndTickColor },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return Utils.formatCurrency(context.raw, 'VND');
                        }
                    }
                },
                datalabels: {
                    anchor: 'end',
                    align: 'end',
                    formatter: (value) => Utils.formatCurrency(value, 'VND'),
                    color: datalabelBarColor,
                    font: { weight: 'bold', size: 10 },
                    padding: { left: 4 }
                }
            }
        };

        if (expenseCategoryBarChart) {
            expenseCategoryBarChart.data = barChartData;
            expenseCategoryBarChart.options.scales.x.title.color = legendAndTickColor;
            expenseCategoryBarChart.options.scales.x.ticks.color = legendAndTickColor;
            expenseCategoryBarChart.options.scales.x.grid.color = gridLineColor;
            expenseCategoryBarChart.options.scales.y.ticks.color = legendAndTickColor;
            expenseCategoryBarChart.options.plugins.datalabels.color = datalabelBarColor;
            expenseCategoryBarChart.update();
        } else {
            if (DOM.expenseCategoryBarCtx) {
                expenseCategoryBarChart = new Chart(DOM.expenseCategoryBarCtx, {
                    type: 'bar',
                    data: barChartData,
                    options: barChartOptions,
                    plugins: [ChartDataLabels]
                });
            }
        }

        // Update category list
        if (expenseCategoryListContainerEl && totalExpensesInFilteredPeriod > 0) {
            expenseCategoryListContainerEl.innerHTML = '';
            let listHTML = '<ul class="space-y-2">';
            sortedCategoriesArray.forEach(([label, amount], index) => {
                const percentage = (amount / totalExpensesInFilteredPeriod * 100).toFixed(1);
                const color = backgroundColors[index % backgroundColors.length];
                listHTML += `<li class="flex justify-between items-center text-sm">
                                <div class="flex items-center">
                                    <span class="inline-block w-3 h-3 rounded-full mr-2" style="background-color: ${color}"></span>
                                    <span>${label}</span>
                                </div>
                                <div class="text-right">
                                    <span class="font-semibold">${Utils.formatCurrency(amount)}</span>
                                    <span class="text-gray-500 dark:text-gray-400 ml-2">(${percentage}%)</span>
                                </div>
                             </li>`;
            });
            listHTML += '</ul>';
            expenseCategoryListContainerEl.innerHTML = listHTML;
        } else if (expenseCategoryListContainerEl) {
            expenseCategoryListContainerEl.innerHTML = '';
        }

        this.toggleExpenseChartDisplay();
    },

    // Toggle expense chart display
    toggleExpenseChartDisplay() {
        if (!DOM.expenseChartTypeSelector || !DOM.expensePieChartContainer || !DOM.expenseBarChartContainer) {
            return;
        }

        const selectedType = DOM.expenseChartTypeSelector.value;
        const noExpenseDataChartEl = document.getElementById('no-expense-data-chart');
        
        const chartsHaveData = (expenseCategoryChart && expenseCategoryChart.data.labels && expenseCategoryChart.data.labels.length > 0) ||
                               (expenseCategoryBarChart && expenseCategoryBarChart.data.labels && expenseCategoryBarChart.data.labels.length > 0);

        if (!chartsHaveData) {
            DOM.expensePieChartContainer.style.display = 'none';
            DOM.expenseBarChartContainer.style.display = 'none';
            if (noExpenseDataChartEl) noExpenseDataChartEl.style.display = 'block';
            return;
        }

        if (selectedType === 'pie') {
            DOM.expensePieChartContainer.style.display = 'block';
            DOM.expenseBarChartContainer.style.display = 'none';
        } else if (selectedType === 'bar') {
            DOM.expensePieChartContainer.style.display = 'none';
            DOM.expenseBarChartContainer.style.display = 'block';
        }
    },

    // Render last 7 days chart
    renderLast7DaysChart() {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        
        const dailyExpenses = {};
        const labels = [];
        
        for (let i = 0; i < 7; i++) {
            const d = new Date(sevenDaysAgo);
            d.setDate(d.getDate() + i);
            const dateString = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
            labels.push(dateString);
            dailyExpenses[dateString] = 0;
        }
        
        transactions.filter(tx => {
            const txDate = new Date(tx.datetime);
            return tx.type === 'Chi' && !tx.isTransfer && txDate >= sevenDaysAgo && txDate <= today;
        }).forEach(tx => {
            const dateString = new Date(tx.datetime).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
            if (dailyExpenses[dateString] !== undefined) dailyExpenses[dateString] += tx.amount;
        });
        
        const dataValues = labels.map(label => dailyExpenses[label]);
        const data = {
            labels: labels,
            datasets: [{
                label: 'Chi tiêu hàng ngày (VNĐ)',
                data: dataValues,
                borderColor: CATEGORY_COLORS[3],
                backgroundColor: 'transparent',
                tension: 0.1,
                fill: false
            }]
        };
        
        if (last7DaysChart) {
            last7DaysChart.data = data;
            last7DaysChart.update();
        } else {
            last7DaysChart = new Chart(DOM.last7DaysChartCanvas, {
                type: 'line',
                data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        datalabels: { display: false }
                    }
                }
            });
        }
    },

    // Render month comparison chart
    renderMonthComparisonChart() {
        const currentMonthFilter = DOM.filterMonthSelect ? DOM.filterMonthSelect.value : null;
        if (!currentMonthFilter || currentMonthFilter === 'all') return;
        
        const [currentYear, currentMonthNum] = currentMonthFilter.split('-').map(Number);
        let prevYear = currentYear;
        let prevMonthNum = currentMonthNum - 1;
        
        if (prevMonthNum === 0) {
            prevMonthNum = 12;
            prevYear--;
        }
        
        const prevMonthFilter = `${prevYear}-${String(prevMonthNum).padStart(2, '0')}`;
        let currentMonthIncome = 0, currentMonthExpenses = 0, prevMonthIncome = 0, prevMonthExpenses = 0;
        
        transactions.forEach(tx => {
            const txMonth = tx.datetime.substring(0, 7);
            if (txMonth === currentMonthFilter) {
                if (tx.type === 'Thu' && !tx.isTransfer) currentMonthIncome += tx.amount;
                else if (tx.type === 'Chi' && !tx.isTransfer) currentMonthExpenses += tx.amount;
            } else if (txMonth === prevMonthFilter) {
                if (tx.type === 'Thu' && !tx.isTransfer) prevMonthIncome += tx.amount;
                else if (tx.type === 'Chi' && !tx.isTransfer) prevMonthExpenses += tx.amount;
            }
        });
        
        const data = {
            labels: ['Tháng Trước', 'Tháng Này'],
            datasets: [
                { label: 'Tổng Thu', data: [prevMonthIncome, currentMonthIncome], backgroundColor: CATEGORY_COLORS[1] },
                { label: 'Tổng Chi', data: [prevMonthExpenses, currentMonthExpenses], backgroundColor: CATEGORY_COLORS[0] }
            ]
        };
        
        if (monthComparisonChart) {
            monthComparisonChart.data = data;
            monthComparisonChart.update();
        } else {
            monthComparisonChart = new Chart(DOM.monthComparisonChartCanvas, {
                type: 'bar',
                data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'x',
                    plugins: {
                        datalabels: { display: false }
                    }
                }
            });
        }
    },

    // Update chart colors for theme
    updateAllChartColorsForTheme(theme) {
        const isDarkMode = theme === 'dark';
        const gridColor = isDarkMode ? 'rgba(107, 114, 128, 0.2)' : 'rgba(209, 213, 219, 0.5)';
        const ticksColor = isDarkMode ? '#9ca3af' : '#6b7280';
        const axisLineColor = isDarkMode ? '#4b5563' : '#d1d5db';
        const legendAndAxisTitleColor = isDarkMode ? '#d1d5db' : '#374151';
        const chartMainTitleColor = isDarkMode ? '#e5e7eb' : '#1f2937';
        let pieSliceBorderColor = isDarkMode ? (window.getComputedStyle(document.body).backgroundColor || '#374151') : '#ffffff';
        const datalabelPieColor = '#ffffff';
        const datalabelGeneralColor = isDarkMode ? '#e0e0e0' : '#333333';

        const charts = [
            incomeExpenseChart, expenseCategoryChart, last7DaysChart,
            monthComparisonChart, expenseCategoryBarChart
        ].filter(c => c && c.ctx && typeof c.update === 'function');

        charts.forEach(chart => {
            if (!chart.options) return;
            try {
                if (chart.options.plugins) {
                    if (chart.options.plugins.legend && chart.options.plugins.legend.labels) {
                        chart.options.plugins.legend.labels.color = legendAndAxisTitleColor;
                    }
                    if (chart.options.plugins.title && chart.options.plugins.title.display) {
                        chart.options.plugins.title.color = chartMainTitleColor;
                    }
                }

                if (chart.options.scales) {
                    Object.keys(chart.options.scales).forEach(scaleKey => {
                        const scale = chart.options.scales[scaleKey];
                        if (scale) {
                            if (scale.grid) scale.grid.color = gridColor;
                            if (typeof scale.borderColor !== 'undefined') scale.borderColor = axisLineColor;
                            if (scale.ticks) scale.ticks.color = ticksColor;
                            if (scale.title && scale.title.display) scale.title.color = legendAndAxisTitleColor;
                        }
                    });
                }

                if (chart.options.plugins && chart.options.plugins.datalabels) {
                    chart.options.plugins.datalabels.color = (chart === expenseCategoryChart) ? datalabelPieColor : datalabelGeneralColor;
                }
                
                if (chart === expenseCategoryChart && chart.data.datasets && chart.data.datasets.length > 0) {
                    chart.data.datasets[0].borderColor = pieSliceBorderColor;
                }
                
                chart.update();
            } catch (e) {
                console.error("[Theme] Error updating chart colors:", chart.config ? chart.config.type : 'Unknown Chart', e);
            }
        });
    }
};

// ========================================================================================
// 11. FILTERING & SEARCH
// ========================================================================================

const FilterManager = {
    // Populate month filter dropdown
    populateMonthFilter() {
        if (!DOM.filterMonthSelect) {
            console.warn("populateMonthFilter: filterMonthSelect is not defined.");
            return;
        }
        
        const months = new Set();
        if (typeof transactions !== 'undefined' && Array.isArray(transactions)) {
            transactions.forEach(tx => {
                if (tx.datetime && typeof tx.datetime === 'string' && tx.datetime.length >= 7) {
                    months.add(tx.datetime.substring(0, 7));
                }
            });
        }
        
        const sortedMonths = Array.from(months).sort().reverse();
        DOM.filterMonthSelect.innerHTML = '<option value="all">Tất cả các tháng</option>';

        sortedMonths.forEach(monthStr => {
            if (monthStr && typeof monthStr === 'string' && monthStr.includes('-')) {
                const parts = monthStr.split('-');
                if (parts.length === 2) {
                    const year = parts[0];
                    const month = parts[1];
                    const displayText = `Tháng ${month}/${year}`;
                    const option = new Option(displayText, monthStr);
                    DOM.filterMonthSelect.add(option);
                }
            }
        });

        // Set default value
        const currentSystemMonthFormatted = new Date().toISOString().substring(0, 7);
        if (sortedMonths.includes(currentSystemMonthFormatted)) {
            DOM.filterMonthSelect.value = currentSystemMonthFormatted;
        } else if (sortedMonths.length > 0 && sortedMonths[0] && typeof sortedMonths[0] === 'string') {
            DOM.filterMonthSelect.value = sortedMonths[0];
        } else {
            DOM.filterMonthSelect.value = "all";
        }
    },

    // Apply main filter
    applyMainFilter() {
        const selectedMonth = DOM.filterMonthSelect ? DOM.filterMonthSelect.value : 'all';
        const selectedSpecificDate = DOM.filterSpecificDateInput ? DOM.filterSpecificDateInput.value : "";
        
        console.log(`[Filter] Applying filter: Month='${selectedMonth}', Date='${selectedSpecificDate}'`);

        // Filter data for monthly scope
        let transactionsForMonthlyScope = [...transactions]; 
        if (selectedMonth !== 'all') {
            transactionsForMonthlyScope = transactionsForMonthlyScope.filter(tx => {
                return tx.datetime && typeof tx.datetime === 'string' && tx.datetime.startsWith(selectedMonth);
            });
        }

        // Filter data for daily list scope
        let transactionsForDailyListScope = [...transactionsForMonthlyScope];
        if (selectedSpecificDate) { 
            let baseForDailyFilter = (selectedMonth === 'all') ? [...transactions] : [...transactionsForMonthlyScope];
            transactionsForDailyListScope = baseForDailyFilter.filter(tx => {
                if (!tx.datetime || typeof tx.datetime !== 'string') return false;
                const transactionDatePart = tx.datetime.substring(0, 10);
                return (transactionDatePart === selectedSpecificDate);
            });
        }
        
        console.log(`[Filter] Transactions for Monthly Scope: ${transactionsForMonthlyScope.length} items`);
        console.log(`[Filter] Transactions for Daily List Scope: ${transactionsForDailyListScope.length} items`);

        // Update UI components
        UIRenderer.renderMainTransactions(transactionsForDailyListScope);
        UIRenderer.updateSummarySectionText(transactionsForMonthlyScope, selectedMonth);
        ChartManager.updateAllSummariesAndCharts(transactionsForMonthlyScope);
        this.updateDetailedStatisticsTable(transactionsForMonthlyScope);

        // Update titles
        const monthOnlyDisplayText = UIRenderer.getMonthDisplayText(selectedMonth, false);

        const expenseBreakdownTitleTextEl = document.getElementById('expense-breakdown-title-text');
        if (expenseBreakdownTitleTextEl) {
            expenseBreakdownTitleTextEl.textContent = `Phân Loại Chi Tiêu ${monthOnlyDisplayText || 'Tổng Quan'} - VNĐ`;
        }

        const statsTableMonthDisplayEl = document.getElementById('stats-table-month-display');
        if (statsTableMonthDisplayEl) {
            statsTableMonthDisplayEl.textContent = `(${monthOnlyDisplayText || 'Tổng Quan'})`;
        }

        const incomeExpenseChartTitleEl = document.getElementById('income-expense-chart-title');
        if (incomeExpenseChartTitleEl) {
            let titleForIncomeExpenseChart = monthOnlyDisplayText; 
            if (selectedSpecificDate) { 
                const dateParts = selectedSpecificDate.split('-');
                const displayDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
                if (selectedMonth === 'all' || titleForIncomeExpenseChart === "Tất cả") {
                    titleForIncomeExpenseChart = `Ngày ${displayDate}`;
                } else {
                    titleForIncomeExpenseChart = `${titleForIncomeExpenseChart}, ngày ${dateParts[2]}`; 
                }
            }
            incomeExpenseChartTitleEl.textContent = `Biểu Đồ Thu vs Chi ${titleForIncomeExpenseChart || 'Tổng Quan'} - VNĐ`;
        }
        console.log("[Filter] UI Update in applyMainFilter completed.");
    },

    // Update detailed statistics table
    updateDetailedStatisticsTable(transactionsToAnalyze) {
        let totalIncome = 0;
        let totalExpense = 0;
        let incomeTxCount = 0;
        let expenseTxCount = 0;
        const nonTransferExpenseByCategory = {};

        transactionsToAnalyze.forEach(tx => {
            if (tx.type === 'Thu' && !tx.isTransfer) {
                totalIncome += tx.amount;
                incomeTxCount++;
            } else if (tx.type === 'Chi' && !tx.isTransfer) {
                totalExpense += tx.amount;
                expenseTxCount++;
                if (tx.category && !tx.isTransfer) { 
                    nonTransferExpenseByCategory[tx.category] = (nonTransferExpenseByCategory[tx.category] || 0) + tx.amount;
                }
            }
        });

        const netCashflow = totalIncome - totalExpense;

        let topExpenseCategoryName = '-';
        let topExpenseCategoryAmount = 0;

        if (Object.keys(nonTransferExpenseByCategory).length > 0) {
            topExpenseCategoryName = Object.keys(nonTransferExpenseByCategory).reduce((a, b) => nonTransferExpenseByCategory[a] > nonTransferExpenseByCategory[b] ? a : b);
            topExpenseCategoryAmount = nonTransferExpenseByCategory[topExpenseCategoryName];
        }

        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
            else console.warn(`Element with ID '${id}' not found for statistics table.`);
        };

        setText('stats-total-income', Utils.formatCurrency(totalIncome));
        setText('stats-total-expense', Utils.formatCurrency(totalExpense));

        const statsNetCashflowEl = document.getElementById('stats-net-cashflow');
        if (statsNetCashflowEl) {
            statsNetCashflowEl.textContent = Utils.formatCurrency(netCashflow);
            statsNetCashflowEl.classList.remove('text-blue-600', 'dark:text-blue-400', 'text-red-600', 'dark:text-red-400');
            if (netCashflow >= 0) {
                statsNetCashflowEl.classList.add('text-blue-600', 'dark:text-blue-400');
            } else {
                statsNetCashflowEl.classList.add('text-red-600', 'dark:text-red-400');
            }
        }

        setText('stats-income-tx-count', incomeTxCount);
        setText('stats-expense-tx-count', expenseTxCount);
        setText('stats-top-expense-cat', topExpenseCategoryName);
        setText('stats-top-expense-cat-amount', Utils.formatCurrency(topExpenseCategoryAmount));

        const selectedMonthForStatsTitle = DOM.filterMonthSelect ? DOM.filterMonthSelect.value : 'all';
        const statsTableMonthDisplayText = UIRenderer.getMonthDisplayText(selectedMonthForStatsTitle, false);
        const statsTableMonthDisplayEl = document.getElementById('stats-table-month-display');
        if (statsTableMonthDisplayEl) {
            statsTableMonthDisplayEl.textContent = `(${statsTableMonthDisplayText})`;
        }
    }
};

// ========================================================================================
// 12. THEME MANAGEMENT
// ========================================================================================

const ThemeManager = {
    // Apply theme
    applyTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            document.body.classList.add(CONFIG.DARK_MODE_CLASS);
            if (DOM.darkModeToggle) DOM.darkModeToggle.checked = true;
            localStorage.setItem(CONFIG.THEME_STORAGE_KEY, 'dark');
        } else {
            document.body.classList.remove('dark-mode')
            document.body.classList.remove(CONFIG.DARK_MODE_CLASS);
            if (DOM.darkModeToggle) DOM.darkModeToggle.checked = false;
            localStorage.setItem(CONFIG.THEME_STORAGE_KEY, 'light');
        }
        ChartManager.updateAllChartColorsForTheme(theme);
    },

    // Toggle theme
    toggleTheme() {
        if (!DOM.darkModeToggle) {
            console.error("darkModeToggle not found in toggleTheme");
            return;
        }
        this.applyTheme(DOM.darkModeToggle.checked ? 'dark' : 'light');
    },

    // Load theme preference
    loadThemePreference() {
        const savedTheme = localStorage.getItem(CONFIG.THEME_STORAGE_KEY);
        const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme) {
            this.applyTheme(savedTheme);
        } else if (prefersDarkScheme) {
            this.applyTheme('dark');
        } else {
            this.applyTheme('light');
        }
    }
};

// ========================================================================================
// 13. VIRTUAL KEYBOARD
// ========================================================================================

const VirtualKeyboard = {
    // Show virtual keyboard
    show(inputElement) {
        if (DOM.virtualKeyboard && inputElement) {
            console.log("[Keyboard] Showing virtual keyboard for:", inputElement.id);
            DOM.virtualKeyboard.style.display = 'grid';
            activeInputForVirtualKeyboard = inputElement;

            setTimeout(() => {
                const keyboardHeight = DOM.virtualKeyboard.offsetHeight;
                const inputRect = activeInputForVirtualKeyboard.getBoundingClientRect();
                const viewportHeight = window.innerHeight;

                const spaceNeededBelowInput = 50;
                const inputBottomPosition = inputRect.bottom;

                if (inputBottomPosition > (viewportHeight - keyboardHeight - spaceNeededBelowInput)) {
                    const scrollAmount = inputBottomPosition - (viewportHeight - keyboardHeight - spaceNeededBelowInput);
                    window.scrollBy(0, scrollAmount);
                    console.log(`[Keyboard] Scrolled by: ${scrollAmount}px`);
                }
            }, 100);
        } else {
            console.error("[Keyboard] Cannot show virtual keyboard. Element missing.");
        }
    },

    // Hide virtual keyboard
    hide() {
        if (DOM.virtualKeyboard) {
            console.log("[Keyboard] Hiding virtual keyboard");
            DOM.virtualKeyboard.style.display = 'none';
            activeInputForVirtualKeyboard = null;
        }
    },

    // Initialize virtual keyboard
    init() {
        if (DOM.amountInput && DOM.virtualKeyboard) {
            console.log('[Keyboard] Initializing event listeners for virtual keyboard.');

            DOM.amountInput.addEventListener('click', (event) => {
                if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
                    console.log("[Keyboard] Amount input CLICKED on touch device.");
                    event.preventDefault();
                    
                    if (DOM.virtualKeyboard.style.display === 'none' || DOM.virtualKeyboard.style.display === '' || activeInputForVirtualKeyboard !== DOM.amountInput) {
                        this.show(DOM.amountInput);
                    }
                    DOM.amountInput.blur(); 
                }
            });

            DOM.amountInput.addEventListener('focus', (e) => {
                if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
                    console.log("[Keyboard] Amount input FOCUSED on touch device - attempting to blur and show virtual.");
                    e.target.blur();
                    if (DOM.virtualKeyboard.style.display === 'none' || DOM.virtualKeyboard.style.display === '') {
                        this.show(DOM.amountInput);
                    }
                } else {
                    console.log("[Keyboard] Amount input FOCUSED on non-touch device.");
                }
            });

            DOM.virtualKeyboard.addEventListener('touchstart', (event) => {
                if (!activeInputForVirtualKeyboard) {
                    console.warn("[Keyboard] Virtual keyboard key pressed, but no active input target.");
                    return;
                }

                const targetButton = event.target.closest('button.virtual-key');
                if (!targetButton) return;

                const key = targetButton.dataset.key;
                console.log("[Keyboard] Virtual key pressed:", key);

                let currentValue = activeInputForVirtualKeyboard.value;

                if (key === 'backspace') {
                    activeInputForVirtualKeyboard.value = currentValue.slice(0, -1);
                } else if (key === 'done') {
                    this.hide();
                    if (DOM.submitButton) DOM.submitButton.focus();
                } else if (key === '.') {
                    if (!currentValue.includes('.')) {
                        activeInputForVirtualKeyboard.value += key;
                    }
                } else if (key) {
                    activeInputForVirtualKeyboard.value += key;
                }
                Utils.formatAndPreserveCursor(activeInputForVirtualKeyboard, activeInputForVirtualKeyboard.value);					
            });
        }

        // Handle clicks outside keyboard
        document.addEventListener('mousedown', (event) => {
            if (DOM.virtualKeyboard && DOM.virtualKeyboard.style.display !== 'none') {
                const isClickOnKeyboard = DOM.virtualKeyboard.contains(event.target);
                const isClickOnActiveInput = activeInputForVirtualKeyboard && activeInputForVirtualKeyboard.contains(event.target);

                if (!isClickOnKeyboard && !isClickOnActiveInput) {
                    console.log("[Keyboard] Clicked outside, hiding virtual keyboard.");
                    this.hide();
                }
            }
        });

        // Prevent double tap issues
        document.querySelectorAll('.virtual-key').forEach(button => {
            let lastTap = 0;
            button.addEventListener('touchend', function(event) {
                const currentTime = new Date().getTime();
                const tapLength = currentTime - lastTap;
                if (tapLength < 300 && tapLength > 0) { 
                    event.preventDefault();
                }
                lastTap = currentTime;
            });
        });
    }
};

// ========================================================================================
// 14. TRANSACTION SUGGESTIONS
// ========================================================================================

const SuggestionManager = {
    // Find and display transaction suggestion
    findAndDisplay() {
        if (!DOM.transactionForm || editingTransactionId) {
            this.hide();
            return;
        }

        const typeRadio = document.querySelector('input[name="type"]:checked');
        const currentType = typeRadio ? typeRadio.value : null;
        const currentCategory = DOM.categoryInput ? DOM.categoryInput.value : null;

        if (!currentType || !currentCategory) {
            this.hide();
            return;
        }

        const recentTransactions = [...transactions].sort((a, b) => new Date(b.datetime) - new Date(a.datetime));

        currentSuggestedTransaction = recentTransactions.find(tx => 
            tx.type === currentType && 
            tx.category === currentCategory &&
            !tx.isTransfer
        );

        if (currentSuggestedTransaction) {
            if (DOM.suggestedDescription) DOM.suggestedDescription.textContent = currentSuggestedTransaction.description || "(không có mô tả)";
            if (DOM.suggestedAmount) {
                if (currentSuggestedTransaction.originalCurrency && currentSuggestedTransaction.originalCurrency !== 'VND' && typeof currentSuggestedTransaction.originalAmount === 'number') {
                    DOM.suggestedAmount.textContent = Utils.formatCurrency(currentSuggestedTransaction.originalAmount, currentSuggestedTransaction.originalCurrency);
                } else {
                    DOM.suggestedAmount.textContent = Utils.formatCurrency(currentSuggestedTransaction.amount, 'VND');
                }
            }
            if (DOM.transactionSuggestionArea) DOM.transactionSuggestionArea.style.display = 'block';
        } else {
            this.hide();
        }
    },

    // Hide suggestion
    hide() {
        if (DOM.transactionSuggestionArea) DOM.transactionSuggestionArea.style.display = 'none';
        currentSuggestedTransaction = null;
    },

    // Apply suggestion
    apply() {
        if (currentSuggestedTransaction) {
            if (currentSuggestedTransaction.originalCurrency && typeof currentSuggestedTransaction.originalAmount === 'number') {
                DOM.amountInput.value = String(currentSuggestedTransaction.originalAmount);
                DOM.formCurrencySelector.value = currentSuggestedTransaction.originalCurrency;
            } else {
                DOM.amountInput.value = String(currentSuggestedTransaction.amount);
                DOM.formCurrencySelector.value = 'VND'; 
            }

            DOM.descriptionInput.value = currentSuggestedTransaction.description || "";

            Utils.showMessage('Đã áp dụng gợi ý từ giao dịch cũ.', 'info');
            this.hide();
            DOM.amountInput.focus();
        }
    },

    // Initialize suggestion system
    init() {
        const fieldsForSuggestion = [
            ...document.querySelectorAll('input[name="type"]'),
            DOM.categoryInput
        ];

        fieldsForSuggestion.forEach(field => {
            if (field) {
                field.addEventListener('change', () => this.findAndDisplay());
            }
        });

        if (DOM.applySuggestionButton) {
            DOM.applySuggestionButton.addEventListener('click', () => this.apply());
        }
        if (DOM.dismissSuggestionButton) {
            DOM.dismissSuggestionButton.addEventListener('click', () => this.hide());
        }

        if (DOM.transactionForm) {
            DOM.transactionForm.addEventListener('reset', () => this.hide());
        }
    }
};

// ========================================================================================
// 15. IMPORT/EXPORT
// ========================================================================================

const ImportExportManager = {
    // Export data to JSON
    exportData() {
        const dataToExport = { transactions, incomeCategories, expenseCategories, accounts };
        const dataStr = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([dataStr], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `financial_data_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        Utils.showMessage('Dữ liệu đã được xuất!', 'success');
    },

    // Export data to CSV
    exportToCSV() {
        if (transactions.length === 0) {
            Utils.showMessage('Không có dữ liệu giao dịch để xuất.', 'error');
            return;
        }

        const headers = [
            'ID Giao Dịch', 'Ngày Giờ (YYYY-MM-DD HH:mm:ss)', 'Nội dung', 'Hạng mục', 
            'Loại (Thu/Chi)', 'Số Tiền (VNĐ)', 'Tài khoản', 'Là Chuyển Khoản?', 
            'ID Liên Kết CK', 'Số Tiền Gốc', 'Đơn Vị Gốc'
        ];

        const rows = transactions.map(tx => {
            const accountName = accounts.find(acc => acc.value === tx.account)?.text || tx.account;
            return [
                tx.id,
                Utils.formatDateTimeForCSV(tx.datetime),
                tx.description,
                tx.category,
                tx.type,
                tx.amount,
                accountName,
                tx.isTransfer ? 'Có' : 'Không',
                tx.isTransfer ? tx.transferPairId : '',
                tx.originalAmount,
                tx.originalCurrency
            ].map(this.escapeCSVValue);
        });

        let csvContent = "\ufeff";
        csvContent += headers.join(',') + '\n';
        rows.forEach(rowArray => {
            csvContent += rowArray.join(',') + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `transactions_${new Date().toISOString().slice(0,10)}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            Utils.showMessage('Dữ liệu đã được xuất ra CSV!', 'success');
        } else {
            Utils.showMessage('Trình duyệt của bạn không hỗ trợ tải file trực tiếp.', 'error');
        }
    },

    // Escape CSV values
    escapeCSVValue(value) {
        if (value == null) return '';
        value = String(value);
        if (value.includes(',') || value.includes('\n') || value.includes('"')) {
            value = value.replace(/\"/g, '""');
            return `"${value}"`;
        }
        return value;
    },

    // Handle import file
    handleImportFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                if (importedData.transactions && importedData.incomeCategories && importedData.expenseCategories && importedData.accounts) {
                    if (!confirm('Nhập dữ liệu sẽ ghi đè toàn bộ dữ liệu hiện tại. Bạn có chắc chắn muốn tiếp tục?')) {
                        DOM.importFileInput.value = '';
                        return;
                    }
                    
                    transactions = importedData.transactions;
                    incomeCategories = importedData.incomeCategories;
                    expenseCategories = importedData.expenseCategories;
                    accounts = importedData.accounts;
                    
                    DataManager.saveTransactions();
                    DataManager.saveUserPreferences();
                    App.initialize();
                    Utils.showMessage('Dữ liệu đã được nhập thành công!', 'success');
                } else {
                    Utils.showMessage('Lỗi: Định dạng file không hợp lệ.', 'error');
                }
            } catch (error) {
                Utils.showMessage(`Lỗi khi nhập file: ${error.message}`, 'error');
                console.error("Import error:", error);
            } finally {
                DOM.importFileInput.value = '';
            }
        };
        reader.readAsText(file);
    }
};

// ========================================================================================
// 16. COLLAPSIBLE SECTIONS
// ========================================================================================

const CollapsibleManager = {
    // Initialize collapsible sections
    init() {
        const collapsibleHeaders = document.querySelectorAll('.collapsible-header');
        collapsibleHeaders.forEach(header => {
            const contentId = header.dataset.collapsibleTarget;

            if (!contentId) {
                console.error("Collapsible error: data-collapsible-target missing on header:", header);
                return;
            }

            const content = document.getElementById(contentId);
            const toggleIcon = header.querySelector('.toggle-icon');

            if (!content) {
                console.error(`Collapsible error: Content ID '${contentId}' not found for header:`, header);
                return;
            }

            // Determine initial state
            let shouldBeActive = header.classList.contains('active');
            const storedState = localStorage.getItem(`collapsibleState_${contentId}`);

            if (storedState === 'expanded') {
                shouldBeActive = true;
            } else if (storedState === 'collapsed') {
                shouldBeActive = false;
            }

            // Apply initial state
            if (shouldBeActive) {
                header.classList.add('active');
                content.classList.add('active');
                if (toggleIcon) {
                    toggleIcon.style.transform = 'rotate(180deg)';
                }
            } else {
                header.classList.remove('active');
                content.classList.remove('active');
                if (toggleIcon) {
                    toggleIcon.style.transform = 'rotate(0deg)';
                }
            }

            // Add click event
            header.addEventListener('click', () => {
                console.log(`Header clicked for target: ${contentId}`);

                const isActiveAfterClick = header.classList.toggle('active');
                content.classList.toggle('active', isActiveAfterClick);

                localStorage.setItem(`collapsibleState_${contentId}`, isActiveAfterClick ? 'expanded' : 'collapsed');
                
                if (toggleIcon) {
                    toggleIcon.style.transform = isActiveAfterClick ? 'rotate(180deg)' : 'rotate(0deg)';
                }
            });
        });

        // Handle list headers
        const listHeaders = document.querySelectorAll('.collapsible-list-header');
        listHeaders.forEach(header => {
            const contentId = header.dataset.collapsibleTarget;
            const contentList = document.getElementById(contentId);
            if (!contentList) {
                console.error(`Collapsible List Error: Content UL ID '${contentId}' not found.`, header);
                return;
            }
            
            const toggleIconList = header.querySelector('.toggle-icon');

            let isListActive = header.classList.contains('active');

            if (isListActive) {
                contentList.classList.add('active');
                setTimeout(() => {
                    if (contentList.classList.contains('active')) contentList.style.maxHeight = contentList.scrollHeight + "px";
                }, 150);
                if (toggleIconList) toggleIconList.style.transform = 'rotate(180deg)';
            } else {
                contentList.classList.remove('active');
                contentList.style.maxHeight = null;
                if (toggleIconList) toggleIconList.style.transform = 'rotate(0deg)';
            }

            header.addEventListener('click', () => {
                const isListNowActive = header.classList.toggle('active');
                contentList.classList.toggle('active', isListNowActive);

                if (isListNowActive) {
                    contentList.style.maxHeight = contentList.scrollHeight + "px";
                } else {
                    contentList.style.maxHeight = null;
                }
                if (toggleIconList) {
                    toggleIconList.style.transform = isListNowActive ? 'rotate(180deg)' : 'rotate(0deg)';
                }
            });
        });
    }
};

// ========================================================================================
// 17. INPUT VALIDATION & FORMATTING
// ========================================================================================

const InputManager = {
    // Initialize input event listeners
    init() {
        if (DOM.amountInput) {
            DOM.amountInput.addEventListener('input', function(e) {
                Utils.formatAndPreserveCursor(e.target, e.target.value);
            });

            DOM.amountInput.addEventListener('keydown', function(e) {
                if ([46, 8, 9, 27, 13, 35, 36, 37, 39].indexOf(e.keyCode) !== -1 ||
                    ((e.keyCode === 65 || e.keyCode === 88 || e.keyCode === 67 || e.keyCode === 86) && (e.ctrlKey === true || e.metaKey === true)) ||
                    (e.keyCode >= 48 && e.keyCode <= 57 && !e.shiftKey) ||
                    (e.keyCode >= 96 && e.keyCode <= 105) ||
                    (e.keyCode === 190 || e.keyCode === 110)) {
                    if ((e.keyCode === 190 || e.keyCode === 110) && this.value.includes('.')) {
                        e.preventDefault();
                    }
                    return;
                }
                e.preventDefault();
            });
        }

        // Setup thousand separators for reconciliation inputs
        this.setupThousandSeparators();
    },

    // Setup thousand separators for numeric inputs
    setupThousandSeparators() {
        const numericInputs = document.querySelectorAll('.input-actual-balance, .input-actual-balance-pivot');
        
        numericInputs.forEach(input => {
            input.addEventListener('input', function(e) {
                const cursorPosition = this.selectionStart;
                const inputLength = this.value.length;
                
                let value = this.value.replace(/[^\d.]/g, '');
                let parts = value.split('.');
                let integerPart = parts[0];
                let decimalPart = parts.length > 1 ? '.' + parts[1] : '';
                
                integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                this.value = integerPart + decimalPart;
                
                const newLength = this.value.length;
                const newPosition = cursorPosition + (newLength - inputLength);
                this.setSelectionRange(newPosition, newPosition);
            });
        });
    }
};

// ========================================================================================
// 18. RECONCILIATION MODULE
// ========================================================================================

const ReconciliationManager = {
    // Render reconciliation table
    renderReconciliationTable() {
        const table = document.getElementById('reconciliation-table');
        const tableHead = table.querySelector('thead');
        const tableBody = table.querySelector('tbody');

        if (!table || !tableHead || !tableBody) {
            console.error("[RenderTable] Reconciliation table or components not found.");
            return;
        }

        tableHead.innerHTML = '';
        tableBody.innerHTML = '';

        if (!accounts || accounts.length === 0) {
            const headerRowForMessage = tableHead.insertRow();
            const th = headerRowForMessage.insertCell();
            th.colSpan = 1;
            th.textContent = "Mục / Tài khoản";

            const bodyRowForMessage = tableBody.insertRow();
            const td = bodyRowForMessage.insertCell();
            td.colSpan = 1;
            td.className = 'text-center py-4 text-gray-500 dark:text-gray-400';
            td.textContent = 'Chưa có tài khoản nào để đối soát.';
            return;
        }

        // Build header
        const headerRow = tableHead.insertRow();
        headerRow.insertCell().outerHTML = `<th class="sticky left-0 z-10 bg-gray-50 dark:bg-gray-700 border-r dark:border-gray-600">Mục / Tài khoản</th>`;
        accounts.forEach(acc => {
            headerRow.insertCell().outerHTML = `<th>${acc.text}</th>`;
        });

        // Define measures
        const measures = [
            {
                id: 'systemBalance',
                label: 'Số dư hệ thống',
                type: 'display',
                getValue: (accountId) => Utils.formatCurrency(this.getAccountBalance(accountId), 'VND'),
            },
            {
                id: 'actualBalance',
                label: 'Số dư thực tế <br><span class="font-normal normal-case text-xs">(Nhập vào)</span>',
                type: 'input'
            },
            {
                id: 'difference',
                label: 'Chênh lệch',
                type: 'displayCell',
            },
            {
                id: 'reconcileAction',
                label: 'Thao tác',
                type: 'actionButton',
                buttonText: 'Đối soát',
                buttonClass: 'btn-secondary btn-reconcile-pivot py-2 px-3 text-sm rounded'
            },
            {
                id: 'recordDifferenceAction',
                label: 'Ghi nhận chênh lệch',
                type: 'actionButton',
                buttonText: 'Ghi nhận',
                buttonClass: 'btn-primary btn-record-diff-pivot py-2 px-3 text-sm rounded',
                initialStyle: 'display:none;'
            }
        ];

        // Build body
        measures.forEach(measure => {
            const row = tableBody.insertRow();
            row.insertCell().outerHTML = `<td class="sticky left-0 z-10 bg-white dark:bg-gray-800 font-medium border-r dark:border-gray-600 p-2">${measure.label}</td>`;

            accounts.forEach(acc => {
                const cell = row.insertCell();
                cell.setAttribute('data-account', acc.value);
                cell.classList.add('text-right', 'p-2');

                switch (measure.type) {
                    case 'display':
                        cell.innerHTML = measure.getValue(acc.value);
                        if (measure.id === 'systemBalance') {
                            cell.id = `system-balance-pivot-${acc.value}`;
                        }
                        break;
                    case 'input':
                        cell.innerHTML = `<input type="text" inputmode="decimal"
                                                class="input-actual-balance-pivot p-2 border dark:border-gray-600 rounded w-full text-right bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                                                data-account="${acc.value}"
                                                placeholder="Nhập số dư">`;
                        const inputEl = cell.querySelector('input');
                        if (inputEl) {
                            this.setupInputEvents(inputEl);
                        }
                        break;
                    case 'displayCell':
                        cell.id = `diff-pivot-${acc.value}`;
                        break;
                    case 'actionButton':
                        const button = document.createElement('button');
                        button.innerHTML = measure.buttonText;
                        button.className = measure.buttonClass;
                        button.dataset.account = acc.value;
                        button.dataset.accountName = acc.text;
                        if (measure.initialStyle) {
                            button.style.cssText = measure.initialStyle;
                        }

                        if (measure.id === 'reconcileAction') {
                            button.id = `reconcile-btn-pivot-${acc.value}`;
                        } else if (measure.id === 'recordDifferenceAction') {
                            button.id = `record-diff-btn-pivot-${acc.value}`;
                        }
                        cell.appendChild(button);
                        cell.classList.add('text-center');
                        cell.classList.remove('text-right');
                        break;
                }
            });
        });

        // Attach event listeners
        this.attachReconcileEvents();
        InputManager.setupThousandSeparators();
        console.log("[RenderTable] Reconciliation pivot table rendered and event listeners attached.");
    },

    // Setup input events for reconciliation inputs
    setupInputEvents(inputEl) {
        inputEl.addEventListener('input', (e) => {
            if (typeof Utils.formatAndPreserveCursor === 'function') {
                Utils.formatAndPreserveCursor(e.target, e.target.value);
            }
        });

        inputEl.addEventListener('keydown', function(e) {
            if ([46, 8, 9, 27, 13, 35, 36, 37, 39].indexOf(e.keyCode) !== -1 ||
                ((e.keyCode === 65 || e.keyCode === 88 || e.keyCode === 67 || e.keyCode === 86) && (e.ctrlKey === true || e.metaKey === true)) ||
                (e.keyCode >= 48 && e.keyCode <= 57 && !e.shiftKey) ||
                (e.keyCode >= 96 && e.keyCode <= 105) ||
                (e.keyCode === 190 || e.keyCode === 110)) {
                if ((e.keyCode === 190 || e.keyCode === 110) && this.value.includes('.')) {
                    e.preventDefault();
                }
                return;
            }
            e.preventDefault();
        });

        inputEl.addEventListener('click', function(event) {
            if (('ontouchstart' in window || navigator.maxTouchPoints > 0) && DOM.virtualKeyboard) {
                event.preventDefault();
                if (DOM.virtualKeyboard.style.display === 'none' || DOM.virtualKeyboard.style.display === '' || activeInputForVirtualKeyboard !== this) {
                    VirtualKeyboard.show(this);
                }
                this.blur();
            }
        });

        inputEl.addEventListener('focus', function(e) {
            if (('ontouchstart' in window || navigator.maxTouchPoints > 0) && DOM.virtualKeyboard) {
                e.target.blur();
                if (DOM.virtualKeyboard.style.display === 'none' || DOM.virtualKeyboard.style.display === '') {
                    VirtualKeyboard.show(this);
                }
            }
        });
    },

    // Attach reconcile button events
    attachReconcileEvents() {
        document.querySelectorAll('.btn-reconcile-pivot').forEach(btn => {
            btn.addEventListener('click', function() {
                const accountId = this.dataset.account;
                const accountName = this.dataset.accountName;
                console.log(`[ReconcilePivot] 'Reconcile' button clicked for account: ${accountName} (ID: ${accountId})`);

                const actualBalanceInputElement = document.querySelector(`input.input-actual-balance-pivot[data-account="${accountId}"]`);
                const diffCellElement = document.getElementById(`diff-pivot-${accountId}`);
                const recordButtonElement = document.getElementById(`record-diff-btn-pivot-${accountId}`);
                const systemBalanceDisplayElement = document.getElementById(`system-balance-pivot-${accountId}`);

                if (!actualBalanceInputElement || !diffCellElement || !recordButtonElement || !systemBalanceDisplayElement) {
                    console.error(`[ReconcilePivot] Missing DOM elements for account: ${accountId}`);
                    Utils.showMessage('Lỗi hệ thống khi tìm các thành phần đối soát.', 'error');
                    return;
                }
                
                const systemBalanceValue = ReconciliationManager.getAccountBalance(accountId);
                systemBalanceDisplayElement.textContent = Utils.formatCurrency(systemBalanceValue, 'VND');

                const actualBalanceNormalized = Utils.normalizeAmountString(actualBalanceInputElement.value);
                const actualBalance = parseFloat(actualBalanceNormalized);

                if (isNaN(actualBalance) || actualBalanceInputElement.value.trim() === '') {
                    Utils.showMessage('Vui lòng nhập số dư thực tế hợp lệ cho tài khoản ' + accountName + '.', 'error');
                    diffCellElement.textContent = '';
                    diffCellElement.className = 'text-right p-2';
                    recordButtonElement.style.display = 'none';
                    return;
                }

                const differenceValue = actualBalance - systemBalanceValue;
                console.log(`[ReconcilePivot] Account: ${accountName}, SystemBalance: ${systemBalanceValue}, ActualBalance: ${actualBalance}, Difference: ${differenceValue}`);

                diffCellElement.textContent = Utils.formatCurrency(differenceValue, 'VND');
                diffCellElement.className = 'text-right p-2 font-semibold ';
                if (differenceValue > 0) {
                    diffCellElement.classList.add('text-green-600', 'dark:text-green-400');
                } else if (differenceValue < 0) {
                    diffCellElement.classList.add('text-red-600', 'dark:text-red-400');
                } else {
                    diffCellElement.classList.add('text-blue-600', 'dark:text-blue-400');
                }

                DataManager.saveReconciliationResult(accountId, systemBalanceValue, actualBalance, differenceValue);

                if (differenceValue !== 0) {
                    recordButtonElement.style.display = 'inline-block';
                    recordButtonElement.dataset.difference = differenceValue;
                    
                    if (differenceValue > 0) {
                        recordButtonElement.classList.remove('negative', 'btn-secondary');
                        recordButtonElement.classList.add('positive', 'btn-primary');
                    } else {
                        recordButtonElement.classList.remove('positive', 'btn-secondary');
                        recordButtonElement.classList.add('negative', 'btn-danger');
                    }
                    console.log(`[ReconcilePivot] Showing record button for ${accountName} with difference: ${differenceValue}`);

                    recordButtonElement.onclick = function() {
                        const currentAccountId = this.dataset.account;
                        const currentAccountName = this.dataset.accountName;
                        const currentDifference = parseFloat(this.dataset.difference);

                        console.log(`[RecordDiffPivot] 'Record' clicked. Account: ${currentAccountName}, Difference: ${currentDifference}`);

                        if (confirm(`Bạn có chắc chắn muốn ghi nhận chênh lệch ${Utils.formatCurrency(currentDifference, 'VND')} cho tài khoản ${currentAccountName}?`)) {
                            ReconciliationManager.handleRecordDifference(currentAccountId, currentAccountName, currentDifference);
                            ReconciliationManager.updateSystemBalanceDisplayOnTable(currentAccountId);

                            this.style.display = 'none';
                            actualBalanceInputElement.value = '';
                            diffCellElement.textContent = Utils.formatCurrency(0, 'VND');
                            diffCellElement.className = 'text-right p-2 font-semibold text-blue-600 dark:text-blue-400';

                            Utils.showMessage(`Đã ghi nhận chênh lệch cho tài khoản ${currentAccountName}.`, 'success');
                        }
                    };
                } else {
                    recordButtonElement.style.display = 'none';
                    diffCellElement.innerHTML += ' <span class="text-xs">(Đã khớp)</span>';
                    console.log(`[ReconcilePivot] Hiding record button for ${accountName} as difference is 0.`);
                }
            });
        });
    },

    // Get account balance
    getAccountBalance(accountValue) {
        let balance = 0;
        transactions.forEach(tx => {
            if (tx.account === accountValue) {
                if (tx.type === "Thu") balance += tx.amount;
                else if (tx.type === "Chi") balance -= tx.amount;
            }
        });
        return balance;
    },

    // Handle record difference
    handleRecordDifference(accountId, accountName, difference) {
        if (isNaN(difference) || difference === 0) {
            Utils.showMessage('Không có chênh lệch để ghi nhận hoặc chênh lệch không hợp lệ.', 'error');
            return;
        }

        const type = difference > 0 ? 'Thu' : 'Chi';
        const amount = Math.abs(difference);
        const category = difference > 0 ? CONFIG.RECONCILE_ADJUST_INCOME_CAT : CONFIG.RECONCILE_ADJUST_EXPENSE_CAT;
        const description = `Điều chỉnh đối soát tài khoản ${accountName || accountId}`;
        const transactionDateTime = Utils.formatIsoDateTime(new Date());

        if (type === 'Thu' && !incomeCategories.some(cat => cat.value === CONFIG.RECONCILE_ADJUST_INCOME_CAT)) {
            incomeCategories.push({ value: CONFIG.RECONCILE_ADJUST_INCOME_CAT, text: CONFIG.RECONCILE_ADJUST_INCOME_CAT });
            DataManager.saveUserPreferences();
        } else if (type === 'Chi' && !expenseCategories.some(cat => cat.value === CONFIG.RECONCILE_ADJUST_EXPENSE_CAT)) {
            expenseCategories.push({ value: CONFIG.RECONCILE_ADJUST_EXPENSE_CAT, text: CONFIG.RECONCILE_ADJUST_EXPENSE_CAT });
            DataManager.saveUserPreferences();
        }

        const newTransaction = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            datetime: transactionDateTime,
            description: description,
            category: category,
            amount: amount,
            type: type,
            account: accountId,
            currency: 'VND',
            isTransfer: false,
            transferPairId: null,
            originalAmount: amount,
            originalCurrency: 'VND'
        };

        transactions.push(newTransaction);
        DataManager.saveTransactions();
        FilterManager.applyMainFilter();
    },

    // Update system balance display on table
    updateSystemBalanceDisplayOnTable(accountId) {
        const newSystemBalance = this.getAccountBalance(accountId);
        const systemBalanceCell = document.getElementById(`system-balance-pivot-${accountId}`);

        if (systemBalanceCell) {
            systemBalanceCell.textContent = Utils.formatCurrency(newSystemBalance, 'VND');
        } else {
            console.warn(`System balance cell not found for account ${accountId}. Re-rendering entire table.`);
            this.renderReconciliationTable();
        }
    }
};

// ========================================================================================
// 19. MAIN APPLICATION
// ========================================================================================

const App = {
    // Initialize DOM elements
    initializeDOM() {
        DOM.darkModeToggle = document.getElementById('darkModeToggleCheckbox');
        DOM.transactionForm = document.getElementById('transaction-form');
        DOM.formTitle = document.getElementById('form-title');
        DOM.submitButton = document.getElementById('submit-transaction-button');
        DOM.datetimeInput = document.getElementById('datetime-input');
        DOM.categoryInput = document.getElementById('category');
        DOM.amountInput = document.getElementById('amount-input');
        DOM.formCurrencySelector = document.getElementById('form-currency-selector');
        DOM.descriptionInput = document.getElementById('description');
        DOM.accountInput = document.getElementById('account');
        DOM.accountLabel = document.getElementById('account-label');
        DOM.toAccountInput = document.getElementById('to-account');
        DOM.addTripleZeroButton = document.getElementById('add-triple-zero-button');
        
        DOM.filterMonthSelect = document.getElementById('filter-month');
        DOM.filterSpecificDateInput = document.getElementById('filter-specific-date');
        DOM.clearDateFilterButton = document.getElementById('clear-date-filter-button');
        DOM.filterComparisonYearInput = document.getElementById('filter-comparison-year');
        DOM.filterComparisonWeekSelect = document.getElementById('filter-comparison-week');
        
        DOM.messageBox = document.getElementById('message-box');
        DOM.transactionList = document.getElementById('transaction-list');
        DOM.noTransactionsMessage = document.getElementById('no-transactions');
        DOM.totalIncomeEl = document.getElementById('total-income');
        DOM.totalExpensesEl = document.getElementById('total-expenses');
        DOM.currentBalanceEl = document.getElementById('current-balance');
        DOM.accountBalanceListEl = document.getElementById('account-balance-list');
        
        DOM.incomeExpenseChartCanvas = document.getElementById('incomeExpenseChart')?.getContext('2d');
        DOM.expenseCategoryChartCanvas = document.getElementById('expenseCategoryChart')?.getContext('2d');
        DOM.expenseCategoryBarCtx = document.getElementById('expenseCategoryBarChart')?.getContext('2d');
        DOM.last7DaysChartCanvas = document.getElementById('last7DaysChart')?.getContext('2d');
        DOM.monthComparisonChartCanvas = document.getElementById('monthComparisonChart')?.getContext('2d');
        DOM.expenseChartTypeSelector = document.getElementById('expenseChartTypeSelector');
        DOM.expensePieChartContainer = document.getElementById('expensePieChartContainer');
        DOM.expenseBarChartContainer = document.getElementById('expenseBarChartContainer');
        
        DOM.newIncomeCategoryNameInput = document.getElementById('new-income-category-name');
        DOM.addIncomeCategoryButton = document.getElementById('add-income-category-button');
        DOM.incomeCategoryListAdmin = document.getElementById('income-category-list-admin');
        DOM.newExpenseCategoryNameInput = document.getElementById('new-expense-category-name');
        DOM.addExpenseCategoryButton = document.getElementById('add-expense-category-button');
        DOM.expenseCategoryListAdmin = document.getElementById('expense-category-list-admin');
        DOM.newAccountNameInput = document.getElementById('new-account-name');
        DOM.addAccountButton = document.getElementById('add-account-button');
        DOM.accountListAdmin = document.getElementById('account-list-admin');
        
        DOM.exportButton = document.getElementById('export-button');
        DOM.exportCsvButton = document.getElementById('export-csv-button');
        DOM.importButton = document.getElementById('import-button');
        DOM.importFileInput = document.getElementById('import-file-input');
        
        DOM.virtualKeyboard = document.getElementById('virtualNumericKeyboard');
        
        DOM.transactionSuggestionArea = document.getElementById('transaction-suggestion-area');
        DOM.suggestedDescription = document.getElementById('suggested-description');
        DOM.suggestedAmount = document.getElementById('suggested-amount');
        DOM.applySuggestionButton = document.getElementById('apply-suggestion-button');
        DOM.dismissSuggestionButton = document.getElementById('dismiss-suggestion-button');

        DOM.summaryIncomeMonthDisplay = document.getElementById('summary-income-month-display');
        DOM.summaryExpenseMonthDisplay = document.getElementById('summary-expense-month-display');
        DOM.summaryBalanceMonthDisplay = document.getElementById('summary-balance-month-display');
    },

    // Attach event listeners
    attachEventListeners() {
        // Form events
        if (DOM.transactionForm) {
            DOM.transactionForm.addEventListener('submit', (e) => TransactionManager.handleSubmit(e));
        }

        // Filter events
        if (DOM.filterMonthSelect) {
            DOM.filterMonthSelect.addEventListener('change', () => FilterManager.applyMainFilter());
        }
        if (DOM.filterSpecificDateInput) {
            DOM.filterSpecificDateInput.addEventListener('change', () => FilterManager.applyMainFilter());
        }
        if (DOM.clearDateFilterButton && DOM.filterSpecificDateInput) {
            DOM.clearDateFilterButton.addEventListener('click', () => {
                DOM.filterSpecificDateInput.value = "";
                FilterManager.applyMainFilter();
            });
        }

        // Transaction type radio buttons
        const typeRadioButtons = document.querySelectorAll('input[name="type"]');
        if (typeRadioButtons) {
            typeRadioButtons.forEach(radio => {
                radio.addEventListener('change', () => {
                    FormManager.toggleFormFields(); 
                    const currentType = document.querySelector('input[name="type"]:checked');
                    if (currentType && currentType.value !== 'Transfer') {
                        CategoryManager.populateCategories();
                    }
                });
            });
        }

        // Chart type selector
        if (DOM.expenseChartTypeSelector) {
            DOM.expenseChartTypeSelector.addEventListener('change', () => ChartManager.toggleExpenseChartDisplay());
        }

        // Category management
        if (DOM.addIncomeCategoryButton && DOM.newIncomeCategoryNameInput) {
            DOM.addIncomeCategoryButton.addEventListener('click', () => {
                if (CategoryManager.addCategory(DOM.newIncomeCategoryNameInput.value, 'income')) {
                    DOM.newIncomeCategoryNameInput.value = '';
                }
            });
        }
        if (DOM.addExpenseCategoryButton && DOM.newExpenseCategoryNameInput) {
            DOM.addExpenseCategoryButton.addEventListener('click', () => {
                if (CategoryManager.addCategory(DOM.newExpenseCategoryNameInput.value, 'expense')) {
                    DOM.newExpenseCategoryNameInput.value = '';
                }
            });
        }
        if (DOM.addAccountButton && DOM.newAccountNameInput) {
            DOM.addAccountButton.addEventListener('click', () => {
                if (CategoryManager.addAccount(DOM.newAccountNameInput.value)) {
                    DOM.newAccountNameInput.value = '';
                }
            });
        }

        // Import/Export
        if (DOM.exportButton) {
            DOM.exportButton.addEventListener('click', () => ImportExportManager.exportData());
        }
        if (DOM.exportCsvButton) {
            DOM.exportCsvButton.addEventListener('click', () => ImportExportManager.exportToCSV());
        }
        if (DOM.importButton && DOM.importFileInput) {
            DOM.importButton.addEventListener('click', () => DOM.importFileInput.click());
        }
        if (DOM.importFileInput) {
            DOM.importFileInput.addEventListener('change', (e) => ImportExportManager.handleImportFile(e));
        }

        // Theme toggle
        if (DOM.darkModeToggle) {
            DOM.darkModeToggle.addEventListener('change', () => ThemeManager.toggleTheme());
        } else {
            console.error('[APP] darkModeToggle NOT FOUND during listener attachment!');
        }

        // Triple zero button
        if (DOM.addTripleZeroButton && DOM.amountInput) {
            DOM.addTripleZeroButton.addEventListener('click', function() {
                const currentValue = DOM.amountInput.value;
                DOM.amountInput.value = currentValue + '000';
                Utils.formatAndPreserveCursor(DOM.amountInput, DOM.amountInput.value);
            });
        }
    },

    // Initialize application
    initialize() {
        console.log("[APP] initializeApp CALLED");
        
        this.initializeDOM();
        
        ChartManager.init();
        ThemeManager.loadThemePreference();
        DataManager.loadUserPreferences();

        if (DOM.formCurrencySelector) DOM.formCurrencySelector.value = 'VND';
        FormManager.setDefaults();
        
        const typeChiRadio = document.getElementById('type-chi');
        if (typeChiRadio) typeChiRadio.checked = true;

        CategoryManager.populateAccountDropdowns();
        FormManager.toggleFormFields();
        UIRenderer.renderCustomCategoryLists();
        UIRenderer.renderAccountListAdmin();

        FilterManager.populateMonthFilter();
        FilterManager.applyMainFilter();

        CollapsibleManager.init();
        InputManager.init();
        VirtualKeyboard.init();
        SuggestionManager.init();
        
        // Initialize reconciliation
        ReconciliationManager.renderReconciliationTable();

        this.attachEventListeners();

        console.log("[APP] initializeApp COMPLETED");
    }
};

// ========================================================================================
// 20. GLOBAL FUNCTIONS (for backward compatibility)
// ========================================================================================

// Make functions available globally for HTML onclick handlers
window.loadTransactionForEdit = function(transactionId) {
    TransactionManager.loadForEdit(transactionId);
};

window.deleteTransaction = function(transactionId) {
    TransactionManager.deleteTransaction(transactionId);
};

// ========================================================================================
// 21. APPLICATION STARTUP
// ========================================================================================

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.initialize();
});

// Handle system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    document.body.classList.toggle('dark-mode', e.matches);
});

if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.body.classList.add('dark-mode');
} else {
    document.body.classList.remove('dark-mode');
}

// Thêm vào cuối file script.js

// Đăng ký Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('ServiceWorker registration successful');
            })
            .catch(function(err) {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}
