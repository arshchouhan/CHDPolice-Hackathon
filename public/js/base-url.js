// Base URL configuration utility
function getBaseUrl() {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // For local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    
    // For production
    if (hostname.includes('vercel.app') || hostname.includes('onrender.com')) {
        // Always use HTTPS in production
        return 'https://chd-police-hackathon.onrender.com';
    }
    
    // Default to current origin if no match found
    return `${protocol}//${hostname}`;
}

// Make getBaseUrl available globally
window.getBaseUrl = getBaseUrl;