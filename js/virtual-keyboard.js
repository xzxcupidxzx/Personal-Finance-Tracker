/**
 * VIRTUAL NUMERIC KEYBOARD MODULE - Mobile Only Version
 * Only activates on mobile devices, desktop uses native keyboard
 */

class VirtualKeyboardModule {
    constructor() {
        this.vkElement = null;
        this.activeInputElement = null;
        this.isKeyboardVisible = false;
        this.isInitialized = false;
        this.isMobileDevice = false; // Track if mobile device

        // Timers and intervals for cleanup
        this.longPressTimer = null;
        this.longPressInterval = null;
        this.layoutAdjustmentTimer = null;

        // Event listeners tracking for cleanup
        this.eventListeners = [];
        this.observers = [];

        // State management
        this.originalBodyPaddingBottom = '';
        this.keyboardHeight = 0;
        this.bottomNavHeight = 0;

        // Configuration
        this.config = {
            LONG_PRESS_DELAY: 500,
            LONG_PRESS_REPEAT_INTERVAL: 100,
            LAYOUT_ADJUSTMENT_DELAY: 100,
            HAPTIC_INTENSITY: { 
                light: 5, 
                medium: 15, 
                heavy: 25, 
                error: [30, 50, 30] 
            },
            KEYBOARD_SELECTOR: '#virtualNumericKeyboard',
            INPUT_SELECTOR: 'input[data-virtual-keyboard="true"]',
            BOTTOM_NAV_SELECTOR: '.bottom-nav'
        };

        // Performance tracking
        this.performanceMetrics = {
            showCount: 0,
            hideCount: 0,
            keyPressCount: 0,
            lastShowTime: 0
        };
    }

    /**
     * Detect if device is mobile
     */
    detectMobileDevice() {
        // Multiple detection methods for accuracy
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        
        // Method 1: User agent detection
        const mobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
        
        // Method 2: Touch capability and screen size
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const smallScreen = window.innerWidth <= 768; // Tablet and below
        
        // Method 3: CSS media query support
        let isMobileCSS = false;
        if (window.matchMedia) {
            isMobileCSS = window.matchMedia('(max-width: 768px)').matches;
        }
        
        // Method 4: Check for mobile-specific features
        const hasMobileFeatures = 'orientation' in window || 'DeviceOrientationEvent' in window;
        
        // Combine all methods - device is mobile if it meets multiple criteria
        const mobileScore = [
            mobileUserAgent,
            hasTouch && smallScreen,
            isMobileCSS && hasTouch,
            hasMobileFeatures && smallScreen
        ].filter(Boolean).length;
        
        this.isMobileDevice = mobileScore >= 2; // Require at least 2 indicators
        
        console.log('📱 Device detection:', {
            userAgent: mobileUserAgent,
            touch: hasTouch,
            smallScreen: smallScreen,
            cssQuery: isMobileCSS,
            mobileFeatures: hasMobileFeatures,
            score: mobileScore,
            isMobile: this.isMobileDevice
        });
        
        return this.isMobileDevice;
    }

    /**
     * Initialize the virtual keyboard module
     */
    init() {
        if (this.isInitialized) {
            console.warn('VirtualKeyboardModule already initialized.');
            return;
        }

        console.log('⌨️ Initializing Virtual Keyboard Module...');

        // Check if device is mobile first
        if (!this.detectMobileDevice()) {
            console.log('💻 Desktop device detected - Virtual keyboard disabled');
            this.disableVirtualKeyboard();
            this.isInitialized = true;
            return;
        }

        console.log('📱 Mobile device detected - Virtual keyboard enabled');

        try {
            if (!this.initializeElements()) {
                console.error('❌ Virtual keyboard element not found. Module will not run.');
                return;
            }

            this.initializeState();
            this.initializeEventListeners();
            this.bindVirtualKeyboardToInputs();
            this.setupAccessibility();

            this.isInitialized = true;
            console.log('✅ Virtual Keyboard Module initialized successfully for mobile.');
        } catch (error) {
            console.error('❌ Failed to initialize Virtual Keyboard Module:', error);
        }
    }

