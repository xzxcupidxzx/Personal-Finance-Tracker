/**
 * TRANSACTIONS MODULE - REFINED VERSION
 * Handles transaction form, list, and CRUD operations
 * With improved Smart Reset functionality.
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
		this.smartResetEnabled = true; //
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
			this.initializeSmartResetToggle(); // Moved here to ensure smartResetEnabled is set early


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
            form: document.getElementById('transaction-form'), //
            typeRadios: document.querySelectorAll('input[name="type"]'), //
            categorySelect: document.getElementById('category-select'), //
            accountFrom: document.getElementById('account-from'), //
            accountTo: document.getElementById('account-to'), //
            toAccountRow: document.getElementById('to-account-row'), //
            categoryRow: document.getElementById('category-row'), //
            amountInput: document.getElementById('amount-input'), //
            currencySelector: document.getElementById('currency-selector'), //
            descriptionInput: document.getElementById('description-input'), //
            datetimeInput: document.getElementById('datetime-input'), //
            submitBtn: document.getElementById('submit-btn'), //
            addZerosBtn: document.getElementById('add-zeros-btn'), //
            descriptionSuggestions: document.getElementById('description-suggestions'), //

            // Filter elements
            filterPeriod: document.getElementById('filter-period'), //
            filterDate: document.getElementById('filter-date'), //

            // List elements
            transactionList: document.getElementById('transaction-list'), //
            noTransactions: document.getElementById('no-transactions'), //

            // Suggestion elements
            suggestionArea: document.getElementById('suggestion-area'), //
            suggestionDesc: document.getElementById('suggestion-desc'), //
            suggestionAmount: document.getElementById('suggestion-amount'), //
            applySuggestion: document.getElementById('apply-suggestion'), //
            dismissSuggestion: document.getElementById('dismiss-suggestion') //
        };

        // Log missing critical elements
        const criticalElements = ['form', 'amountInput', 'transactionList']; //
        criticalElements.forEach(key => {
            if (!this.elements[key]) {
                console.error(`Critical element missing: ${key}`); //
            }
        });
    }

    /**
     * Initialize debounced functions for performance
     */
    initializeDebouncedFunctions() {
        this.debouncedRenderList = Utils.UIUtils.debounce(() => { //
            this.renderTransactionList();
        }, 300);

        this.debouncedCheckSuggestions = Utils.UIUtils.debounce(() => { //
            this.checkSuggestions();
        }, 500);

        this.debouncedPopulateDescriptionSuggestions = Utils.UIUtils.debounce(() => { //
            this.populateDescriptionSuggestions();
        }, 300);
    }

    /**
     * Initialize form functionality with proper cleanup tracking
     */
    initializeForm() {
        if (!this.elements.form) { //
            console.error('Form element not found'); //
            return;
        }

        try {
            // Form submission
            const submitHandler = (e) => {
                e.preventDefault();
                this.handleSubmit();
            };
            this.elements.form.addEventListener('submit', submitHandler); //
            this.eventListeners.push({ //
                element: this.elements.form,
                event: 'submit',
                handler: submitHandler
            });

			// Transaction type change
			this.elements.typeRadios.forEach(radio => { //
				const changeHandler = () => {
					console.log('🔄 Transaction type changed to:', radio.value); //
					
					if (this.editingTransactionId) { //
						this.updateFormVisibility(); //
						this.populateCategories(); //
						return;
					}
					
					localStorage.setItem('lastTransactionType', radio.value); //
					
					this.updateFormVisibility(); //
					this.populateCategories(); //
					this.debouncedCheckSuggestions(); //
				};

				radio.addEventListener('change', changeHandler);
				this.eventListeners.push({ //
					element: radio,
					event: 'change',
					handler: changeHandler
				});
			});

            // Category change for suggestions
            if (this.elements.categorySelect) { //
                const categoryChangeHandler = () => {
                    this.debouncedCheckSuggestions(); //
                };

                this.elements.categorySelect.addEventListener('change', categoryChangeHandler); //
                this.eventListeners.push({ //
                    element: this.elements.categorySelect,
                    event: 'change',
                    handler: categoryChangeHandler
                });
            }

            // Description input for suggestions
            if (this.elements.descriptionInput) { //
                const descriptionInputHandler = () => {
                    this.debouncedCheckSuggestions(); //
                    this.debouncedPopulateDescriptionSuggestions(); //
                };
                this.elements.descriptionInput.addEventListener('input', descriptionInputHandler); //
                this.eventListeners.push({ //
                    element: this.elements.descriptionInput,
                    event: 'input',
                    handler: descriptionInputHandler
                });
            }

            // Amount input formatting
            if (this.elements.amountInput) { //
                const amountInputHandler = (e) => {
                    try {
                        Utils.UIUtils.formatAmountInputWithCursor(e.target, e.target.value); //
                        this.debouncedCheckSuggestions(); //
                    } catch (error) {
                        console.error('Error formatting amount input:', error); //
                    }
                };

                this.elements.amountInput.addEventListener('input', amountInputHandler); //
                this.eventListeners.push({ //
                    element: this.elements.amountInput,
                    event: 'input',
                    handler: amountInputHandler
                });
            }

            // Currency selector change
            if (this.elements.currencySelector) { //
                const currencyChangeHandler = () => {
                    if (this.elements.amountInput) { //
                        const currentAmount = Utils.CurrencyUtils.parseAmountInput(this.elements.amountInput.value, 'VND'); //
                        this.elements.amountInput.value = Utils.CurrencyUtils.formatAmountInput(currentAmount); //
                    }
                    this.debouncedCheckSuggestions(); //
                };
                this.elements.currencySelector.addEventListener('change', currencyChangeHandler); //
                this.eventListeners.push({ //
                    element: this.elements.currencySelector,
                    event: 'change',
                    handler: currencyChangeHandler
                });
            }

            // Set default datetime
			if (this.elements.datetimeInput) { //
				try {
					this.elements.datetimeInput.value = Utils.DateUtils.formatDateTimeLocal(); //
				} catch (error) {
					console.error('Error setting default datetime:', error); //
				}
			}

            this.loadLastTransactionTypeQuiet(); //
            this.updateFormVisibility(); //
			// initializeSmartResetToggle is called in init()

        } catch (error) {
            console.error('Error initializing form:', error); //
        }
    }

	initializeSmartResetToggle() {
		const smartResetCheckbox = document.getElementById('smart-reset-enabled'); //
		if (smartResetCheckbox) { //
			// Load saved preference
			const saved = localStorage.getItem('smartResetEnabled'); //
			this.smartResetEnabled = saved !== null ? JSON.parse(saved) : true; //
			smartResetCheckbox.checked = this.smartResetEnabled; //
			
			// Listen for changes
			const changeHandler = () => {
				this.smartResetEnabled = smartResetCheckbox.checked; //
				localStorage.setItem('smartResetEnabled', JSON.stringify(this.smartResetEnabled)); //
				console.log('🎯 Smart reset preference updated:', this.smartResetEnabled); //
				
				// Add visual feedback
				const option = smartResetCheckbox.closest('.smart-reset-option'); //
				if (option) { //
					option.classList.add('toggle-feedback'); //
					setTimeout(() => option.classList.remove('toggle-feedback'), 300); //
				}
				
				Utils.UIUtils.showMessage( //
					this.smartResetEnabled  //
						? '✅ Sẽ giữ hạng mục & tài khoản sau khi thêm' 
						: '🔄 Sẽ reset toàn bộ form sau khi thêm',
					'info',
					2000
				);
			};
			
			smartResetCheckbox.addEventListener('change', changeHandler);
			this.eventListeners.push({ //
				element: smartResetCheckbox,
				event: 'change',
				handler: changeHandler
			});
		}
	}

    loadLastTransactionType() {
        try {
            const lastType = localStorage.getItem('lastTransactionType') || 'Chi'; //
            console.log('📋 Loading last transaction type:', lastType); //
            
            const lastTypeRadio = document.querySelector(`input[name="type"][value="${lastType}"]`); //
            if (lastTypeRadio) { //
                lastTypeRadio.checked = true; //
                console.log('✅ Set last transaction type:', lastType); //
            } else {
                const defaultRadio = document.querySelector(`input[name="type"][value="Chi"]`); //
                if (defaultRadio) { //
                    defaultRadio.checked = true; //
                }
            }
        } catch (error) {
            console.error('Error loading last transaction type:', error); //
        }
    }

    initializeFilters() {
        try {
            if (this.elements.filterPeriod) { //
                const periodHandler = () => {
                    this.currentFilter.period = this.elements.filterPeriod.value; //
                    if (this.currentFilter.period !== 'custom') { //
                        this.currentFilter.date = null; //
                        if (this.elements.filterDate) { //
                            this.elements.filterDate.value = ''; //
                            this.elements.filterDate.style.display = 'none'; //
                        }
                    } else {
                        this.elements.filterDate.style.display = 'block'; //
                    }
                    this.debouncedRenderList(); //
                };

                this.elements.filterPeriod.addEventListener('change', periodHandler); //
                this.eventListeners.push({ //
                    element: this.elements.filterPeriod,
                    event: 'change',
                    handler: periodHandler
                });
            }

            if (this.elements.filterDate) { //
                const dateHandler = () => {
                    this.currentFilter.date = this.elements.filterDate.value; //
                    if (this.currentFilter.date) { //
                        this.currentFilter.period = 'custom'; //
                        if (this.elements.filterPeriod) { //
                            this.elements.filterPeriod.value = 'custom'; //
                        }
                    }
                    this.debouncedRenderList(); //
                };

                this.elements.filterDate.addEventListener('change', dateHandler); //
                this.eventListeners.push({ //
                    element: this.elements.filterDate,
                    event: 'change',
                    handler: dateHandler
                });

                if (this.elements.filterPeriod && this.elements.filterPeriod.value !== 'custom') { //
                    this.elements.filterDate.style.display = 'none'; //
                }
            }
        } catch (error) {
            console.error('Error initializing filters:', error); //
        }
    }

    initializeSuggestions() {
        try {
            if (this.elements.applySuggestion) { //
                const applyHandler = () => {
                    this.applySuggestion(); //
                };

                this.elements.applySuggestion.addEventListener('click', applyHandler); //
                this.eventListeners.push({ //
                    element: this.elements.applySuggestion,
                    event: 'click',
                    handler: applyHandler
                });
            }

            if (this.elements.dismissSuggestion) { //
                const dismissHandler = () => {
                    this.hideSuggestions(); //
                };

                this.elements.dismissSuggestion.addEventListener('click', dismissHandler); //
                this.eventListeners.push({ //
                    element: this.elements.dismissSuggestion,
                    event: 'click',
                    handler: dismissHandler
                });
            }
        } catch (error) {
            console.error('Error initializing suggestions:', error); //
        }
    }

	updateFormVisibility() {
		const selectedType = document.querySelector('input[name="type"]:checked')?.value; //
		console.log('🔧 Updating form visibility for type:', selectedType); //

		if (!selectedType) return; //

		if (this.elements.toAccountRow) { //
			this.elements.toAccountRow.style.display = selectedType === 'Transfer' ? 'flex' : 'none'; //
		}

		if (this.elements.categoryRow) { //
			this.elements.categoryRow.style.display = selectedType !== 'Transfer' ? 'flex' : 'none'; //
		}
		if (this.elements.categorySelect) { //
			if (selectedType === 'Transfer') { //
				this.elements.categorySelect.removeAttribute('required'); //
			} else {
				this.elements.categorySelect.setAttribute('required', 'required'); //
			}
		}

		if (this.elements.submitBtn) { //
			const btnText = this.elements.submitBtn.querySelector('.btn-text'); //
			const btnIcon = this.elements.submitBtn.querySelector('.btn-icon'); //
			if (btnText) { //
				btnText.textContent = selectedType === 'Transfer' ? 'Thêm Chuyển Khoản' : 'Thêm Giao Dịch'; //
			}
			if (btnIcon) { //
				btnIcon.textContent = selectedType === 'Transfer' ? '↔️' : '➕'; //
			}
		}

		const accountFromLabel = document.getElementById('account-from-label'); //
		if (accountFromLabel) { //
			accountFromLabel.textContent = selectedType === 'Transfer' ? 'Từ tài khoản' : 'Tài khoản'; //
		}

		if (typeof this.populateAccounts === 'function') { //
			if (selectedType === 'Transfer') { //
				this.populateAccounts(); //
			}
		}
	}

    populateDropdowns() {
        console.log('🔄 Populating dropdowns...'); //
        this.populateCategories(); //
        this.populateAccounts(); //
        this.populateDescriptionSuggestions(); //
    }

    populateCategories() {
        if (!this.elements.categorySelect || !this.app) { //
            console.error('❌ Category select element or app not found'); //
            return;
        }

        const selectedTypeRadio = document.querySelector('input[name="type"]:checked'); //
        const selectedType = selectedTypeRadio?.value; //
        
        console.log('📋 PopulateCategories called - selectedType:', selectedType); //
        
        if (!selectedType) { //
            console.warn('⚠️ No transaction type selected'); //
            return;
        }

        let categories = []; //

        if (selectedType === 'Thu') { //
            categories = this.app.data.incomeCategories || []; //
            console.log('💰 Loading income categories:', categories.length); //
        } else if (selectedType === 'Chi') { //
            categories = this.app.data.expenseCategories || []; //
            console.log('💸 Loading expense categories:', categories.length); //
        } else {
            console.log('ℹ️ Transfer type selected, no categories needed'); //
            return;
        }

        this.elements.categorySelect.innerHTML = '<option value="">Chọn hạng mục...</option>'; //
        
        if (categories.length === 0) { //
            console.warn('⚠️ No categories found for type:', selectedType); //
            this.elements.categorySelect.innerHTML += '<option value="" disabled>Không có danh mục</option>'; //
            return;
        }

        let addedCount = 0; //
        categories.forEach((cat, index) => { //
            if (cat && cat.value && cat.text) { //
                const option = document.createElement('option'); //
                option.value = cat.value; //
                option.textContent = cat.text; //
                this.elements.categorySelect.appendChild(option); //
                addedCount++; //
                console.log(`  ➕ Added category ${index + 1}: ${cat.text} (${cat.value})`); //
            } else {
                console.warn('⚠️ Invalid category object:', cat); //
            }
        });
        
        console.log(`✅ Categories populated successfully: ${addedCount} categories`); //
    }

    populateAccounts() {
        if (!this.elements.accountFrom || !this.app) return; //

        const accounts = this.app.data.accounts || []; //
        console.log('🏦 Populating accounts:', accounts.length); //

        this.elements.accountFrom.innerHTML = '<option value="">Chọn tài khoản...</option>'; //
        if (this.elements.accountTo) { //
            this.elements.accountTo.innerHTML = '<option value="">Chọn tài khoản nhận...</option>'; //
        }

        accounts.forEach(acc => { //
            if (acc && acc.value && acc.text) { //
                const option = document.createElement('option'); //
                option.value = acc.value; //
                option.textContent = acc.text; //
                this.elements.accountFrom.appendChild(option.cloneNode(true)); //
                if (this.elements.accountTo) { //
                    this.elements.accountTo.appendChild(option); //
                }
            }
        });

        console.log('✅ Accounts populated successfully'); //
    }

    populateDescriptionSuggestions() {
        if (!this.elements.descriptionSuggestions || !this.app || !this.app.data.transactions) return; //

        const recentDescriptions = new Set(); //
        this.app.data.transactions //
            .slice(0, 50) //
            .filter(tx => tx && tx.description) //
            .forEach(tx => recentDescriptions.add(tx.description)); //

        this.elements.descriptionSuggestions.innerHTML = ''; //
        recentDescriptions.forEach(desc => { //
            const option = document.createElement('option'); //
            option.value = desc; //
            this.elements.descriptionSuggestions.appendChild(option); //
        });
    }

    /**
     * HELPER: Applies the preserved state to the form.
     * This is called after other UI refreshes.
     */
    _applyPreservedState(preservedState) {
        if (!preservedState) {
            console.warn('_applyPreservedState called with no preservedState');
            return;
        }
        console.log('Applying preserved state:', JSON.stringify(preservedState));

        // Restore transaction type
        // This needs to happen first as it might trigger populateCategories
        if (preservedState.type) {
            const typeRadio = document.querySelector(`input[name="type"][value="${preservedState.type}"]`); //
            if (typeRadio && !typeRadio.checked) {
                typeRadio.checked = true; //
                // Dispatching change event will trigger updateFormVisibility and populateCategories
                typeRadio.dispatchEvent(new Event('change')); //
                console.log(`_applyPreservedState: Type radio for "${preservedState.type}" checked and change event dispatched.`);
            } else if (typeRadio && typeRadio.checked) {
                 console.log(`_applyPreservedState: Type radio for "${preservedState.type}" was already checked.`);
                 // If already checked, populateCategories might not have run for this type if it was already the active one.
                 // However, the change handler in initializeForm for typeRadios ALWAYS calls populateCategories.
                 // For safety, ensure categories are populated if the type didn't actually "change" from the UI's perspective
                 // but was already set. This path is less likely if type is correctly preserved.
                 // this.populateCategories(); // Potentially redundant if change event always fires populate.
            }
        }

        // Delay setting category/account to allow populateCategories (triggered by type change) to finish
        setTimeout(() => {
            console.log(`_applyPreservedState inner timeout: Attempting to set category "${preservedState.category}", account "${preservedState.account}", currency "${preservedState.currency}"`);
            // Restore Category
            if (preservedState.category && this.elements.categorySelect) { //
                const categoryOptionExists = Array.from(this.elements.categorySelect.options).some(opt => opt.value === preservedState.category); //
                if (categoryOptionExists) {
                    this.elements.categorySelect.value = preservedState.category; //
                    console.log(`_applyPreservedState: Category SET to '${this.elements.categorySelect.value}'`);
                } else {
                    console.warn(`_applyPreservedState: Preserved category "${preservedState.category}" no longer exists in the dropdown for type "${preservedState.type}". Current options:`, Array.from(this.elements.categorySelect.options).map(o => o.value));
                }
            }

            // Restore Account
            if (preservedState.account && this.elements.accountFrom) { //
                const accountOptionExists = Array.from(this.elements.accountFrom.options).some(opt => opt.value === preservedState.account); //
                if (accountOptionExists) {
                    this.elements.accountFrom.value = preservedState.account; //
                    console.log(`_applyPreservedState: Account SET to '${this.elements.accountFrom.value}'`);
                } else {
                    console.warn(`_applyPreservedState: Preserved account "${preservedState.account}" no longer exists in the dropdown. Current options:`, Array.from(this.elements.accountFrom.options).map(o => o.value));
                }
            }

            // Restore Currency
            if (preservedState.currency && this.elements.currencySelector) { //
                const currencyOptionExists = Array.from(this.elements.currencySelector.options).some(opt => opt.value === preservedState.currency); //
                if (currencyOptionExists) {
                    this.elements.currencySelector.value = preservedState.currency; //
                    console.log(`_applyPreservedState: Currency SET to '${this.elements.currencySelector.value}'`);
                } else {
                    console.warn(`_applyPreservedState: Preserved currency "${preservedState.currency}" no longer exists in the dropdown.`);
                }
            }

            this.showSmartResetFeedback(); //
            console.log('✅ Preserved state application attempt finished.');
        }, 250); // Increased delay to ensure populateCategories (from type change) completes

    }

    /**
     * Clears specific form fields after adding a transaction when smart reset is enabled.
     * The actual state restoration is handled by _applyPreservedState.
     */
	smartResetFieldsForNextEntry() {
		try {
			console.log('🎯 Smart reset: Clearing amount, description, datetime for next entry.');

			if (this.elements.amountInput) { //
				this.elements.amountInput.value = ''; //
				this.elements.amountInput.classList.remove('input-valid', 'input-invalid'); //
			}

			if (this.elements.descriptionInput) { //
				this.elements.descriptionInput.value = ''; //
			}

			if (this.elements.datetimeInput) { //
				this.elements.datetimeInput.value = Utils.DateUtils.formatDateTimeLocal(); //
			}

			this.hideSuggestions(); //

			setTimeout(() => {
				if (this.elements.amountInput) { //
					this.elements.amountInput.focus(); //
					this.elements.amountInput.placeholder = 'Nhập số tiền...'; //
				}
			}, 100); 

		} catch (error) {
			console.error('Error in smart field clearing (smartResetFieldsForNextEntry):', error); //
			this.resetForm(true); //
		}
	}
	
	handleSubmit() {
		console.log('🚀 Form submission started'); //
		
		try {
			const selectedTypeRadio = document.querySelector('input[name="type"]:checked'); //
			const currentSelectedType = selectedTypeRadio ? selectedTypeRadio.value : null; //
			
			console.log('📝 Form state at start of handleSubmit:', { //
				type: currentSelectedType,
				category: this.elements.categorySelect?.value, 
				amount: this.elements.amountInput?.value,
				account: this.elements.accountFrom?.value
			});

			const formData = this.getFormData(); //
			console.log('📋 Form data extracted:', formData); //

			const validation = Utils.ValidationUtils.validateTransaction(formData); //
			console.log('🔍 Basic validation result:', validation); //
			
			if (!validation.isValid) { //
				console.error('❌ Form validation failed:', validation.errors); //
				Utils.UIUtils.showMessage(validation.errors[0], 'error'); //
				this.focusFirstErrorField(validation.errors[0]); //
				return;
			}

			const businessValidation = this.validateBusinessRules(formData); //
			console.log('🔍 Business validation result:', businessValidation); //
			
			if (!businessValidation.isValid) { //
				console.error('❌ Business validation failed:', businessValidation.error); //
				Utils.UIUtils.showMessage(businessValidation.error, 'error'); //
				return;
			}

			if (this.editingTransactionId) { //
				console.log('📝 Updating existing transaction:', this.editingTransactionId); //
				const updated = this.app.updateTransaction(this.editingTransactionId, formData); //
				if (updated) { //
					Utils.UIUtils.showMessage('Giao dịch đã được cập nhật', 'success'); //
					this.exitEditMode(); //
					
					this.renderTransactionList(); //
					this.app.refreshAllModules(); //
				} else {
					throw new Error('Failed to update transaction'); //
				}
			} else {
				console.log('➕ Adding new transaction'); //
				const added = this.app.addTransaction(formData); //
				if (added) { //
					const message = formData.type === 'Transfer' //
						? 'Giao dịch chuyển tiền đã được thêm'
						: 'Giao dịch đã được thêm';
					Utils.UIUtils.showMessage(message, 'success'); //
					console.log('✅ Transaction added successfully'); //
					
                    // Capture state FROM THE FORM ELEMENTS just before refresh for preservation
					const preservedState = this.smartResetEnabled ? { //
						type: currentSelectedType, // Use the type that was checked on the form
						category: this.elements.categorySelect?.value, // Get current category from select
						account: this.elements.accountFrom?.value,   // Get current account from select
						currency: this.elements.currencySelector?.value // Get current currency
					} : null;
                    console.log('State captured for preservation:', JSON.stringify(preservedState));


					this.renderTransactionList(); //
					this.app.refreshAllModules(); // UI updates happen here, potentially resetting dropdowns //

					if (preservedState) { //
                        // This will clear amount, description, datetime, and set focus.
						this.smartResetFieldsForNextEntry();

                        // Schedule the actual state restoration to run after
                        // potential UI updates from refreshAllModules have settled.
						setTimeout(() => {
							this._applyPreservedState(preservedState);
						}, 300); // Delay to ensure this runs after refreshAllModules and its subsequent updates
					} else {
						this.resetForm(true); // Full reset if smart reset disabled //
					}
				} else {
					throw new Error('Failed to add transaction'); //
				}
			}

		} catch (error) {
			console.error('💥 Error submitting transaction:', error); //
			Utils.UIUtils.showMessage(`Có lỗi xảy ra: ${error.message}`, 'error'); //
		}
	}
	
    // Commenting out the old smartResetAfterAddWithPreservation and smartResetAfterAdd as they are replaced by the new mechanism
	/*
	smartResetAfterAddWithPreservation(preservedState) {
		try {
			console.log('🎯 Smart reset with preservation:', preservedState); //

			// 1. Reset form fields that need clearing
			if (this.elements.amountInput) { //
				this.elements.amountInput.value = ''; //
				this.elements.amountInput.classList.remove('input-valid', 'input-invalid'); //
			}

			if (this.elements.descriptionInput) { //
				this.elements.descriptionInput.value = ''; //
			}

			if (this.elements.datetimeInput) { //
				this.elements.datetimeInput.value = Utils.DateUtils.formatDateTimeLocal(); //
			}

			// 2. RESTORE preserved state after refresh
			setTimeout(() => { //
				// Restore transaction type
				if (preservedState.type) { //
					const typeRadio = document.querySelector(`input[name="type"][value="${preservedState.type}"]`); //
					if (typeRadio && !typeRadio.checked) { //
						typeRadio.checked = true; //
						// Dispatching change event will trigger updateFormVisibility and populateCategories
						typeRadio.dispatchEvent(new Event('change')); //
					}
				}

				// Restore category, account, and currency (after type is set and dropdowns populated)
				setTimeout(() => { //
					// Restore Category
					if (preservedState.category && this.elements.categorySelect) { //
						const categoryOptionExists = Array.from(this.elements.categorySelect.options).some(opt => opt.value === preservedState.category); //
						if (categoryOptionExists) { //
							this.elements.categorySelect.value = preservedState.category; //
						} else {
							console.warn(`SmartReset Warning: Preserved category "${preservedState.category}" no longer exists in the dropdown for type "${preservedState.type}". Category field may reset to default.`); //
						}
					}

					// Restore Account
					if (preservedState.account && this.elements.accountFrom) { //
						const accountOptionExists = Array.from(this.elements.accountFrom.options).some(opt => opt.value === preservedState.account); //
						if (accountOptionExists) { //
							this.elements.accountFrom.value = preservedState.account; //
						} else {
							console.warn(`SmartReset Warning: Preserved account "${preservedState.account}" no longer exists in the dropdown. Account field may reset to default.`); //
						}
					}

					// Restore Currency
					if (preservedState.currency && this.elements.currencySelector) { //
						const currencyOptionExists = Array.from(this.elements.currencySelector.options).some(opt => opt.value === preservedState.currency); //
						if (currencyOptionExists) { //
							this.elements.currencySelector.value = preservedState.currency; //
						} else {
							console.warn(`SmartReset Warning: Preserved currency "${preservedState.currency}" no longer exists in the dropdown. Currency field may reset to default.`); //
						}
					}

					console.log('✅ Smart reset state restored successfully!'); //
					this.showSmartResetFeedback(); //
				}, 150); // Increased delay slightly from 100ms to 150ms for better reliability

			}, 50); //

			// 3. Clear suggestions and focus
			this.hideSuggestions(); //

			// 4. Focus for next entry
			setTimeout(() => { //
				if (this.elements.amountInput) { //
					this.elements.amountInput.focus(); //
					this.elements.amountInput.placeholder = 'Nhập số tiền...'; //
				}
			}, 200); //

		} catch (error) {
			console.error('Error in smart reset with preservation:', error); //
			// Fallback to normal reset
			this.resetForm(true); //
		}
	}
	*/
	
    /*
	smartResetAfterAdd() { // This function seems redundant with the new approach
		try {
			console.log('🔄 Smart reset after add - enabled:', this.smartResetEnabled); //
			
			if (!this.smartResetEnabled) { //
				// User wants full reset
				console.log('🔄 User prefers full reset - clearing all fields'); //
				this.resetForm(true); //
				return;
			}
			
			// Smart reset - chỉ reset những field cần thiết
			console.log('🎯 Performing smart reset - keeping category & account'); //
			
			// 1. Reset amount
			if (this.elements.amountInput) { //
				this.elements.amountInput.value = ''; //
				this.elements.amountInput.classList.remove('input-valid', 'input-invalid'); //
			}
			
			// 2. Reset description 
			if (this.elements.descriptionInput) { //
				this.elements.descriptionInput.value = ''; //
			}
			
			// 3. Update datetime to current
			if (this.elements.datetimeInput) { //
				this.elements.datetimeInput.value = Utils.DateUtils.formatDateTimeLocal(); //
			}
			
			// 4. 🎯 KEEP: type, category, account, currency
			// Đây là ưu điểm chính - giữ nguyên để nhập nhanh!
			
			// 5. Clear suggestions và focus
			this.hideSuggestions(); //
			
			// 6. Show visual feedback
			this.showSmartResetFeedback(); //
			
			// 7. Focus for next entry
			setTimeout(() => { //
				if (this.elements.amountInput) { //
					this.elements.amountInput.focus(); //
					this.elements.amountInput.placeholder = 'Nhập số tiền...'; //
				}
			}, 100); //
			
			console.log('✅ Smart reset completed successfully!'); //
			
		} catch (error) {
			console.error('Error in smart reset after add:', error); //
			// Fallback to normal reset
			this.resetForm(false); //
		}
	}
    */

	showSmartResetFeedback() {
		try {
			// Highlight preserved fields briefly
			const preservedFields = [ //
				this.elements.categorySelect, //
				this.elements.accountFrom, //
				document.querySelector('input[name="type"]:checked') //
			].filter(Boolean);
			
			preservedFields.forEach(field => { //
				if (field) { //
					field.style.transition = 'all 0.3s ease'; //
					field.style.boxShadow = '0 0 0 2px rgba(16, 185, 129, 0.4)'; //
					field.style.borderColor = '#10b981'; //
					
					setTimeout(() => { //
						field.style.boxShadow = ''; //
						field.style.borderColor = ''; //
					}, 1000);
				}
			});
			
			// Show mini notification
			const notification = document.createElement('div'); //
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
			`; //
			
			document.body.appendChild(notification); //
			setTimeout(() => { //
				notification.remove(); //
			}, 2000);
			
		} catch (error) {
			console.error('Error showing smart reset feedback:', error); //
		}
	}

    validateBusinessRules(data) {
        console.log('🔍 Validating business rules for:', data); //
        
        try {
            if (!this.accountExists(data.account)) { //
                console.error('❌ Account does not exist:', data.account); //
                console.log('📋 Available accounts:', this.app.data.accounts?.map(a => a.value)); //
                return { isValid: false, error: 'Tài khoản nguồn không tồn tại' }; //
            }

            if (data.type === 'Transfer') { //
                if (!this.accountExists(data.toAccount)) { //
                    console.error('❌ Target account does not exist:', data.toAccount); //
                    return { isValid: false, error: 'Tài khoản đích không tồn tại' }; //
                }
                if (data.account === data.toAccount) { //
                    return { isValid: false, error: 'Tài khoản nguồn và đích phải khác nhau' }; //
                }
            }


            if (data.type !== 'Transfer') { //
                const categoryValid = this.categoryExists(data.category, data.type); //
                console.log('🏷️ Category validation:', { //
                    category: data.category,
                    type: data.type,
                    valid: categoryValid
                });
                
                if (!categoryValid) { //
                    console.error('❌ Category does not exist:', data.category, 'for type:', data.type); //
                    if (data.type === 'Thu') { //
                        console.log('📋 Available income categories:', this.app.data.incomeCategories?.map(c => c.value)); //
                    } else {
                        console.log('📋 Available expense categories:', this.app.data.expenseCategories?.map(c => c.value)); //
                    }
                    return { isValid: false, error: `Danh mục "${data.category}" không tồn tại cho loại "${data.type}"` }; //
                }
            }

            if (data.amount > 999999999999) { //
                return { isValid: false, error: 'Số tiền quá lớn' }; //
            }

            if (data.amount <= 0) { //
                return { isValid: false, error: 'Số tiền phải lớn hơn 0' }; //
            }

            const transactionDate = new Date(data.datetime); //
            if (isNaN(transactionDate.getTime())) { //
                return { isValid: false, error: 'Ngày giao dịch không hợp lệ' }; //
            }

            const futureLimit = new Date(); //
            futureLimit.setFullYear(futureLimit.getFullYear() + 1); //

            if (transactionDate > futureLimit) { //
                return { isValid: false, error: 'Ngày giao dịch không được quá 1 năm trong tương lai' }; //
            }

            console.log('✅ Business rules validation passed'); //
            return { isValid: true }; //
            
        } catch (error) {
            console.error('💥 Error validating business rules:', error); //
            return { isValid: false, error: 'Lỗi khi kiểm tra dữ liệu: ' + error.message }; //
        }
    }

    accountExists(accountValue) {
        if (!this.app || !this.app.data || !Array.isArray(this.app.data.accounts)) { //
            return false;
        }
        return this.app.data.accounts.some(acc => acc && acc.value === accountValue); //
    }

    categoryExists(categoryValue, transactionType) {
        if (!this.app || !this.app.data) return false; //

        if (transactionType === 'Thu') { //
            return Array.isArray(this.app.data.incomeCategories) && //
                   this.app.data.incomeCategories.some(cat => cat && cat.value === categoryValue); //
        } else if (transactionType === 'Chi') { //
            return Array.isArray(this.app.data.expenseCategories) && //
                   this.app.data.expenseCategories.some(cat => cat && cat.value === categoryValue); //
        }

        return false; //
    }

    focusFirstErrorField(errorMessage) {
        try {
            if (errorMessage.includes('số tiền')) { //
                this.elements.amountInput?.focus(); //
            } else if (errorMessage.includes('tài khoản')) { //
                this.elements.accountFrom?.focus(); //
            } else if (errorMessage.includes('hạng mục')) { //
                this.elements.categorySelect?.focus(); //
            } else if (errorMessage.includes('ngày')) { //
                this.elements.datetimeInput?.focus(); //
            }
        } catch (error) {
            console.error('Error focusing error field:', error); //
        }
    }


    getFormData() {
        const selectedTypeRadio = document.querySelector('input[name="type"]:checked'); //

        if (!selectedTypeRadio) { //
            throw new Error('Vui lòng chọn loại giao dịch'); //
        }

        if (!this.elements.amountInput || !this.elements.amountInput.value) { //
            throw new Error('Vui lòng nhập số tiền'); //
        }

        if (!this.elements.accountFrom || !this.elements.accountFrom.value) { //
            throw new Error('Vui lòng chọn tài khoản'); //
        }

        if (!this.elements.datetimeInput || !this.elements.datetimeInput.value) { //
            throw new Error('Vui lòng chọn ngày và giờ'); //
        }

        const selectedType = selectedTypeRadio.value; //
        const amount = Utils.CurrencyUtils.parseAmountInput( //
            this.elements.amountInput.value, //
            this.elements.currencySelector?.value || 'VND' //
        );

        if (isNaN(amount) || amount <= 0) { //
            throw new Error('Số tiền không hợp lệ'); //
        }

        const data = { //
            type: selectedType, //
            datetime: this.elements.datetimeInput.value, //
            amount: amount, //
            account: this.elements.accountFrom.value, //
            description: this.sanitizeDescription(this.elements.descriptionInput?.value || ''), //
            originalAmount: parseFloat(this.elements.amountInput.value.replace(/[^\d.]/g, '')) || amount, //
            originalCurrency: this.elements.currencySelector?.value || 'VND' //
        };

        if (selectedType === 'Transfer') { //
            if (!this.elements.accountTo || !this.elements.accountTo.value) { //
                throw new Error('Vui lòng chọn tài khoản đích'); //
            }
            data.toAccount = this.elements.accountTo.value; //
        } else {
            if (!this.elements.categorySelect || !this.elements.categorySelect.value) { //
                throw new Error('Vui lòng chọn hạng mục'); //
            }
            data.category = this.elements.categorySelect.value; //
        }

        return data; //
    }

    sanitizeDescription(description) {
        if (!description || typeof description !== 'string') return ''; //

        return description //
            .trim() //
            .replace(/[<>]/g, '') //
            .substring(0, 500); //
    }

	resetForm(fullReset = false) {
		try {
			if (fullReset) { //
				console.log('🔄 Performing FULL reset'); //
				
				this.elements.form.reset(); //
				this.editingTransactionId = null; //
				
				const btnText = this.elements.submitBtn.querySelector('.btn-text'); //
				const btnIcon = this.elements.submitBtn.querySelector('.btn-icon'); //
				if (btnText) btnText.textContent = 'Thêm Giao Dịch'; //
				if (btnIcon) btnIcon.textContent = '➕'; //
				
				this.loadLastTransactionTypeQuiet(); //
				this.updateFormVisibility(); //
				this.populateCategories(); //
				
				if (this.elements.datetimeInput) { //
					this.elements.datetimeInput.value = Utils.DateUtils.formatDateTimeLocal(); //
				}
			} else {
				// This 'else' block for smart reset is effectively replaced by
                // smartResetFieldsForNextEntry and _applyPreservedState for new transactions.
                // However, resetForm(false) might be called elsewhere, so keeping a basic clear.
				console.log('🔄 Performing PARTIAL reset (amount, description, datetime)'); //
				
				if (this.elements.amountInput) { //
					this.elements.amountInput.value = ''; //
					this.elements.amountInput.classList.remove('input-valid', 'input-invalid'); //
				}
				
				if (this.elements.descriptionInput) { //
					this.elements.descriptionInput.value = ''; //
				}
				
				if (this.elements.datetimeInput) { //
					this.elements.datetimeInput.value = Utils.DateUtils.formatDateTimeLocal(); //
				}
				
				console.log('✅ Kept transaction type, category, account for quick entry (if applicable elsewhere)'); //
			}
			
			this.hideSuggestions(); //
			
			setTimeout(() => this.elements.amountInput?.focus(), 100); //
			
			console.log(`✅ Form reset ${fullReset ? 'completely' : 'partially'}`); //
		} catch (error) {
			console.error('Error resetting form:', error); //
		}
	}

    renderTransactionList() {
        const startTime = performance.now(); //

        try {
            if (!this.elements.transactionList || !this.elements.noTransactions) { //
                console.warn('Transaction list elements not found'); //
                return;
            }

            const filters = { //
                period: this.currentFilter.period, //
                date: this.currentFilter.date //
            };

            const filteredTransactions = this.app.getFilteredTransactions(filters); //

            if (!Array.isArray(filteredTransactions)) { //
                console.error('Invalid filtered transactions data'); //
                this.showNoTransactions('Có lỗi khi tải dữ liệu giao dịch'); //
                return;
            }

            filteredTransactions.sort((a, b) => { //
                try {
                    return new Date(b.datetime) - new Date(a.datetime); //
                } catch (error) {
                    console.warn('Error sorting transactions by date:', error); //
                    return 0; //
                }
            });

            if (filteredTransactions.length === 0) { //
                this.showNoTransactions(); //
                return;
            }

            this.elements.transactionList.style.display = 'block'; //
            this.elements.noTransactions.style.display = 'none'; //

            const maxInitialRender = 50; //
            const transactionsToRender = filteredTransactions.slice(0, maxInitialRender); //

            this.elements.transactionList.innerHTML = ''; //

            const fragment = document.createDocumentFragment(); //

            transactionsToRender.forEach(transaction => { //
                try {
                    const item = this.createTransactionItem(transaction); //
                    if (item) { //
                        fragment.appendChild(item); //
                    }
                } catch (error) {
                    console.error('Error creating transaction item:', transaction.id, error); //
                }
            });

            this.elements.transactionList.appendChild(fragment); //

            if (filteredTransactions.length > maxInitialRender) { //
                this.showLoadMoreButton(filteredTransactions, maxInitialRender); //
            }

            const renderTime = performance.now() - startTime; //
            this.renderCount++; //
            this.lastRenderTime = renderTime; //

            if (renderTime > 100) { //
                console.warn(`Slow transaction list render: ${renderTime}ms for ${transactionsToRender.length} items`); //
            }

        } catch (error) {
            console.error('Error rendering transaction list:', error); //
            this.showNoTransactions('Có lỗi khi hiển thị danh sách giao dịch'); //
        }
    }

	loadLastTransactionTypeQuiet() {
		try {
			const lastType = localStorage.getItem('lastTransactionType') || 'Chi'; //
			console.log('📋 Loading last transaction type quietly:', lastType); //
			
			const originalHandlers = []; //
			this.elements.typeRadios.forEach((radio, index) => { //
				const handler = this.eventListeners.find(listener => listener.element === radio && listener.event === 'change'); //
				if (handler) { //
					originalHandlers[index] = handler.handler; //
					radio.removeEventListener('change', handler.handler); //
				}
			});
			
			const lastTypeRadio = document.querySelector(`input[name="type"][value="${lastType}"]`); //
			if (lastTypeRadio) { //
				lastTypeRadio.checked = true; //
				console.log('✅ Set last transaction type quietly:', lastType); //
			} else {
				const defaultRadio = document.querySelector(`input[name="type"][value="Chi"]`); //
				if (defaultRadio) { //
					defaultRadio.checked = true; //
				}
			}
			
			this.elements.typeRadios.forEach((radio, index) => { //
				if (originalHandlers[index]) { //
					radio.addEventListener('change', originalHandlers[index]); //
				}
			});
			
		} catch (error) {
			console.error('Error loading last transaction type quietly:', error); //
		}
	}

    showNoTransactions(customMessage = null) {
        if (this.elements.transactionList) { //
            this.elements.transactionList.style.display = 'none'; //
        }

        if (this.elements.noTransactions) { //
            this.elements.noTransactions.style.display = 'block'; //

            if (customMessage) { //
                this.elements.noTransactions.innerHTML = `
                    <div class="no-data">
                        <span class="no-data-icon">⚠️</span>
                        <span class="no-data-text">${customMessage}</span>
                    </div>
                `; //
            } else {
                this.elements.noTransactions.innerHTML = `
                    <div class="no-data">
                        <span class="no-data-icon">📝</span>
                        <span class="no-data-text">Chưa có giao dịch nào</span>
                    </div>
                `; //
            }
        }
    }

	createTransactionItem(transaction) {
		if (!transaction || !transaction.id) { //
			console.warn('Invalid transaction for item creation'); //
			return null;
		}

		try {
			const item = document.createElement('div'); //
			item.className = 'transaction-item'; //
			item.dataset.transactionId = transaction.id; //

			const typeClass = transaction.type === 'Thu' ? 'income' : //
							 (transaction.type === 'Chi' && !transaction.isTransfer) ? 'expense' : 'transfer'; //

			const icon = this.getTransactionIcon(transaction); //
			const accountName = this.getAccountName(transaction.account); //

			let accountDisplay = accountName; //
			if (transaction.isTransfer) { //
				const pairTransaction = transaction.transferPairId ? this.findTransferPair(transaction) : null; //
				if (pairTransaction) { //
					const pairAccountName = this.getAccountName(pairTransaction.account); //
					accountDisplay = transaction.type === 'Chi' //
						? `${accountName} → ${pairAccountName}` //
						: `${pairAccountName} → ${accountName}`; //
				} else {
					accountDisplay = `${accountName} (Lỗi chuyển khoản)`; //
				}
			}

			let amountDisplay = Utils.CurrencyUtils.formatCurrency(transaction.amount || 0); //
			if (transaction.originalCurrency === 'USD' && transaction.originalAmount) { //
				const originalFormatted = Utils.CurrencyUtils.formatCurrency(transaction.originalAmount, 'USD'); //
				amountDisplay += ` <span class="original-amount">(${originalFormatted})</span>`; //
			}

			const description = this.escapeHtml(transaction.description || 'Không có mô tả'); //
			const categoryDisplay = transaction.isTransfer //
				? this.escapeHtml(transaction.category || 'Chuyển khoản') //
				: this.escapeHtml(transaction.category || ''); //

			const compactDateTime = Utils.DateUtils.formatCompactDateTime(transaction.datetime); //

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
			`; //

			return item; //
		} catch (error) {
			console.error('Error creating transaction item:', error); //
			return null; //
		}
	}

    getAccountName(accountValue) {
        if (!this.app || !this.app.data || !Array.isArray(this.app.data.accounts)) { //
            return accountValue || 'Unknown'; //
        }

        const account = this.app.data.accounts.find(acc => acc && acc.value === accountValue); //
        return account ? account.text : accountValue; //
    }

    findTransferPair(transaction) {
        if (!transaction.isTransfer || !transaction.transferPairId) { //
            return null; //
        }

        if (!this.app || !this.app.data || !Array.isArray(this.app.data.transactions)) { //
            return null; //
        }

        return this.app.data.transactions.find(tx => tx && tx.id === transaction.transferPairId); //
    }

    escapeHtml(text) {
        if (!text || typeof text !== 'string') return ''; //

        const div = document.createElement('div'); //
        div.textContent = text; //
        return div.innerHTML; //
    }

    getTransactionIcon(transaction) {
        try {
            if (transaction.isTransfer) { //
                return transaction.type === 'Chi' ? '➡️' : '⬅️'; //
            }

            if (transaction.category) { //
                return Utils.UIUtils.getCategoryIcon(transaction.category); //
            }
            return '📦'; //
        } catch (error) {
            console.error('Error getting transaction icon:', error); //
            return '📦'; //
        }
    }

    editTransaction(transactionId) {
        if (!transactionId || typeof transactionId !== 'string') { //
            Utils.UIUtils.showMessage('ID giao dịch không hợp lệ', 'error'); //
            return;
        }

        try {
            this.enterEditMode(transactionId); //
        } catch (error) {
            console.error('Error editing transaction:', error); //
            Utils.UIUtils.showMessage('Có lỗi khi chỉnh sửa giao dịch', 'error'); //
        }
    }

    deleteTransaction(transactionId) {
        if (!transactionId || typeof transactionId !== 'string') { //
            Utils.UIUtils.showMessage('ID giao dịch không hợp lệ', 'error'); //
            return;
        }

        try {
            const transaction = this.app.data.transactions.find(tx => tx && tx.id === transactionId); //
            if (!transaction) { //
                Utils.UIUtils.showMessage('Không tìm thấy giao dịch', 'error'); //
                return;
            }

            const message = transaction.isTransfer //
                ? 'Bạn có chắc chắn muốn xóa giao dịch chuyển tiền này? (Cả giao dịch đi và đến sẽ bị xóa)' //
                : 'Bạn có chắc chắn muốn xóa giao dịch này?'; //

            if (!confirm(message)) return; //

            if (this.app.deleteTransaction(transactionId)) { //
                Utils.UIUtils.showMessage('Đã xóa giao dịch', 'success'); //
                this.renderTransactionList(); //
                this.app.refreshAllModules(); //
            } else {
                Utils.UIUtils.showMessage('Không thể xóa giao dịch', 'error'); //
            }
        } catch (error) {
            console.error('Error deleting transaction:', error); //
            Utils.UIUtils.showMessage('Có lỗi khi xóa giao dịch', 'error'); //
        }
    }

	enterEditMode(transactionId) {
		if (!this.app || !this.app.data || !Array.isArray(this.app.data.transactions)) { //
			Utils.UIUtils.showMessage('Dữ liệu ứng dụng không hợp lệ', 'error'); //
			return;
		}

		const transaction = this.app.data.transactions.find(tx => tx && tx.id === transactionId); //
		if (!transaction) { //
			Utils.UIUtils.showMessage('Không tìm thấy giao dịch để sửa', 'error'); //
			return;
		}

		console.log('🔧 Entering edit mode for transaction:', transaction); //

		this.editingTransactionId = transactionId; //

		let editType = transaction.type; //
		let editCategory = transaction.category; //
		let editFromAccount = transaction.account; //
		let editToAccount = null; //

		if (transaction.isTransfer) { //
			console.log('🔄 Editing transfer transaction'); //
			
			const pairTransaction = this.findTransferPair(transaction); //
			
			if (!pairTransaction) { //
				console.error('❌ Transfer pair not found for:', transactionId); //
				Utils.UIUtils.showMessage('Lỗi: Không tìm thấy giao dịch chuyển khoản cặp. Không thể sửa.', 'error'); //
				this.editingTransactionId = null; //
				return;
			}

			if (transaction.type === 'Chi') { //
				editType = 'Transfer'; //
				editFromAccount = transaction.account; //
				editToAccount = pairTransaction.account; //
			} else {
				editType = 'Transfer'; //
				editFromAccount = pairTransaction.account; //
				editToAccount = transaction.account; //
			}
			
			console.log('🔄 Transfer edit data:', { //
				editType,
				editFromAccount, 
				editToAccount,
				originalTx: transaction.type,
				pairTx: pairTransaction.type
			});
		}

		const typeRadio = document.querySelector(`input[name="type"][value="${editType}"]`); //
		if (typeRadio) { //
			typeRadio.checked = true; //
			console.log('✅ Set transaction type to:', editType); //
			
			typeRadio.dispatchEvent(new Event('change')); //
			
			setTimeout(() => { //
				this.populateEditFields(transaction, editCategory, editFromAccount, editToAccount); //
			}, 100); //
		} else {
			console.error('❌ Transaction type radio not found for:', editType); //
			Utils.UIUtils.showMessage('Lỗi: Không thể thiết lập loại giao dịch', 'error'); //
			this.editingTransactionId = null; //
			return;
		}
	}

	populateEditFields(transaction, editCategory, editFromAccount, editToAccount) {
		try {
			console.log('📝 Populating edit fields...'); //

			if (this.elements.amountInput) { //
				this.elements.amountInput.value = Utils.CurrencyUtils.formatAmountInput(transaction.originalAmount || transaction.amount); //
			}
			if (this.elements.currencySelector) { //
				this.elements.currencySelector.value = transaction.originalCurrency || 'VND'; //
			}

			if (this.elements.accountFrom) { //
				this.elements.accountFrom.value = editFromAccount; //
				console.log('✅ Set from account:', editFromAccount); //
			}

			const currentType = document.querySelector('input[name="type"]:checked')?.value; //
			
			if (currentType === 'Transfer') { //
				if (this.elements.accountTo && editToAccount) { //
					this.elements.accountTo.value = editToAccount; //
					console.log('✅ Set to account:', editToAccount); //
				}
			} else {
				if (this.elements.categorySelect && editCategory) { //
					this.populateCategories(); //
					setTimeout(() => { //
						this.elements.categorySelect.value = editCategory; //
						console.log('✅ Set category:', editCategory); //
					}, 50); //
				}
			}

			if (this.elements.descriptionInput) { //
				this.elements.descriptionInput.value = transaction.description || ''; //
			}
			if (this.elements.datetimeInput) { //
				this.elements.datetimeInput.value = Utils.DateUtils.formatDateTimeLocal(new Date(transaction.datetime)); //
			}

			const btnText = this.elements.submitBtn.querySelector('.btn-text'); //
			const btnIcon = this.elements.submitBtn.querySelector('.btn-icon'); //
			if (btnText) btnText.textContent = 'Cập Nhật Giao Dịch'; //
			if (btnIcon) btnIcon.textContent = '💾'; //

			this.elements.form.scrollIntoView({ behavior: 'smooth', block: 'start' }); //
			setTimeout(() => this.elements.amountInput?.focus(), 200); //

			console.log('✅ Edit mode setup completed'); //

		} catch (error) {
			console.error('Error populating edit fields:', error); //
			Utils.UIUtils.showMessage('Có lỗi khi tải thông tin giao dịch', 'error'); //
		}
	}

	exitEditMode() {
		this.resetForm(true); // true = full reset khi exit edit mode //
	}

    showLoadMoreButton(allTransactions, currentCount) {
        // Implementation for load more functionality
    }

    applySuggestion() {
        // Implementation for applying suggestions
    }

    hideSuggestions() {
        if (this.elements.suggestionArea) { //
            this.elements.suggestionArea.style.display = 'none'; //
            this.suggestionData = null; //
        }
    }

    checkSuggestions() {
        // Implementation for checking suggestions
    }

    destroy() {
        this.eventListeners.forEach(({ element, event, handler }) => { //
            if (element && typeof element.removeEventListener === 'function') { //
                element.removeEventListener(event, handler); //
            }
        });
        this.eventListeners = []; //

        this.debouncedRenderList = null; //
        this.debouncedCheckSuggestions = null; //
        this.debouncedPopulateDescriptionSuggestions = null; //

        this.elements = {}; //
        this.editingTransactionId = null; //
        this.suggestionData = null; //
        this.currentFilter = { period: 'month', date: null }; //
    }

    refresh() {
        try {
            this.populateDropdowns(); //
            this.renderTransactionList(); //
        } catch (error) {
            console.error('Error refreshing transactions module:', error); //
            Utils.UIUtils.showMessage('Có lỗi khi cập nhật module giao dịch', 'error'); //
        }
    }
}

// Create global instance
window.TransactionsModule = new TransactionsModule(); //