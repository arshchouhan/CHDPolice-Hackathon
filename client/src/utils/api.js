import axios from 'axios';

import { getBaseUrl } from './getBaseUrl';

// Create axios instance with default config
const api = axios.create({
    baseURL: getBaseUrl(),
    withCredentials: true, // This is crucial for sending cookies
    headers: {
        'Content-Type': 'application/json',
    }
});

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
                const response = await api.post('/api/auth/refresh');
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
    login: (credentials) => api.post('/api/auth/login', credentials),
    signup: (userData) => api.post('/api/auth/signup', userData),
    logout: () => api.post('/api/auth/logout'),
    checkAuth: () => api.get('/api/auth/check'),
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
