/**
 * TRANSACTIONS MODULE - REFINED & ROBUST VERSION
 * Handles transaction form, list, and CRUD operations.
 * Improved Smart Reset functionality and validation.
 * FIXED: Prevent virtual keyboard from appearing after updating a transaction.
 */

class TransactionsModule {
    constructor() {
        this.app = null;
        this.editingTransactionId = null;
        this.currentFilter = { period: 'month', date: null };
        this.smartResetEnabled = true;
        this.elements = {};
        this.isInitialized = false;
    }

    async init(app) {
        if (this.isInitialized) return;
        this.app = app;
        console.log('💳 Initializing Transactions Module...');
        try {
            this.initializeElements();
            await this.initializeForm();
            this.initializeFilters();
            this.initializeSmartResetToggle();

            this.populateDropdowns();
            this.renderTransactionList();
            this.isInitialized = true;
            console.log('✅ Transactions Module initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Transactions Module:', error);
        }
    }

    initializeElements() {
        this.elements = {
            form: document.getElementById('transaction-form'),
            categorySelect: document.getElementById('category-select'),
            accountFrom: document.getElementById('account-from'),
            accountTo: document.getElementById('account-to'),
            toAccountRow: document.getElementById('to-account-row'),
            categoryRow: document.getElementById('category-row'),
            amountInput: document.getElementById('amount-input'),
            descriptionInput: document.getElementById('description-input'),
            datetimeInput: document.getElementById('datetime-input'),
            submitBtn: document.getElementById('submit-btn'),
            descriptionSuggestions: document.getElementById('description-suggestions'),
            filterPeriod: document.getElementById('filter-period'),
            filterDate: document.getElementById('filter-date'),
            transactionList: document.getElementById('transaction-list'),
            noTransactions: document.getElementById('no-transactions'),
            typeRadios: document.querySelectorAll('input[name="type"]'),
        };
    }

    async initializeForm() {
        this.elements.form?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        this.elements.typeRadios.forEach(radio => {
            radio.addEventListener('change', () => this.handleTypeChange(radio.value));
        });

        this.elements.amountInput?.addEventListener('input', (e) => {
             Utils.UIUtils.formatAmountInputWithCursor(e.target, e.target.value);
        });

        this.setDefaultDateTime();
        this.loadLastTransactionType();
        this.updateFormVisibility();
    }

	initializeFilters() {
		this.elements.filterPeriod?.addEventListener('change', () => this.handleFilterChange());
		
		const applyBtn = document.getElementById('filter-apply-button');
		applyBtn?.addEventListener('click', () => this.applyCustomDateFilter());
	}

    initializeSmartResetToggle() {
        const checkbox = document.getElementById('smart-reset-enabled');
        if (!checkbox) return;
        this.smartResetEnabled = localStorage.getItem('smartResetEnabled') !== 'false';
        checkbox.checked = this.smartResetEnabled;
        checkbox.addEventListener('change', () => {
            this.smartResetEnabled = checkbox.checked;
            localStorage.setItem('smartResetEnabled', this.smartResetEnabled);
        });
    }
    
    handleTypeChange(value) {
        if (!this.editingTransactionId) localStorage.setItem('lastTransactionType', value);
        this.updateFormVisibility();
        this.populateCategories();
    }

	handleFilterChange() {
		this.currentFilter.period = this.elements.filterPeriod.value;
		const customPicker = document.getElementById('custom-date-picker-container');

		if (this.currentFilter.period === 'custom') {
			if (customPicker) customPicker.style.display = 'flex';
		} else {
			if (customPicker) customPicker.style.display = 'none';
			this.currentFilter.startDate = null;
			this.currentFilter.endDate = null;
			this.renderTransactionList();
		}
	}
	applyCustomDateFilter() {
		const startDateInput = document.getElementById('filter-start-date');
		const endDateInput = document.getElementById('filter-end-date');

		if (!startDateInput || !endDateInput) return;

		const startDate = startDateInput.value;
		const endDate = endDateInput.value;

		if (!startDate || !endDate) {
			Utils.UIUtils.showMessage('Vui lòng chọn cả ngày bắt đầu và kết thúc.', 'error');
			return;
		}

		if (new Date(startDate) > new Date(endDate)) {
			Utils.UIUtils.showMessage('Ngày bắt đầu không thể sau ngày kết thúc.', 'error');
			return;
		}

		this.currentFilter.startDate = new Date(startDate);
		this.currentFilter.endDate = new Date(endDate);
		this.currentFilter.endDate.setHours(23, 59, 59, 999);
		
		this.renderTransactionList();
	}
    loadLastTransactionType() {
        const lastType = localStorage.getItem('lastTransactionType') || 'Chi';
        const radio = document.querySelector(`input[name="type"][value="${lastType}"]`);
        if (radio) radio.checked = true;
    }

