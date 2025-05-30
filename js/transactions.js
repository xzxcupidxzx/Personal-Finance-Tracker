/**
 * TRANSACTIONS MODULE - FIXED VERSION
 * Handles transaction form, list, and CRUD operations
 */

class TransactionsModule {
    constructor() {
        this.app = null;
        this.editingTransactionId = null;
        this.currentFilter = {
            period: 'month',
            date: null
        };
        this.suggestionData = null;

        // DOM elements
        this.elements = {};

        // Event listeners for cleanup
        this.eventListeners = [];

        // Debounced functions
        this.debouncedRenderList = null;
        this.debouncedCheckSuggestions = null;
        this.debouncedPopulateDescriptionSuggestions = null;

        // Performance tracking
        this.renderCount = 0;
        this.lastRenderTime = 0;
    }

    /**
     * Initialize the module with comprehensive error handling
     */
    init(app) {
        this.app = app;
        console.log('💳 Initializing Transactions Module...');

        try {
            this.initializeElements();
            this.initializeDebouncedFunctions();
            this.initializeForm();
            this.initializeFilters();
            this.initializeSuggestions();

            this.populateDropdowns();
            this.renderTransactionList();

            console.log('✅ Transactions Module initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Transactions Module:', error);
            Utils.UIUtils.showMessage('Có lỗi khi khởi tạo module giao dịch', 'error');
        }
    }

    /**
     * Initialize DOM elements with comprehensive validation
     */
    initializeElements() {
        this.elements = {
            // Form elements
            form: document.getElementById('transaction-form'),
            typeRadios: document.querySelectorAll('input[name="type"]'),
            categorySelect: document.getElementById('category-select'),
            accountFrom: document.getElementById('account-from'),
            accountTo: document.getElementById('account-to'),
            toAccountRow: document.getElementById('to-account-row'),
            categoryRow: document.getElementById('category-row'),
            amountInput: document.getElementById('amount-input'),
            currencySelector: document.getElementById('currency-selector'),
            descriptionInput: document.getElementById('description-input'),
            datetimeInput: document.getElementById('datetime-input'),
            submitBtn: document.getElementById('submit-btn'),
            addZerosBtn: document.getElementById('add-zeros-btn'),
            descriptionSuggestions: document.getElementById('description-suggestions'),

            // Filter elements
            filterPeriod: document.getElementById('filter-period'),
            filterDate: document.getElementById('filter-date'),

            // List elements
            transactionList: document.getElementById('transaction-list'),
            noTransactions: document.getElementById('no-transactions'),

            // Suggestion elements
            suggestionArea: document.getElementById('suggestion-area'),
            suggestionDesc: document.getElementById('suggestion-desc'),
            suggestionAmount: document.getElementById('suggestion-amount'),
            applySuggestion: document.getElementById('apply-suggestion'),
            dismissSuggestion: document.getElementById('dismiss-suggestion')
        };

        // Log missing critical elements
        const criticalElements = ['form', 'amountInput', 'transactionList'];
        criticalElements.forEach(key => {
            if (!this.elements[key]) {
                console.error(`Critical element missing: ${key}`);
            }
        });
    }

    /**
     * Initialize debounced functions for performance
     */
    initializeDebouncedFunctions() {
        this.debouncedRenderList = Utils.UIUtils.debounce(() => {
            this.renderTransactionList();
        }, 300);

        this.debouncedCheckSuggestions = Utils.UIUtils.debounce(() => {
            this.checkSuggestions();
        }, 500);

        this.debouncedPopulateDescriptionSuggestions = Utils.UIUtils.debounce(() => {
            this.populateDescriptionSuggestions();
        }, 300);
    }

