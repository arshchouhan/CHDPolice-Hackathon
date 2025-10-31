import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const navigate = useNavigate();

  // Check if already authenticated when component mounts
  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const apiUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000/api/admin/verify-token' 
        : '/api/admin/verify-token';

      const response = await fetch(apiUrl, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.authenticated) {
          console.log('Already authenticated, redirecting to dashboard...');
          navigate('/admin/dashboard', { replace: true });
          return;
        }
      }
    } catch (error) {
      console.log('Not authenticated:', error.message);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      console.log('Attempting login with email:', email);
      
      const apiUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000/api/admin/login' 
        : '/api/admin/login';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include', // Important for cookies
        body: JSON.stringify({ email, password }),
      });

      console.log('Login response status:', response.status);
      
      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', {
          status: response.status,
          statusText: response.statusText,
          body: text
        });
        throw new Error('Server returned an invalid response. Please try again.');
      }

      const data = await response.json();
      console.log('Login response data:', data);

      // Check if login was successful
      if (!response.ok) {
        throw new Error(data.message || 'Invalid credentials');
      }

      if (data.success && data.token) {
        console.log('Login successful, token received');
        
        // Store token in localStorage as backup (cookie is primary)
        localStorage.setItem('adminToken', data.token);
        
        // Small delay to ensure cookie is set
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('Redirecting to dashboard...');
        navigate('/admin/dashboard', { replace: true });
      } else {
        throw new Error(data.message || 'Login failed - no token received');
      }
    } catch (err) {
      console.error('Login error:', {
        name: err.name,
        message: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString()
      });
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to log in. Please check your credentials and try again.';
      
      if (err.message.includes('NetworkError') || err.message.includes('Failed to fetch')) {
        errorMessage = 'Unable to connect to the server. Please check your internet connection.';
      } else if (err.message.includes('Invalid credentials')) {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (err.message.includes('401')) {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while checking authentication
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-white text-center">
          <svg className="animate-spin h-8 w-8 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl shadow-xl overflow-hidden border border-white/10">
          <div className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white">Admin Login</h2>
              <p className="text-gray-400 mt-2">Enter your credentials to access the dashboard</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  placeholder="admin@example.com"
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                    Password
                  </label>
                  <a href="#" className="text-xs text-emerald-400 hover:text-emerald-300">
                    Forgot password?
                  </a>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium rounded-lg transition duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  'Sign in to Dashboard'
                )}
              </button>
            </form>
          </div>
          
          <div className="px-8 py-4 bg-black/20 text-center border-t border-white/5">
            <p className="text-sm text-gray-400">
              Not an admin?{' '}
              <a href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
                Return to user login
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;