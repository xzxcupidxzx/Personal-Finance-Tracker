        Chart.register(ChartDataLabels);
        const USD_TO_VND_RATE = 25000; // Giữ nguyên hoặc cho phép người dùng cấu hình nếu muốn
        const TRANSFER_CATEGORY_OUT = "Chuyển tiền đi";
        const TRANSFER_CATEGORY_IN = "Nhận tiền chuyển";

        function migrateOriginalAmountsForOldVNDTransactions() {
            const MIGRATION_KEY_ORIGINAL_AMOUNT_VND = 'migration_original_amount_vnd_v1_done';
            if (localStorage.getItem(MIGRATION_KEY_ORIGINAL_AMOUNT_VND)) {
                console.log("Di chuyển originalAmount cho giao dịch VNĐ cũ đã được thực hiện trước đó.");
                return;
            }

            let transactions = JSON.parse(localStorage.getItem('transactions_v2') || '[]');
            let changed = false;
            if (transactions.length > 0) {
                console.log("Bắt đầu kiểm tra và di chuyển originalAmount cho giao dịch VNĐ cũ...");
                transactions.forEach(tx => {
                    if (tx.originalCurrency === 'VND' && typeof tx.originalAmount === 'number' && typeof tx.amount === 'number') {
                        // Heuristic: Nếu amount gần bằng originalAmount * 1000 VÀ originalAmount có vẻ là số "nhỏ" (có thể chứa thập phân)
                        // thì originalAmount này có thể là giá trị "base" từ thời x1000.
                        // Chúng ta muốn originalAmount bây giờ phản ánh giá trị đầy đủ sẽ được hiển thị trong form.
                        const isLikelyOldScaledVnd = Math.abs(tx.amount - (tx.originalAmount * 1000)) < 1 && // amount ~ originalAmount * 1000
                                                  tx.originalAmount.toString().includes('.'); // originalAmount có dạng thập phân

                        if (isLikelyOldScaledVnd) {
                            console.log(`Di chuyển originalAmount cho giao dịch ID ${tx.id}: từ ${tx.originalAmount} thành ${tx.amount}`);
                            tx.originalAmount = tx.amount; // Giờ originalAmount sẽ là giá trị đầy đủ
                            changed = true;
                        }
                    }
                });

                if (changed) {
                    localStorage.setItem('transactions_v2', JSON.stringify(transactions));
                    console.log("Hoàn tất di chuyển originalAmount. Dữ liệu đã được cập nhật.");
                } else {
                    console.log("Không có originalAmount nào cần di chuyển hoặc đã ở định dạng mới.");
                }
                localStorage.setItem(MIGRATION_KEY_ORIGINAL_AMOUNT_VND, 'true');
            }
        }
        // BẠN CÓ THỂ GỌI HÀM NÀY MỘT LẦN KHI ỨNG DỤNG KHỞI ĐỘNG, TRƯỚC KHI loadUserPreferences
        // migrateOriginalAmountsForOldVNDTransactions(); 
        // SAU KHI CHẮC CHẮN NÓ HOẠT ĐỘNG ĐÚNG VÀ CHỈ CHẠY MỘT LẦN, BẠN CÓ THỂ XÓA HOẶC VÔ HIỆU HÓA LỜI GỌI NÀY.
        // --------------------------------------------------------------------
        // KẾT THÚC PHẦN CẢNH BÁO DI CHUYỂN DỮ LIỆU
        // --------------------------------------------------------------------


        // --- CÁC BIẾN DOM (Giữ nguyên hoặc điều chỉnh nếu ID thay đổi) ---
        const darkModeToggleCheckbox = document.getElementById('darkModeToggleCheckbox');
        const DARK_MODE_CLASS = 'dark-mode';
        const THEME_STORAGE_KEY = 'themePreference';

        const transactionForm = document.getElementById('transaction-form');
        const formTitleEl = document.getElementById('form-title');
        const submitButton = document.getElementById('submit-transaction-button');
        const transactionList = document.getElementById('transaction-list');
        const totalIncomeEl = document.getElementById('total-income');
        const totalExpensesEl = document.getElementById('total-expenses');
        const currentBalanceEl = document.getElementById('current-balance');
        const accountBalanceListEl = document.getElementById('account-balance-list');
        const datetimeInput = document.getElementById('datetime-input');
        const categoryInput = document.getElementById('category');
		
		// >>> THÊM 3 DÒNG MỚI CỦA BẠN VÀO ĐÂY:
		const transactionSuggestionAreaEl = document.getElementById('transaction-suggestion-area');
		const suggestedDescriptionEl = document.getElementById('suggested-description');
		const suggestedAmountEl = document.getElementById('suggested-amount');
		const applySuggestionButtonEl = document.getElementById('apply-suggestion-button');
		const dismissSuggestionButtonEl = document.getElementById('dismiss-suggestion-button');
		let currentSuggestedTransaction = null; // Để lưu trữ giao dịch được gợi ý
		
		// >>> THÊM 3 DÒNG MỚI CỦA BẠN VÀO ĐÂY:
        const summaryIncomeMonthDisplayEl = document.getElementById('summary-income-month-display');
        const summaryExpenseMonthDisplayEl = document.getElementById('summary-expense-month-display');
        const summaryBalanceMonthDisplayEl = document.getElementById('summary-balance-month-display');
		
        // const categoryContainer = categoryInput.parentElement; // Dòng này bạn có dùng không?
        const amountTextInput = document.getElementById('amount-input'); // QUAN TRỌNG CHO NÚT "000"
        const formCurrencySelector = document.getElementById('form-currency-selector');
        const descriptionInput = document.getElementById('description');
        const accountInput = document.getElementById('account');
        const accountLabel = document.getElementById('account-label');
        // const toAccountContainer = document.querySelector('.form-field-transfer'); // Dòng này bạn có dùng không?
        const toAccountInput = document.getElementById('to-account');
        const noTransactionsMessage = document.getElementById('no-transactions');
        const filterMonthSelect = document.getElementById('filter-month');
        const messageBox = document.getElementById('message-box');

        const incomeExpenseChartCanvas = document.getElementById('incomeExpenseChart').getContext('2d');
        const expenseCategoryChartCanvas = document.getElementById('expenseCategoryChart').getContext('2d');
        const expenseCategoryListContainerEl = document.getElementById('expense-category-list-container');
        const noExpenseDataEl = document.getElementById('no-expense-data');
        const last7DaysChartCanvas = document.getElementById('last7DaysChart').getContext('2d');
        const monthComparisonChartCanvas = document.getElementById('monthComparisonChart').getContext('2d');
		// ... các biến hiện có ...
		const expenseCategoryBarCtx = document.getElementById('expenseCategoryBarChart').getContext('2d');


		const expenseChartTypeSelector = document.getElementById('expenseChartTypeSelector');
		const expensePieChartContainer = document.getElementById('expensePieChartContainer');
		const expenseBarChartContainer = document.getElementById('expenseBarChartContainer');
		const filterSpecificDateInput = document.getElementById('filter-specific-date');
		const clearDateFilterButton = document.getElementById('clear-date-filter-button');
		// const noExpenseDataEl = document.getElementById('no-expense-data-list'); // Đổi tên hoặc giữ nguyên nếu bạn đã có cho list

		// Các element hiển thị thông báo "không có dữ liệu"
		// (Đảm bảo ID trong HTML của bạn khớp với các ID này)
		const noExpenseDataChartEl = document.getElementById('no-expense-data-chart'); // MỚI (cho khu vực biểu đồ)
		const noExpenseDataListEl = document.getElementById('no-expense-data-list');   // ID này bạn đã cập nhật trong HTML cho phần danh sách


        const filterComparisonYearInput = document.getElementById('filter-comparison-year');
        const filterComparisonWeekSelect = document.getElementById('filter-comparison-week');
        const weeklyComparisonContentEl = document.getElementById('weekly-comparison-content');
        const selectedWeekDisplayEl = document.getElementById('selected-week-display');
        const currentWeekStartBalanceEl = document.getElementById('current-week-start-balance');
        const currentWeekIncomeEl = document.getElementById('current-week-income');
        const currentWeekExpensesEl = document.getElementById('current-week-expenses');
        const currentWeekNetChangeEl = document.getElementById('current-week-net-change');
        const previousWeekDisplayEl = document.getElementById('previous-week-display');
        const previousWeekExpensesEl = document.getElementById('previous-week-expenses');
        const spendingDifferenceEl = document.getElementById('spending-difference');
        const noComparisonDataEl = document.getElementById('no-comparison-data');

        const typeRadioButtons = document.querySelectorAll('input[name="type"]');
        const exportButton = document.getElementById('export-button');
        const exportCsvButton = document.getElementById('export-csv-button');
        const importButton = document.getElementById('import-button');
        const importFileInput = document.getElementById('import-file-input');

        const newIncomeCategoryNameInput = document.getElementById('new-income-category-name');
        const addIncomeCategoryButton = document.getElementById('add-income-category-button');
        const incomeCategoryListAdminEl = document.getElementById('income-category-list-admin');
        const newExpenseCategoryNameInput = document.getElementById('new-expense-category-name');
        const addExpenseCategoryButton = document.getElementById('add-expense-category-button');
        const expenseCategoryListAdminEl = document.getElementById('expense-category-list-admin');
        const newAccountNameInput = document.getElementById('new-account-name');
        const addAccountButton = document.getElementById('add-account-button');
        const accountListAdminEl = document.getElementById('account-list-admin');

        // Nút mới
        const addTripleZeroButton = document.getElementById('add-triple-zero-button');
	

        let transactions = [];
        let incomeExpenseChart;
        let expenseCategoryChart;
		let expenseCategoryBarChart; // Biến cho instance biểu đồ cột
        let last7DaysChart;
        let monthComparisonChart;
        let editingTransactionId = null;

        let incomeCategories = [];
        let expenseCategories = [];
        let accounts = [];

        const defaultIncomeCategories = [ { value: "Lương", text: "Lương" }, { value: "Thưởng", text: "Thưởng" }, { value: "Tiền được trả nợ", text: "Tiền được trả nợ" }, { value: TRANSFER_CATEGORY_IN, text: "Nhận tiền chuyển khoản" }, { value: "Lãi tiết kiệm", text: "Lãi tiết kiệm" }, { value: "Thu nhập từ đầu tư", text: "Thu nhập từ đầu tư" }, { value: "Thu nhập phụ", text: "Thu nhập phụ" }, { value: "Thu nhập khác", text: "Thu nhập khác (chung)" } ];
        const defaultExpenseCategories = [ { value: "Ăn uống", text: "Ăn uống" }, { value: "Đi lại", text: "Đi lại" }, { value: "Nhà ở", text: "Nhà ở" }, { value: "Hóa đơn", text: "Hóa đơn (Điện, nước, internet)" }, { value: "Mua sắm", text: "Mua sắm (Quần áo, đồ dùng)" }, { value: "Giải trí", text: "Giải trí" }, { value: "Sức khỏe", text: "Sức khỏe" }, { value: "Giáo dục", text: "Giáo dục" }, { value: "Chi cho đầu tư", text: "Chi cho đầu tư" }, { value: "Trả nợ", text: "Trả nợ (cho người khác)" }, { value: TRANSFER_CATEGORY_OUT, text: "Chuyển tiền đi" }, { value: "Chi phí khác", text: "Chi phí khác (chung)" } ];
        const defaultAccounts = [ { value: "Tiền mặt", text: "Tiền mặt" }, { value: "Momo", text: "Momo" }, { value: "Thẻ tín dụng A", text: "Thẻ tín dụng A" }, { value: "Techcombank", text: "Techcombank" }, { value: "BIDV", text: "BIDV" }, { value: "Khác", text: "Khác" } ];
        const categoryColors = [ '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF', '#8366FF', '#289F40', '#D26384', '#3C64C8', '#C89632' ];
		document.addEventListener("DOMContentLoaded", () => {
			document.getElementById("filter-month").addEventListener("change", () => {
				const selectedMonth = document.getElementById("filter-month").value;
				filterDataByMonth(selectedMonth);
			});
		});

			filterComparisonWeekSelect.addEventListener('change', function() {
				const selectedWeek = Number(this.value);
				const selectedYear = Number(filterComparisonYearInput.value);
				renderWeeklyComparison(selectedYear, selectedWeek);
			});
			filterComparisonYearInput.addEventListener('change', function() {
				const selectedYear = Number(this.value);
				const selectedWeek = Number(filterComparisonWeekSelect.value);
				renderWeeklyComparison(selectedYear, selectedWeek);
			});
			
		function afterTransactionChange() {
			// ... code cập nhật khác ...
			const selectedYear = Number(filterComparisonYearInput.value);
			const selectedWeek = Number(filterComparisonWeekSelect.value);
			renderWeeklyComparison(selectedYear, selectedWeek);
		}

        // --- HÀM TIỆN ÍCH (Giữ nguyên các hàm tiện ích của bạn) ---
        function showMessage(message, type = 'success') { messageBox.textContent = message; messageBox.className = `p-4 mb-4 text-sm rounded-lg ${type === 'success' ? 'message-success' : 'message-error'}`; messageBox.style.display = 'block'; setTimeout(() => { messageBox.style.display = 'none'; }, 3000); }
        
		function formatCurrency(amount, currencyCode = 'VND') {
			if (isNaN(amount) || amount === null) amount = 0;

			if (currencyCode === 'VND') {
				let actualFractionDigits = 0;
				const amountStrFull = String(amount); // Chuyển số thành chuỗi để kiểm tra phần thập phân

				// Tìm số chữ số thập phân thực tế trong số `amount`
				const decimalPartMatch = amountStrFull.match(/\.(\d+)$/);
				if (decimalPartMatch && decimalPartMatch[1]) {
					actualFractionDigits = decimalPartMatch[1].length;
				}

				const numberFormatter = new Intl.NumberFormat('en-US', { // 'en-US' sử dụng: 1,234.56
					style: 'decimal', // Chỉ định dạng số, không tự động thêm ký hiệu tiền tệ
					minimumFractionDigits: actualFractionDigits, // Hiển thị tối thiểu số chữ số thập phân này
					maximumFractionDigits: actualFractionDigits  // Hiển thị tối đa số chữ số thập phân này
																// (Để hiển thị chính xác những gì đã lưu)
				});
				return numberFormatter.format(amount) + '\u00A0₫'; // Thêm ký hiệu VNĐ thủ công
			} else if (currencyCode === 'USD') {
				// USD thường có 2 chữ số thập phân
				return new Intl.NumberFormat('en-US', {
					style: 'currency', // 'currency' sẽ tự thêm ký hiệu $
					currency: 'USD',
					minimumFractionDigits: 2,
					maximumFractionDigits: 2
				}).format(amount);
			} else {
				// Xử lý các loại tiền tệ khác (có thể cần tùy chỉnh thêm)
				const options = {
					style: 'currency',
					currency: currencyCode,
					minimumFractionDigits: 0, // Mặc định cho các loại tiền tệ khác
					maximumFractionDigits: 2  // Mặc định cho các loại tiền tệ khác
				};
				return new Intl.NumberFormat('en-US', options).format(amount); // Sử dụng 'en-US' cho định dạng chung
			}
		}
		function getCurrentDateFormattedYYYYMMDD() {
			const today = new Date();
			const year = today.getFullYear();
			const month = String(today.getMonth() + 1).padStart(2, '0'); // Tháng bắt đầu từ 0
			const day = String(today.getDate()).padStart(2, '0');
			return `${year}-${month}-${day}`;
		}		
        function formatDateTimeLocalInput(date) { /* ... mã gốc của bạn ... */ 
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        }
        function formatIsoDateTime(date) { /* ... mã gốc của bạn ... */ 
            if (!date || isNaN(new Date(date).getTime())) date = new Date();
            else date = new Date(date);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
        }
        function formatDisplayDateTime(isoString) { /* ... mã gốc của bạn ... */ 
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
        }
        function formatDateTimeForCSV(isoString) { /* ... mã gốc của bạn ... */
            if (!isoString) return '';
            try {
                const d = new Date(isoString);
                if (isNaN(d.getTime())) return isoString;
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
            } catch (e) { return isoString; }
        }
		function getISOWeek(date) {
			const d = new Date(date);
			d.setHours(0, 0, 0, 0);
			d.setDate(d.getDate() + 4 - (d.getDay() || 7));
			const yearStart = new Date(d.getFullYear(), 0, 1);
			const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
			return weekNo;
		}
		function renderWeeklyComparison(year, week) {
			const weekTxs = getTransactionsByWeek(transactions, year, week);
			// Tổng thu, chi, số dư, v.v.
			let totalIncome = 0, totalExpense = 0;
			weekTxs.forEach(tx => {
				if (tx.type === "Thu") totalIncome += tx.amount;
				else if (tx.type === "Chi") totalExpense += tx.amount;
			});
			// Cập nhật giao diện
			currentWeekIncomeEl.textContent = formatCurrency(totalIncome);
			currentWeekExpensesEl.textContent = formatCurrency(totalExpense);
			currentWeekNetChangeEl.textContent = formatCurrency(totalIncome - totalExpense);
			// Tương tự cho tuần trước nếu cần
		}
		function getCurrentISOWeekId() {
			const now = new Date();
			const year = now.getFullYear();
			const weekNumber = getISOWeekNumber(now); // Hàm getISOWeekNumber đã có trong script.js
			return `${year}-W${String(weekNumber).padStart(2, '0')}`;
		}
		// Hàm lọc giao dịch của tuần & năm chỉ định
		function getTransactionsByWeek(transactions, year, week) {
			return transactions.filter(tx => {
				const txDate = new Date(tx.datetime);
				return txDate.getFullYear() === year && getISOWeek(txDate) === week;
			});
		}

        // --- HÀM NORMALIZEAMOUNTSTRING (CẬP NHẬT) ---
		function normalizeAmountString(amountStr) {
			if (typeof amountStr !== 'string' || !amountStr.trim()) {
				return "";
			}
			let str = amountStr.trim();
			const hasComma = str.includes(',');
			const hasPeriod = str.includes('.');

			if (hasComma && hasPeriod) {
				if (str.lastIndexOf(',') > str.lastIndexOf('.')) { // Kiểu 1.234,56
					str = str.replace(/\./g, '').replace(',', '.');
				} else { // Kiểu 1,234.56
					str = str.replace(/,/g, '');
				}
			} else if (hasComma) { // Chỉ có dấu phẩy, ví dụ "12,000" hoặc "1,234,567"
				str = str.replace(/,/g, ''); // Loại bỏ tất cả dấu phẩy
			} else if (hasPeriod) { // Chỉ có dấu chấm
				const periodCount = (str.match(/\./g) || []).length;
				if (periodCount > 1) {
					// Giữ lại dấu chấm cuối cùng, loại bỏ các dấu chấm khác (ví dụ: "1.234.56" -> "1234.56")
					str = str.replace(/\.(?=.*\.)/g, '');
				}
				// Nếu chỉ có 1 dấu chấm (ví dụ "22.5"), nó sẽ được giữ nguyên.
			}
			return str;
		}
		function parseAmountInput(amountStr, currency) {
			if (!amountStr) return 0;

			// Giả định hàm normalizeAmountString đã được sửa để xử lý đúng "12,000" -> "12000"
			// và "12,000.202" -> "12000.202"
			const normalizedStr = normalizeAmountString(amountStr);
			let val = parseFloat(normalizedStr);

			if (isNaN(val)) {
				// Fallback parsing (có thể cần cải thiện tùy theo các định dạng đầu vào phức tạp)
				console.warn(`NormalizeAmountString failed or produced NaN for input: '${amountStr}'. Normalized string was: '${normalizedStr}'. Attempting direct parsing.`);
				let directParseStr = String(amountStr).trim();
				if (directParseStr.includes(',') && !directParseStr.includes('.')) {
					directParseStr = directParseStr.replace(/,/g, '');
				} else if (directParseStr.includes(',') && directParseStr.includes('.')) {
					 if (directParseStr.lastIndexOf(',') > directParseStr.lastIndexOf('.')) { // 1.234,56
						directParseStr = directParseStr.replace(/\./g, '').replace(',', '.');
					} else { // 1,234.56
						directParseStr = directParseStr.replace(/,/g, '');
					}
				}
				val = parseFloat(directParseStr);
			}

			if (isNaN(val)) return 0;

			if (currency === 'USD') {
				val = val * USD_TO_VND_RATE;
				return Math.round(val); // Quy đổi USD sang VND thường làm tròn thành số nguyên
			} else if (currency === 'VND') {
				// Giữ lại phần thập phân cho VNĐ
				return val;
			} else {
				// Các loại tiền tệ khác có thể có quy tắc làm tròn riêng
				return val;
			}
		}
		function filterDataByMonth(monthValue) {
		  const filtered = monthValue === "all"
			? transactions
			: transactions.filter(tx => {
				const date = new Date(tx.datetime);
				const month = (date.getMonth() + 1).toString().padStart(2, '0');
				const year = date.getFullYear();
				return `${year}-${month}` === monthValue;
			});

		function renderExpenseBreakdown(data) {
		  const categoryTotals = {};
		  data.filter(tx => tx.type === "Chi").forEach(tx => {
			categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
		  });

		  // Cập nhật biểu đồ (Chart.js)
		  const labels = Object.keys(categoryTotals);
		  const values = Object.values(categoryTotals);

		  expensePieChart.data.labels = labels;
		  expensePieChart.data.datasets[0].data = values;
		  expensePieChart.update();

		  // Cập nhật danh sách bên phải
		  const container = document.getElementById("expense-category-list-container");
		  container.innerHTML = labels.map((cat, i) => {
			const percent = ((values[i] / values.reduce((a, b) => a + b, 0)) * 100).toFixed(1);
			return `<li class="flex justify-between items-center text-sm">
			  <div class="flex items-center">
				<span class="inline-block w-3 h-3 rounded-full mr-2" style="background-color: ${chartColors[i % chartColors.length]}"></span>
				<span>${cat}</span>
			  </div>
			  <div class="text-right">
				<span class="font-semibold">${values[i].toLocaleString()} ₫</span>
				<span class="text-gray-500 ml-2">(${percent}%)</span>
			  </div>
			</li>`;
		  }).join("");
		}
		  renderExpenseBreakdown(filtered);
		  renderOverviewCharts(filtered);
		}		
		function toggleExpenseChartDisplay() {
			if (!expenseChartTypeSelector || !expensePieChartContainer || !expenseBarChartContainer || !noExpenseDataChartEl) {
				// console.error("toggleExpenseChartDisplay: DOM elements for chart toggling are missing.");
				return;
			}

			const selectedType = expenseChartTypeSelector.value;
			// Kiểm tra xem có dữ liệu không (dựa vào việc một trong hai biểu đồ đã được khởi tạo và có dữ liệu)
			const chartsHaveData = (expenseCategoryChart && expenseCategoryChart.data.labels && expenseCategoryChart.data.labels.length > 0) ||
								   (expenseCategoryBarChart && expenseCategoryBarChart.data.labels && expenseCategoryBarChart.data.labels.length > 0);

			if (!chartsHaveData && totalExpenses === 0) { // Kiểm tra thêm totalExpenses từ renderExpenseCategoryChartAndList (cần truyền vào hoặc dùng biến global)
														// Hoặc đơn giản hơn là dựa vào trạng thái của noExpenseDataChartEl được set trong renderExpenseCategoryChartAndList
				expensePieChartContainer.style.display = 'none';
				expenseBarChartContainer.style.display = 'none';
				noExpenseDataChartEl.style.display = 'block';
				return;
			}
			
			// Nếu hàm render đã ẩn/hiện noExpenseDataChartEl rồi thì không cần dòng này nữa
			// noExpenseDataChartEl.style.display = 'none'; 

			if (selectedType === 'pie') {
				expensePieChartContainer.style.display = 'block';
				expenseBarChartContainer.style.display = 'none';
			} else if (selectedType === 'bar') {
				expensePieChartContainer.style.display = 'none';
				expenseBarChartContainer.style.display = 'block';
			}
		}
		
		// --- Luu bo nho ---
		function findAndDisplayTransactionSuggestion() {
			if (!transactionForm || editingTransactionId) { // Không gợi ý khi đang sửa
				hideTransactionSuggestion();
				return;
			}

			const typeRadio = document.querySelector('input[name="type"]:checked');
			const currentType = typeRadio ? typeRadio.value : null;
			const currentCategory = categoryInput.value;
			const currentAccount = accountInput.value; // Có thể thêm điều kiện này

			if (!currentType || !currentCategory) {
				hideTransactionSuggestion();
				return;
			}

			// Tìm kiếm giao dịch gần nhất khớp với loại và hạng mục (và tài khoản nếu muốn)
			// Ưu tiên các giao dịch gần đây hơn
			const recentTransactions = [...transactions].sort((a, b) => new Date(b.datetime) - new Date(a.datetime));

			currentSuggestedTransaction = recentTransactions.find(tx => 
				tx.type === currentType && 
				tx.category === currentCategory &&
				// tx.account === currentAccount && // Bỏ comment dòng này nếu muốn khớp cả tài khoản
				!tx.isTransfer // Thường không cần gợi ý cho giao dịch chuyển tiền theo cách này
			);

			if (currentSuggestedTransaction) {
				if (suggestedDescriptionEl) suggestedDescriptionEl.textContent = currentSuggestedTransaction.description || "(không có mô tả)";
				if (suggestedAmountEl) {
					// Hiển thị số tiền gốc nếu có và khác VNĐ, nếu không thì hiển thị số tiền đã quy đổi
					if (currentSuggestedTransaction.originalCurrency && currentSuggestedTransaction.originalCurrency !== 'VND' && typeof currentSuggestedTransaction.originalAmount === 'number') {
						suggestedAmountEl.textContent = formatCurrency(currentSuggestedTransaction.originalAmount, currentSuggestedTransaction.originalCurrency);
					} else {
						suggestedAmountEl.textContent = formatCurrency(currentSuggestedTransaction.amount, 'VND');
					}
				}
				if (transactionSuggestionAreaEl) transactionSuggestionAreaEl.style.display = 'block';
			} else {
				hideTransactionSuggestion();
			}
		}

		function hideTransactionSuggestion() {
			if (transactionSuggestionAreaEl) transactionSuggestionAreaEl.style.display = 'none';
			currentSuggestedTransaction = null;
		}

		function applyTransactionSuggestion() {
			if (currentSuggestedTransaction) {
				// Điền số tiền (giá trị gốc) và đơn vị tiền tệ gốc
				if (currentSuggestedTransaction.originalCurrency && typeof currentSuggestedTransaction.originalAmount === 'number') {
					amountTextInput.value = String(currentSuggestedTransaction.originalAmount); // Điền giá trị gốc
					formCurrencySelector.value = currentSuggestedTransaction.originalCurrency;
				} else { // Fallback nếu không có thông tin tiền tệ gốc rõ ràng
					amountTextInput.value = String(currentSuggestedTransaction.amount); // Điền giá trị đã quy đổi
					formCurrencySelector.value = 'VND'; 
				}

				descriptionInput.value = currentSuggestedTransaction.description || "";

				// Tùy chọn: có thể điền cả tài khoản nếu logic tìm kiếm của bạn bao gồm tài khoản
				// accountInput.value = currentSuggestedTransaction.account;

				showMessage('Đã áp dụng gợi ý từ giao dịch cũ.', 'info');
				hideTransactionSuggestion();
				amountTextInput.focus(); // Chuyển focus để người dùng có thể sửa nhanh nếu cần
			}
		}		
		
        // --- DARK MODE LOGIC (Giữ nguyên) ---
		function applyTheme(theme) {
			// console.log('Applying theme:', theme);
			if (theme === 'dark') {
				document.body.classList.add('dark-mode');
				document.body.classList.add(DARK_MODE_CLASS);
				if (darkModeToggleCheckbox) darkModeToggleCheckbox.checked = true;
				localStorage.setItem(THEME_STORAGE_KEY, 'dark');
			} else {
				document.body.classList.remove('dark-mode')
				document.body.classList.remove(DARK_MODE_CLASS);
				if (darkModeToggleCheckbox) darkModeToggleCheckbox.checked = false;
				localStorage.setItem(THEME_STORAGE_KEY, 'light');
			}
			updateAllChartColorsForTheme(theme); // Gọi hàm cập nhật màu biểu đồ
		}

		function toggleTheme() {
			// console.log('toggleTheme called. Checkbox checked:', darkModeToggleCheckbox ? darkModeToggleCheckbox.checked : 'checkbox not found');
			if (!darkModeToggleCheckbox) {
				console.error("darkModeToggleCheckbox not found in toggleTheme");
				return;
			}
			applyTheme(darkModeToggleCheckbox.checked ? 'dark' : 'light');
		}
		
		function loadThemePreference() {
			// console.log('loadThemePreference called'); // Thêm để kiểm tra
			const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
			const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)').matches;

			if (savedTheme) {
				applyTheme(savedTheme);
			} else if (prefersDarkScheme) {
				applyTheme('dark');
			} else {
				applyTheme('light'); // Mặc định là light nếu không có gì được lưu và không có ưu tiên hệ thống
			}
		}
		
		function updateAllChartColorsForTheme(theme) {
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
				monthComparisonChart, expenseCategoryBarChart // Đã bao gồm biểu đồ cột
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

        function setDefaultDateTime() { if(datetimeInput) datetimeInput.value = formatDateTimeLocalInput(new Date()); }
        function setDefaultComparisonYear() { if(filterComparisonYearInput) filterComparisonYearInput.value = new Date().getFullYear(); }
		function loadUserPreferences() {
			// Ví dụ cho transactions (giữ nguyên cách bạn đã làm hoặc cải thiện)
			const storedTransactions = localStorage.getItem('transactions_v2');
			transactions = [];
			if (storedTransactions) {
				try {
					transactions = JSON.parse(storedTransactions);
					console.log("Loaded transactions_v2:", transactions); // KIỂM TRA TRANSACTIONS
					if (!Array.isArray(transactions)) {
						console.warn("Dữ liệu transactions_v2 từ localStorage không phải là mảng, đặt lại thành mảng rỗng.");
						transactions = [];
					}
				} catch (error) {
					console.error("Lỗi khi parse transactions_v2 từ localStorage:", error);
					transactions = [];
					showMessage('Có lỗi khi tải dữ liệu giao dịch. Dữ liệu có thể đã bị hỏng.', 'error');
				}
			} else {
				console.log("Không tìm thấy transactions_v2 trong localStorage, sử dụng mảng rỗng.");
				transactions = []; // Đảm bảo transactions luôn là một mảng
			}

			// --- LÀM TƯƠNG TỰ CHO incomeCategories ---
			const storedIncomeCategories = localStorage.getItem('customIncomeCategories_v2');
			incomeCategories = []; // Khởi tạo
			if (storedIncomeCategories) {
				try {
					incomeCategories = JSON.parse(storedIncomeCategories);
					console.log("Loaded customIncomeCategories_v2:", incomeCategories); // KIỂM TRA incomeCategories
					if (!Array.isArray(incomeCategories)) {
						console.warn("customIncomeCategories_v2 không phải mảng, dùng giá trị mặc định.");
						incomeCategories = [...defaultIncomeCategories]; // Sử dụng default nếu lỗi
						console.log("Fell back to defaultIncomeCategories (not array):", incomeCategories);
					} else if (incomeCategories.length === 0 || !incomeCategories.find(c => c.value === TRANSFER_CATEGORY_IN)) {
						console.warn("customIncomeCategories_v2 rỗng hoặc thiếu hạng mục chuyển tiền cần thiết, dùng giá trị mặc định.");
						incomeCategories = [...defaultIncomeCategories];
						console.log("Fell back to defaultIncomeCategories (empty or missing transfer):", incomeCategories);
					}
				} catch (error) {
					console.error("Lỗi khi parse customIncomeCategories_v2:", error);
					incomeCategories = [...defaultIncomeCategories];
					console.log("Fell back to defaultIncomeCategories (parse error):", incomeCategories);
				}
			} else { // Nếu không có gì trong localStorage, dùng default
				 console.log("Không tìm thấy customIncomeCategories_v2, sử dụng defaultIncomeCategories.");
				 incomeCategories = [...defaultIncomeCategories];
			}

			// --- LÀM TƯƠNG TỰ CHO expenseCategories --- (đoạn này bạn đã có, chỉ để tham khảo cấu trúc)
			const storedExpenseCategories = localStorage.getItem('customExpenseCategories_v2');
			expenseCategories = [];
			if (storedExpenseCategories) {
				try {
					expenseCategories = JSON.parse(storedExpenseCategories);
					console.log("Loaded customExpenseCategories_v2:", expenseCategories); // KIỂM TRA expenseCategories
					if (!Array.isArray(expenseCategories)) {
						console.warn("customExpenseCategories_v2 không phải mảng, dùng giá trị mặc định.");
						expenseCategories = [...defaultExpenseCategories];
						console.log("Fell back to defaultExpenseCategories (not array):", expenseCategories);
					} else if (expenseCategories.length === 0 || !expenseCategories.find(c => c.value === TRANSFER_CATEGORY_OUT)) {
						 console.warn("customExpenseCategories_v2 rỗng hoặc thiếu hạng mục chuyển tiền cần thiết, dùng giá trị mặc định.");
						expenseCategories = [...defaultExpenseCategories];
						console.log("Fell back to defaultExpenseCategories (empty or missing transfer):", expenseCategories);
					}
				} catch (error) {
					console.error("Lỗi khi parse customExpenseCategories_v2:", error);
					expenseCategories = [...defaultExpenseCategories];
					console.log("Fell back to defaultExpenseCategories (parse error):", expenseCategories);
				}
			} else {
				 console.log("Không tìm thấy customExpenseCategories_v2, sử dụng defaultExpenseCategories.");
				 expenseCategories = [...defaultExpenseCategories];
			}

			// --- LÀM TƯƠNG TỰ CHO accounts ---
			const storedAccounts = localStorage.getItem('customAccounts_v2');
			accounts = []; // Khởi tạo
			if (storedAccounts) {
				try {
					accounts = JSON.parse(storedAccounts);
					console.log("Loaded customAccounts_v2:", accounts); // KIỂM TRA accounts
					if (!Array.isArray(accounts) || accounts.length === 0) {
						console.warn("customAccounts_v2 không phải mảng hoặc rỗng, dùng giá trị mặc định.");
						accounts = [...defaultAccounts];
						console.log("Fell back to defaultAccounts (not array or empty):", accounts);
					}
				} catch (error) {
					console.error("Lỗi khi parse customAccounts_v2:", error);
					accounts = [...defaultAccounts];
					console.log("Fell back to defaultAccounts (parse error):", accounts);
				}
			} else {
				 console.log("Không tìm thấy customAccounts_v2, sử dụng defaultAccounts.");
				 accounts = [...defaultAccounts];
			}

			// Sau khi đã tải hoặc đặt lại tất cả, log ra trạng thái cuối cùng
			console.log("Dữ liệu cuối cùng sau khi tải (loadUserPreferences):", { transactions, incomeCategories, expenseCategories, accounts });
		}

        function saveUserPreferences() { localStorage.setItem('customIncomeCategories_v2', JSON.stringify(incomeCategories)); localStorage.setItem('customExpenseCategories_v2', JSON.stringify(expenseCategories)); localStorage.setItem('customAccounts_v2', JSON.stringify(accounts)); }
        function saveTransactions() { localStorage.setItem('transactions_v2', JSON.stringify(transactions)); }
        
        // --- CÁC HÀM RENDER (Giữ nguyên cấu trúc, logic hiển thị sẽ tự điều chỉnh theo giá trị số tiền mới) ---
        function renderAccountListAdmin() { if (!accountListAdminEl) return; accountListAdminEl.innerHTML = ''; accounts.forEach(acc => { const li = document.createElement('li'); li.textContent = acc.text; const deleteButton = document.createElement('button'); deleteButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash mr-1" viewBox="0 0 16 16"> <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/> <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/> </svg>Xóa`; deleteButton.classList.add('btn-delete', 'text-xs', 'px-2', 'py-1', 'ml-2'); deleteButton.onclick = () => { if (confirm(`Bạn có chắc muốn xóa tài khoản "${acc.text}" không? Lưu ý: Các giao dịch cũ liên quan đến tài khoản này sẽ không tự động cập nhật.`)) { accounts = accounts.filter(a => a.value !== acc.value); saveUserPreferences(); renderAccountListAdmin(); populateAccountDropdowns(); updateAccountBalances(); showMessage(`Đã xóa tài khoản "${acc.text}".`, 'success'); } }; li.appendChild(deleteButton); accountListAdminEl.appendChild(li); }); }
		function renderCategoryList(listElement, categoriesArray, type) { if (!listElement) return; listElement.innerHTML = ''; categoriesArray.forEach(cat => { const isSpecialTransferCategory = (cat.value === TRANSFER_CATEGORY_IN || cat.value === TRANSFER_CATEGORY_OUT); const li = document.createElement('li'); li.textContent = cat.text; if (!isSpecialTransferCategory) { const deleteButton = document.createElement('button'); deleteButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash mr-1" viewBox="0 0 16 16"> <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/> <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/> </svg>Xóa`; deleteButton.classList.add('btn-delete', 'text-xs', 'px-2', 'py-1', 'ml-2'); deleteButton.onclick = () => { if (confirm(`Bạn có chắc muốn xóa hạng mục "${cat.text}" không?`)) { if (type === 'income') incomeCategories = incomeCategories.filter(c => c.value !== cat.value); else expenseCategories = expenseCategories.filter(c => c.value !== cat.value); saveUserPreferences(); renderCustomCategoryLists(); populateCategories(); applyMainFilter(); } }; li.appendChild(deleteButton); } else { const lockIcon = document.createElement('span'); lockIcon.innerHTML = ` <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-lock-fill inline-block ml-2 text-gray-400" viewBox="0 0 16 16"><path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/></svg>`; li.appendChild(lockIcon); } listElement.appendChild(li); }); }
        function renderCustomCategoryLists() { renderCategoryList(incomeCategoryListAdminEl, incomeCategories, 'income'); renderCategoryList(expenseCategoryListAdminEl, expenseCategories, 'expense'); }
        function addCategory(name, type) { if (!name || name.trim() === '') { showMessage('Tên hạng mục không được để trống.', 'error'); return false; } const newCategoryValue = name.trim(); const newCategory = { value: newCategoryValue, text: newCategoryValue }; if (type === 'income') { if (incomeCategories.some(cat => cat.value.toLowerCase() === newCategoryValue.toLowerCase())) { showMessage('Hạng mục thu này đã tồn tại.', 'error'); return false; } incomeCategories.push(newCategory); } else { if (expenseCategories.some(cat => cat.value.toLowerCase() === newCategoryValue.toLowerCase())) { showMessage('Hạng mục chi này đã tồn tại.', 'error'); return false; } expenseCategories.push(newCategory); } saveUserPreferences(); renderCustomCategoryLists(); populateCategories(); showMessage(`Đã thêm hạng mục "${newCategory.text}"!`, 'success'); return true; }
        function addAccount(name) { if (!name || name.trim() === '') { showMessage('Tên tài khoản không được để trống.', 'error'); return false; } const newAccountName = name.trim(); if (accounts.some(acc => acc.value.toLowerCase() === newAccountName.toLowerCase() || acc.text.toLowerCase() === newAccountName.toLowerCase())) { showMessage('Tài khoản này đã tồn tại.', 'error'); return false; } const newAccount = { value: newAccountName, text: newAccountName }; accounts.push(newAccount); saveUserPreferences(); renderAccountListAdmin(); populateAccountDropdowns(); updateAccountBalances(); showMessage(`Đã thêm tài khoản "${newAccount.text}"!`, 'success'); return true; }
        function populateAccountDropdowns() { if (!accountInput || !toAccountInput) return; const currentFromAccount = accountInput.value; const currentToAccount = toAccountInput.value; accountInput.innerHTML = ''; toAccountInput.innerHTML = ''; if (!accounts || accounts.length === 0) accounts = [...defaultAccounts]; accounts.forEach(acc => { accountInput.add(new Option(acc.text, acc.value)); toAccountInput.add(new Option(acc.text, acc.value)); }); if (accounts.some(acc => acc.value === currentFromAccount)) accountInput.value = currentFromAccount; else if (accounts.length > 0) accountInput.value = accounts[0].value; if (accounts.some(acc => acc.value === currentToAccount)) toAccountInput.value = currentToAccount; else if (accounts.length > 1) toAccountInput.value = accounts[1].value; else if (accounts.length > 0) toAccountInput.value = accounts[0].value; }
        function populateCategories() { if (!categoryInput) return; const selectedTypeRadio = document.querySelector('input[name="type"]:checked'); const selectedType = selectedTypeRadio ? selectedTypeRadio.value : 'Chi'; const currentCategoryValue = categoryInput.value; categoryInput.innerHTML = ''; let categoriesToPopulate = (selectedType === 'Thu') ? incomeCategories : expenseCategories; categoriesToPopulate = categoriesToPopulate.filter(cat => cat.value !== TRANSFER_CATEGORY_IN && cat.value !== TRANSFER_CATEGORY_OUT); if (!categoriesToPopulate || categoriesToPopulate.length === 0) { const defaultCats = (selectedType === 'Thu') ? [...defaultIncomeCategories] : [...defaultExpenseCategories]; categoriesToPopulate = defaultCats.filter(cat => cat.value !== TRANSFER_CATEGORY_IN && cat.value !== TRANSFER_CATEGORY_OUT); } categoriesToPopulate.forEach(category => categoryInput.add(new Option(category.text, category.value))); if (categoriesToPopulate.some(cat => cat.value === currentCategoryValue)) categoryInput.value = currentCategoryValue; else if (categoriesToPopulate.length > 0) categoryInput.value = categoriesToPopulate[0].value; }
		function toggleFormFields() {
			const selectedTypeRadio = document.querySelector('input[name="type"]:checked');
			const selectedType = selectedTypeRadio ? selectedTypeRadio.value : 'Chi'; // Mặc định là 'Chi' nếu không có gì được chọn

			// Lấy các element DOM của các container field
			// Đảm bảo rằng các class này tồn tại trong HTML của bạn
			const categoryFieldContainer = document.querySelector('.form-field-normal'); 
			const toAccountFieldContainer = document.querySelector('.form-field-transfer');

			// Kiểm tra xem các container có thực sự được tìm thấy không (để tránh lỗi)
			if (!categoryFieldContainer) {
				console.error("Lỗi: Không tìm thấy container cho trường Hạng mục (class 'form-field-normal').");
			}
			if (!toAccountFieldContainer) {
				console.error("Lỗi: Không tìm thấy container cho trường Đến Tài khoản (class 'form-field-transfer').");
			}

			// Cập nhật dataset trên form (đã có)
			if (transactionForm) { // Giả sử transactionForm là biến global trỏ đến form
			  transactionForm.dataset.transactionMode = selectedType;
			}


			if (selectedType === 'Transfer') {
				// Cập nhật label (đã có)
				if (accountLabel) accountLabel.textContent = 'Từ Tài khoản:'; // Giả sử accountLabel là biến global

				// Ẩn trường Hạng mục và bỏ yêu cầu
				if (categoryFieldContainer) categoryFieldContainer.style.display = 'none';
				if (categoryInput) categoryInput.removeAttribute('required'); // Giả sử categoryInput là biến global

				// Hiển thị trường Đến Tài khoản và đặt là bắt buộc
				if (toAccountFieldContainer) toAccountFieldContainer.style.display = 'block'; // Hoặc 'grid', 'flex' tùy theo layout của bạn
				if (toAccountInput) toAccountInput.setAttribute('required', ''); // Giả sử toAccountInput là biến global
				
			} else { // Cho 'Thu' hoặc 'Chi'
				// Cập nhật label (đã có)
				if (accountLabel) accountLabel.textContent = 'Tài khoản:';

				// Hiển thị trường Hạng mục và đặt là bắt buộc
				if (categoryFieldContainer) categoryFieldContainer.style.display = 'block'; // Hoặc 'grid', 'flex'
				if (categoryInput) categoryInput.setAttribute('required', '');

				// Ẩn trường Đến Tài khoản và bỏ yêu cầu
				if (toAccountFieldContainer) toAccountFieldContainer.style.display = 'none';
				if (toAccountInput) toAccountInput.removeAttribute('required');
				
				populateCategories(); // Gọi hàm điền lại danh mục cho Thu/Chi
			}
		}
		

        // --- HÀM XỬ LÝ SUBMIT GIAO DỊCH (CẬP NHẬT CÁCH LƯU originalAmount) ---
        function handleTransactionSubmit(e) {
            e.preventDefault();
            const datetimeValue = datetimeInput.value;
            const typeRadio = document.querySelector('input[name="type"]:checked');
            const type = typeRadio ? typeRadio.value : null;
            const amountRaw = amountTextInput.value; // Giá trị thô từ ô input
            const currency = formCurrencySelector.value; // Đơn vị tiền tệ người dùng chọn
            let categoryValue = (type !== 'Transfer') ? categoryInput.value : null;
            const accountValue = accountInput.value;
            const toAccountValue = (type === 'Transfer') ? toAccountInput.value : null;
            const descriptionValue = descriptionInput.value.trim();
            
            // --- Các kiểm tra đầu vào giữ nguyên ---
            if (!datetimeValue || !type || !amountRaw || !accountValue) { showMessage('Vui lòng điền đầy đủ các trường bắt buộc.', 'error'); return; }
            if (type !== 'Transfer' && !categoryValue) { showMessage('Vui lòng chọn hạng mục.', 'error'); return; }
            if (type === 'Transfer' && !toAccountValue) { showMessage('Vui lòng chọn tài khoản nhận cho giao dịch chuyển tiền.', 'error'); return; }
            if (type === 'Transfer' && accountValue === toAccountValue) { showMessage('Tài khoản chuyển và tài khoản nhận không được trùng nhau.', 'error'); return; }

            // parseAmountInput giờ sẽ trả về giá trị đầy đủ, không còn x1000
            let amount = parseAmountInput(amountRaw, currency); 
            if (isNaN(amount) || amount <= 0 && !(type === 'Transfer' && amount === 0) /*Cho phép chuyển 0đ nếu cần*/) { 
                // Điều chỉnh lại điều kiện amount <=0 nếu muốn cho phép giao dịch 0 đồng
                // Hiện tại đang là phải > 0
                 if (amount <= 0 && type !== 'Transfer') { // Chỉ cho phép chuyển tiền 0 đồng, thu/chi phải >0
                    showMessage('Số tiền không hợp lệ hoặc phải lớn hơn 0.', 'error'); return;
                 } else if (amount < 0) { // Không cho phép số tiền âm
                    showMessage('Số tiền không được là số âm.', 'error'); return;
                 }
            }

            const transactionDateTime = formatIsoDateTime(new Date(datetimeValue));
            const persistedTransactionType = type; // Loại giao dịch thực tế (Thu/Chi/Transfer)

            // Giá trị số hóa từ ô input, trước khi quy đổi USD (nếu có)
            // Sẽ được lưu vào originalAmount
            const rawNumericValue = parseFloat(normalizeAmountString(amountRaw)); 
            if(isNaN(rawNumericValue)){
                showMessage('Số tiền nhập vào không hợp lệ.', 'error'); return;
            }


            if (editingTransactionId) {
                // ... (Phần logic sửa giao dịch của bạn giữ nguyên cấu trúc)
                // Chỉ cần đảm bảo các trường amount, originalAmount, originalCurrency được cập nhật đúng
                const existingTransactionIndex = transactions.findIndex(t => t.id === editingTransactionId || (t.isTransfer && (t.id.startsWith(editingTransactionId) || t.transferPairId.startsWith(editingTransactionId))));
                if (existingTransactionIndex === -1 && type !== 'Transfer') { showMessage('Lỗi: Giao dịch gốc để sửa không tìm thấy.', 'error'); editingTransactionId = null; return; }
                
                // Xóa giao dịch cũ để thêm lại bản cập nhật
                if (transactions.find(t => t.id.startsWith(editingTransactionId) && t.isTransfer) || type === 'Transfer') { transactions = transactions.filter(t => !t.id.startsWith(editingTransactionId) && !(t.transferPairId && t.transferPairId.startsWith(editingTransactionId))); } else if (existingTransactionIndex !== -1) { transactions.splice(existingTransactionIndex, 1); }
                
                const baseId = editingTransactionId; // Giữ lại ID gốc nếu là sửa
                if (type === 'Transfer') {
                    categoryValue = null;
                    const transferOutId = `${baseId}_out_edited_${Date.now()}`;
                    const transferInId = `${baseId}_in_edited_${Date.now()}`;
                    transactions.push({ id: transferOutId, datetime: transactionDateTime, description: descriptionValue || `Chuyển tiền từ ${accountValue} đến ${toAccountValue}`, category: TRANSFER_CATEGORY_OUT, amount, type: 'Chi', account: accountValue, currency: 'VND', isTransfer: true, transferPairId: transferInId, originalAmount: rawNumericValue, originalCurrency: currency });
                    transactions.push({ id: transferInId, datetime: transactionDateTime, description: descriptionValue || `Nhận tiền từ ${accountValue} vào ${toAccountValue}`, category: TRANSFER_CATEGORY_IN, amount, type: 'Thu', account: toAccountValue, currency: 'VND', isTransfer: true, transferPairId: transferOutId, originalAmount: rawNumericValue, originalCurrency: currency });
                    showMessage('Giao dịch chuyển tiền đã được cập nhật!', 'success');
                } else {
                    transactions.push({ id: baseId, datetime: transactionDateTime, description: descriptionValue, category: categoryValue, amount, type, account: accountValue, currency: 'VND', isTransfer: false, transferPairId: null, originalAmount: rawNumericValue, originalCurrency: currency });
                    showMessage(`Giao dịch ${type === 'Thu' ? 'thu' : 'chi'} đã được cập nhật!`, 'success');
                }
                editingTransactionId = null;
            } else { // Thêm giao dịch mới
                const newIdBase = Date.now().toString();
                if (type === 'Transfer') {
                    const transferOutId = `${newIdBase}_out`;
                    const transferInId = `${newIdBase}_in`;
                    transactions.push({ id: transferOutId, datetime: transactionDateTime, description: descriptionValue || `Chuyển tiền từ ${accountValue} đến ${toAccountValue}`, category: TRANSFER_CATEGORY_OUT, amount, type: 'Chi', account: accountValue, currency: 'VND', isTransfer: true, transferPairId: transferInId, originalAmount: rawNumericValue, originalCurrency: currency });
                    transactions.push({ id: transferInId, datetime: transactionDateTime, description: descriptionValue || `Nhận tiền từ ${accountValue} vào ${toAccountValue}`, category: TRANSFER_CATEGORY_IN, amount, type: 'Thu', account: toAccountValue, currency: 'VND', isTransfer: true, transferPairId: transferOutId, originalAmount: rawNumericValue, originalCurrency: currency });
                    showMessage('Giao dịch chuyển tiền đã được thêm!', 'success');
                } else {
                    transactions.push({ id: newIdBase, datetime: transactionDateTime, description: descriptionValue, category: categoryValue, amount, type, account: accountValue, currency: 'VND', isTransfer: false, transferPairId: null, originalAmount: rawNumericValue, originalCurrency: currency });
                    showMessage(`Giao dịch ${type === 'Thu' ? 'thu' : 'chi'} đã được thêm!`, 'success');
                }
            }
            saveTransactions();
            populateMonthFilter(); // Cập nhật bộ lọc tháng (nếu có tháng mới)
            applyMainFilter();     // Áp dụng lại bộ lọc và render lại tất cả
            resetForm(persistedTransactionType); // Reset form, giữ lại loại giao dịch vừa chọn
        }
        
	// --- HÀM RESET FORM (Cập nhật để giữ lại lựa chọn tài khoản) ---
	function resetForm(persistedType = null) {
	    // Lưu lại giá trị tài khoản đã chọn trước khi reset
	    const previousAccountValue = accountInput.value;
	    const previousToAccountValue = toAccountInput.value; // Sẽ là '' nếu không phải transfer
	
	    transactionForm.reset(); // Reset các trường input cơ bản
	    setDefaultDateTime();    // Đặt lại ngày giờ về hiện tại
	    formCurrencySelector.value = 'VND'; // Đặt lại đơn vị tiền tệ
	
	    // Khôi phục loại giao dịch (Thu/Chi/Transfer) nếu được truyền vào
	    if (persistedType) {
	        const radioToSelect = document.querySelector(`input[name="type"][value="${persistedType}"]`);
	        if (radioToSelect) {
	            radioToSelect.checked = true;
	        }
	    } else {
	        // Mặc định chọn "Chi" nếu không có persistedType
	        const typeChiRadio = document.getElementById('type-chi');
	        if (typeChiRadio) typeChiRadio.checked = true;
	    }
	
	    editingTransactionId = null; // Reset ID đang sửa
	    // Cập nhật tiêu đề form và nút submit về trạng thái "Thêm mới"
	    if (formTitleEl) formTitleEl.textContent = 'Thêm Giao Dịch Mới';
	    if (submitButton) {
	        submitButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>Thêm Giao Dịch';
	    }
	
	    toggleFormFields(); // Cập nhật hiển thị các trường dựa trên loại giao dịch
	    
	    // Điền lại danh sách tài khoản và cố gắng khôi phục lựa chọn trước đó
	    populateAccountDropdowns(); // Hàm này sẽ điền các options
	
	    // Cố gắng khôi phục giá trị tài khoản đã chọn
	    if (accountInput && Array.from(accountInput.options).some(opt => opt.value === previousAccountValue)) {
	        accountInput.value = previousAccountValue;
	    }
	    // Nếu là giao dịch chuyển tiền và giá trị "Đến tài khoản" trước đó hợp lệ
	    if (document.querySelector('input[name="type"]:checked')?.value === 'Transfer' && 
	        toAccountInput && 
	        Array.from(toAccountInput.options).some(opt => opt.value === previousToAccountValue)) {
	        toAccountInput.value = previousToAccountValue;
	    }
	
	
	    // Điền lại danh mục nếu không phải là giao dịch chuyển tiền
	    // và giữ lại lựa chọn hạng mục nếu có thể (tùy thuộc vào việc bạn có muốn giữ lại hạng mục không)
	    // Hiện tại, populateCategories sẽ chọn hạng mục đầu tiên của loại giao dịch mới.
	    // Nếu bạn muốn giữ lại hạng mục, cần logic tương tự như giữ lại tài khoản.
	    const currentTransactionType = document.querySelector('input[name="type"]:checked');
	    if (currentTransactionType && currentTransactionType.value !== 'Transfer') {
	        populateCategories(); // Điều này sẽ chọn hạng mục đầu tiên cho loại Thu/Chi
	    }
	    
	    // Đặt lại focus vào trường đầu tiên hoặc trường số tiền (tùy chọn)
	    // datetimeInput.focus(); 
	    // Hoặc
	    // amountTextInput.focus();
	}

        function getMonthDisplayText(selectedMonthValue, withParentheses = true) {
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

        // --- HÀM SỬA GIAO DỊCH (CẬP NHẬT CÁCH ĐIỀN `amountTextInput`) ---
        window.loadTransactionForEdit = function(transactionId) {
            let transactionToEdit = transactions.find(t => t.id === transactionId);
            let baseIdForEdit = transactionId; // ID cơ sở để chỉnh sửa

            if (!transactionToEdit) { // Có thể là một phần của giao dịch chuyển tiền
                const transferPart = transactions.find(t => t.isTransfer && (t.id === transactionId || t.transferPairId === transactionId));
                if (transferPart) {
                    baseIdForEdit = transferPart.id.split('_')[0]; // Lấy ID gốc của cặp chuyển tiền
                    // Tìm cả hai phần của giao dịch chuyển tiền dựa trên baseIdForEdit
                    const outTx = transactions.find(t => t.id.startsWith(baseIdForEdit) && t.type === 'Chi' && t.isTransfer);
                    const inTx = transactions.find(t => t.id.startsWith(baseIdForEdit) && t.type === 'Thu' && t.isTransfer);
                    if (outTx && inTx) {
                        transactionToEdit = outTx; // Dùng outTx làm cơ sở để điền form, vì nó chứa tài khoản nguồn
                        datetimeInput.value = formatDateTimeLocalInput(new Date(outTx.datetime));
                        document.getElementById('type-transfer').checked = true;
                        
                        // QUAN TRỌNG: Điền vào ô input số tiền giá trị originalAmount (là giá trị thô người dùng đã nhập)
                        amountTextInput.value = String(outTx.originalAmount); 
                        formCurrencySelector.value = outTx.originalCurrency; // Đơn vị tiền tệ gốc khi nhập

                        descriptionInput.value = outTx.description.startsWith("Chuyển tiền từ") ? outTx.description : (inTx.description.startsWith("Nhận tiền từ") ? inTx.description : outTx.description);
                        accountInput.value = outTx.account;
                        toAccountInput.value = inTx.account;
                    } else {
                        showMessage('Lỗi: Không tìm thấy đủ thông tin giao dịch chuyển tiền để sửa.', 'error'); return;
                    }
                } else {
                    showMessage('Lỗi: Không tìm thấy giao dịch.', 'error'); return;
                }
            } else { // Giao dịch thu/chi thông thường
                datetimeInput.value = formatDateTimeLocalInput(new Date(transactionToEdit.datetime));
                document.querySelector(`input[name="type"][value="${transactionToEdit.type}"]`).checked = true;
                
                // QUAN TRỌNG: Điền vào ô input số tiền giá trị originalAmount
                amountTextInput.value = String(transactionToEdit.originalAmount);
                formCurrencySelector.value = transactionToEdit.originalCurrency;

                descriptionInput.value = transactionToEdit.description;
                accountInput.value = transactionToEdit.account;
                if (transactionToEdit.type !== 'Transfer') categoryInput.value = transactionToEdit.category;
            }

            editingTransactionId = baseIdForEdit; // Lưu ID cơ sở để submit biết là đang sửa
            formTitleEl.textContent = 'Sửa Giao Dịch';
            submitButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>Lưu Thay Đổi`;
            toggleFormFields(); // Quan trọng để hiện/ẩn đúng trường cho loại giao dịch
            populateAccountDropdowns(); // Tải lại danh sách tài khoản
            if (document.querySelector('input[name="type"]:checked').value !== 'Transfer') {
                populateCategories(); // Tải lại danh mục nếu không phải chuyển tiền
                if(transactionToEdit && transactionToEdit.type !== 'Transfer') categoryInput.value = transactionToEdit.category;
            }
            const formSection = document.querySelector('.form-section .collapsible-header');
            if(formSection && !formSection.classList.contains('active')) formSection.click();
            formSection.scrollIntoView({ behavior: 'smooth' });
        }

		// --- HÀM ĐỐI SOÁT
		function renderReconciliationSection() {
			const container = document.getElementById("reconciliation-account-list");
			if (!container) return;
			container.innerHTML = "";

			accounts.forEach(acc => {
				const balance = calculateAccountBalance(acc.value);
				const itemDiv = document.createElement("div");
				// Sử dụng các class cơ bản, Tailwind cho layout nếu cần
				itemDiv.className = "reconcile-item flex flex-col md:flex-row items-center justify-between gap-2"; // Loại bỏ p-3, border, rounded từ Tailwind ở đây nếu CSS đã xử lý

				itemDiv.innerHTML = `
					<div class="reconcile-item__main-info flex flex-col sm:flex-row sm:items-center sm:gap-3 flex-grow">
						<div class="reconcile-item__title font-semibold min-w-[120px] flex-shrink-0">${acc.text}</div>
						<div class="reconcile-item__balance-app inline-flex items-center gap-1.5 py-1.5 px-3 rounded-md text-sm">
							<span>Số dư (ứng dụng):</span>
							<span class="reconcile-item__balance-app-value font-bold" id="app-balance-${acc.value}">${formatCurrency(balance)}</span>
						</div>
					</div>
					<div class="reconcile-item__actions flex items-center gap-2 flex-shrink-0">
						<input type="text" inputmode="decimal" class="reconcile-item__actual-balance-input w-36 p-2.5 text-sm text-right rounded-md border" placeholder="Số dư thực tế" id="reconcile-input-${acc.value}">
						<button class="btn-primary reconcile-item__button py-2.5 min-w-[90px]" id="reconcile-btn-${acc.value}">Đối soát</button>
					</div>
					<div class="reconcile-item__result-container w-full mt-3 pt-3 text-sm" id="reconcile-result-${acc.value}" style="display: none;">
						{/* JavaScript sẽ điền kết quả vào đây */}
					</div>
				`;
				container.appendChild(itemDiv);

				const reconcileBtn = document.getElementById(`reconcile-btn-${acc.value}`);
				if (reconcileBtn) {
					reconcileBtn.onclick = () => {
						handleReconcileAccount(acc.value, balance);
					};
				}
			});
			// Sau khi render xong, áp dụng theme hiện tại cho các mục vừa tạo
			updateReconciliationTheme(document.body.classList.contains(DARK_MODE_CLASS) ? 'dark' : 'light');
		}
		function calculateAccountBalanceAsOfDate(accountId, specificDate) {
			let balance = 0;
			const dateLimit = new Date(specificDate);
			// Để tính số dư ĐẦU ngày, chúng ta cần các giao dịch TRƯỚC ngày đó.
			// Hoặc nếu specificDate là cuối ngày, thì tính đến hết ngày đó.
			// Giả sử specificDate là đầu ngày (00:00:00) của ngày bắt đầu tuần.
			// Vậy ta sẽ tính tất cả giao dịch có datetime < specificDate.
			transactions.forEach(tx => {
				if (tx.account === accountId) {
					const txDate = new Date(tx.datetime);
					if (txDate < dateLimit) { // Chỉ lấy các giao dịch TRƯỚC ngày bắt đầu của tuần
						if (tx.type === 'Thu') {
							balance += tx.amount;
						} else if (tx.type === 'Chi') {
							balance -= tx.amount;
						}
					}
				}
			});
			return balance;
		}
		function renderReconciliationTable() {
			const tableBody = document.getElementById('reconciliation-table-body');
			if (!accounts || accounts.length === 0) return;
			tableBody.innerHTML = '';

			accounts.forEach(acc => {
				const systemBalance = getAccountBalance(acc.value); // Viết hàm này nếu chưa có
				const tr = document.createElement('tr');
				tr.innerHTML = `
					<td>${acc.text}</td>
					<td>${formatCurrency(systemBalance, 'VND')}</td>
					<td>
						<input type="number" class="input-actual-balance" data-account="${acc.value}" placeholder="Nhập số dư thực tế">
					</td>
					<td class="diff-cell" id="diff-${acc.value}"></td>
					<td>
						<button class="btn-primary btn-reconcile" data-account="${acc.value}">Đối soát</button>
					</td>
				`;
				tableBody.appendChild(tr);
			});

			// Gán sự kiện
			document.querySelectorAll('.btn-reconcile').forEach(btn => {
				btn.onclick = function() {
					const account = btn.getAttribute('data-account');
					const input = document.querySelector(`.input-actual-balance[data-account="${account}"]`);
					const actual = parseFloat(input.value);
					const system = getAccountBalance(account);
					const diff = actual - system;
					document.getElementById(`diff-${account}`).textContent = formatCurrency(diff, 'VND');
					saveReconciliationResult(account, system, actual, diff);
				};
			});
		}
		function getAccountBalance(account) {
			// Sử dụng transactions để tính
			let balance = 0;
			transactions.forEach(tx => {
				if (tx.account === account) {
					if (tx.type === "Thu" || tx.type === "Transfer-in") balance += tx.amount;
					else if (tx.type === "Chi" || tx.type === "Transfer-out") balance -= tx.amount;
				}
			});
			return balance;
		}
		// Hàm lưu lịch sử đối soát
		function saveReconciliationResult(account, system, actual, diff) {
			const { year, week } = getISOWeekAndYear(new Date());
			const data = { account, year, week, system, actual, diff, timestamp: new Date().toISOString() };
			let history = JSON.parse(localStorage.getItem('reconciliation_history') || '[]');
			history.push(data);
			localStorage.setItem('reconciliation_history', JSON.stringify(history));
			showMessage("Đã lưu kết quả đối soát cho " + account, 'success');
		}
		// Khi load xong data:
		document.addEventListener('DOMContentLoaded', renderReconciliationTable);
		
		function handleActualBalanceInput(accountId, endOfWeek) {
		  const input = document.getElementById(`actual-balance-${accountId}`);
		  const actual = parseFloat(input.value);

		  // Hiện chênh lệch ngay khi nhập
		  const diffTd = document.getElementById(`diff-${accountId}`);
		  if (!isNaN(actual)) {
			diffTd.textContent = formatCurrency(actual - endOfWeek);
		  } else {
			diffTd.textContent = '';
		  }

		  // Lưu vào localStorage theo tuần & tài khoản
		  let weekKey = getCurrentWeekKey();
		  let reconciliationHistory = JSON.parse(localStorage.getItem('reconciliationHistory') || '{}');
		  if (!reconciliationHistory[weekKey]) reconciliationHistory[weekKey] = {};
		  reconciliationHistory[weekKey][accountId] = actual;
		  localStorage.setItem('reconciliationHistory', JSON.stringify(reconciliationHistory));
		}		
		function reconcileAccount(accountId, endOfWeek) {
		  handleActualBalanceInput(accountId, endOfWeek);
		  // Có thể thêm alert, thông báo, hoặc hiệu ứng ở đây
		  // Ví dụ: alert("Đối soát xong cho " + accountId);
		}

		function createReconciliationAdjustment(accountValue, type, category, amount, newAppBalance) {
			const now = new Date();
			const isoDate = formatIsoDateTime(now);

			const adjustmentTx = {
				id: "adj_" + Date.now() + "_" + Math.floor(Math.random() * 10000),
				datetime: isoDate,
				type: type,
				category: category,
				description: `Đối soát tài khoản [${accountValue}] ngày ${formatDisplayDateTime(isoDate)}.`,
				amount: amount,
				account: accountValue,
				isTransfer: false,
				originalAmount: amount,
				originalCurrency: 'VND'
			};
			transactions.push(adjustmentTx);
			localStorage.setItem('transactions_v2', JSON.stringify(transactions));
			showMessage("Đã tạo giao dịch điều chỉnh!", "success");
			renderAccountBalanceList && renderAccountBalanceList();
			renderReconciliationSection && renderReconciliationSection();
			typeof applyMainFilter === "function" && applyMainFilter();

			// Hiện thông báo đã tạo, và cập nhật số dư mới
			const resultDiv = document.getElementById(`reconcile-result-${accountValue}`);
			if (resultDiv) {
				resultDiv.innerHTML = `
					<div class="flex items-center gap-2">
						<span class="text-green-700 font-semibold">Đã tạo điều chỉnh thành công! Số dư đã cập nhật.</span>
						<span>✔️</span>
					</div>
				`;
			}
		}
        // --- CÁC HÀM RENDER, UPDATE CHARTS, FILTER (Giữ nguyên logic, chúng sẽ dùng giá trị `amount` đã đúng) ---
        window.deleteTransaction = function(transactionId) { if (!confirm('Bạn có chắc muốn xóa giao dịch này?')) return; const transactionToDelete = transactions.find(t => t.id === transactionId); if (transactionToDelete && transactionToDelete.isTransfer) { transactions = transactions.filter(t => t.id !== transactionToDelete.id && t.transferPairId !== transactionToDelete.id); } else { const baseIdMatch = transactionId.match(/^(\d+)(_out|_in)?$/); if(baseIdMatch && baseIdMatch[1]){ const baseId = baseIdMatch[1]; transactions = transactions.filter(t => !t.id.startsWith(baseId) && !(t.transferPairId && t.transferPairId.startsWith(baseId))); } else { transactions = transactions.filter(t => t.id !== transactionId); } } saveTransactions(); applyMainFilter(); showMessage('Đã xóa giao dịch.', 'success'); }

        function renderMainTransactions(txsToRender = transactions) {
            transactionList.innerHTML = '';
            if (txsToRender.length === 0) { noTransactionsMessage.style.display = 'block'; return; }
            noTransactionsMessage.style.display = 'none';
            txsToRender.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
            txsToRender.forEach(tx => {
                const row = transactionList.insertRow();
                row.insertCell().textContent = formatDisplayDateTime(tx.datetime);
                let displayDescription = tx.description;
                let displayCategory = tx.category;
                let displayAccount = accounts.find(a => a.value === tx.account)?.text || tx.account;
                if (tx.isTransfer) {
                    const pair = transactions.find(p => p.id === tx.transferPairId);
                    const pairAccountName = pair ? (accounts.find(a => a.value === pair.account)?.text || pair.account) : 'N/A';
                    if (tx.type === 'Chi') { displayDescription = displayDescription || `Chuyển đến ${pairAccountName}`; }
                    else { displayDescription = displayDescription || `Nhận từ ${pairAccountName}`; }
                }
                row.insertCell().textContent = displayDescription;
                row.insertCell().textContent = displayCategory;
                const amountCell = row.insertCell();
                const vndAmountFormatted = formatCurrency(tx.amount);
                if (tx.originalCurrency === 'USD' && typeof tx.originalAmount === 'number') {
                    const originalUsdFormatted = formatCurrency(tx.originalAmount, 'USD');
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
                editBtn.onclick = () => loadTransactionForEdit(editId);
                const deleteBtn = document.createElement('button');
                deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash mr-1" viewBox="0 0 16 16"> <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/> <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/> </svg>Xóa`;
                deleteBtn.classList.add('btn-delete');
                const deleteId = tx.isTransfer ? tx.id.split('_')[0] : tx.id;
                deleteBtn.onclick = () => deleteTransaction(deleteId);
                actionsCell.appendChild(editBtn); actionsCell.appendChild(deleteBtn);
            });
        }

        function updateAllSummariesAndCharts(transactionsToAnalyze = transactions) { updateMainSummaryAndChart(transactionsToAnalyze); renderExpenseCategoryChartAndList(transactionsToAnalyze); updateAccountBalances(); renderLast7DaysChart(); renderMonthComparisonChart(); }
		function updateMainSummaryAndChart(summaryTransactionsToUse = transactions, monthForDisplay = (filterMonthSelect ? filterMonthSelect.value : 'all')) {
			// summaryTransactionsToUse: là mảng giao dịch đã được lọc (thường bởi bộ lọc tháng chung).
			// monthForDisplay: là tháng được chọn từ bộ lọc tháng chung (ví dụ: "2025-05" hoặc "all").
			//                  Tham số này có thể không cần thiết nếu hàm này chỉ cập nhật biểu đồ
			//                  và tiêu đề biểu đồ được cập nhật ở nơi khác (như trong applyMainFilter).

			let totalIncome = 0;
			let totalExpenses = 0;

			// Đảm bảo summaryTransactionsToUse là một mảng trước khi lặp
			if (typeof summaryTransactionsToUse !== 'undefined' && Array.isArray(summaryTransactionsToUse)) {
				summaryTransactionsToUse.forEach(tx => {
					if (tx.type === 'Thu') totalIncome += tx.amount;
					else if (tx.type === 'Chi') totalExpenses += tx.amount;
				});
			} else {
				console.warn("updateMainSummaryAndChart: summaryTransactionsToUse không phải là mảng hoặc không được định nghĩa. Đặt lại thành 0.");
				// totalIncome và totalExpenses sẽ giữ giá trị 0 đã khởi tạo
			}

			// Cập nhật BIỂU ĐỒ CHUNG "Thu vs Chi" (nếu có)
			// Giả sử bạn có hàm renderOrUpdateMainChart và biến incomeExpenseChartCanvas đã được khai báo toàn cục
			if (typeof renderOrUpdateMainChart === 'function' && incomeExpenseChartCanvas) {
				renderOrUpdateMainChart(totalIncome, totalExpenses);
			} else {
				// console.warn("updateMainSummaryAndChart: renderOrUpdateMainChart function or incomeExpenseChartCanvas is not available.");
			}

			// --- CÁC DÒNG SAU ĐÂY ĐÃ BỊ XÓA HOẶC VÔ HIỆU HÓA ---
			// Lý do: Phần cập nhật text của "Tóm tắt tài chính" giờ đây do hàm 'updateSummarySectionText'
			// (được điều khiển bởi menu 'summary-filter-month') đảm nhiệm.

			// const selectedMonthValue = filterMonthSelect.value; // Không dùng trực tiếp filterMonthSelect.value ở đây nữa nếu dùng monthForDisplay
			// const monthDisplayTextForLabels = getMonthDisplayText(monthForDisplay, true);

			// const summaryIncomeMonthDisplayEl = document.getElementById('summary-income-month-display');
			// if (summaryIncomeMonthDisplayEl) summaryIncomeMonthDisplayEl.textContent = monthDisplayTextForLabels;

			// const summaryExpenseMonthDisplayEl = document.getElementById('summary-expense-month-display');
			// if (summaryExpenseMonthDisplayEl) summaryExpenseMonthDisplayEl.textContent = monthDisplayTextForLabels;

			// const summaryBalanceMonthDisplayEl = document.getElementById('summary-balance-month-display');
			// if (summaryBalanceMonthDisplayEl) summaryBalanceMonthDisplayEl.textContent = monthDisplayTextForLabels;

			// if (totalIncomeEl) totalIncomeEl.textContent = formatCurrency(totalIncome);
			// if (totalExpensesEl) totalExpensesEl.textContent = formatCurrency(totalExpenses);
			// if (currentBalanceEl) {
			//     currentBalanceEl.textContent = formatCurrency(totalIncome - totalExpenses);
			//     currentBalanceEl.className = (totalIncome - totalExpenses >= 0) ? 'text-blue-600 font-bold' : 'text-red-600 font-bold';
			// }
		}
		

		function updateSummarySectionText(summaryTransactions, monthForDisplay) {
			let totalIncome = 0;
			let totalExpenses = 0;

			if (typeof summaryTransactions !== 'undefined' && Array.isArray(summaryTransactions)) {
				summaryTransactions.forEach(tx => {
					if (tx.type === 'Thu' && !tx.isTransfer) { // <<< THÊM ĐIỀU KIỆN !tx.isTransfer
						totalIncome += tx.amount;
					} else if (tx.type === 'Chi' && !tx.isTransfer) { // <<< THÊM ĐIỀU KIỆN !tx.isTransfer
						totalExpenses += tx.amount;
					}
				});
			}

			const monthDisplayTextForLabels = getMonthDisplayText(monthForDisplay, true);

			// Sử dụng các biến DOM toàn cục đã khai báo
			if (summaryIncomeMonthDisplayEl) summaryIncomeMonthDisplayEl.textContent = monthDisplayTextForLabels;
			if (summaryExpenseMonthDisplayEl) summaryExpenseMonthDisplayEl.textContent = monthDisplayTextForLabels;
			if (summaryBalanceMonthDisplayEl) summaryBalanceMonthDisplayEl.textContent = monthDisplayTextForLabels;

			if (totalIncomeEl) totalIncomeEl.textContent = formatCurrency(totalIncome);
			if (totalExpensesEl) totalExpensesEl.textContent = formatCurrency(totalExpenses);

			if (currentBalanceEl) {
				const balance = totalIncome - totalExpenses;
				currentBalanceEl.textContent = formatCurrency(balance);
				let balanceClasses = 'font-bold';
				if (balance >= 0) {
					balanceClasses += ' text-blue-600 dark:text-blue-400';
				} else {
					balanceClasses += ' text-red-600 dark:text-red-400';
				}
				currentBalanceEl.className = balanceClasses;
			}
		}

        function renderOrUpdateMainChart(income, expenses) { const data = { labels: ['Tổng Thu', 'Tổng Chi'], datasets: [{ label: 'Số tiền (VNĐ)', data: [income, expenses], backgroundColor: [categoryColors[1], categoryColors[0]], }] }; if (incomeExpenseChart) { incomeExpenseChart.data = data; incomeExpenseChart.update(); } else { incomeExpenseChart = new Chart(incomeExpenseChartCanvas, { type: 'bar', data, options: { responsive: true, maintainAspectRatio: false, plugins: { datalabels: { display: false } } } }); } }

		function renderExpenseCategoryChartAndList(transactionsToAnalyze = transactions) {
			const expenseTransactions = transactionsToAnalyze.filter(t => t.type === 'Chi' && !t.isTransfer);
			const expenseByCategory = {};
			let totalExpensesInFilteredPeriod = 0; // Đổi tên biến để rõ ràng hơn

			expenseTransactions.forEach(tx => {
				const category = tx.category || "Chưa phân loại"; // Xử lý hạng mục null/undefined
				expenseByCategory[category] = (expenseByCategory[category] || 0) + tx.amount;
				totalExpensesInFilteredPeriod += tx.amount;
			});

			// Xử lý khi không có dữ liệu chi tiêu để vẽ biểu đồ
			if (totalExpensesInFilteredPeriod === 0) {
				if (expensePieChartContainer) expensePieChartContainer.style.display = 'none';
				if (expenseBarChartContainer) expenseBarChartContainer.style.display = 'none';
				if (noExpenseDataChartEl) noExpenseDataChartEl.style.display = 'block';

				if (expenseCategoryChart) { expenseCategoryChart.destroy(); expenseCategoryChart = null; }
				if (expenseCategoryBarChart) { expenseCategoryBarChart.destroy(); expenseCategoryBarChart = null; }

				// Xử lý danh sách chi tiết (có thể bạn đã có)
				if (expenseCategoryListContainerEl) expenseCategoryListContainerEl.innerHTML = ''; // Hoặc hiển thị thông báo
				if (noExpenseDataListEl) noExpenseDataListEl.style.display = 'block';
				return;
			}

			// Nếu có dữ liệu, ẩn thông báo "không có dữ liệu"
			if (noExpenseDataChartEl) noExpenseDataChartEl.style.display = 'none';
			if (noExpenseDataListEl) noExpenseDataListEl.style.display = 'none';

			const sortedCategoriesArray = Object.entries(expenseByCategory).sort(([, a], [, b]) => b - a);
			const categoryLabels = sortedCategoriesArray.map(entry => entry[0]);
			const categoryData = sortedCategoriesArray.map(entry => entry[1]);
			const backgroundColors = categoryLabels.map((_, i) => categoryColors[i % categoryColors.length]);

			// Lấy các giá trị màu sắc dựa trên theme hiện tại (nên được định nghĩa trong updateAllChartColorsForTheme và truyền vào hoặc lấy từ đó)
			const currentThemeIsDark = document.body.classList.contains(DARK_MODE_CLASS);
			const pieBorderColor = '#FFFFFF'; // <-- LUÔN LÀ MÀU TRẮNG
			const legendAndTickColor = currentThemeIsDark ? '#9ca3af' : '#6b7280';
			const gridLineColor = currentThemeIsDark ? 'rgba(107, 114, 128, 0.2)' : 'rgba(209, 213, 219, 0.5)';
			const datalabelPieColor = '#ffffff';
			const datalabelBarColor = currentThemeIsDark ? '#e0e0e0' : '#333333';

			// 1. BIỂU ĐỒ TRÒN (PIE/DOUGHNUT)
			const pieChartData = {
				labels: categoryLabels,
				datasets: [{
					data: categoryData,
					backgroundColor: backgroundColors,
					borderColor: pieBorderColor, // <--- THUỘC TÍNH CẦN THAY ĐỔI
					borderWidth: 2 // Bạn có thể điều chỉnh độ dày của viền ở đây
				}]
			};
			
			const pieChartOptions = {
				responsive: true, maintainAspectRatio: false,
				plugins: {
					legend: { position: 'bottom', labels: { boxWidth: 12, padding: 15, color: legendAndTickColor } },
					tooltip: {
						callbacks: {
							label: function(context) {
								let label = context.label || '';
								if (label) { label += ': '; }
								const value = context.raw;
								label += formatCurrency(value, 'VND');
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
						color: datalabelPieColor, font: { weight: 'bold' }
					}
				}
			};

			if (expenseCategoryChart) {
				expenseCategoryChart.data = pieChartData;
				expenseCategoryChart.options.plugins.legend.labels.color = legendAndTickColor;
				expenseCategoryChart.data.datasets[0].borderColor = pieBorderColor; // Quan trọng khi theme thay đổi
				expenseCategoryChart.options.plugins.datalabels.color = datalabelPieColor; // Cập nhật màu datalabel
				expenseCategoryChart.update();
			} else {
				if (expenseCategoryChartCanvas) { // Chỉ tạo nếu canvas tồn tại
					 expenseCategoryChart = new Chart(expenseCategoryChartCanvas, { type: 'doughnut', data: pieChartData, options: pieChartOptions, plugins: [ChartDataLabels] });
				} else {
					console.error("Canvas for expenseCategoryChart not found!");
				}
			}

			// 2. BIỂU ĐỒ CỘT NGANG (BAR)
			const barChartData = {
				labels: categoryLabels,
				datasets: [{
					label: 'Số tiền chi', data: categoryData, backgroundColor: backgroundColors,
					borderColor: backgroundColors, // Hoặc màu đậm hơn: backgroundColors.map(c => Chart.helpers.color(c).darken(0.1).rgbString()) - API cũ
					borderWidth: 1
				}]
			};
			const barChartOptions = {
				indexAxis: 'y', responsive: true, maintainAspectRatio: false,
				scales: {
					x: {
						beginAtZero: true, title: { display: true, text: 'Số tiền (VNĐ)', color: legendAndTickColor },
						ticks: { callback: function(value) { return formatCurrency(value, 'VND').replace(/\s*VNĐ$/, ''); }, color: legendAndTickColor },
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
						callbacks: { /* ... như trên ... */ }
					},
					datalabels: {
						anchor: 'end', align: 'end', formatter: (value) => formatCurrency(value, 'VND'),
						color: datalabelBarColor, font: { weight: 'bold', size: 10 }, padding: { left: 4 }
					}
				}
			};

			if (expenseCategoryBarChart) {
				expenseCategoryBarChart.data = barChartData;
				// Cập nhật các màu sắc options
				expenseCategoryBarChart.options.scales.x.title.color = legendAndTickColor;
				expenseCategoryBarChart.options.scales.x.ticks.color = legendAndTickColor;
				expenseCategoryBarChart.options.scales.x.grid.color = gridLineColor;
				expenseCategoryBarChart.options.scales.y.ticks.color = legendAndTickColor;
				expenseCategoryBarChart.options.plugins.datalabels.color = datalabelBarColor;
				expenseCategoryBarChart.update();
			} else {
				if (expenseCategoryBarCtx) { // Chỉ tạo nếu context tồn tại
					expenseCategoryBarChart = new Chart(expenseCategoryBarCtx, { type: 'bar', data: barChartData, options: barChartOptions, plugins: [ChartDataLabels] });
				} else {
					console.error("Canvas context for expenseCategoryBarChart not found!");
				}
			}

			// Cập nhật danh sách chi tiết (giữ nguyên logic của bạn, đảm bảo dùng sortedCategoriesArray)
			if(expenseCategoryListContainerEl && totalExpensesInFilteredPeriod > 0) {
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
										<span class="font-semibold">${formatCurrency(amount)}</span>
										<span class="text-gray-500 dark:text-gray-400 ml-2">(${percentage}%)</span>
									</div>
								 </li>`;
				});
				listHTML += '</ul>';
				expenseCategoryListContainerEl.innerHTML = listHTML;
			} else if (expenseCategoryListContainerEl) {
				expenseCategoryListContainerEl.innerHTML = ''; // Xóa nếu không có data
			}

			toggleExpenseChartDisplay(); // Gọi để hiển thị đúng biểu đồ
		}

        function updateAccountBalances() {
            accountBalanceListEl.innerHTML = '<h3>Số Dư Theo Tài Khoản (Tổng thể - VNĐ):</h3>'; const balances = {};
            accounts.forEach(acc => balances[acc.value] = 0);
            transactions.forEach(tx => { if (balances[tx.account] !== undefined) { if (tx.type === 'Thu') balances[tx.account] += tx.amount; else if (tx.type === 'Chi') balances[tx.account] -= tx.amount; } });
            Object.keys(balances).forEach(accValue => {
                const acc = accounts.find(a => a.value === accValue);
                if (acc) {
                    const balanceItem = document.createElement('div');
                    balanceItem.classList.add('summary-item');
                    balanceItem.innerHTML = `<span>${acc.text}: </span><span class="${balances[accValue] >= 0 ? 'text-green-600' : 'text-red-600'}">${formatCurrency(balances[accValue])}</span>`;
                    accountBalanceListEl.appendChild(balanceItem);
                }
            });
        }

        function getPastDate(daysAgo) { const date = new Date(); date.setDate(date.getDate() - daysAgo); date.setHours(0, 0, 0, 0); return date; }
        function renderLast7DaysChart() { const today = new Date(); today.setHours(23,59,59,999); const sevenDaysAgo = getPastDate(6); const dailyExpenses = {}; const labels = []; for (let i = 0; i < 7; i++) { const d = new Date(sevenDaysAgo); d.setDate(d.getDate() + i); const dateString = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }); labels.push(dateString); dailyExpenses[dateString] = 0; } transactions.filter(tx => { const txDate = new Date(tx.datetime); return tx.type === 'Chi' && !tx.isTransfer && txDate >= sevenDaysAgo && txDate <= today; }).forEach(tx => { const dateString = new Date(tx.datetime).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }); if (dailyExpenses[dateString] !== undefined) dailyExpenses[dateString] += tx.amount; }); const dataValues = labels.map(label => dailyExpenses[label]); const data = { labels: labels, datasets: [{ label: 'Chi tiêu hàng ngày (VNĐ)', data: dataValues, borderColor: categoryColors[3], backgroundColor: 'transparent', tension: 0.1, fill: false }] }; if (last7DaysChart) { last7DaysChart.data = data; last7DaysChart.update(); } else { last7DaysChart = new Chart(last7DaysChartCanvas, { type: 'line', data, options: { responsive: true, maintainAspectRatio: false, plugins: { datalabels: { display: false } } } }); } }
        function renderMonthComparisonChart() { const currentMonthFilter = filterMonthSelect.value; if (!currentMonthFilter || currentMonthFilter === 'all') return; const [currentYear, currentMonthNum] = currentMonthFilter.split('-').map(Number); let prevYear = currentYear; let prevMonthNum = currentMonthNum - 1; if (prevMonthNum === 0) { prevMonthNum = 12; prevYear--; } const prevMonthFilter = `${prevYear}-${String(prevMonthNum).padStart(2, '0')}`; let currentMonthIncome = 0, currentMonthExpenses = 0, prevMonthIncome = 0, prevMonthExpenses = 0; transactions.forEach(tx => { const txMonth = tx.datetime.substring(0, 7); if (txMonth === currentMonthFilter) { if (tx.type === 'Thu' && !tx.isTransfer) currentMonthIncome += tx.amount; else if (tx.type === 'Chi' && !tx.isTransfer) currentMonthExpenses += tx.amount; } else if (txMonth === prevMonthFilter) { if (tx.type === 'Thu' && !tx.isTransfer) prevMonthIncome += tx.amount; else if (tx.type === 'Chi' && !tx.isTransfer) prevMonthExpenses += tx.amount; } }); const data = { labels: ['Tháng Trước', 'Tháng Này'], datasets: [ { label: 'Tổng Thu', data: [prevMonthIncome, currentMonthIncome], backgroundColor: categoryColors[1] }, { label: 'Tổng Chi', data: [prevMonthExpenses, currentMonthExpenses], backgroundColor: categoryColors[0] } ] }; if (monthComparisonChart) { monthComparisonChart.data = data; monthComparisonChart.update(); } else { monthComparisonChart = new Chart(monthComparisonChartCanvas, { type: 'bar', data, options: { responsive: true, maintainAspectRatio: false, indexAxis: 'x', plugins: { datalabels: { display: false } } } }); } }
		function updateDetailedStatisticsTable(transactionsToAnalyze) {
			let totalIncome = 0;
			let totalExpense = 0;
			let incomeTxCount = 0;
			let expenseTxCount = 0;
			const nonTransferExpenseByCategory = {}; // Để tính hạng mục chi nhiều nhất không bao gồm chuyển tiền

			transactionsToAnalyze.forEach(tx => {
				if (tx.type === 'Thu' && !tx.isTransfer) { // <<< THÊM ĐIỀU KIỆN
					totalIncome += tx.amount;
					incomeTxCount++; // Cân nhắc: Bạn có muốn đếm giao dịch nhận tiền chuyển khoản là một "giao dịch thu nhập" không?
									 // Nếu không, thêm !tx.isTransfer vào điều kiện của incomeTxCount++
				} else if (tx.type === 'Chi' && !tx.isTransfer) { // <<< THÊM ĐIỀU KIỆN
					totalExpense += tx.amount;
					expenseTxCount++; // Tương tự, cân nhắc cho expenseTxCount++
					// Phần nonTransferExpenseByCategory đã đúng, không cần sửa
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

			// Hàm nhỏ để cập nhật textContent an toàn
			const setText = (id, value) => {
				const el = document.getElementById(id);
				if (el) el.textContent = value;
				else console.warn(`Element with ID '${id}' not found for statistics table.`);
			};

			setText('stats-total-income', formatCurrency(totalIncome));
			setText('stats-total-expense', formatCurrency(totalExpense));

			const statsNetCashflowEl = document.getElementById('stats-net-cashflow');
			if (statsNetCashflowEl) {
				statsNetCashflowEl.textContent = formatCurrency(netCashflow);
				// Xóa các class màu cũ của Tailwind trước khi thêm class mới
				statsNetCashflowEl.classList.remove('text-blue-600', 'dark:text-blue-400', 'text-red-600', 'dark:text-red-400');
				if (netCashflow >= 0) {
					statsNetCashflowEl.classList.add('text-blue-600', 'dark:text-blue-400');
				} else {
					statsNetCashflowEl.classList.add('text-red-600', 'dark:text-red-400');
				}
			} else {
				console.warn("Element with ID 'stats-net-cashflow' not found.");
			}

			setText('stats-income-tx-count', incomeTxCount);
			setText('stats-expense-tx-count', expenseTxCount);
			setText('stats-top-expense-cat', topExpenseCategoryName);
			setText('stats-top-expense-cat-amount', formatCurrency(topExpenseCategoryAmount));

			// Cập nhật tháng hiển thị trong tiêu đề bảng
			const selectedMonthForStatsTitle = filterMonthSelect.value; // Đảm bảo filterMonthSelect đã được khai báo
			const statsTableMonthDisplayText = getMonthDisplayText(selectedMonthForStatsTitle, false);
			const statsTableMonthDisplayEl = document.getElementById('stats-table-month-display');
			if (statsTableMonthDisplayEl) {
				statsTableMonthDisplayEl.textContent = `(${statsTableMonthDisplayText})`;
			} else {
				console.warn("Element with ID 'stats-table-month-display' not found.");
			}
		}

        function filterTransactionsByMonth() { applyMainFilter(); }
        function applyMainFilter() {
            const selectedMonth = filterMonthSelect ? filterMonthSelect.value : 'all';
            const selectedSpecificDate = filterSpecificDateInput ? filterSpecificDateInput.value : "";
            
            console.log(`[Filter] Applying filter: Month='${selectedMonth}', Date='${selectedSpecificDate}'`);

            // --- 1. Lọc dữ liệu dựa trên lựa chọn của người dùng ---

            // Dữ liệu cho các mục có phạm vi theo tháng (hoặc tất cả các tháng)
            // Ví dụ: Tóm tắt tài chính, Thống kê chi tiết, Phân loại chi tiêu theo hạng mục.
            let transactionsForMonthlyScope = [...transactions]; 
            if (selectedMonth !== 'all') {
                transactionsForMonthlyScope = transactionsForMonthlyScope.filter(tx => {
                    // Đảm bảo tx.datetime tồn tại và là chuỗi trước khi dùng startsWith
                    return tx.datetime && typeof tx.datetime === 'string' && tx.datetime.startsWith(selectedMonth);
                });
            }

            // Dữ liệu cho danh sách giao dịch chính (có thể được lọc thêm theo ngày cụ thể)
            let transactionsForDailyListScope = [...transactionsForMonthlyScope]; // Bắt đầu với dữ liệu đã lọc theo tháng
            if (selectedSpecificDate) { 
                // Nếu người dùng đã chọn một ngày cụ thể:
                // - Nếu đang xem "Tất cả các tháng", sẽ lọc ngày từ toàn bộ giao dịch.
                // - Nếu đang xem một tháng cụ thể, sẽ lọc ngày từ các giao dịch của tháng đó.
                let baseForDailyFilter = (selectedMonth === 'all') ? [...transactions] : [...transactionsForMonthlyScope];
                transactionsForDailyListScope = baseForDailyFilter.filter(tx => {
                    if (!tx.datetime || typeof tx.datetime !== 'string') return false;
                    const transactionDatePart = tx.datetime.substring(0, 10); // Lấy phần YYYY-MM-DD
                    return (transactionDatePart === selectedSpecificDate);
                });
            }
            
            console.log(`[Filter] Transactions for Monthly Scope: ${transactionsForMonthlyScope.length} items`);
            console.log(`[Filter] Transactions for Daily List Scope: ${transactionsForDailyListScope.length} items`);

            // --- 2. Cập nhật các thành phần giao diện dựa trên dữ liệu đã lọc ---
            
            // Cập nhật Danh sách giao dịch chính (hiển thị giao dịch theo ngày nếu được chọn, hoặc theo tháng/tất cả)
            renderMainTransactions(transactionsForDailyListScope);

            // Cập nhật phần Tóm tắt tài chính (Tổng thu, Tổng chi, Số dư) 
            // Phần này sẽ sử dụng dữ liệu đã lọc theo tháng (transactionsForMonthlyScope)
            updateSummarySectionText(transactionsForMonthlyScope, selectedMonth);
            
            // Cập nhật tất cả các Biểu đồ và danh sách Số dư các tài khoản
            // - Các biểu đồ theo tháng (Thu vs Chi chính, Phân loại chi tiêu) sẽ dùng transactionsForMonthlyScope.
            // - Các biểu đồ không theo tháng (7 ngày qua) hoặc tổng hợp (Số dư tài khoản, So sánh tháng) sẽ dùng logic riêng bên trong.
            updateAllSummariesAndCharts(transactionsForMonthlyScope); 

            // Cập nhật Bảng thống kê chi tiết - sử dụng dữ liệu đã lọc theo tháng
            updateDetailedStatisticsTable(transactionsForMonthlyScope);

            // --- 3. Cập nhật tiêu đề cho các khu vực dựa trên bộ lọc hiện tại ---
            const monthOnlyDisplayText = getMonthDisplayText(selectedMonth, false); // Lấy văn bản hiển thị cho tháng/tất cả

            // Tiêu đề cho khu vực "Phân Loại Chi Tiêu"
            const expenseBreakdownTitleTextEl = document.getElementById('expense-breakdown-title-text');
            if (expenseBreakdownTitleTextEl) {
                expenseBreakdownTitleTextEl.textContent = `Phân Loại Chi Tiêu ${monthOnlyDisplayText || 'Tổng Quan'} - VNĐ`;
            }

            // Tiêu đề phụ cho "Bảng Thống Kê Chi Tiết" (phần tháng trong ngoặc đơn)
            const statsTableMonthDisplayEl = document.getElementById('stats-table-month-display');
            if (statsTableMonthDisplayEl) {
                statsTableMonthDisplayEl.textContent = `(${monthOnlyDisplayText || 'Tổng Quan'})`;
            }

            // Tiêu đề cho "Biểu Đồ Thu vs Chi" chính
            // Tiêu đề này có thể phản ánh cả ngày cụ thể nếu người dùng đã chọn.
            // Lưu ý: Dữ liệu cho biểu đồ này (renderOrUpdateMainChart) hiện tại vẫn dựa trên transactionsForMonthlyScope.
            // Nếu bạn muốn dữ liệu biểu đồ này cũng thay đổi theo ngày cụ thể, cần điều chỉnh logic trong updateMainSummaryAndChart.
            const incomeExpenseChartTitleEl = document.getElementById('income-expense-chart-title');
            if (incomeExpenseChartTitleEl) {
                let titleForIncomeExpenseChart = monthOnlyDisplayText; 
                if (selectedSpecificDate) { 
                    const dateParts = selectedSpecificDate.split('-'); // YYYY-MM-DD
                    const displayDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`; // DD/MM/YYYY
                    if (selectedMonth === 'all' || titleForIncomeExpenseChart === "Tất cả") {
                        // Nếu đang xem "Tất cả các tháng" và chọn ngày, tiêu đề chỉ là ngày đó.
                        titleForIncomeExpenseChart = `Ngày ${displayDate}`;
                    } else {
                        // Nếu đang xem một tháng cụ thể và chọn ngày, tiêu đề là "Tháng MM/YYYY, ngày DD".
                        titleForIncomeExpenseChart = `${titleForIncomeExpenseChart}, ngày ${dateParts[2]}`; 
                    }
                }
                incomeExpenseChartTitleEl.textContent = `Biểu Đồ Thu vs Chi ${titleForIncomeExpenseChart || 'Tổng Quan'} - VNĐ`;
            }
            console.log("[Filter] UI Update in applyMainFilter completed.");
        }

        function getISOWeekNumber(d) { d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); return Math.ceil((((d - yearStart) / 86400000) + 1) / 7); }
        function getWeekIdFromDateTime(dateTimeStr) { if (!dateTimeStr) return null; const date = new Date(dateTimeStr); if (isNaN(date.getTime())) return null; const year = date.getFullYear(); const weekNumber = getISOWeekNumber(date); return `${year}-W${String(weekNumber).padStart(2, '0')}`; }
        function getStartDateOfISOWeek(year, week) { const simple = new Date(year, 0, 1 + (week - 1) * 7); const dow = simple.getDay(); const ISOweekStart = simple; if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1); else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay()); ISOweekStart.setHours(0,0,0,0); return ISOweekStart; }
        function getWeekDates(weekId) { if (!weekId || !weekId.includes('-W')) return { start: null, end: null }; const [yearStr, weekNumStr] = weekId.split('-W'); const year = parseInt(yearStr); const week = parseInt(weekNumStr, 10); if (isNaN(year) || isNaN(week)) return { start: null, end: null }; const startDate = getStartDateOfISOWeek(year, week); const endDate = new Date(startDate); endDate.setDate(startDate.getDate() + 6); endDate.setHours(23, 59, 59, 999); return { start: startDate, end: endDate }; }
        function getNumberOfISOWeeks(year) { const date = new Date(year, 11, 28); return getISOWeekNumber(date); }
        function getAllWeekIdsInYear(year) { if (isNaN(year) || year < 1900 || year > 2200) return []; const numWeeks = getNumberOfISOWeeks(year); const weekIds = []; for (let i = 1; i <= numWeeks; i++) weekIds.push(`${year}-W${String(i).padStart(2, '0')}`); return weekIds; }
        function getPreviousWeekId(weekId) { if (!weekId || !weekId.includes('-W')) return null; let [yearStr, weekNumStr] = weekId.split('-W'); let year = parseInt(yearStr); let week = parseInt(weekNumStr); if (week > 1) return `${year}-W${String(week - 1).padStart(2, '0')}`; else { year--; const numWeeksInPrevYear = getNumberOfISOWeeks(year); return `${year}-W${String(numWeeksInPrevYear).padStart(2, '0')}`; } }

        function populateComparisonWeekFilter() {
            const year = parseInt(filterComparisonYearInput.value);
            if (isNaN(year)) { filterComparisonWeekSelect.innerHTML = '<option value="none">-- Chọn năm hợp lệ --</option>'; return; }
            const weekIds = getAllWeekIdsInYear(year).reverse();
            filterComparisonWeekSelect.innerHTML = '<option value="none">-- Chọn tuần --</option>';
            weekIds.forEach(id => {
                const {start, end} = getWeekDates(id);
                const optionText = `${id.replace(year + "-W","Tuần ")} (${start.toLocaleDateString('vi-VN')} - ${end.toLocaleDateString('vi-VN')})`;
                filterComparisonWeekSelect.add(new Option(optionText, id));
            });
        }
		
		function populateMonthFilter() {
			if (!filterMonthSelect) { // filterMonthSelect là biến toàn cục
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
			filterMonthSelect.innerHTML = '<option value="all">Tất cả các tháng</option>'; // Luôn có lựa chọn "Tất cả"

			sortedMonths.forEach(monthStr => {
				if (monthStr && typeof monthStr === 'string' && monthStr.includes('-')) {
					const parts = monthStr.split('-');
					if (parts.length === 2) {
						const year = parts[0];
						const month = parts[1];
						const displayText = `Tháng ${month}/${year}`; // Văn bản thuần
						const option = new Option(displayText, monthStr);
						filterMonthSelect.add(option);
					}
				}
			});

			// Đặt giá trị mặc định (ví dụ: tháng mới nhất hoặc "Tất cả")
			const currentSystemMonthFormatted = new Date().toISOString().substring(0, 7);
			if (sortedMonths.includes(currentSystemMonthFormatted)) {
				filterMonthSelect.value = currentSystemMonthFormatted;
			} else if (sortedMonths.length > 0 && sortedMonths[0] && typeof sortedMonths[0] === 'string') {
				filterMonthSelect.value = sortedMonths[0];
			} else {
				filterMonthSelect.value = "all";
			}
		}

		function populateSpecificMonthFilter(selectElement) {
			if (!selectElement) {
				console.warn("populateSpecificMonthFilter: selectElement is not provided.");
				return;
			}

			const months = new Set();
			if (typeof transactions !== 'undefined' && Array.isArray(transactions)) {
				transactions.forEach(tx => {
					if (tx.datetime) {
						try {
							if (typeof tx.datetime === 'string' && tx.datetime.length >= 7) {
								months.add(tx.datetime.substring(0, 7));
							} else {
								console.warn("populateSpecificMonthFilter: Định dạng tx.datetime không hợp lệ hoặc quá ngắn:", tx.datetime);
							}
						} catch (e) {
							console.error("populateSpecificMonthFilter: Lỗi khi lấy substring từ tx.datetime:", tx.datetime, e);
						}
					}
				});
			}

			const sortedMonths = Array.from(months).sort().reverse();
			selectElement.innerHTML = '<option value="all">Tất cả các tháng</option>'; // Reset các options cũ

			sortedMonths.forEach(monthStr => {
				if (monthStr && typeof monthStr === 'string' && monthStr.includes('-')) {
					const parts = monthStr.split('-');
					if (parts.length === 2) {
						const year = parts[0];
						const month = parts[1];
						const displayText = `Tháng ${month}/${year}`; // Văn bản thuần túy
						const option = new Option(displayText, monthStr);
						selectElement.add(option);
					} else {
						console.warn("populateSpecificMonthFilter: Định dạng monthStr không đúng sau khi split:", monthStr);
					}
				} else {
					console.warn("populateSpecificMonthFilter: Giá trị monthStr không hợp lệ trong sortedMonths:", monthStr);
				}
			});

			// Đặt giá trị mặc định cho menu chọn tháng
			const currentSystemMonthFormatted = new Date().toISOString().substring(0, 7);
			if (sortedMonths.includes(currentSystemMonthFormatted)) {
				selectElement.value = currentSystemMonthFormatted;
			} else if (sortedMonths.length > 0 && sortedMonths[0] && typeof sortedMonths[0] === 'string' && sortedMonths[0].includes('-')) {
				selectElement.value = sortedMonths[0];
			} else {
				selectElement.value = "all";
			}
		}

        function calculateWeeklyStats(transactionsInPeriod, weekStartDate) { let income = 0, expenses = 0, startBalance = 0; const allSortedTransactions = [...transactions].sort((a,b) => new Date(a.datetime) - new Date(b.datetime)); for (const tx of allSortedTransactions) { const txDate = new Date(tx.datetime); if (txDate < weekStartDate) { if (tx.type === 'Thu') startBalance += tx.amount; else if (tx.type === 'Chi') startBalance -= tx.amount; } else break; } transactionsInPeriod.forEach(tx => { if (tx.type === 'Thu' && !tx.isTransfer) income += tx.amount; else if (tx.type === 'Chi' && !tx.isTransfer) expenses += tx.amount; }); return { startBalance, income, expenses, netChange: income - expenses }; }

        function updateWeeklyComparisonDisplay() {
            const selectedWeekId = filterComparisonWeekSelect.value;
            if (selectedWeekId === 'none') { weeklyComparisonContentEl.style.display = 'none'; noComparisonDataEl.style.display = 'block'; return; }
            weeklyComparisonContentEl.style.display = 'grid'; noComparisonDataEl.style.display = 'none';
            const currentWeekDates = getWeekDates(selectedWeekId);
            if (!currentWeekDates.start) { weeklyComparisonContentEl.style.display = 'none'; noComparisonDataEl.style.display = 'block'; noComparisonDataEl.textContent = 'Tuần không hợp lệ.'; return; }
            const currentWeekTransactions = transactions.filter(tx => { const txDate = new Date(tx.datetime); return txDate >= currentWeekDates.start && txDate <= currentWeekDates.end; });
            const currentWeekStats = calculateWeeklyStats(currentWeekTransactions, currentWeekDates.start);
            selectedWeekDisplayEl.textContent = `${selectedWeekId.replace(filterComparisonYearInput.value + "-W","Tuần ")} (${currentWeekDates.start.toLocaleDateString('vi-VN')} - ${currentWeekDates.end.toLocaleDateString('vi-VN')})`;
            currentWeekStartBalanceEl.textContent = formatCurrency(currentWeekStats.startBalance);
            currentWeekIncomeEl.textContent = formatCurrency(currentWeekStats.income);
            currentWeekExpensesEl.textContent = formatCurrency(currentWeekStats.expenses);
            currentWeekNetChangeEl.textContent = formatCurrency(currentWeekStats.netChange);
            currentWeekNetChangeEl.className = currentWeekStats.netChange >= 0 ? 'font-bold text-green-600' : 'font-bold text-red-600';
            const prevWeekId = getPreviousWeekId(selectedWeekId);
            if (prevWeekId) {
                const prevWeekDates = getWeekDates(prevWeekId);
                if(prevWeekDates.start) {
                    const prevWeekTransactions = transactions.filter(tx => { const txDate = new Date(tx.datetime); return txDate >= prevWeekDates.start && txDate <= prevWeekDates.end; });
                    const prevWeekStats = calculateWeeklyStats(prevWeekTransactions, prevWeekDates.start);
                    previousWeekDisplayEl.textContent = `${prevWeekId.replace(filterComparisonYearInput.value + "-W","Tuần ")} (${prevWeekDates.start.toLocaleDateString('vi-VN')} - ${prevWeekDates.end.toLocaleDateString('vi-VN')})`;
                    previousWeekExpensesEl.textContent = formatCurrency(prevWeekStats.expenses);
                    const difference = currentWeekStats.expenses - prevWeekStats.expenses;
                    spendingDifferenceEl.textContent = formatCurrency(difference);
                    spendingDifferenceEl.className = difference >= 0 ? 'font-bold text-red-600' : 'font-bold text-green-600';
                } else { previousWeekDisplayEl.textContent = "N/A"; previousWeekExpensesEl.textContent = formatCurrency(0); spendingDifferenceEl.textContent = formatCurrency(0); }
            } else { previousWeekDisplayEl.textContent = "N/A"; previousWeekExpensesEl.textContent = formatCurrency(0); spendingDifferenceEl.textContent = formatCurrency(0); }
        }

        function escapeCSVValue(value) { if (value == null) return ''; value = String(value); if (value.includes(',') || value.includes('\n') || value.includes('"')) { value = value.replace(/\"/g, '""'); return `"${value}"`; } return value; }
        function exportToCSV() { if (transactions.length === 0) { showMessage('Không có dữ liệu giao dịch để xuất.', 'error'); return; } const headers = [ 'ID Giao Dịch', 'Ngày Giờ (YYYY-MM-DD HH:mm:ss)', 'Nội dung', 'Hạng mục', 'Loại (Thu/Chi)', 'Số Tiền (VNĐ)', 'Tài khoản', 'Là Chuyển Khoản?', 'ID Liên Kết CK', 'Số Tiền Gốc', 'Đơn Vị Gốc' ]; const rows = transactions.map(tx => { const accountName = accounts.find(acc => acc.value === tx.account)?.text || tx.account; return [ tx.id, formatDateTimeForCSV(tx.datetime), tx.description, tx.category, tx.type, tx.amount, accountName, tx.isTransfer ? 'Có' : 'Không', tx.isTransfer ? tx.transferPairId : '', tx.originalAmount, tx.originalCurrency ].map(escapeCSVValue); }); let csvContent = "\ufeff"; csvContent += headers.join(',') + '\n'; rows.forEach(rowArray => { csvContent += rowArray.join(',') + '\n'; }); const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); if (link.download !== undefined) { const url = URL.createObjectURL(blob); link.setAttribute('href', url); link.setAttribute('download', `transactions_${new Date().toISOString().slice(0,10)}.csv`); link.style.visibility = 'hidden'; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url); showMessage('Dữ liệu đã được xuất ra CSV!', 'success'); } else { showMessage('Trình duyệt của bạn không hỗ trợ tải file trực tiếp.', 'error'); } }
        function exportData() { const dataToExport = { transactions, incomeCategories, expenseCategories, accounts }; const dataStr = JSON.stringify(dataToExport, null, 2); const blob = new Blob([dataStr], {type: "application/json"}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `financial_data_${new Date().toISOString().slice(0,10)}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); showMessage('Dữ liệu đã được xuất!', 'success'); }
        function handleImportFile(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = function(e) { try { const importedData = JSON.parse(e.target.result); if (importedData.transactions && importedData.incomeCategories && importedData.expenseCategories && importedData.accounts) { if (!confirm('Nhập dữ liệu sẽ ghi đè toàn bộ dữ liệu hiện tại. Bạn có chắc chắn muốn tiếp tục?')) { importFileInput.value = ''; return; } transactions = importedData.transactions; incomeCategories = importedData.incomeCategories; expenseCategories = importedData.expenseCategories; accounts = importedData.accounts; saveTransactions(); saveUserPreferences(); initializeApp(); showMessage('Dữ liệu đã được nhập thành công!', 'success'); } else { showMessage('Lỗi: Định dạng file không hợp lệ.', 'error'); } } catch (error) { showMessage(`Lỗi khi nhập file: ${error.message}`, 'error'); console.error("Import error:", error); } finally { importFileInput.value = ''; } }; reader.readAsText(file); }

        // --- HÀM FUNCTION VIRTUAL KEYBOARD ---
		let activeInputForVirtualKeyboard = null; // Biến theo dõi ô input đang active với bàn phím ảo

		function showVirtualKeyboard(inputElement) {
			const virtualKeyboardEl = document.getElementById('virtualNumericKeyboard'); // Lấy element ở đây
			if (virtualKeyboardEl && inputElement) {
				console.log("[Keyboard] Showing virtual keyboard for:", inputElement.id);
				virtualKeyboardEl.style.display = 'grid'; // Hoặc 'block' tùy theo CSS layout bàn phím
				activeInputForVirtualKeyboard = inputElement;
				// ... (code hiện tại của bạn để hiển thị bàn phím) ...
				virtualKeyboardEl.style.display = 'grid'; // Hoặc 'block'
				activeInputForVirtualKeyboard = inputElement;

				// Thêm logic cuộn ở đây:
				setTimeout(() => { // Dùng setTimeout để đảm bảo bàn phím đã render và có kích thước
					const keyboardHeight = virtualKeyboardEl.offsetHeight;
					const inputRect = activeInputForVirtualKeyboard.getBoundingClientRect();
					const viewportHeight = window.innerHeight;

					// Tính xem phần dưới của input có bị che không, hoặc một khoảng không gian cần thiết bên dưới input
					const spaceNeededBelowInput = 50; // Khoảng đệm để nhìn thấy trường tiếp theo hoặc nút submit
					const inputBottomPosition = inputRect.bottom;

					if (inputBottomPosition > (viewportHeight - keyboardHeight - spaceNeededBelowInput)) {
						const scrollAmount = inputBottomPosition - (viewportHeight - keyboardHeight - spaceNeededBelowInput);
						window.scrollBy(0, scrollAmount);
						console.log(`[Keyboard] Scrolled by: ${scrollAmount}px`);
					}
					// Hoặc một cách đơn giản hơn là cuộn trường input vào tầm nhìn,
					// nhưng cần cẩn thận để không cuộn quá nhiều nếu bàn phím che mất nó từ dưới lên.
					// activeInputForVirtualKeyboard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
					// Tuy nhiên, scrollIntoView có thể không hoạt động tốt với fixed keyboard,
					// window.scrollBy thường cho kiểm soát tốt hơn trong trường hợp này.

				}, 100); // Chờ một chút để DOM cập nhật				
				// Không dùng readonly ở đây nữa, sẽ xử lý bằng blur và preventDefault
			} else {
				console.error("[Keyboard] Cannot show virtual keyboard. virtualKeyboardEl or inputElement is missing.");
			}
		}

		function hideVirtualKeyboard() {
			const virtualKeyboardEl = document.getElementById('virtualNumericKeyboard'); // Lấy element ở đây
			if (virtualKeyboardEl) {
				console.log("[Keyboard] Hiding virtual keyboard");
				virtualKeyboardEl.style.display = 'none';
				if (activeInputForVirtualKeyboard) {
					// Cân nhắc có nên activeInputForVirtualKeyboard.blur(); ở đây không
					// Nếu người dùng nhấn "Done", focus sẽ chuyển sang nút submit
				}
				activeInputForVirtualKeyboard = null;
			}
		}
		
		// --- HÀM KHỞI TẠO ỨNG DỤNG ---
		function initializeApp() {
			console.log("[Debug] initializeApp CALLED")
			console.log("[APP] initializeApp CALLED");
			// migrateOriginalAmountsForOldVNDTransactions();

			loadThemePreference(); // Quan trọng: gọi đầu tiên
			loadUserPreferences();

			if (formCurrencySelector) formCurrencySelector.value = 'VND';
			setDefaultDateTime();
			setDefaultComparisonYear();
			const typeChiRadio = document.getElementById('type-chi');
			if (typeChiRadio) typeChiRadio.checked = true;
			// THÊM DÒNG NÀY ĐỂ CẬP NHẬT NGÀY HIỆN TẠI CHO BỘ LỌC NGÀY CỤ THỂ
			if (filterSpecificDateInput) {
				filterSpecificDateInput.value = getCurrentDateFormattedYYYYMMDD();
			}

			populateAccountDropdowns();
			toggleFormFields();
			renderCustomCategoryLists();
			renderAccountListAdmin();

			populateMonthFilter();
			applyMainFilter();

			populateComparisonWeekFilter();
			const currentSystemYear = new Date().getFullYear();
			// const yearInFilterInput = document.getElementById('filter-comparison-year'); // Đã có biến global filterComparisonYearInput
			// const weekFilterSelect = document.getElementById('filter-comparison-week'); // Đã có biến global filterComparisonWeekSelect

			// Sử dụng biến global đã được khai báo ở đầu tệp script.js
			if (filterComparisonYearInput && filterComparisonWeekSelect) { 
				const yearInFilter = parseInt(filterComparisonYearInput.value);

				if (yearInFilter === currentSystemYear) {
					const currentWeekId = getCurrentISOWeekId(); // Gọi hàm trợ giúp mới
					
					// Kiểm tra xem tùy chọn tuần hiện tại có tồn tại trong danh sách không
					const currentWeekOptionExists = Array.from(filterComparisonWeekSelect.options).some(opt => opt.value === currentWeekId);

					if (currentWeekOptionExists) {
						filterComparisonWeekSelect.value = currentWeekId;
						console.log(`[APP] Tuần hiện tại ${currentWeekId} đã được tự động chọn.`);
					} else {
						console.warn(`[APP] Tuần hiện tại (${currentWeekId}) không tìm thấy trong danh sách cho năm ${yearInFilter}.`);
						// Nếu muốn, bạn có thể chọn tuần mới nhất có sẵn ở đây
						// Ví dụ: if (filterComparisonWeekSelect.options.length > 1) filterComparisonWeekSelect.selectedIndex = 1; (chọn tuần đầu tiên sau "-- Chọn tuần --")
					}
				}
			}
			// --- KẾT THÚC PHẦN TỰ ĐỘNG CHỌN TUẦN HIỆN TẠI ---

			updateWeeklyComparisonDisplay();
			
		// Load phần đối soát
			renderReconciliationSection();
			const actualWeekBalanceInput = document.getElementById('actual-week-balance');
			const saveActualBalanceBtn = document.getElementById('save-actual-balance-btn');
			const reconciliationResult = document.getElementById('reconciliation-result');
	

			// Collapsible sections
			const collapsibleHeaders = document.querySelectorAll('.collapsible-header');
			collapsibleHeaders.forEach(header => {
				const contentId = header.dataset.collapsibleTarget;
				const content = document.getElementById(contentId);
				if (!content) { console.error(`Collapsible Error: Content ID '${contentId}' not found.`, header); return; }
				const storedState = localStorage.getItem(`collapsibleState_${contentId}`);
				let isActive = header.classList.contains('active'); // Default từ HTML
				if (storedState === 'expanded') isActive = true;
				if (storedState === 'collapsed') isActive = false;

				if (isActive) {
					header.classList.add('active');
					content.classList.add('active');
					// Nếu dùng maxHeight cho section lớn
					// if (content.classList.contains('collapsible-content')) { // Chỉ áp dụng cho content chính
					//    setTimeout(() => { if (content.classList.contains('active')) content.style.maxHeight = content.scrollHeight + "px"; }, 50);
					// }
				} else {
					header.classList.remove('active');
					content.classList.remove('active');
					// if (content.classList.contains('collapsible-content')) content.style.maxHeight = null;
				}
				header.addEventListener('click', () => {
					header.classList.toggle('active');
					content.classList.toggle('active');
					localStorage.setItem(`collapsibleState_${contentId}`, content.classList.contains('active') ? 'expanded' : 'collapsed');
					// if (content.classList.contains('collapsible-content') && content.classList.contains('active')) {
					//     content.style.maxHeight = content.scrollHeight + "px";
					// } else if (content.classList.contains('collapsible-content')) {
					//     content.style.maxHeight = null;
					// }
				});
			});

			const listHeaders = document.querySelectorAll('.collapsible-list-header');
			listHeaders.forEach(header => {
				const contentId = header.dataset.collapsibleTarget;
				const contentList = document.getElementById(contentId);
				if (!contentList) { console.error(`Collapsible List Error: Content UL ID '${contentId}' not found.`, header); return; }
				if (header.classList.contains('active')) {
					if (!contentList.classList.contains('active')) contentList.classList.add('active');
					setTimeout(() => { if (contentList.classList.contains('active')) contentList.style.maxHeight = contentList.scrollHeight + "px"; }, 150);
				} else {
					if (contentList.classList.contains('active')) contentList.classList.remove('active');
					contentList.style.maxHeight = null;
				}
				header.addEventListener('click', () => {
					header.classList.toggle('active');
					contentList.classList.toggle('active');
					if (contentList.classList.contains('active')) {
						contentList.style.maxHeight = contentList.scrollHeight + "px";
					} else {
						contentList.style.maxHeight = null;
					}
				});
			});

			// Event listener cho bộ chọn kiểu biểu đồ chi tiêu
			if (expenseChartTypeSelector) {
				expenseChartTypeSelector.addEventListener('change', toggleExpenseChartDisplay);
			} else {
				console.warn("[APP] expenseChartTypeSelector not found.");
			}

			// Nút "Thêm 000"
			if (addTripleZeroButton && amountTextInput) {
				addTripleZeroButton.addEventListener('click', function() { /* ... code của bạn ... */ });
			}
					
		// Đặt hàm này ở đâu đó trong phần script của bạn, có thể ở đầu phần script cho các hàm tiện ích
		function formatAndPreserveCursor(inputElement, valueToFormat) {
			const originalValue = valueToFormat;
			let cursorPos = inputElement.selectionStart;
			const originalLength = originalValue.length;

			// 1. Loại bỏ các ký tự không hợp lệ và dấu phẩy cũ, chỉ giữ lại số và một dấu chấm thập phân
			let cleanValue = originalValue.replace(/[^0-9.]/g, "");
			const parts = cleanValue.split('.');
			let integerPart = parts[0];
			let decimalPart = parts.length > 1 ? parts.slice(1).join('') : ""; // Nối lại nếu có nhiều dấu chấm

			// Chỉ cho phép một dấu chấm thập phân
			if (parts.length > 2) {
				decimalPart = parts[1] + parts.slice(2).join(''); // Lấy phần đầu tiên sau dấu chấm và nối phần còn lại
			}
			 if (decimalPart.length > 2 && inputElement.id === 'amount-input' && document.getElementById('form-currency-selector').value === 'USD') {
				// Giới hạn 2 số thập phân cho USD, có thể mở rộng cho các tiền tệ khác nếu cần
				// decimalPart = decimalPart.substring(0, 2);
				// Với VND, bạn có thể không muốn giới hạn số thập phân khi nhập,
				// việc làm tròn sẽ do hàm parseAmountInput đảm nhiệm khi submit.
				// Hiện tại, không giới hạn số chữ số thập phân khi nhập để linh hoạt.
			}


			// 2. Định dạng phần nguyên với dấu phẩy
			let formattedInteger = "";
			if (integerPart) {
				// Bỏ qua việc parse thành số rồi format lại nếu đang gõ số 0 ở đầu (ví dụ: 007)
				if (/^0+$/.test(integerPart) && integerPart.length > 1 && (decimalPart === "" || decimalPart === undefined)) {
					 // Giữ nguyên nếu chỉ là các số 0 (ví dụ 00) để cho phép nhập 0.5 sau đó
					 // formattedInteger = integerPart; // Tạm thời để người dùng nhập 007
				} else {
					const num = parseInt(integerPart, 10); // Parse để bỏ số 0 ở đầu (vd: 007 -> 7)
					if (!isNaN(num)) {
						 formattedInteger = new Intl.NumberFormat('en-US').format(num);
					} else if (integerPart === "" && (decimalPart !== "" || valueToFormat === ".")) {
						formattedInteger = "0"; // Nếu chỉ có phần thập phân, ví dụ ".5" -> "0.5"
					} else {
						formattedInteger = ""; // Nếu integerPart không hợp lệ và không có phần thập phân
					}
				}
			} else if (decimalPart !== "" || valueToFormat === ".") {
				formattedInteger = "0"; // Nếu không có phần nguyên nhưng có phần thập phân
			}


			// 3. Ghép lại giá trị đã định dạng
			let newFormattedValue = formattedInteger;
			if (decimalPart !== "" || (valueToFormat.endsWith('.') && !valueToFormat.endsWith('..'))) { // Cho phép dấu chấm ở cuối khi đang gõ
				newFormattedValue += "." + decimalPart;
			}
			 // Nếu giá trị ban đầu là "." hoặc "0." thì giữ nguyên sau khi thêm số 0
			if (valueToFormat === ".") newFormattedValue = "0.";
			if (valueToFormat === "0." && decimalPart==="") newFormattedValue = "0.";


			// Xử lý trường hợp đặc biệt: nếu người dùng chỉ nhập "0", thì hiển thị "0"
			if (integerPart === "0" && decimalPart === "" && !valueToFormat.includes('.')) {
				newFormattedValue = "0";
			}
			// Nếu người dùng xóa hết, newFormattedValue có thể là "0" do Intl.NumberFormat(NaN) hoặc (0)
			// Cần đảm bảo nếu input rỗng thì hiển thị rỗng
			if (originalValue.trim() === "") {
				newFormattedValue = "";
			}


			// 4. Cập nhật giá trị và đặt lại con trỏ
			inputElement.value = newFormattedValue;

			// Tính toán vị trí con trỏ mới
			// Logic này cố gắng giữ vị trí con trỏ tương đối dựa trên số lượng chữ số đã thay đổi.
			// Nó không hoàn hảo 100% cho mọi trường hợp phức tạp (xóa/chèn ở giữa)
			// nhưng sẽ tốt hơn là chỉ đặt con trỏ về cuối.
			if (cursorPos !== null) {
				let newCursorPos = cursorPos;
				const newLength = newFormattedValue.length;

				// Đếm số dấu phẩy trong giá trị cũ và mới trước vị trí con trỏ ước tính
				const oldCommasBefore = (originalValue.substring(0, cursorPos).match(/,/g) || []).length;
				// Ước tính vị trí con trỏ mới trước khi điều chỉnh dấu phẩy
				let tempNewCursorPos = cursorPos + (newLength - originalLength);
				if (tempNewCursorPos < 0) tempNewCursorPos = 0;
				if (tempNewCursorPos > newLength) tempNewCursorPos = newLength;

				const newCommasBefore = (newFormattedValue.substring(0, tempNewCursorPos).match(/,/g) || []).length;

				newCursorPos = tempNewCursorPos + (newCommasBefore - oldCommasBefore);

				// Đảm bảo con trỏ không vượt quá giới hạn
				if (newCursorPos < 0) newCursorPos = 0;
				if (newCursorPos > newLength) newCursorPos = newLength;

				// Đặc biệt khi xóa lùi và ký tự bị xóa là dấu phẩy
				if (inputElement.id === 'amount-input' && originalValue.charAt(cursorPos -1) === ',' && newLength < originalLength) {
					// Nếu người dùng vừa xóa dấu phẩy, vị trí con trỏ nên ở trước dấu phẩy đó
					// (giờ đã biến mất), tức là vị trí hiện tại của ký tự đứng trước dấu phẩy
					// newCursorPos = cursorPos -1; // Đã được xử lý bởi logic trên
				}


				inputElement.setSelectionRange(newCursorPos, newCursorPos);
			}
		}


		// Đảm bảo biến amountTextInput đã được khai báo ở phạm vi có thể truy cập
		// const amountTextInput = document.getElementById('amount-input');

		if (amountTextInput) {
			amountTextInput.addEventListener('input', function(e) {
				// Chỉ định dạng nếu không phải là xóa (để tránh xung đột khi xóa dấu phẩy)
				// Hoặc nếu bạn muốn nó luôn định dạng:
				formatAndPreserveCursor(e.target, e.target.value);
			});

			amountTextInput.addEventListener('keydown', function(e) {
				// Cho phép: backspace, delete, tab, escape, enter, home, end, left, right arrows
				if ([46, 8, 9, 27, 13, 35, 36, 37, 39].indexOf(e.keyCode) !== -1 ||
					// Cho phép: Ctrl+A, Command+A, Ctrl+C, Ctrl+V, Ctrl+X
					((e.keyCode === 65 || e.keyCode === 88 || e.keyCode === 67 || e.keyCode === 86) && (e.ctrlKey === true || e.metaKey === true)) ||
					// Cho phép: số từ 0-9 trên bàn phím chính
					(e.keyCode >= 48 && e.keyCode <= 57 && !e.shiftKey) ||
					// Cho phép: số từ 0-9 trên numpad
					(e.keyCode >= 96 && e.keyCode <= 105) ||
					// Cho phép: dấu chấm (period) và dấu chấm trên numpad (decimal point)
					(e.keyCode === 190 || e.keyCode === 110)) {
					// Nếu là dấu chấm, kiểm tra xem đã có dấu chấm chưa
					if ((e.keyCode === 190 || e.keyCode === 110) && this.value.includes('.')) {
						e.preventDefault(); // Ngăn nhập nhiều hơn một dấu chấm
					}
					return; // Cho phép các phím này
				}
				// Ngăn chặn tất cả các phím khác không được liệt kê ở trên
				e.preventDefault();
			});
		}
			

			// ----- VIRTUAL KEYBOARD LOGIC -----
			const virtualKeyboardEl = document.getElementById('virtualNumericKeyboard');
			const amountInputForKeyboard = document.getElementById('amount-input'); // Đổi tên biến để tránh nhầm lẫn với amountTextInput toàn cục nếu có

			if (amountInputForKeyboard && virtualKeyboardEl) {
				console.log('[Keyboard] Initializing event listeners for virtual keyboard.');

				// Sử dụng 'click' để có kiểm soát tốt hơn trên mobile và ngăn bàn phím OS
				amountInputForKeyboard.addEventListener('click', function(event) {
					// Chỉ kích hoạt bàn phím ảo trên thiết bị cảm ứng
					if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
						console.log("[Keyboard] Amount input CLICKED on touch device.");
						event.preventDefault(); // QUAN TRỌNG: Ngăn hành vi mặc định (mở bàn phím OS)
						
						// Nếu bàn phím ảo đang ẩn hoặc chưa được hiển thị cho input này, thì hiện nó
						if (virtualKeyboardEl.style.display === 'none' || virtualKeyboardEl.style.display === '' || activeInputForVirtualKeyboard !== this) {
							showVirtualKeyboard(this);
						}
						// Ngăn việc focus thực sự vào input để tránh bàn phím OS tự động bật lên sau đó
						this.blur(); 
					}
				});

				// Xử lý khi focus vào input (ví dụ bằng phím Tab trên desktop)
				// Trên mobile, chúng ta muốn click là chính, focus có thể gây ra hiện bàn phím OS không mong muốn
				amountInputForKeyboard.addEventListener('focus', function(e) {
					if ('ontouchstart' in window || navigator.maxTouchPoints > 0) { // Nếu là thiết bị cảm ứng
						console.log("[Keyboard] Amount input FOCUSED on touch device - attempting to blur and show virtual.");
						e.target.blur(); // LUÔN BLUR ngay để ngăn bàn phím OS
						// Sau đó, nếu bàn phím ảo đang ẩn, hiện nó.
						if (virtualKeyboardEl.style.display === 'none' || virtualKeyboardEl.style.display === '') {
							showVirtualKeyboard(this);
						}
					} else {
						// Trên desktop, cho phép focus bình thường, không hiện bàn phím ảo tự động khi focus
						console.log("[Keyboard] Amount input FOCUSED on non-touch device.");
					}
				});

				// Gán sự kiện cho các nút trên bàn phím ảo
				virtualKeyboardEl.addEventListener('touchstart', function(event) {
					if (!activeInputForVirtualKeyboard) {
						console.warn("[Keyboard] Virtual keyboard key pressed, but no active input target.");
						return;
					}

					const targetButton = event.target.closest('button.virtual-key');
					if (!targetButton) return; // Chỉ xử lý nếu click vào nút có class 'virtual-key'

					const key = targetButton.dataset.key;
					console.log("[Keyboard] Virtual key pressed:", key);

					let currentValue = activeInputForVirtualKeyboard.value;

					if (key === 'backspace') {
						activeInputForVirtualKeyboard.value = currentValue.slice(0, -1);
					} else if (key === 'done') {
						hideVirtualKeyboard();
						// Tùy chọn: chuyển focus sang nút submit hoặc một hành động khác
						if (submitButton) submitButton.focus();
					} else if (key === '.') {
						if (!currentValue.includes('.')) { // Chỉ cho phép một dấu chấm
							activeInputForVirtualKeyboard.value += key;
						}
					} else if (key) { // Các phím số (0-9) và '000'
						activeInputForVirtualKeyboard.value += key;
					}
					formatAndPreserveCursor(activeInputForVirtualKeyboard, activeInputForVirtualKeyboard.value);					
					// Không nên gọi activeInputForVirtualKeyboard.focus() ở đây vì có thể kích hoạt lại bàn phím OS
				});
			} else {
				if (!virtualKeyboardEl) console.warn("[Keyboard] Virtual keyboard element with ID 'virtualNumericKeyboard' not found.");
				if (!amountInputForKeyboard) console.warn("[Keyboard] Amount input element with ID 'amount-input' not found for virtual keyboard.");

			}

			// Xử lý click ra ngoài để ẩn bàn phím ảo
			document.addEventListener('mousedown', function(event) {
				if (virtualKeyboardEl && virtualKeyboardEl.style.display !== 'none') {
					const isClickOnKeyboard = virtualKeyboardEl.contains(event.target);
					// activeInputForVirtualKeyboard có thể là null nếu bàn phím vừa được ẩn
					const isClickOnActiveInput = activeInputForVirtualKeyboard && activeInputForVirtualKeyboard.contains(event.target);

					if (!isClickOnKeyboard && !isClickOnActiveInput) {
						console.log("[Keyboard] Clicked outside, hiding virtual keyboard.");
						hideVirtualKeyboard();
					}
				}
			});
			
			document.querySelectorAll('.virtual-key').forEach(button => {
				let lastTap = 0;
				button.addEventListener('touchend', function(event) {
					const currentTime = new Date().getTime();
					const tapLength = currentTime - lastTap;
					if (tapLength < 300 && tapLength > 0) { 
						event.preventDefault();
						// console.log("Rapid touchend prevented on virtual key"); // Dòng log này có thể có hoặc không
					}
					lastTap = currentTime;
				});
			});	

			document.addEventListener('mousedown', function(event) {
				if (virtualKeyboard && virtualKeyboard.style.display !== 'none') {
					const isClickOnKeyboard = virtualKeyboard.contains(event.target);
					const isClickOnActiveInput = activeInputForVirtualKeyboard && activeInputForVirtualKeyboard.contains(event.target);
					if (!isClickOnKeyboard && !isClickOnActiveInput) {
						hideVirtualKeyboard();
					}
				}
			});
			// ----- END VIRTUAL KEYBOARD LOGIC -----
		    const fieldsForSuggestion = [
				...document.querySelectorAll('input[name="type"]'), // Tất cả các radio button loại
				categoryInput, 
				// accountInput // Thêm accountInput nếu muốn nó cũng kích hoạt gợi ý
			];

			fieldsForSuggestion.forEach(field => {
				if (field) { // Kiểm tra field tồn tại
					field.addEventListener('change', findAndDisplayTransactionSuggestion);
				}
			});

			// Gán sự kiện cho các nút trong khu vực gợi ý
			if (applySuggestionButtonEl) {
				applySuggestionButtonEl.addEventListener('click', applyTransactionSuggestion);
			}
			if (dismissSuggestionButtonEl) {
				dismissSuggestionButtonEl.addEventListener('click', hideTransactionSuggestion);
			}

			// Khi reset form, cũng ẩn gợi ý
			transactionForm.addEventListener('reset', hideTransactionSuggestion);	

			// Đăng ký các event listeners khác
			if(transactionForm) transactionForm.addEventListener('submit', handleTransactionSubmit);
			if (filterMonthSelect) {
				filterMonthSelect.addEventListener('change', applyMainFilter);
			}
			if (filterSpecificDateInput) {
				filterSpecificDateInput.addEventListener('change', applyMainFilter);
			}
			if (clearDateFilterButton && filterSpecificDateInput) {
				clearDateFilterButton.addEventListener('click', () => {
					filterSpecificDateInput.value = ""; // Xóa giá trị ngày
					applyMainFilter(); // Áp dụng lại bộ lọc
				});
			}
			if(typeRadioButtons) typeRadioButtons.forEach(radio => {
				radio.addEventListener('change', () => {
					toggleFormFields(); 
					const currentType = document.querySelector('input[name="type"]:checked');
					if (currentType && currentType.value !== 'Transfer') {
						populateCategories();
					}
				});
			});

			
			if (exportButton) exportButton.addEventListener('click', exportData);
			if (exportCsvButton) exportCsvButton.addEventListener('click', exportToCSV);
			if (importButton && importFileInput) importButton.addEventListener('click', () => importFileInput.click());
			if (importFileInput) importFileInput.addEventListener('change', handleImportFile);
			if (addIncomeCategoryButton && newIncomeCategoryNameInput) addIncomeCategoryButton.addEventListener('click', () => { if (addCategory(newIncomeCategoryNameInput.value, 'income')) newIncomeCategoryNameInput.value = ''; });
			if (addExpenseCategoryButton && newExpenseCategoryNameInput) addExpenseCategoryButton.addEventListener('click', () => { if (addCategory(newExpenseCategoryNameInput.value, 'expense')) newExpenseCategoryNameInput.value = ''; });
			if (addAccountButton && newAccountNameInput) { addAccountButton.addEventListener('click', () => { if (addAccount(newAccountNameInput.value)) { newAccountNameInput.value = ''; } }); }
		
			// Quan trọng: Gán listener cho dark mode toggle
			if (darkModeToggleCheckbox) {
				// console.log('[Debug] Attaching change listener to darkModeToggleCheckbox'); // Bạn có thể bỏ log này nếu dark mode đã ổn
				darkModeToggleCheckbox.addEventListener('change', toggleTheme);
			} else {
				console.error('[APP] darkModeToggleCheckbox NOT FOUND during listener attachment!');
			}
			console.log("[APP] initializeApp COMPLETED");
		}

		// KHỞI CHẠY ỨNG DỤNG
        initializeApp();