    /**
     * Initialize form functionality with proper cleanup tracking
     */
    initializeForm() {
        if (!this.elements.form) {
            console.error('Form element not found');
            return;
        }

        try {
            // Form submission
            const submitHandler = (e) => {
                e.preventDefault();
                this.handleSubmit();
            };
            this.elements.form.addEventListener('submit', submitHandler);
            this.eventListeners.push({
                element: this.elements.form,
                event: 'submit',
                handler: submitHandler
            });

            // Transaction type change - FIXED: Better event handling
            this.elements.typeRadios.forEach(radio => {
                const changeHandler = () => {
                    console.log('🔄 Transaction type changed to:', radio.value);
                    this.updateFormVisibility();
                    this.populateCategories(); // Re-populate categories based on type
                    this.debouncedCheckSuggestions();
                    localStorage.setItem('lastTransactionType', radio.value);
                };

                radio.addEventListener('change', changeHandler);
                this.eventListeners.push({
                    element: radio,
                    event: 'change',
                    handler: changeHandler
                });
            });

            // Category change for suggestions
            if (this.elements.categorySelect) {
                const categoryChangeHandler = () => {
                    this.debouncedCheckSuggestions();
                };

                this.elements.categorySelect.addEventListener('change', categoryChangeHandler);
                this.eventListeners.push({
                    element: this.elements.categorySelect,
                    event: 'change',
                    handler: categoryChangeHandler
                });
            }

            // Description input for suggestions
            if (this.elements.descriptionInput) {
                const descriptionInputHandler = () => {
                    this.debouncedCheckSuggestions();
                    this.debouncedPopulateDescriptionSuggestions();
                };
                this.elements.descriptionInput.addEventListener('input', descriptionInputHandler);
                this.eventListeners.push({
                    element: this.elements.descriptionInput,
                    event: 'input',
                    handler: descriptionInputHandler
                });
            }

            // Amount input formatting
            if (this.elements.amountInput) {
                const amountInputHandler = (e) => {
                    try {
                        Utils.UIUtils.formatAmountInputWithCursor(e.target, e.target.value);
                        this.debouncedCheckSuggestions();
                    } catch (error) {
                        console.error('Error formatting amount input:', error);
                    }
                };

                this.elements.amountInput.addEventListener('input', amountInputHandler);
                this.eventListeners.push({
                    element: this.elements.amountInput,
                    event: 'input',
                    handler: amountInputHandler
                });
            }

            // Currency selector change
            if (this.elements.currencySelector) {
                const currencyChangeHandler = () => {
                    if (this.elements.amountInput) {
                        const currentAmount = Utils.CurrencyUtils.parseAmountInput(this.elements.amountInput.value, 'VND');
                        this.elements.amountInput.value = Utils.CurrencyUtils.formatAmountInput(currentAmount);
                    }
                    this.debouncedCheckSuggestions();
                };
                this.elements.currencySelector.addEventListener('change', currencyChangeHandler);
                this.eventListeners.push({
                    element: this.elements.currencySelector,
                    event: 'change',
                    handler: currencyChangeHandler
                });
            }

            // Set default datetime
            if (this.elements.datetimeInput) {
                try {
                    this.elements.datetimeInput.value = Utils.DateUtils.formatDateTimeLocal();
                } catch (error) {
                    console.error('Error setting default datetime:', error);
                }
            }

            // FIXED: Load and set last transaction type
            this.loadLastTransactionType();
            this.updateFormVisibility();

        } catch (error) {
            console.error('Error initializing form:', error);
        }
    }

    /**
     * FIXED: Load last transaction type from localStorage
     */
    loadLastTransactionType() {
        try {
            const lastType = localStorage.getItem('lastTransactionType') || 'Chi';
            console.log('📋 Loading last transaction type:', lastType);
            
            const lastTypeRadio = document.querySelector(`input[name="type"][value="${lastType}"]`);
            if (lastTypeRadio) {
                lastTypeRadio.checked = true;
                console.log('✅ Set last transaction type:', lastType);
            } else {
                // Fallback to Chi if not found
                const defaultRadio = document.querySelector(`input[name="type"][value="Chi"]`);
                if (defaultRadio) {
                    defaultRadio.checked = true;
                }
            }
        } catch (error) {
            console.error('Error loading last transaction type:', error);
        }
    }

