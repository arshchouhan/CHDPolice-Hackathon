// Base URL configuration utility
function getBaseUrl() {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;
    
    // Development environment - use current port
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `${protocol}//${hostname}${port ? ':' + port : ''}`;
    }
    
    // For Vercel frontend, use the same domain for API calls
    if (hostname.includes('vercel.app')) {
        return `${protocol}//${hostname}/api`; // Use relative path with /api prefix
    }
    
    // Production environment - Render backend
    if (hostname.includes('onrender.com')) {
        return `${protocol}//${hostname}${port ? ':' + port : ''}`;
    }
    
    // Default to current origin with /api prefix
    return `${window.location.origin}/api`;
}

// Make getBaseUrl available globally
window.getBaseUrl = getBaseUrl;