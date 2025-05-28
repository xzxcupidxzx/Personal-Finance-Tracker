/**
 * CATEGORIES MODULE - FIXED VERSION
 * Handles category and account management
 */

class CategoriesModule {
    constructor() {
        this.app = null;
        
        // DOM elements
        this.elements = {};
        
        // Event listeners for cleanup
        this.eventListeners = [];
        
        // Validation rules
        this.validationRules = {
            maxNameLength: 50,
            minNameLength: 1,
            maxDescriptionLength: 200,
            allowedNamePattern: /^[a-zA-ZÀ-ỹ0-9\s\-\(\)\.]+$/
        };
        
        // Performance tracking
        this.lastRenderTime = 0;
        this.renderCount = 0;
    }

    /**
     * Initialize the module with comprehensive error handling
     */
    init(app) {
        this.app = app;
        console.log('🏷️ Initializing Categories Module...');
        
        try {
            this.initializeElements();
            this.initializeEventListeners();
            
            this.refresh();
            
            console.log('✅ Categories Module initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Categories Module:', error);
            Utils.UIUtils.showMessage('Có lỗi khi khởi tạo module danh mục', 'error');
        }
    }

    /**
     * Initialize DOM elements with validation
     */
    initializeElements() {
        this.elements = {
            // Income category elements
            newIncomeCategoryInput: document.getElementById('new-income-category'),
            addIncomeCategoryBtn: document.getElementById('add-income-category'),
            incomeCategoryList: document.getElementById('income-category-list'),
            
            // Expense category elements
            newExpenseCategoryInput: document.getElementById('new-expense-category'),
            addExpenseCategoryBtn: document.getElementById('add-expense-category'),
            expenseCategoryList: document.getElementById('expense-category-list'),
            
            // Account elements
            newAccountInput: document.getElementById('new-account'),
            addAccountBtn: document.getElementById('add-account'),
            accountList: document.getElementById('account-list'),
            
            // Batch operations
            batchOperationsPanel: document.getElementById('batch-operations-panel')
        };
        
        // Log missing critical elements
        const criticalElements = ['incomeCategoryList', 'expenseCategoryList', 'accountList'];
        criticalElements.forEach(key => {
            if (!this.elements[key]) {
                console.warn(`Critical categories element missing: ${key}`);
            }
        });
    }

    /**
     * Initialize event listeners with proper cleanup tracking
     */
    initializeEventListeners() {
        try {
            this.initializeIncomeCategoryEvents();
            this.initializeExpenseCategoryEvents();
            this.initializeAccountEvents();
        } catch (error) {
            console.error('Error initializing event listeners:', error);
        }
    }

    /**
     * Initialize income category events
     */
    initializeIncomeCategoryEvents() {
        if (this.elements.addIncomeCategoryBtn) {
            const addHandler = () => this.addIncomeCategory();
            this.elements.addIncomeCategoryBtn.addEventListener('click', addHandler);
            this.eventListeners.push({
                element: this.elements.addIncomeCategoryBtn,
                event: 'click',
                handler: addHandler
            });
        }
        
        if (this.elements.newIncomeCategoryInput) {
            const keyHandler = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addIncomeCategory();
                }
            };
            
            const inputHandler = (e) => {
                this.validateCategoryInput(e.target, 'income');
            };
            
            this.elements.newIncomeCategoryInput.addEventListener('keypress', keyHandler);
            this.elements.newIncomeCategoryInput.addEventListener('input', inputHandler);
            
