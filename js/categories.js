class CategoriesModule {
    constructor() {
        this.app = null;
        this.elements = {};
        this.eventListeners = [];
        this.editingItem = {
            originalValue: null,
            itemType: null,
            categoryType: null,
            newIcon: null
        };
    }

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

    initializeElements() {
        this.elements = {
            newIncomeCategoryInput: document.getElementById('new-income-category'),
            addIncomeCategoryBtn: document.getElementById('add-income-category'),
            incomeCategoryList: document.getElementById('income-category-list'),
            newExpenseCategoryInput: document.getElementById('new-expense-category'),
            addExpenseCategoryBtn: document.getElementById('add-expense-category'),
            expenseCategoryList: document.getElementById('expense-category-list'),
            newAccountInput: document.getElementById('new-account'),
            addAccountBtn: document.getElementById('add-account'),
            accountList: document.getElementById('account-list'),
        };
    }

    initializeEventListeners() {
        const addClickListener = (element, callback) => {
            if (element) {
                element.addEventListener('click', callback);
                this.eventListeners.push({ element, event: 'click', handler: callback });
            }
        };
        const addKeyListener = (element, callback) => {
            if (element) {
                const handler = (e) => { if (e.key === 'Enter') callback(); };
                element.addEventListener('keypress', handler);
                this.eventListeners.push({ element, event: 'keypress', handler });
            }
        };

        addClickListener(this.elements.addIncomeCategoryBtn, () => this.addIncomeCategory());
        addKeyListener(this.elements.newIncomeCategoryInput, () => this.addIncomeCategory());
        addClickListener(this.elements.addExpenseCategoryBtn, () => this.addExpenseCategory());
        addKeyListener(this.elements.newExpenseCategoryInput, () => this.addExpenseCategory());
        addClickListener(this.elements.addAccountBtn, () => this.addAccount());
        addKeyListener(this.elements.newAccountInput, () => this.addAccount());
    }

    // --- ADD / DELETE METHODS ---
    addIncomeCategory() { this.addCategory('income', this.elements.newIncomeCategoryInput, this.app.data.incomeCategories); }
    addExpenseCategory() { this.addCategory('expense', this.elements.newExpenseCategoryInput, this.app.data.expenseCategories); }

    addCategory(type, inputEl, array) {
        const name = inputEl.value?.trim();
        if (!name) { Utils.UIUtils.showMessage('Vui lòng nhập tên', 'error'); return; }
        const validation = Utils.ValidationUtils.validateCategoryName(name, array);
        if (!validation.isValid) { Utils.UIUtils.showMessage(validation.error, 'error'); return; }
        if (this.isProtectedCategoryName(name)) { Utils.UIUtils.showMessage('Tên này được hệ thống sử dụng', 'error'); return; }
        
        array.push({ value: name, text: name, icon: null, createdAt: new Date().toISOString(), createdBy: 'user' });
        this.app.saveData();
        inputEl.value = '';
        this.renderCategoryList(type);
        this.refreshTransactionModule();
        Utils.UIUtils.showMessage(`Đã thêm "${name}"`, 'success');
    }

    addAccount() {
        const name = this.elements.newAccountInput.value?.trim();
        if (!name) { Utils.UIUtils.showMessage('Vui lòng nhập tên tài khoản', 'error'); return; }
        const validation = Utils.ValidationUtils.validateAccountName(name, this.app.data.accounts);
        if (!validation.isValid) { Utils.UIUtils.showMessage(validation.error, 'error'); return; }

        this.app.data.accounts.push({ value: name, text: name, createdAt: new Date().toISOString(), createdBy: 'user' });
        this.app.saveData();
        this.elements.newAccountInput.value = '';
        this.renderAccountList();
        this.refreshTransactionModule();
        Utils.UIUtils.showMessage(`Đã thêm tài khoản "${name}"`, 'success');
    }

    deleteIncomeCategory(value) { this.deleteCategory(value, 'income', this.app.data.incomeCategories); }
    deleteExpenseCategory(value) { this.deleteCategory(value, 'expense', this.app.data.expenseCategories); }

    deleteCategory(value, type, array) {
        if (this.isProtectedCategory(value)) { Utils.UIUtils.showMessage('Không thể xóa danh mục hệ thống', 'error'); return; }
        const usageCount = this.app.data.transactions.filter(tx => tx.category === value).length;
        if (!confirm(`Bạn có chắc muốn xóa "${value}"?` + (usageCount > 0 ? `\n(Đang được dùng trong ${usageCount} giao dịch)` : ''))) return;

        const index = array.findIndex(cat => cat.value === value);
        if (index > -1) {
            array.splice(index, 1);
            this.app.saveData();
            this.renderCategoryList(type);
            this.refreshTransactionModule();
            Utils.UIUtils.showMessage(`Đã xóa "${value}"`, 'success');
        }
    }

    deleteAccount(value) {
        if (this.isProtectedAccount(value)) { // Thêm dòng này
            Utils.UIUtils.showMessage('Không thể xóa tài khoản hệ thống', 'error'); // Thêm dòng này
            return; // Thêm dòng này
        }
        const usageCount = this.app.data.transactions.filter(tx => tx.account === value).length;
        if (!confirm(`Bạn có chắc muốn xóa tài khoản "${value}"?` + (usageCount > 0 ? `\n(Đang được dùng trong ${usageCount} giao dịch)` : ''))) return;

        const index = this.app.data.accounts.findIndex(acc => acc.value === value);
        if (index > -1) {
            this.app.data.accounts.splice(index, 1);
            this.app.saveData();
            this.app.refreshAllModules();
            Utils.UIUtils.showMessage(`Đã xóa tài khoản "${value}"`, 'success');
        }
    }

    // --- RENDER METHODS ---
    renderCategoryList(type) {
        const listEl = type === 'income' ? this.elements.incomeCategoryList : this.elements.expenseCategoryList;
        if (!listEl) return;
        listEl.innerHTML = '';
        const fragment = document.createDocumentFragment();
        const array = type === 'income' ? this.app.data.incomeCategories : this.app.data.expenseCategories;
        array.forEach(item => fragment.appendChild(this.createCategoryListItem(item, type)));
        listEl.appendChild(fragment);
    }

    renderAccountList() {
        if (!this.elements.accountList) return;
        this.elements.accountList.innerHTML = '';
        const fragment = document.createDocumentFragment();
        this.app.data.accounts.forEach(acc => fragment.appendChild(this.createAccountListItem(acc)));
        this.elements.accountList.appendChild(fragment);
    }

    // --- LIST ITEM CREATION ---
    createCategoryListItem(category, type) {
        const li = document.createElement('li');
        li.className = 'category-item';
        const iconInfo = Utils.UIUtils.getCategoryIcon(category);
        const iconHtml = iconInfo.type === 'img' ? `<img src="${iconInfo.value}" class="custom-category-icon">` : `<i class="${iconInfo.value}"></i>`;
        const isProtected = this.isProtectedCategory(category.value);
        const usageCount = this.app.data.transactions.filter(tx => tx.category === category.value).length;
        const escapedValue = this.escapeHtml(category.value);

        li.innerHTML = `
            <div class="category-info"><span class="category-icon">${iconHtml}</span><div class="category-details"><span class="category-name">${this.escapeHtml(category.text)}</span><span class="category-usage">${usageCount} giao dịch</span></div></div>
            <div class="category-actions">${!isProtected ? `<button class="action-btn-small edit-btn" onclick="window.CategoriesModule.showEditModal('${escapedValue}', 'category', '${type}')" title="Chỉnh sửa"><i class="fa-solid fa-pencil"></i></button><button class="action-btn-small delete-btn" onclick="window.CategoriesModule.delete${type === 'income' ? 'Income' : 'Expense'}Category('${escapedValue}')" title="Xóa"><i class="fa-solid fa-trash-can"></i></button>` : `<span class="protected-badge" title="Danh mục hệ thống">🔒</span>`}</div>`;
        return li;
    }

    /**
     * Creates an account list item with the compact layout and correct balance colors.
     * @param {object} account - The account object.
     * @returns {HTMLLIElement}
     */
    createAccountListItem(account) {
        const li = document.createElement('li');
        li.className = 'account-item'; 

        const balance = this.app.getAccountBalance(account.value);
        const usageCount = this.app.data.transactions.filter(tx => tx.account === account.value).length;
        const iconInfo = Utils.UIUtils.getCategoryIcon(account); // Sử dụng Utils.UIUtils.getCategoryIcon để lấy icon từ đối tượng tài khoản
        const iconHtml = iconInfo.type === 'img' ? `<img src="${iconInfo.value}" class="custom-category-icon">` : `<i class="${iconInfo.value || 'fa-solid fa-landmark'}"></i>`; // Áp dụng logic icon HTML
        const isHidden = localStorage.getItem(`balance_hidden_${account.value}`) === 'true';
        const escapedValue = this.escapeHtml(account.value);
        
        // FIX 1: Thêm lại class màu (text-success hoặc text-danger) vào span chứa số dư
        const balanceColorClass = balance >= 0 ? 'text-success' : 'text-danger';
        const isProtected = this.isProtectedAccount(account.value); // Thêm dòng này

        li.innerHTML = `
            <div class="account-icon-balance-stack">
                <span class="category-icon compact">${iconHtml}</span>
                <span class="account-balance compact ${balanceColorClass}" id="balance-${escapedValue.replace(/[^a-zA-Z0-9]/g, '_')}">
                    ${isHidden ? '******' : Utils.CurrencyUtils.formatCurrencyShort(balance)}
                </span>
            </div>
            <div class="category-details">
                <span class="category-name">${this.escapeHtml(account.text)}</span>
                <span class="category-usage">${usageCount} giao dịch</span>
            </div>
            <div class="category-actions">
                <button class="action-btn-small eye-toggle-btn" title="${isHidden ? 'Hiện' : 'Ẩn'} số dư" data-account="${escapedValue}">
                    ${isHidden ? '🙈' : '👁️'}
                </button>
                ${!isProtected ? `
                    <button class="action-btn-small edit-btn" onclick="window.CategoriesModule.showEditModal('${escapedValue}', 'account')" title="Chỉnh sửa">
                        <i class="fa-solid fa-pencil"></i>
                    </button>
                    <button class="action-btn-small delete-btn" onclick="window.CategoriesModule.deleteAccount('${escapedValue}')" title="Xóa">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                ` : `<span class="protected-badge" title="Tài khoản hệ thống">🔒</span>`}
            </div>
        `;
        
        setTimeout(() => { 
            li.querySelector('.eye-toggle-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleBalanceVisibility(account.value);
            });
        }, 0);
        return li;
    }
    
    toggleBalanceVisibility(accountValue) {
        const key = `balance_hidden_${accountValue}`;
        const balSpan = document.getElementById(`balance-${accountValue.replace(/[^a-zA-Z0-9]/g, '_')}`);
        const eyeBtn = document.querySelector(`.eye-toggle-btn[data-account="${accountValue}"]`);
        let isHidden = !(localStorage.getItem(key) === 'true');
        localStorage.setItem(key, isHidden);
        
        if (balSpan && eyeBtn) {
            if (isHidden) {
                balSpan.textContent = '******';
                eyeBtn.innerHTML = '🙈';
                eyeBtn.title = 'Hiện số dư';
            } else {
                const balance = this.app.getAccountBalance(accountValue);
                balSpan.textContent = Utils.CurrencyUtils.formatCurrencyShort(balance);
                eyeBtn.innerHTML = '👁️';
                eyeBtn.title = 'Ẩn số dư';
            }
        }
    }

    // --- UNIFIED EDIT MODAL METHODS ---
    showEditModal(value, itemType, categoryType = null) {
        this.editingItem = { originalValue: value, itemType, categoryType, newIcon: null };
        const modal = document.getElementById('edit-item-modal');
        const nameInput = document.getElementById('edit-item-name');
        
        nameInput.value = this.editingItem.originalValue;
        document.getElementById('icon-picker-search').value = '';
        this.populateIconGrid();

        let currentItem;
        if (itemType === 'category') {
            const list = categoryType === 'income' ? this.app.data.incomeCategories : this.app.data.expenseCategories;
            currentItem = list.find(c => c.value === value);
            document.getElementById('edit-item-modal-title').textContent = 'Chỉnh sửa Danh mục';
        } else {
            currentItem = this.app.data.accounts.find(a => a.value === value);
            document.getElementById('edit-item-modal-title').textContent = 'Chỉnh sửa Tài khoản';
        }

        if (!currentItem) { Utils.UIUtils.showMessage('Không tìm thấy mục', 'error'); return; }
        this.updateIconDisplay(currentItem);

        document.getElementById('close-edit-item-modal').onclick = () => modal.style.display = 'none';
        document.getElementById('save-item-changes-btn').onclick = () => this.saveItemChanges();
        document.getElementById('icon-picker-search').oninput = (e) => this.filterIcons(e.target.value);
        
        modal.style.display = 'flex';
		const iconUploadInput = document.getElementById('icon-upload-input');
		const handleFileUpload = (e) => {
			const file = e.target.files[0];
			if (!file) return;

			if (file.size > 1024 * 1024) { // Giới hạn 1MB
				Utils.UIUtils.showMessage('Kích thước ảnh không được vượt quá 1MB', 'error');
				return;
			}

			const reader = new FileReader();
			reader.onload = (event) => {
				const imageDataUrl = event.target.result;
				// Lưu icon mới dưới dạng data URL và cập nhật hiển thị
				this.selectIcon(imageDataUrl); 
			};
			reader.onerror = () => {
				Utils.UIUtils.showMessage('Không thể đọc được file ảnh.', 'error');
			};
			reader.readAsDataURL(file);

			// Reset input để có thể chọn lại cùng 1 file
			iconUploadInput.value = '';
		};

		// Gán sự kiện, nhưng trước đó gỡ sự kiện cũ để tránh bị gọi nhiều lần
		iconUploadInput.removeEventListener('change', handleFileUpload);
		iconUploadInput.addEventListener('change', handleFileUpload);
    }

    populateIconGrid() {
        const gridContainer = document.getElementById('icon-picker-grid');
        gridContainer.innerHTML = '';
        Utils.UIUtils.getIconList().forEach(set => {
            const setTitle = document.createElement('h4');
            setTitle.className = 'icon-picker-set-title';
            setTitle.textContent = set.set;
            gridContainer.appendChild(setTitle);
            const setGrid = document.createElement('div');
            setGrid.className = 'icon-picker-grid';
            set.icons.forEach(icon => {
                const iconEl = this.createIconOption(icon);
                setGrid.appendChild(iconEl);
            });
            gridContainer.appendChild(setGrid);
        });
    }
    
    createIconOption(icon) {
        const iconEl = document.createElement('button');
        iconEl.className = 'icon-option';
        iconEl.title = icon.name;
        iconEl.dataset.name = icon.name.toLowerCase();
        // Kiểm tra loại icon để hiển thị đúng thẻ
        if (icon.type === 'img') {
            iconEl.innerHTML = `<img src="${icon.class}" class="custom-category-icon">`;
        } else {
            iconEl.innerHTML = `<i class="${icon.class}"></i>`;
        }
        iconEl.onclick = () => this.selectIcon(icon.class);
        return iconEl;
    }

    updateIconDisplay(itemOrClass) {
        const iconDisplay = document.getElementById('current-item-icon-display');
        // Sử dụng hàm Utils.UIUtils.getCategoryIcon để lấy thông tin icon
        const iconInfo = Utils.UIUtils.getCategoryIcon(itemOrClass); 

        iconDisplay.innerHTML = iconInfo.type === 'img' ? `<img src="${iconInfo.value}" class="custom-category-icon">` : `<i class="${iconInfo.value}"></i>`;
    }

    selectIcon(iconClass) {
        this.editingItem.newIcon = iconClass;
        this.updateIconDisplay(iconClass);
    }

    filterIcons(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        document.querySelectorAll('#icon-picker-grid .icon-picker-set-title').forEach(setTitleEl => {
            const grid = setTitleEl.nextElementSibling;
            let visibleCount = 0;
            grid.querySelectorAll('.icon-option').forEach(iconEl => {
                const isVisible = iconEl.dataset.name.includes(term);
                iconEl.style.display = isVisible ? 'flex' : 'none';
                if (isVisible) visibleCount++;
            });
            setTitleEl.style.display = visibleCount > 0 ? 'block' : 'none';
        });
    }

    saveItemChanges() {
        const { originalValue, itemType, categoryType, newIcon } = this.editingItem;
        const newName = document.getElementById('edit-item-name').value.trim();
        if (!newName) { Utils.UIUtils.showMessage('Tên không được để trống.', 'error'); return; }
        
        const nameChanged = newName !== originalValue;
        const dataList = itemType === 'account' ? this.app.data.accounts : (categoryType === 'income' ? this.app.data.incomeCategories : this.app.data.expenseCategories);
        
        if (nameChanged && dataList.some(item => item.value.toLowerCase() === newName.toLowerCase())) {
            Utils.UIUtils.showMessage(`Tên "${newName}" đã tồn tại.`, 'error');
            return;
        }
        
        const itemToUpdate = dataList.find(item => item.value === originalValue);
        if (!itemToUpdate) return;

        if (newIcon) itemToUpdate.icon = newIcon;
        if (nameChanged) {
            itemToUpdate.value = newName;
            itemToUpdate.text = newName;
            this.app.data.transactions.forEach(tx => {
                if (itemType === 'account') {
                    if (tx.account === originalValue) tx.account = newName;
                    if (tx.toAccount === originalValue) tx.toAccount = newName;
                } else if (tx.category === originalValue) {
                    tx.category = newName;
                }
            });
        }

        if (nameChanged || newIcon) {
            this.app.saveData();
            this.app.refreshAllModules();
            Utils.UIUtils.showMessage('Cập nhật thành công!', 'success');
        }
        document.getElementById('edit-item-modal').style.display = 'none';
    }

    // --- UTILITY METHODS ---
    escapeHtml(text) { return text?.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;") || ''; }
    isProtectedCategory(value) {
        // Trả về false để không có danh mục nào được coi là bảo vệ
        // CẨN THẬN KHI LÀM ĐIỀU NÀY: Có thể ảnh hưởng đến chức năng cốt lõi
        return false;
    }
    isProtectedAccount(value) {
        // Trả về false để không có tài khoản nào được coi là bảo vệ
        // CẨN THẬN KHI LÀM ĐIỀU NÀY: Có thể ảnh hưởng đến chức năng cốt lõi
        return false;
    }
    isProtectedCategoryName(name) { return this.isProtectedCategory(name); }
    refreshTransactionModule() { if (window.TransactionsModule) window.TransactionsModule.populateDropdowns(); }
    refreshHistoryModule() { if (window.HistoryModule) window.HistoryModule.refresh(); }
    refresh() { this.renderCategoryList('income'); this.renderCategoryList('expense'); this.renderAccountList(); }
}

