import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const verifyAdminToken = async (token) => {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const response = await fetch(`${apiUrl}/api/admin/verify-token`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const data = await response.json();
    return { isValid: data.success, adminData: data.admin };
  } catch (error) {
    console.error('Token verification failed:', error);
    return { isValid: false, adminData: null };
  }
};

const AdminRoute = () => {
  const { admin, isLoading, login, logout } = useAuth();

  React.useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        logout();
        return;
      }

      const { isValid, adminData } = await verifyAdminToken(token);
      if (!isValid || !adminData) {
        logout();
      } else {
        login(adminData);
      }
    };

    verifyAuth();
  }, [login, logout]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return admin ? <Outlet /> : <Navigate to="/admin/login" replace />;
};

export default AdminRoute;
