/**
 * STATISTICS MODULE - IMPROVED VERSION WITH LEADER LINES
 * Handles statistics calculations, charts, and data visualization
 */

class StatisticsModule {
    constructor() {
        this.app = null;
        this.currentPeriod = 'month';
        this.customDateRange = { start: null, end: null };

        // Chart instances
        this.charts = {
            expense: null,
            trend: null,
            comparison: null
        };

        // DOM elements
        this.elements = {};

        // Event listeners for cleanup
        this.eventListeners = [];

        // Chart.js global defaults for text colors
        this.chartDefaults = {
            fontColor: '#374151',
            gridColor: '#e5e7eb',
            tooltipBg: 'rgba(0,0,0,0.8)',
            tooltipColor: '#ffffff'
        };
    }

    /**
     * Initialize the module
     */
    init(app) {
        this.app = app;
        console.log('📊 Initializing Statistics Module...');

        try {
            this.initializeElements();
            this.initializePeriodFilter();
            this.initializeChartTypeSelector();

            // Register Chart.js plugins with DataLabels
            if (typeof Chart !== 'undefined' && typeof ChartDataLabels !== 'undefined') {
                Chart.register(ChartDataLabels);
            }

            // Apply initial theme colors to charts
            this.updateChartColors();

            this.refresh();

            console.log('✅ Statistics Module initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Statistics Module:', error);
            Utils.UIUtils.showMessage('Có lỗi khi khởi tạo module thống kê', 'error');
        }
    }

    /**
     * Initialize DOM elements with null checks
     */
    initializeElements() {
        this.elements = {
            // Period filter
            statsPeriod: document.getElementById('stats-period'),
            statsCustomDatePicker: null,

            // Summary cards
            totalIncome: document.getElementById('stats-total-income'),
            totalExpense: document.getElementById('stats-total-expense'),
            netBalance: document.getElementById('stats-net-balance'),
            incomeChange: document.getElementById('stats-income-change'),
            expenseChange: document.getElementById('stats-expense-change'),
            balanceChange: document.getElementById('stats-balance-change'),

            // Chart elements
            chartType: document.getElementById('chart-type'),
            expenseChartCanvas: document.getElementById('expense-chart'),
            expenseChartContainer: document.getElementById('expense-chart-container'),
            expenseLegend: document.getElementById('expense-legend'),
            trendChartCanvas: document.getElementById('trend-chart'),
            comparisonChartCanvas: document.getElementById('comparison-chart'),

            // Detailed stats
            detailedStatsBody: document.getElementById('detailed-stats-tbody')
        };

        const criticalElements = ['statsPeriod', 'expenseChartCanvas', 'trendChartCanvas', 'comparisonChartCanvas'];
        criticalElements.forEach(key => {
            if (!this.elements[key]) {
                console.warn(`Statistics Module: Critical element '${key}' not found.`);
            }
        });
    }

    /**
     * Initialize period filter with cleanup tracking
     */
    initializePeriodFilter() {
        if (this.elements.statsPeriod) {
            const handler = () => {
                this.currentPeriod = this.elements.statsPeriod.value;
                if (this.currentPeriod === 'custom') {
                    this.showCustomDatePicker();
                } else {
                    this.customDateRange = { start: null, end: null };
                    this.refresh();
                }
            };

            this.elements.statsPeriod.addEventListener('change', handler);
            this.eventListeners.push({
                element: this.elements.statsPeriod,
                event: 'change',
                handler: handler
            });
        }
    }

