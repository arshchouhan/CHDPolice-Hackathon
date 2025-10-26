import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faLock,
  faShieldAlt
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../assets/css/auth.css';

const AdminLoginComponent = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Check if admin is already logged in
  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isAdminLoggedIn');
    const token = localStorage.getItem('adminToken');
    
    if (isLoggedIn && token) {
      window.location.href = '/admin/dashboard';
    }
  }, []);


  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store token
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('isAdminLoggedIn', 'true'); // Add this line
      
      // Success - redirect immediately
      toast.success('Login successful!');
      setTimeout(() => {
        window.location.href = '/admin/dashboard'; // Use window.location instead of navigate
      }, 1000);
      
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'An error occurred during login');
      toast.error(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-900">
      {/* Background image */}
      <div
        className="fixed inset-0 z-0 opacity-20"
        style={{
          backgroundImage:
            'url(https://images.unsplash.com/photo-1544197150-b99a580bb7a8?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80)',
          backgroundSize: 'cover'
        }}
      />
      <div className="fixed inset-0 z-0 bg-blue-900 opacity-10" />

      <div className="max-w-6xl w-full flex flex-col lg:flex-row overflow-hidden rounded-xl shadow-2xl relative z-10">
        {/* Left: form */}
        <div className="w-full lg:w-1/2 bg-white/10 backdrop-blur-lg p-8 space-y-6">
          {/* Branding */}
          <div className="absolute top-6 left-6 flex items-center space-x-2">
            <div className="bg-blue-600 p-2 rounded-lg shadow-lg">
              <FontAwesomeIcon icon={faShieldAlt} className="text-white" />
            </div>
            <span className="text-xl font-bold text-white">EmailShield Admin</span>
          </div>

          {/* Welcome */}
          <div className="text-center pt-16 md:pt-8">
            <h1 className="text-3xl font-bold text-white mb-2">Admin Portal</h1>
            <p className="text-gray-300">Sign in to access the admin dashboard</p>
          </div>
            
          {error && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500 text-red-200 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6 mt-8">
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                  <FontAwesomeIcon icon={faUser} className="mr-2" />
                  Admin Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your admin email"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                  <FontAwesomeIcon icon={faLock} className="mr-2" />
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isLoading ? (
                  'Signing in...'
                ) : (
                  <>
                    <FontAwesomeIcon icon={faShieldAlt} className="mr-2" />
                    Sign In
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-sm text-gray-400">
            <p>Need admin access?{' '}
              <Link to="/contact" className="text-blue-400 hover:text-blue-300 font-medium">
                Contact Administrator
              </Link>
            </p>
          </div>
        </div>

        {/* Right: Info Panel */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-800 to-blue-900 p-12 flex-col justify-between">
          <div className="space-y-8">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-3 rounded-lg">
                <FontAwesomeIcon icon={faShieldAlt} className="text-white text-2xl" />
              </div>
              <h2 className="text-2xl font-bold text-white">Admin Dashboard</h2>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="bg-white/10 p-2 rounded-full mt-1">
                  <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">User Management</h3>
                  <p className="text-blue-100">Manage all user accounts, roles, and permissions in one place.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="bg-white/10 p-2 rounded-full mt-1">
                  <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Security Monitoring</h3>
                  <p className="text-blue-100">Monitor security events and review suspicious activities in real-time.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="bg-white/10 p-2 rounded-full mt-1">
                  <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">System Analytics</h3>
                  <p className="text-blue-100">Access detailed reports and analytics on system usage and performance.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-12 pt-6 border-t border-blue-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/10 rounded-full">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-white">Secure Access</p>
                <p className="text-xs text-blue-200">Your credentials are encrypted and protected</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginComponent;
