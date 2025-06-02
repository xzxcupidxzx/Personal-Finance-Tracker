// MODULE VIRTUAL NUMERIC KEYBOARD
(function() {
  const vk = document.getElementById('virtualNumericKeyboard');
  let activeInput = null;

  function showKeyboard(input) {
    activeInput = input;
    vk.style.display = 'block';
    setTimeout(() => vk.scrollIntoView({block: 'end'}), 50);
  }

  function hideKeyboard() {
    vk.style.display = 'none';
    activeInput = null;
  }

  vk.addEventListener('click', function(e) {
    if (!activeInput) return;
    const btn = e.target.closest('button[data-key]');
    if (!btn) return;
    const key = btn.getAttribute('data-key');
    if (key === 'backspace') {
      activeInput.value = activeInput.value.slice(0, -1);
      activeInput.dispatchEvent(new Event('input'));
    } else if (key === 'done') {
      hideKeyboard();
      activeInput.blur();
    } else if (key === '000') {
      activeInput.value += '000';
      activeInput.dispatchEvent(new Event('input'));
    } else {
      activeInput.value += key;
      activeInput.dispatchEvent(new Event('input'));
    }
  });

  function bindVirtualKeyboard() {
    document.querySelectorAll('input[data-virtual-keyboard="true"]').forEach(input => {
      input.addEventListener('focus', function() { showKeyboard(this); });
      input.addEventListener('click', function() { showKeyboard(this); });
    });

    document.addEventListener('click', function(e) {
      if (!vk.contains(e.target) && !e.target.matches('input[data-virtual-keyboard="true"]')) {
        hideKeyboard();
      }
    });
  }

  document.addEventListener('submit', hideKeyboard, true);
  window.addEventListener('blur', hideKeyboard);
  document.addEventListener('DOMContentLoaded', bindVirtualKeyboard);
})();