    /**
     * Show custom date picker inputs for the 'custom' period
     */
    showCustomDatePicker() {
        if (!this.elements.statsPeriod.parentNode) return;

        // Remove existing date pickers if present
        if (this.elements.statsCustomDatePicker) {
            this.elements.statsCustomDatePicker.remove();
            this.elements.statsCustomDatePicker = null;
        }

        const datePickerContainer = document.createElement('div');
        datePickerContainer.className = 'flex flex-col gap-2 mt-4';

        datePickerContainer.innerHTML = `
            <label for="custom-start-date" class="form-label">Từ ngày:</label>
            <input type="date" id="custom-start-date" class="filter-date form-input">
            <label for="custom-end-date" class="form-label">Đến ngày:</label>
            <input type="date" id="custom-end-date" class="filter-date form-input">
            <button id="apply-custom-date" class="submit-btn mt-2">Áp dụng</button>
        `;

        this.elements.statsPeriod.parentNode.appendChild(datePickerContainer);
        this.elements.statsCustomDatePicker = datePickerContainer;

        const startDateInput = document.getElementById('custom-start-date');
        const endDateInput = document.getElementById('custom-end-date');
        const applyButton = document.getElementById('apply-custom-date');

        // Set initial values if they exist
        if (this.customDateRange.start) startDateInput.value = this.customDateRange.start.toISOString().split('T')[0];
        if (this.customDateRange.end) endDateInput.value = this.customDateRange.end.toISOString().split('T')[0];

        const applyHandler = () => {
            const start = startDateInput.value ? new Date(startDateInput.value) : null;
            const end = endDateInput.value ? new Date(endDateInput.value) : null;

            if (start && end && start > end) {
                Utils.UIUtils.showMessage('Ngày bắt đầu không thể sau ngày kết thúc', 'error');
                return;
            }

            this.customDateRange = { start, end: end ? new Date(end.setHours(23, 59, 59, 999)) : null };
            this.refresh();
            Utils.UIUtils.showMessage('Đã áp dụng khoảng thời gian tùy chỉnh', 'success', 2000);
        };
        applyButton.addEventListener('click', applyHandler);
        this.eventListeners.push({ element: applyButton, event: 'click', handler: applyHandler });
    }

    /**
     * Get filtered transactions based on the current period or custom date range
     */
    getFilteredTransactions() {
        // Kiểm tra app và data tồn tại
        if (!this.app || !this.app.data || !Array.isArray(this.app.data.transactions)) {
            console.warn('App data not available for statistics');
            return [];
        }

        let filters = { excludeTransfers: true };
        
        if (this.currentPeriod === 'custom') {
            if (this.customDateRange.start && this.customDateRange.end) {
                return this.app.data.transactions.filter(tx => {
                    if (!tx || !tx.datetime) return false;
                    const txDate = new Date(tx.datetime);
                    return txDate >= this.customDateRange.start && 
                           txDate <= this.customDateRange.end && 
                           !tx.isTransfer;
                });
            }
            return [];
        } else {
            filters.period = this.currentPeriod;
            
            // Kiểm tra hàm getFilteredTransactions tồn tại
            if (typeof this.app.getFilteredTransactions === 'function') {
                return this.app.getFilteredTransactions(filters);
            } else {
                console.error('app.getFilteredTransactions is not a function');
                return [];
            }
        }
    }

    /**
     * Get filtered transactions for a previous period to calculate change
     */
    getPreviousPeriodTransactions() {
        let prevStart, prevEnd;
        const now = new Date();

        switch (this.currentPeriod) {
            case 'week': // <<< THÊM KHỐI NÀY
                const today = new Date();
                today.setHours(0, 0, 0, 0); // Bắt đầu ngày hôm nay
                const dayOfWeek = today.getDay(); // 0 = CN, 1 = T2, ..., 6 = T7
                const monday = new Date(today);
                // Lấy ngày T2 của tuần này
                monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)); 

