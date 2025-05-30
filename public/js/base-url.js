// Base URL configuration utility
function getBaseUrl() {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;
    
    // Development environment
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    
    // Production environment - Vercel frontend
    if (hostname.includes('vercel.app')) {
        return 'https://chd-police-hackathon.onrender.com';
    }
    
    // Production environment - Render backend
    if (hostname.includes('onrender.com')) {
        return `${protocol}//${hostname}${port ? ':' + port : ''}`;
    }
    
    // Default to current origin
    return window.location.origin;
}

// Make getBaseUrl available globally
window.getBaseUrl = getBaseUrl;