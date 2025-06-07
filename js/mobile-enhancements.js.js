/**
 * MOBILE CHART ENHANCEMENTS MODULE
 * Handles touch optimizations, orientation changes, and performance tweaks for charts on mobile devices.
 */
class MobileChartEnhancements {
    constructor() {
        this.isInitialized = false;
        this.orientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
        this.resizeTimeout = null;
    }

    init() {
        if (this.isInitialized || !this.isMobileDevice()) {
            if (!this.isMobileDevice()) console.log('📱 Not a mobile device, skipping mobile enhancements.');
            return;
        }
        
        console.log('📱 Initializing Mobile Chart Enhancements...');
        
        this.addMobileSpecificClasses();
        this.setupEventListeners();
        this.injectCSS();
        
        this.isInitialized = true;
        console.log('✅ Mobile Chart Enhancements initialized');
    }

    setupEventListeners() {
        window.addEventListener('orientationchange', () => this.handleOrientationChange());
        window.addEventListener('resize', () => this.handleResize());
    }

    addMobileSpecificClasses() {
        document.body.classList.add('mobile-device');
        document.body.classList.add(`orientation-${this.orientation}`);
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
            document.body.classList.add('ios-device');
        }
    }

    handleOrientationChange() {
        setTimeout(() => {
            const newOrientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
            if (this.orientation !== newOrientation) {
                this.orientation = newOrientation;
                document.body.classList.remove('orientation-portrait', 'orientation-landscape');
                document.body.classList.add(`orientation-${this.orientation}`);
                this.triggerChartRefresh();
            }
        }, 300); // Delay for iOS
    }

    handleResize() {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            console.log('📱 Mobile resize detected');
            this.triggerChartRefresh();
        }, 300);
    }

    triggerChartRefresh() {
        // This module is now initialized by the app, so window.FinancialAppInstance should exist.
        if (window.FinancialAppInstance && window.FinancialAppInstance.modules.StatisticsModule) {
            try {
                window.FinancialAppInstance.modules.StatisticsModule.refresh();
                console.log('MobileChartEnhancements: Called StatisticsModule.refresh()');
            } catch (error) {
                console.error('Error calling StatisticsModule.refresh() from MobileChartEnhancements:', error);
            }
        }
    }

    isMobileDevice() {
        return window.innerWidth <= 768 || 
               /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    injectCSS() {
        const css = `
        <style id="mobile-enhancement-css">
            .mobile-device .chart-legend {
                -webkit-overflow-scrolling: touch;
                scroll-behavior: smooth;
            }
            .ios-device .chart-container {
                -webkit-transform: translateZ(0);
                transform: translateZ(0);
            }
        </style>
        `;
        if (!document.getElementById('mobile-enhancement-css')) {
            document.head.insertAdjacentHTML('beforeend', css);
        }
    }
}