                prevEnd = new Date(monday.getTime() - 1); // CN tuần trước 23:59:59
                prevStart = new Date(prevEnd.getTime() - (7 * 24 * 60 * 60 * 1000) + 1); // T2 tuần trước 00:00:00
                prevStart.setHours(0, 0, 0, 0); // Đảm bảo là 00:00:00
                break; // <<< KẾT THÚC KHỐI THÊM
			case 'month':
                prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
                break;
            case 'quarter':
                const currentQuarter = Math.floor(now.getMonth() / 3);
                prevStart = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
                prevEnd = new Date(now.getFullYear(), currentQuarter * 3, 0, 23, 59, 59);
                break;
            case 'year':
                prevStart = new Date(now.getFullYear() - 1, 0, 1);
                prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
                break;
            case 'custom':
                if (this.customDateRange.start && this.customDateRange.end) {
                    const diffMs = this.customDateRange.end.getTime() - this.customDateRange.start.getTime();
                    prevEnd = new Date(this.customDateRange.start.getTime() - 1);
                    prevStart = new Date(prevEnd.getTime() - diffMs);
                } else {
                    return [];
                }
                break;
            default:
                return this.getFilteredTransactions();
        }

        if (!prevStart || !prevEnd || isNaN(prevStart.getTime()) || isNaN(prevEnd.getTime())) {
            console.warn('Invalid previous period dates for calculation.');
            return [];
        }

        return this.app.data.transactions.filter(tx => {
            if (!tx || !tx.datetime || tx.isTransfer) return false;
            const txDate = new Date(tx.datetime);
            return txDate >= prevStart && txDate <= prevEnd;
        });
    }

    /**
     * Update summary cards
     */
    updateSummaryCards() {
        const currentTransactions = this.getFilteredTransactions();
        const prevTransactions = this.getPreviousPeriodTransactions();

        const currentStats = this.calculateStatistics(currentTransactions);
        const prevStats = this.calculateStatistics(prevTransactions);

        if (this.elements.totalIncome) this.elements.totalIncome.textContent = Utils.CurrencyUtils.formatCurrency(currentStats.totalIncome);
        if (this.elements.totalExpense) this.elements.totalExpense.textContent = Utils.CurrencyUtils.formatCurrency(currentStats.totalExpense);
        if (this.elements.netBalance) {
            this.elements.netBalance.textContent = Utils.CurrencyUtils.formatCurrency(currentStats.netBalance);
            this.elements.netBalance.classList.remove('text-success', 'text-danger');
            if (currentStats.netBalance >= 0) {
                this.elements.netBalance.classList.add('text-success');
            } else {
                this.elements.netBalance.classList.add('text-danger');
            }
        }

        this.updateChangePercentage(this.elements.incomeChange, prevStats.totalIncome, currentStats.totalIncome);
        this.updateChangePercentage(this.elements.expenseChange, prevStats.totalExpense, currentStats.totalExpense);
        this.updateChangePercentage(this.elements.balanceChange, prevStats.netBalance, currentStats.netBalance);
    }

    /**
     * Initialize chart type selector with cleanup tracking
     */
    initializeChartTypeSelector() {
        if (this.elements.chartType) {
            const handler = () => {
                this.renderExpenseChart();
            };

            this.elements.chartType.addEventListener('change', handler);
            this.eventListeners.push({
                element: this.elements.chartType,
                event: 'change',
                handler: handler
            });
        }
    }

    /**
     * Calculate statistics with proper null/undefined handling
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
            console.warn('calculateStatistics: transactions is not an array');
            return stats;
        }

        transactions.forEach(tx => {
            if (!tx || typeof tx !== 'object') {
                console.warn('Invalid transaction object:', tx);
                return;
            }

            const amount = parseFloat(tx.amount) || 0;
            const type = tx.type;
            const isTransfer = Boolean(tx.isTransfer);

            if (type === 'Thu' && !isTransfer) {
                stats.totalIncome += amount;
                stats.incomeTransactions++;
            } else if (type === 'Chi' && !isTransfer) {
                stats.totalExpense += amount;
                stats.expenseTransactions++;

                const category = tx.category || 'Không phân loại';
                stats.expenseByCategory[category] = (stats.expenseByCategory[category] || 0) + amount;

                if (tx.datetime) {
                    const dateKey = tx.datetime.split('T')[0];
                    stats.dailyExpenses[dateKey] = (stats.dailyExpenses[dateKey] || 0) + amount;
                }
            }
        });

        stats.netBalance = stats.totalIncome - stats.totalExpense;

        const categoryEntries = Object.entries(stats.expenseByCategory);
        if (categoryEntries.length > 0) {
            const topCategory = categoryEntries.sort(([,a], [,b]) => b - a)[0];
            stats.topExpenseCategory = topCategory[0];
            stats.topExpenseAmount = topCategory[1];
        }

        const days = Object.keys(stats.dailyExpenses).length;
        if (days > 0) {
            stats.averageDaily = stats.totalExpense / days;
        }

        return stats;
    }

    /**
     * Update change percentage display with better error handling
     */
    updateChangePercentage(element, oldValue, newValue) {
        if (!element) {
            console.warn('updateChangePercentage: element is null');
            return;
        }

        const oldVal = parseFloat(oldValue) || 0;
        const newVal = parseFloat(newValue) || 0;

        const change = Utils.MathUtils.calculatePercentageChange(oldVal, newVal);

        if (isNaN(change)) {
            element.textContent = '0%';
            element.className = 'stats-change neutral';
            return;
        }

        const isPositive = change >= 0;

        element.textContent = `${isPositive ? '+' : ''}${change}%`;
        element.className = `stats-change ${isPositive ? 'positive' : 'negative'}`;
        if (change === 0) {
             element.classList.add('neutral');
        } else {
             element.classList.remove('neutral');
        }
    }

    /**
     * Render expense chart with leader lines and external labels
     */
    renderExpenseChart() {
        if (!this.elements.expenseChartCanvas || !this.elements.expenseChartContainer) {
            console.warn('Expense chart canvas or container element not found');
            return;
        }

        try {
            const transactions = this.getFilteredTransactions();
            if (!transactions || !Array.isArray(transactions)) {
                console.warn('Invalid transactions data for chart');
                this.elements.expenseChartContainer.innerHTML = '<p class="no-data-text text-center">Không có dữ liệu chi tiêu để hiển thị biểu đồ.</p>';
                if (this.charts.expense) this.charts.expense.destroy();
                this.charts.expense = null;
                return;
            }

            const stats = this.calculateStatistics(transactions);

            if (this.charts.expense && typeof this.charts.expense.destroy === 'function') {
                this.charts.expense.destroy();
                this.charts.expense = null;
            }

            const chartType = this.elements.chartType ? this.elements.chartType.value : 'doughnut';
            const categories = Object.entries(stats.expenseByCategory)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10);

            if (categories.length === 0 || stats.totalExpense === 0) {
                this.elements.expenseChartCanvas.style.display = 'none';
                this.elements.expenseChartContainer.innerHTML = '<p class="no-data-text text-center">Không có dữ liệu chi tiêu để hiển thị biểu đồ.</p>';
                if (this.elements.expenseLegend) this.elements.expenseLegend.innerHTML = '';
                return;
            }

            this.elements.expenseChartCanvas.style.display = 'block';
            this.elements.expenseChartContainer.innerHTML = '';
            this.elements.expenseChartContainer.appendChild(this.elements.expenseChartCanvas);

            const labels = categories.map(([category]) => category);
            const data = categories.map(([, amount]) => amount);
            const colors = categories.map((_, index) =>
                Utils.UIUtils.getCategoryColor(labels[index], index)
            );

            const chartConfig = {
                type: chartType,
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: colors,
                        borderColor: colors.map(color => {
                            const rgba = Utils.UIUtils.hexToRgba(color, 0.8);
                            return rgba || color;
                        }),
                        borderWidth: 2,
                        hoverOffset: 4,
                        barThickness: chartType === 'bar' ? 20 : undefined
                    }]
                },
                options: this.getChartOptions(chartType, stats.totalExpense)
            };

            // Thêm custom plugins cho doughnut chart
            if (chartType === 'doughnut') {
                const isDark = document.body.getAttribute('data-theme') === 'dark';
                chartConfig.plugins = [{
                    id: 'customLeaderLines',
                    afterDatasetsDraw: (chart) => {
                        const ctx = chart.ctx;
                        const meta = chart.getDatasetMeta(0);
                        
                        ctx.save();
                        ctx.strokeStyle = isDark ? '#64748b' : '#94a3b8';
                        ctx.lineWidth = 1.5;
                        ctx.setLineDash([]);

                        meta.data.forEach((element, index) => {
                            const percentage = (chart.data.datasets[0].data[index] / stats.totalExpense) * 100;
                            if (percentage < 2) return;

                            const centerX = element.x;
                            const centerY = element.y;
                            
                            const startAngle = element.startAngle;
                            const endAngle = element.endAngle;
                            const midAngle = startAngle + (endAngle - startAngle) / 2;
                            
                            const outerRadius = element.outerRadius;
                            const startX = centerX + Math.cos(midAngle) * outerRadius;
                            const startY = centerY + Math.sin(midAngle) * outerRadius;
                            
                            const extendRadius = outerRadius + 20;
                            const midX = centerX + Math.cos(midAngle) * extendRadius;
                            const midY = centerY + Math.sin(midAngle) * extendRadius;
                            
                            const isRightSide = Math.cos(midAngle) >= 0;
                            const endX = isRightSide ? midX + 25 : midX - 25;
                            const endY = midY;
                            
                            ctx.beginPath();
                            ctx.moveTo(startX, startY);
                            ctx.lineTo(midX, midY);
                            ctx.lineTo(endX, endY);
                            ctx.stroke();
                            
                            ctx.beginPath();
                            ctx.fillStyle = chart.data.datasets[0].backgroundColor[index];
                            ctx.arc(startX, startY, 3, 0, 2 * Math.PI);
                            ctx.fill();
                        });
                        
                        ctx.restore();
                    }
                }];
            }

            const ctx = this.elements.expenseChartCanvas.getContext('2d');
            this.charts.expense = new Chart(ctx, chartConfig);

            this.updateExpenseLegend(categories, stats.totalExpense);

        } catch (error) {
            console.error('Error rendering expense chart:', error);
            if (this.elements.expenseChartCanvas) {
                this.elements.expenseChartCanvas.style.display = 'none';
            }
            if (this.elements.expenseChartContainer) {
                 this.elements.expenseChartContainer.innerHTML = '<p class="no-data-text text-center">Có lỗi khi hiển thị biểu đồ chi tiêu.</p>';
            }
        }
    }

    /**
     * Get chart options with improved datalabels for leader lines
     */
    getChartOptions(chartType, totalAmount) {
        if (!chartType || typeof totalAmount !== 'number') {
            console.warn('Invalid chart options parameters');
            return {};
        }

        const isDark = document.body.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#e2e8f0' : '#374151';
        const gridColor = isDark ? '#475569' : '#e5e7eb';
        const tooltipBg = isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(0,0,0,0.8)';
        const tooltipColor = '#ffffff';

        const baseOptions = {
            responsive: true,
            maintainAspectRatio: false,
			layout: {  // ← THÊM PHẦN NÀY
				padding: {
					top: 50,
					bottom: 50,
					left: 50,
					right: 50
				}
			},
            animation: {
                duration: 800,
                easing: 'easeOutQuart'
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: tooltipBg,
                    titleColor: tooltipColor,
                    bodyColor: tooltipColor,
                    callbacks: {
                        label: (context) => {
                            const value = context.raw || 0;
                            const percentage = Utils.MathUtils.calculatePercentage(value, totalAmount);
                            return `${context.label}: ${Utils.CurrencyUtils.formatCurrency(value)} (${percentage}%)`;
                        }
                    },
                    boxPadding: 6
                }
            }
        };

        if (chartType === 'doughnut') {
            return {
                ...baseOptions,
                cutout: '65%',
                radius: '85%',
                plugins: {
                    ...baseOptions.plugins,
					datalabels: {
						display: true, // BẮT BUỘC hiển thị luôn
						formatter: (value, context) => {
							const categoryName = context.chart.data.labels[context.dataIndex];
							const percentage = ((value / totalAmount) * 100).toFixed(1);
							const icon = Utils.UIUtils.getCategoryIcon ? Utils.UIUtils.getCategoryIcon(categoryName) : '📦';
							return `${icon} ${percentage}%`;
						},
						anchor: 'end',
						align: 'end',
						offset: 20,
						color: textColor,
						backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)',
						borderColor: isDark ? '#475569' : '#e5e7eb',
						borderWidth: 1,
						borderRadius: 4,
						padding: 4,
						font: {
							size: 10,
							weight: 'bold'
						},
						textAlign: 'center',
						clip: false
					}
                }
            };
        } else {
            return {
                ...baseOptions,
                indexAxis: 'y',
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            color: textColor,
                            callback: (value) => Utils.CurrencyUtils.formatCurrency(value, 'VND', false)
                        },
                        grid: {
                            color: gridColor,
                            drawBorder: false
                        }
                    },
                    y: {
                        ticks: {
                            color: textColor
                        },
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    ...baseOptions.plugins,
                    datalabels: {
                        anchor: 'end',
                        align: 'end',
                        offset: 4,
                        formatter: (value) => Utils.CurrencyUtils.formatCurrency(value, 'VND', false),
                        color: textColor,
                        font: {
                            weight: 'bold',
                            size: 10
                        }
                    }
                }
            };
        }
    }

    /**
     * Update the custom legend for the expense chart
     */
    updateExpenseLegend(categories, totalExpense) {
        if (!this.elements.expenseLegend) return;

        this.elements.expenseLegend.innerHTML = '';

        if (categories.length === 0) return;

        categories.forEach(([categoryName, amount], index) => {
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';

            const color = Utils.UIUtils.getCategoryColor(categoryName, index);
            const percentage = Utils.MathUtils.calculatePercentage(amount, totalExpense);
            const icon = Utils.UIUtils.getCategoryIcon(categoryName);

            legendItem.innerHTML = `
                <div class="legend-content">
                    <div class="legend-header">
                        <span class="legend-icon">${icon}</span>
                        <div class="legend-label-wrapper">
                            <div class="legend-label">${this.escapeHtml(categoryName)}</div>
                            <div class="legend-amount-percentage">
                                <span class="legend-amount">${Utils.CurrencyUtils.formatCurrency(amount)}</span>
                                <span class="legend-percentage">(${percentage}%)</span>
                            </div>
                        </div>
                    </div>
                    <div class="legend-color" style="background-color: ${color};"></div>
                </div>
            `;
            this.elements.expenseLegend.appendChild(legendItem);
        });
    }

    /**
     * Render Trend Chart
     */
    renderTrendChart() {
        if (!this.elements.trendChartCanvas) {
            console.warn('Trend chart canvas element not found');
            return;
        }

        try {
            const allTransactions = this.app.data.transactions.filter(tx => tx && !tx.isTransfer);

            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 6);

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
                    console.warn('Invalid transaction date for trend chart:', tx.datetime, e);
                }
            });

            const dates = Object.keys(dailyData).sort();
            const incomeData = dates.map(date => dailyData[date].income);
            const expenseData = dates.map(date => dailyData[date].expense);
            const labels = dates.map(date => {
                const d = new Date(date);
                return `${d.getDate()}/${d.getMonth() + 1}`;
            });

            if (this.charts.trend && typeof this.charts.trend.destroy === 'function') {
                this.charts.trend.destroy();
                this.charts.trend = null;
            }

            if (incomeData.length === 0 && expenseData.length === 0) {
                this.elements.trendChartCanvas.style.display = 'none';
                return;
            } else {
                this.elements.trendChartCanvas.style.display = 'block';
            }

            const isDark = document.body.getAttribute('data-theme') === 'dark';
            const textColor = isDark ? '#e2e8f0' : '#374151';
            const gridColor = isDark ? '#475569' : '#e5e7eb';

            const ctx = this.elements.trendChartCanvas.getContext('2d');
            this.charts.trend = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Thu nhập',
                        data: incomeData,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 3,
                        pointHoverRadius: 5
                    }, {
                        label: 'Chi tiêu',
                        data: expenseData,
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 3,
                        pointHoverRadius: 5
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 500
                    },
                    plugins: {
                        legend: {
                            labels: {
                                color: textColor,
                                font: {
                                    size: 12
                                }
                            }
                        },
                        tooltip: {
                            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(0,0,0,0.8)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            callbacks: {
                                label: (context) => {
                                    return `${context.dataset.label}: ${Utils.CurrencyUtils.formatCurrency(context.raw)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: {
                                color: textColor
                            },
                            grid: {
                                color: gridColor,
                                drawBorder: false
                            }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: {
                                color: textColor,
                                callback: (value) => Utils.CurrencyUtils.formatCurrency(value, 'VND', false)
                            },
                            grid: {
                                color: gridColor
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error rendering trend chart:', error);
            if (this.elements.trendChartCanvas) {
                this.elements.trendChartCanvas.style.display = 'none';
            }
        }
    }

    /**
     * Render Monthly Comparison Chart
     */
    renderComparisonChart() {
        if (!this.elements.comparisonChartCanvas) {
            console.warn('Comparison chart canvas element not found');
            return;
        }

        try {
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            
            const currentMonthTransactions = this.app.data.transactions.filter(tx => {
                if (!tx || !tx.datetime || tx.isTransfer) return false;
                const txDate = new Date(tx.datetime);
                return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
            });

            const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
            const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
            
            const prevMonthTransactions = this.app.data.transactions.filter(tx => {
                if (!tx || !tx.datetime || tx.isTransfer) return false;
                const txDate = new Date(tx.datetime);
                return txDate.getMonth() === prevMonth && txDate.getFullYear() === prevYear;
            });

            const currentMonthStats = this.calculateStatistics(currentMonthTransactions);
            const prevMonthStats = this.calculateStatistics(prevMonthTransactions);

            if (this.charts.comparison && typeof this.charts.comparison.destroy === 'function') {
                this.charts.comparison.destroy();
                this.charts.comparison = null;
            }

            if (currentMonthStats.totalIncome === 0 && currentMonthStats.totalExpense === 0 &&
                prevMonthStats.totalIncome === 0 && prevMonthStats.totalExpense === 0) {
                this.elements.comparisonChartCanvas.style.display = 'none';
                return;
            } else {
                this.elements.comparisonChartCanvas.style.display = 'block';
            }

            const currentMonthName = new Date(currentYear, currentMonth).toLocaleString('vi-VN', { month: 'long', year: 'numeric' });
            const prevMonthName = new Date(prevYear, prevMonth).toLocaleString('vi-VN', { month: 'long', year: 'numeric' });

            const labels = ['Thu nhập', 'Chi tiêu'];
            const currentData = [currentMonthStats.totalIncome, currentMonthStats.totalExpense];
            const prevData = [prevMonthStats.totalIncome, prevMonthStats.totalExpense];

            const isDark = document.body.getAttribute('data-theme') === 'dark';
            const textColor = isDark ? '#e2e8f0' : '#374151';
            const gridColor = isDark ? '#475569' : '#e5e7eb';

            const ctx = this.elements.comparisonChartCanvas.getContext('2d');
            this.charts.comparison = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: currentMonthName,
                        data: currentData,
                        backgroundColor: '#3b82f6',
                        borderColor: '#3b82f6',
                        borderWidth: 1
                    }, {
                        label: prevMonthName,
                        data: prevData,
                        backgroundColor: '#94a3b8',
                        borderColor: '#94a3b8',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 500
                    },
                    plugins: {
                        legend: {
                            labels: {
                                color: textColor,
                                font: {
                                    size: 12
                                }
                            }
                        },
                        tooltip: {
                            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(0,0,0,0.8)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            callbacks: {
                                label: (context) => {
                                    return `${context.dataset.label}: ${Utils.CurrencyUtils.formatCurrency(context.raw)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: {
                                color: textColor
                            },
                            grid: {
                                color: gridColor,
                                drawBorder: false
                            }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: {
                                color: textColor,
                                callback: (value) => Utils.CurrencyUtils.formatCurrency(value, 'VND', false)
                            },
                            grid: {
                                color: gridColor
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error rendering comparison chart:', error);
            if (this.elements.comparisonChartCanvas) {
                this.elements.comparisonChartCanvas.style.display = 'none';
            }
        }
    }

    /**
     * Update Detailed Statistics Table
     */
    updateDetailedStats() {
        if (!this.elements.detailedStatsBody) {
            console.warn('Detailed stats body element not found');
            return;
        }

        try {
            const transactions = this.getFilteredTransactions();
            const stats = this.calculateStatistics(transactions);

            this.elements.detailedStatsBody.innerHTML = '';

            const categoriesSorted = Object.entries(stats.expenseByCategory).sort(([,a], [,b]) => b - a);

            if (categoriesSorted.length === 0) {
                this.elements.detailedStatsBody.innerHTML = `
                    <tr><td colspan="4" class="no-data-text text-center py-4">Không có dữ liệu chi tiết thống kê.</td></tr>
                `;
                return;
            }

            categoriesSorted.forEach(([category, amount]) => {
                const percentage = Utils.MathUtils.calculatePercentage(amount, stats.totalExpense);
                const icon = Utils.UIUtils.getCategoryIcon(category);
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="text-left py-3 px-4">
                        <div class="flex items-center gap-3">
                            <span class="text-lg">${icon}</span>
                            <span>${this.escapeHtml(category)}</span>
                        </div>
                    </td>
                    <td class="text-right py-3 px-4 font-mono">${Utils.CurrencyUtils.formatCurrency(amount)}</td>
                    <td class="text-right py-3 px-4 font-mono font-bold text-primary">${percentage}%</td>
                    <td class="text-center py-3 px-4">
                        <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                            <div class="h-2 rounded-full transition-all duration-300" 
                                 style="width: ${percentage}%; background-color: ${Utils.UIUtils.getCategoryColor(category)};">
                            </div>
                        </div>
                    </td>
                `;
                this.elements.detailedStatsBody.appendChild(row);
            });

            const totalRow = document.createElement('tr');
            totalRow.className = 'font-bold bg-gray-100 dark:bg-gray-700 border-t-2';
            totalRow.innerHTML = `
                <td class="text-left py-3 px-4">
                    <div class="flex items-center gap-3">
                        <span class="text-lg">💰</span>
                        <span>Tổng cộng</span>
                    </div>
                </td>
                <td class="text-right py-3 px-4 font-mono">${Utils.CurrencyUtils.formatCurrency(stats.totalExpense)}</td>
                <td class="text-right py-3 px-4 font-mono">100%</td>
                <td class="text-center py-3 px-4">
                    <div class="w-full bg-primary h-2 rounded-full"></div>
                </td>
            `;
            this.elements.detailedStatsBody.appendChild(totalRow);

        } catch (error) {
            console.error('Error updating detailed statistics:', error);
            this.elements.detailedStatsBody.innerHTML = `
                <tr><td colspan="4" class="error-message text-center py-4">Có lỗi khi hiển thị thống kê chi tiết.</td></tr>
            `;
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
     * Update chart colors based on current theme
     */
    updateChartColors() {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        this.chartDefaults.fontColor = isDark ? '#e2e8f0' : '#374151';
        this.chartDefaults.gridColor = isDark ? '#475569' : '#e5e7eb';
        this.chartDefaults.tooltipBg = isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(0,0,0,0.8)';
        this.chartDefaults.tooltipColor = '#ffffff';

        if (typeof Chart !== 'undefined') {
            Chart.defaults.color = this.chartDefaults.fontColor;
            Chart.defaults.borderColor = this.chartDefaults.gridColor;
            Chart.defaults.plugins.tooltip.backgroundColor = this.chartDefaults.tooltipBg;
            Chart.defaults.plugins.tooltip.titleColor = this.chartDefaults.tooltipColor;
            Chart.defaults.plugins.tooltip.bodyColor = this.chartDefaults.tooltipColor;
        }

        this.renderExpenseChart();
        this.renderTrendChart();
        this.renderComparisonChart();
    }

    /**
     * Cleanup method to prevent memory leaks
     */
    destroy() {
        this.eventListeners.forEach(({ element, event, handler }) => {
            if (element && typeof element.removeEventListener === 'function') {
                element.removeEventListener(event, handler);
            }
        });
        this.eventListeners = [];

        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts = {
            expense: null,
            trend: null,
            comparison: null
        };

        if (this.elements.statsCustomDatePicker) {
            this.elements.statsCustomDatePicker.remove();
            this.elements.statsCustomDatePicker = null;
        }

        this.elements = {};
    }

    /**
     * Refresh the module with error handling
     */
    refresh() {
        try {
            if (this.currentPeriod !== 'custom' && this.elements.statsCustomDatePicker) {
                this.elements.statsCustomDatePicker.remove();
                this.elements.statsCustomDatePicker = null;
            }

            this.updateSummaryCards();
            this.renderExpenseChart();
            this.renderTrendChart();
            this.renderComparisonChart();
            this.updateDetailedStats();
        } catch (error) {
            console.error('Error refreshing statistics module:', error);
            Utils.UIUtils.showMessage('Có lỗi khi cập nhật thống kê', 'error');
        }
    }
}

// Listen for theme changes
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
            if (window.StatisticsModule) {
                setTimeout(() => {
                    window.StatisticsModule.updateChartColors();
                }, 100);
            }
        }
    });
});

observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['data-theme']
});

// Create global instance
window.StatisticsModule = new StatisticsModule();