import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        try {
            const { data } = await authAPI.checkAuth();
            if (data.authenticated) {
                setUser(data.user);
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (credentials) => {
        console.log('AuthContext: Making login request');
        try {
            const response = await authAPI.login(credentials);
            console.log('AuthContext: Login response received:', {
                status: response.status,
                headers: response.headers,
                data: response.data
            });

            const { data } = response;
            if (data.success) {
                setUser(data.user);
                if (data.token) {
                    localStorage.setItem('token', data.token);
                }
            }
            return data;
        } catch (error) {
            console.error('AuthContext: Login request failed:', {
                error: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            throw error;
        }
    };

    const logout = async () => {
        try {
            await authAPI.logout();
        } finally {
            localStorage.removeItem('token');
            setUser(null);
        }
    };

    const value = {
        user,
        loading,
        login,
        logout,
        checkAuthStatus
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
