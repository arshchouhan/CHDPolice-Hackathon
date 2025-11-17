import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const UserRoute = () => {
  const { user, loading, authChecked } = useAuth();
  const location = useLocation();
  const [isVerifying, setIsVerifying] = useState(true);

  // Only verify once when the component mounts or when auth state changes
  useEffect(() => {
    if (authChecked) {
      setIsVerifying(false);
    }
  }, [authChecked]);

  // Show loading state while checking auth
  if (loading || isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If not authenticated, redirect to login with return URL
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default UserRoute;
