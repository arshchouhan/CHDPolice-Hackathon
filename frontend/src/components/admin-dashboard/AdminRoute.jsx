import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';

const AdminRoute = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null = loading
  const navigate = useNavigate();

  useEffect(() => {
    const verifyToken = async () => {
      try {
        console.log('Verifying admin token...');
        const token = localStorage.getItem('adminToken');
        
        if (!token) {
          console.log('No admin token found, redirecting to login');
          setIsAuthenticated(false);
          return;
        }

        const apiUrl = process.env.NODE_ENV === 'development'
          ? 'http://localhost:3000/api/admin/verify-token'
          : '/api/admin/verify-token';

        console.log('Making request to:', apiUrl);
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include', // Important for cookies if using them
        });

        console.log('Verification response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Verification response data:', data);
        
        if (data.success && data.authenticated) {
          console.log('Admin authenticated successfully');
          setIsAuthenticated(true);
        } else {
          console.log('Admin not authenticated');
          localStorage.removeItem('adminToken');
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error('Token verification error:', err);
        localStorage.removeItem('adminToken');
        setIsAuthenticated(false);
      }
    };

    verifyToken();
  }, [navigate]);

  // Show loading state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    console.log('Redirecting to /admin/login');
    return <Navigate to="/admin/login" replace />;
  }

  // Render protected routes if authenticated
  return <Outlet />;
};

export default AdminRoute;
