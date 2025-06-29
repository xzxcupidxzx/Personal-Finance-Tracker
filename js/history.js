/**
 * HISTORY MODULE - FIXED VERSION
 * Handles account balances, reconciliation, and transaction history
 */

class HistoryModule {
    constructor() {
        this.app = null;
        this.reconciliationData = {};
        this.historyFilter = { period: 'this_month', startDate: null, endDate: null };
        this.elements = {};
        this.eventListeners = [];
        this.cache = {
            accountBalances: null,
            lastCacheTime: null,
            cacheDuration: 5000
        };
        this.currentCalendarDate = new Date();
        // THÊM MỚI: Thêm trạng thái cho chế độ xem
        this.accountViewMode = 'list'; // Mặc định là 'list'
    }

    init(app) {
        this.app = app;
        console.log('🏦 Initializing History Module...');

        try {
            this.initializeElements();
            // THÊM MỚI: Gọi hàm khởi tạo nút chuyển đổi
            this.initializeViewToggle(); 
            this.initializeCalendarEvents();
            this.initializeReconciliation();
            this.initializeHistoryFilters();

            this.renderAccountBalances();
            this.renderTransactionCalendar();
            this.renderReconciliationTable();
            this.renderReconciliationHistory();

            console.log('✅ History Module initialized');
        } catch (error) {
            console.error('❌ Failed to initialize History Module:', error);
            Utils.UIUtils.showMessage('Có lỗi khi khởi tạo module lịch sử', 'error');
        }
    }


    /**
     * Initialize DOM elements with null checks
     */
    initializeElements() {
        this.elements = {
            accountBalanceGrid: document.getElementById('account-balance-grid'),
			accountViewToggle: document.getElementById('account-view-toggle'),
            reconciliationTable: document.getElementById('reconciliation-table'),
            reconciliationHistory: document.getElementById('reconciliation-history'),

            // === Các element cho bộ lọc Lịch sử đối soát ===
            historyFilterPeriod: document.getElementById('reconciliation-history-filter-period'),
            historyCustomDatesContainer: document.getElementById('reconciliation-history-custom-dates'),
            historyFilterStartDate: document.getElementById('reconciliation-filter-start-date'),
            historyFilterEndDate: document.getElementById('reconciliation-filter-end-date'),
            historyFilterApplyBtn: document.getElementById('reconciliation-filter-apply-button'),
            // =============================================

            // Calendar elements
            prevMonthBtn: document.getElementById('prev-month-btn'),
            nextMonthBtn: document.getElementById('next-month-btn'),
            currentMonthDisplay: document.getElementById('current-month-display'),
            calendarTotalIncome: document.getElementById('calendar-total-income'),
            calendarTotalExpense: document.getElementById('calendar-total-expense'),
            calendarDaysGrid: document.getElementById('calendar-days-grid'),
            dayDetailModal: document.getElementById('day-detail-modal'),
            closeDayModal: document.getElementById('close-day-modal'),
            modalDayTitle: document.getElementById('modal-day-title'),
            modalDayTransactions: document.getElementById('modal-day-transactions')
        };

        // Warn about missing elements
        Object.entries(this.elements).forEach(([key, element]) => {
            if (!element) {
                console.warn(`History Module: Element ${key} not found`);
            }
        });
    }

    // THÊM MỚI: Hàm khởi tạo và xử lý sự kiện cho nút chuyển đổi
    initializeViewToggle() {
        if (!this.elements.accountViewToggle) return;

        // Đọc chế độ xem đã lưu từ localStorage
        const savedView = localStorage.getItem('accountViewMode') || 'list';
        this.accountViewMode = savedView;
        this.updateAccountView();

        // Thêm sự kiện click
        const handler = () => {
            this.accountViewMode = this.accountViewMode === 'list' ? 'grid' : 'list';
            localStorage.setItem('accountViewMode', this.accountViewMode);
            this.updateAccountView();
        };
        this.elements.accountViewToggle.addEventListener('click', handler);
        this.eventListeners.push({ element: this.elements.accountViewToggle, event: 'click', handler });
    }
    
    // THÊM MỚI: Hàm cập nhật giao diện dựa trên chế độ xem
    updateAccountView() {
        if (!this.elements.accountBalanceGrid || !this.elements.accountViewToggle) return;

        const gridContainer = this.elements.accountBalanceGrid;
        const toggleButton = this.elements.accountViewToggle;
        const icon = toggleButton.querySelector('i');

        if (this.accountViewMode === 'grid') {
            gridContainer.classList.add('view-mode-grid');
            if(icon) icon.className = 'fa-solid fa-list';
            toggleButton.title = 'Chuyển sang chế độ danh sách';
        } else { // Chế độ 'list'
            gridContainer.classList.remove('view-mode-grid');
            if(icon) icon.className = 'fa-solid fa-grip';
            toggleButton.title = 'Chuyển sang chế độ lưới';
        }
    }

    /**
     * Initialize reconciliation functionality with validation
     */
    initializeReconciliation() {
        if (!this.app || !this.app.data || !Array.isArray(this.app.data.accounts)) {
            console.error('Invalid app data for reconciliation initialization');
            return;
        }
        try {
            this.app.data.accounts.forEach(account => {
                if (account && account.value) {
                    this.reconciliationData[account.value] = {
                        systemBalance: this.app.getAccountBalance(account.value),
                        actualBalance: null,
                        difference: null,
                        lastReconciled: null
                    };
                }
            });
        } catch (error) {
            console.error('Error initializing reconciliation:', error);
        }
    }


    /**
     * Initialize calendar event listeners
     */
    initializeCalendarEvents() {
        try {
            if (this.elements.prevMonthBtn) {
                const prevHandler = () => this.changeCalendarMonth(-1);
                this.elements.prevMonthBtn.addEventListener('click', prevHandler);
                this.eventListeners.push({ //
                    element: this.elements.prevMonthBtn,
                    event: 'click',
                    handler: prevHandler
                });
            }
            if (this.elements.nextMonthBtn) {
                const nextHandler = () => this.changeCalendarMonth(1);
                this.elements.nextMonthBtn.addEventListener('click', nextHandler);
                this.eventListeners.push({ //
                    element: this.elements.nextMonthBtn,
                    event: 'click',
                    handler: nextHandler
                });
            }
            if (this.elements.closeDayModal) {
                const closeHandler = () => this.closeDayDetailModal();
                this.elements.closeDayModal.addEventListener('click', closeHandler);
                this.eventListeners.push({ //
                    element: this.elements.closeDayModal,
                    event: 'click',
                    handler: closeHandler
                });
            }
            // Close modal when clicking outside
            if (this.elements.dayDetailModal) {
                const modalHandler = (e) => {
                    if (e.target === this.elements.dayDetailModal) {
                        this.closeDayDetailModal();
                    }
                };
                this.elements.dayDetailModal.addEventListener('click', modalHandler);
                this.eventListeners.push({ //
                    element: this.elements.dayDetailModal,
                    event: 'click',
                    handler: modalHandler
                });
            }
        } catch (error) {
            console.error('Error initializing calendar events:', error);
        }
    }
    initializeHistoryFilters() {
        if (this.elements.historyFilterPeriod) {
            const handler = () => this.handleHistoryFilterChange();
            this.elements.historyFilterPeriod.addEventListener('change', handler);
            this.eventListeners.push({ element: this.elements.historyFilterPeriod, event: 'change', handler });
        }
        if (this.elements.historyFilterApplyBtn) {
            const handler = () => this.applyHistoryCustomDateFilter();
            this.elements.historyFilterApplyBtn.addEventListener('click', handler);
            this.eventListeners.push({ element: this.elements.historyFilterApplyBtn, event: 'click', handler });
        }
    }

