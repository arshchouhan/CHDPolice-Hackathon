/**
 * Get the base URL for API requests based on the environment
 * @returns {string} The base URL for API requests
 */
export const getBaseUrl = () => {
    // First check if there's an environment variable
    if (process.env.REACT_APP_API_URL) {
        return process.env.REACT_APP_API_URL;
    }

    // Get the current hostname
    const hostname = window.location.hostname;

    // Development environment
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:5000';
    }

    // Production environment - Render
    if (hostname.includes('onrender.com')) {
        return 'https://email-detection-api.onrender.com';
    }

    // Default to the current origin
    return window.location.origin;
};

export default getBaseUrl;