    updateFormVisibility() {
        const selectedType = document.querySelector('input[name="type"]:checked')?.value;
        if (!selectedType) return;
        
        const isTransfer = selectedType === 'Transfer';
        this.elements.toAccountRow.style.display = isTransfer ? 'flex' : 'none';
        this.elements.categoryRow.style.display = isTransfer ? 'none' : 'flex';
        this.elements.categorySelect.required = !isTransfer;

        const btnText = this.elements.submitBtn.querySelector('.btn-text');
        const btnIcon = this.elements.submitBtn.querySelector('.btn-icon');
        const accountLabel = document.getElementById('account-from-label');

        if (btnText) btnText.textContent = this.editingTransactionId ? 'Cập Nhật' : (isTransfer ? 'Chuyển Khoản' : 'Thêm Mới');
        if (btnIcon) btnIcon.innerHTML = this.editingTransactionId ? '<i class="fa-solid fa-floppy-disk"></i>' : (isTransfer ? '<i class="fa-solid fa-right-left"></i>' : '<i class="fa-solid fa-plus"></i>');
        if (accountLabel) accountLabel.textContent = isTransfer ? 'Từ tài khoản' : 'Tài khoản';
    }

    populateDropdowns() {
        this.populateCategories();
        this.populateAccounts();
        this.populateDescriptionSuggestions();
    }

    populateCategories() {
        const selectedType = document.querySelector('input[name="type"]:checked')?.value;
        const categories = (selectedType === 'Thu' ? this.app.data.incomeCategories : this.app.data.expenseCategories)
                           .filter(cat => !cat.system); // <-- THAY ĐỔI: Lọc bỏ danh mục hệ thống
        this.populateSelect(this.elements.categorySelect, categories, 'Chọn hạng mục...');
    }

    populateAccounts() {
        const userVisibleAccounts = this.app.data.accounts.filter(acc => !acc.system); // <-- THAY ĐỔI: Lọc bỏ tài khoản hệ thống
        this.populateSelect(this.elements.accountFrom, userVisibleAccounts, 'Chọn tài khoản...');
        this.populateSelect(this.elements.accountTo, userVisibleAccounts, 'Chọn tài khoản nhận...');
    }
    
    populateDescriptionSuggestions() {
        const datalist = this.elements.descriptionSuggestions;
        if (!datalist) return;
        const recentDescriptions = [...new Set(this.app.data.transactions.map(tx => tx.description).filter(Boolean))];
        datalist.innerHTML = '';
        recentDescriptions.slice(0, 50).forEach(desc => {
            const option = document.createElement('option');
            option.value = desc;
            datalist.appendChild(option);
        });
    }

    populateSelect(selectElement, items, placeholder) {
        if (!selectElement || !items) return;
        const currentValue = selectElement.value;
        selectElement.innerHTML = `<option value="">${placeholder}</option>`;
        items.forEach(item => {
            if (item && item.value && item.text) {
                const option = document.createElement('option');
                option.value = item.value;
                option.textContent = item.text;
                selectElement.appendChild(option);
            }
        });
        if (Array.from(selectElement.options).some(opt => opt.value === currentValue)) {
            selectElement.value = currentValue;
        }
    }

    async handleSubmit() {
        try {
            const formData = this.getFormData();
            const validation = Utils.ValidationUtils.validateTransaction(formData);
            if (!validation.isValid) {
                Utils.UIUtils.showMessage(validation.errors[0], 'error');
                return;
            }

            const action = this.editingTransactionId ? 'updateTransaction' : 'addTransaction';
            const success = await this.app[action](this.editingTransactionId || formData, formData);
            
            if (success) {
                Utils.UIUtils.showMessage(this.editingTransactionId ? 'Cập nhật thành công!' : 'Thêm giao dịch thành công!', 'success');
                this.refreshAfterSubmit();
            }
        } catch (error) {
            console.error('Submit error:', error);
            Utils.UIUtils.showMessage(error.message, 'error');
        }
    }
    
