// Simple Skeleton Loader Implementation - Fixed Version
document.addEventListener('DOMContentLoaded', function() {
    console.log('Skeleton loader script loaded');
    
    // Force hide any loading states that might be stuck
    function forceShowContent() {
        console.log('Force showing content - fixing stuck loading state');
        
        // Show all content that might be hidden
        const hiddenElements = document.querySelectorAll('[style*="display: none"]');
        hiddenElements.forEach(el => {
            el.style.display = '';
        });
        
        // Remove any loading classes
        const loadingElements = document.querySelectorAll('.loading');
        loadingElements.forEach(el => {
            el.classList.remove('loading');
        });
        
        // Show specific dashboard elements
        const dashboardElements = ['emailConnectionStatus', 'emailAnalysisDashboard', 'gmailNotConnectedSection'];
        dashboardElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = '';
            }
        });
        
        // Remove any skeleton elements
        const skeletonElement = document.getElementById('skeleton-dashboard');
        if (skeletonElement) {
            skeletonElement.remove();
        }
    }
    
    // Run immediately and also after a delay to ensure it works
    forceShowContent();
    setTimeout(forceShowContent, 1000);
    
    // Also run when data is loaded
    const originalLoadUserEmails = window.loadUserEmails;
    if (originalLoadUserEmails) {
        window.loadUserEmails = function() {
            const result = originalLoadUserEmails.apply(this, arguments);
            forceShowContent();
            return result;
        };
    }
    
    // Expose function globally
    window.fixLoadingState = forceShowContent;
});
