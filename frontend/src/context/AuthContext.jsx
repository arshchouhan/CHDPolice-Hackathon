import React, { createContext, useContext, useState, useEffect } from 'react';

// Create context
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // ✅ User state
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('userData');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  // ✅ User Login
  const login = (userData, token) => {
    setUser(userData);
    localStorage.setItem('token', token);
    localStorage.setItem('userData', JSON.stringify(userData));
  };

  // ✅ User Logout
  const logout = async () => {
    try {
      // If there's an API call needed for logout, it would go here
      // For example: await fetch(`${API_URL}/api/auth/logout`, { method: 'POST' });
      
      // Clear local state and storage
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('userData');
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, we should still clear the local state
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('userData');
      return { success: false, error: error.message };
    }
  };

  // ✅ Verify User Token (on mount and when token changes)
  useEffect(() => {
    let isMounted = true;
    const token = localStorage.getItem('token');

    // If no token found, mark as checked and return
    if (!token) {
      if (isMounted) {
        setLoading(false);
        setAuthChecked(true);
      }
      return;
    }

    // Skip verification if we already have a user and the token matches
    const savedUser = localStorage.getItem('userData');
    if (savedUser && user) {
      const parsedUser = JSON.parse(savedUser);
      if (parsedUser._id === user._id) {
        if (isMounted) {
          setLoading(false);
          setAuthChecked(true);
        }
        return;
      }
    }

    const verifyUser = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/verify-token`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.authenticated && data.user) {
            if (isMounted) {
              setUser(data.user);
              localStorage.setItem('userData', JSON.stringify(data.user));
            }
          } else if (isMounted) {
            logout();
          }
        } else if (isMounted) {
          logout();
        }
      } catch (error) {
        console.error('User verification error:', error);
        if (isMounted) logout();
      } finally {
        if (isMounted) {
          setLoading(false);
          setAuthChecked(true);
        }
      }
    };

    verifyUser();
    
    return () => {
      isMounted = false;
    };
  }, [user?._id]); // Only re-run if the user ID changes

  // ✅ Context value
  const value = {
    user,
    login,
    logout,
    loading,
    authChecked,
    setUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// ✅ Custom Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export default AuthProvider;
