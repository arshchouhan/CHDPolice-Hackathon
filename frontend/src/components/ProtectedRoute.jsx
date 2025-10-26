import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children, requiredRole = 'user' }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const location = useLocation();
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check for admin token first if admin route
        const isAdmin = requiredRole === 'admin';
        const token = isAdmin 
          ? localStorage.getItem('adminToken')
          : localStorage.getItem('token');
          
        if (!token) {
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        // Use the appropriate verify endpoint based on the required role
        const verifyEndpoint = isAdmin 
          ? `${apiUrl}/api/admin/verify-token`
          : `${apiUrl}/api/auth/verify-token`;

        const response = await fetch(verifyEndpoint, {
          headers: { 'Authorization': `Bearer ${token}` },
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Token verification failed');
        }

        const data = await response.json();
        
        if (data.authenticated) {
          const role = data.user?.role || (requiredRole === 'admin' ? 'admin' : 'user');
          setUserRole(role);
          
          // Check if user has the required role
          if (requiredRole === 'admin' && role !== 'admin') {
            setIsAuthenticated(false);
          } else {
            setIsAuthenticated(true);
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [requiredRole]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to appropriate login page based on required role
    const loginPath = requiredRole === 'admin' ? '/admin/login' : '/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  if (requiredRole === 'admin' && userRole !== 'admin') {
    // If user is not an admin but tried to access admin route
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
