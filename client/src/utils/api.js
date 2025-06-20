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
        // We'll primarily rely on cookies, but use localStorage as fallback
        const token = localStorage.getItem('token');
        if (token && !document.cookie.includes('token=')) {
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
                console.log('Attempting to refresh token...');
                // Try to refresh the session
                const response = await api.request({
                    method: 'POST',
                    url: '/api/auth/refresh',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    withCredentials: true
                });

                if (!response.data.success) {
                    throw new Error('Token refresh failed');
                }

                const { token, user } = response.data;
                console.log('Token refresh successful');

                // Check if we have a cookie set
                if (!document.cookie.includes('token=')) {
                    console.warn('No auth cookie set after refresh');
                    throw new Error('Session expired');
                }

                // Update localStorage as fallback
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));

                // Update all future requests
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

                // Retry the original request with new token
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return api(originalRequest);
            } catch (refreshError) {
                console.error('Token refresh failed:', refreshError);
                // Clear auth state
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                
                // Get the current path for redirect back
                const currentPath = window.location.pathname;
                const isAdminPath = currentPath.includes('admin');
                
                // Redirect to login with return path
                const returnPath = isAdminPath ? 'admin' : currentPath.replace(/^\//, '');
                window.location.href = `/login.html?error=session_expired&redirect=${returnPath}`;
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
            url: '/api/auth/login',
            method: 'POST',
            baseURL,
            credentials
        });

        try {
            // Explicitly set method and URL
            const response = await api.request({
                method: 'POST',
                url: '/api/auth/login',
                data: credentials,
                withCredentials: true,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            // Store token in localStorage as fallback
            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));
            }

            console.log('Login response:', response);
            return response;
        } catch (error) {
            console.error('Login request failed:', error);
            throw error;
        }
    },
    signup: (userData) => api.post('/api/auth/signup', userData),
    logout: () => api.post('/api/auth/logout'),
    checkAuth: () => api.get('/api/auth/check-auth')
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
