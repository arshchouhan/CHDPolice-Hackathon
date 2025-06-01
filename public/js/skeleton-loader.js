// Simple Skeleton Loader Implementation - Fixed Version
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Skeleton loader script loaded');
    
    // Wait for auth utils to be available
    await new Promise(resolve => {
        const checkAuthUtils = () => {
            if (window.authUtils) {
                resolve();
                return true;
            }
            return false;
        };
        
        if (!checkAuthUtils()) {
            const interval = setInterval(() => {
                if (checkAuthUtils()) {
                    clearInterval(interval);
                    resolve();
                }
            }, 100);
        }
    });
    
    // Check authentication status using authUtils
    async function checkAuth() {
        try {
            const isAuth = await window.authUtils.isAuthenticated();
            if (!isAuth) {
                console.log('User not authenticated, redirecting to login');
                window.authUtils.redirectToLogin();
                return false;
            }
            return true;
        } catch (error) {
            console.error('Auth check failed:', error);
            return false;
        }
    }
    
    // Show loading state
    function showLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) loadingOverlay.classList.remove('hidden');
    }
    
    // Hide loading state
    function hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) loadingOverlay.classList.add('hidden');
    }
    
    // Force show content and handle loading states
    async function forceShowContent() {
        console.log('Force showing content - fixing stuck loading state');
        
        // Show all content that might be hidden
        const hiddenElements = document.querySelectorAll('[style*="display: none"]');
        hiddenElements.forEach(el => {
            if (!el.id.includes('skeleton') && !el.id.includes('loading')) {
                el.style.display = '';
            }
        });
        
        // Remove any loading classes
        const loadingElements = document.querySelectorAll('.loading, .is-loading');
        loadingElements.forEach(el => {
            el.classList.remove('loading', 'is-loading');
        });
        
        // Show specific dashboard elements
        const dashboardElements = [
            'emailConnectionStatus', 
            'emailAnalysisDashboard', 
            'gmailNotConnectedSection',
            'gmailConnectedSection'
        ];
        
        dashboardElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = '';
            }
        });
        
        // Remove any skeleton elements with a delay
        setTimeout(() => {
            const skeletonElements = document.querySelectorAll('[id^="skeleton-"]');
            skeletonElements.forEach(skeleton => {
                skeleton.style.transition = 'opacity 0.3s ease';
                skeleton.style.opacity = '0';
                setTimeout(() => {
                    skeleton.remove();
                }, 300);
            });
        }, 500);
        
        // Hide loading overlay
        hideLoading();
    }
    
    // Initialize the page
    async function initialize() {
        try {
            showLoading();
            
            // Check auth status first
            const isAuth = await checkAuth();
            if (!isAuth) return;
            
            // Show content immediately
            await forceShowContent();
            
            // Set up a safety timeout to ensure loading doesn't get stuck
            const timeoutId = setTimeout(() => {
                console.log('Safety timeout reached, forcing content display');
                forceShowContent();
            }, 5000);
            
            // Clean up timeout if page unloads
            window.addEventListener('beforeunload', () => {
                clearTimeout(timeoutId);
            });
            
            // Wrap the original loadUserEmails function if it exists
            if (window.loadUserEmails) {
                const originalLoadUserEmails = window.loadUserEmails;
                window.loadUserEmails = async function() {
                    try {
                        showLoading();
                        const result = await originalLoadUserEmails.apply(this, arguments);
                        await forceShowContent();
                        return result;
                    } catch (error) {
                        console.error('Error in loadUserEmails:', error);
                        await forceShowContent();
                        throw error;
                    }
                };
            }
            
            // Set up error handling for unhandled promise rejections
            window.addEventListener('unhandledrejection', (event) => {
                console.error('Unhandled promise rejection:', event.reason);
                forceShowContent().catch(console.error);
            });
            
        } catch (error) {
            console.error('Initialization error:', error);
            await forceShowContent();
        }
    }
    
    // Start the initialization
    initialize();
    
    // Expose function globally
    window.fixLoadingState = forceShowContent;
});