// === CSS ĐÃ ĐƯỢC CẬP NHẬT ĐỂ SỬA LỖI MÀU SẮC ===
const categoryCSS = `
<style>
/* Main Item Styles */
.category-item, .account-item { display: flex; align-items: center; padding: 0.75rem; background-color: var(--bg-secondary); border-radius: 12px; gap: 1rem; }
.category-info { display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 0; }
.category-icon { font-size: 1.2rem; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: var(--bg-tertiary); border-radius: 8px; flex-shrink: 0; }
.custom-category-icon { width: 100%; height: 100%; object-fit: cover; border-radius: 8px; }
.category-details { display: flex; flex-direction: column; gap: 0.1rem; flex: 1; min-width: 0; }
.category-name { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.category-usage { font-size: 0.8rem; color: var(--text-muted); }
.category-actions { display: flex; align-items: center; gap: 0.5rem; }

/* === STYLES FOR COMPACT ACCOUNT ITEM LAYOUT === */
.account-icon-balance-stack {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    min-width: 60px;
}
.category-icon.compact {
    width: 38px;
    height: 38px;
    font-size: 1.1rem;
    margin-bottom: 2px;
}
.account-balance.compact {
    font-size: 0.8rem;
    font-weight: 600;
    font-family: monospace;
}

/* === CẬP NHẬT STYLE CHO NÚT "CON MẮT" TRONG DANH SÁCH TÀI KHOẢN === */
.account-item .category-actions .eye-toggle-btn {
    background: none; /* Bỏ nền */
    border: none; /* Bỏ viền */
    color: var(--text-muted);
    font-size: 1.1rem; /* Chỉnh lại kích thước icon cho phù hợp */
    width: 32px;
    height: 32px;
    border-radius: 50%; /* Bo tròn để đẹp hơn khi hover */
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s, color 0.2s;
}
.account-item .category-actions .eye-toggle-btn:hover {
    background-color: var(--bg-hover); /* Thêm nền nhẹ khi di chuột qua */
    color: var(--text-primary);
}
/* =================================================================== */

/* OPTIMIZED EDIT MODAL STYLES */
.current-icon-preview-container { display: flex; align-items: center; gap: 1rem; padding: 0.5rem; background-color: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 1rem; }
.current-icon-preview-container .category-icon { width: 32px; height: 32px; font-size: 1.2rem; background-color: var(--bg-tertiary); }
.current-icon-label { font-size: 0.9rem; color: var(--text-primary); font-weight: 500;}
.form-divider { border: none; height: 1px; background-color: var(--border-color); margin: 1rem 0; }
.picker-controls { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
.search-container { position: relative; flex: 1; display: flex; align-items: center; }
.search-container .search-icon { position: absolute; left: 12px; color: var(--text-muted); }
.search-container .icon-search-input { width: 100%; padding: 0.75rem 0.75rem 0.75rem 36px; background-color: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-primary); outline: none; }
.search-container .icon-search-input:focus { border-color: var(--primary-color); box-shadow: 0 0 0 2px var(--primary-color-light); }
.action-btn-icon-only { width: 44px; height: 44px; border: 1px solid var(--border-color); background-color: var(--bg-secondary); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1rem; cursor: pointer; color: var(--text-secondary); flex-shrink: 0; }
.action-btn-icon-only:hover { background-color: var(--bg-hover); }
.icon-picker-grid-scrollable { max-height: 220px; overflow-y: auto; padding-right: 10px; }
.icon-picker-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(48px, 1fr)); gap: 0.75rem; }
.icon-picker-set-title { grid-column: 1 / -1; margin-top: 1rem; margin-bottom: 0.5rem; font-weight: 600; color: var(--text-secondary); font-size: 0.9rem; }
.icon-picker-set-title:first-child { margin-top: 0; }
.icon-option { display: flex; align-items: center; justify-content: center; width: 100%; aspect-ratio: 1 / 1; font-size: 1.5rem; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-secondary); cursor: pointer; transition: all 0.2s ease; }
.icon-option:hover { background: var(--primary-color-light); color: var(--primary-color); border-color: var(--primary-color); }
.submit-btn.compact { padding: 0.6rem 1.2rem; font-size: 0.9rem; }

/* RESPONSIVE STYLES FOR MOBILE (<480px) */
@media (max-width: 480px) {
    .category-item, .account-item { padding: 0.5rem; gap: 0.5rem; }
    .category-icon { width: 36px; height: 36px; font-size: 1rem; }
    .category-name { font-size: 0.9rem; }
    .account-balance.compact { font-size: 0.7rem; }
    .account-icon-balance-stack { min-width: 50px; }
    #edit-item-modal .modal-content { padding: 1rem; }
    #edit-item-modal .modal-body { padding: 0; }
    .icon-picker-grid-scrollable { max-height: 180px; }
    .icon-picker-grid { gap: 0.5rem; grid-template-columns: repeat(auto-fill, minmax(42px, 1fr)); }
</style>
`;
if (document.getElementById('category-css')) {
    document.getElementById('category-css').remove();
}
const styleElement = document.createElement('div');
styleElement.id = 'category-css';
styleElement.innerHTML = categoryCSS;
document.head.appendChild(styleElement);

window.CategoriesModule = new CategoriesModule();