	handleHistoryFilterChange() {
		const newPeriod = this.elements.historyFilterPeriod.value;
		this.historyFilter.period = newPeriod;

		if (newPeriod === 'custom') {
			this.elements.historyCustomDatesContainer.style.display = 'block';
		} else {
			this.elements.historyCustomDatesContainer.style.display = 'none';
			// Dòng mã này là mấu chốt của việc sửa lỗi:
			this.renderReconciliationHistory(); // Render lại danh sách ngay lập tức
		}
	}
   applyHistoryCustomDateFilter() {
        const startDate = this.elements.historyFilterStartDate.value;
        const endDate = this.elements.historyFilterEndDate.value;

        if (!startDate || !endDate) {
            Utils.UIUtils.showMessage('Vui lòng chọn cả ngày bắt đầu và kết thúc.', 'error');
            return;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (start > end) {
            Utils.UIUtils.showMessage('Ngày bắt đầu không thể sau ngày kết thúc.', 'error');
            return;
        }

        // Lưu khoảng ngày đã chọn và render lại danh sách
        this.historyFilter.startDate = start;
        this.historyFilter.endDate = new Date(end.setHours(23, 59, 59, 999));
        this.renderReconciliationHistory();
    }
    getFilteredReconciliationHistory(allHistory) {
        if (!this.historyFilter.period || this.historyFilter.period === 'all') {
            return allHistory;
        }

        if (this.historyFilter.period === 'custom') {
            if (!this.historyFilter.startDate || !this.historyFilter.endDate) {
                return []; // Chưa chọn ngày thì không hiển thị gì
            }
            return allHistory.filter(item => {
                const itemDate = new Date(item.timestamp);
                return itemDate >= this.historyFilter.startDate && itemDate <= this.historyFilter.endDate;
            });
        }
        
        const now = new Date();
        let start, end;

        switch (this.historyFilter.period) {
            case 'this_month':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                break;
            case 'last_month':
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
                break;
            case 'this_year':
                start = new Date(now.getFullYear(), 0, 1);
                end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                break;
            default:
                return allHistory;
        }

        return allHistory.filter(item => {
            const itemDate = new Date(item.timestamp);
            return itemDate >= start && itemDate <= end;
        });
    }
    /**
     * Change calendar month
     */
    changeCalendarMonth(delta) {
        this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() + delta); //
        this.renderTransactionCalendar(); //
    }

    /**
     * Group transactions by date for calendar
     */
    groupTransactionsByDate(year, month) {
        const grouped = {};

        if (!this.app || !this.app.data || !Array.isArray(this.app.data.transactions)) { //
            return grouped;
        }

        this.app.data.transactions.forEach(tx => { //
            if (!tx || !tx.datetime || tx.isTransfer) return; // // Correctly excludes transfers

            try {
                const txDate = new Date(tx.datetime); //
                if (txDate.getFullYear() === year && txDate.getMonth() === month) { //
                    const dateKey = txDate.getDate(); //

                    if (!grouped[dateKey]) {
                        grouped[dateKey] = {
                            income: 0,
                            expense: 0,
                            transactions: [] // Keep transactions for modal
                        };
                    }

                    grouped[dateKey].transactions.push(tx); //

                    const amount = parseFloat(tx.amount) || 0; //
                    if (tx.type === 'Thu') { //
                        grouped[dateKey].income += amount;
                    } else if (tx.type === 'Chi') { //
                        grouped[dateKey].expense += amount;
                    }
                }
            } catch (error) {
                console.warn('Invalid transaction date for calendar:', tx.datetime, error);
            }
        });

        return grouped;
    }

    /**
     * Render transaction calendar (main orchestrator)
     */
    renderTransactionCalendar() {
        if (!this.elements.calendarDaysGrid || !this.elements.currentMonthDisplay) {
            console.warn('Calendar elements not found');
            return;
        }
        try {
            const year = this.currentCalendarDate.getFullYear(); //
            const month = this.currentCalendarDate.getMonth(); //

            // Update month display
            this.elements.currentMonthDisplay.textContent =
                this.currentCalendarDate.toLocaleDateString('vi-VN', { //
                    month: 'long',
                    year: 'numeric'
                });

            // Group transactions by date
            const dailyData = this.groupTransactionsByDate(year, month); //

            // Calculate monthly totals
            const monthlyTotals = Object.values(dailyData).reduce(
                (totals, day) => ({
                    income: totals.income + (day.income || 0),
                    expense: totals.expense + (day.expense || 0)
                }),
                { income: 0, expense: 0 }
            );

            // Update summary cards
            if (this.elements.calendarTotalIncome) {
                this.elements.calendarTotalIncome.textContent =
                    Utils.CurrencyUtils.formatCurrency(monthlyTotals.income); //
            }
            if (this.elements.calendarTotalExpense) {
                this.elements.calendarTotalExpense.textContent =
                    Utils.CurrencyUtils.formatCurrency(monthlyTotals.expense); //
            }

            // Render calendar grid
            this.renderCalendarGrid(year, month, dailyData); //

        } catch (error) {
            console.error('Error rendering transaction calendar:', error);
            if (this.elements.calendarDaysGrid) {
                this.elements.calendarDaysGrid.innerHTML = `
                    <div class="error-message">
                        Có lỗi khi hiển thị lịch giao dịch
                    </div>
                `;
            }
        }
    }

