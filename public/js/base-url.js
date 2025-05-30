// Base URL configuration utility
function getBaseUrl() {
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    } else if (hostname.includes('vercel.app')) {
        return 'https://chd-police-hackathon.onrender.com';
    } else if (hostname.includes('onrender.com')) {
        return '';
    }
    return '';
}

// Make getBaseUrl available globally
window.getBaseUrl = getBaseUrl;