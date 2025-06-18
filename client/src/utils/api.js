import axios from 'axios';

import { getBaseUrl } from './getBaseUrl';

// Get base URL
const baseURL = getBaseUrl();
console.log('Creating API instance with base URL:', baseURL);

// Create axios instance with default config
const api = axios.create({
    baseURL,
    withCredentials: true, // Required for cookies
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    validateStatus: status => status < 500 // Don't reject if status < 500
});

// Ensure proper method handling
api.defaults.method = 'post'; // Default to POST for safety

// Log all requests in development
if (process.env.NODE_ENV !== 'production') {
    api.interceptors.request.use(request => {
        console.log('API Request:', {
            url: request.url,
            method: request.method,
            data: request.data,
            headers: request.headers
        });
        return request;
    });

    api.interceptors.response.use(
        response => {
            console.log('API Response:', {
                url: response.config.url,
                status: response.status,
                data: response.data
            });
            return response;
        },
        error => {
            console.error('API Error:', {
                url: error.config?.url,
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            return Promise.reject(error);
        }
    );
}

// Log the base URL in development
if (process.env.NODE_ENV !== 'production') {
    console.log('API Base URL:', getBaseUrl());
}

// Request interceptor
api.interceptors.request.use(
    (config) => {
        // Get token from localStorage as fallback
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If error is 401 and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // Try to refresh the session
                const response = await api.post('/auth/refresh');
                const { token } = response.data;

                // Update localStorage
                if (token) {
                    localStorage.setItem('token', token);
                }

                // Retry the original request
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return api(originalRequest);
            } catch (refreshError) {
                // If refresh fails, redirect to login
                localStorage.removeItem('token');
                window.location.href = '/login?error=session_expired';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

// API methods
export const authAPI = {
    login: async (credentials) => {
        console.log('Making login request:', {
            url: '/auth/login',
            method: 'POST',
            baseURL,
            credentials
        });

        try {
            // Explicitly set method and URL
            const response = await api.request({
                method: 'POST',
                url: '/auth/login',
                data: credentials,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            console.log('Login response:', response);
            return response;
        } catch (error) {
            console.error('Login request failed:', error);
            throw error;
        }
    },
    signup: (userData) => api.post('/auth/signup', userData),
    logout: () => api.post('/auth/logout'),
    checkAuth: () => api.get('/auth/check-auth')
};

export const userAPI = {
    getProfile: () => api.get('/api/users/profile'),
    updateProfile: (data) => api.put('/api/users/profile', data),
};

export const emailAPI = {
    analyze: (emailData) => api.post('/api/email-analysis', emailData),
    getResults: (emailId) => api.get(`/api/email-analysis/${emailId}`),
};

export const sandboxAPI = {
    analyzeUrl: (url) => api.post('/api/sandbox/analyze-url', { url }),
    getUrlStatus: (urlId) => api.get(`/api/sandbox/status/${urlId}`),
    getScreenshot: (urlId) => api.get(`/api/sandbox/screenshot/${urlId}`),
};

export default api;
