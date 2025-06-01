/**
 * Configuration for API endpoints and environment settings
 */

// Determine the environment
const isLocal = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1';
                
const isVercel = window.location.hostname.endsWith('.vercel.app');
const isRender = window.location.hostname.endsWith('.onrender.com');

// Set the base URL for API requests
let BASE_URL;

if (isLocal) {
  // Local development
  BASE_URL = 'http://localhost:3000';
} else if (isVercel) {
  // Vercel deployment
  BASE_URL = 'https://chdpolice-hackathon.onrender.com';
} else if (isRender) {
  // Render deployment
  BASE_URL = 'https://chdpolice-hackathon.onrender.com';
} else {
  // Fallback to current host
  BASE_URL = window.location.origin;
}

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${BASE_URL}/auth/login`,
    REGISTER: `${BASE_URL}/auth/register`,
    GOOGLE: `${BASE_URL}/auth/google`,
    GOOGLE_CALLBACK: `${BASE_URL}/auth/google/callback`,
    LOGOUT: `${BASE_URL}/auth/logout`,
    ME: `${BASE_URL}/auth/me`
  },
  GMAIL: {
    STATUS: `${BASE_URL}/api/gmail/status`,
    CONNECT: `${BASE_URL}/api/gmail/connect`,
    DISCONNECT: `${BASE_URL}/api/gmail/disconnect`,
    CALLBACK: `${BASE_URL}/api/gmail/callback`,
    SCAN: `${BASE_URL}/api/gmail/scan`,
    EMAILS: `${BASE_URL}/api/gmail/emails`,
  },
  ANALYSIS: {
    ANALYZE: `${BASE_URL}/api/analyze`,
    SCAN: `${BASE_URL}/api/scan`,
    HISTORY: `${BASE_URL}/api/analysis/history`,
    DETAILS: (id) => `${BASE_URL}/api/analysis/${id}`,
  },
  SETTINGS: {
    PROFILE: `${BASE_URL}/api/settings/profile`,
    PASSWORD: `${BASE_URL}/api/settings/password`,
    NOTIFICATIONS: `${BASE_URL}/api/settings/notifications`,
  }
};

// Export the base URL for direct use if needed
export { BASE_URL };

// Log the current configuration in development
if (process.env.NODE_ENV !== 'production') {
  console.log('API Configuration:', {
    environment: isLocal ? 'local' : isVercel ? 'vercel' : isRender ? 'render' : 'production',
    baseUrl: BASE_URL,
    endpoints: API_ENDPOINTS
  });
}
