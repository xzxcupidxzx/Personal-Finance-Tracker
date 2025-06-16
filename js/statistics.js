/**
 * STATISTICS MODULE - COMPLETE REWRITE
 * Fixed version with improved error handling, chart rendering, and mobile support
 */

class StatisticsModule {
    constructor() {
        this.app = null;
        this.currentPeriod = 'month';
        this.customDateRange = { start: null, end: null };
        this.observers = [];
        // Chart instances
        this.charts = {
            expense: null,
            trend: null,
            comparison: null,
            monthlyFlow: null
        };
        
        // DOM elements cache
        this.elements = {};
        
        // Event listeners for cleanup
        this.eventListeners = [];
        
        // State management
        this.isInitialized = false;
        this.isRendering = false;
        
        // Configuration
        this.config = {
            maxCategories: 10,
            trendDays: 7,
            animationDuration: 800,
            // UPDATED: New, more distinct color palette
			chartColors: [
				'#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', 
				'#06b6d4', '#d946ef', '#f97316', '#22c55e', '#6366f1',
				'#ec4899', '#f43f5e', '#a855f7', '#14b8a6', '#eab308'
			]
        };
        this.resizeTimeout = null;
    }

    /**
     * Initialize the statistics module
     */
    async init(app) {
        if (this.isInitialized) {
            console.warn('StatisticsModule already initialized');
            return;
        }

        if (!app) {
            throw new Error('App instance is required');
        }

        this.app = app;
        console.log('📊 Initializing Statistics Module...');

        try {
            // Initialize components
            this.initializeElements();
            this.validateCriticalElements();
            this.initializeChartJS();
            this.setupEventListeners();
            
            // Initial render
            await this.refreshAll();
            
            this.isInitialized = true;
            console.log('✅ Statistics Module initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Statistics Module:', error);
            this.handleInitError(error);
        }
    }

    /**
     * Initialize DOM elements
     */
    initializeElements() {
        const elementMap = {
            // Controls
            statsPeriod: 'stats-period',
            chartType: 'chart-type',
            
            // Summary cards
            totalIncome: 'stats-total-income',
            totalExpense: 'stats-total-expense',
            netBalance: 'stats-net-balance',
            incomeChange: 'stats-income-change',
            expenseChange: 'stats-expense-change',
            balanceChange: 'stats-balance-change',
            
            // Charts
            expenseChartCanvas: 'expense-chart',
            expenseChartContainer: 'expense-chart-container',
            expenseLegend: 'expense-legend',
            trendChartCanvas: 'trend-chart',
            comparisonChartCanvas: 'comparison-chart',
            
            // Tables
            detailedStatsBody: 'detailed-stats-tbody'
        };

        this.elements = {};
        Object.entries(elementMap).forEach(([key, id]) => {
            this.elements[key] = document.getElementById(id);
            if (!this.elements[key]) {
                console.warn(`Element not found: ${key} (${id})`);
            }
        });
    }

    /**
     * Validate critical elements exist
     */
    validateCriticalElements() {
        const critical = ['statsPeriod', 'expenseChartCanvas', 'expenseChartContainer'];
        const missing = critical.filter(key => !this.elements[key]);
        
        if (missing.length > 0) {
            throw new Error(`Critical elements missing: ${missing.join(', ')}`);
        }
    }

    /**
     * Initialize Chart.js and plugins
     */
    initializeChartJS() {
        if (typeof Chart === 'undefined') {
            throw new Error('Chart.js is not loaded');
        }

        // Register plugins if available
        if (typeof ChartDataLabels !== 'undefined') {
            Chart.register(ChartDataLabels);
            console.log('✅ ChartDataLabels plugin registered');
        } else {
            console.warn('⚠️ ChartDataLabels plugin not available');
        }

        // Set global defaults
        this.updateChartDefaults();
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Period filter
        if (this.elements.statsPeriod) {
            this.addEventListener(this.elements.statsPeriod, 'change', () => {
                this.handlePeriodChange();
            });
        }

        // Chart type selector
        if (this.elements.chartType) {
            this.addEventListener(this.elements.chartType, 'change', () => {
                this.renderExpenseChart();
            });
        }

        // Theme change observer
        this.setupThemeObserver();

        // Window resize handler
        this.addEventListener(window, 'resize', this.debounce(() => {
            this.handleResize();
        }, 250));
    }

    /**
     * Add event listener with cleanup tracking
     */
    addEventListener(element, event, handler, options = false) {
        if (!element || typeof element.addEventListener !== 'function') {
            console.warn('Invalid element for event listener:', element);
            return;
        }

        element.addEventListener(event, handler, options);
        this.eventListeners.push({ element, event, handler, options });
    }

    /**
     * Handle period change
     */
    async handlePeriodChange() {
        this.currentPeriod = this.elements.statsPeriod.value;
        
        if (this.currentPeriod === 'custom') {
            this.showCustomDatePicker();
        } else {
            this.hideCustomDatePicker();
            await this.refreshAll();
        }
    }

    /**
     * Show custom date picker
     */
	showCustomDatePicker() {
		// Force remove any existing picker first
		document.querySelectorAll('.custom-date-picker').forEach(el => el.remove());

		// Create container
		const container = document.createElement('div');
		container.className = 'custom-date-picker';
		container.style.cssText = `
			position: fixed;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			background-color: rgba(0, 0, 0, 0.65); /* Tăng độ tối của lớp phủ nền */
			z-index: 9999;
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 20px;
		`;

		// Create modal content
		const modal = document.createElement('div');
		modal.style.cssText = `
			background: #2d2d2d; /* Nền tối cho modal */
			color: #e0e0e0; /* Màu chữ mặc định sáng */
			border-radius: 12px;
			width: 100%;
			max-width: 400px;
			box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5); /* Tăng hiệu ứng đổ bóng */
			overflow: hidden;
		`;

		// Create header
		const header = document.createElement('div');
		header.style.cssText = `
			display: flex;
			justify-content: space-between;
			align-items: center;
			padding: 20px 24px 16px 24px;
			border-bottom: 1px solid #4a4a4a; /* Đường viền sáng hơn trên nền tối */
		`;

		const title = document.createElement('h3');
		title.textContent = 'Chọn khoảng thời gian';
		title.style.cssText = `
			margin: 0;
			font-size: 18px;
			font-weight: 600;
			color: #e0e0e0; /* Màu tiêu đề sáng */
		`;

		const closeBtn = document.createElement('button');
		closeBtn.innerHTML = '×';
		closeBtn.style.cssText = `
			background: none;
			border: none;
			font-size: 28px;
			color: #a0a0a0; /* Màu nút đóng sáng hơn */
			cursor: pointer;
			padding: 4px;
			width: 32px;
			height: 32px;
			border-radius: 4px;
			line-height: 1;
		`;

		header.appendChild(title);
		header.appendChild(closeBtn);

		// Create form content
		const content = document.createElement('div');
		content.style.cssText = 'padding: 20px 24px 24px 24px;'; // Tăng padding trên cùng

		// Start date field
		const startField = document.createElement('div');
		startField.style.cssText = 'margin-bottom: 20px;';

		const startLabel = document.createElement('label');
		startLabel.textContent = 'Từ ngày:';
		startLabel.style.cssText = `
			display: block;
			margin-bottom: 8px;
			font-weight: 500;
			font-size: 16px;
			color: #e0e0e0; /* Màu nhãn sáng */
		`;

		const startInput = document.createElement('input');
		startInput.type = 'date';
		startInput.id = 'custom-start-date';
		startInput.style.cssText = `
			width: 100%;
			padding: 14px 16px;
			border: 2px solid #555; /* Đường viền tối hơn */
			border-radius: 8px;
			font-size: 16px;
			background-color: #3b3b3b; /* Nền ô nhập liệu tối */
			color: #e0e0e0; /* Chữ trong ô nhập liệu sáng */
			min-height: 48px;
			box-sizing: border-box;
			color-scheme: dark; /* GIÚP ICON LỊCH HIỂN THỊ CHẾ ĐỘ TỐI */
		`;

		startField.appendChild(startLabel);
		startField.appendChild(startInput);

		// End date field
		const endField = document.createElement('div');
		endField.style.cssText = 'margin-bottom: 24px;';

		const endLabel = document.createElement('label');
		endLabel.textContent = 'Đến ngày:';
		endLabel.style.cssText = `
			display: block;
			margin-bottom: 8px;
			font-weight: 500;
			font-size: 16px;
			color: #e0e0e0; /* Màu nhãn sáng */
		`;

		const endInput = document.createElement('input');
		endInput.type = 'date';
		endInput.id = 'custom-end-date';
		endInput.style.cssText = `
			width: 100%;
			padding: 14px 16px;
			border: 2px solid #555; /* Đường viền tối hơn */
			border-radius: 8px;
			font-size: 16px;
			background-color: #3b3b3b; /* Nền ô nhập liệu tối */
			color: #e0e0e0; /* Chữ trong ô nhập liệu sáng */
			min-height: 48px;
			box-sizing: border-box;
			color-scheme: dark; /* GIÚP ICON LỊCH HIỂN THỊ CHẾ ĐỘ TỐI */
		`;

		endField.appendChild(endLabel);
		endField.appendChild(endInput);

		// Apply button
		const applyBtn = document.createElement('button');
		applyBtn.textContent = 'Áp dụng';
		applyBtn.style.cssText = `
			width: 100%;
			padding: 16px;
			background-color: #007AFF;
			color: white;
			border: none;
			border-radius: 8px;
			font-size: 18px;
			font-weight: 600;
			cursor: pointer;
			min-height: 52px;
			transition: background-color 0.2s;
		`;
		// Thêm hiệu ứng hover cho nút
		applyBtn.onmouseover = function() { this.style.backgroundColor = '#0056b3'; };
		applyBtn.onmouseout = function() { this.style.backgroundColor = '#007AFF'; };


		// Assemble content
		content.appendChild(startField);
		content.appendChild(endField);
		content.appendChild(applyBtn);

		// Assemble modal
		modal.appendChild(header);
		modal.appendChild(content);
		container.appendChild(modal);

		// Add to page
		document.body.appendChild(container);

		// SIMPLE CLOSE FUNCTION - NO CONDITIONS
		function forceClose() {
			const pickers = document.querySelectorAll('.custom-date-picker');
			pickers.forEach(picker => {
				if (picker && picker.parentNode) {
					picker.parentNode.removeChild(picker);
				}
			});
			document.removeEventListener('keydown', handleEsc); // Gỡ bỏ sự kiện khi đóng
		}

		// Close button event
		closeBtn.onclick = function(e) {
			e.preventDefault();
			e.stopPropagation();
			forceClose();
		};

		// Background click event
		container.onclick = function(e) {
			if (e.target === container) {
				forceClose();
			}
		};

		// Apply button event - ALWAYS CLOSE FIRST
		applyBtn.onclick = function(e) {
			e.preventDefault();
			e.stopPropagation();

			const startDate = startInput.value;
			const endDate = endInput.value;

			// FORCE CLOSE IMMEDIATELY
			forceClose();

			// THEN HANDLE LOGIC AFTER CLOSE
			setTimeout(function() {
				if (startDate && endDate) {
					if (new Date(startDate) > new Date(endDate)) {
						alert('Ngày bắt đầu không thể sau ngày kết thúc');
						return;
					}
					
					// Trigger custom event
					const event = new CustomEvent('customDateRangeSelected', {
						detail: { startDate: startDate, endDate: endDate }
					});
					document.dispatchEvent(event);

				} else {
					alert('Vui lòng chọn cả ngày bắt đầu và ngày kết thúc');
				}
			}, 50);
		};

		// ESC key support
		function handleEsc(e) {
			if (e.key === 'Escape') {
				forceClose();
			}
		}
		document.addEventListener('keydown', handleEsc);

		// Focus first input
		setTimeout(function() {
			startInput.focus();
		}, 100);
	}

