
// ===================================================================
// MOBILE CHART ENHANCEMENTS CLASS (unchanged)
// ===================================================================
class MobileChartEnhancements {
    constructor() {
        this.isInitialized = false;
        this.touchStartY = 0;
        this.touchStartX = 0;
        this.isScrolling = false;
        this.orientation = this.getOrientation();
        this.setupEventListeners();
    }

    init() {
        if (this.isInitialized) return;
        
        console.log('📱 Initializing Mobile Chart Enhancements...');
        
        this.addMobileSpecificClasses();
        this.setupTouchOptimizations();
        this.setupOrientationChange();
        this.setupViewportOptimization();
        this.setupPerformanceOptimizations();
        
        this.isInitialized = true;
        console.log('✅ Mobile Chart Enhancements initialized');
		this.handleInitialTab();

		this.updateInstallButtonState(false); // <--- THÊM DÒNG NÀY

		this.isInitialized = true;
		console.log('✅ Financial App initialized successfully');
    }

    getOrientation() {
        return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
    }

    setupEventListeners() {
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.handleOrientationChange(), 100);
        });

        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.handleResize(), 150);
        });

        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });
    }

    addMobileSpecificClasses() {
        const isMobile = this.isMobileDevice();
        const isSmallMobile = window.innerWidth <= 480;
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

        if (isMobile) {
            document.body.classList.add('mobile-device');
        }
        if (isSmallMobile) {
            document.body.classList.add('small-mobile');
        }
        if (isIOS) {
            document.body.classList.add('ios-device');
        }

        document.body.classList.add(`orientation-${this.orientation}`);
    }

    setupTouchOptimizations() {
        const chartElements = document.querySelectorAll('.chart-container, .chart-legend');
        
        chartElements.forEach(element => {
            element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
            element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
            element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
        });

        const legends = document.querySelectorAll('.chart-legend');
        legends.forEach(legend => {
            legend.style.webkitOverflowScrolling = 'touch';
            legend.style.scrollBehavior = 'smooth';
        });
    }

    handleTouchStart(e) {
        this.touchStartY = e.touches[0].clientY;
        this.touchStartX = e.touches[0].clientX;
        this.isScrolling = false;
    }

    handleTouchMove(e) {
        if (!this.touchStartY || !this.touchStartX) return;

        const currentY = e.touches[0].clientY;
        const currentX = e.touches[0].clientX;
        const deltaY = Math.abs(currentY - this.touchStartY);
        const deltaX = Math.abs(currentX - this.touchStartX);

        if (deltaY > deltaX && deltaY > 10) {
            this.isScrolling = true;
        }

        if (!this.isScrolling && e.target.closest('.chart-container')) {
            e.preventDefault();
        }
    }

    handleTouchEnd(e) {
        this.touchStartY = 0;
        this.touchStartX = 0;
        this.isScrolling = false;
    }

    setupOrientationChange() {
        const handleOrientationChange = () => {
            setTimeout(() => {
                this.orientation = this.getOrientation();
                document.body.classList.remove('orientation-portrait', 'orientation-landscape');
                document.body.classList.add(`orientation-${this.orientation}`);
                
                this.adjustChartsForOrientation();
                this.triggerChartRefresh();
            }, 300);
        };

        window.addEventListener('orientationchange', handleOrientationChange);
        window.addEventListener('resize', handleOrientationChange);
    }

    adjustChartsForOrientation() {
        const chartContainers = document.querySelectorAll('.chart-container');
        const isLandscape = this.orientation === 'landscape';
        const isMobile = this.isMobileDevice();

        if (!isMobile) return;

        chartContainers.forEach(container => {
            if (isLandscape) {
                container.style.height = '180px';
            } else {
                const isSmallMobile = window.innerWidth <= 480;
                container.style.height = isSmallMobile ? '220px' : '250px';
            }
        });

        const trendContainer = document.querySelector('.trend-chart-container');
        const comparisonContainer = document.querySelector('.comparison-chart-container');

        if (trendContainer) {
            trendContainer.style.height = isLandscape ? '160px' : '200px';
        }
        if (comparisonContainer) {
            comparisonContainer.style.height = isLandscape ? '150px' : '180px';
        }
    }

    setupViewportOptimization() {
        const metaViewport = document.querySelector('meta[name="viewport"]');
        if (metaViewport) {
            metaViewport.setAttribute('content', 
                'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
            );
        }

        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
            window.addEventListener('focusin', () => {
                document.body.classList.add('keyboard-open');
            });
            
            window.addEventListener('focusout', () => {
                document.body.classList.remove('keyboard-open');
                setTimeout(() => {
                    window.scrollTo(0, 0);
                }, 100);
            });
        }
    }

    setupPerformanceOptimizations() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.body.classList.add('reduce-motion');
        }

        this.setupPerformanceMonitoring();
    }

    setupPerformanceMonitoring() {
        let frameCount = 0;
        let lastTime = performance.now();

        const checkFPS = () => {
            frameCount++;
            const currentTime = performance.now();
            
            if (currentTime >= lastTime + 1000) {
                const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
                
                if (fps < 30) {
                    console.warn(`Low FPS detected: ${fps}`);
                    this.enablePerformanceMode();
                }
                
                frameCount = 0;
                lastTime = currentTime;
            }
            
            requestAnimationFrame(checkFPS);
        };

        if (this.isMobileDevice()) {
            requestAnimationFrame(checkFPS);
        }
    }

    enablePerformanceMode() {
        document.body.classList.add('performance-mode');
        
        const charts = window.StatisticsModule?.charts || {};
        Object.values(charts).forEach(chart => {
            if (chart && chart.options) {
                chart.options.animation = { duration: 0 };
                chart.update('none');
            }
        });
    }

    handleOrientationChange() {
        console.log('📱 Orientation changed to:', this.orientation);
        
        this.adjustChartsForOrientation();
        
        setTimeout(() => {
            this.triggerChartRefresh();
        }, 500);
    }

    handleResize() {
        if (!this.isMobileDevice()) return;
        
        console.log('📱 Mobile resize detected');
        this.addMobileSpecificClasses();
        this.adjustChartsForOrientation();
        
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            this.triggerChartRefresh();
        }, 300);
    }

    handleVisibilityChange() {
        if (document.hidden) {
            this.pauseChartAnimations();
        } else {
            this.resumeChartAnimations();
            setTimeout(() => {
                this.triggerChartRefresh();
            }, 100);
        }
    }

    pauseChartAnimations() {
        const charts = window.StatisticsModule?.charts || {};
        Object.values(charts).forEach(chart => {
            if (chart && chart.options) {
                chart.options.animation = { duration: 0 };
            }
        });
    }

    resumeChartAnimations() {
        const charts = window.StatisticsModule?.charts || {};
        const isMobile = this.isMobileDevice();
        
        Object.values(charts).forEach(chart => {
            if (chart && chart.options) {
                chart.options.animation = { 
                    duration: isMobile ? 400 : 800,
                    easing: 'easeOutQuart'
                };
            }
        });
    }

    triggerChartRefresh() {
        if (window.StatisticsModule && window.StatisticsModule.isInitialized) {
            try {
                window.StatisticsModule.refresh(); 
                console.log('MobileChartEnhancements: Called StatisticsModule.refresh()');
            } catch (error) {
                console.error('Error calling StatisticsModule.refresh() from MobileChartEnhancements:', error);
            }
        } else {
            console.warn('MobileChartEnhancements: StatisticsModule not available or not initialized for chart refresh.');
        }
    }

    isMobileDevice() {
        return window.innerWidth <= 768 || 
               /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    optimize() {
        this.adjustChartsForOrientation();
        this.triggerChartRefresh();
        console.log('📱 Manual mobile optimization triggered');
    }

    getDebugInfo() {
        return {
            isMobile: this.isMobileDevice(),
            orientation: this.orientation,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            devicePixelRatio: window.devicePixelRatio,
            userAgent: navigator.userAgent,
            classes: Array.from(document.body.classList),
            isInitialized: this.isInitialized
        };
    }
}