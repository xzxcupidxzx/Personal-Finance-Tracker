// MODULE VIRTUAL NUMERIC KEYBOARD
(function() {
    const vk = document.getElementById('virtualNumericKeyboard');
    if (!vk) {
        console.error('Virtual keyboard element not found.');
        return;
    }

    let activeInput = null;
    let originalInputMode = '';
    let originalBodyPaddingBottom = '';
    let longPressTimer = null;
    let longPressInterval = null;

    // Haptic feedback function
    function hapticFeedback(type = 'light') {
        if (navigator.vibrate) {
            const intensity = { light: 5, medium: 15, heavy: 25, error: [30, 50, 30] };
            navigator.vibrate(intensity[type] || 5);
        }
    }

	// Tìm hàm showKeyboard và sửa phần padding
	function showKeyboard(inputElement) {
		if (activeInput === inputElement && vk.classList.contains('visible')) {
			setTimeout(() => inputElement.focus(), 0);
			return;
		}
		
		if (activeInput && activeInput !== inputElement) {
			hideKeyboard(false);
		}

		activeInput = inputElement;
		originalInputMode = activeInput.getAttribute('inputmode') || '';
		activeInput.setAttribute('readonly', 'true');

		const bottomNav = document.querySelector('.bottom-nav');
		let navHeight = 0;
		if (bottomNav && getComputedStyle(bottomNav).position === 'fixed' && getComputedStyle(bottomNav).display !== 'none') {
			navHeight = bottomNav.offsetHeight;
		}
		
		vk.style.bottom = navHeight + 'px';
		vk.classList.add('visible');

		if (!document.body.classList.contains('virtual-keyboard-open-padding')) {
			originalBodyPaddingBottom = getComputedStyle(document.body).paddingBottom;
			document.body.classList.add('virtual-keyboard-open-padding');
		}

		// Sửa phần này để không đẩy content lên quá cao
		requestAnimationFrame(() => {
			const keyboardHeight = vk.offsetHeight;
			const totalPadding = keyboardHeight + navHeight;
			
			// Giảm padding để không che form
			document.body.style.paddingBottom = (totalPadding * 0.7) + 'px';

			// Cuộn input vào view nhẹ nhàng hơn
			const inputRect = activeInput.getBoundingClientRect();
			const viewportHeight = window.innerHeight;
			const keyboardTop = viewportHeight - totalPadding;
			
			if (inputRect.bottom > keyboardTop - 20) { // Thêm margin 20px
				const scrollAmount = inputRect.bottom - keyboardTop + 40; // Thêm buffer
				window.scrollBy({
					top: scrollAmount,
					behavior: 'smooth'
				});
			}
		});
		
		setTimeout(() => activeInput.focus(), 0);
	}

    function hideKeyboard(shouldBlur = true) {
        if (!vk.classList.contains('visible') && !activeInput) return;

        vk.classList.remove('visible');

        if (document.body.classList.contains('virtual-keyboard-open-padding')) {
            document.body.style.paddingBottom = originalBodyPaddingBottom;
            document.body.classList.remove('virtual-keyboard-open-padding');
        }
        // vk.style.bottom = '0px'; // Reset if needed, but it's fine as is

        const inputToProcess = activeInput; // Store before nulling
        if (shouldBlur) {
            activeInput = null;
        }

        if (inputToProcess) {
            inputToProcess.removeAttribute('readonly');
            // inputToProcess.setAttribute('inputmode', originalInputMode);
            if (shouldBlur) {
                inputToProcess.blur();
            }
        }
    }

    function handleKeyPress(key) {
        if (!activeInput) return;

        let currentVal = activeInput.value;
        let selectionStart = activeInput.selectionStart;
        let selectionEnd = activeInput.selectionEnd;
        let valueChanged = false;

        if (key === 'backspace') {
            if (selectionStart === selectionEnd && selectionStart > 0) {
                currentVal = currentVal.slice(0, selectionStart - 1) + currentVal.slice(selectionEnd);
                selectionStart--;
                valueChanged = true;
            } else if (selectionStart !== selectionEnd) {
                currentVal = currentVal.slice(0, selectionStart) + currentVal.slice(selectionEnd);
                valueChanged = true;
            }
            activeInput.value = currentVal;
            activeInput.setSelectionRange(selectionStart, selectionStart);
        } else if (key === 'done') {
            hideKeyboard();
            // Trigger change event if value was modified by keyboard, for form handling
            activeInput.dispatchEvent(new Event('change', { bubbles: true }));
            return;
        } else if (key === '.') {
            const beforeCursor = currentVal.substring(0, selectionStart);
            const afterCursor = currentVal.substring(selectionEnd);
            // Allow dot if selection replaces an existing dot or no dot exists in the unselected parts
            if (!beforeCursor.includes('.') && !afterCursor.includes('.')) {
                 if (!currentVal.includes('.') || (selectionStart !== selectionEnd && currentVal.substring(selectionStart, selectionEnd).includes('.'))) {
                    currentVal = beforeCursor + key + afterCursor;
                    selectionStart++;
                    valueChanged = true;
                 } else {
                     hapticFeedback('error'); // Vibrate differently for invalid input
                 }
            } else {
                hapticFeedback('error');
            }
            activeInput.value = currentVal;
            activeInput.setSelectionRange(selectionStart, selectionStart);
        } else { // Number or '000'
            currentVal = currentVal.slice(0, selectionStart) + key + currentVal.slice(selectionEnd);
            selectionStart += key.length;
            valueChanged = true;
            activeInput.value = currentVal;
            activeInput.setSelectionRange(selectionStart, selectionStart);
        }

        if (valueChanged) {
            activeInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        // Maintain focus without triggering native keyboard
        setTimeout(() => {
            if(activeInput) activeInput.focus();
        }, 0);
    }

    // Event delegation for key presses for better performance and touch handling
    vk.addEventListener('pointerdown', function(e) {
        const btn = e.target.closest('button[data-key]');
        if (!btn || !activeInput) return;

        e.preventDefault(); // Prevent focus loss from input and other defaults
        btn.classList.add('pressed'); // Visual feedback for press
        hapticFeedback('light');

        const key = btn.getAttribute('data-key');
        handleKeyPress(key); // Handle single press

        // Long press for backspace
        if (key === 'backspace') {
            longPressTimer = setTimeout(() => {
                hapticFeedback('medium');
                longPressInterval = setInterval(() => {
                    handleKeyPress('backspace');
                    hapticFeedback('light');
                }, 100); // Speed of repeat delete
            }, 500); // Time to hold for long press
        }
    });

    // Clear long press on pointerup or leave
    function clearLongPress() {
        clearTimeout(longPressTimer);
        clearInterval(longPressInterval);
        vk.querySelectorAll('button.pressed').forEach(b => b.classList.remove('pressed'));
    }
    vk.addEventListener('pointerup', clearLongPress);
    vk.addEventListener('pointerleave', clearLongPress); // If finger slides off
    vk.addEventListener('contextmenu', e => e.preventDefault()); // Prevent context menu on long press

    function bindVirtualKeyboardToInputs() {
        document.querySelectorAll('input[data-virtual-keyboard="true"]').forEach(input => {
            input.addEventListener('focus', function(e) {
                showKeyboard(this);
            });
            input.addEventListener('click', function(e) { // Also show on click, in case focus was programmatic
                showKeyboard(this);
            });
            // Prevent native keyboard on some interactions if readonly isn't enough
            // input.addEventListener('mousedown', e => e.preventDefault()); // Careful, can affect cursor
        });

        // Global listener to hide keyboard when clicking outside
        document.addEventListener('pointerdown', function(e) {
            if (activeInput && vk.classList.contains('visible')) {
                const targetIsKeyboard = vk.contains(e.target);
                const targetIsActiveInput = activeInput.contains(e.target);
                let targetIsLabelForActiveInput = false;
                if(activeInput.id){
                    const label = document.querySelector(`label[for="${activeInput.id}"]`);
                    if(label) targetIsLabelForActiveInput = label.contains(e.target);
                }

                if (!targetIsKeyboard && !targetIsActiveInput && !targetIsLabelForActiveInput) {
                    if (!e.target.closest('input[data-virtual-keyboard="true"]')) {
                        hideKeyboard();
                    }
                }
            }
        }, true); // Use capture phase
    }

    document.addEventListener('DOMContentLoaded', function() {
        originalBodyPaddingBottom = getComputedStyle(document.body).paddingBottom;
        bindVirtualKeyboardToInputs();

        // Hide keyboard if form containing activeInput is submitted
        document.addEventListener('submit', function(e) {
            if (activeInput && e.target.contains(activeInput)) {
                hideKeyboard(false); // Don't blur, let form submit handle focus
            }
        }, true);
    });

})();