    /**
     * Render calendar grid with days (this is effectively renderCalendarDays)
     */
    renderCalendarGrid(year, month, dailyData) {
        if (!this.elements.calendarDaysGrid) return; //

        const firstDay = new Date(year, month, 1); //
        const lastDay = new Date(year, month + 1, 0); //
        const daysInMonth = lastDay.getDate(); //
        const startingDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday = 0 //

        this.elements.calendarDaysGrid.innerHTML = ''; //

        const today = new Date();
        const isCurrentMonthView = today.getFullYear() === year && today.getMonth() === month; //

        // Previous month days
        const prevMonthLastDay = new Date(year, month, 0).getDate(); //
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            const dayCell = this.createCalendarDayCell(prevMonthLastDay - i, true, false, null); //
            this.elements.calendarDaysGrid.appendChild(dayCell);
        }

        // Current month days
        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = isCurrentMonthView && today.getDate() === day; //
            const dayDataForCell = dailyData[day] || { income: 0, expense: 0, transactions: [] }; // Ensure dayDataForCell is always an object
            const dayCell = this.createCalendarDayCell(day, false, isToday, dayDataForCell); //
            this.elements.calendarDaysGrid.appendChild(dayCell);
        }

        // Next month days to fill the grid
        const totalCells = this.elements.calendarDaysGrid.children.length; //
        const remainingCells = Math.ceil(totalCells / 7) * 7 - totalCells; //
        for (let day = 1; day <= remainingCells && remainingCells < 7; day++) { //
            const dayCell = this.createCalendarDayCell(day, true, false, null); //
            this.elements.calendarDaysGrid.appendChild(dayCell);
        }
    }

    /**
     * Create calendar day cell - UPDATED for new income/expense display
     */
    createCalendarDayCell(dayNumber, isOtherMonth, isToday, dayData) {
        const dayCell = document.createElement('div');
        dayCell.className = `calendar-day-cell ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`; //

        // Check if there are any transactions to mark the cell
        if (dayData && (dayData.income > 0 || dayData.expense > 0)) { //
            dayCell.classList.add('has-transactions'); //
        }

        // Day number
        const dayNumberEl = document.createElement('div');
        dayNumberEl.className = 'day-number'; //
        dayNumberEl.textContent = dayNumber; //
        dayCell.appendChild(dayNumberEl);

        // Transaction indicators
        if (dayData && !isOtherMonth) { //
            const indicatorsDiv = document.createElement('div');
            indicatorsDiv.className = 'transaction-indicators'; // CSS class from previous step

            if (dayData.income > 0) {
                const incomeIndicatorEl = document.createElement('div');
                incomeIndicatorEl.className = 'transaction-indicator income'; // CSS class
                // ==========================================================
                // ===== SỬA DÒNG NÀY =====
                // ==========================================================
                incomeIndicatorEl.textContent = `+${Utils.CurrencyUtils.formatCurrencyShort(dayData.income)}`; //
                indicatorsDiv.appendChild(incomeIndicatorEl);
            }

            if (dayData.expense > 0) {
                const expenseIndicatorEl = document.createElement('div');
                expenseIndicatorEl.className = 'transaction-indicator expense'; // CSS class
                // ==========================================================
                // ===== SỬA DÒNG NÀY =====
                // ==========================================================
                expenseIndicatorEl.textContent = `-${Utils.CurrencyUtils.formatCurrencyShort(dayData.expense)}`;
                // Sửa lại: Vì expense luôn dương trong dayData, ta phải tự thêm dấu '-'
                expenseIndicatorEl.textContent = `-${Utils.CurrencyUtils.formatCurrencyShort(dayData.expense)}`;
                indicatorsDiv.appendChild(expenseIndicatorEl);
            }

            if (indicatorsDiv.hasChildNodes()) {
                dayCell.appendChild(indicatorsDiv);
            }


            // Add click handler for day details if there are transactions
            if (dayData.transactions && dayData.transactions.length > 0) {
                dayCell.onclick = () => this.showDayDetails(dayNumber, dayData); //
                dayCell.style.cursor = 'pointer'; //
            }
        }
        return dayCell;
    }

    /**
     * Show day transaction details in modal
     */
	showDayDetails(dayNumber, dayData) {
		if (!this.elements.dayDetailModal || !dayData) return;

		try {
			const modal = this.elements.dayDetailModal;
			const title = this.elements.modalDayTitle;
			const transactionListContainer = this.elements.modalDayTransactions;
			const summaryContainer = document.getElementById('modal-day-account-summary');
			
			if (!modal || !title || !transactionListContainer || !summaryContainer) {
				console.error('Day detail modal elements are missing!');
				return;
			}

			const date = new Date(this.currentCalendarDate.getFullYear(), this.currentCalendarDate.getMonth(), dayNumber);

			// 1. Cập nhật tiêu đề modal
			title.textContent = `Giao dịch ngày ${date.toLocaleDateString('vi-VN', {
				day: '2-digit', month: '2-digit', year: 'numeric'
			})}`;

			// 2. Tính toán và hiển thị TÓM TẮT TÀI KHOẢN
			summaryContainer.innerHTML = ''; // Xóa tóm tắt cũ
			const dayStart = new Date(date);
			dayStart.setHours(0, 0, 0, 0);

			const startBalances = this.getAccountBalancesAsOf(dayStart);
			const endBalances = { ...startBalances };
			const activeAccounts = new Set();

			dayData.transactions.forEach(t => {
				const amount = parseFloat(t.amount) || 0;
				if (t.type === 'Thu') {
					if (endBalances.hasOwnProperty(t.account)) endBalances[t.account] += amount;
					activeAccounts.add(t.account);
				} else if (t.type === 'Chi') {
					if (endBalances.hasOwnProperty(t.account)) endBalances[t.account] -= amount;
					activeAccounts.add(t.account);
				}
				// Logic cho chuyển tiền nếu có
			});

			let summaryHtml = '';
			activeAccounts.forEach(accountName => {
				const account = this.app.data.accounts.find(a => a.value === accountName);
				if (!account) return;

				const startBalance = startBalances[accountName] || 0;
				const endBalance = endBalances[accountName] || 0;

				if (startBalance !== endBalance) {
					const iconInfo = Utils.UIUtils.getCategoryIcon(account);
					const iconHtml = iconInfo.type === 'img' 
						? `<img src="${iconInfo.value}" class="custom-category-icon">` 
						: `<i class="${iconInfo.value}"></i>`;

					summaryHtml += `
						<div class="summary-item">
							<div class="summary-item-name">
								<span class="category-icon">${iconHtml}</span>
								<span>${this.escapeHtml(account.text)}</span>
							</div>
							<div class="summary-item-balance">
								<span>${Utils.CurrencyUtils.formatCurrency(startBalance)}</span>
								<span class="arrow">&rarr;</span>
								<span>${Utils.CurrencyUtils.formatCurrency(endBalance)}</span>
							</div>
						</div>
					`;
				}
			});
			summaryContainer.innerHTML = summaryHtml;

			// 3. Hiển thị DANH SÁCH GIAO DỊCH CHI TIẾT (Phần đã bị thiếu)
			this.renderDayTransactions(dayData.transactions);

			// 4. Hiển thị modal
			modal.style.display = 'flex';

		} catch (error) {
			console.error('Error showing day details:', error);
			Utils.UIUtils.showMessage('Có lỗi khi hiển thị chi tiết giao dịch', 'error');
		}
	}

	showDayDetails(dayNumber, dayData) {
		if (!this.elements.dayDetailModal || !dayData) return;

		try {
			const modal = this.elements.dayDetailModal;
			const title = this.elements.modalDayTitle;
			const transactionListContainer = this.elements.modalDayTransactions;
			const summaryContainer = document.getElementById('modal-day-account-summary');

			if (!modal || !title || !transactionListContainer || !summaryContainer) {
				console.error('Day detail modal elements are missing!');
				return;
			}

			const date = new Date(this.currentCalendarDate.getFullYear(), this.currentCalendarDate.getMonth(), dayNumber);

			title.textContent = `Giao dịch ngày ${date.toLocaleDateString('vi-VN', {
				day: '2-digit', month: '2-digit', year: 'numeric'
			})}`;

			summaryContainer.innerHTML = '';

			if (dayData.transactions.length > 0) {
				const dayStart = new Date(date);
				dayStart.setHours(0, 0, 0, 0);

				const startBalances = this.getAccountBalancesAsOf(dayStart);
				const endBalances = { ...startBalances };
				const activeAccounts = new Set();

				dayData.transactions.forEach(t => {
					const amount = parseFloat(t.amount) || 0;
					if (t.type === 'Thu') {
						if (endBalances.hasOwnProperty(t.account)) endBalances[t.account] += amount;
						activeAccounts.add(t.account);
					} else if (t.type === 'Chi') {
						if (endBalances.hasOwnProperty(t.account)) endBalances[t.account] -= amount;
						activeAccounts.add(t.account);
					}
				});

				let summaryHtml = '';
				activeAccounts.forEach(accountName => {
					const account = this.app.data.accounts.find(a => a.value === accountName);
					if (!account) return;

					const startBalance = startBalances[accountName] || 0;
					const endBalance = endBalances[accountName] || 0;

					if (startBalance.toFixed(2) !== endBalance.toFixed(2)) {
						const iconInfo = Utils.UIUtils.getCategoryIcon(account);
						const iconHtml = iconInfo.type === 'img' 
							? `<img src="${iconInfo.value}" class="custom-category-icon">` 
							: `<i class="${iconInfo.value}"></i>`;

						// ==========================================================
						// === THÊM MỚI: LOGIC XÁC ĐỊNH MÀU SẮC ===
						// ==========================================================
						let balanceChangeClass = '';
						if (endBalance > startBalance) {
							balanceChangeClass = 'text-success'; // Màu xanh cho số dư tăng
						} else if (endBalance < startBalance) {
							balanceChangeClass = 'text-danger'; // Màu đỏ cho số dư giảm
						}
						// ==========================================================

						summaryHtml += `
							<div class="summary-item">
								<div class="summary-item-name">
									<span class="category-icon">${iconHtml}</span>
									<span>${this.escapeHtml(account.text)}</span>
								</div>
								<div class="summary-item-balance">
									<span>${Utils.CurrencyUtils.formatCurrency(startBalance)}</span>
									<span class="arrow">&rarr;</span>
									<span class="${balanceChangeClass}">${Utils.CurrencyUtils.formatCurrency(endBalance)}</span>
								</div>
							</div>
						`;
					}
				});
				summaryContainer.innerHTML = summaryHtml;
			}

			this.renderDayTransactions(dayData.transactions);
			modal.style.display = 'flex';

		} catch (error) {
			console.error('Error showing day details:', error);
			Utils.UIUtils.showMessage('Có lỗi khi hiển thị chi tiết giao dịch', 'error');
		}
	}
    /**
     * Render transactions for a specific day
     */
    renderDayTransactions(transactions) {
        if (!this.elements.modalDayTransactions) return; //

        this.elements.modalDayTransactions.innerHTML = ''; //

        if (!transactions || transactions.length === 0) { //
            this.elements.modalDayTransactions.innerHTML = `
                <div class="no-transactions-day">
                    <i class="fa-regular fa-calendar-xmark"></i> Không có giao dịch nào trong ngày này
                </div>
            `;
            return;
        }

        // Sort transactions by time
        const sortedTransactions = transactions.sort((a, b) => //
            new Date(b.datetime) - new Date(a.datetime) //
        );

        sortedTransactions.forEach(tx => {
            const item = this.createDayTransactionItem(tx); //
            if (item) {
                this.elements.modalDayTransactions.appendChild(item);
            }
        });
    }

    /**
     * Create transaction item for day detail modal
     */
    createDayTransactionItem(transaction) {
        if (!transaction) return null; //

        try {
            const item = document.createElement('div');
            item.className = 'day-transaction-item'; //

            const typeClass = transaction.type === 'Thu' ? 'income' : 'expense'; //

            item.innerHTML = `
                <div class="transaction-type-indicator ${typeClass}"></div>
                <div class="day-transaction-details">
                    <div class="day-transaction-description">
                        ${this.escapeHtml(transaction.description || 'Không có mô tả')}
                    </div>
                    <div class="day-transaction-meta">
                        ${this.escapeHtml(transaction.category || '')} •
                        ${Utils.DateUtils.formatDisplayDateTime(transaction.datetime)} 
                    </div>
                </div>
                <div class="day-transaction-amount ${typeClass}">
                    ${Utils.CurrencyUtils.formatCurrency(transaction.amount || 0)}
                </div>
            `; //

            return item;
        } catch (error) {
            console.error('Error creating day transaction item:', error);
            return null;
        }
    }

    /**
     * Close day detail modal
     */
    closeDayDetailModal() {
        if (this.elements.dayDetailModal) {
            this.elements.dayDetailModal.style.display = 'none'; //
        }
    }


    /**
     * Render account balance cards with error handling
     */
    renderAccountBalances() {
        if (!this.elements.accountBalanceGrid) {
            console.warn('Account balance grid element not found');
            return;
        }

        try {
            // Áp dụng class chế độ xem trước khi render
            this.updateAccountView(); // <-- Thêm dòng này

            this.elements.accountBalanceGrid.innerHTML = '';
            const balances = this.getAllAccountBalancesWithCache();

            if (!this.app.data.accounts || !Array.isArray(this.app.data.accounts)) {
                console.error('Invalid accounts data');
                return;
            }

            this.app.data.accounts.forEach(account => {
                if (!account || !account.value) {
                    console.warn('Invalid account object:', account);
                    return;
                }
                try {
                    const balance = balances[account.value] || 0;
                    const card = this.createAccountBalanceCard(account, balance);
                    if (card) {
                        this.elements.accountBalanceGrid.appendChild(card);
                    }
                } catch (error) {
                    console.error('Error creating account card for:', account.value, error);
                }
            });
        } catch (error) {
            console.error('Error rendering account balances:', error);
            this.elements.accountBalanceGrid.innerHTML = `
                <div class="error-message">
                    Có lỗi khi hiển thị số dư tài khoản
                </div>
            `;
        }
    }

    /**
     * Get account balances with caching for performance
     */
    getAllAccountBalancesWithCache() {
        const now = Date.now();

        // Return cached data if still valid
        if (this.cache.accountBalances && //
            this.cache.lastCacheTime && //
            (now - this.cache.lastCacheTime) < this.cache.cacheDuration) { //
            return this.cache.accountBalances;
        }

        // Calculate fresh balances
        try {
            const balances = this.app.getAllAccountBalances(); //

            // Update cache
            this.cache.accountBalances = balances; //
            this.cache.lastCacheTime = now; //

            return balances;
        } catch (error) {
            console.error('Error getting account balances:', error);
            return {};
        }
    }

    /**
     * Create account balance card with validation
     */
	createAccountBalanceCard(account, balance) {
		if (!account || !account.value || !account.text) {
			console.warn('Invalid account data for card creation');
			return null;
		}

		try {
			const card = document.createElement('div');
			card.className = 'account-balance-card';

			const numBalance = parseFloat(balance) || 0;
			const balanceClass = numBalance >= 0 ? 'text-success' : 'text-danger';

			// Sử dụng Utils để lấy thông tin icon một cách nhất quán
			const iconInfo = Utils.UIUtils.getCategoryIcon(account);

			// Tạo HTML cho icon, có thể là <img> hoặc <i>
			const iconHtml = iconInfo.type === 'img' 
				? `<img src="${iconInfo.value}" class="custom-category-icon" alt="${this.escapeHtml(account.text)}">` 
				: `<i class="${iconInfo.value}"></i>`;

			// === ĐÂY LÀ PHẦN SỬA ĐỔI QUAN TRỌNG ===
			// Luôn bọc iconHtml trong một thẻ <span class="category-icon">
			card.innerHTML = `
				<div class="account-name">
					<span class="category-icon">
						${iconHtml}
					</span>
					<span>${this.escapeHtml(account.text)}</span>
				</div>
				<div class="account-balance ${balanceClass}">
					${Utils.CurrencyUtils.formatCurrency(numBalance)}
				</div>
			`;
			// === KẾT THÚC PHẦN SỬA ĐỔI ===

			return card;
		} catch (error) {
			console.error('Error creating account balance card:', error);
			return null;
		}
	}


    /**
     * Render reconciliation table.
     * This function should be implemented fully to create the table structure and populate it with data.
     * For now, it will render a basic structure.
     * Attach event listeners to input fields and buttons for reconciliation.
     */
    renderReconciliationTable() {
        if (!this.elements.reconciliationTable) { //
            console.warn('Reconciliation table element not found');
            return;
        }

        try {
            const table = this.elements.reconciliationTable; //
            const thead = table.querySelector('thead tr'); //
            const tbody = table.querySelector('tbody'); //

            if (!thead || !tbody) {
                console.error('Reconciliation table header or body not found.');
                return;
            }

            // Clear previous content and listeners
            thead.innerHTML = '<th class="sticky-col">Mục / Tài khoản</th>'; //
            tbody.innerHTML = ''; //
            this.eventListeners = this.eventListeners.filter(listener => !listener.element.closest('#reconciliation-table')); //


            const accounts = this.app.data.accounts || []; //

            // Add account columns to header
            accounts.forEach(account => {
                const th = document.createElement('th');
                th.textContent = account.text; //
                thead.appendChild(th);
            });

            // Add rows for system balance, actual balance, difference, and actions
            const rowsConfig = [{ //
                id: 'system-balance',
                label: 'Số dư hệ thống',
                type: 'display'
            }, {
                id: 'actual-balance',
                label: 'Số dư thực tế',
                type: 'input'
            }, {
                id: 'difference',
                label: 'Chênh lệch',
                type: 'display'
            }, {
                id: 'actions',
                label: 'Hành động',
                type: 'actions'
            }];

            rowsConfig.forEach(rowConfig => {
                const tr = document.createElement('tr');
                const labelCell = document.createElement('td');
                labelCell.className = 'sticky-col'; //
                labelCell.textContent = rowConfig.label; //
                tr.appendChild(labelCell);

                accounts.forEach(account => {
                    const cell = document.createElement('td');
                    if (!account || !account.value) { // Basic validation for account object //
                        cell.textContent = 'Lỗi TK';
                        tr.appendChild(cell);
                        return;
                    }
                    const accountValue = account.value; //

                    switch (rowConfig.type) { //
                        case 'display':
                            const span = document.createElement('span');
                            span.id = `${rowConfig.id}-${accountValue}`; //
                            if (rowConfig.id === 'system-balance') { //
                                const balance = this.app.getAccountBalance(accountValue); //
                                span.textContent = Utils.CurrencyUtils.formatCurrency(balance); //
                            } else if (rowConfig.id === 'difference') { //
                                span.textContent = '-'; // Initial state //
                            }
                            cell.appendChild(span);
                            break;
                        case 'input':
                            const input = document.createElement('input');
                            input.type = 'text'; //
                            input.placeholder = 'Nhập số dư'; //
                            input.className = 'reconciliation-input'; //
                            input.dataset.account = accountValue; //
                            input.inputMode = 'numeric'; //
							const formatHandler = (e) => {
								try {
									Utils.UIUtils.formatAmountInputWithCursor(e.target, e.target.value);
								} catch (error) {
									console.error('Error formatting reconciliation input:', error);
								}
							};
                            const inputHandler = () => this.calculateDifference(accountValue); //
							input.addEventListener('input', formatHandler); // Thêm format handler
                            input.addEventListener('input', inputHandler);
                            this.eventListeners.push({ element: input, event: 'input', handler: formatHandler });
							this.eventListeners.push({ element: input, event: 'input', handler: inputHandler }); //
                            cell.appendChild(input);
                            break;
                        case 'actions':
                            const reconcileBtn = document.createElement('button');
                            reconcileBtn.textContent = 'Đối soát'; //
                            reconcileBtn.className = 'reconcile-btn'; //
                            reconcileBtn.dataset.account = accountValue; //
                            const reconcileHandler = () => this.performReconciliation(accountValue); //
                            reconcileBtn.addEventListener('click', reconcileHandler);
                            this.eventListeners.push({ element: reconcileBtn, event: 'click', handler: reconcileHandler }); //
                            cell.appendChild(reconcileBtn);

                            const recordBtn = document.createElement('button');
                            recordBtn.textContent = 'Ghi nhận chênh lệch'; //
                            recordBtn.className = 'record-btn mt-2'; //
                            recordBtn.dataset.account = accountValue; //
                            recordBtn.style.display = 'none'; // Initially hidden //
                            const recordHandler = () => this.recordDifference(accountValue); //
                            recordBtn.addEventListener('click', recordHandler);
                            this.eventListeners.push({ element: recordBtn, event: 'click', handler: recordHandler }); //
                            cell.appendChild(recordBtn);
                            break;
                    }
                    tr.appendChild(cell);
                });
                tbody.appendChild(tr);
            });

            // Re-initialize reconciliation data after rendering new inputs
            this.initializeReconciliation(); //

        } catch (error) {
            console.error('Error rendering reconciliation table:', error);
            this.elements.reconciliationTable.innerHTML = `
                <tr><td colspan="${(this.app.data.accounts?.length || 0) + 1}" class="error-message">Có lỗi khi hiển thị bảng đối soát</td></tr>
            `;
        }
    }


    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text || typeof text !== 'string') return ''; //

        const div = document.createElement('div');
        div.textContent = text; //
        return div.innerHTML; //
    }

    /**
     * Calculate difference for reconciliation with comprehensive validation
     */
    calculateDifference(accountValue) {
        if (!accountValue || typeof accountValue !== 'string') { //
            console.warn('Invalid account value for difference calculation');
            return;
        }

        const input = document.querySelector(`input[data-account="${accountValue}"]`); //
        const differenceCell = document.getElementById(`difference-${accountValue}`); //

        // Validate required elements
        if (!input) { //
            console.warn('Input element not found for account:', accountValue);
            return;
        }

        if (!differenceCell) { //
            console.warn('Difference cell not found for account:', accountValue);
            return;
        }

        // Validate input value
        if (!input.value || input.value.trim() === '') { //
            differenceCell.textContent = '-'; //
            differenceCell.className = ''; //
            return;
        }

        try {
            const actualBalance = Utils.CurrencyUtils.parseAmountInput(input.value); //const actualBalance = Utils.CurrencyUtils.parseAmountInput(input.value); // Thay đổi dòng này

            if (isNaN(actualBalance)) { //
                differenceCell.textContent = 'Lỗi'; //
                differenceCell.className = 'text-danger'; //
                Utils.UIUtils.showMessage('Số dư thực tế không hợp lệ', 'error'); //
                return;
            }

            const systemBalance = this.app.getAccountBalance(accountValue); //

            if (isNaN(systemBalance)) { //
                console.error('Invalid system balance for account:', accountValue);
                differenceCell.textContent = 'Lỗi hệ thống'; //
                differenceCell.className = 'text-danger'; //
                return;
            }

            const difference = actualBalance - systemBalance; //

            // Update difference display
            differenceCell.textContent = Utils.CurrencyUtils.formatCurrency(difference); //

            // Update difference cell styling
            differenceCell.className = ''; //
            if (Math.abs(difference) < 0.01) { // Consider as equal if difference < 1 cent //
                differenceCell.classList.add('text-muted'); //
            } else if (difference > 0) { //
                differenceCell.classList.add('text-success'); //
            } else {
                differenceCell.classList.add('text-danger'); //
            }

            // Store reconciliation data with validation
            this.reconciliationData[accountValue] = { //
                systemBalance: systemBalance,
                actualBalance: actualBalance,
                difference: difference,
                lastReconciled: new Date().toISOString() //
            };

        } catch (error) {
            console.error('Error calculating difference for account:', accountValue, error);
            differenceCell.textContent = 'Lỗi'; //
            differenceCell.className = 'text-danger'; //
            Utils.UIUtils.showMessage('Có lỗi khi tính toán chênh lệch', 'error'); //
        }
    }

    /**
     * Perform reconciliation with enhanced validation
     */
    performReconciliation(accountValue) {
        if (!accountValue || typeof accountValue !== 'string') { //
            Utils.UIUtils.showMessage('Tài khoản không hợp lệ', 'error'); //
            return;
        }

        const input = document.querySelector(`input[data-account="${accountValue}"]`); //
        const recordBtn = document.querySelector(`button.record-btn[data-account="${accountValue}"]`); //

        if (!input) { //
            Utils.UIUtils.showMessage('Không tìm thấy ô nhập số dư', 'error'); //
            return;
        }

        // Trigger input validation first
        this.calculateDifference(accountValue); //

        // Then check if the input is valid after calculation
        if (input.value === '' || input.classList.contains('input-invalid')) { //
            Utils.UIUtils.showMessage('Vui lòng nhập số dư thực tế hợp lệ', 'error'); //
            input.focus(); //
            return;
        }

        try {
            const data = this.reconciliationData[accountValue]; //

            if (!data) { //
                Utils.UIUtils.showMessage('Không có dữ liệu đối soát', 'error'); //
                return;
            }

            const absDifference = Math.abs(data.difference || 0); //

            if (absDifference > 0.01) { // Show record button if there's a significant difference //
                if (recordBtn) {
                    recordBtn.style.display = 'block'; //
                }

                const accountName = this.getAccountName(accountValue); //
                Utils.UIUtils.showMessage( //
                    `Có chênh lệch ${Utils.CurrencyUtils.formatCurrency(data.difference)} trong tài khoản ${accountName}`, //
                    'info' //
                );
            } else {
                if (recordBtn) {
                    recordBtn.style.display = 'none'; //
                }
                Utils.UIUtils.showMessage('Số dư đã khớp với hệ thống', 'success'); //
            }

            // Save reconciliation to history
            this.saveReconciliationHistory(accountValue, data); //

        } catch (error) {
            console.error('Error performing reconciliation:', error);
            Utils.UIUtils.showMessage('Có lỗi khi thực hiện đối soát', 'error'); //
        }
    }

    /**
     * Get account name safely
     */
    getAccountName(accountValue) {
        if (!this.app || !this.app.data || !Array.isArray(this.app.data.accounts)) { //
            return accountValue;
        }

        const account = this.app.data.accounts.find(acc => acc && acc.value === accountValue); //
        return account ? account.text : accountValue; //
    }

    /**
     * Record difference as adjustment transaction with validation
     */
    recordDifference(accountValue) {
        if (!accountValue) { //
            Utils.UIUtils.showMessage('Tài khoản không hợp lệ', 'error'); //
            return;
        }

        const data = this.reconciliationData[accountValue]; //

        if (!data) { //
            Utils.UIUtils.showMessage('Không có dữ liệu đối soát', 'error'); //
            return;
        }

        const absDifference = Math.abs(data.difference || 0); //

        if (absDifference < 0.01) { //
            Utils.UIUtils.showMessage('Không có chênh lệch để ghi nhận', 'error'); //
            return;
        }

        const accountName = this.getAccountName(accountValue); //

        if (!confirm(`Bạn có chắc chắn muốn ghi nhận chênh lệch ${Utils.CurrencyUtils.formatCurrency(data.difference)} cho tài khoản ${accountName}?`)) { //
            return;
        }

        try {
            // Create adjustment transaction
            const adjustmentData = { //
                type: data.difference > 0 ? 'Thu' : 'Chi', //
                datetime: Utils.DateUtils.formatDateTimeLocal(), //
                amount: absDifference, //
                account: accountValue, //
                category: data.difference > 0 //
                    ? Utils.CONFIG.RECONCILE_ADJUST_INCOME_CAT //
                    : Utils.CONFIG.RECONCILE_ADJUST_EXPENSE_CAT, //
                description: `Điều chỉnh đối soát tài khoản ${accountName}`, //
                originalAmount: absDifference, //
                originalCurrency: 'VND' //
            };

            // Validate adjustment data
            const validation = Utils.ValidationUtils.validateTransaction(adjustmentData); //
            if (!validation.isValid) { //
                throw new Error(validation.errors[0]); //
            }

            // Ensure adjustment categories exist (This function is in app.js and should be called via app instance)
            if (this.app && typeof this.app.ensureAdjustmentCategories === 'function') { //
                this.app.ensureAdjustmentCategories(); //
            } else {
                console.warn("App.ensureAdjustmentCategories is not available. Categories might not be created.");
            }


            // Add adjustment transaction
            this.app.addTransaction(adjustmentData); //

            // Update reconciliation display
            this.updateReconciliationDisplay(accountValue); //

            // Clear cache to force refresh
            this.cache.accountBalances = null; //

            // Refresh other modules
            this.app.refreshAllModules(); //
            this.renderAccountBalances(); //

            Utils.UIUtils.showMessage(`Đã ghi nhận điều chỉnh cho tài khoản ${accountName}`, 'success'); //

        } catch (error) {
            console.error('Error recording difference:', error);
            Utils.UIUtils.showMessage(`Lỗi khi ghi nhận điều chỉnh: ${error.message}`, 'error'); //
        }
    }
	getAccountBalancesAsOf(targetDate) {
		const balances = {};
		// Initialize all accounts with 0 balance
		this.app.data.accounts.forEach(acc => {
			if (acc && acc.value) {
				balances[acc.value] = 0;
			}
		});

		// Filter transactions that occurred strictly before the target date
		const transactionsBefore = this.app.data.transactions.filter(t => {
			if (!t || !t.datetime) return false;
			return new Date(t.datetime) < targetDate;
		});

		// Calculate balances from the filtered transactions
		transactionsBefore.forEach(t => {
			const amount = parseFloat(t.amount) || 0;
			if (t.type === 'Thu') {
				if (balances.hasOwnProperty(t.account)) {
					balances[t.account] += amount;
				}
			} else if (t.type === 'Chi') {
				if (balances.hasOwnProperty(t.account)) {
					balances[t.account] -= amount;
				}
			} else if (t.type === 'Chuyển tiền') {
				if (balances.hasOwnProperty(t.account)) {
					balances[t.account] -= amount;
				}
				if (balances.hasOwnProperty(t.toAccount)) {
					balances[t.toAccount] += amount;
				}
			}
		});

		return balances;
	}
    /**
     * Update reconciliation display after recording
     */
    updateReconciliationDisplay(accountValue) {
        try {
            const systemBalanceCell = document.getElementById(`system-balance-${accountValue}`); //
            const differenceCell = document.getElementById(`difference-${accountValue}`); //
            const input = document.querySelector(`input[data-account="${accountValue}"]`); //
            const recordBtn = document.querySelector(`button.record-btn[data-account="${accountValue}"]`); //

            if (systemBalanceCell) { //
                const newBalance = this.app.getAccountBalance(accountValue); //
                systemBalanceCell.textContent = Utils.CurrencyUtils.formatCurrency(newBalance); //
            }

            if (differenceCell) { //
                differenceCell.textContent = Utils.CurrencyUtils.formatCurrency(0); //
                differenceCell.className = 'text-muted'; //
            }

            if (input) { //
                input.value = ''; // Clear input field //
                input.classList.remove('input-valid', 'input-invalid'); // Clear any validation classes //
            }

            if (recordBtn) { //
                recordBtn.style.display = 'none'; //
            }
        } catch (error) {
            console.error('Error updating reconciliation display:', error);
        }
    }

    /**
     * Save reconciliation to history with validation
     */
    saveReconciliationHistory(accountValue, data) {
        if (!accountValue || !data) {
            console.warn('Invalid data for reconciliation history');
            return;
        }

        try {
            const historyItem = {
                id: Utils.UIUtils.generateId(),
                account: accountValue,
                systemBalance: parseFloat(data.systemBalance) || 0,
                actualBalance: parseFloat(data.actualBalance) || 0,
                difference: parseFloat(data.difference) || 0,
                timestamp: new Date().toISOString(),
                week: Utils.DateUtils.getISOWeek(new Date()),
                year: new Date().getFullYear()
            };

            // Validate history item
            if (isNaN(historyItem.systemBalance) || isNaN(historyItem.actualBalance)) {
                console.error('Invalid balance values for history item');
                return;
            }

            // Load existing history
            let history = Utils.StorageUtils.load(Utils.CONFIG.STORAGE_KEYS.RECONCILIATION_HISTORY, []);

            if (!Array.isArray(history)) {
                console.warn('Invalid history data, resetting to empty array');
                history = [];
            }

            // Add new item
            history.push(historyItem);

            // Keep only last 100 items for performance
            if (history.length > 100) {
                history = history.slice(-100);
            }

            // Save history
            if (Utils.StorageUtils.save(Utils.CONFIG.STORAGE_KEYS.RECONCILIATION_HISTORY, history)) {
                
                // === PHẦN CẢI TIẾN ===
                // Tự động chuyển bộ lọc về "Tháng này" để đảm bảo người dùng thấy bản ghi mới nhất.
                if (this.elements.historyFilterPeriod) {
                    this.elements.historyFilterPeriod.value = 'this_month';
                    this.historyFilter.period = 'this_month';
                    // Ẩn bộ lọc ngày tùy chỉnh nếu nó đang hiển thị
                    if (this.elements.historyCustomDatesContainer) {
                        this.elements.historyCustomDatesContainer.style.display = 'none';
                    }
                }
                // ======================

                // Re-render history (hàm này sẽ sử dụng bộ lọc đã được cập nhật)
                this.renderReconciliationHistory();
            } else {
                console.error('Failed to save reconciliation history');
            }

        } catch (error) {
            console.error('Error saving reconciliation history:', error);
        }
    }

    /**
     * Render reconciliation history with error handling
     */
    renderReconciliationHistory() {
        if (!this.elements.reconciliationHistory) {
            console.warn('Reconciliation history element not found');
            return;
        }
        try {
            const allHistory = Utils.StorageUtils.load(Utils.CONFIG.STORAGE_KEYS.RECONCILIATION_HISTORY, []);
            if (!Array.isArray(allHistory)) {
                this.elements.reconciliationHistory.innerHTML = `<div class="error-message">Dữ liệu lịch sử không hợp lệ</div>`;
                return;
            }
            const filteredHistory = this.getFilteredReconciliationHistory(allHistory);
            if (filteredHistory.length === 0) {
                this.elements.reconciliationHistory.innerHTML = `<div class="no-data"><span class="no-data-icon"><i class="fa-solid fa-rectangle-list"></i></span><span class="no-data-text">Không có lịch sử đối soát nào trong khoảng thời gian đã chọn</span></div>`;
                return;
            }
            const sortedHistory = filteredHistory.filter(item => item && item.timestamp).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            this.elements.reconciliationHistory.innerHTML = '';
            sortedHistory.forEach(item => {
                const historyCard = this.createReconciliationHistoryCard(item);
                if (historyCard) this.elements.reconciliationHistory.appendChild(historyCard);
            });
        } catch (error) {
            console.error('Error rendering reconciliation history:', error);
            this.elements.reconciliationHistory.innerHTML = `<div class="error-message">Có lỗi khi hiển thị lịch sử đối soát</div>`;
        }
    }

    /**
     * Create reconciliation history card with validation
     */
    createReconciliationHistoryCard(item) {
        if (!item || !item.account || !item.timestamp) { //
            console.warn('Invalid history item for card creation');
            return null;
        }

        try {
            const card = document.createElement('div');
            card.className = 'reconciliation-history-card'; //

            const accountName = this.getAccountName(item.account); //
            const difference = parseFloat(item.difference) || 0; //
            const differenceClass = difference > 0 ? 'text-success' : //
                difference < 0 ? 'text-danger' : 'text-muted'; //
            const statusIconClass = Math.abs(difference) < 0.01 ? 'fa-solid fa-circle-check text-success' : 'fa-solid fa-triangle-exclamation text-warning'; //
            const accountIconClass = Utils.UIUtils.getCategoryIcon(item.account) || 'fa-solid fa-landmark';

            card.innerHTML = `
                <div class="history-header">
                    <div class="history-account">
                        <i class="${accountIconClass}"></i> ${this.escapeHtml(accountName)}
                    </div>
                    <div class="history-status">
                        <i class="${statusIconClass}"></i> ${Utils.DateUtils.formatDisplayDateTime(item.timestamp)}
                    </div>
                </div>
                <div class="history-details">
                    <div class="history-item">
                        <span class="history-label">Số dư hệ thống:</span>
                        <span class="history-value">${Utils.CurrencyUtils.formatCurrency(item.systemBalance || 0)}</span>
                    </div>
                    <div class="history-item">
                        <span class="history-label">Số dư thực tế:</span>
                        <span class="history-value">${Utils.CurrencyUtils.formatCurrency(item.actualBalance || 0)}</span>
                    </div>
                    <div class="history-item">
                        <span class="history-label">Chênh lệch:</span>
                        <span class="history-value ${differenceClass}">
                            ${Utils.CurrencyUtils.formatCurrency(difference)}
                        </span>
                    </div>
                </div>
            `; //

            return card;
        } catch (error) {
            console.error('Error creating reconciliation history card:', error);
            return null;
        }
    }

    /**
     * Cleanup method to prevent memory leaks
     */
    destroy() { 
        // Cleanup event listeners
        this.eventListeners.forEach(({ element, event, handler }) => { //
            if (element && typeof element.removeEventListener === 'function') { //
                element.removeEventListener(event, handler); //
            }
        });
        this.eventListeners = []; //

        // Clear cache
        this.cache = { //
            accountBalances: null,
            lastCacheTime: null,
            cacheDuration: 5000
        };

        // Clear DOM references
        this.elements = {}; //
        this.reconciliationData = {}; //
    }

    /**
     * Refresh the module with error handling
     */
	refresh() {
		try {
			// Clear cache to ensure fresh data
			this.cache.accountBalances = null; // Quan trọng để tính toán lại

			this.initializeReconciliation(); 
			this.renderAccountBalances(); // <<--- HÀM NÀY VẼ LẠI SỐ DƯ TÀI KHOẢN
			this.renderTransactionCalendar(); 
			this.renderReconciliationTable(); 
			this.renderReconciliationHistory(); 
		} catch (error) {
			console.error('Error refreshing history module:', error);
			Utils.UIUtils.showMessage('Có lỗi khi cập nhật module lịch sử', 'error'); 
		}
	}
}

// Add CSS for reconciliation history cards
const historyCSS = `
<style>
.reconciliation-history-card {
    background: var(--bg-secondary);
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
    border: 1px solid var(--border-color);
    transition: all 0.2s ease;
}

.reconciliation-history-card:hover {
    box-shadow: var(--shadow-sm);
    transform: translateY(-1px);
}

.history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border-color);
}

.history-account {
    font-weight: 600;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.history-status {
    font-size: 0.8rem;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 0.3rem;
}

.history-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.history-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.history-label {
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.history-value {
    font-weight: 500;
    font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
    color: var(--text-primary);
}

@media (max-width: 480px) {
    .reconciliation-history-card {
        padding: 0.75rem;
    }

    .history-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.25rem;
    }

    .history-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.25rem;
    }
}
</style>
`;

// Inject CSS
if (!document.getElementById('history-css')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'history-css';
    styleElement.innerHTML = historyCSS;
    document.head.appendChild(styleElement);
}

// Create global instance
window.HistoryModule = new HistoryModule(); //