    getFormData() {
        const type = document.querySelector('input[name="type"]:checked').value;
        const amount = Utils.CurrencyUtils.parseAmountInput(this.elements.amountInput.value);

        const data = {
            type: type,
            amount: amount,
            account: this.elements.accountFrom.value,
            datetime: this.elements.datetimeInput.value,
            description: this.elements.descriptionInput.value.trim(),
        };

        if (type === 'Transfer') {
            data.toAccount = this.elements.accountTo.value;
        } else {
            data.category = this.elements.categorySelect.value;
        }
        return data;
    }

    refreshAfterSubmit() {
        this.app.refreshAllModules();
        if (this.editingTransactionId) {
            this.exitEditMode();
        } else {
            // When adding a new transaction, reset the form and focus the amount input
            this.resetForm(true);
        }
    }

    /**
     * Resets the form.
     * @param {boolean} shouldFocus - Whether to focus the amount input after reset.
     */
    resetForm(shouldFocus = true) {
        const preservedState = {
            type: document.querySelector('input[name="type"]:checked').value,
            category: this.elements.categorySelect.value,
            account: this.elements.accountFrom.value,
        };
        
        this.elements.amountInput.value = '';
        this.elements.descriptionInput.value = '';
        this.setDefaultDateTime();
        
        if (this.smartResetEnabled) {
            this.elements.categorySelect.value = preservedState.category;
            this.elements.accountFrom.value = preservedState.account;
        } else {
            this.elements.form.reset();
            this.loadLastTransactionType();
            this.updateFormVisibility();
            this.populateCategories();
        }

        if (shouldFocus) {
            // Lấy module bàn phím ảo từ app chính
            const vkModule = this.app.modules.VirtualKeyboardModule;
            // Nếu là di động, gọi trực tiếp hàm showKeyboard
            if (vkModule && vkModule.isMobile()) {
                vkModule.showKeyboard(this.elements.amountInput);
            } else {
                // Nếu là desktop, giữ nguyên hành vi focus mặc định
                this.elements.amountInput.focus();
            }
        }
    }
    
    setDefaultDateTime() {
        this.elements.datetimeInput.value = Utils.DateUtils.formatDateTimeLocal(new Date());
    }

    renderTransactionList() {
        const transactions = this.app.getFilteredTransactions(this.currentFilter);
        if (transactions.length === 0) {
            this.elements.transactionList.innerHTML = '';
            this.elements.noTransactions.style.display = 'block';
            return;
        }

        this.elements.noTransactions.style.display = 'none';
        const fragment = document.createDocumentFragment();
        transactions.forEach(tx => fragment.appendChild(this.createTransactionItem(tx)));
        this.elements.transactionList.innerHTML = '';
        this.elements.transactionList.appendChild(fragment);
    }
    
