/**
 * STATISTICS MODULE - COMPLETE REWRITE
 * Fixed version with improved error handling, chart rendering, and mobile support
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
            chartColors: [
                '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
                '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1',
                '#14b8a6', '#f43f5e', '#a855f7', '#22c55e', '#eab308',
                '#0ea5e9', '#8b5cf6', '#f97316', '#ec4899', '#6366f1'
            ]
        };
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
        // Remove existing picker
        this.hideCustomDatePicker();

        const container = document.createElement('div');
        container.className = 'custom-date-picker';
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
                <div>
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Từ ngày:</label>
                    <input type="date" id="custom-start-date" class="form-input" style="width: 100%;">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Đến ngày:</label>
                    <input type="date" id="custom-end-date" class="form-input" style="width: 100%;">
                </div>
            </div>
            <button id="apply-custom-date" class="submit-btn" style="width: 100%; margin-top: 1rem;">
                Áp dụng
            </button>
        `;

        this.elements.statsPeriod.parentNode.appendChild(container);
        this.elements.customDatePicker = container;

        // Setup handlers
        const applyBtn = document.getElementById('apply-custom-date');
        this.addEventListener(applyBtn, 'click', () => {
            this.applyCustomDateRange();
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

            // Update values
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
     * Render expense chart (main chart)
     */
    async renderExpenseChart() {
        if (this.isRendering) return;
        this.isRendering = true;

        try {
            console.log('📊 Rendering expense chart...');

            if (!this.elements.expenseChartCanvas || !this.elements.expenseChartContainer) {
                throw new Error('Chart canvas or container not found');
            }

            // Get data
            const transactions = this.getFilteredTransactions();
            const stats = this.calculateStatistics(transactions);
            const chartType = this.elements.chartType?.value || 'doughnut';

            console.log(`📈 Chart data: ${transactions.length} transactions, ${Object.keys(stats.expenseByCategory).length} categories`);

            // Destroy existing chart
            this.destroyChart('expense');

            // Check if we have data
            if (Object.keys(stats.expenseByCategory).length === 0 || stats.totalExpense === 0) {
                this.showNoDataMessage();
                return;
            }

            // Prepare chart data
            const categories = Object.entries(stats.expenseByCategory)
                .sort(([,a], [,b]) => b - a)
                .slice(0, this.config.maxCategories);

            const chartData = this.buildChartData(categories, chartType);
            const chartOptions = this.buildChartOptions(chartType, stats.totalExpense);

            // Show canvas and create chart
            this.elements.expenseChartCanvas.style.display = 'block';
            this.elements.expenseChartContainer.innerHTML = '';
            this.elements.expenseChartContainer.appendChild(this.elements.expenseChartCanvas);

            const ctx = this.elements.expenseChartCanvas.getContext('2d');
            this.charts.expense = new Chart(ctx, {
                type: chartType,
                data: chartData,
                options: chartOptions,
                plugins: chartType === 'doughnut' ? this.getDoughnutPlugins(stats.totalExpense) : []
            });

            // Update legend
            this.updateExpenseLegend(categories, stats.totalExpense);

            console.log('✅ Expense chart rendered successfully');

        } catch (error) {
            console.error('❌ Error rendering expense chart:', error);
            this.showChartError('Không thể hiển thị biểu đồ: ' + error.message);
        } finally {
            this.isRendering = false;
        }
    }

    /**
     * Build chart data
     */
    buildChartData(categories, chartType) {
        const labels = categories.map(([category]) => category);
        const data = categories.map(([, amount]) => amount);
        const colors = categories.map((_, index) => this.getCategoryColor(labels[index], index));

        return {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderColor: colors,
                borderWidth: 2,
                hoverOffset: chartType === 'doughnut' ? 4 : 0,
                barThickness: chartType === 'bar' ? 20 : undefined
            }]
        };
    }

    /**
     * Build chart options
     */
    buildChartOptions(chartType, totalAmount) {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#e2e8f0' : '#374151';
        const gridColor = isDark ? '#475569' : '#e5e7eb';

        const baseOptions = {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: this.config.animationDuration,
                easing: 'easeOutQuart'
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(0,0,0,0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    callbacks: {
                        label: (context) => {
                            const value = context.raw || 0;
                            const percentage = ((value / totalAmount) * 100).toFixed(1);
                            return `${context.label}: ${this.formatCurrency(value)} (${percentage}%)`;
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
                radius: '80%',
                layout: {
                    padding: {
                        top: 40,
                        bottom: 40,
                        left: 40,
                        right: 40
                    }
                },
                plugins: {
                    ...baseOptions.plugins,
                    datalabels: this.getDatalabelsConfig(totalAmount, textColor, isDark)
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
                            callback: (value) => this.formatCurrency(value, false)
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
                        formatter: (value) => this.formatCurrency(value, false),
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
     * Get datalabels config for doughnut chart
     */
    getDatalabelsConfig(totalAmount, textColor, isDark) {
        if (typeof ChartDataLabels === 'undefined') {
            return false;
        }

        return {
            display: function(context) {
                const value = context.dataset.data[context.dataIndex];
                const percentage = (value / totalAmount) * 100;
                return percentage >= 3; // Only show labels for slices >= 3%
            },
            formatter: (value, context) => {
                const categoryName = context.chart.data.labels[context.dataIndex];
                const percentage = ((value / totalAmount) * 100).toFixed(1);
                const icon = this.getCategoryIcon(categoryName);
                return `${icon} ${percentage}%`;
            },
            anchor: 'end',
            align: 'end',
            offset: 15,
            color: textColor,
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)',
            borderColor: isDark ? '#475569' : '#e5e7eb',
            borderWidth: 1,
            borderRadius: 4,
            padding: {
                top: 4,
                bottom: 4,
                left: 6,
                right: 6
            },
            font: {
                size: 10,
                weight: 'bold'
            },
            textAlign: 'center',
            clip: false
        };
    }

    /**
     * Get doughnut chart plugins
     */
    getDoughnutPlugins(totalAmount) {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        
        return [{
            id: 'customLeaderLines',
            afterDatasetsDraw: (chart) => {
                const ctx = chart.ctx;
                const meta = chart.getDatasetMeta(0);
                
                if (!meta || !meta.data) return;

                ctx.save();
                ctx.strokeStyle = isDark ? '#64748b' : '#94a3b8';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([]);

                meta.data.forEach((element, index) => {
                    try {
                        const percentage = (chart.data.datasets[0].data[index] / totalAmount) * 100;
                        if (percentage < 2) return; // Skip small slices

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
                        
                        // Draw leader line
                        ctx.beginPath();
                        ctx.moveTo(startX, startY);
                        ctx.lineTo(midX, midY);
                        ctx.lineTo(endX, endY);
                        ctx.stroke();
                        
                        // Draw connection dot
                        ctx.beginPath();
                        ctx.fillStyle = chart.data.datasets[0].backgroundColor[index];
                        ctx.arc(startX, startY, 3, 0, 2 * Math.PI);
                        ctx.fill();
                    } catch (error) {
                        console.warn('Error drawing leader line for index', index, error);
                    }
                });
                
                ctx.restore();
            }
        }];
    }

    /**
     * Update expense legend
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
            const icon = this.getCategoryIcon(categoryName);

            legendItem.innerHTML = `
                <div class="legend-content">
                    <div class="legend-header">
                        <span class="legend-icon">${icon}</span>
                        <div class="legend-label-wrapper">
                            <div class="legend-label" title="${this.escapeHtml(categoryName)}">${this.escapeHtml(categoryName)}</div>
                            <div class="legend-amount-percentage">
                                <span class="legend-amount">${this.formatCurrency(amount)}</span>
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
     * Render trend chart (7 days)
     */
    renderTrendChart() {
        try {
            if (!this.elements.trendChartCanvas) return;

            const allTransactions = this.app.data.transactions.filter(tx => tx && !tx.isTransfer);
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - (this.config.trendDays - 1));

            // Prepare daily data
            const dailyData = {};
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                dailyData[d.toISOString().split('T')[0]] = { income: 0, expense: 0 };
            }

            // Aggregate transactions
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

            // Prepare chart data
            const dates = Object.keys(dailyData).sort();
            const labels = dates.map(date => {
                const d = new Date(date);
                return `${d.getDate()}/${d.getMonth() + 1}`;
            });
            const incomeData = dates.map(date => dailyData[date].income);
            const expenseData = dates.map(date => dailyData[date].expense);

            // Destroy existing chart
            this.destroyChart('trend');

            if (incomeData.every(val => val === 0) && expenseData.every(val => val === 0)) {
                this.elements.trendChartCanvas.style.display = 'none';
                return;
            }

            this.elements.trendChartCanvas.style.display = 'block';

            // Create chart
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
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }, {
                        label: 'Chi tiêu',
                        data: expenseData,
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: { duration: 500 },
                    plugins: {
                        legend: {
                            labels: {
                                color: textColor,
                                font: { size: 12 }
                            }
                        },
                        tooltip: {
                            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(0,0,0,0.8)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            callbacks: {
                                label: (context) => {
                                    return `${context.dataset.label}: ${this.formatCurrency(context.raw)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: { color: textColor },
                            grid: { color: gridColor, drawBorder: false }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: {
                                color: textColor,
                                callback: (value) => this.formatCurrency(value, false)
                            },
                            grid: { color: gridColor }
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
     * Render comparison chart (current vs previous month)
     */
    renderComparisonChart() {
        try {
            if (!this.elements.comparisonChartCanvas) return;

            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            // Current month transactions
            const currentMonthTransactions = this.app.data.transactions.filter(tx => {
                if (!tx?.datetime || tx.isTransfer) return false;
                const txDate = new Date(tx.datetime);
                return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
            });

            // Previous month transactions
            const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
            const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
            const prevMonthTransactions = this.app.data.transactions.filter(tx => {
                if (!tx?.datetime || tx.isTransfer) return false;
                const txDate = new Date(tx.datetime);
                return txDate.getMonth() === prevMonth && txDate.getFullYear() === prevYear;
            });

            const currentStats = this.calculateStatistics(currentMonthTransactions);
            const prevStats = this.calculateStatistics(prevMonthTransactions);

            // Destroy existing chart
            this.destroyChart('comparison');

            if (currentStats.totalIncome === 0 && currentStats.totalExpense === 0 &&
                prevStats.totalIncome === 0 && prevStats.totalExpense === 0) {
                this.elements.comparisonChartCanvas.style.display = 'none';
                return;
            }

            this.elements.comparisonChartCanvas.style.display = 'block';

            // Create chart
            const currentMonthName = new Date(currentYear, currentMonth).toLocaleString('vi-VN', { month: 'long', year: 'numeric' });
            const prevMonthName = new Date(prevYear, prevMonth).toLocaleString('vi-VN', { month: 'long', year: 'numeric' });

            const isDark = document.body.getAttribute('data-theme') === 'dark';
            const textColor = isDark ? '#e2e8f0' : '#374151';
            const gridColor = isDark ? '#475569' : '#e5e7eb';

            const ctx = this.elements.comparisonChartCanvas.getContext('2d');
            this.charts.comparison = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Thu nhập', 'Chi tiêu'],
                    datasets: [{
                        label: currentMonthName,
                        data: [currentStats.totalIncome, currentStats.totalExpense],
                        backgroundColor: '#3b82f6',
                        borderColor: '#3b82f6',
                        borderWidth: 1
                    }, {
                        label: prevMonthName,
                        data: [prevStats.totalIncome, prevStats.totalExpense],
                        backgroundColor: '#94a3b8',
                        borderColor: '#94a3b8',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: { duration: 500 },
                    plugins: {
                        legend: {
                            labels: {
                                color: textColor,
                                font: { size: 12 }
                            }
                        },
                        tooltip: {
                            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(0,0,0,0.8)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            callbacks: {
                                label: (context) => {
                                    return `${context.dataset.label}: ${this.formatCurrency(context.raw)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: { color: textColor },
                            grid: { color: gridColor, drawBorder: false }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: {
                                color: textColor,
                                callback: (value) => this.formatCurrency(value, false)
                            },
                            grid: { color: gridColor }
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
     * Update detailed statistics table
     */
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

            categoriesSorted.forEach(([category, amount]) => {
                const percentage = ((amount / stats.totalExpense) * 100).toFixed(1);
                const icon = this.getCategoryIcon(category);
                const color = this.getCategoryColor(category);

                const row = document.createElement('tr');
                row.className = 'border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors';
                row.innerHTML = `
                    <td class="py-3 px-4">
                        <div class="flex items-center gap-3">
                            <span class="text-lg">${icon}</span>
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
                        <span class="text-lg">💰</span>
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
        this.elements.expenseChartCanvas.style.display = 'none';
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
                <div style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.5;">📊</div>
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
                <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
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

    getCategoryColor(categoryName, index = 0) {
        try {
            if (Utils?.UIUtils?.getCategoryColor) {
                return Utils.UIUtils.getCategoryColor(categoryName, index);
            }
            return this.config.chartColors[index % this.config.chartColors.length];
        } catch (error) {
            return this.config.chartColors[0];
        }
    }

    getCategoryIcon(categoryName) {
        try {
            if (Utils?.UIUtils?.getCategoryIcon) {
                return Utils.UIUtils.getCategoryIcon(categoryName);
            }
            return '📦';
        } catch (error) {
            return '📦';
        }
    }

    formatCurrency(amount, showSymbol = true) {
        try {
            if (Utils?.CurrencyUtils?.formatCurrency) {
                return Utils.CurrencyUtils.formatCurrency(amount, 'VND', showSymbol);
            }
            
            const formatted = new Intl.NumberFormat('vi-VN').format(amount || 0);
            return showSymbol ? `${formatted} ₫` : formatted;
        } catch (error) {
            const num = (amount || 0).toLocaleString();
            return showSymbol ? `${num} ₫` : num;
        }
    }

    escapeHtml(text) {
        if (!text || typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateElement(element, content) {
        if (element && content !== undefined) {
            element.textContent = content;
        }
    }

    showMessage(message, type = 'info', duration = 3000) {
        try {
            if (Utils?.UIUtils?.showMessage) {
                Utils.UIUtils.showMessage(message, type, duration);
            } else {
                console.log(`${type.toUpperCase()}: ${message}`);
            }
        } catch (error) {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

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
                        setTimeout(() => {
                            this.updateChartDefaults();
                            this.refreshCharts();
                        }, 100);
                    }
                });
            });

            observer.observe(document.body, {
                attributes: true,
                attributeFilter: ['data-theme']
            });

            this.observers.push(observer);
        } catch (error) {
            console.warn('Could not setup theme observer:', error);
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
     * Handle window resize
     */
    handleResize() {
        if (!this.isInitialized) return;

        try {
            // Refresh all charts to handle responsive changes
            this.refreshCharts();
        } catch (error) {
            console.error('Error handling resize:', error);
        }
    }

    /**
     * Handle initialization error
     */
    handleInitError(error) {
        console.error('Statistics module initialization failed:', error);
        
        try {
            this.showMessage('Có lỗi khi khởi tạo module thống kê. Một số tính năng có thể không hoạt động.', 'error');
        } catch (e) {
            // Fallback if message system fails
            console.error('Failed to show error message:', e);
        }
    }

    /**
     * Refresh all components
     */
    async refreshAll() {
        if (!this.isInitialized) return;

        try {
            console.log('🔄 Refreshing statistics...');
            
            this.updateSummaryCards();
            await this.renderExpenseChart();
            this.renderTrendChart();
            this.renderComparisonChart();
            this.updateDetailedStats();
            
            console.log('✅ Statistics refreshed');
        } catch (error) {
            console.error('Error refreshing statistics:', error);
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
            // Destroy all charts
            Object.keys(this.charts).forEach(chartName => {
                this.destroyChart(chartName);
            });

            // Remove event listeners
            this.eventListeners.forEach(({ element, event, handler, options }) => {
                if (element && typeof element.removeEventListener === 'function') {
                    element.removeEventListener(event, handler, options);
                }
            });

            // Disconnect observers
            this.observers.forEach(observer => {
                if (observer && typeof observer.disconnect === 'function') {
                    observer.disconnect();
                }
            });

            // Clean up custom date picker
            this.hideCustomDatePicker();

            // Reset state
            this.eventListeners = [];
            this.observers = [];
            this.elements = {};
            this.charts = { expense: null, trend: null, comparison: null };
            this.isInitialized = false;
            this.isRendering = false;

            console.log('✅ Statistics Module destroyed');

        } catch (error) {
            console.error('Error destroying Statistics Module:', error);
        }
    }
}

// Create global instance
window.StatisticsModule = new StatisticsModule();