	// Global function to close date picker
	closeCustomDatePicker() {
		const pickers = document.querySelectorAll('.custom-date-picker');
		pickers.forEach(picker => {
			if (picker && picker.parentNode) {
				picker.parentNode.removeChild(picker);
			}
		});
	}

	// Function to listen for date selection
	onCustomDateRangeSelected(callback) {
		document.addEventListener('customDateRangeSelected', function(e) {
			callback(e.detail.startDate, e.detail.endDate);
		});
	}
	/**
     * Hide custom date picker
     */
    hideCustomDatePicker() {
        if (this.elements.customDatePicker) {
            this.elements.customDatePicker.remove();
            this.elements.customDatePicker = null;
        }
    }

    /**
     * Apply custom date range
     */
    async applyCustomDateRange() {
        const startInput = document.getElementById('custom-start-date');
        const endInput = document.getElementById('custom-end-date');

        if (!startInput.value || !endInput.value) {
            this.showMessage('Vui lòng chọn cả ngày bắt đầu và kết thúc', 'error');
            return;
        }

        const start = new Date(startInput.value);
        const end = new Date(endInput.value);

        if (start > end) {
            this.showMessage('Ngày bắt đầu không thể sau ngày kết thúc', 'error');
            return;
        }

        this.customDateRange = {
            start: start,
            end: new Date(end.setHours(23, 59, 59, 999))
        };

        await this.refreshAll();
        this.showMessage('Đã áp dụng khoảng thời gian tùy chỉnh', 'success', 2000);
    }

    /**
     * Get filtered transactions based on current period
     */
    getFilteredTransactions() {
        if (!this.app?.data?.transactions) {
            console.warn('No transaction data available');
            return [];
        }

        let transactions = [...this.app.data.transactions];
        
        // ✅ Clean data first
        transactions = this.cleanTransactionData(transactions);

        // Filter by period
        if (this.currentPeriod === 'custom') {
            if (this.customDateRange.start && this.customDateRange.end) {
                transactions = transactions.filter(tx => {
                    if (!tx?.datetime) return false;
                    const txDate = new Date(tx.datetime);
                    return txDate >= this.customDateRange.start && txDate <= this.customDateRange.end;
                });
            } else {
                return [];
            }
        } else {
            const dateRange = this.getPeriodDateRange(this.currentPeriod);
            if (dateRange) {
                transactions = transactions.filter(tx => {
                    if (!tx?.datetime) return false;
                    const txDate = new Date(tx.datetime);
                    return txDate >= dateRange.start && txDate <= dateRange.end;
                });
            }
        }

        // Exclude transfers for expense charts
        return transactions.filter(tx => tx && !tx.isTransfer);
    }

    /**
     * Build chart data with comprehensive validation
     */
    buildChartData(categories, chartType) {
        if (!Array.isArray(categories)) {
            console.warn('buildChartData: categories is not an array');
            categories = [];
        }
        
        if (!chartType || typeof chartType !== 'string') {
            chartType = 'doughnut'; // Default fallback
        }

        const validCategories = categories.filter(item => {
            if (!Array.isArray(item) || item.length !== 2) return false;
            const [category, amount] = item;
            if (category === null || category === undefined || String(category).trim() === '') return false;
            const numAmount = parseFloat(amount);
            if (isNaN(numAmount) || !isFinite(numAmount) || numAmount <= 0) return false;
            return true;
        });

        if (validCategories.length === 0) {
            return { labels: [], datasets: [{ data: [], backgroundColor: [], borderColor: [], borderWidth: 2 }] };
        }

        const labels = validCategories.map(([category]) => String(category).trim() || 'Không phân loại');
        const data = validCategories.map(([, amount]) => parseFloat(amount));
        const colors = labels.map((category, index) => this.getCategoryColor(category, index));

        return {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderColor: colors,
                borderWidth: 2,
                hoverOffset: chartType === 'doughnut' ? 4 : 0,
                barThickness: chartType === 'bar' ? 20 : undefined,
                hoverBackgroundColor: colors.map(color => color + '80'),
                hoverBorderColor: colors
            }]
        };
    }

    /**
     * Get date range for a period
     */
    getPeriodDateRange(period) {
        const now = new Date();
        let start, end;

        switch (period) {
            case 'week':
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const dayOfWeek = today.getDay();
                const monday = new Date(today);
                monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
                start = monday;
                end = new Date(today);
                end.setHours(23, 59, 59, 999);
                break;

            case 'month':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                break;

            case 'quarter':
                const quarter = Math.floor(now.getMonth() / 3);
                start = new Date(now.getFullYear(), quarter * 3, 1);
                end = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59);
                break;

            case 'year':
                start = new Date(now.getFullYear(), 0, 1);
                end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
                break;

            default:
                return null;
        }

        return { start, end };
    }

    /**
     * Get previous period transactions for comparison
     */
    getPreviousPeriodTransactions() {
        if (!this.app?.data?.transactions) return [];

        const currentRange = this.currentPeriod === 'custom' ? 
            this.customDateRange : 
            this.getPeriodDateRange(this.currentPeriod);

        if (!currentRange?.start || !currentRange?.end) return [];

        const diffMs = currentRange.end.getTime() - currentRange.start.getTime();
        const prevEnd = new Date(currentRange.start.getTime() - 1);
        const prevStart = new Date(prevEnd.getTime() - diffMs);

        return this.app.data.transactions.filter(tx => {
            if (!tx?.datetime || tx.isTransfer) return false;
            const txDate = new Date(tx.datetime);
            return txDate >= prevStart && txDate <= prevEnd;
        });
    }

    /**
     * Calculate statistics from transactions
     */
    calculateStatistics(transactions) {
        const stats = {
            totalIncome: 0,
            totalExpense: 0,
            netBalance: 0,
            incomeTransactions: 0,
            expenseTransactions: 0,
            expenseByCategory: {},
            dailyExpenses: {},
            topExpenseCategory: null,
            topExpenseAmount: 0,
            averageDaily: 0
        };

        if (!Array.isArray(transactions)) {
            console.warn('calculateStatistics: invalid transactions data');
            return stats;
        }

        transactions.forEach(tx => {
            if (!tx || !tx.type) return;

            const amount = parseFloat(tx.amount) || 0;

            if (tx.type === 'Thu') {
                stats.totalIncome += amount;
                stats.incomeTransactions++;
            } else if (tx.type === 'Chi') {
                stats.totalExpense += amount;
                stats.expenseTransactions++;

                // Category breakdown
                const category = tx.category || 'Không phân loại';
                stats.expenseByCategory[category] = (stats.expenseByCategory[category] || 0) + amount;

                // Daily breakdown
                if (tx.datetime) {
                    const dateKey = tx.datetime.split('T')[0];
                    stats.dailyExpenses[dateKey] = (stats.dailyExpenses[dateKey] || 0) + amount;
                }
            }
        });

        stats.netBalance = stats.totalIncome - stats.totalExpense;

        // Find top category
        const categoryEntries = Object.entries(stats.expenseByCategory);
        if (categoryEntries.length > 0) {
            const [topCategory, topAmount] = categoryEntries.sort(([,a], [,b]) => b - a)[0];
            stats.topExpenseCategory = topCategory;
            stats.topExpenseAmount = topAmount;
        }

        // Calculate average daily expense
        const days = Object.keys(stats.dailyExpenses).length;
        if (days > 0) {
            stats.averageDaily = stats.totalExpense / days;
        }

        return stats;
    }

    /**
     * Update summary cards
     */
    updateSummaryCards() {
        try {
            const currentTransactions = this.getFilteredTransactions();
            const prevTransactions = this.getPreviousPeriodTransactions();

            const currentStats = this.calculateStatistics(currentTransactions);
            const prevStats = this.calculateStatistics(prevTransactions);

            // Update values - using safe currency formatting
            this.updateElement(this.elements.totalIncome, this.formatCurrency(currentStats.totalIncome));
            this.updateElement(this.elements.totalExpense, this.formatCurrency(currentStats.totalExpense));

            // Update net balance with color
            if (this.elements.netBalance) {
                this.elements.netBalance.textContent = this.formatCurrency(currentStats.netBalance);
                this.elements.netBalance.classList.remove('text-success', 'text-danger');
                this.elements.netBalance.classList.add(currentStats.netBalance >= 0 ? 'text-success' : 'text-danger');
            }

            // Update change percentages
            this.updateChangePercentage(this.elements.incomeChange, prevStats.totalIncome, currentStats.totalIncome);
            this.updateChangePercentage(this.elements.expenseChange, prevStats.totalExpense, currentStats.totalExpense);
            this.updateChangePercentage(this.elements.balanceChange, prevStats.netBalance, currentStats.netBalance);

        } catch (error) {
            console.error('Error updating summary cards:', error);
        }
    }

    /**
     * Update change percentage display
     */
    updateChangePercentage(element, oldValue, newValue) {
        if (!element) return;

        const oldVal = parseFloat(oldValue) || 0;
        const newVal = parseFloat(newValue) || 0;

        let change = 0;
        if (oldVal !== 0) {
            change = ((newVal - oldVal) / Math.abs(oldVal)) * 100;
        } else if (newVal !== 0) {
            change = newVal > 0 ? 100 : -100;
        }

        const changeStr = isNaN(change) ? '0' : Math.round(change);
        const isPositive = change >= 0;

        element.textContent = `${isPositive ? '+' : ''}${changeStr}%`;
        element.className = `stats-change ${change === 0 ? 'neutral' : (isPositive ? 'positive' : 'negative')}`;
    }

    /**
     * Build chart options with proper mobile support
     */
	buildChartOptions(chartType, totalAmount) {
		const isDark = document.body.getAttribute('data-theme') === 'dark';
		const textColor = isDark ? '#e2e8f0' : '#374151';
		const gridColor = isDark ? '#475569' : '#e5e7eb';
		const isMobile = this.isMobileDevice();

		const baseOptions = {
			responsive: true,
			maintainAspectRatio: false,
			animation: {
				duration: isMobile ? 400 : 800,
				easing: 'easeOutQuart'
			},
			plugins: {
				legend: {
					display: false // Tắt legend mặc định vì chúng ta có legend tùy chỉnh bên dưới
				},
				tooltip: {
					backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(0,0,0,0.8)',
					titleColor: '#ffffff',
					bodyColor: '#ffffff',
					titleFont: { size: isMobile ? 12 : 14, weight: 'bold' },
					bodyFont: { size: isMobile ? 11 : 13 },
					padding: isMobile ? 8 : 12,
					cornerRadius: 6,
					displayColors: true,
					boxWidth: isMobile ? 8 : 12,
					boxHeight: isMobile ? 8 : 12,
					usePointStyle: true,
					callbacks: {
						// Tooltip khi di chuột vào vẫn hiển thị đầy đủ thông tin
						label: (context) => {
							let categoryName = context.label || 'Không phân loại';
							const value = context.raw || 0;
							const displayValue = this.formatCurrency(value);
							const percentage = totalAmount > 0 ? ((value / totalAmount) * 100).toFixed(1) : 0;
							return `${categoryName}: ${displayValue} (${percentage}%)`;
						}
					}
				},
				// --- CẤU HÌNH QUAN TRỌNG CHO NHÃN TRÊN BIỂU ĐỒ ---
				datalabels: {
					display: (context) => {
						// Chỉ hiển thị nhãn cho các lát có giá trị > 3% để tránh rối mắt
						const value = context.dataset.data[context.dataIndex] || 0;
						return (value / totalAmount) * 100 > 3;
					},
					formatter: (value, context) => {
						// Định dạng nhãn trả về: một chuỗi nhiều dòng
						const percentage = (value / totalAmount) * 100;
						const iconUnicode = context.dataset.icons[context.dataIndex]; // Lấy icon từ dataset
						const categoryName = context.chart.data.labels[context.dataIndex];
						
						// Trả về 3 dòng: Icon, Tên danh mục, Phần trăm
						return `${iconUnicode}\n${categoryName}\n${percentage.toFixed(0)}%`;
					},
					color: '#ffffff', // Màu chữ của nhãn
					textAlign: 'center',
					font: function(context) {
						// Sử dụng font khác nhau cho icon và chữ
						const isIconLine = context.line.includes('\uf07a'); // Kiểm tra ký tự icon
						return {
							family: isIconLine ? "'Font Awesome 6 Free'" : "Inter, sans-serif",
							weight: 'bold',
							size: isMobile ? 10 : 12
						};
					},
					// Thêm viền cho chữ để dễ đọc trên mọi màu nền
					textStrokeColor: 'rgba(0, 0, 0, 0.6)',
					textStrokeWidth: 2,
					align: 'center',
					anchor: 'center',
					padding: 4,
					borderRadius: 4,
					backgroundColor: 'rgba(0, 0, 0, 0.3)' // Thêm nền mờ để nhãn nổi bật hơn
				}
			}
		};

		if (chartType === 'doughnut') {
			return {
				...baseOptions,
				cutout: isMobile ? '60%' : '70%',
				layout: {
					// Tăng padding để có không gian cho nhãn không bị cắt
					padding: isMobile ? 25 : 40 
				},
			};
		} else { // Cấu hình cho biểu đồ cột
			return {
				...baseOptions,
				indexAxis: 'y',
				scales: {
					x: {
						beginAtZero: true,
						ticks: { color: textColor, font: { size: isMobile ? 9 : 11 }, maxTicksLimit: isMobile ? 4 : 6, callback: (value) => this.formatCurrency(value, false) },
						grid: { color: gridColor, drawBorder: false, lineWidth: isMobile ? 0.5 : 1 },
					},
					y: {
						ticks: { color: textColor, font: { size: isMobile ? 9 : 11 },
							callback: function(value) {
								let label = this.getLabelForValue(value) || 'Không phân loại';
								return isMobile && label.length > 12 ? label.substring(0, 10) + '...' : label;
							}
						},
						grid: { display: false }
					}
				},
				plugins: { ...baseOptions.plugins, datalabels: { display: false } } // Tắt datalabels cho biểu đồ cột
			};
		}
	}
