/**
 * Get the base URL for API requests based on the environment
 * @returns {string} The base URL for API requests
 */
export const getBaseUrl = () => {
    // First check if there's an environment variable
    if (process.env.REACT_APP_API_URL) {
        console.log('Using API URL from env:', process.env.REACT_APP_API_URL);
        return process.env.REACT_APP_API_URL;
    }

    // Get the current hostname
    const hostname = window.location.hostname;
    console.log('Current hostname:', hostname);

    // Development environment
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        console.log('Development environment detected');
        return 'http://localhost:5000';
    }

    // Production environment - Vercel frontend to Render backend
    if (hostname.includes('vercel.app')) {
        console.log('Production environment detected (Vercel)');
        return 'https://chdpolice-hackathon.onrender.com';
    }

    // Production environment - Render frontend
    if (hostname.includes('onrender.com')) {
        console.log('Production environment detected (Render)');
        return 'https://chdpolice-hackathon.onrender.com';
    }

    // Default to the Render backend
    console.log('Using default production backend');
    return 'https://chdpolice-hackathon.onrender.com';
};

export default getBaseUrl;