    /**
     * Initialize filters with debouncing
     */
    initializeFilters() {
        try {
            if (this.elements.filterPeriod) {
                const periodHandler = () => {
                    this.currentFilter.period = this.elements.filterPeriod.value;
                    if (this.currentFilter.period !== 'custom') {
                        this.currentFilter.date = null;
                        if (this.elements.filterDate) {
                            this.elements.filterDate.value = '';
                            this.elements.filterDate.style.display = 'none';
                        }
                    } else {
                        this.elements.filterDate.style.display = 'block';
                    }
                    this.debouncedRenderList();
                };

                this.elements.filterPeriod.addEventListener('change', periodHandler);
                this.eventListeners.push({
                    element: this.elements.filterPeriod,
                    event: 'change',
                    handler: periodHandler
                });
            }

            if (this.elements.filterDate) {
                const dateHandler = () => {
                    this.currentFilter.date = this.elements.filterDate.value;
                    if (this.currentFilter.date) {
                        this.currentFilter.period = 'custom';
                        if (this.elements.filterPeriod) {
                            this.elements.filterPeriod.value = 'custom';
                        }
                    }
                    this.debouncedRenderList();
                };

                this.elements.filterDate.addEventListener('change', dateHandler);
                this.eventListeners.push({
                    element: this.elements.filterDate,
                    event: 'change',
                    handler: dateHandler
                });

                if (this.elements.filterPeriod && this.elements.filterPeriod.value !== 'custom') {
                    this.elements.filterDate.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Error initializing filters:', error);
        }
    }

    /**
     * Initialize suggestion system
     */
    initializeSuggestions() {
        try {
            if (this.elements.applySuggestion) {
                const applyHandler = () => {
                    this.applySuggestion();
                };

                this.elements.applySuggestion.addEventListener('click', applyHandler);
                this.eventListeners.push({
                    element: this.elements.applySuggestion,
                    event: 'click',
                    handler: applyHandler
                });
            }

            if (this.elements.dismissSuggestion) {
                const dismissHandler = () => {
                    this.hideSuggestions();
                };

                this.elements.dismissSuggestion.addEventListener('click', dismissHandler);
                this.eventListeners.push({
                    element: this.elements.dismissSuggestion,
                    event: 'click',
                    handler: dismissHandler
                });
            }
        } catch (error) {
            console.error('Error initializing suggestions:', error);
        }
    }

    /**
     * FIXED: Update form visibility based on transaction type
     */
	updateFormVisibility() {
		const selectedType = document.querySelector('input[name="type"]:checked')?.value;
		console.log('🔧 Updating form visibility for type:', selectedType);

		if (!selectedType) return;

		// 1. Ẩn/hiện trường đến tài khoản
		if (this.elements.toAccountRow) {
			this.elements.toAccountRow.style.display = selectedType === 'Transfer' ? 'flex' : 'none';
		}

		// 2. Ẩn/hiện trường hạng mục và xử lý required
		if (this.elements.categoryRow) {
			this.elements.categoryRow.style.display = selectedType !== 'Transfer' ? 'flex' : 'none';
		}
		if (this.elements.categorySelect) {
			// Nếu đang chuyển tiền, loại required (vì bị ẩn sẽ báo lỗi)
			if (selectedType === 'Transfer') {
				this.elements.categorySelect.removeAttribute('required');
			} else {
				this.elements.categorySelect.setAttribute('required', 'required');
			}
		}

		// 3. Chỉnh nút & icon
		if (this.elements.submitBtn) {
			const btnText = this.elements.submitBtn.querySelector('.btn-text');
			const btnIcon = this.elements.submitBtn.querySelector('.btn-icon');
			if (btnText) {
				btnText.textContent = selectedType === 'Transfer' ? 'Thêm Chuyển Khoản' : 'Thêm Giao Dịch';
			}
			if (btnIcon) {
				btnIcon.textContent = selectedType === 'Transfer' ? '↔️' : '➕';
			}
		}

		// 4. Đổi label tài khoản
		const accountFromLabel = document.getElementById('account-from-label');
		if (accountFromLabel) {
			accountFromLabel.textContent = selectedType === 'Transfer' ? 'Từ tài khoản' : 'Tài khoản';
		}

		// 5. Khi là chuyển khoản, cập nhật lại tài khoản nhận (KHÔNG GỌI populateAccounts nếu nó lại gọi lại updateFormVisibility)
		// Sửa: Chỉ cập nhật account-to khi là Transfer hoặc khi account-from thay đổi
		if (typeof this.populateAccounts === 'function') {
			if (selectedType === 'Transfer') {
				// Cập nhật dropdown account-to để tránh bị trùng với account-from
				this.populateAccounts();
			}
		}
	}

    /**
     * FIXED: Populate category and account dropdowns
     */
    populateDropdowns() {
        console.log('🔄 Populating dropdowns...');
        this.populateCategories();
        this.populateAccounts();
        this.populateDescriptionSuggestions();
    }

    /**
     * FIXED: Populate categories based on selected transaction type
     */
    populateCategories() {
        if (!this.elements.categorySelect || !this.app) {
            console.error('❌ Category select element or app not found');
            return;
        }

        const selectedTypeRadio = document.querySelector('input[name="type"]:checked');
        const selectedType = selectedTypeRadio?.value;
        
        console.log('📋 PopulateCategories called - selectedType:', selectedType);
        
        if (!selectedType) {
            console.warn('⚠️ No transaction type selected');
            return;
        }

        let categories = [];

        // FIXED: Simplified type checking
        if (selectedType === 'Thu') {
            categories = this.app.data.incomeCategories || [];
            console.log('💰 Loading income categories:', categories.length);
        } else if (selectedType === 'Chi') {
            categories = this.app.data.expenseCategories || [];
            console.log('💸 Loading expense categories:', categories.length);
        } else {
            console.log('ℹ️ Transfer type selected, no categories needed');
            return;
        }

        // Clear and populate select
        this.elements.categorySelect.innerHTML = '<option value="">Chọn hạng mục...</option>';
        
        if (categories.length === 0) {
            console.warn('⚠️ No categories found for type:', selectedType);
            this.elements.categorySelect.innerHTML += '<option value="" disabled>Không có danh mục</option>';
            return;
        }

        let addedCount = 0;
        categories.forEach((cat, index) => {
            if (cat && cat.value && cat.text) {
                const option = document.createElement('option');
                option.value = cat.value;
                option.textContent = cat.text;
                this.elements.categorySelect.appendChild(option);
                addedCount++;
                console.log(`  ➕ Added category ${index + 1}: ${cat.text} (${cat.value})`);
            } else {
                console.warn('⚠️ Invalid category object:', cat);
            }
        });
        
        console.log(`✅ Categories populated successfully: ${addedCount} categories`);
    }

    /**
     * Populate accounts for 'from' and 'to' dropdowns
     */
    populateAccounts() {
        if (!this.elements.accountFrom || !this.app) return;

        const accounts = this.app.data.accounts || [];
        console.log('🏦 Populating accounts:', accounts.length);

        this.elements.accountFrom.innerHTML = '<option value="">Chọn tài khoản...</option>';
        if (this.elements.accountTo) {
            this.elements.accountTo.innerHTML = '<option value="">Chọn tài khoản nhận...</option>';
        }

        accounts.forEach(acc => {
            if (acc && acc.value && acc.text) {
                const option = document.createElement('option');
                option.value = acc.value;
                option.textContent = acc.text;
                this.elements.accountFrom.appendChild(option.cloneNode(true));
                if (this.elements.accountTo) {
                    this.elements.accountTo.appendChild(option);
                }
            }
        });

        console.log('✅ Accounts populated successfully');
    }

    /**
     * Populate description suggestions
     */
    populateDescriptionSuggestions() {
        if (!this.elements.descriptionSuggestions || !this.app || !this.app.data.transactions) return;

        const recentDescriptions = new Set();
        this.app.data.transactions
            .slice(0, 50)
            .filter(tx => tx && tx.description)
            .forEach(tx => recentDescriptions.add(tx.description));

        this.elements.descriptionSuggestions.innerHTML = '';
        recentDescriptions.forEach(desc => {
            const option = document.createElement('option');
            option.value = desc;
            this.elements.descriptionSuggestions.appendChild(option);
        });
    }

    /**
     * FIXED: Handle form submission with comprehensive validation
     */
    handleSubmit() {
        console.log('🚀 Form submission started');
        
        try {
            const selectedType = document.querySelector('input[name="type"]:checked')?.value;
            const selectedCategory = this.elements.categorySelect?.value;
            const amountValue = this.elements.amountInput?.value;
            
            console.log('📝 Form state:', {
                type: selectedType,
                category: selectedCategory, 
                amount: amountValue,
                account: this.elements.accountFrom?.value
            });

            const formData = this.getFormData();
            console.log('📋 Form data extracted:', formData);

            // Validate form data
            const validation = Utils.ValidationUtils.validateTransaction(formData);
            console.log('🔍 Basic validation result:', validation);
            
            if (!validation.isValid) {
                console.error('❌ Form validation failed:', validation.errors);
                Utils.UIUtils.showMessage(validation.errors[0], 'error');
                this.focusFirstErrorField(validation.errors[0]);
                return;
            }

            // Additional business logic validation
            const businessValidation = this.validateBusinessRules(formData);
            console.log('🔍 Business validation result:', businessValidation);
            
            if (!businessValidation.isValid) {
                console.error('❌ Business validation failed:', businessValidation.error);
                Utils.UIUtils.showMessage(businessValidation.error, 'error');
                return;
            }

            // Add or update transaction
            if (this.editingTransactionId) {
                console.log('📝 Updating existing transaction:', this.editingTransactionId);
                const updated = this.app.updateTransaction(this.editingTransactionId, formData);
                if (updated) {
                    Utils.UIUtils.showMessage('Giao dịch đã được cập nhật', 'success');
                    this.exitEditMode();
                } else {
                    throw new Error('Failed to update transaction');
                }
            } else {
                console.log('➕ Adding new transaction');
                const added = this.app.addTransaction(formData);
                if (added) {
                    const message = formData.type === 'Transfer'
                        ? 'Giao dịch chuyển tiền đã được thêm'
                        : 'Giao dịch đã được thêm';
                    Utils.UIUtils.showMessage(message, 'success');
                    console.log('✅ Transaction added successfully');
                } else {
                    throw new Error('Failed to add transaction');
                }
            }

            this.resetForm();
            this.renderTransactionList();
            this.app.refreshAllModules();

        } catch (error) {
            console.error('💥 Error submitting transaction:', error);
            Utils.UIUtils.showMessage(`Có lỗi xảy ra: ${error.message}`, 'error');
        }
    }

    /**
     * FIXED: Validate business rules
     */
    validateBusinessRules(data) {
        console.log('🔍 Validating business rules for:', data);
        
        try {
            // Check accounts
            if (!this.accountExists(data.account)) {
                console.error('❌ Account does not exist:', data.account);
                console.log('📋 Available accounts:', this.app.data.accounts?.map(a => a.value));
                return { isValid: false, error: 'Tài khoản nguồn không tồn tại' };
            }

            if (data.type === 'Transfer') {
                if (!this.accountExists(data.toAccount)) {
                    console.error('❌ Target account does not exist:', data.toAccount);
                    return { isValid: false, error: 'Tài khoản đích không tồn tại' };
                }
                // <<< THÊM ĐOẠN KIỂM TRA NÀY >>>
                if (data.account === data.toAccount) {
                    return { isValid: false, error: 'Tài khoản nguồn và đích phải khác nhau' };
                }
                // <<< KẾT THÚC ĐOẠN THÊM >>>
            }


            // FIXED: Check category for non-transfer transactions
            if (data.type !== 'Transfer') {
                const categoryValid = this.categoryExists(data.category, data.type);
                console.log('🏷️ Category validation:', {
                    category: data.category,
                    type: data.type,
                    valid: categoryValid
                });
                
                if (!categoryValid) {
                    console.error('❌ Category does not exist:', data.category, 'for type:', data.type);
                    if (data.type === 'Thu') {
                        console.log('📋 Available income categories:', this.app.data.incomeCategories?.map(c => c.value));
                    } else {
                        console.log('📋 Available expense categories:', this.app.data.expenseCategories?.map(c => c.value));
                    }
                    return { isValid: false, error: `Danh mục "${data.category}" không tồn tại cho loại "${data.type}"` };
                }
            }

            // Check amount limits
            if (data.amount > 999999999999) {
                return { isValid: false, error: 'Số tiền quá lớn' };
            }

            if (data.amount <= 0) {
                return { isValid: false, error: 'Số tiền phải lớn hơn 0' };
            }

            // Check date validity
            const transactionDate = new Date(data.datetime);
            if (isNaN(transactionDate.getTime())) {
                return { isValid: false, error: 'Ngày giao dịch không hợp lệ' };
            }

            const futureLimit = new Date();
            futureLimit.setFullYear(futureLimit.getFullYear() + 1);

            if (transactionDate > futureLimit) {
                return { isValid: false, error: 'Ngày giao dịch không được quá 1 năm trong tương lai' };
            }

            console.log('✅ Business rules validation passed');
            return { isValid: true };
            
        } catch (error) {
            console.error('💥 Error validating business rules:', error);
            return { isValid: false, error: 'Lỗi khi kiểm tra dữ liệu: ' + error.message };
        }
    }

    /**
     * Check if account exists
     */
    accountExists(accountValue) {
        if (!this.app || !this.app.data || !Array.isArray(this.app.data.accounts)) {
            return false;
        }
        return this.app.data.accounts.some(acc => acc && acc.value === accountValue);
    }

    /**
     * FIXED: Check if category exists
     */
    categoryExists(categoryValue, transactionType) {
        if (!this.app || !this.app.data) return false;

        if (transactionType === 'Thu') {
            return Array.isArray(this.app.data.incomeCategories) &&
                   this.app.data.incomeCategories.some(cat => cat && cat.value === categoryValue);
        } else if (transactionType === 'Chi') {
            return Array.isArray(this.app.data.expenseCategories) &&
                   this.app.data.expenseCategories.some(cat => cat && cat.value === categoryValue);
        }

        return false;
    }

    /**
     * Focus the first field with error
     */
    focusFirstErrorField(errorMessage) {
        try {
            if (errorMessage.includes('số tiền')) {
                this.elements.amountInput?.focus();
            } else if (errorMessage.includes('tài khoản')) {
                this.elements.accountFrom?.focus();
            } else if (errorMessage.includes('hạng mục')) {
                this.elements.categorySelect?.focus();
            } else if (errorMessage.includes('ngày')) {
                this.elements.datetimeInput?.focus();
            }
        } catch (error) {
            console.error('Error focusing error field:', error);
        }
    }

    /**
     * Get form data with enhanced validation and sanitization
     */
    getFormData() {
        const selectedTypeRadio = document.querySelector('input[name="type"]:checked');

        if (!selectedTypeRadio) {
            throw new Error('Vui lòng chọn loại giao dịch');
        }

        if (!this.elements.amountInput || !this.elements.amountInput.value) {
            throw new Error('Vui lòng nhập số tiền');
        }

        if (!this.elements.accountFrom || !this.elements.accountFrom.value) {
            throw new Error('Vui lòng chọn tài khoản');
        }

        if (!this.elements.datetimeInput || !this.elements.datetimeInput.value) {
            throw new Error('Vui lòng chọn ngày và giờ');
        }

        const selectedType = selectedTypeRadio.value;
        const amount = Utils.CurrencyUtils.parseAmountInput(
            this.elements.amountInput.value,
            this.elements.currencySelector?.value || 'VND'
        );

        if (isNaN(amount) || amount <= 0) {
            throw new Error('Số tiền không hợp lệ');
        }

        const data = {
            type: selectedType,
            datetime: this.elements.datetimeInput.value,
            amount: amount,
            account: this.elements.accountFrom.value,
            description: this.sanitizeDescription(this.elements.descriptionInput?.value || ''),
            originalAmount: parseFloat(this.elements.amountInput.value.replace(/[^\d.]/g, '')) || amount,
            originalCurrency: this.elements.currencySelector?.value || 'VND'
        };

        if (selectedType === 'Transfer') {
            if (!this.elements.accountTo || !this.elements.accountTo.value) {
                throw new Error('Vui lòng chọn tài khoản đích');
            }
            data.toAccount = this.elements.accountTo.value;
        } else {
            if (!this.elements.categorySelect || !this.elements.categorySelect.value) {
                throw new Error('Vui lòng chọn hạng mục');
            }
            data.category = this.elements.categorySelect.value;
        }

        return data;
    }

    /**
     * Sanitize description input
     */
    sanitizeDescription(description) {
        if (!description || typeof description !== 'string') return '';

        return description
            .trim()
            .replace(/[<>]/g, '')
            .substring(0, 500);
    }

    /**
     * FIXED: Reset the form after submission
     */
    resetForm() {
        try {
            this.elements.form.reset();
            this.elements.datetimeInput.value = Utils.DateUtils.formatDateTimeLocal();
            this.editingTransactionId = null;
            
            // Reset button text
            const btnText = this.elements.submitBtn.querySelector('.btn-text');
            const btnIcon = this.elements.submitBtn.querySelector('.btn-icon');
            if (btnText) btnText.textContent = 'Thêm Giao Dịch';
            if (btnIcon) btnIcon.textContent = '➕';
            
            // Load last transaction type
            this.loadLastTransactionType();
            this.updateFormVisibility();
            this.populateCategories();
            this.hideSuggestions();
            
            // Clear validation classes
            this.elements.amountInput?.classList.remove('input-valid', 'input-invalid');
            
            // Focus on amount for quick entry
            setTimeout(() => this.elements.amountInput?.focus(), 100);
            
            console.log('✅ Form reset successfully');
        } catch (error) {
            console.error('Error resetting form:', error);
        }
    }

    // ... (Rest of the methods remain the same as in the original file)
    // Including: renderTransactionList, createTransactionItem, editTransaction, deleteTransaction, etc.

    /**
     * Render transaction list with performance optimization
     */
    renderTransactionList() {
        const startTime = performance.now();

        try {
            if (!this.elements.transactionList || !this.elements.noTransactions) {
                console.warn('Transaction list elements not found');
                return;
            }

            const filters = {
                period: this.currentFilter.period,
                date: this.currentFilter.date
            };

            const filteredTransactions = this.app.getFilteredTransactions(filters);

            if (!Array.isArray(filteredTransactions)) {
                console.error('Invalid filtered transactions data');
                this.showNoTransactions('Có lỗi khi tải dữ liệu giao dịch');
                return;
            }

            // Sort by datetime (newest first)
            filteredTransactions.sort((a, b) => {
                try {
                    return new Date(b.datetime) - new Date(a.datetime);
                } catch (error) {
                    console.warn('Error sorting transactions by date:', error);
                    return 0;
                }
            });

            if (filteredTransactions.length === 0) {
                this.showNoTransactions();
                return;
            }

            this.elements.transactionList.style.display = 'block';
            this.elements.noTransactions.style.display = 'none';

            // Performance optimization: limit initial render
            const maxInitialRender = 50;
            const transactionsToRender = filteredTransactions.slice(0, maxInitialRender);

            this.elements.transactionList.innerHTML = '';

            const fragment = document.createDocumentFragment();

            transactionsToRender.forEach(transaction => {
                try {
                    const item = this.createTransactionItem(transaction);
                    if (item) {
                        fragment.appendChild(item);
                    }
                } catch (error) {
                    console.error('Error creating transaction item:', transaction.id, error);
                }
            });

            this.elements.transactionList.appendChild(fragment);

            // Show load more button if there are more transactions
            if (filteredTransactions.length > maxInitialRender) {
                this.showLoadMoreButton(filteredTransactions, maxInitialRender);
            }

            const renderTime = performance.now() - startTime;
            this.renderCount++;
            this.lastRenderTime = renderTime;

            if (renderTime > 100) {
                console.warn(`Slow transaction list render: ${renderTime}ms for ${transactionsToRender.length} items`);
            }

        } catch (error) {
            console.error('Error rendering transaction list:', error);
            this.showNoTransactions('Có lỗi khi hiển thị danh sách giao dịch');
        }
    }

    /**
     * Show no transactions message
     */
    showNoTransactions(customMessage = null) {
        if (this.elements.transactionList) {
            this.elements.transactionList.style.display = 'none';
        }

        if (this.elements.noTransactions) {
            this.elements.noTransactions.style.display = 'block';

            if (customMessage) {
                this.elements.noTransactions.innerHTML = `
                    <div class="no-data">
                        <span class="no-data-icon">⚠️</span>
                        <span class="no-data-text">${customMessage}</span>
                    </div>
                `;
            } else {
                this.elements.noTransactions.innerHTML = `
                    <div class="no-data">
                        <span class="no-data-icon">📝</span>
                        <span class="no-data-text">Chưa có giao dịch nào</span>
                    </div>
                `;
            }
        }
    }

    /**
     * Create transaction list item
     */
	createTransactionItem(transaction) {
		if (!transaction || !transaction.id) {
			console.warn('Invalid transaction for item creation');
			return null;
		}

		try {
			const item = document.createElement('div');
			item.className = 'transaction-item';
			item.dataset.transactionId = transaction.id;

			const typeClass = transaction.type === 'Thu' ? 'income' :
							 (transaction.type === 'Chi' && !transaction.isTransfer) ? 'expense' : 'transfer';

			const icon = this.getTransactionIcon(transaction);
			const accountName = this.getAccountName(transaction.account);

			// For transfers, show both accounts
			let accountDisplay = accountName;
			if (transaction.isTransfer) {
				const pairTransaction = transaction.transferPairId ? this.findTransferPair(transaction) : null;
				if (pairTransaction) {
					const pairAccountName = this.getAccountName(pairTransaction.account);
					accountDisplay = transaction.type === 'Chi'
						? `${accountName} → ${pairAccountName}`
						: `${pairAccountName} → ${accountName}`;
				} else {
					accountDisplay = `${accountName} (Lỗi chuyển khoản)`;
				}
			}

			// Original amount display
			let amountDisplay = Utils.CurrencyUtils.formatCurrency(transaction.amount || 0);
			if (transaction.originalCurrency === 'USD' && transaction.originalAmount) {
				const originalFormatted = Utils.CurrencyUtils.formatCurrency(transaction.originalAmount, 'USD');
				amountDisplay += ` <span class="original-amount">(${originalFormatted})</span>`;
			}

			const description = this.escapeHtml(transaction.description || 'Không có mô tả');
			const categoryDisplay = transaction.isTransfer
				? this.escapeHtml(transaction.category || 'Chuyển khoản')
				: this.escapeHtml(transaction.category || '');

			// SỬA PHẦN NÀY - Dùng compact format
			const compactDateTime = Utils.DateUtils.formatCompactDateTime(transaction.datetime);

			item.innerHTML = `
				<div class="transaction-type-icon ${typeClass}">
					${icon}
				</div>
				<div class="transaction-content">
					<div class="transaction-description">
						${description}
					</div>
					<div class="transaction-meta">
						<span class="transaction-time">
							<span class="time-part">${compactDateTime.time}</span>
							<span class="date-part">${compactDateTime.date}</span>
						</span>
						<span class="transaction-category" title="${this.escapeHtml(categoryDisplay)}">
							${categoryDisplay}
						</span>
						<span class="transaction-account" title="${this.escapeHtml(accountDisplay)}">
							${this.escapeHtml(accountDisplay)}
						</span>
					</div>
				</div>
				<div class="transaction-amount-section">
					<div class="transaction-amount ${typeClass}">
						${amountDisplay}
					</div>
					<div class="transaction-actions">
						<button class="action-btn-small edit" onclick="window.TransactionsModule.editTransaction('${transaction.id}')" title="Sửa">
							✏️
						</button>
						<button class="action-btn-small delete" onclick="window.TransactionsModule.deleteTransaction('${transaction.id}')" title="Xóa">
							🗑️
						</button>
					</div>
				</div>
			`;

			return item;
		} catch (error) {
			console.error('Error creating transaction item:', error);
			return null;
		}
	}

    /**
     * Get account name safely
     */
    getAccountName(accountValue) {
        if (!this.app || !this.app.data || !Array.isArray(this.app.data.accounts)) {
            return accountValue || 'Unknown';
        }

        const account = this.app.data.accounts.find(acc => acc && acc.value === accountValue);
        return account ? account.text : accountValue;
    }

    /**
     * Find transfer pair transaction
     */
    findTransferPair(transaction) {
        if (!transaction.isTransfer || !transaction.transferPairId) {
            return null;
        }

        if (!this.app || !this.app.data || !Array.isArray(this.app.data.transactions)) {
            return null;
        }

        return this.app.data.transactions.find(tx => tx && tx.id === transaction.transferPairId);
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
     * Get transaction icon safely
     */
    getTransactionIcon(transaction) {
        try {
            if (transaction.isTransfer) {
                return transaction.type === 'Chi' ? '➡️' : '⬅️';
            }

            if (transaction.category) {
                return Utils.UIUtils.getCategoryIcon(transaction.category);
            }
            return '📦';
        } catch (error) {
            console.error('Error getting transaction icon:', error);
            return '📦';
        }
    }

    /**
     * Edit transaction
     */
    editTransaction(transactionId) {
        if (!transactionId || typeof transactionId !== 'string') {
            Utils.UIUtils.showMessage('ID giao dịch không hợp lệ', 'error');
            return;
        }

        try {
            this.enterEditMode(transactionId);
        } catch (error) {
            console.error('Error editing transaction:', error);
            Utils.UIUtils.showMessage('Có lỗi khi chỉnh sửa giao dịch', 'error');
        }
    }

    /**
     * Delete transaction
     */
    deleteTransaction(transactionId) {
        if (!transactionId || typeof transactionId !== 'string') {
            Utils.UIUtils.showMessage('ID giao dịch không hợp lệ', 'error');
            return;
        }

        try {
            const transaction = this.app.data.transactions.find(tx => tx && tx.id === transactionId);
            if (!transaction) {
                Utils.UIUtils.showMessage('Không tìm thấy giao dịch', 'error');
                return;
            }

            const message = transaction.isTransfer
                ? 'Bạn có chắc chắn muốn xóa giao dịch chuyển tiền này? (Cả giao dịch đi và đến sẽ bị xóa)'
                : 'Bạn có chắc chắn muốn xóa giao dịch này?';

            if (!confirm(message)) return;

            if (this.app.deleteTransaction(transactionId)) {
                Utils.UIUtils.showMessage('Đã xóa giao dịch', 'success');
                this.renderTransactionList();
                this.app.refreshAllModules();
            } else {
                Utils.UIUtils.showMessage('Không thể xóa giao dịch', 'error');
            }
        } catch (error) {
            console.error('Error deleting transaction:', error);
            Utils.UIUtils.showMessage('Có lỗi khi xóa giao dịch', 'error');
        }
    }

    /**
     * Enter edit mode for a transaction
     */
    enterEditMode(transactionId) {
        if (!this.app || !this.app.data || !Array.isArray(this.app.data.transactions)) {
            Utils.UIUtils.showMessage('Dữ liệu ứng dụng không hợp lệ', 'error');
            return;
        }

        const transaction = this.app.data.transactions.find(tx => tx && tx.id === transactionId);
        if (!transaction) {
            Utils.UIUtils.showMessage('Không tìm thấy giao dịch để sửa', 'error');
            return;
        }

        this.editingTransactionId = transactionId;

        // Select transaction type radio
        const typeRadio = document.querySelector(`input[name="type"][value="${transaction.type}"]`);
        if (typeRadio) {
            typeRadio.checked = true;
            this.updateFormVisibility();
        }

        // Populate amount and currency
        if (this.elements.amountInput) {
            this.elements.amountInput.value = Utils.CurrencyUtils.formatAmountInput(transaction.originalAmount || transaction.amount);
        }
        if (this.elements.currencySelector) {
            this.elements.currencySelector.value = transaction.originalCurrency || 'VND';
        }

        // Populate account
        if (this.elements.accountFrom) {
            this.elements.accountFrom.value = transaction.account;
        }

        // Populate category or toAccount
        if (transaction.type === 'Transfer' && this.elements.accountTo) {
            const pairTransaction = this.findTransferPair(transaction);
            if (pairTransaction) {
                this.elements.accountTo.value = pairTransaction.account;
            } else {
                console.warn('Transfer pair not found for editing:', transactionId);
                Utils.UIUtils.showMessage('Lỗi: Giao dịch chuyển khoản không tìm thấy cặp. Không thể sửa.', 'error');
                this.exitEditMode();
                return;
            }
        } else if (this.elements.categorySelect) {
            this.populateCategories();
            this.elements.categorySelect.value = transaction.category || '';
        }

        // Populate description and datetime
        if (this.elements.descriptionInput) {
            this.elements.descriptionInput.value = transaction.description || '';
        }
        if (this.elements.datetimeInput) {
            this.elements.datetimeInput.value = Utils.DateUtils.formatDateTimeLocal(new Date(transaction.datetime));
        }

        // Change submit button text
        const btnText = this.elements.submitBtn.querySelector('.btn-text');
        const btnIcon = this.elements.submitBtn.querySelector('.btn-icon');
        if (btnText) btnText.textContent = 'Cập Nhật Giao Dịch';
        if (btnIcon) btnIcon.textContent = '💾';

        // Scroll to form
        this.elements.form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        this.elements.amountInput.focus();
    }

    /**
     * Exit edit mode
     */
    exitEditMode() {
        this.resetForm();
    }

    // Additional helper methods...
    showLoadMoreButton(allTransactions, currentCount) {
        // Implementation for load more functionality
    }

    applySuggestion() {
        // Implementation for applying suggestions
    }

    hideSuggestions() {
        if (this.elements.suggestionArea) {
            this.elements.suggestionArea.style.display = 'none';
            this.suggestionData = null;
        }
    }

    checkSuggestions() {
        // Implementation for checking suggestions
    }

    /**
     * Cleanup method
     */
    destroy() {
        this.eventListeners.forEach(({ element, event, handler }) => {
            if (element && typeof element.removeEventListener === 'function') {
                element.removeEventListener(event, handler);
            }
        });
        this.eventListeners = [];

        this.debouncedRenderList = null;
        this.debouncedCheckSuggestions = null;
        this.debouncedPopulateDescriptionSuggestions = null;

        this.elements = {};
        this.editingTransactionId = null;
        this.suggestionData = null;
        this.currentFilter = { period: 'month', date: null };
    }

    /**
     * Refresh the module
     */
    refresh() {
        try {
            this.populateDropdowns();
            this.renderTransactionList();
        } catch (error) {
            console.error('Error refreshing transactions module:', error);
            Utils.UIUtils.showMessage('Có lỗi khi cập nhật module giao dịch', 'error');
        }
    }
}

// Create global instance
window.TransactionsModule = new TransactionsModule();