            this.eventListeners.push(
                { element: this.elements.newIncomeCategoryInput, event: 'keypress', handler: keyHandler },
                { element: this.elements.newIncomeCategoryInput, event: 'input', handler: inputHandler }
            );
        }
    }

    /**
     * Initialize expense category events
     */
    initializeExpenseCategoryEvents() {
        if (this.elements.addExpenseCategoryBtn) {
            const addHandler = () => this.addExpenseCategory();
            this.elements.addExpenseCategoryBtn.addEventListener('click', addHandler);
            this.eventListeners.push({
                element: this.elements.addExpenseCategoryBtn,
                event: 'click',
                handler: addHandler
            });
        }
        
        if (this.elements.newExpenseCategoryInput) {
            const keyHandler = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addExpenseCategory();
                }
            };
            
            const inputHandler = (e) => {
                this.validateCategoryInput(e.target, 'expense');
            };
            
            this.elements.newExpenseCategoryInput.addEventListener('keypress', keyHandler);
            this.elements.newExpenseCategoryInput.addEventListener('input', inputHandler);
            
            this.eventListeners.push(
                { element: this.elements.newExpenseCategoryInput, event: 'keypress', handler: keyHandler },
                { element: this.elements.newExpenseCategoryInput, event: 'input', handler: inputHandler }
            );
        }
    }

    /**
     * Initialize account events
     */
    initializeAccountEvents() {
        if (this.elements.addAccountBtn) {
            const addHandler = () => this.addAccount();
            this.elements.addAccountBtn.addEventListener('click', addHandler);
            this.eventListeners.push({
                element: this.elements.addAccountBtn,
                event: 'click',
                handler: addHandler
            });
        }
        
        if (this.elements.newAccountInput) {
            const keyHandler = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addAccount();
                }
            };
            
            const inputHandler = (e) => {
                this.validateAccountInput(e.target);
            };
            
            this.elements.newAccountInput.addEventListener('keypress', keyHandler);
            this.elements.newAccountInput.addEventListener('input', inputHandler);
            
            this.eventListeners.push(
                { element: this.elements.newAccountInput, event: 'keypress', handler: keyHandler },
                { element: this.elements.newAccountInput, event: 'input', handler: inputHandler }
            );
        }
    }

    /**
     * Validate category input in real-time
     */
    validateCategoryInput(input, type) {
        if (!input) return;
        
        try {
            const value = input.value.trim();
            const existingCategories = type === 'income' 
                ? this.app.data.incomeCategories 
                : this.app.data.expenseCategories;
            
            // Clear previous validation classes
            input.classList.remove('input-valid', 'input-invalid');
            
            if (value === '') {
                this.clearInputError(input);
                return;
            }
            
            const validation = Utils.ValidationUtils.validateCategoryName(value, existingCategories);
            
            if (!validation.isValid) {
                input.classList.add('input-invalid');
                this.showInputError(input, validation.error);
            } else {
                input.classList.add('input-valid');
                this.clearInputError(input);
            }
        } catch (error) {
            console.error('Error validating category input:', error);
        }
    }

    /**
     * Validate account input in real-time
     */
    validateAccountInput(input) {
        if (!input) return;
        
        try {
            const value = input.value.trim();
            
            // Clear previous validation classes
            input.classList.remove('input-valid', 'input-invalid');
            
            if (value === '') {
                this.clearInputError(input);
                return;
            }
            
            const validation = Utils.ValidationUtils.validateAccountName(value, this.app.data.accounts);
            
            if (!validation.isValid) {
                input.classList.add('input-invalid');
                this.showInputError(input, validation.error);
            } else {
                input.classList.add('input-valid');
                this.clearInputError(input);
            }
        } catch (error) {
            console.error('Error validating account input:', error);
        }
    }

    /**
     * Show input error message
     */
    showInputError(input, message) {
        const errorId = input.id + '-error';
        let errorEl = document.getElementById(errorId);
        
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.id = errorId;
            errorEl.className = 'input-error-message';
            
            if (input.parentNode) {
                input.parentNode.appendChild(errorEl);
            }
        }
        
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }

    /**
     * Clear input error message
     */
    clearInputError(input) {
        const errorId = input.id + '-error';
        const errorEl = document.getElementById(errorId);
        if (errorEl) {
            errorEl.style.display = 'none';
        }
    }

    /**
     * Add new income category using common logic
     */
    addIncomeCategory() {
        this.addCategory('income', this.elements.newIncomeCategoryInput, this.app.data.incomeCategories);
    }

    /**
     * Add new expense category using common logic
     */
    addExpenseCategory() {
        this.addCategory('expense', this.elements.newExpenseCategoryInput, this.app.data.expenseCategories);
    }

    /**
     * Common method to add categories (reduces code duplication)
     */
    addCategory(type, inputElement, categoriesArray) {
        if (!inputElement) {
            Utils.UIUtils.showMessage('Không tìm thấy ô nhập liệu', 'error');
            return;
        }
        
        const name = inputElement.value?.trim();
        
        if (!name) {
            Utils.UIUtils.showMessage(`Vui lòng nhập tên danh mục ${type === 'income' ? 'thu nhập' : 'chi tiêu'}`, 'error');
            inputElement.focus();
            return;
        }
        
        try {
            // Validate category name
            const validation = Utils.ValidationUtils.validateCategoryName(name, categoriesArray);
            if (!validation.isValid) {
                Utils.UIUtils.showMessage(validation.error, 'error');
                inputElement.focus();
                return;
            }
            
            // Check for protected categories
            if (this.isProtectedCategoryName(name)) {
                Utils.UIUtils.showMessage('Tên danh mục này được hệ thống sử dụng', 'error');
                inputElement.focus();
                return;
            }
            
            // Add category
            const newCategory = {
                value: name,
                text: name,
                createdAt: new Date().toISOString(),
                createdBy: 'user'
            };
            
            categoriesArray.push(newCategory);
            this.app.saveData();
            
            // Clear input and validation
            inputElement.value = '';
            inputElement.classList.remove('input-valid', 'input-invalid');
            this.clearInputError(inputElement);
            
            // Refresh UI
            this.renderCategoryList(type);
            this.refreshTransactionModule();
            
            const typeName = type === 'income' ? 'thu nhập' : 'chi tiêu';
            Utils.UIUtils.showMessage(`Đã thêm danh mục ${typeName} "${name}"`, 'success');
            
            // Focus input for quick adding
            setTimeout(() => inputElement.focus(), 100);
            
        } catch (error) {
            console.error(`Error adding ${type} category:`, error);
            Utils.UIUtils.showMessage(`Có lỗi khi thêm danh mục ${type === 'income' ? 'thu nhập' : 'chi tiêu'}`, 'error');
        }
    }

    /**
     * Add new account with validation
     */
    addAccount() {
        if (!this.elements.newAccountInput) {
            Utils.UIUtils.showMessage('Không tìm thấy ô nhập tài khoản', 'error');
            return;
        }
        
        const name = this.elements.newAccountInput.value?.trim();
        
        if (!name) {
            Utils.UIUtils.showMessage('Vui lòng nhập tên tài khoản', 'error');
            this.elements.newAccountInput.focus();
            return;
        }
        
        try {
            // Validate account name
            const validation = Utils.ValidationUtils.validateAccountName(name, this.app.data.accounts);
            if (!validation.isValid) {
                Utils.UIUtils.showMessage(validation.error, 'error');
                this.elements.newAccountInput.focus();
                return;
            }
            
            // Add account
            const newAccount = {
                value: name,
                text: name,
                createdAt: new Date().toISOString(),
                createdBy: 'user'
            };
            
            this.app.data.accounts.push(newAccount);
            this.app.saveData();
            
            // Clear input and validation
            this.elements.newAccountInput.value = '';
            this.elements.newAccountInput.classList.remove('input-valid', 'input-invalid');
            this.clearInputError(this.elements.newAccountInput);
            
            // Refresh UI
            this.renderAccountList();
            this.refreshTransactionModule();
            this.refreshHistoryModule();
            
            Utils.UIUtils.showMessage(`Đã thêm tài khoản "${name}"`, 'success');
            
            // Focus input for quick adding
            setTimeout(() => this.elements.newAccountInput.focus(), 100);
            
        } catch (error) {
            console.error('Error adding account:', error);
            Utils.UIUtils.showMessage('Có lỗi khi thêm tài khoản', 'error');
        }
    }

    /**
     * Check if category name is protected
     */
    isProtectedCategoryName(name) {
        const protectedNames = [
            Utils.CONFIG.TRANSFER_CATEGORY_IN,
            Utils.CONFIG.TRANSFER_CATEGORY_OUT,
            Utils.CONFIG.RECONCILE_ADJUST_INCOME_CAT,
            Utils.CONFIG.RECONCILE_ADJUST_EXPENSE_CAT
        ];
        
        return protectedNames.includes(name);
    }

    /**
     * Common method to confirm category deletion
     */
    _confirmDeleteCategory(categoryValue, type) {
        if (!categoryValue) return false;
        
        try {
            const isUsed = this.app.data.transactions.some(tx => tx && tx.category === categoryValue);
            const typeName = type === 'income' ? 'thu nhập' : 'chi tiêu';
            
            let message;
            if (isUsed) {
                const usageCount = this.app.data.transactions.filter(tx => tx && tx.category === categoryValue).length;
                message = `Danh mục "${categoryValue}" đang được sử dụng trong ${usageCount} giao dịch.\n\n` +
                         'Bạn có chắc chắn muốn xóa? Các giao dịch liên quan sẽ không bị xóa nhưng có thể gây lỗi hiển thị.';
            } else {
                message = `Bạn có chắc chắn muốn xóa danh mục ${typeName} "${categoryValue}"?`;
            }
            
            return confirm(message);
        } catch (error) {
            console.error('Error in delete confirmation:', error);
            return false;
        }
    }

    /**
     * Delete income category using common logic
     */
    deleteIncomeCategory(categoryValue) {
        this.deleteCategory(categoryValue, 'income', this.app.data.incomeCategories);
    }

    /**
     * Delete expense category using common logic
     */
    deleteExpenseCategory(categoryValue) {
        this.deleteCategory(categoryValue, 'expense', this.app.data.expenseCategories);
    }

    /**
     * Common method to delete categories (reduces code duplication)
     */
    deleteCategory(categoryValue, type, categoriesArray) {
        if (!categoryValue || typeof categoryValue !== 'string') {
            Utils.UIUtils.showMessage('Danh mục không hợp lệ', 'error');
            return;
        }
        
        try {
            // Check if it's a protected category
            if (this.isProtectedCategory(categoryValue)) {
                Utils.UIUtils.showMessage('Không thể xóa danh mục hệ thống', 'error');
                return;
            }
            
            // Confirm deletion
            if (!this._confirmDeleteCategory(categoryValue, type)) {
                return;
            }
            
            // Find category index
            const categoryIndex = categoriesArray.findIndex(cat => cat && cat.value === categoryValue);
            
            if (categoryIndex === -1) {
                Utils.UIUtils.showMessage('Không tìm thấy danh mục', 'error');
                return;
            }
            
            // Remove category
            categoriesArray.splice(categoryIndex, 1);
            this.app.saveData();
            
            // Refresh UI
            this.renderCategoryList(type);
            this.refreshTransactionModule();
            
            const typeName = type === 'income' ? 'thu nhập' : 'chi tiêu';
            Utils.UIUtils.showMessage(`Đã xóa danh mục ${typeName} "${categoryValue}"`, 'success');
            
        } catch (error) {
            console.error(`Error deleting ${type} category:`, error);
            Utils.UIUtils.showMessage(`Có lỗi khi xóa danh mục ${type === 'income' ? 'thu nhập' : 'chi tiêu'}`, 'error');
        }
    }

    /**
     * Delete account with enhanced validation
     */
    deleteAccount(accountValue) {
        if (!accountValue || typeof accountValue !== 'string') {
            Utils.UIUtils.showMessage('Tài khoản không hợp lệ', 'error');
            return;
        }
        
        try {
            // Check if account is used in transactions
            const usedTransactions = this.app.data.transactions.filter(tx => 
                tx && tx.account === accountValue
            );
            
            let message;
            if (usedTransactions.length > 0) {
                message = `Tài khoản "${accountValue}" đang được sử dụng trong ${usedTransactions.length} giao dịch.\n\n` +
                         'Bạn có chắc chắn muốn xóa? Các giao dịch liên quan sẽ không bị xóa nhưng có thể gây lỗi hiển thị.';
            } else {
                message = `Bạn có chắc chắn muốn xóa tài khoản "${accountValue}"?`;
            }
            
            if (!confirm(message)) {
                return;
            }
            
            // Find account index
            const accountIndex = this.app.data.accounts.findIndex(acc => acc && acc.value === accountValue);
            
            if (accountIndex === -1) {
                Utils.UIUtils.showMessage('Không tìm thấy tài khoản', 'error');
                return;
            }
            
            // Remove account
            this.app.data.accounts.splice(accountIndex, 1);
            this.app.saveData();
            
            // Refresh UI
            this.renderAccountList();
            this.refreshTransactionModule();
            this.refreshHistoryModule();
            
            Utils.UIUtils.showMessage(`Đã xóa tài khoản "${accountValue}"`, 'success');
            
        } catch (error) {
            console.error('Error deleting account:', error);
            Utils.UIUtils.showMessage('Có lỗi khi xóa tài khoản', 'error');
        }
    }

    /**
     * Render category list with type parameter
     */
    renderCategoryList(type) {
        if (type === 'income') {
            this.renderIncomeCategoryList();
        } else if (type === 'expense') {
            this.renderExpenseCategoryList();
        }
    }

    /**
     * Render income category list with performance optimization
     */
    renderIncomeCategoryList() {
        if (!this.elements.incomeCategoryList) {
            console.warn('Income category list element not found');
            return;
        }
        
        try {
            const startTime = performance.now();
            
            this.elements.incomeCategoryList.innerHTML = '';
            
            if (!Array.isArray(this.app.data.incomeCategories) || this.app.data.incomeCategories.length === 0) {
                this.elements.incomeCategoryList.innerHTML = `
                    <li class="no-data">
                        <span class="no-data-text">Chưa có danh mục thu nhập</span>
                    </li>
                `;
                return;
            }
            
            const fragment = document.createDocumentFragment();
            
            this.app.data.incomeCategories.forEach(category => {
                try {
                    if (category && category.value) {
                        const listItem = this.createCategoryListItem(category, 'income');
                        if (listItem) {
                            fragment.appendChild(listItem);
                        }
                    }
                } catch (error) {
                    console.error('Error creating income category item:', category, error);
                }
            });
            
            this.elements.incomeCategoryList.appendChild(fragment);
            
            const renderTime = performance.now() - startTime;
            if (renderTime > 50) {
                console.warn(`Slow income category render: ${renderTime}ms`);
            }
            
        } catch (error) {
            console.error('Error rendering income category list:', error);
            this.elements.incomeCategoryList.innerHTML = `
                <li class="error-message">
                    Có lỗi khi hiển thị danh mục thu nhập
                </li>
            `;
        }
    }

    /**
     * Render expense category list with performance optimization
     */
    renderExpenseCategoryList() {
        if (!this.elements.expenseCategoryList) {
            console.warn('Expense category list element not found');
            return;
        }
        
        try {
            const startTime = performance.now();
            
            this.elements.expenseCategoryList.innerHTML = '';
            
            if (!Array.isArray(this.app.data.expenseCategories) || this.app.data.expenseCategories.length === 0) {
                this.elements.expenseCategoryList.innerHTML = `
                    <li class="no-data">
                        <span class="no-data-text">Chưa có danh mục chi tiêu</span>
                    </li>
                `;
                return;
            }
            
            const fragment = document.createDocumentFragment();
            
            this.app.data.expenseCategories.forEach(category => {
                try {
                    if (category && category.value) {
                        const listItem = this.createCategoryListItem(category, 'expense');
                        if (listItem) {
                            fragment.appendChild(listItem);
                        }
                    }
                } catch (error) {
                    console.error('Error creating expense category item:', category, error);
                }
            });
            
            this.elements.expenseCategoryList.appendChild(fragment);
            
            const renderTime = performance.now() - startTime;
            if (renderTime > 50) {
                console.warn(`Slow expense category render: ${renderTime}ms`);
            }
            
        } catch (error) {
            console.error('Error rendering expense category list:', error);
            this.elements.expenseCategoryList.innerHTML = `
                <li class="error-message">
                    Có lỗi khi hiển thị danh mục chi tiêu
                </li>
            `;
        }
    }

    /**
     * Render account list with enhanced error handling
     */
    renderAccountList() {
        if (!this.elements.accountList) {
            console.warn('Account list element not found');
            return;
        }
        
        try {
            const startTime = performance.now();
            
            this.elements.accountList.innerHTML = '';
            
            if (!Array.isArray(this.app.data.accounts) || this.app.data.accounts.length === 0) {
                this.elements.accountList.innerHTML = `
                    <li class="no-data">
                        <span class="no-data-text">Chưa có tài khoản</span>
                    </li>
                `;
                return;
            }
            
            const fragment = document.createDocumentFragment();
            
            this.app.data.accounts.forEach(account => {
                try {
                    if (account && account.value) {
                        const listItem = this.createAccountListItem(account);
                        if (listItem) {
                            fragment.appendChild(listItem);
                        }
                    }
                } catch (error) {
                    console.error('Error creating account item:', account, error);
                }
            });
            
            this.elements.accountList.appendChild(fragment);
            
            const renderTime = performance.now() - startTime;
            if (renderTime > 50) {
                console.warn(`Slow account list render: ${renderTime}ms`);
            }
            
        } catch (error) {
            console.error('Error rendering account list:', error);
            this.elements.accountList.innerHTML = `
                <li class="error-message">
                    Có lỗi khi hiển thị danh sách tài khoản
                </li>
            `;
        }
    }

    /**
     * Create category list item with improved error handling
     */
    createCategoryListItem(category, type) {
        if (!category || !category.value || !category.text) {
            console.warn('Invalid category for list item creation');
            return null;
        }
        
        try {
            const li = document.createElement('li');
            li.className = 'category-item';
            
            const icon = Utils.UIUtils.getCategoryIcon(category.value);
            const isProtected = this.isProtectedCategory(category.value);
            
            // Count usage safely
            let usageCount = 0;
            try {
                usageCount = this.app.data.transactions.filter(tx => 
                    tx && tx.category === category.value
                ).length;
            } catch (error) {
                console.error('Error counting category usage:', error);
            }
            
            const escapedName = this.escapeHtml(category.text);
            const escapedValue = this.escapeHtml(category.value);
            
            li.innerHTML = `
                <div class="category-info">
                    <span class="category-icon">${icon}</span>
                    <div class="category-details">
                        <span class="category-name">${escapedName}</span>
                        <span class="category-usage">${usageCount} giao dịch</span>
                    </div>
                </div>
                <div class="category-actions">
                    ${!isProtected ? `
                        <button class="delete-btn" onclick="window.CategoriesModule.delete${type === 'income' ? 'Income' : 'Expense'}Category('${escapedValue}')" title="Xóa danh mục">
                            🗑️
                        </button>
                    ` : `
                        <span class="protected-badge" title="Danh mục hệ thống">🔒</span>
                    `}
                </div>
            `;
            
            return li;
        } catch (error) {
            console.error('Error creating category list item:', error);
            return null;
        }
    }

    /**
     * Create account list item with improved error handling
     */
	createAccountListItem(account) {
		if (!account || !account.value || !account.text) {
			console.warn('Invalid account for list item creation');
			return null;
		}
		try {
			const li = document.createElement('li');
			li.className = 'category-item';

			// Get account balance safely
			let balance = 0;
			try {
				balance = this.app.getAccountBalance(account.value);
			} catch (error) {
				console.error('Error getting account balance:', error);
			}

			const balanceClass = balance >= 0 ? 'text-success' : 'text-danger';

			// Count usage safely
			let usageCount = 0;
			try {
				usageCount = this.app.data.transactions.filter(tx => 
					tx && tx.account === account.value
				).length;
			} catch (error) {
				console.error('Error counting account usage:', error);
			}

			const escapedName = this.escapeHtml(account.text);
			const escapedValue = this.escapeHtml(account.value);

			// --- ẨN HIỆN SỐ DƯ ---
			const hiddenKey = `balance_hidden_${account.value}`;
			const isHidden = localStorage.getItem(hiddenKey) === 'true';

			// HTML phần số dư và nút con mắt
			li.innerHTML = `
				<div class="category-info" style="display: flex; align-items: center; justify-content: space-between;">
					<div style="flex:1;">
						<span class="category-icon">🏦</span>
						<span class="category-name" style="font-weight: 500;">${escapedName}</span>
						<span class="category-usage" style="font-size: 12px; color: #888;">(${usageCount} giao dịch)</span>
					</div>
					<div style="display: flex; align-items: center; gap: 8px;">
						<span class="account-balance ${balanceClass}" id="balance-${account.value.replace(/[^a-zA-Z0-9]/g, '_')}" style="font-weight:600; min-width:85px; display:inline-block; text-align:right;">
							${isHidden ? '******' : Utils.CurrencyUtils.formatCurrency(balance)}
						</span>
						<button class="eye-toggle-btn"
							title="${isHidden ? 'Hiện số dư' : 'Ẩn số dư'}"
							data-account="${account.value}"
							style="background: none; border: none; cursor: pointer; font-size: 1.15em; color: #999;">
							${isHidden ? '🙈' : '👁️'}
						</button>
					</div>
				</div>
				<div class="category-actions">
					<button class="delete-btn" onclick="window.CategoriesModule.deleteAccount('${escapedValue}')" title="Xóa tài khoản">
						🗑️
					</button>
				</div>
			`;

			// Thêm event cho nút con mắt
			setTimeout(() => {
				const eyeBtn = li.querySelector('.eye-toggle-btn');
				if (eyeBtn) {
					eyeBtn.addEventListener('click', function() {
						const acc = this.dataset.account;
						const key = `balance_hidden_${acc}`;
						const balSpan = li.querySelector(`#balance-${acc.replace(/[^a-zA-Z0-9]/g, '_')}`);
						const isHidden = localStorage.getItem(key) === 'true';
						localStorage.setItem(key, !isHidden);
						if (balSpan) {
							if (!isHidden) {
								balSpan.textContent = '******';
								this.innerHTML = '🙈';
								this.title = 'Hiện số dư';
							} else {
								// Lưu lại số dư vào biến balance từ ngoài closure
								balSpan.textContent = Utils.CurrencyUtils.formatCurrency(balance);
								this.innerHTML = '👁️';
								this.title = 'Ẩn số dư';
							}
						}
					});
				}
			}, 0);

			return li;
		} catch (error) {
			console.error('Error creating account list item:', error);
			return null;
		}
	}

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text || typeof text !== 'string') return '';
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Check if category is protected (system category)
     */
    isProtectedCategory(categoryValue) {
        const protectedCategories = [
            Utils.CONFIG.TRANSFER_CATEGORY_IN,
            Utils.CONFIG.TRANSFER_CATEGORY_OUT,
            Utils.CONFIG.RECONCILE_ADJUST_INCOME_CAT,
            Utils.CONFIG.RECONCILE_ADJUST_EXPENSE_CAT
        ];
        
        return protectedCategories.includes(categoryValue);
    }

    /**
     * Get category statistics with error handling
     */
    getCategoryStatistics() {
        try {
            const stats = {
                incomeCategories: {
                    total: 0,
                    used: 0,
                    protected: 0
                },
                expenseCategories: {
                    total: 0,
                    used: 0,
                    protected: 0
                },
                accounts: {
                    total: 0,
                    used: 0,
                    totalBalance: 0
                }
            };
            
            // Income categories statistics
            if (Array.isArray(this.app.data.incomeCategories)) {
                stats.incomeCategories.total = this.app.data.incomeCategories.length;
                
                const usedIncomeCategories = new Set();
                this.app.data.transactions.forEach(tx => {
                    if (tx && tx.type === 'Thu' && tx.category) {
                        usedIncomeCategories.add(tx.category);
                    }
                });
                stats.incomeCategories.used = usedIncomeCategories.size;
                
                stats.incomeCategories.protected = this.app.data.incomeCategories.filter(cat => 
                    cat && this.isProtectedCategory(cat.value)
                ).length;
            }
            
            // Expense categories statistics
            if (Array.isArray(this.app.data.expenseCategories)) {
                stats.expenseCategories.total = this.app.data.expenseCategories.length;
                
                const usedExpenseCategories = new Set();
                this.app.data.transactions.forEach(tx => {
                    if (tx && tx.type === 'Chi' && tx.category) {
                        usedExpenseCategories.add(tx.category);
                    }
                });
                stats.expenseCategories.used = usedExpenseCategories.size;
                
                stats.expenseCategories.protected = this.app.data.expenseCategories.filter(cat => 
                    cat && this.isProtectedCategory(cat.value)
                ).length;
            }
            
            // Accounts statistics
            if (Array.isArray(this.app.data.accounts)) {
                stats.accounts.total = this.app.data.accounts.length;
                
                const usedAccounts = new Set();
                this.app.data.transactions.forEach(tx => {
                    if (tx && tx.account) {
                        usedAccounts.add(tx.account);
                    }
                });
                stats.accounts.used = usedAccounts.size;
                
                stats.accounts.totalBalance = this.app.data.accounts.reduce((total, account) => {
                    try {
                        return total + this.app.getAccountBalance(account.value);
                    } catch (error) {
                        console.error('Error calculating balance for account:', account.value, error);
                        return total;
                    }
                }, 0);
            }
            
            return stats;
        } catch (error) {
            console.error('Error calculating category statistics:', error);
            return {
                incomeCategories: { total: 0, used: 0, protected: 0 },
                expenseCategories: { total: 0, used: 0, protected: 0 },
                accounts: { total: 0, used: 0, totalBalance: 0 }
            };
        }
    }

    /**
     * Refresh transaction module safely
     */
    refreshTransactionModule() {
        try {
            if (window.TransactionsModule && typeof window.TransactionsModule.populateDropdowns === 'function') {
                window.TransactionsModule.populateDropdowns();
            }
        } catch (error) {
            console.error('Error refreshing transaction module:', error);
        }
    }

    /**
     * Refresh history module safely
     */
    refreshHistoryModule() {
        try {
            if (window.HistoryModule && typeof window.HistoryModule.refresh === 'function') {
                window.HistoryModule.refresh();
            }
        } catch (error) {
            console.error('Error refreshing history module:', error);
        }
    }

    /**
     * Cleanup method to prevent memory leaks
     */
    destroy() {
        // Cleanup event listeners
        this.eventListeners.forEach(({ element, event, handler }) => {
            if (element && typeof element.removeEventListener === 'function') {
                element.removeEventListener(event, handler);
            }
        });
        this.eventListeners = [];
        
        // Clear DOM references
        this.elements = {};
        
        // Reset performance tracking
        this.lastRenderTime = 0;
        this.renderCount = 0;
    }

    /**
     * Refresh the module with error handling
     */
    refresh() {
        try {
            this.renderIncomeCategoryList();
            this.renderExpenseCategoryList();
            this.renderAccountList();
        } catch (error) {
            console.error('Error refreshing categories module:', error);
            Utils.UIUtils.showMessage('Có lỗi khi cập nhật module danh mục', 'error');
        }
    }
}

// Add CSS for category management
const categoryCSS = `
<style>
.category-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
}

.category-icon {
    font-size: 1.2rem;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-tertiary);
    border-radius: 8px;
    flex-shrink: 0;
}

.category-details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
}

.category-name {
    font-weight: 500;
    color: var(--text-primary);
}

.category-usage {
    font-size: 0.8rem;
    color: var(--text-muted);
}

.account-balance {
    font-size: 0.85rem;
    font-weight: 600;
    font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
}

.category-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.protected-badge {
    font-size: 0.9rem;
    opacity: 0.6;
    cursor: help;
}

@media (max-width: 480px) {
    .category-info {
        gap: 0.5rem;
    }
    
    .category-icon {
        width: 28px;
        height: 28px;
        font-size: 1rem;
    }
    
    .category-name {
        font-size: 0.9rem;
    }
    
    .category-usage,
    .account-balance {
        font-size: 0.75rem;
    }
}
</style>
`;

// Inject CSS
if (!document.getElementById('category-css')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'category-css';
    styleElement.innerHTML = categoryCSS;
    document.head.appendChild(styleElement);
}

// Create global instance
window.CategoriesModule = new CategoriesModule();