// ... (bên trong lớp StatisticsModule)

	/**
	 * SỬA LẠI TOÀN BỘ HÀM NÀY
	 * - Khôi phục border cho nhãn
	 * - Tách icon ra ngoài và đặt bên trái của nhãn
	 */
	getDoughnutPlugins(totalAmount) {
		const isMobile = this.isMobileDevice();
		const isDark = document.body.getAttribute('data-theme') === 'dark';

		return [{
			id: 'customLeaderLinesAndLabels',
			afterDatasetsDraw: (chart) => {
				try {
					const { ctx } = chart;
					const meta = chart.getDatasetMeta(0);

					if (!meta.data?.length || !totalAmount) return;

					const leaderLineColor = isDark ? 'rgba(148, 163, 184, 0.7)' : 'rgba(100, 116, 139, 0.7)';
					const labelTextColor = isDark ? '#f1f5f9' : '#0f172a';
					const labelBorderColor = isDark ? '#64748b' : '#cbd5e1';
					const leaderExtension = isMobile ? 15 : 20;
					const horizontalExtension = isMobile ? 25 : 30;
					
					const labelFont = { size: isMobile ? 9 : 11, weight: '600', family: 'Inter, sans-serif' };
					const iconFont = { size: isMobile ? 10 : 12, weight: '900', family: '"Font Awesome 6 Free"' };
					const labelPadding = { x: isMobile ? 5 : 7, y: isMobile ? 3 : 4 };
					const iconSpacing = isMobile ? 4 : 5;
					const minYSpacing = (isMobile ? 12 : 14) * 1.5;

					let occupiedYRanges = { left: [], right: [] };

					const items = meta.data.map((element, index) => ({
						element,
						index,
						midAngle: element.startAngle + (element.endAngle - element.startAngle) / 2,
						percentage: (chart.data.datasets[0].data[index] / totalAmount) * 100,
					})).filter(item => item.percentage >= 1);

					items.forEach(item => {
						const { element, midAngle, percentage, index } = item;
						const isRightSide = Math.cos(midAngle) >= 0;
						
						// --- TÍNH TOÁN VỊ TRÍ ---
						const startX = element.x + Math.cos(midAngle) * element.outerRadius;
						const startY = element.y + Math.sin(midAngle) * element.outerRadius;
						const elbowX = element.x + Math.cos(midAngle) * (element.outerRadius + leaderExtension);
						const initialElbowY = element.y + Math.sin(midAngle) * (element.outerRadius + leaderExtension);
						const endX = isRightSide ? elbowX + horizontalExtension : elbowX - horizontalExtension;
						
						// --- LOGIC TRÁNH CHỒNG CHÉO NHÃN ---
						let bestY = initialElbowY;
						let attempts = 0;
						let collision = true;
						while (collision && attempts < 20) {
							collision = false;
							for (const range of occupiedYRanges[isRightSide ? 'right' : 'left']) {
								if (Math.abs(bestY - range.center) < minYSpacing) {
									collision = true;
									bestY += (bestY < element.y ? -5 : 5);
									break;
								}
							}
							attempts++;
						}
						occupiedYRanges[isRightSide ? 'right' : 'left'].push({ center: bestY });

						// --- BẮT ĐẦU VẼ ---
						ctx.save();
						
						// 1. VẼ ĐƯỜNG KẺ (LEADER LINE)
						ctx.strokeStyle = leaderLineColor;
						ctx.lineWidth = 1;
						ctx.beginPath();
						ctx.moveTo(startX, startY);
						ctx.lineTo(elbowX, bestY);
						ctx.lineTo(endX, bestY);
						ctx.stroke();

						// 2. CHUẨN BỊ DỮ LIỆU TEXT VÀ ICON
						ctx.textBaseline = 'middle';
						const iconInfo = Utils.UIUtils.getCategoryIcon(chart.data.labels[index]);
						const iconText = iconInfo.unicode || '';
						const percentText = `${percentage.toFixed(0)}%`;

						// 3. TÍNH TOÁN KÍCH THƯỚC VÀ VỊ TRÍ
						ctx.font = `${iconFont.weight} ${iconFont.size}px ${iconFont.family}`;
						const iconWidth = ctx.measureText(iconText).width;

						ctx.font = `${labelFont.weight} ${labelFont.size}px ${labelFont.family}`;
						const percentMetrics = ctx.measureText(percentText);
						
						const rectHeight = labelFont.size + 2 * labelPadding.y;
						const rectWidth = percentMetrics.width + 2 * labelPadding.x;
						const borderRadius = rectHeight / 2;

						// 4. VẼ (TÙY THEO BÊN TRÁI HAY PHẢI)
						if (isRightSide) {
							ctx.textAlign = 'left';
							const iconX = endX + 4;
							const rectX = iconX + iconWidth + iconSpacing;
							
							// Vẽ icon
							ctx.font = `${iconFont.weight} ${iconFont.size}px ${iconFont.family}`;
							ctx.fillStyle = leaderLineColor;
							ctx.fillText(iconText, iconX, bestY);

							// Vẽ border
							ctx.strokeStyle = labelBorderColor;
							ctx.beginPath();
							ctx.roundRect(rectX, bestY - rectHeight / 2, rectWidth, rectHeight, borderRadius);
							ctx.stroke();

							// Vẽ text %
							ctx.font = `${labelFont.weight} ${labelFont.size}px ${labelFont.family}`;
							ctx.fillStyle = labelTextColor;
							ctx.fillText(percentText, rectX + labelPadding.x, bestY);

						} else { // Bên trái
							ctx.textAlign = 'right';
							const rectX = endX - 4;
							const iconX = rectX - rectWidth - iconSpacing;
							
							// Vẽ icon
							ctx.font = `${iconFont.weight} ${iconFont.size}px ${iconFont.family}`;
							ctx.fillStyle = leaderLineColor;
							ctx.fillText(iconText, iconX, bestY);

							// Vẽ border
							ctx.strokeStyle = labelBorderColor;
							ctx.beginPath();
							ctx.roundRect(rectX - rectWidth, bestY - rectHeight / 2, rectWidth, rectHeight, borderRadius);
							ctx.stroke();

							// Vẽ text %
							ctx.font = `${labelFont.weight} ${labelFont.size}px ${labelFont.family}`;
							ctx.fillStyle = labelTextColor;
							ctx.fillText(percentText, rectX - labelPadding.x, bestY);
						}
						
						ctx.restore();
					});
				} catch (error) {
					console.error('Error in custom chart plugin:', error);
				}
			}
		}];
	}

    updateDetailedStats() {
        if (!this.elements.detailedStatsBody) return;

        try {
            const transactions = this.getFilteredTransactions();
            const stats = this.calculateStatistics(transactions);

            this.elements.detailedStatsBody.innerHTML = '';

            const categoriesSorted = Object.entries(stats.expenseByCategory)
                .sort(([,a], [,b]) => b - a);

            if (categoriesSorted.length === 0) {
                this.elements.detailedStatsBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center py-8 text-gray-500">
                            Không có dữ liệu chi tiết để hiển thị
                        </td>
                    </tr>
                `;
                return;
            }

            categoriesSorted.forEach(([category, amount], index) => { // Added index here
                const percentage = ((amount / stats.totalExpense) * 100).toFixed(1);
                const iconClass = this.getCategoryIcon(category);
                const color = this.getCategoryColor(category, index); // Pass index to get color

                const row = document.createElement('tr');
                row.className = 'border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors';
                row.innerHTML = `
                    <td class="py-3 px-4">
                        <div class="flex items-center gap-3">
                            <span class="text-lg w-6 text-center"><i class="${iconClass}"></i></span>
                            <span class="font-medium">${this.escapeHtml(category)}</span>
                        </div>
                    </td>
                    <td class="py-3 px-4 text-right font-mono font-semibold">
                        ${this.formatCurrency(amount)}
                    </td>
                    <td class="py-3 px-4 text-right font-mono font-bold text-blue-600">
                        ${percentage}%
                    </td>
                    <td class="py-3 px-4">
                        <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                            <div class="h-2 rounded-full transition-all duration-500" 
                                 style="width: ${percentage}%; background-color: ${color};">
                            </div>
                        </div>
                    </td>
                `;
                this.elements.detailedStatsBody.appendChild(row);
            });

            // Add total row
            const totalRow = document.createElement('tr');
            totalRow.className = 'bg-gray-100 dark:bg-gray-700 font-bold border-t-2';
            totalRow.innerHTML = `
                <td class="py-3 px-4">
                    <div class="flex items-center gap-3">
                        <span class="text-lg w-6 text-center"><i class="fa-solid fa-sack-dollar"></i></span>
                        <span>Tổng cộng</span>
                    </div>
                </td>
                <td class="py-3 px-4 text-right font-mono font-bold">
                    ${this.formatCurrency(stats.totalExpense)}
                </td>
                <td class="py-3 px-4 text-right font-mono font-bold">100%</td>
                <td class="py-3 px-4">
                    <div class="w-full bg-blue-500 h-2 rounded-full"></div>
                </td>
            `;
            this.elements.detailedStatsBody.appendChild(totalRow);

        } catch (error) {
            console.error('Error updating detailed stats:', error);
            this.elements.detailedStatsBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center py-8 text-red-500">
                        Có lỗi khi hiển thị thống kê chi tiết
                    </td>
                </tr>
            `;
        }
    }

    /**
     * Show no data message
     */
    showNoDataMessage() {
        if (this.elements.expenseChartCanvas) {
            this.elements.expenseChartCanvas.style.display = 'none';
        }
        if (this.elements.expenseChartContainer) {
             this.elements.expenseChartContainer.innerHTML = `
                <div class="no-data-message" style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 300px;
                    color: var(--text-muted);
                    text-align: center;
                    padding: 2rem;
                ">
                    <div style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.5;"><i class="fa-solid fa-chart-pie"></i></div>
                    <h3 style="font-size: 1.2rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-primary);">
                        Chưa có dữ liệu chi tiêu
                    </h3>
                    <p style="color: var(--text-muted); margin-bottom: 1.5rem;">
                        Hãy thêm một số giao dịch chi tiêu để xem biểu đồ phân tích
                    </p>
                    <button onclick="window.location.hash = '#transactions'" style="
                        background: var(--primary-color);
                        color: white;
                        border: none;
                        padding: 0.75rem 1.5rem;
                        border-radius: 8px;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    ">
                        Thêm giao dịch
                    </button>
                </div>
            `;
        }

        if (this.elements.expenseLegend) {
            this.elements.expenseLegend.innerHTML = '';
        }
    }

    /**
     * Show chart error
     */
    showChartError(message) {
        if (this.elements.expenseChartCanvas) {
            this.elements.expenseChartCanvas.style.display = 'none';
        }

        if (this.elements.expenseChartContainer) {
            this.elements.expenseChartContainer.innerHTML = `
                <div class="chart-error" style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 300px;
                    color: var(--text-muted);
                    text-align: center;
                    padding: 2rem;
                    background: var(--bg-secondary);
                    border-radius: 8px;
                    border: 1px solid var(--border-color);
                ">
                    <div style="font-size: 3rem; margin-bottom: 1rem;"><i class="fa-solid fa-triangle-exclamation"></i></div>
                    <h3 style="color: var(--text-primary); margin-bottom: 0.5rem;">Không thể hiển thị biểu đồ</h3>
                    <p style="margin-bottom: 1rem;">${message}</p>
                    <button onclick="window.StatisticsModule.renderExpenseChart()" style="
                        background: var(--primary-color);
                        color: white;
                        border: none;
                        padding: 0.5rem 1rem;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: 500;
                    ">
                        Thử lại
                    </button>
                </div>
            `;
        }
    }

    /**
     * Utility methods
     */
    destroyChart(chartName) {
        if (this.charts[chartName]) {
            try {
                this.charts[chartName].destroy();
            } catch (error) {
                console.warn(`Error destroying ${chartName} chart:`, error);
            }
            this.charts[chartName] = null;
        }
    }

    /**
     * ✅ FIXED: Get category color with proper error handling and distinct colors
     */
    getCategoryColor(categoryName, index = 0) {
        try {
            const safeIndex = (typeof index === 'number' && !isNaN(index) && isFinite(index)) ? index : 0;
            // Directly use the index to cycle through the color palette
            // This ensures categories displayed together have different colors
            return this.config.chartColors[safeIndex % this.config.chartColors.length];
        } catch (error) {
            console.warn('Error in getCategoryColor:', error);
            // Ultimate fallback
            const basicColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
            const safeIndex = (typeof index === 'number' && !isNaN(index) && isFinite(index)) ? index : 0;
            return basicColors[Math.abs(safeIndex) % basicColors.length];
        }
    }

    /**
     * ✅ FIXED: Clean transaction data with comprehensive validation
     */
    cleanTransactionData(transactions) {
        if (!Array.isArray(transactions)) {
            console.warn('cleanTransactionData: input is not an array');
            return [];
        }
        
        return transactions.map(tx => {
            if (!tx || typeof tx !== 'object') {
                return null; // Will be filtered out later
            }
            
            // Create a clean copy to avoid modifying original
            const cleanTx = { ...tx };
            
            // ✅ SUPER SAFE: Clean category with comprehensive validation
			if (cleanTx.category !== undefined) {
				let categoryValue = cleanTx.category;

				// Handle all possible invalid category values
				if (categoryValue === null || 
					categoryValue === undefined || 
					categoryValue === 'undefined' || 
					categoryValue === 'null' ||
					(typeof categoryValue === 'string' && categoryValue.trim() === '') ||
					(typeof categoryValue !== 'string' && typeof categoryValue !== 'number')) {

					cleanTx.category = 'Không phân loại';
                } else {
                    // Convert to string and trim safely
                    try {
                        const stringValue = String(categoryValue).trim();
                        cleanTx.category = stringValue || 'Không phân loại';
                    } catch (error) {
                        console.warn('Error converting category to string:', error);
                        cleanTx.category = 'Không phân loại';
                    }
                }
            } else {
                // No category property, set default
                cleanTx.category = 'Không phân loại';
            }
            
            // ✅ Additional cleaning for other critical fields
            if (cleanTx.amount !== undefined) {
                const amount = parseFloat(cleanTx.amount);
                if (isNaN(amount) || !isFinite(amount)) {
                    cleanTx.amount = 0;
                } else {
                    cleanTx.amount = amount;
                }
            }
            
            // Ensure type is valid
            if (!cleanTx.type || (cleanTx.type !== 'Thu' && cleanTx.type !== 'Chi')) {
                if (cleanTx.amount < 0) {
                    cleanTx.type = 'Chi';
                    cleanTx.amount = Math.abs(cleanTx.amount);
                } else {
                    cleanTx.type = 'Chi'; // Default to expense if unclear
                }
            }
            
            return cleanTx;
        }).filter(tx => tx !== null); // Remove null entries
    }

    /**
     * Get category icon
     */
    getCategoryIcon(categoryName) {
        try {
            // UPDATED: Always use the central Utils function
            if (typeof Utils !== 'undefined' && Utils?.UIUtils?.getCategoryIcon) {
                return Utils.UIUtils.getCategoryIcon(categoryName);
            }
            return 'fa-solid fa-box'; // Fallback icon class
        } catch (error) {
            return 'fa-solid fa-box';
        }
    }

    /**
     * ✅ FIXED: Format currency with safe fallback
     */
    formatCurrency(amount, showSymbol = true) {
        try {
            // Try Utils first
            if (typeof Utils !== 'undefined' && Utils?.CurrencyUtils?.formatCurrency) {
                try {
                    return Utils.CurrencyUtils.formatCurrency(amount, 'VND', showSymbol);
                } catch (utilsError) {
                    console.warn('Utils.CurrencyUtils.formatCurrency failed:', utilsError);
                }
            }
            
            // Fallback formatting
            const numAmount = parseFloat(amount) || 0;
            const formatted = new Intl.NumberFormat('vi-VN').format(numAmount);
            return showSymbol ? `${formatted} ₫` : formatted;
        } catch (error) {
            console.warn('Error formatting currency:', error);
            const num = (amount || 0).toLocaleString();
            return showSymbol ? `${num} ₫` : num;
        }
    }

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        if (!text || typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Update element safely
     */
    updateElement(element, content) {
        if (element && content !== undefined) {
            element.textContent = content;
        }
    }

    /**
     * Show message
     */
    showMessage(message, type = 'info', duration = 3000) {
        try {
            if (typeof Utils !== 'undefined' && Utils?.UIUtils?.showMessage) {
                Utils.UIUtils.showMessage(message, type, duration);
            } else {
                console.log(`${type.toUpperCase()}: ${message}`);
            }
        } catch (error) {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    /**
     * Debounce function
     */
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
    }

    /**
     * Setup theme change observer
     */
    setupThemeObserver() {
        try {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                        if (this.isInitialized) {
                            setTimeout(() => {
                                if (typeof this.updateChartDefaults === 'function') {
                                    this.updateChartDefaults();
                                }
                                if (typeof this.refreshCharts === 'function') {
                                    this.refreshCharts();
                                }
                            }, 100);
                        }
                    }
                });
            });

            if (!document.body) {
                console.warn('ThemeObserver: document.body not available yet. Observer not started.');
                return;
            }

            observer.observe(document.body, {
                attributes: true,
                attributeFilter: ['data-theme']
            });

            this.observers.push(observer);
        } catch (error) {
            console.warn('Could not setup theme_observer:', error);
        }
    }

    /**
     * Update Chart.js global defaults
     */
    updateChartDefaults() {
        if (typeof Chart === 'undefined') return;

        const isDark = document.body.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#e2e8f0' : '#374151';
        const gridColor = isDark ? '#475569' : '#e5e7eb';

        Chart.defaults.color = textColor;
        Chart.defaults.borderColor = gridColor;
        Chart.defaults.backgroundColor = 'rgba(0,0,0,0.1)';
    }

    /**
     * Handle initialization error
     */
    handleInitError(error) {
        console.error('Statistics module initialization failed:', error);
        
        try {
            this.showMessage('Có lỗi khi khởi tạo module thống kê. Một số tính năng có thể không hoạt động.', 'error');
        } catch (e) {
            console.error('Failed to show error message:', e);
        }
    }

    /**
     * Render Monthly Cashflow Chart with bulletproof error handling
     */
    renderMonthlyCashflowChart() {
        try {
            console.log('🔄 Rendering monthly cashflow chart...');
            
            const container = document.getElementById('monthly-cashflow-container');
            if (!container) {
                console.warn('Monthly cashflow container not found - skipping render');
                return;
            }

            if (!this.app || !this.app.data || !Array.isArray(this.app.data.transactions)) {
                console.warn('No transaction data available for monthly cashflow');
                this.showMonthlyCashflowNoData(container, 'Chưa có dữ liệu giao dịch');
                return;
            }

            const monthlyData = this.getMonthlyFinancialData(6);
            
            if (!Array.isArray(monthlyData) || monthlyData.length === 0) {
                console.warn('No monthly financial data available');
                this.showMonthlyCashflowNoData(container, 'Chưa có dữ liệu luồng tiền');
                return;
            }

            const validData = monthlyData.filter(item => {
                return item && 
                       typeof item === 'object' &&
                       typeof item.label === 'string' &&
                       typeof item.income === 'number' &&
                       typeof item.expense === 'number' &&
                       typeof item.profit === 'number' &&
                       !isNaN(item.income) &&
                       !isNaN(item.expense) &&
                       !isNaN(item.profit);
            });

            if (validData.length === 0) {
                console.warn('No valid monthly data after filtering');
                this.showMonthlyCashflowNoData(container, 'Dữ liệu luồng tiền không hợp lệ');
                return;
            }

            this.destroyMonthlyCashflowChart();

            const canvasId = 'monthly-cashflow-chart';
            const canvas = this.createMonthlyCashflowCanvas(container, canvasId);
            
            if (!canvas) {
                console.error('Failed to create canvas for monthly cashflow chart');
                this.showMonthlyCashflowError(container, 'Không thể tạo canvas cho biểu đồ');
                return;
            }

            let ctx;
            try {
                ctx = canvas.getContext('2d');
                if (!ctx) {
                    throw new Error('Cannot get 2D context from canvas');
                }
            } catch (contextError) {
                console.error('Failed to get canvas context:', contextError);
                this.showMonthlyCashflowError(container, 'Không thể khởi tạo canvas context');
                return;
            }

            const isDark = document.body.getAttribute('data-theme') === 'dark';
            const textColor = isDark ? '#e2e8f0' : '#374151';
            const gridColor = isDark ? '#475569' : '#e5e7eb';
            const isMobile = this.isMobileDevice();

            const chartData = {
                labels: validData.map(item => item.label),
                datasets: [{
                    label: 'Thu nhập',
                    data: validData.map(item => item.income),
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    borderColor: '#10b981',
                    borderWidth: isMobile ? 2 : 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: isMobile ? 3 : 4,
                    pointHoverRadius: isMobile ? 5 : 6
                }, {
                    label: 'Chi tiêu',
                    data: validData.map(item => item.expense),
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    borderColor: '#ef4444',
                    borderWidth: isMobile ? 2 : 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: isMobile ? 3 : 4,
                    pointHoverRadius: isMobile ? 5 : 6
                }, {
                    label: 'Lợi nhuận',
                    data: validData.map(item => item.profit),
                    backgroundColor: function(context) {
                        try {
                            const value = context.parsed ? context.parsed.y : 0;
                            return value >= 0 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(234, 179, 8, 0.2)';
                        } catch (error) {
                            return 'rgba(59, 130, 246, 0.2)';
                        }
                    },
                    borderColor: function(context) {
                        try {
                            const value = context.parsed ? context.parsed.y : 0;
                            return value >= 0 ? '#3b82f6' : '#eab308';
                        } catch (error) {
                            return '#3b82f6';
                        }
                    },
                    borderWidth: isMobile ? 1 : 2,
                    fill: false,
                    type: 'line',
                    pointRadius: isMobile ? 3 : 4,
                    pointHoverRadius: isMobile ? 5 : 6
                }]
            };

            const chartOptions = {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: isMobile ? 400 : 600,
                    easing: 'easeOutQuart'
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: textColor,
                            usePointStyle: true,
                            padding: isMobile ? 15 : 20,
                            font: {
                                size: isMobile ? 11 : 13
                            }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(0,0,0,0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        titleFont: {
                            size: isMobile ? 12 : 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: isMobile ? 11 : 13
                        },
                        padding: isMobile ? 8 : 12,
                        cornerRadius: 6,
                        callbacks: {
                            label: (context) => {
                                try {
                                    const value = context.raw || 0;
                                    const formatted = this.formatCurrency(value);
                                    return `${context.dataset.label}: ${formatted}`;
                                } catch (error) {
                                    console.warn('Error formatting tooltip:', error);
                                    return `${context.dataset.label}: ${context.raw || 0}`;
                                }
                            }
                        }
                    },
                    datalabels: {
                        display: false // Disable for cleaner look
                    }
                },
                scales: {
                    x: {
                        ticks: { 
                            color: textColor,
                            font: {
                                size: isMobile ? 9 : 11
                            },
                            maxTicksLimit: isMobile ? 4 : 6
                        },
                        grid: { 
                            color: gridColor, 
                            drawBorder: false,
                            lineWidth: isMobile ? 0.5 : 1
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: textColor,
                            font: {
                                size: isMobile ? 9 : 11
                            },
                            maxTicksLimit: isMobile ? 4 : 6,
                            callback: (value) => {
                                try {
                                    return this.formatCurrency(value, false);
                                } catch (error) {
                                    return value.toLocaleString();
                                }
                            }
                        },
                        grid: { 
                            color: gridColor,
                            lineWidth: isMobile ? 0.5 : 1
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            };

            try {
                this.charts.monthlyFlow = new Chart(ctx, {
                    type: 'line',
                    data: chartData,
                    options: chartOptions
                });
                
                console.log('✅ Monthly cashflow chart rendered successfully');
                
            } catch (chartError) {
                console.error('Failed to create Chart.js instance:', chartError);
                this.showMonthlyCashflowError(container, 'Không thể tạo biểu đồ: ' + chartError.message);
                return;
            }

        } catch (error) {
            console.error('❌ Error rendering monthly cashflow chart:', error);
            
            try {
                const container = document.getElementById('monthly-cashflow-container');
                if (container) {
                    this.showMonthlyCashflowError(container, 'Có lỗi khi hiển thị biểu đồ luồng tiền');
                }
            } catch (fallbackError) {
                console.error('Even error display failed:', fallbackError);
            }
        }
    }

    /**
     * Helper to safely destroy monthly cashflow chart
     */
    destroyMonthlyCashflowChart() {
        if (this.charts.monthlyFlow) {
            try {
                this.charts.monthlyFlow.destroy();
                console.log('🗑️ Monthly cashflow chart destroyed');
            } catch (error) {
                console.warn('Error destroying monthly cashflow chart:', error);
            }
            this.charts.monthlyFlow = null;
        }
    }

    /**
     * Helper to create canvas for monthly cashflow chart
     */
    createMonthlyCashflowCanvas(container, canvasId) {
        try {
            container.innerHTML = '';
            const canvas = document.createElement('canvas');
            canvas.id = canvasId;
            canvas.style.width = '100%';
            canvas.style.height = '300px';
            canvas.setAttribute('role', 'img');
            canvas.setAttribute('aria-label', 'Biểu đồ luồng tiền hàng tháng');
            container.appendChild(canvas);
            return canvas;
        } catch (error) {
            console.error('Error creating canvas:', error);
            return null;
        }
    }

    /**
     * Helper to show no data message for monthly cashflow
     */
    showMonthlyCashflowNoData(container, message = 'Chưa có dữ liệu luồng tiền') {
        try {
            container.innerHTML = `
                <div class="no-data-message" style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 250px;
                    color: var(--text-muted, #6b7280);
                    text-align: center;
                    padding: 2rem;
                ">
                    <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"><i class="fa-solid fa-chart-line"></i></div>
                    <h4 style="margin-bottom: 0.5rem; color: var(--text-primary, #1f2937); font-weight: 600;">
                        ${message}
                    </h4>
                    <p style="color: var(--text-muted, #6b7280); margin-bottom: 1.5rem;">
                        Cần ít nhất 1 tháng có giao dịch để hiển thị biểu đồ luồng tiền
                    </p>
                    <button onclick="window.location.hash = '#transactions'" style="
                        background: var(--primary-color, #3b82f6);
                        color: white;
                        border: none;
                        padding: 0.75rem 1.5rem;
                        border-radius: 8px;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    ">
                        Thêm giao dịch
                    </button>
                </div>
            `;
        } catch (error) {
            console.error('Error showing no data message:', error);
            container.innerHTML = `<div style="text-align: center; padding: 2rem; color: #6b7280;">${message}</div>`;
        }
    }

    /**
     * Helper to show error message for monthly cashflow
     */
    showMonthlyCashflowError(container, message = 'Có lỗi khi hiển thị biểu đồ') {
        try {
            container.innerHTML = `
                <div class="chart-error" style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 250px;
                    color: var(--text-muted, #6b7280);
                    text-align: center;
                    padding: 2rem;
                    background: var(--bg-secondary, #f9fafb);
                    border-radius: 8px;
                    border: 1px solid var(--border-color, #e5e7eb);
                ">
                    <div style="font-size: 3rem; margin-bottom: 1rem;"><i class="fa-solid fa-triangle-exclamation"></i></div>
                    <h4 style="color: var(--text-primary, #1f2937); margin-bottom: 0.5rem; font-weight: 600;">
                        Không thể hiển thị biểu đồ luồng tiền
                    </h4>
                    <p style="margin-bottom: 1.5rem;">${message}</p>
                    <button onclick="window.StatisticsModule.renderMonthlyCashflowChart()" style="
                        background: var(--primary-color, #3b82f6);
                        color: white;
                        border: none;
                        padding: 0.5rem 1rem;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: 500;
                        transition: all 0.2s ease;
                    ">
                        Thử lại
                    </button>
                </div>
            `;
        } catch (error) {
            console.error('Error showing error message:', error);
            container.innerHTML = `<div style="text-align: center; padding: 2rem; color: #ef4444;">${message}</div>`;
        }
    }

    /**
     * Get Monthly Financial Data with comprehensive validation
     */
    getMonthlyFinancialData(monthsCount = 6) {
        try {
            console.log(`📊 Getting monthly financial data for ${monthsCount} months...`);
            
            const safeMonthsCount = typeof monthsCount === 'number' && !isNaN(monthsCount) && isFinite(monthsCount) && monthsCount > 0 ? Math.min(Math.floor(monthsCount), 24) : 6;

            if (!this.app || !this.app.data || !Array.isArray(this.app.data.transactions)) {
                console.warn('No transaction data available for monthly analysis');
                return [];
            }

            const transactions = this.app.data.transactions;
            if (transactions.length === 0) {
                console.warn('Transaction array is empty');
                return [];
            }

            const now = new Date();
            const monthlyData = [];

            for (let i = safeMonthsCount - 1; i >= 0; i--) {
                try {
                    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    if (isNaN(targetDate.getTime())) continue;

                    const year = targetDate.getFullYear();
                    const month = targetDate.getMonth();

                    const monthStart = new Date(year, month, 1);
                    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
                    if (isNaN(monthStart.getTime()) || isNaN(monthEnd.getTime())) continue;

                    const monthTransactions = transactions.filter(tx => {
                        try {
                            if (!tx || typeof tx !== 'object' || tx.isTransfer === true || !tx.datetime || typeof tx.datetime !== 'string') return false;
                            const txDate = new Date(tx.datetime);
                            if (isNaN(txDate.getTime())) return false;
                            return txDate >= monthStart && txDate <= monthEnd;
                        } catch (filterError) { return false; }
                    });

                    let stats;
                    try {
                        stats = this.calculateStatistics(monthTransactions);
                        if (!stats || typeof stats !== 'object') throw new Error('Invalid stats object');
                        stats.totalIncome = (typeof stats.totalIncome === 'number' && !isNaN(stats.totalIncome)) ? stats.totalIncome : 0;
                        stats.totalExpense = (typeof stats.totalExpense === 'number' && !isNaN(stats.totalExpense)) ? stats.totalExpense : 0;
                    } catch (statsError) {
                        stats = { totalIncome: 0, totalExpense: 0 };
                    }

                    let monthLabel;
                    try {
                        monthLabel = targetDate.toLocaleString('vi-VN', { month: 'short', year: 'numeric' });
                        if (!monthLabel || typeof monthLabel !== 'string') {
                            const monthNames = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
                            monthLabel = `${monthNames[month]} ${year}`;
                        }
                    } catch (labelError) { monthLabel = `${month + 1}/${year}`; }

                    const profit = stats.totalIncome - stats.totalExpense;
                    
                    monthlyData.push({
                        label: monthLabel,
                        income: stats.totalIncome,
                        expense: stats.totalExpense,
                        profit: profit,
                        transactionCount: monthTransactions.length,
                        year: year,
                        month: month + 1
                    });
                } catch (monthError) {
                    console.warn(`Error processing month ${i}:`, monthError);
                    continue;
                }
            }

            const validMonthlyData = monthlyData.filter(item => 
                item && typeof item === 'object' && typeof item.label === 'string' &&
                typeof item.income === 'number' && !isNaN(item.income) &&
                typeof item.expense === 'number' && !isNaN(item.expense) &&
                typeof item.profit === 'number' && !isNaN(item.profit)
            );

            validMonthlyData.sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);

            console.log(`✅ Generated ${validMonthlyData.length} months of financial data`);
            return validMonthlyData;
        } catch (error) {
            console.error('❌ Error getting monthly financial data:', error);
            return [];
        }
    }

    /**
     * Render Budget Tracking
     */
    renderBudgetTracking() {
        try {
            const container = document.getElementById('budget-tracking-container');
            if (!container) return;

            const currentTransactions = this.getFilteredTransactions();
            const stats = this.calculateStatistics(currentTransactions);
            const budgetSettings = this.getBudgetSettings();
            
            if (Object.keys(budgetSettings).length === 0) {
                container.innerHTML = `
                    <div class="no-budget-message" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem; text-align: center; color: var(--text-muted);">
                        <div style="font-size: 3rem; margin-bottom: 1rem;"><i class="fa-solid fa-bullseye"></i></div>
                        <h4 style="margin-bottom: 0.5rem; color: var(--text-primary);">Chưa thiết lập ngân sách</h4>
                        <p style="margin-bottom: 1.5rem;">Hãy thiết lập ngân sách cho từng danh mục để theo dõi chi tiêu</p>
                        <button onclick="window.StatisticsModule.showBudgetSetup()" style="background: var(--primary-color); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 500; cursor: pointer;">Thiết lập ngân sách</button>
                    </div>
                `;
                return;
            }

            container.innerHTML = '';

            Object.entries(stats.expenseByCategory).forEach(([category, spent], index) => { // Added index
                const budget = budgetSettings[category];
                if (!budget) return;

                const percentage = Math.min((spent / budget) * 100, 100);
                const isOverBudget = spent > budget;
                const remaining = budget - spent;

                const budgetItem = document.createElement('div');
                budgetItem.className = 'budget-item';
                budgetItem.style.cssText = `background: var(--bg-secondary); border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem; border: 1px solid var(--border-color);`;

                const color = this.getCategoryColor(category, index); // Pass index
                const progressColor = isOverBudget ? '#ef4444' : color;
                const iconClass = this.getCategoryIcon(category);

                budgetItem.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <span style="font-size: 1.5rem; width: 24px; text-align: center;"><i class="${iconClass}"></i></span>
                            <div>
                                <h4 style="margin: 0; color: var(--text-primary); font-weight: 600;">${category}</h4>
                                <p style="margin: 0; color: var(--text-muted); font-size: 0.875rem;">
                                    ${this.formatCurrency(spent)} / ${this.formatCurrency(budget)}
                                </p>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="color: ${isOverBudget ? '#ef4444' : '#10b981'}; font-weight: 600; font-size: 1.125rem;">${percentage.toFixed(1)}%</div>
                            <div style="color: var(--text-muted); font-size: 0.875rem;">${isOverBudget ? 'Vượt' : 'Còn'} ${this.formatCurrency(Math.abs(remaining))}</div>
                        </div>
                    </div>
                    <div style="background: var(--bg-tertiary); border-radius: 6px; height: 8px; overflow: hidden;">
                        <div style="background: ${progressColor}; height: 100%; width: ${Math.min(percentage, 100)}%; transition: width 0.3s ease; ${isOverBudget ? 'animation: pulse 2s infinite;' : ''}"></div>
                    </div>
                `;
                container.appendChild(budgetItem);
            });

            const setupButton = document.createElement('button');
            setupButton.style.cssText = `width: 100%; padding: 1rem; background: var(--bg-secondary); border: 2px dashed var(--border-color); border-radius: 12px; color: var(--text-muted); cursor: pointer; transition: all 0.2s ease; margin-top: 1rem;`;
            setupButton.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem;"><span style="font-size: 1.25rem;"><i class="fa-solid fa-gear"></i></span><span>Quản lý ngân sách</span></div>`;
            setupButton.onclick = () => this.showBudgetSetup();
            container.appendChild(setupButton);
        } catch (error) {
            console.error('Error rendering budget tracking:', error);
        }
    }

    /**
     * Get Budget Settings
     */
    getBudgetSettings() {
        try {
            const saved = localStorage.getItem('budgetSettings');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Error getting budget settings:', error);
            return {};
        }
    }

    /**
     * Save Budget Settings
     */
    saveBudgetSettings(settings) {
        try {
            localStorage.setItem('budgetSettings', JSON.stringify(settings));
            this.renderBudgetTracking(); // Refresh display
        } catch (error) {
            console.error('Error saving budget settings:', error);
        }
    }

    /**
     * Show Budget Setup Modal
     */
    showBudgetSetup() {
        try {
            const currentSettings = this.getBudgetSettings();
            const transactions = this.getFilteredTransactions();
            const stats = this.calculateStatistics(transactions);
            const categories = Object.keys(stats.expenseByCategory);

            if (categories.length === 0) {
                this.showMessage('Chưa có danh mục chi tiêu nào để thiết lập ngân sách', 'warning');
                return;
            }

            const modal = document.createElement('div');
            modal.className = 'budget-setup-modal';
            modal.style.cssText = `position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;`;

            modal.innerHTML = `
                <div style="background: var(--bg-primary); border-radius: 16px; padding: 2rem; max-width: 500px; width: 100%; max-height: 80vh; overflow-y: auto; border: 1px solid var(--border-color);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                        <h3 style="margin: 0; color: var(--text-primary);">🎯 Thiết lập ngân sách</h3>
                        <button id="close-budget-modal" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-muted); padding: 0.25rem;">&times;</button>
                    </div>
                    <div id="budget-categories">
                        ${categories.map(category => `
                            <div style="margin-bottom: 1.5rem;">
                                <label style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; color: var(--text-primary); font-weight: 500;">
                                    <span style="font-size: 1.25rem; width: 24px; text-align:center;"><i class="${this.getCategoryIcon(category)}"></i></span>
                                    ${category}
                                </label>
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <input type="number" id="budget-${category.replace(/\s+/g, '-')}" placeholder="Nhập ngân sách tháng" value="${currentSettings[category] || ''}" style="flex: 1; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-secondary); color: var(--text-primary);" min="0" step="10000">
                                    <span style="color: var(--text-muted); font-size: 0.875rem;">₫</span>
                                </div>
                                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">
                                    Chi tiêu tháng này: ${this.formatCurrency(stats.expenseByCategory[category] || 0)}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                        <button id="save-budget" style="flex: 1; padding: 0.75rem; background: var(--primary-color); color: white; border: none; border-radius: 8px; font-weight: 500; cursor: pointer;">Lưu ngân sách</button>
                        <button id="cancel-budget" style="padding: 0.75rem 1.5rem; background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 8px; cursor: pointer;">Hủy</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            const closeBudgetModal = () => document.body.removeChild(modal);
            document.getElementById('close-budget-modal').onclick = closeBudgetModal;
            document.getElementById('cancel-budget').onclick = closeBudgetModal;
            document.getElementById('save-budget').onclick = () => {
                const newSettings = {};
                categories.forEach(category => {
                    const inputId = `budget-${category.replace(/\s+/g, '-')}`;
                    const input = document.getElementById(inputId);
                    const value = parseFloat(input.value);
                    if (!isNaN(value) && value > 0) newSettings[category] = value;
                });
                this.saveBudgetSettings(newSettings);
                closeBudgetModal();
                this.showMessage('Đã lưu thiết lập ngân sách', 'success');
            };
            modal.onclick = (e) => { if (e.target === modal) closeBudgetModal(); };
        } catch (error) {
            console.error('Error showing budget setup:', error);
            this.showMessage('Có lỗi khi hiển thị thiết lập ngân sách', 'error');
        }
    }

    /**
     * Refresh all components
     */
    async refreshAll() {
        if (!this.isInitialized) return;

        try {
            console.log('🔄 Refreshing all statistics...');
            this.updateSummaryCards();
            await this.renderExpenseChart();
            this.renderTrendChart();
            this.renderComparisonChart();
            this.renderMonthlyCashflowChart();
            this.renderBudgetTracking();
            this.updateDetailedStats();
            console.log('✅ All statistics refreshed');
        } catch (error) {
            console.error('Error refreshing all statistics:', error);
            this.showMessage('Có lỗi khi cập nhật thống kê', 'error');
        }
    }

    /**
     * Refresh only charts
     */
    refreshCharts() {
        try {
            this.renderExpenseChart();
            this.renderTrendChart();
            this.renderComparisonChart();
            this.renderMonthlyCashflowChart();
            this.renderBudgetTracking();
        } catch (error) {
            console.error('Error refreshing charts:', error);
        }
    }

    /**
     * Public refresh method
     */
    refresh() {
        return this.refreshAll();
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        console.log('💀 Destroying Statistics Module...');
        try {
            Object.keys(this.charts).forEach(chartName => this.destroyChart(chartName));
            this.eventListeners.forEach(({ element, event, handler, options }) => element?.removeEventListener(event, handler, options));
            this.observers.forEach(observer => observer?.disconnect());
            this.hideCustomDatePicker();
            this.eventListeners = [];
            this.observers = [];
            this.elements = {};
            this.charts = { expense: null, trend: null, comparison: null, monthlyFlow: null };
            this.isInitialized = false;
            this.isRendering = false;
            this.resizeTimeout = null;
            console.log('✅ Statistics Module destroyed');
        } catch (error) {
            console.error('Error destroying Statistics Module:', error);
        }
    }

    /**
     * Detect if device is mobile
     */
    isMobileDevice() {
        return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    /**
     * Get mobile-optimized chart configuration
     */
    getMobileChartConfig(baseConfig, chartType = 'doughnut') {
        const isMobile = this.isMobileDevice();
        const isSmallMobile = window.innerWidth <= 480;

        const mobileConfig = {
            type: baseConfig.type,
            data: JSON.parse(JSON.stringify(baseConfig.data)),
            options: this.deepCloneWithFunctions(baseConfig.options)
        };

        mobileConfig.options = { ...mobileConfig.options, responsive: true, maintainAspectRatio: false, devicePixelRatio: window.devicePixelRatio || 1, animation: { duration: isSmallMobile ? 400 : 600, easing: 'easeOutQuart' }, interaction: { intersect: false, mode: 'nearest', axis: 'xy' }, plugins: { ...mobileConfig.options.plugins, tooltip: { ...mobileConfig.options.plugins?.tooltip, titleFont: { size: isSmallMobile ? 12 : 14, weight: 'bold' }, bodyFont: { size: isSmallMobile ? 11 : 13 }, padding: isSmallMobile ? 8 : 12 }, legend: { ...mobileConfig.options.plugins?.legend, display: chartType !== 'doughnut' }}};

        if (chartType === 'doughnut') return this.getMobileDoughnutConfig(mobileConfig, isSmallMobile);
        else if (chartType === 'line') return this.getMobileLineConfig(mobileConfig, isSmallMobile);
        else if (chartType === 'bar') return this.getMobileBarConfig(mobileConfig, isSmallMobile);
        return mobileConfig;
    }

    /**
     * Deep clone with function preservation
     */
    deepCloneWithFunctions(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (typeof obj === 'function') return obj;
        if (obj instanceof Date) return new Date(obj);
        if (Array.isArray(obj)) return obj.map(item => this.deepCloneWithFunctions(item));
        
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) cloned[key] = this.deepCloneWithFunctions(obj[key]);
        }
        return cloned;
    }

    /**
     * Mobile-optimized doughnut chart configuration
     */
    getMobileDoughnutConfig(config, isSmallMobile) {
        config.options = { ...config.options, cutout: isSmallMobile ? '55%' : '60%', radius: isSmallMobile ? '75%' : '80%', layout: { padding: { top: isSmallMobile ? 20 : 30, bottom: isSmallMobile ? 20 : 30, left: isSmallMobile ? 10 : 20, right: isSmallMobile ? 10 : 20 }}, plugins: { ...config.options.plugins, datalabels: { display: false }}};
        return config;
    }

    /**
     * Mobile-optimized line chart configuration
     */
    getMobileLineConfig(config, isSmallMobile) {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#e2e8f0' : '#374151';
        const gridColor = isDark ? '#475569' : '#e5e7eb';
        config.options = { ...config.options, scales: { x: { ticks: { color: textColor, font: { size: isSmallMobile ? 10 : 12 }, maxTicksLimit: isSmallMobile ? 4 : 7 }, grid: { color: gridColor, drawBorder: false }}, y: { beginAtZero: true, ticks: { color: textColor, font: { size: isSmallMobile ? 10 : 12 }, maxTicksLimit: isSmallMobile ? 3 : 5, callback: (value) => this.formatCurrency(value, false)}, grid: { color: gridColor }}}, elements: { point: { radius: isSmallMobile ? 3 : 4, hoverRadius: isSmallMobile ? 5 : 6 }, line: { borderWidth: isSmallMobile ? 2 : 3 }}, plugins: { ...config.options.plugins, legend: { display: true, position: 'top', labels: { color: textColor, font: { size: isSmallMobile ? 11 : 13 }, boxWidth: isSmallMobile ? 10 : 15, padding: isSmallMobile ? 10 : 15 }}}};
        return config;
    }

    /**
     * Mobile-optimized bar chart configuration
     */
    getMobileBarConfig(config, isSmallMobile) {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#e2e8f0' : '#374151';
        const gridColor = isDark ? '#475569' : '#e5e7eb';
        config.options = { ...config.options, indexAxis: 'x', scales: { x: { ticks: { color: textColor, font: { size: isSmallMobile ? 10 : 12 }, maxRotation: isSmallMobile ? 45 : 0, minRotation: isSmallMobile ? 45 : 0 }, grid: { color: gridColor, drawBorder: false, display: false }}, y: { beginAtZero: true, ticks: { color: textColor, font: { size: isSmallMobile ? 10 : 12 }, maxTicksLimit: isSmallMobile ? 4 : 6, callback: (value) => this.formatCurrency(value, false)}, grid: { color: gridColor, lineWidth: isSmallMobile ? 0.5 : 1 }}}, elements: { bar: { borderRadius: isSmallMobile ? 4 : 6, borderSkipped: false }}, plugins: { ...config.options.plugins, legend: { display: true, position: 'top', labels: { color: textColor, font: { size: isSmallMobile ? 11 : 13 }, boxWidth: isSmallMobile ? 10 : 15, boxHeight: isSmallMobile ? 10 : 15, padding: isSmallMobile ? 10 : 15, usePointStyle: false }}}};
        return config;
    }

    /**
     * Update existing renderExpenseChart method (mobile-optimized)
     */
    /**
     * Update existing renderExpenseChart method (mobile-optimized)
     */
    async renderExpenseChart() {
        if (this.isRendering) return;
        this.isRendering = true;

        try {
            console.log('📊 Rendering expense chart...');

            if (!this.elements.expenseChartCanvas || !this.elements.expenseChartContainer) {
                throw new Error('Chart canvas or container not found');
            }

            const transactions = this.getFilteredTransactions();
            const stats = this.calculateStatistics(transactions);
            const chartType = this.elements.chartType?.value || 'doughnut';

            this.destroyChart('expense');

            if (Object.keys(stats.expenseByCategory).length === 0 || stats.totalExpense === 0) {
                this.showNoDataMessage();
                return;
            }

            // Logic sắp xếp xen kẽ
            const allSortedCategories = Object.entries(stats.expenseByCategory)
                .sort(([, a], [, b]) => b - a);
            let topCategories = allSortedCategories.slice(0, this.config.maxCategories);

            let interleavedCategories = [];
            if (topCategories.length > 2) {
                const midPoint = Math.ceil(topCategories.length / 2);
                const largeHalf = topCategories.slice(0, midPoint);
                const smallHalf = topCategories.slice(midPoint).reverse();
                for (let i = 0; i < largeHalf.length; i++) {
                    interleavedCategories.push(largeHalf[i]);
                    if (smallHalf[i]) {
                        interleavedCategories.push(smallHalf[i]);
                    }
                }
            } else {
                interleavedCategories = topCategories;
            }
            const categories = interleavedCategories;

            // <<< START: LOGIC MỚI - Xác định DUY NHẤT lát bánh cuối cùng >>>
            const forceRightNames = [];
            if (categories.length > 0) {
                const lastPieceName = categories[categories.length - 1][0];
                forceRightNames.push(lastPieceName);
            }
            // <<< END: LOGIC MỚI >>>

            const chartData = this.buildChartData(categories, chartType);
            let chartOptions = this.buildChartOptions(chartType, stats.totalExpense);

            const mobileConfig = this.getMobileChartConfig({
                type: chartType,
                data: chartData,
                options: chartOptions
            }, chartType);

            this.elements.expenseChartCanvas.style.display = 'block';
            this.elements.expenseChartContainer.innerHTML = '';
            this.elements.expenseChartContainer.appendChild(this.elements.expenseChartCanvas);

            const ctx = this.elements.expenseChartCanvas.getContext('2d');
            
            if (this.isMobileDevice()) {
                const container = this.elements.expenseChartContainer;
                if (container.offsetWidth > 0 && container.offsetHeight > 0) {
                    const rect = container.getBoundingClientRect();
                    const dpr = window.devicePixelRatio || 1;
                    this.elements.expenseChartCanvas.width = rect.width * dpr;
                    this.elements.expenseChartCanvas.height = rect.height * dpr;
                    ctx.scale(dpr, dpr);
                    this.elements.expenseChartCanvas.style.width = `${rect.width}px`;
                    this.elements.expenseChartCanvas.style.height = `${rect.height}px`;
                } else {
                    console.warn("Expense chart container has no dimensions. Canvas size might be incorrect.");
                }
            }

            this.charts.expense = new Chart(ctx, {
                type: mobileConfig.type,
                data: mobileConfig.data,
                options: mobileConfig.options,
                plugins: chartType === 'doughnut' ? this.getDoughnutPlugins(stats.totalExpense, forceRightNames) : []
            });

            this.updateExpenseLegend(categories, stats.totalExpense);

            console.log('✅ Expense chart rendered with interleaved layout and forced last piece.');

        } catch (error) {
            console.error('❌ Error rendering expense chart:', error);
            this.showChartError('Không thể hiển thị biểu đồ: ' + error.message);
        } finally {
            this.isRendering = false;
        }
    }
    /**
     * ✅ FIXED: Update expense legend to correctly render icons
     */
    updateExpenseLegend(categories, totalExpense) {
        if (!this.elements.expenseLegend) return;

        this.elements.expenseLegend.innerHTML = '';

        if (categories.length === 0) return;

        categories.forEach(([categoryName, amount], index) => {
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';

            const color = this.getCategoryColor(categoryName, index);
            const percentage = ((amount / totalExpense) * 100).toFixed(1);
			const iconInfo = this.getCategoryIcon(categoryName); // Đổi tên biến để rõ ràng hơn

			legendItem.innerHTML = `
				<div class="legend-content">
					<div class="legend-header">
						<span class="legend-icon">
							<i class="${iconInfo.value}"></i> </span>
                        </span>
                        <div class="legend-label-wrapper">
                            <div class="legend-label" title="${this.escapeHtml(categoryName)}">${this.escapeHtml(categoryName)}</div>
                            <div class="legend-amount-percentage">
                                <span class="legend-amount">${this.formatCurrency(amount)}</span>
                                <span class="legend-percentage">(${percentage}%)</span>
                            </div>
                        </div>
                    </div>
                    <div class="legend-color" style="background-color: ${color}; border: 2px solid ${color};"></div>
                </div>
            `;

            this.elements.expenseLegend.appendChild(legendItem);
        });
    }

    /**
     * Update existing renderTrendChart method (mobile-optimized)
     */
    renderTrendChart() {
        try {
            if (!this.elements.trendChartCanvas) return;

            const allTransactions = this.app.data.transactions.filter(tx => tx && !tx.isTransfer);
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - (this.config.trendDays - 1));

            const dailyData = {};
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                dailyData[d.toISOString().split('T')[0]] = { income: 0, expense: 0 };
            }

            allTransactions.forEach(tx => {
                try {
                    const txDate = new Date(tx.datetime);
                    const dateKey = txDate.toISOString().split('T')[0];

                    if (txDate >= startDate && txDate <= endDate) {
                        const amount = parseFloat(tx.amount) || 0;
                        if (tx.type === 'Thu') {
                            dailyData[dateKey].income += amount;
                        } else if (tx.type === 'Chi') {
                            dailyData[dateKey].expense += amount;
                        }
                    }
                } catch (e) {
                    console.warn('Invalid date in transaction:', tx.datetime);
                }
            });

            const dates = Object.keys(dailyData).sort();
            const labels = dates.map(date => {
                const d = new Date(date);
                return `${d.getDate()}/${d.getMonth() + 1}`;
            });
            
            const incomeData = dates.map(date => dailyData[date].income);
            const expenseData = dates.map(date => dailyData[date].expense);

            this.destroyChart('trend');

            if (incomeData.every(val => val === 0) && expenseData.every(val => val === 0)) {
                if(this.elements.trendChartCanvas) this.elements.trendChartCanvas.style.display = 'none';
                return;
            }

            if(this.elements.trendChartCanvas) this.elements.trendChartCanvas.style.display = 'block';

            const isDark = document.body.getAttribute('data-theme') === 'dark';
            const textColor = isDark ? '#e2e8f0' : '#374151';
            const gridColor = isDark ? '#475569' : '#e5e7eb';

            const chartData = {
                labels: labels,
                datasets: [{
                    label: 'Thu nhập',
                    data: incomeData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: this.isMobileDevice() ? 3 : 4,
                    pointHoverRadius: this.isMobileDevice() ? 5 : 6,
                    borderWidth: this.isMobileDevice() ? 2 : 3
                }, {
                    label: 'Chi tiêu',
                    data: expenseData,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: this.isMobileDevice() ? 3 : 4,
                    pointHoverRadius: this.isMobileDevice() ? 5 : 6,
                    borderWidth: this.isMobileDevice() ? 2 : 3
                }]
            };
            
            const baseOptions = {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: this.isMobileDevice() ? 400 : 500 },
                plugins: {
                    legend: {
                        labels: { color: textColor, font: { size: this.isMobileDevice() ? 10 : 12 }}
                    },
                    tooltip: {
                        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(0,0,0,0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        callbacks: {
                            label: (context) => {
                                const value = context.raw;
                                const short = this.formatCurrency(value);
                                return `${context.dataset.label}: ${short}`;
                            }
                        }
                    },
                    datalabels: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        ticks: { color: textColor, font: { size: this.isMobileDevice() ? 9 : 11 }, maxTicksLimit: this.isMobileDevice() ? 4 : 7 },
                        grid: { color: gridColor, drawBorder: false }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: textColor,
                            font: { size: this.isMobileDevice() ? 9 : 11 },
                            maxTicksLimit: this.isMobileDevice() ? 3 : 5,
                            callback: (value) => this.formatCurrency(value, false)
                        },
                        grid: { color: gridColor }
                    }
                }
            };

            const mobileConfig = this.getMobileChartConfig({
                type: 'line',
                data: chartData,
                options: baseOptions
            }, 'line');

            const ctx = this.elements.trendChartCanvas.getContext('2d');
            this.charts.trend = new Chart(ctx, mobileConfig);

        } catch (error) {
            console.error('Error rendering trend chart:', error);
            if (this.elements.trendChartCanvas) {
                this.elements.trendChartCanvas.style.display = 'none';
            }
        }
    }

    /**
     * Update existing renderComparisonChart method (mobile-optimized)
     */
    renderComparisonChart() {
        try {
            if (!this.elements.comparisonChartCanvas) return;

            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            const currentMonthTransactions = this.app.data.transactions.filter(tx => {
                if (!tx?.datetime || tx.isTransfer) return false;
                const txDate = new Date(tx.datetime);
                return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
            });

            const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
            const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
            const prevMonthTransactions = this.app.data.transactions.filter(tx => {
                if (!tx?.datetime || tx.isTransfer) return false;
                const txDate = new Date(tx.datetime);
                return txDate.getMonth() === prevMonth && txDate.getFullYear() === prevYear;
            });

            const currentStats = this.calculateStatistics(currentMonthTransactions);
            const prevStats = this.calculateStatistics(prevMonthTransactions);

            this.destroyChart('comparison');

            if (currentStats.totalIncome === 0 && currentStats.totalExpense === 0 &&
                prevStats.totalIncome === 0 && prevStats.totalExpense === 0) {
                if (this.elements.comparisonChartCanvas) this.elements.comparisonChartCanvas.style.display = 'none';
                return;
            }

            if (this.elements.comparisonChartCanvas) this.elements.comparisonChartCanvas.style.display = 'block';

            const currentMonthName = new Date(currentYear, currentMonth).toLocaleString('vi-VN', { month: 'long' });
            const prevMonthName = new Date(prevYear, prevMonth).toLocaleString('vi-VN', { month: 'long' });

            const isDark = document.body.getAttribute('data-theme') === 'dark';
            const textColor = isDark ? '#e2e8f0' : '#374151';
            const gridColor = isDark ? '#475569' : '#e5e7eb';

            const chartData = {
                labels: ['Thu nhập', 'Chi tiêu'],
                datasets: [{
                    label: currentMonthName,
                    data: [currentStats.totalIncome, currentStats.totalExpense],
                    backgroundColor: '#3b82f6',
                    borderColor: '#3b82f6',
                    borderWidth: 1,
                    borderRadius: this.isMobileDevice() ? 4 : 6,
                    borderSkipped: false
                }, {
                    label: prevMonthName,
                    data: [prevStats.totalIncome, prevStats.totalExpense],
                    backgroundColor: '#94a3b8',
                    borderColor: '#94a3b8',
                    borderWidth: 1,
                    borderRadius: this.isMobileDevice() ? 4 : 6,
                    borderSkipped: false
                }]
            };
            
            const baseOptions = {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: this.isMobileDevice() ? 400 : 500 },
                plugins: {
                    legend: {
                        labels: { color: textColor, font: { size: this.isMobileDevice() ? 10 : 12 } }
                    },
                    tooltip: {
                        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(0,0,0,0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        callbacks: {
                            label: (context) => {
                                const value = context.raw;
                                const short = this.formatCurrency(value);
                                return `${context.dataset.label}: ${short}`;
                            }
                        }
                    },
                    datalabels: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        ticks: { color: textColor, font: { size: this.isMobileDevice() ? 9 : 11 } },
                        grid: { color: gridColor, drawBorder: false, display: false }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: textColor,
                            font: { size: this.isMobileDevice() ? 9 : 11 },
                            maxTicksLimit: this.isMobileDevice() ? 3 : 5,
                            callback: (value) => this.formatCurrency(value, false)
                        },
                        grid: { color: gridColor }
                    }
                }
            };

            const mobileConfig = this.getMobileChartConfig({
                type: 'bar',
                data: chartData,
                options: baseOptions
            }, 'bar');

            const ctx = this.elements.comparisonChartCanvas.getContext('2d');
            this.charts.comparison = new Chart(ctx, mobileConfig);

        } catch (error) {
            console.error('Error rendering comparison chart:', error);
            if (this.elements.comparisonChartCanvas) {
                this.elements.comparisonChartCanvas.style.display = 'none';
            }
        }
    }

    /**
     * Handle window resize for mobile optimization
     */
    handleResize() {
        if (!this.isInitialized) return;

        // Debounce resize for mobile performance
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            try {
                console.log('Handling resize, refreshing charts...');
                this.refreshCharts();
            } catch (error) {
                console.error('Error handling resize:', error);
            }
        }, this.isMobileDevice() ? 300 : 100);
    }
}

// Create global instance
window.StatisticsModule = new StatisticsModule();