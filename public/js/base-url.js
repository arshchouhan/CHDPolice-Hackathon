/**
 * Unified Base URL Handler
 * 
 * This file provides a consistent implementation of getBaseUrl() across the application
 * to ensure API endpoints are correctly resolved in all environments.
 */

// Define the getBaseUrl function in the global scope
window.getBaseUrl = function() {
    try {
        const hostname = window.location.hostname;
        const origin = window.location.origin;
        const port = window.location.port;
        let baseUrl;
        
        console.log('getBaseUrl called from:', document.title || 'Unknown page');
        console.log('Current location:', window.location.href);
        console.log('Hostname:', hostname, 'Origin:', origin, 'Port:', port);
        
        // Check if we're in development mode (localhost with React dev server)
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            baseUrl = `http://${hostname}:3000`; // Always use port 3000 for API in development
            console.log('Development environment detected, using API at:', baseUrl);
        } 
        // Check for production environments
        else if (hostname.includes('vercel.app')) {
            // For Vercel, the API and frontend are on the same domain
            baseUrl = origin;
            console.log('Vercel environment detected, using API at:', baseUrl);
        } else if (hostname.includes('onrender.com')) {
            baseUrl = 'https://chdpolice-hackathon.onrender.com';
            console.log('Render environment detected, using API at:', baseUrl);
        } else {
            // For any other environment, use the current origin but log a warning
            baseUrl = origin;
            console.warn('Unknown environment, falling back to current origin:', baseUrl);
        }
        
        console.log('Final BASE_URL set to:', baseUrl);
        return baseUrl;
    } catch (error) {
        console.error('Error determining base URL:', error);
        // Fallback to current origin if there's an error
        const fallbackUrl = window.location.origin;
        console.warn('Falling back to origin:', fallbackUrl);
        return fallbackUrl;
    }
};

// Log that the base URL module has been loaded
console.log('Base URL module loaded');
