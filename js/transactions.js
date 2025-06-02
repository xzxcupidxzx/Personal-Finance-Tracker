/**
 * TRANSACTIONS MODULE - IMPROVED VERSION
 * Handles transaction form, list, and CRUD operations
 * With optimized Smart Reset functionality and better error handling.
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
        this.smartResetEnabled = true;
        
        // DOM elements
        this.elements = {};
        
        // Event listeners for cleanup
        this.eventListeners = [];
        
        // Debounced functions
        this.debouncedFunctions = {};
        
        // Performance tracking
        this.renderCount = 0;
        this.lastRenderTime = 0;
        
        // State management
        this.isInitialized = false;
        this.pendingStateRestore = null;
    }

    /**
     * Initialize the module with comprehensive error handling
     */
    async init(app) {
        if (this.isInitialized) {
            console.warn('TransactionsModule already initialized');
            return;
        }

        this.app = app;
        console.log('💳 Initializing Transactions Module...');

        try {
            this.initializeElements();
            this.initializeDebouncedFunctions();
            await this.initializeForm();
            this.initializeFilters();
            this.initializeSuggestions();
            this.initializeSmartResetToggle();

            this.populateDropdowns();
            this.renderTransactionList();

            this.isInitialized = true;
            console.log('✅ Transactions Module initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Transactions Module:', error);
            this.handleInitError(error);
        }
    }

    /**
     * Handle initialization errors gracefully
     */
    handleInitError(error) {
        const message = error.message || 'Unknown error occurred';
        Utils.UIUtils.showMessage(`Có lỗi khi khởi tạo module giao dịch: ${message}`, 'error');
        
        // Attempt basic functionality
        try {
            this.initializeElements();
            this.isInitialized = true;
        } catch (fallbackError) {
            console.error('❌ Critical initialization failure:', fallbackError);
        }
    }

    /**
     * Initialize DOM elements with comprehensive validation
     */
    initializeElements() {
        const elementIds = {
            // Form elements
            form: 'transaction-form',
            categorySelect: 'category-select',
            accountFrom: 'account-from',
            accountTo: 'account-to',
            toAccountRow: 'to-account-row',
            categoryRow: 'category-row',
            amountInput: 'amount-input',
            currencySelector: 'currency-selector',
            descriptionInput: 'description-input',
            datetimeInput: 'datetime-input',
            submitBtn: 'submit-btn',
            addZerosBtn: 'add-zeros-btn',
            descriptionSuggestions: 'description-suggestions',
            
            // Filter elements
            filterPeriod: 'filter-period',
            filterDate: 'filter-date',
            
            // List elements
            transactionList: 'transaction-list',
            noTransactions: 'no-transactions',
            
            // Suggestion elements
            suggestionArea: 'suggestion-area',
            suggestionDesc: 'suggestion-desc',
            suggestionAmount: 'suggestion-amount',
            applySuggestion: 'apply-suggestion',
            dismissSuggestion: 'dismiss-suggestion'
        };

        // Initialize elements
        Object.entries(elementIds).forEach(([key, id]) => {
            this.elements[key] = document.getElementById(id);
            if (!this.elements[key] && this.isCriticalElement(key)) {
                console.error(`Critical element missing: ${key} (${id})`);
            }
        });

        // Special handling for radio buttons
        this.elements.typeRadios = document.querySelectorAll('input[name="type"]');
        
        // Validate critical elements
        this.validateCriticalElements();
    }

    /**
     * Check if an element is critical for module functionality
     */
    isCriticalElement(key) {
        const criticalElements = ['form', 'amountInput', 'transactionList', 'submitBtn'];
        return criticalElements.includes(key);
    }

    /**
     * Validate that all critical elements exist
     */
    validateCriticalElements() {
        const criticalElements = ['form', 'amountInput', 'transactionList'];
        const missingElements = criticalElements.filter(key => !this.elements[key]);
        
        if (missingElements.length > 0) {
            throw new Error(`Critical elements missing: ${missingElements.join(', ')}`);
        }
    }

    /**
     * Initialize debounced functions for performance
     */
    initializeDebouncedFunctions() {
        if (!Utils?.UIUtils?.debounce) {
            console.warn('Debounce utility not available, using timeout fallback');
            this.createFallbackDebounce();
            return;
        }

        this.debouncedFunctions = {
            renderList: Utils.UIUtils.debounce(() => this.renderTransactionList(), 300),
            checkSuggestions: Utils.UIUtils.debounce(() => this.checkSuggestions(), 500),
            populateDescriptionSuggestions: Utils.UIUtils.debounce(() => this.populateDescriptionSuggestions(), 300)
        };
    }

    /**
     * Fallback debounce implementation
     */
    createFallbackDebounce() {
        const debounce = (func, wait) => {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        };

        this.debouncedFunctions = {
            renderList: debounce(() => this.renderTransactionList(), 300),
            checkSuggestions: debounce(() => this.checkSuggestions(), 500),
            populateDescriptionSuggestions: debounce(() => this.populateDescriptionSuggestions(), 300)
        };
    }

    /**
     * Initialize form functionality with proper cleanup tracking
     */
    async initializeForm() {
        if (!this.elements.form) {
            throw new Error('Form element not found');
        }

        try {
            // Form submission
            this.addEventListenerSafe(this.elements.form, 'submit', (e) => {
                e.preventDefault();
                this.handleSubmit();
            });

            // Transaction type change
            this.elements.typeRadios.forEach(radio => {
                this.addEventListenerSafe(radio, 'change', () => {
                    this.handleTypeChange(radio.value);
                });
            });

            // Category change for suggestions
            if (this.elements.categorySelect) {
                this.addEventListenerSafe(this.elements.categorySelect, 'change', () => {
                    this.debouncedFunctions.checkSuggestions();
                });
            }

            // Description input for suggestions
            if (this.elements.descriptionInput) {
                this.addEventListenerSafe(this.elements.descriptionInput, 'input', () => {
                    this.debouncedFunctions.checkSuggestions();
                    this.debouncedFunctions.populateDescriptionSuggestions();
                });
            }

            // Amount input formatting
            if (this.elements.amountInput) {
                this.addEventListenerSafe(this.elements.amountInput, 'input', (e) => {
                    this.handleAmountInput(e);
                });
            }

            // Currency selector change
            if (this.elements.currencySelector) {
                this.addEventListenerSafe(this.elements.currencySelector, 'change', () => {
                    this.handleCurrencyChange();
                });
            }

            // Set default datetime
            this.setDefaultDateTime();
            
            // Load last transaction type and setup form
            await this.setupInitialFormState();

        } catch (error) {
            console.error('Error initializing form:', error);
            throw error;
        }
    }

    /**
     * Safely add event listener with cleanup tracking
     */
    addEventListenerSafe(element, event, handler) {
        if (!element || typeof element.addEventListener !== 'function') {
            console.warn('Invalid element for event listener:', element);
            return;
        }

        element.addEventListener(event, handler);
        this.eventListeners.push({ element, event, handler });
    }

    /**
     * Handle transaction type change
     */
    handleTypeChange(value) {
        console.log('🔄 Transaction type changed to:', value);
        
        if (this.editingTransactionId) {
            this.updateFormVisibility();
            this.populateCategories();
            return;
        }
        
        // Save preference only when not editing
        this.saveTransactionTypePreference(value);
        
        this.updateFormVisibility();
        this.populateCategories();
        this.debouncedFunctions.checkSuggestions();
    }

    /**
     * Save transaction type preference
     */
    saveTransactionTypePreference(type) {
        try {
            localStorage.setItem('lastTransactionType', type);
        } catch (error) {
            console.warn('Could not save transaction type preference:', error);
        }
    }

    /**
     * Handle amount input formatting
     */
    handleAmountInput(e) {
        try {
            if (Utils?.UIUtils?.formatAmountInputWithCursor) {
                Utils.UIUtils.formatAmountInputWithCursor(e.target, e.target.value);
            }
            this.debouncedFunctions.checkSuggestions();
        } catch (error) {
            console.error('Error formatting amount input:', error);
        }
    }

    /**
     * Handle currency change
     */
    handleCurrencyChange() {
        try {
            if (this.elements.amountInput && Utils?.CurrencyUtils) {
                const currentAmount = Utils.CurrencyUtils.parseAmountInput(
                    this.elements.amountInput.value, 
                    'VND'
                );
                this.elements.amountInput.value = Utils.CurrencyUtils.formatAmountInput(currentAmount);
            }
            this.debouncedFunctions.checkSuggestions();
        } catch (error) {
            console.error('Error handling currency change:', error);
        }
    }

    /**
     * Set default datetime
     */
    setDefaultDateTime() {
        if (this.elements.datetimeInput && Utils?.DateUtils) {
            try {
                this.elements.datetimeInput.value = Utils.DateUtils.formatDateTimeLocal();
            } catch (error) {
                console.error('Error setting default datetime:', error);
                // Fallback to current datetime
                const now = new Date();
                const formatted = now.toISOString().slice(0, 16);
                this.elements.datetimeInput.value = formatted;
            }
        }
    }

    /**
     * Setup initial form state
     */
    async setupInitialFormState() {
        this.loadLastTransactionTypeQuiet();
        this.updateFormVisibility();
        
        // Small delay to ensure DOM is ready
        await new Promise(resolve => setTimeout(resolve, 50));
        this.populateCategories();
    }

    /**
     * Initialize smart reset toggle
     */
    initializeSmartResetToggle() {
        const smartResetCheckbox = document.getElementById('smart-reset-enabled');
        if (!smartResetCheckbox) {
            console.warn('Smart reset checkbox not found');
            return;
        }

        try {
            // Load saved preference
            const saved = localStorage.getItem('smartResetEnabled');
            this.smartResetEnabled = saved !== null ? JSON.parse(saved) : true;
            smartResetCheckbox.checked = this.smartResetEnabled;
            
            // Listen for changes
            this.addEventListenerSafe(smartResetCheckbox, 'change', () => {
                this.handleSmartResetToggle(smartResetCheckbox);
            });
            
        } catch (error) {
            console.error('Error initializing smart reset toggle:', error);
            this.smartResetEnabled = true; // Default fallback
        }
    }

    /**
     * Handle smart reset toggle change
     */
    handleSmartResetToggle(checkbox) {
        try {
            this.smartResetEnabled = checkbox.checked;
            localStorage.setItem('smartResetEnabled', JSON.stringify(this.smartResetEnabled));
            console.log('🎯 Smart reset preference updated:', this.smartResetEnabled);
            
            // Visual feedback
            this.showToggleFeedback(checkbox);
            
            // User notification
            const message = this.smartResetEnabled 
                ? '✅ Sẽ giữ hạng mục & tài khoản sau khi thêm'
                : '🔄 Sẽ reset toàn bộ form sau khi thêm';
            
            Utils.UIUtils.showMessage(message, 'info', 2000);
            
        } catch (error) {
            console.error('Error handling smart reset toggle:', error);
        }
    }

    /**
     * Show visual feedback for toggle change
     */
    showToggleFeedback(checkbox) {
        try {
            const option = checkbox.closest('.smart-reset-option');
            if (option) {
                option.classList.add('toggle-feedback');
                setTimeout(() => option.classList.remove('toggle-feedback'), 300);
            }
        } catch (error) {
            console.error('Error showing toggle feedback:', error);
        }
    }

    /**
     * Load last transaction type without triggering events
     */
    loadLastTransactionTypeQuiet() {
        try {
            const lastType = localStorage.getItem('lastTransactionType') || 'Chi';
            console.log('📋 Loading last transaction type quietly:', lastType);
            
            // Temporarily remove event listeners
            const handlers = this.temporarilyRemoveTypeHandlers();
            
            // Set the radio button
            const lastTypeRadio = document.querySelector(`input[name="type"][value="${lastType}"]`);
            if (lastTypeRadio) {
                lastTypeRadio.checked = true;
                console.log('✅ Set last transaction type quietly:', lastType);
            } else {
                const defaultRadio = document.querySelector(`input[name="type"][value="Chi"]`);
                if (defaultRadio) {
                    defaultRadio.checked = true;
                }
            }
            
            // Restore event listeners
            this.restoreTypeHandlers(handlers);
            
        } catch (error) {
            console.error('Error loading last transaction type quietly:', error);
        }
    }

    /**
     * Temporarily remove type radio handlers
     */
    temporarilyRemoveTypeHandlers() {
        const handlers = [];
        this.elements.typeRadios.forEach((radio, index) => {
            const listener = this.eventListeners.find(l => l.element === radio && l.event === 'change');
            if (listener) {
                handlers[index] = listener.handler;
                radio.removeEventListener('change', listener.handler);
            }
        });
        return handlers;
    }

    /**
     * Restore type radio handlers
     */
    restoreTypeHandlers(handlers) {
        this.elements.typeRadios.forEach((radio, index) => {
            if (handlers[index]) {
                radio.addEventListener('change', handlers[index]);
            }
        });
    }

    /**
     * Initialize filters
     */
    initializeFilters() {
        try {
            if (this.elements.filterPeriod) {
                this.addEventListenerSafe(this.elements.filterPeriod, 'change', () => {
                    this.handleFilterPeriodChange();
                });
            }

            if (this.elements.filterDate) {
                this.addEventListenerSafe(this.elements.filterDate, 'change', () => {
                    this.handleFilterDateChange();
                });
                
                // Hide date input initially if not custom
                if (this.elements.filterPeriod && this.elements.filterPeriod.value !== 'custom') {
                    this.elements.filterDate.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Error initializing filters:', error);
        }
    }

    /**
     * Handle filter period change
     */
    handleFilterPeriodChange() {
        this.currentFilter.period = this.elements.filterPeriod.value;
        
        if (this.currentFilter.period !== 'custom') {
            this.currentFilter.date = null;
            if (this.elements.filterDate) {
                this.elements.filterDate.value = '';
                this.elements.filterDate.style.display = 'none';
            }
        } else if (this.elements.filterDate) {
            this.elements.filterDate.style.display = 'block';
        }
        
        this.debouncedFunctions.renderList();
    }

    /**
     * Handle filter date change
     */
    handleFilterDateChange() {
        this.currentFilter.date = this.elements.filterDate.value;
        
        if (this.currentFilter.date) {
            this.currentFilter.period = 'custom';
            if (this.elements.filterPeriod) {
                this.elements.filterPeriod.value = 'custom';
            }
        }
        
        this.debouncedFunctions.renderList();
    }

    /**
     * Initialize suggestions
     */
    initializeSuggestions() {
        try {
            if (this.elements.applySuggestion) {
                this.addEventListenerSafe(this.elements.applySuggestion, 'click', () => {
                    this.applySuggestion();
                });
            }

            if (this.elements.dismissSuggestion) {
                this.addEventListenerSafe(this.elements.dismissSuggestion, 'click', () => {
                    this.hideSuggestions();
                });
            }
        } catch (error) {
            console.error('Error initializing suggestions:', error);
        }
    }

    /**
     * Update form visibility based on transaction type
     */
    updateFormVisibility() {
        const selectedType = document.querySelector('input[name="type"]:checked')?.value;
        console.log('🔧 Updating form visibility for type:', selectedType);

        if (!selectedType) return;

        try {
            // Toggle account/category rows
            this.toggleElement(this.elements.toAccountRow, selectedType === 'Transfer');
            this.toggleElement(this.elements.categoryRow, selectedType !== 'Transfer');

            // Update category requirement
            this.updateCategoryRequirement(selectedType);

            // Update submit button
            this.updateSubmitButton(selectedType);

            // Update account label
            this.updateAccountLabel(selectedType);

            // Populate accounts if transfer
            if (selectedType === 'Transfer' && typeof this.populateAccounts === 'function') {
                this.populateAccounts();
            }
        } catch (error) {
            console.error('Error updating form visibility:', error);
        }
    }

    /**
     * Toggle element visibility
     */
    toggleElement(element, show) {
        if (element) {
            element.style.display = show ? 'flex' : 'none';
        }
    }

    /**
     * Update category requirement
     */
    updateCategoryRequirement(selectedType) {
        if (this.elements.categorySelect) {
            if (selectedType === 'Transfer') {
                this.elements.categorySelect.removeAttribute('required');
            } else {
                this.elements.categorySelect.setAttribute('required', 'required');
            }
        }
    }

    /**
     * Update submit button text and icon
     */
    updateSubmitButton(selectedType) {
        if (!this.elements.submitBtn) return;

        const btnText = this.elements.submitBtn.querySelector('.btn-text');
        const btnIcon = this.elements.submitBtn.querySelector('.btn-icon');
        
        if (btnText) {
            btnText.textContent = selectedType === 'Transfer' ? 'Thêm Chuyển Khoản' : 'Thêm Giao Dịch';
        }
        
        if (btnIcon) {
            btnIcon.textContent = selectedType === 'Transfer' ? '↔️' : '➕';
        }
    }

    /**
     * Update account label
     */
    updateAccountLabel(selectedType) {
        const accountFromLabel = document.getElementById('account-from-label');
        if (accountFromLabel) {
            accountFromLabel.textContent = selectedType === 'Transfer' ? 'Từ tài khoản' : 'Tài khoản';
        }
    }

    /**
     * Populate all dropdowns
     */
    populateDropdowns() {
        console.log('🔄 Populating dropdowns...');
        try {
            this.populateCategories();
            this.populateAccounts();
            this.populateDescriptionSuggestions();
        } catch (error) {
            console.error('Error populating dropdowns:', error);
        }
    }

    /**
     * Populate categories based on transaction type
     */
    populateCategories() {
        if (!this.elements.categorySelect || !this.app) {
            console.error('❌ Category select element or app not found');
            return;
        }

        const selectedType = document.querySelector('input[name="type"]:checked')?.value;
        console.log('📋 PopulateCategories called - selectedType:', selectedType);
        
        if (!selectedType) {
            console.warn('⚠️ No transaction type selected');
            return;
        }

        try {
            let categories = [];

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

            // Clear and populate
            this.elements.categorySelect.innerHTML = '<option value="">Chọn hạng mục...</option>';
            
            if (categories.length === 0) {
                console.warn('⚠️ No categories found for type:', selectedType);
                this.elements.categorySelect.innerHTML += '<option value="" disabled>Không có danh mục</option>';
                return;
            }

            let addedCount = 0;
            categories.forEach((cat, index) => {
                if (this.isValidCategory(cat)) {
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
        } catch (error) {
            console.error('Error populating categories:', error);
        }
    }

    /**
     * Validate category object
     */
    isValidCategory(cat) {
        return cat && 
               typeof cat === 'object' && 
               cat.value && 
               cat.text && 
               typeof cat.value === 'string' && 
               typeof cat.text === 'string';
    }

    /**
     * Populate accounts dropdown
     */
    populateAccounts() {
        if (!this.elements.accountFrom || !this.app) return;

        try {
            const accounts = this.app.data.accounts || [];
            console.log('🏦 Populating accounts:', accounts.length);

            // Clear existing options
            this.elements.accountFrom.innerHTML = '<option value="">Chọn tài khoản...</option>';
            if (this.elements.accountTo) {
                this.elements.accountTo.innerHTML = '<option value="">Chọn tài khoản nhận...</option>';
            }

            // Add account options
            accounts.forEach(acc => {
                if (this.isValidAccount(acc)) {
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
        } catch (error) {
            console.error('Error populating accounts:', error);
        }
    }

    /**
     * Validate account object
     */
    isValidAccount(acc) {
        return acc && 
               typeof acc === 'object' && 
               acc.value && 
               acc.text && 
               typeof acc.value === 'string' && 
               typeof acc.text === 'string';
    }

    /**
     * Populate description suggestions
     */
    populateDescriptionSuggestions() {
        if (!this.elements.descriptionSuggestions || !this.app?.data?.transactions) return;

        try {
            const recentDescriptions = new Set();
            
            this.app.data.transactions
                .slice(0, 50)
                .filter(tx => tx && tx.description && typeof tx.description === 'string')
                .forEach(tx => recentDescriptions.add(tx.description));

            this.elements.descriptionSuggestions.innerHTML = '';
            
            recentDescriptions.forEach(desc => {
                const option = document.createElement('option');
                option.value = desc;
                this.elements.descriptionSuggestions.appendChild(option);
            });
        } catch (error) {
            console.error('Error populating description suggestions:', error);
        }
    }

    /**
     * Handle form submission with improved state management
     */
    async handleSubmit() {
        console.log('🚀 Form submission started');
        
        try {
            // Get current form state
            const currentState = this.getCurrentFormState();
            console.log('📝 Current form state:', currentState);

            // Extract and validate form data
            const formData = this.getFormData();
            console.log('📋 Form data extracted:', formData);

            // Validate form data
            const validation = await this.validateFormData(formData);
            if (!validation.isValid) {
                this.handleValidationError(validation);
                return;
            }

            // Process transaction
            await this.processTransaction(formData, currentState);

        } catch (error) {
            console.error('💥 Error submitting transaction:', error);
            Utils.UIUtils.showMessage(`Có lỗi xảy ra: ${error.message}`, 'error');
        }
    }

    /**
     * Get current form state for preservation
     */
    getCurrentFormState() {
        const selectedTypeRadio = document.querySelector('input[name="type"]:checked');
        return {
            type: selectedTypeRadio?.value,
            category: this.elements.categorySelect?.value,
            account: this.elements.accountFrom?.value,
            currency: this.elements.currencySelector?.value
        };
    }

    /**
     * Validate form data
     */
    async validateFormData(formData) {
        // Basic validation
        const basicValidation = Utils.ValidationUtils.validateTransaction(formData);
        console.log('🔍 Basic validation result:', basicValidation);
        
        if (!basicValidation.isValid) {
            return basicValidation;
        }

        // Business rules validation
        const businessValidation = this.validateBusinessRules(formData);
        console.log('🔍 Business validation result:', businessValidation);
        
        return businessValidation;
    }

    /**
     * Handle validation errors
     */
    handleValidationError(validation) {
        const errorMessage = validation.errors?.[0] || validation.error || 'Validation failed';
        console.error('❌ Validation failed:', errorMessage);
        Utils.UIUtils.showMessage(errorMessage, 'error');
        this.focusFirstErrorField(errorMessage);
    }

    /**
     * Process transaction (add or update)
     */
    async processTransaction(formData, currentState) {
        if (this.editingTransactionId) {
            await this.updateTransaction(formData);
        } else {
            await this.addTransaction(formData, currentState);
        }
    }

    /**
     * Update existing transaction
     */
    async updateTransaction(formData) {
        console.log('📝 Updating existing transaction:', this.editingTransactionId);
        
        const updated = this.app.updateTransaction(this.editingTransactionId, formData);
        if (updated) {
            Utils.UIUtils.showMessage('Giao dịch đã được cập nhật', 'success');
            this.exitEditMode();
            await this.refreshAfterUpdate();
        } else {
            throw new Error('Failed to update transaction');
        }
    }

    /**
     * Add new transaction
     */
    async addTransaction(formData, currentState) {
        console.log('➕ Adding new transaction');
        
        const added = this.app.addTransaction(formData);
        if (added) {
            const message = formData.type === 'Transfer'
                ? 'Giao dịch chuyển tiền đã được thêm'
                : 'Giao dịch đã được thêm';
            Utils.UIUtils.showMessage(message, 'success');
            console.log('✅ Transaction added successfully');
            
            // Handle post-add actions
            await this.handlePostAddActions(currentState);
        } else {
            throw new Error('Failed to add transaction');
        }
    }

    /**
     * Handle actions after adding transaction
     */
    async handlePostAddActions(currentState) {
        // Refresh data
        await this.refreshAfterUpdate();
        
        // Handle form reset based on smart reset setting
        if (this.smartResetEnabled && currentState.type) {
            await this.smartResetWithPreservation(currentState);
        } else {
            this.resetForm(true);
        }
    }

    /**
     * Smart reset with state preservation
     */
    async smartResetWithPreservation(preservedState) {
        try {
            console.log('🎯 Smart reset with preservation:', preservedState);

            // Clear fields that should be reset
            this.clearResettableFields();

            // Schedule state restoration after UI updates
            this.scheduleStateRestoration(preservedState);

        } catch (error) {
            console.error('Error in smart reset with preservation:', error);
            this.resetForm(true); // Fallback to full reset
        }
    }

    /**
     * Clear fields that should be reset in smart mode
     */
    clearResettableFields() {
        if (this.elements.amountInput) {
            this.elements.amountInput.value = '';
            this.elements.amountInput.classList.remove('input-valid', 'input-invalid');
        }

        if (this.elements.descriptionInput) {
            this.elements.descriptionInput.value = '';
        }

        this.setDefaultDateTime();
        this.hideSuggestions();
    }

    /**
     * Schedule state restoration after UI updates
     */
    scheduleStateRestoration(preservedState) {
        // Store the state for restoration
        this.pendingStateRestore = preservedState;

        // Use requestAnimationFrame for better timing
        requestAnimationFrame(() => {
            setTimeout(() => {
                this.restorePreservedState();
            }, 300);
        });
    }

    /**
     * Restore preserved state
     */
    async restorePreservedState() {
        if (!this.pendingStateRestore) {
            console.warn('No pending state to restore');
            return;
        }

        const preservedState = this.pendingStateRestore;
        this.pendingStateRestore = null;

        console.log('Restoring preserved state:', preservedState);

        try {
            // Restore transaction type first
            if (preservedState.type) {
                await this.restoreTransactionType(preservedState.type);
            }

            // Small delay to let type change complete
            await new Promise(resolve => setTimeout(resolve, 150));

            // Restore other fields
            await this.restoreFormFields(preservedState);

            // Show feedback and focus
            this.showSmartResetFeedback();
            this.focusAmountInput();

            console.log('✅ State restoration completed');

        } catch (error) {
            console.error('Error restoring preserved state:', error);
        }
    }

    /**
     * Restore transaction type
     */
    async restoreTransactionType(type) {
        const typeRadio = document.querySelector(`input[name="type"][value="${type}"]`);
        if (typeRadio && !typeRadio.checked) {
            typeRadio.checked = true;
            typeRadio.dispatchEvent(new Event('change'));
        }
    }

    /**
     * Restore form fields
     */
    async restoreFormFields(preservedState) {
        // Restore category
        if (preservedState.category && this.elements.categorySelect) {
            await this.restoreSelectValue(this.elements.categorySelect, preservedState.category, 'category');
        }

        // Restore account
        if (preservedState.account && this.elements.accountFrom) {
            await this.restoreSelectValue(this.elements.accountFrom, preservedState.account, 'account');
        }

        // Restore currency
        if (preservedState.currency && this.elements.currencySelector) {
            await this.restoreSelectValue(this.elements.currencySelector, preservedState.currency, 'currency');
        }
    }

    /**
     * Restore select element value with validation
     */
    async restoreSelectValue(selectElement, value, fieldName) {
        const optionExists = Array.from(selectElement.options).some(opt => opt.value === value);
        
        if (optionExists) {
            selectElement.value = value;
            console.log(`✅ Restored ${fieldName}: ${value}`);
        } else {
            console.warn(`⚠️ Cannot restore ${fieldName} "${value}" - option no longer exists`);
        }
    }

    /**
     * Focus amount input for next entry
     */
    focusAmountInput() {
        setTimeout(() => {
            if (this.elements.amountInput) {
                this.elements.amountInput.focus();
                this.elements.amountInput.placeholder = 'Nhập số tiền...';
            }
        }, 100);
    }

    /**
     * Refresh after update
     */
    async refreshAfterUpdate() {
        this.renderTransactionList();
        if (this.app.refreshAllModules) {
            this.app.refreshAllModules();
        }
    }

    /**
     * Show smart reset feedback
     */
    showSmartResetFeedback() {
        try {
            // Highlight preserved fields
            const preservedFields = [
                this.elements.categorySelect,
                this.elements.accountFrom,
                document.querySelector('input[name="type"]:checked')
            ].filter(Boolean);
            
            this.highlightPreservedFields(preservedFields);
            this.showSmartResetNotification();
            
        } catch (error) {
            console.error('Error showing smart reset feedback:', error);
        }
    }

    /**
     * Highlight preserved fields
     */
    highlightPreservedFields(fields) {
        fields.forEach(field => {
            if (field) {
                field.style.transition = 'all 0.3s ease';
                field.style.boxShadow = '0 0 0 2px rgba(16, 185, 129, 0.4)';
                field.style.borderColor = '#10b981';
                
                setTimeout(() => {
                    field.style.boxShadow = '';
                    field.style.borderColor = '';
                }, 1000);
            }
        });
    }

    /**
     * Show smart reset notification
     */
    showSmartResetNotification() {
        const notification = document.createElement('div');
        notification.innerHTML = `
            <div style="
                position: fixed;
                top: 80px;
                right: 20px;
                background: #10b981;
                color: white;
                padding: 0.5rem 1rem;
                border-radius: 8px;
                font-size: 0.875rem;
                font-weight: 500;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                z-index: 1000;
                animation: slideInRight 0.3s ease;
            ">
                🎯 Đã giữ hạng mục & tài khoản
            </div>
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
    }

    /**
     * Business rules validation
     */
    validateBusinessRules(data) {
        console.log('🔍 Validating business rules for:', data);
        
        try {
            // Validate account existence
            if (!this.accountExists(data.account)) {
                console.error('❌ Account does not exist:', data.account);
                return { isValid: false, error: 'Tài khoản nguồn không tồn tại' };
            }

            // Transfer-specific validation
            if (data.type === 'Transfer') {
                const transferValidation = this.validateTransferRules(data);
                if (!transferValidation.isValid) {
                    return transferValidation;
                }
            } else {
                // Category validation for non-transfer transactions
                const categoryValidation = this.validateCategoryRules(data);
                if (!categoryValidation.isValid) {
                    return categoryValidation;
                }
            }

            // Amount validation
            const amountValidation = this.validateAmountRules(data);
            if (!amountValidation.isValid) {
                return amountValidation;
            }

            // Date validation
            const dateValidation = this.validateDateRules(data);
            if (!dateValidation.isValid) {
                return dateValidation;
            }

            console.log('✅ Business rules validation passed');
            return { isValid: true };
            
        } catch (error) {
            console.error('💥 Error validating business rules:', error);
            return { isValid: false, error: 'Lỗi khi kiểm tra dữ liệu: ' + error.message };
        }
    }

    /**
     * Validate transfer-specific rules
     */
    validateTransferRules(data) {
        if (!this.accountExists(data.toAccount)) {
            console.error('❌ Target account does not exist:', data.toAccount);
            return { isValid: false, error: 'Tài khoản đích không tồn tại' };
        }
        
        if (data.account === data.toAccount) {
            return { isValid: false, error: 'Tài khoản nguồn và đích phải khác nhau' };
        }
        
        return { isValid: true };
    }

    /**
     * Validate category rules
     */
    validateCategoryRules(data) {
        const categoryValid = this.categoryExists(data.category, data.type);
        console.log('🏷️ Category validation:', {
            category: data.category,
            type: data.type,
            valid: categoryValid
        });
        
        if (!categoryValid) {
            console.error('❌ Category does not exist:', data.category, 'for type:', data.type);
            return { 
                isValid: false, 
                error: `Danh mục "${data.category}" không tồn tại cho loại "${data.type}"` 
            };
        }
        
        return { isValid: true };
    }

    /**
     * Validate amount rules
     */
    validateAmountRules(data) {
        if (data.amount > 999999999999) {
            return { isValid: false, error: 'Số tiền quá lớn' };
        }

        if (data.amount <= 0) {
            return { isValid: false, error: 'Số tiền phải lớn hơn 0' };
        }
        
        return { isValid: true };
    }

    /**
     * Validate date rules
     */
    validateDateRules(data) {
        const transactionDate = new Date(data.datetime);
        if (isNaN(transactionDate.getTime())) {
            return { isValid: false, error: 'Ngày giao dịch không hợp lệ' };
        }

        const futureLimit = new Date();
        futureLimit.setFullYear(futureLimit.getFullYear() + 1);

        if (transactionDate > futureLimit) {
            return { isValid: false, error: 'Ngày giao dịch không được quá 1 năm trong tương lai' };
        }
        
        return { isValid: true };
    }

    /**
     * Check if account exists
     */
    accountExists(accountValue) {
        if (!this.app?.data?.accounts || !Array.isArray(this.app.data.accounts)) {
            return false;
        }
        return this.app.data.accounts.some(acc => acc && acc.value === accountValue);
    }

    /**
     * Check if category exists for transaction type
     */
    categoryExists(categoryValue, transactionType) {
        if (!this.app?.data) return false;

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
     * Focus first error field
     */
    focusFirstErrorField(errorMessage) {
        try {
            const fieldMap = {
                'số tiền': this.elements.amountInput,
                'tài khoản': this.elements.accountFrom,
                'hạng mục': this.elements.categorySelect,
                'ngày': this.elements.datetimeInput
            };

            for (const [keyword, element] of Object.entries(fieldMap)) {
                if (errorMessage.includes(keyword) && element) {
                    element.focus();
                    break;
                }
            }
        } catch (error) {
            console.error('Error focusing error field:', error);
        }
    }

    /**
     * Get form data with validation
     */
    getFormData() {
        const selectedTypeRadio = document.querySelector('input[name="type"]:checked');

        if (!selectedTypeRadio) {
            throw new Error('Vui lòng chọn loại giao dịch');
        }

        // Validate required fields
        this.validateRequiredFields();

        const selectedType = selectedTypeRadio.value;
        const amount = this.parseAndValidateAmount();

        // Build base data object
        const data = {
            type: selectedType,
            datetime: this.elements.datetimeInput.value,
            amount: amount,
            account: this.elements.accountFrom.value,
            description: this.sanitizeDescription(this.elements.descriptionInput?.value || ''),
            originalAmount: parseFloat(this.elements.amountInput.value.replace(/[^\d.]/g, '')) || amount,
            originalCurrency: this.elements.currencySelector?.value || 'VND'
        };

        // Add type-specific fields
        if (selectedType === 'Transfer') {
            this.addTransferFields(data);
        } else {
            this.addCategoryFields(data);
        }

        return data;
    }

    /**
     * Validate required fields
     */
    validateRequiredFields() {
        const requiredFields = [
            { element: this.elements.amountInput, message: 'Vui lòng nhập số tiền' },
            { element: this.elements.accountFrom, message: 'Vui lòng chọn tài khoản' },
            { element: this.elements.datetimeInput, message: 'Vui lòng chọn ngày và giờ' }
        ];

        for (const field of requiredFields) {
            if (!field.element || !field.element.value) {
                throw new Error(field.message);
            }
        }
    }

    /**
     * Parse and validate amount
     */
    parseAndValidateAmount() {
        if (!Utils?.CurrencyUtils) {
            throw new Error('Currency utilities not available');
        }

        const amount = Utils.CurrencyUtils.parseAmountInput(
            this.elements.amountInput.value,
            this.elements.currencySelector?.value || 'VND'
        );

        if (isNaN(amount) || amount <= 0) {
            throw new Error('Số tiền không hợp lệ');
        }

        return amount;
    }

    /**
     * Add transfer-specific fields
     */
    addTransferFields(data) {
        if (!this.elements.accountTo || !this.elements.accountTo.value) {
            throw new Error('Vui lòng chọn tài khoản đích');
        }
        data.toAccount = this.elements.accountTo.value;
    }

    /**
     * Add category fields
     */
    addCategoryFields(data) {
        if (!this.elements.categorySelect || !this.elements.categorySelect.value) {
            throw new Error('Vui lòng chọn hạng mục');
        }
        data.category = this.elements.categorySelect.value;
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
     * Reset form with options
     */
    resetForm(fullReset = false) {
        try {
            if (fullReset) {
                this.performFullReset();
            } else {
                this.performPartialReset();
            }
            
            this.hideSuggestions();
            this.focusAmountInput();
            
            console.log(`✅ Form reset ${fullReset ? 'completely' : 'partially'}`);
        } catch (error) {
            console.error('Error resetting form:', error);
        }
    }

    /**
     * Perform full form reset
     */
    performFullReset() {
        console.log('🔄 Performing FULL reset');
        
        this.elements.form.reset();
        this.editingTransactionId = null;
        
        this.updateSubmitButtonToDefault();
        this.loadLastTransactionTypeQuiet();
        this.updateFormVisibility();
        this.populateCategories();
        this.setDefaultDateTime();
    }

    /**
     * Perform partial form reset
     */
    performPartialReset() {
        console.log('🔄 Performing PARTIAL reset (amount, description, datetime)');
        
        this.clearResettableFields();
        console.log('✅ Kept transaction type, category, account for quick entry');
    }

    /**
     * Update submit button to default state
     */
    updateSubmitButtonToDefault() {
        const btnText = this.elements.submitBtn?.querySelector('.btn-text');
        const btnIcon = this.elements.submitBtn?.querySelector('.btn-icon');
        
        if (btnText) btnText.textContent = 'Thêm Giao Dịch';
        if (btnIcon) btnIcon.textContent = '➕';
    }

    /**
     * Render transaction list with performance optimization
     */
    renderTransactionList() {
        const startTime = performance.now();

        try {
            if (!this.validateRenderElements()) {
                return;
            }

            const filteredTransactions = this.getFilteredTransactions();
            if (!Array.isArray(filteredTransactions)) {
                this.showNoTransactions('Có lỗi khi tải dữ liệu giao dịch');
                return;
            }

            if (filteredTransactions.length === 0) {
                this.showNoTransactions();
                return;
            }

            this.renderTransactionItems(filteredTransactions);
            this.trackRenderPerformance(startTime, filteredTransactions.length);

        } catch (error) {
            console.error('Error rendering transaction list:', error);
            this.showNoTransactions('Có lỗi khi hiển thị danh sách giao dịch');
        }
    }

    /**
     * Validate render elements
     */
    validateRenderElements() {
        if (!this.elements.transactionList || !this.elements.noTransactions) {
            console.warn('Transaction list elements not found');
            return false;
        }
        return true;
    }

    /**
     * Get filtered transactions
     */
    getFilteredTransactions() {
        const filters = {
            period: this.currentFilter.period,
            date: this.currentFilter.date
        };

        const filteredTransactions = this.app.getFilteredTransactions(filters);
        
        // Sort by date (newest first)
        filteredTransactions.sort((a, b) => {
            try {
                return new Date(b.datetime) - new Date(a.datetime);
            } catch (error) {
                console.warn('Error sorting transactions by date:', error);
                return 0;
            }
        });

        return filteredTransactions;
    }

    /**
     * Render transaction items
     */
    renderTransactionItems(transactions) {
        this.elements.transactionList.style.display = 'block';
        this.elements.noTransactions.style.display = 'none';

        const maxInitialRender = 50;
        const transactionsToRender = transactions.slice(0, maxInitialRender);

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

        if (transactions.length > maxInitialRender) {
            this.showLoadMoreButton(transactions, maxInitialRender);
        }
    }

    /**
     * Track render performance
     */
    trackRenderPerformance(startTime, itemCount) {
        const renderTime = performance.now() - startTime;
        this.renderCount++;
        this.lastRenderTime = renderTime;

        if (renderTime > 100) {
            console.warn(`Slow transaction list render: ${renderTime}ms for ${itemCount} items`);
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

            const message = customMessage || 'Chưa có giao dịch nào';
            const icon = customMessage ? '⚠️' : '📝';

            this.elements.noTransactions.innerHTML = `
                <div class="no-data">
                    <span class="no-data-icon">${icon}</span>
                    <span class="no-data-text">${message}</span>
                </div>
            `;
        }
    }

    /**
     * Create transaction item with improved safety
     */
    createTransactionItem(transaction) {
        if (!this.isValidTransaction(transaction)) {
            console.warn('Invalid transaction for item creation');
            return null;
        }

        try {
            const item = document.createElement('div');
            item.className = 'transaction-item';
            item.dataset.transactionId = transaction.id;

            const typeClass = this.getTransactionTypeClass(transaction);
            const content = this.buildTransactionItemContent(transaction, typeClass);
            
            item.innerHTML = content;
            return item;

        } catch (error) {
            console.error('Error creating transaction item:', error);
            return null;
        }
    }

    /**
     * Validate transaction object
     */
    isValidTransaction(transaction) {
        return transaction && 
               transaction.id && 
               typeof transaction.id === 'string' &&
               transaction.type &&
               transaction.datetime;
    }

    /**
     * Get transaction type class
     */
    getTransactionTypeClass(transaction) {
        if (transaction.type === 'Thu') return 'income';
        if (transaction.type === 'Chi' && !transaction.isTransfer) return 'expense';
        return 'transfer';
    }

    /**
     * Build transaction item content
     */
    buildTransactionItemContent(transaction, typeClass) {
        const icon = this.getTransactionIcon(transaction);
        const accountDisplay = this.getAccountDisplay(transaction);
        const amountDisplay = this.getAmountDisplay(transaction);
        const description = this.escapeHtml(transaction.description || 'Không có mô tả');
        const categoryDisplay = this.getCategoryDisplay(transaction);
        const compactDateTime = this.getCompactDateTime(transaction);

        return `
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
    }

    /**
     * Get account display text
     */
    getAccountDisplay(transaction) {
        const accountName = this.getAccountName(transaction.account);

        if (transaction.isTransfer) {
            const pairTransaction = transaction.transferPairId ? 
                this.findTransferPair(transaction) : null;
            
            if (pairTransaction) {
                const pairAccountName = this.getAccountName(pairTransaction.account);
                return transaction.type === 'Chi'
                    ? `${accountName} → ${pairAccountName}`
                    : `${pairAccountName} → ${accountName}`;
            } else {
                return `${accountName} (Lỗi chuyển khoản)`;
            }
        }

        return accountName;
    }

    /**
     * Get amount display text
     */
    getAmountDisplay(transaction) {
        if (!Utils?.CurrencyUtils) {
            return transaction.amount?.toString() || '0';
        }

        let amountDisplay = Utils.CurrencyUtils.formatCurrency(transaction.amount || 0);
        
        if (transaction.originalCurrency === 'USD' && transaction.originalAmount) {
            const originalFormatted = Utils.CurrencyUtils.formatCurrency(
                transaction.originalAmount, 
                'USD'
            );
            amountDisplay += ` <span class="original-amount">(${originalFormatted})</span>`;
        }

        return amountDisplay;
    }

    /**
     * Get category display text
     */
    getCategoryDisplay(transaction) {
        return transaction.isTransfer
            ? this.escapeHtml(transaction.category || 'Chuyển khoản')
            : this.escapeHtml(transaction.category || '');
    }

    /**
     * Get compact date time
     */
    getCompactDateTime(transaction) {
        if (Utils?.DateUtils?.formatCompactDateTime) {
            return Utils.DateUtils.formatCompactDateTime(transaction.datetime);
        }

        // Fallback formatting
        const date = new Date(transaction.datetime);
        return {
            time: date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            date: date.toLocaleDateString('vi-VN')
        };
    }

    /**
     * Get account name from value
     */
    getAccountName(accountValue) {
        if (!this.app?.data?.accounts || !Array.isArray(this.app.data.accounts)) {
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

        if (!this.app?.data?.transactions || !Array.isArray(this.app.data.transactions)) {
            return null;
        }

        return this.app.data.transactions.find(tx => tx && tx.id === transaction.transferPairId);
    }

    /**
     * Escape HTML characters
     */
    escapeHtml(text) {
        if (!text || typeof text !== 'string') return '';

        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Get transaction icon
     */
    getTransactionIcon(transaction) {
        try {
            if (transaction.isTransfer) {
                return transaction.type === 'Chi' ? '➡️' : '⬅️';
            }

            if (transaction.category && Utils?.UIUtils?.getCategoryIcon) {
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
        if (!this.isValidTransactionId(transactionId)) {
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
        if (!this.isValidTransactionId(transactionId)) {
            Utils.UIUtils.showMessage('ID giao dịch không hợp lệ', 'error');
            return;
        }

        try {
            const transaction = this.findTransactionById(transactionId);
            if (!transaction) {
                Utils.UIUtils.showMessage('Không tìm thấy giao dịch', 'error');
                return;
            }

            if (this.confirmDelete(transaction)) {
                this.performDelete(transactionId);
            }
        } catch (error) {
            console.error('Error deleting transaction:', error);
            Utils.UIUtils.showMessage('Có lỗi khi xóa giao dịch', 'error');
        }
    }

    /**
     * Validate transaction ID
     */
    isValidTransactionId(transactionId) {
        return transactionId && typeof transactionId === 'string';
    }

    /**
     * Find transaction by ID
     */
    findTransactionById(transactionId) {
        if (!this.app?.data?.transactions) {
            return null;
        }
        return this.app.data.transactions.find(tx => tx && tx.id === transactionId);
    }

    /**
     * Confirm delete operation
     */
    confirmDelete(transaction) {
        const message = transaction.isTransfer
            ? 'Bạn có chắc chắn muốn xóa giao dịch chuyển tiền này? (Cả giao dịch đi và đến sẽ bị xóa)'
            : 'Bạn có chắc chắn muốn xóa giao dịch này?';

        return confirm(message);
    }

    /**
     * Perform delete operation
     */
    async performDelete(transactionId) {
        if (this.app.deleteTransaction(transactionId)) {
            Utils.UIUtils.showMessage('Đã xóa giao dịch', 'success');
            await this.refreshAfterUpdate();
        } else {
            Utils.UIUtils.showMessage('Không thể xóa giao dịch', 'error');
        }
    }

    /**
     * Enter edit mode
     */
    async enterEditMode(transactionId) {
        if (!this.app?.data?.transactions || !Array.isArray(this.app.data.transactions)) {
            Utils.UIUtils.showMessage('Dữ liệu ứng dụng không hợp lệ', 'error');
            return;
        }

        const transaction = this.findTransactionById(transactionId);
        if (!transaction) {
            Utils.UIUtils.showMessage('Không tìm thấy giao dịch để sửa', 'error');
            return;
        }

        console.log('🔧 Entering edit mode for transaction:', transaction);

        try {
            this.editingTransactionId = transactionId;
            
            const editData = await this.prepareEditData(transaction);
            await this.setEditFormType(editData.type);
            await this.populateEditFields(transaction, editData);
            
        } catch (error) {
            console.error('Error entering edit mode:', error);
            this.editingTransactionId = null;
            Utils.UIUtils.showMessage('Có lỗi khi chuyển sang chế độ chỉnh sửa', 'error');
        }
    }

    /**
     * Prepare edit data
     */
    async prepareEditData(transaction) {
        let editType = transaction.type;
        let editCategory = transaction.category;
        let editFromAccount = transaction.account;
        let editToAccount = null;

        if (transaction.isTransfer) {
            console.log('🔄 Editing transfer transaction');
            
            const pairTransaction = this.findTransferPair(transaction);
            if (!pairTransaction) {
                throw new Error('Transfer pair not found');
            }

            editType = 'Transfer';
            if (transaction.type === 'Chi') {
                editFromAccount = transaction.account;
                editToAccount = pairTransaction.account;
            } else {
                editFromAccount = pairTransaction.account;
                editToAccount = transaction.account;
            }
            
            console.log('🔄 Transfer edit data:', {
                editType, editFromAccount, editToAccount
            });
        }

        return { type: editType, category: editCategory, fromAccount: editFromAccount, toAccount: editToAccount };
    }

    /**
     * Set edit form type
     */
    async setEditFormType(editType) {
        const typeRadio = document.querySelector(`input[name="type"][value="${editType}"]`);
        if (typeRadio) {
            typeRadio.checked = true;
            console.log('✅ Set transaction type to:', editType);
            
            typeRadio.dispatchEvent(new Event('change'));
            
            // Wait for form updates
            await new Promise(resolve => setTimeout(resolve, 100));
        } else {
            throw new Error(`Transaction type radio not found for: ${editType}`);
        }
    }

    /**
     * Populate edit fields
     */
    async populateEditFields(transaction, editData) {
        try {
            console.log('📝 Populating edit fields...');

            // Amount and currency
            if (this.elements.amountInput && Utils?.CurrencyUtils) {
                this.elements.amountInput.value = Utils.CurrencyUtils.formatAmountInput(
                    transaction.originalAmount || transaction.amount
                );
            }
            
            if (this.elements.currencySelector) {
                this.elements.currencySelector.value = transaction.originalCurrency || 'VND';
            }

            // Accounts
            if (this.elements.accountFrom) {
                this.elements.accountFrom.value = editData.fromAccount;
                console.log('✅ Set from account:', editData.fromAccount);
            }

            // Type-specific fields
            const currentType = document.querySelector('input[name="type"]:checked')?.value;
            
            if (currentType === 'Transfer' && editData.toAccount) {
                if (this.elements.accountTo) {
                    this.elements.accountTo.value = editData.toAccount;
                    console.log('✅ Set to account:', editData.toAccount);
                }
            } else if (editData.category) {
                this.populateCategories();
                await new Promise(resolve => setTimeout(resolve, 50));
                if (this.elements.categorySelect) {
                    this.elements.categorySelect.value = editData.category;
                    console.log('✅ Set category:', editData.category);
                }
            }

            // Description and datetime
            if (this.elements.descriptionInput) {
                this.elements.descriptionInput.value = transaction.description || '';
            }
            
            if (this.elements.datetimeInput && Utils?.DateUtils) {
                this.elements.datetimeInput.value = Utils.DateUtils.formatDateTimeLocal(
                    new Date(transaction.datetime)
                );
            }

            // Update UI for edit mode
            this.updateUIForEditMode();

            console.log('✅ Edit mode setup completed');

        } catch (error) {
            console.error('Error populating edit fields:', error);
            throw error;
        }
    }

    /**
     * Update UI for edit mode
     */
    updateUIForEditMode() {
        // Update submit button
        const btnText = this.elements.submitBtn?.querySelector('.btn-text');
        const btnIcon = this.elements.submitBtn?.querySelector('.btn-icon');
        
        if (btnText) btnText.textContent = 'Cập Nhật Giao Dịch';
        if (btnIcon) btnIcon.textContent = '💾';

        // Scroll to form and focus
        this.elements.form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => this.elements.amountInput?.focus(), 200);
    }

    /**
     * Exit edit mode
     */
    exitEditMode() {
        this.resetForm(true);
    }

    /**
     * Show load more button (placeholder implementation)
     */
    showLoadMoreButton(allTransactions, currentCount) {
        // TODO: Implement load more functionality
        console.log(`Showing ${currentCount} of ${allTransactions.length} transactions`);
    }

    /**
     * Apply suggestion (placeholder implementation)
     */
    applySuggestion() {
        // TODO: Implement suggestion application
        console.log('Applying suggestion...');
    }

    /**
     * Hide suggestions
     */
    hideSuggestions() {
        if (this.elements.suggestionArea) {
            this.elements.suggestionArea.style.display = 'none';
            this.suggestionData = null;
        }
    }

    /**
     * Check suggestions (placeholder implementation)
     */
    checkSuggestions() {
        // TODO: Implement suggestion checking
        console.log('Checking suggestions...');
    }

    /**
     * Refresh module
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

    /**
     * Destroy module and clean up resources
     */
    destroy() {
        try {
            // Remove event listeners
            this.eventListeners.forEach(({ element, event, handler }) => {
                if (element && typeof element.removeEventListener === 'function') {
                    element.removeEventListener(event, handler);
                }
            });

            // Clear arrays and objects
            this.eventListeners = [];
            this.debouncedFunctions = {};
            this.elements = {};

            // Reset state
            this.editingTransactionId = null;
            this.suggestionData = null;
            this.pendingStateRestore = null;
            this.currentFilter = { period: 'month', date: null };
            this.isInitialized = false;

            console.log('✅ TransactionsModule destroyed successfully');

        } catch (error) {
            console.error('Error destroying transactions module:', error);
        }
    }
}

// Create global instance
window.TransactionsModule = new TransactionsModule();