    /**
     * Disable virtual keyboard for desktop
     */
    disableVirtualKeyboard() {
        try {
            // Hide virtual keyboard element if it exists
            this.vkElement = document.querySelector(this.config.KEYBOARD_SELECTOR);
            if (this.vkElement) {
                this.vkElement.style.display = 'none';
                this.vkElement.setAttribute('aria-hidden', 'true');
            }

            // Remove readonly attribute from all virtual keyboard inputs to enable native keyboard
            const inputs = document.querySelectorAll(this.config.INPUT_SELECTOR);
            inputs.forEach(input => {
                // Remove readonly that might have been set
                input.removeAttribute('readonly');
                
                // Ensure native keyboard can appear
                input.removeAttribute('inputmode');
                
                // Add visual indicator that this is desktop mode (optional)
                input.classList.add('desktop-mode');
            });

            console.log(`💻 Virtual keyboard disabled for ${inputs.length} inputs on desktop`);

        } catch (error) {
            console.error('Error disabling virtual keyboard:', error);
        }
    }

    /**
     * Initialize DOM elements
     */
    initializeElements() {
        this.vkElement = document.querySelector(this.config.KEYBOARD_SELECTOR);
        
        if (!this.vkElement) {
            return false;
        }

        // Cache keyboard dimensions
        this.updateKeyboardDimensions();
        return true;
    }

    /**
     * Initialize module state
     */
    initializeState() {
        // Store initial body padding
        if (document.body) {
            this.originalBodyPaddingBottom = getComputedStyle(document.body).paddingBottom || "0px";
        }

        // Cache bottom navigation height
        this.updateBottomNavHeight();
    }

    /**
     * Update keyboard dimensions cache
     */
    updateKeyboardDimensions() {
        if (this.vkElement) {
            try {
                // Force a layout calculation to get accurate dimensions
                this.vkElement.style.display = 'block';
                this.vkElement.style.visibility = 'hidden';
                this.keyboardHeight = this.vkElement.offsetHeight;
                this.vkElement.style.display = '';
                this.vkElement.style.visibility = '';
            } catch (error) {
                console.warn('Error updating keyboard dimensions:', error);
                this.keyboardHeight = 300; // Fallback height
            }
        }
    }

    /**
     * Update bottom navigation height cache
     */
    updateBottomNavHeight() {
        try {
            const bottomNav = document.querySelector(this.config.BOTTOM_NAV_SELECTOR);
            if (bottomNav && 
                getComputedStyle(bottomNav).position === 'fixed' && 
                getComputedStyle(bottomNav).display !== 'none') {
                this.bottomNavHeight = bottomNav.offsetHeight;
            } else {
                this.bottomNavHeight = 0;
            }
        } catch (error) {
            console.warn('Error updating bottom nav height:', error);
            this.bottomNavHeight = 0;
        }
    }

    /**
     * Add event listener with tracking for cleanup
     */
    addEventListenerSafe(element, event, handler, options = false) {
        if (!element || typeof element.addEventListener !== 'function') {
            console.warn('Attempted to add event listener to invalid element:', element, event);
            return;
        }
        
        element.addEventListener(event, handler, options);
        this.eventListeners.push({ element, event, handler, options });
    }

    /**
     * Initialize all event listeners
     */
    initializeEventListeners() {
        // Only initialize if mobile device
        if (!this.isMobileDevice) return;

        // Keyboard interaction events
        this.setupKeyboardEventListeners();
        
        // Global event listeners
        this.setupGlobalEventListeners();
        
        // Resize and orientation change handlers
        this.setupLayoutEventListeners();
    }