    createTransactionItem(transaction) {
        const item = document.createElement('div');
        item.className = 'transaction-item';
        item.dataset.id = transaction.id;

        const typeClass = transaction.type === 'Thu' ? 'income' : (transaction.type === 'Chi' ? 'expense' : 'transfer');

        // ==========================================================
        // === SỬA ĐỔI: TẬP TRUNG LOGIC LẤY ICON VỀ UTILS.JS ===
        // ==========================================================
        let iconHtml;
        if (transaction.isTransfer) {
            const transferIconClass = transaction.type === 'Chi' ? 'fa-solid fa-arrow-up-from-bracket' : 'fa-solid fa-arrow-down-to-bracket';
            iconHtml = `<i class="${transferIconClass}"></i>`;
        } else {
            // 1. Tìm đối tượng danh mục đầy đủ để có thông tin icon tùy chỉnh
            const categoryList = transaction.type === 'Thu'
                ? this.app.data.incomeCategories
                : this.app.data.expenseCategories;
            
            const categoryObject = categoryList.find(c => c && c.value === transaction.category);
            
            // 2. Gọi hàm tiện ích chung để lấy icon
            const iconInfo = Utils.UIUtils.getCategoryIcon(categoryObject || transaction.category);

            // 3. Tạo HTML cho icon
            iconHtml = iconInfo.type === 'img'
                ? `<img src="${iconInfo.value}" class="custom-category-icon" alt="Category Icon">`
                : `<i class="${iconInfo.value || 'fa-solid fa-question-circle'}"></i>`;
        }
        // --- KẾT THÚC LOGIC LẤY ICON ---

        let accountDisplay = this.app.getAccountName(transaction.account);
        if (transaction.isTransfer) {
            const pairTx = this.app.data.transactions.find(t => t.id === transaction.transferPairId);
            if (pairTx) {
                const pairAccountName = this.app.getAccountName(pairTx.account);
                accountDisplay = transaction.type === 'Chi' ? `${accountDisplay} → ${pairAccountName}` : `${pairAccountName} → ${accountDisplay}`;
            }
        }
        
        const isReconciliation =
            transaction.category === Utils.CONFIG.RECONCILE_ADJUST_INCOME_CAT ||
            transaction.category === Utils.CONFIG.RECONCILE_ADJUST_EXPENSE_CAT;

        // Nếu là giao dịch điều chỉnh, hiển thị tên đầy đủ hơn, ngược lại hiển thị tên danh mục
        const categoryDisplayText = isReconciliation ? "Điều chỉnh đối soát" : (transaction.category || "Chưa phân loại");
        const categoryTitleText = isReconciliation ? transaction.category : ''; // Tooltip cho giao dịch điều chỉnh

        item.innerHTML = `
            <div class="transaction-type-icon ${typeClass}">${iconHtml}</div>
            <div class="transaction-content">
                <div class="transaction-description" title="${transaction.description || ''}">${transaction.description || 'Không có mô tả'}</div>
                <div class="transaction-meta">
                    <span class="transaction-category" title="${categoryTitleText}">${categoryDisplayText}</span> • <span>${accountDisplay}</span>
                </div>
            </div>
            <div class="transaction-amount-section">
                <div class="transaction-amount ${typeClass}">${Utils.CurrencyUtils.formatCurrency(transaction.amount)}</div>
                <div class="transaction-date">${Utils.DateUtils.formatDisplayDateTime(transaction.datetime)}</div>
                <div class="transaction-actions">
                    <button class="action-btn-small edit" onclick="window.TransactionsModule.editTransaction('${transaction.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="action-btn-small delete" onclick="window.TransactionsModule.deleteTransaction('${transaction.id}')"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </div>
        `;
        return item;
    }

    editTransaction(transactionId) {
        const transaction = this.app.data.transactions.find(tx => tx.id === transactionId);
        if (!transaction) return;

        this.editingTransactionId = transactionId;
        
        const type = transaction.isTransfer ? 'Transfer' : transaction.type;
        const typeRadio = document.querySelector(`input[name="type"][value="${type}"]`);
        if (typeRadio) {
            typeRadio.checked = true;
            this.handleTypeChange(type);
        }

        this.elements.amountInput.value = Utils.CurrencyUtils.formatAmountInput(transaction.amount);
        this.elements.datetimeInput.value = Utils.DateUtils.formatDateTimeLocal(new Date(transaction.datetime));
        this.elements.descriptionInput.value = transaction.description;

        if (transaction.isTransfer) {
            const pairTx = this.app.data.transactions.find(t => t.id === transaction.transferPairId);
            const fromAccount = transaction.type === 'Chi' ? transaction.account : pairTx.account;
            const toAccount = transaction.type === 'Chi' ? pairTx.account : transaction.account;
            this.elements.accountFrom.value = fromAccount;
            this.elements.accountTo.value = toAccount;
        } else {
            this.elements.accountFrom.value = transaction.account;
            this.elements.categorySelect.value = transaction.category;
        }

        this.elements.form.scrollIntoView({ behavior: 'smooth' });
    }

    exitEditMode() {
        this.editingTransactionId = null;
        // After exiting edit mode, reset the form but DON'T focus the input
        this.resetForm(false);
        this.updateFormVisibility();
    }

    deleteTransaction(transactionId) {
        if (confirm('Bạn có chắc chắn muốn xóa giao dịch này?')) {
            if (this.app.deleteTransaction(transactionId)) {
                Utils.UIUtils.showMessage('Đã xóa giao dịch', 'success');
                this.refresh();
            }
        }
    }

    refresh() {
        if (!this.isInitialized) return;
        this.populateDropdowns();
        this.renderTransactionList();
    }
}

// Global instance
window.TransactionsModule = new TransactionsModule();