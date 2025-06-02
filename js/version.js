// =============================================
// VERSION.JS - SINGLE SOURCE OF TRUTH
// =============================================
// GitHub Action sẽ tự động cập nhật version này
const APP_VERSION = '1.0.3';

// Export cho ES6 modules (nếu cần)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { APP_VERSION };
}

// Global access
window.APP_VERSION = APP_VERSION;