    /**
     * Setup keyboard-specific event listeners
     */
    setupKeyboardEventListeners() {
        if (!this.vkElement) return;

        // Use event delegation for better performance
        this.addEventListenerSafe(this.vkElement, 'pointerdown', (e) => {
            this.handleKeyPress(e);
        });

        this.addEventListenerSafe(this.vkElement, 'pointerup', () => {
            this.clearLongPress();
        });

        this.addEventListenerSafe(this.vkElement, 'pointerleave', () => {
            this.clearLongPress();
        });

        this.addEventListenerSafe(this.vkElement, 'contextmenu', (e) => {
            e.preventDefault(); // Prevent context menu on long press
        });

        // Touch events for better mobile support
        this.addEventListenerSafe(this.vkElement, 'touchstart', (e) => {
            // Prevent default to avoid double events with pointer events
            e.preventDefault();
        }, { passive: false });
    }

    /**
     * Setup global event listeners
     */
    setupGlobalEventListeners() {
        // Global click handler to hide keyboard
        this.addEventListenerSafe(document, 'pointerdown', (e) => {
            this.handleGlobalPointerDown(e);
        }, { capture: true });

        // Form submission handler
        this.addEventListenerSafe(document, 'submit', (e) => {
            this.handleFormSubmit(e);
        }, { capture: true });

        // Keyboard shortcuts
        this.addEventListenerSafe(document, 'keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Visibility change handler
        this.addEventListenerSafe(document, 'visibilitychange', () => {
            if (document.hidden && this.isKeyboardVisible) {
                this.hideKeyboard(false); // Don't blur when hiding due to visibility change
            }
        });
    }

    /**
     * Setup layout-related event listeners
     */
    setupLayoutEventListeners() {
        // Debounced resize handler
        const debouncedResizeHandler = this.createDebounce(() => {
            // Re-check if device is still mobile (orientation change might affect this)
            this.detectMobileDevice();
            
            if (!this.isMobileDevice) {
                console.log('📱➡️💻 Device switched to desktop mode - disabling virtual keyboard');
                this.hideKeyboard();
                this.disableVirtualKeyboard();
                return;
            }

            this.updateKeyboardDimensions();
            this.updateBottomNavHeight();
            if (this.isKeyboardVisible && this.activeInputElement) {
                this.adjustLayoutForKeyboard();
            }
        }, 250);

        this.addEventListenerSafe(window, 'resize', debouncedResizeHandler);
        this.addEventListenerSafe(window, 'orientationchange', debouncedResizeHandler);

        // Viewport height changes (mobile browsers)
        if (window.visualViewport) {
            this.addEventListenerSafe(window.visualViewport, 'resize', debouncedResizeHandler);
        }
    }

    /**
     * Create debounce function
     */
    createDebounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    /**
     * Setup accessibility features
     */
    setupAccessibility() {
        if (!this.vkElement) return;

        try {
            // Add ARIA attributes
            this.vkElement.setAttribute('role', 'application');
            this.vkElement.setAttribute('aria-label', 'Virtual numeric keyboard');
            this.vkElement.setAttribute('aria-hidden', 'true');

            // Add keyboard navigation support for buttons
            const buttons = this.vkElement.querySelectorAll('button[data-key]');
            buttons.forEach((button, index) => {
                button.setAttribute('tabindex', '-1'); // Remove from tab order when hidden
                button.setAttribute('aria-label', this.getButtonAriaLabel(button.getAttribute('data-key')));
            });
        } catch (error) {
            console.warn('Error setting up accessibility:', error);
        }
    }

    /**
     * Get ARIA label for keyboard buttons
     */
    getButtonAriaLabel(key) {
        const labels = {
            'backspace': 'Xóa',
            'done': 'Hoàn thành',
            '.': 'Dấu thập phân',
            '000': 'Ba số không'
        };
        return labels[key] || `Số ${key}`;
    }

    /**
     * Bind virtual keyboard to designated inputs (mobile only)
     */
    bindVirtualKeyboardToInputs() {
        // Only bind on mobile devices
        if (!this.isMobileDevice) {
            console.log('💻 Skipping virtual keyboard binding on desktop');
            return;
        }

        try {
            const inputs = document.querySelectorAll(this.config.INPUT_SELECTOR);
            
            inputs.forEach(input => {
                // Show keyboard on focus
                this.addEventListenerSafe(input, 'focus', () => {
                    this.showKeyboard(input);
                });
                
                // Show keyboard on click (for programmatic focus)
                this.addEventListenerSafe(input, 'click', () => {
                    this.showKeyboard(input);
                });

                // Add mobile-specific attributes
                input.setAttribute('inputmode', 'none'); // Hide native keyboard on mobile
                input.classList.add('mobile-mode');
            });

            console.log(`⌨️ Virtual keyboard bound to ${inputs.length} inputs on mobile`);

        } catch (error) {
            console.error('Error binding virtual keyboard to inputs:', error);
        }
    }

    /**
     * Check if current device is mobile (public method)
     */
    isMobile() {
        return this.isMobileDevice;
    }

    /**
     * Handle keyboard button press with improved event delegation
     */
    handleKeyPress(e) {
        const buttonElement = e.target.closest('button[data-key]');
        if (!buttonElement || !this.activeInputElement) return;

        e.preventDefault();
        e.stopPropagation();

        try {
            // Visual feedback
            this.addPressedState(buttonElement);
            
            // Haptic feedback
            this.provideFeedback('light');

            const key = buttonElement.getAttribute('data-key');
            this.processKeyInput(key);

            // Setup long press for backspace
            if (key === 'backspace') {
                this.setupLongPress(key);
            }

            // Update performance metrics
            this.performanceMetrics.keyPressCount++;

        } catch (error) {
            console.error('Error handling key press:', error);
            this.provideFeedback('error');
        }
    }

    /**
     * Add pressed state to button
     */
    addPressedState(buttonElement) {
        buttonElement.classList.add('pressed');
        
        // Remove pressed state after animation
        setTimeout(() => {
            buttonElement.classList.remove('pressed');
        }, 150);
    }

    /**
     * Setup long press functionality
     */
    setupLongPress(key) {
        this.clearLongPress(); // Clear any existing long press

        this.longPressTimer = setTimeout(() => {
            this.provideFeedback('medium');
            
            // Start repeating action
            this.longPressInterval = setInterval(() => {
                this.processKeyInput(key);
                this.provideFeedback('light');
            }, this.config.LONG_PRESS_REPEAT_INTERVAL);
        }, this.config.LONG_PRESS_DELAY);
    }

    /**
     * Clear long press timers
     */
    clearLongPress() {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        
        if (this.longPressInterval) {
            clearInterval(this.longPressInterval);
            this.longPressInterval = null;
        }

        // Remove pressed state from all buttons
        if (this.vkElement) {
            const pressedButtons = this.vkElement.querySelectorAll('button.pressed');
            pressedButtons.forEach(button => button.classList.remove('pressed'));
        }
    }

    /**
     * Process key input with validation
     */
    processKeyInput(key) {
        if (!this.activeInputElement) return;

        try {
            let currentValue = this.activeInputElement.value;
            let valueChanged = false;
            let newValue = currentValue;

            switch (key) {
                case 'backspace':
                    if (currentValue.length > 0) {
                        newValue = currentValue.slice(0, -1);
                        valueChanged = true;
                    }
                    break;

                case 'done':
                    this.handleDoneKey();
                    return; // Exit early

                case '.':
                    if (!currentValue.includes('.') && this.isDecimalAllowed()) {
                        newValue = currentValue + key;
                        valueChanged = true;
                    } else {
                        this.provideFeedback('error');
                    }
                    break;

                case '000':
                    newValue = this.handleTripleZero(currentValue);
                    valueChanged = newValue !== currentValue;
                    break;

                default: // Numeric keys
                    if (this.isNumericKey(key)) {
                        newValue = this.handleNumericInput(currentValue, key);
                        valueChanged = newValue !== currentValue;
                    }
                    break;
            }

            if (valueChanged) {
                this.updateInputValue(newValue);
            }

        } catch (error) {
            console.error('Error processing key input:', error);
            this.provideFeedback('error');
        }
    }

    /**
     * Check if decimal input is allowed
     */
    isDecimalAllowed() {
        if (!this.activeInputElement) return false;
        
        // Check input type and attributes
        const inputType = this.activeInputElement.type;
        const step = this.activeInputElement.step;
        
        // Allow decimal for number inputs with decimal step, or text inputs
        return inputType === 'text' || 
               (inputType === 'number' && step !== '1' && !this.activeInputElement.hasAttribute('integer-only'));
    }

    /**
     * Check if key is numeric
     */
    isNumericKey(key) {
        return /^[0-9]$/.test(key);
    }

    /**
     * Handle triple zero input
     */
    handleTripleZero(currentValue) {
        if (currentValue === '0' || currentValue === '') {
            return '0'; // Don't add 000 to empty or single 0
        }
        return currentValue + '000';
    }

    /**
     * Handle numeric input with validation
     */
    handleNumericInput(currentValue, key) {
        // Prevent leading zeros (except for decimal numbers)
        if (currentValue === '0' && key !== '.' && !currentValue.includes('.')) {
            return key; // Replace leading zero
        }
        return currentValue + key;
    }

    /**
     * Update input value and trigger events
     */
    updateInputValue(newValue) {
        if (!this.activeInputElement) return;

        try {
            const oldValue = this.activeInputElement.value;
            this.activeInputElement.value = newValue;

            // Trigger input event for form validation and formatting
            this.dispatchInputEvent('input');

            // Format the input if needed (for amount inputs)
            if (this.shouldFormatInput()) {
                this.formatInputValue();
            }

        } catch (error) {
            console.error('Error updating input value:', error);
        }
    }

    /**
     * Check if input should be formatted
     */
    shouldFormatInput() {
        return this.activeInputElement && 
               (this.activeInputElement.classList.contains('amount-input') ||
                this.activeInputElement.hasAttribute('data-format-currency'));
    }

    /**
     * Format input value using Utils if available
     */
    formatInputValue() {
        try {
            if (window.Utils && Utils.UIUtils && Utils.UIUtils.formatAmountInputWithCursor) {
                Utils.UIUtils.formatAmountInputWithCursor(this.activeInputElement);
            }
        } catch (error) {
            console.warn('Error formatting input value:', error);
        }
    }

    /**
     * Dispatch input events
     */
    dispatchInputEvent(eventType) {
        if (!this.activeInputElement) return;

        try {
            const event = new Event(eventType, { 
                bubbles: true, 
                cancelable: true 
            });
            this.activeInputElement.dispatchEvent(event);
        } catch (error) {
            console.warn('Error dispatching input event:', error);
        }
    }

    /**
     * Handle done key press
     */
    handleDoneKey() {
        try {
            this.hideKeyboard();
            
            // Dispatch change event
            this.dispatchInputEvent('change');
            
            // Focus next focusable element if exists
            this.focusNextElement();
            
        } catch (error) {
            console.error('Error handling done key:', error);
        }
    }

    /**
     * Focus next focusable element
     */
    focusNextElement() {
        try {
            if (!this.activeInputElement) return;

            const form = this.activeInputElement.closest('form');
            if (form) {
                const focusableElements = form.querySelectorAll(
                    'input:not([disabled]), button:not([disabled]), select:not([disabled]), textarea:not([disabled])'
                );
                
                const currentIndex = Array.from(focusableElements).indexOf(this.activeInputElement);
                const nextElement = focusableElements[currentIndex + 1];
                
                if (nextElement) {
                    // Small delay to ensure keyboard is hidden first
                    setTimeout(() => {
                        nextElement.focus();
                    }, 100);
                }
            }
        } catch (error) {
            console.warn('Error focusing next element:', error);
        }
    }

    /**
     * Handle global pointer down events
     */
    handleGlobalPointerDown(e) {
        if (!this.isKeyboardVisible || !this.activeInputElement) return;

        try {
            const target = e.target;
            const isTargetKeyboard = this.vkElement && this.vkElement.contains(target);
            const isTargetActiveInput = this.activeInputElement.contains(target);
            
            // Check if target is a label for the active input
            const isTargetLabel = this.isLabelForActiveInput(target);

            if (!isTargetKeyboard && !isTargetActiveInput && !isTargetLabel) {
                // Check if clicking on another virtual keyboard input
                const targetInput = target.closest(this.config.INPUT_SELECTOR);
                if (targetInput && targetInput !== this.activeInputElement) {
                    // Switch to new input
                    this.showKeyboard(targetInput);
                } else if (!targetInput) {
                    // Click outside - hide keyboard
                    this.hideKeyboard();
                }
            }
        } catch (error) {
            console.error('Error handling global pointer down:', error);
        }
    }

    /**
     * Check if target is a label for active input
     */
    isLabelForActiveInput(target) {
        if (!this.activeInputElement || !this.activeInputElement.id) return false;

        try {
            const label = document.querySelector(`label[for="${this.activeInputElement.id}"]`);
            return label && label.contains(target);
        } catch (error) {
            return false;
        }
    }

    /**
     * Handle form submission
     */
    handleFormSubmit(e) {
        if (this.activeInputElement && e.target && e.target.contains(this.activeInputElement)) {
            this.hideKeyboard(false); // Don't blur on form submit
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(e) {
        if (!this.isKeyboardVisible) return;

        switch (e.key) {
            case 'Escape':
                e.preventDefault();
                this.hideKeyboard();
                break;
            case 'Enter':
                if (e.target === this.activeInputElement) {
                    e.preventDefault();
                    this.handleDoneKey();
                }
                break;
        }
    }

    /**
     * Show virtual keyboard for input element (mobile only)
     */
    showKeyboard(inputElement) {
        // Only show on mobile devices
        if (!this.isMobileDevice || !inputElement || !this.vkElement) return;

        try {
            // Performance tracking
            const startTime = performance.now();
            this.performanceMetrics.showCount++;

            // If switching inputs, hide current keyboard first
            if (this.activeInputElement && this.activeInputElement !== inputElement && this.isKeyboardVisible) {
                this.hideKeyboard(false);
            }

            // If same input is already active, just ensure focus
            if (this.activeInputElement === inputElement && this.isKeyboardVisible) {
                return;
            }

            this.activeInputElement = inputElement;
            
            // Prepare input element
            this.prepareInputElement();
            
            // Show keyboard with layout adjustment
            this.displayKeyboard();
            
            // Adjust layout
            this.adjustLayoutForKeyboard();

            this.isKeyboardVisible = true;
            this.performanceMetrics.lastShowTime = performance.now() - startTime;

            console.log(`⌨️ Virtual keyboard shown in ${this.performanceMetrics.lastShowTime.toFixed(2)}ms`);

        } catch (error) {
            console.error('Error showing virtual keyboard:', error);
        }
    }

    /**
     * Prepare input element for virtual keyboard
     */
    prepareInputElement() {
        if (!this.activeInputElement) return;

        try {
            // Make input readonly to prevent native keyboard
            this.activeInputElement.setAttribute('readonly', 'true');
            
            // Store original attributes if needed
            this.activeInputElement.setAttribute('data-vk-original-readonly', 
                this.activeInputElement.hasAttribute('readonly') ? 'true' : 'false');

        } catch (error) {
            console.warn('Error preparing input element:', error);
        }
    }

    /**
     * Display keyboard with animations
     */
    displayKeyboard() {
        if (!this.vkElement) return;

        try {
            // Position keyboard above bottom navigation
            this.vkElement.style.bottom = `${this.bottomNavHeight}px`;
            
            // Show keyboard with animation
            this.vkElement.classList.add('visible');
            
            // Update ARIA attributes
            this.vkElement.setAttribute('aria-hidden', 'false');
            
            // Enable button tab navigation
            const buttons = this.vkElement.querySelectorAll('button[data-key]');
            buttons.forEach((button, index) => {
                button.setAttribute('tabindex', index === 0 ? '0' : '-1');
            });

        } catch (error) {
            console.error('Error displaying keyboard:', error);
        }
    }

    /**
     * Adjust layout for keyboard visibility
     */
    adjustLayoutForKeyboard() {
        if (!this.activeInputElement || !this.vkElement) return;

        try {
            // Clear any existing adjustment timer
            if (this.layoutAdjustmentTimer) {
                clearTimeout(this.layoutAdjustmentTimer);
            }

            // Debounce layout adjustment for better performance
            this.layoutAdjustmentTimer = setTimeout(() => {
                this.performLayoutAdjustment();
            }, this.config.LAYOUT_ADJUSTMENT_DELAY);

        } catch (error) {
            console.error('Error adjusting layout:', error);
        }
    }

    /**
     * Perform actual layout adjustment
     */
    performLayoutAdjustment() {
        try {
            // Add CSS class for keyboard open state
            document.body.classList.add('virtual-keyboard-open-padding');

            // Scroll input into view if necessary
            this.scrollInputIntoView();

        } catch (error) {
            console.error('Error performing layout adjustment:', error);
        }
    }

    /**
     * Scroll input into view
     */
    scrollInputIntoView() {
        if (!this.activeInputElement) return;

        try {
            requestAnimationFrame(() => {
                const inputRect = this.activeInputElement.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                const keyboardTop = viewportHeight - this.keyboardHeight - this.bottomNavHeight;
                
                // Check if input is hidden behind keyboard
                if (inputRect.bottom > keyboardTop - 20) { // 20px buffer
                    const scrollAmount = inputRect.bottom - keyboardTop + 40;
                    this.smoothScroll(scrollAmount);
                } else if (inputRect.top < 0) {
                    // Input is above viewport
                    this.smoothScroll(inputRect.top - 20);
                }
            });
        } catch (error) {
            console.warn('Error scrolling input into view:', error);
        }
    }

    /**
     * Smooth scroll by amount
     */
    smoothScroll(amount) {
        try {
            window.scrollBy({
                top: amount,
                behavior: 'smooth'
            });
        } catch (error) {
            // Fallback to instant scroll
            window.scrollBy(0, amount);
        }
    }

    /**
     * Hide virtual keyboard
     */
    hideKeyboard(shouldBlurTarget = true) {
        if (!this.isKeyboardVisible && !this.activeInputElement) return;

        try {
            // Hide keyboard UI
            this.hideKeyboardUI();
            
            // Restore layout
            this.restoreLayout();
            
            // Handle input element
            const inputToProcess = this.activeInputElement;
            
            if (shouldBlurTarget) {
                this.activeInputElement = null;
            }
            
            if (inputToProcess) {
                this.restoreInputElement(inputToProcess);
                
                if (shouldBlurTarget) {
                    inputToProcess.blur();
                }
            }

            this.isKeyboardVisible = false;
            this.performanceMetrics.hideCount++;

        } catch (error) {
            console.error('Error hiding virtual keyboard:', error);
        }
    }

    /**
     * Hide keyboard UI elements
     */
    hideKeyboardUI() {
        if (!this.vkElement) return;

        try {
            this.vkElement.classList.remove('visible');
            this.vkElement.setAttribute('aria-hidden', 'true');
            
            // Disable button tab navigation
            const buttons = this.vkElement.querySelectorAll('button[data-key]');
            buttons.forEach(button => {
                button.setAttribute('tabindex', '-1');
            });

        } catch (error) {
            console.warn('Error hiding keyboard UI:', error);
        }
    }

    /**
     * Restore layout after hiding keyboard
     */
    restoreLayout() {
        try {
            document.body.classList.remove('virtual-keyboard-open-padding');
            
            // Clear layout adjustment timer
            if (this.layoutAdjustmentTimer) {
                clearTimeout(this.layoutAdjustmentTimer);
                this.layoutAdjustmentTimer = null;
            }
        } catch (error) {
            console.warn('Error restoring layout:', error);
        }
    }

    /**
     * Restore input element state
     */
    restoreInputElement(inputElement) {
        if (!inputElement) return;

        try {
            // Restore readonly state
            const wasOriginallyReadonly = inputElement.getAttribute('data-vk-original-readonly') === 'true';
            
            if (!wasOriginallyReadonly) {
                inputElement.removeAttribute('readonly');
            }
            
            // Clean up virtual keyboard attributes
            inputElement.removeAttribute('data-vk-original-readonly');

        } catch (error) {
            console.warn('Error restoring input element:', error);
        }
    }

    /**
     * Provide haptic feedback
     */
    provideFeedback(type = 'light') {
        if (!navigator.vibrate) return;

        try {
            const intensity = this.config.HAPTIC_INTENSITY[type] || this.config.HAPTIC_INTENSITY.light;
            navigator.vibrate(intensity);
        } catch (error) {
            // Silently fail if vibration not supported
        }
    }

    /**
     * Refresh bindings for dynamically added inputs
     */
    refreshBindings() {
        // Re-detect device type in case of changes
        this.detectMobileDevice();
        
        if (this.isMobileDevice) {
            this.bindVirtualKeyboardToInputs();
        } else {
            this.disableVirtualKeyboard();
        }
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return {
            ...this.performanceMetrics,
            isInitialized: this.isInitialized,
            isMobileDevice: this.isMobileDevice,
            isKeyboardVisible: this.isKeyboardVisible,
            activeInputId: this.activeInputElement?.id || null,
            keyboardHeight: this.keyboardHeight,
            bottomNavHeight: this.bottomNavHeight
        };
    }

    /**
     * Destroy the virtual keyboard module
     */
    destroy() {
        console.log('💀 Destroying Virtual Keyboard Module...');

        try {
            // Hide keyboard if visible
            if (this.isKeyboardVisible) {
                this.hideKeyboard();
            }

            // Clear all timers
            this.clearLongPress();
            if (this.layoutAdjustmentTimer) {
                clearTimeout(this.layoutAdjustmentTimer);
            }

            // Remove all event listeners
            this.eventListeners.forEach(({ element, event, handler, options }) => {
                if (element && typeof element.removeEventListener === 'function') {
                    element.removeEventListener(event, handler, options);
                }
            });
            this.eventListeners = [];

            // Disconnect observers
            this.observers.forEach(observer => {
                if (observer && typeof observer.disconnect === 'function') {
                    observer.disconnect();
                }
            });
            this.observers = [];

            // Restore any modified elements
            if (this.activeInputElement) {
                this.restoreInputElement(this.activeInputElement);
            }

            // Reset state
            this.vkElement = null;
            this.activeInputElement = null;
            this.isKeyboardVisible = false;
            this.isInitialized = false;
            this.isMobileDevice = false;

            console.log('✅ Virtual Keyboard Module destroyed successfully.');

        } catch (error) {
            console.error('Error destroying Virtual Keyboard Module:', error);
        }
    }
}

// Initialize when DOM is ready
let virtualKeyboardInstance = null;

function initializeVirtualKeyboard() {
    if (virtualKeyboardInstance) {
        console.warn('Virtual keyboard already initialized');
        return virtualKeyboardInstance;
    }

    virtualKeyboardInstance = new VirtualKeyboardModule();
    virtualKeyboardInstance.init();
    return virtualKeyboardInstance;
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeVirtualKeyboard);
} else {
    // DOM is already ready
    initializeVirtualKeyboard();
}

// Export for global access and testing
window.VirtualKeyboardModule = VirtualKeyboardModule;
window.getVirtualKeyboard = () => virtualKeyboardInstance;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VirtualKeyboardModule;
}