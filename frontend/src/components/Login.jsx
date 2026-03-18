import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAdminAuth } from '../context/adminauthcontext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const isAdminLogin = searchParams.get('admin') === 'true';

  const { login, user } = useAuth();
  const { adminLogin } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const API_URL = 'https://chdpolice-hackathon.onrender.com'; // Updated backend URL

  // Verify token once (only on /login)
  useEffect(() => {
    const token = localStorage.getItem('token');
    const currentPath = location.pathname;

    if (token && currentPath === '/login' && !isVerifying) {
      verifyToken();
    } else if (!token) {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  //Redirect after successful verification/login
  useEffect(() => {
    if (user && !isLoading && !isVerifying) {
      if (isAdminLogin) {
        navigate('/admin/dashboard', { replace: true });
      } else if (location.pathname !== '/dashboard') {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, isLoading, isVerifying, navigate, location.pathname, isAdminLogin]);

  // Token verification
  const verifyToken = async () => {
    try {
      setIsVerifying(true);
      setIsLoading(true);

      const token = localStorage.getItem('token');
      if (!token) {
        setIsLoading(false);
        setIsVerifying(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/auth/verify-token`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (isAdminLogin) {
        if (data.success && data.token) {
          localStorage.setItem('adminToken', data.token);
          navigate('/admin/dashboard', { replace: true });
        } else {
          throw new Error(data.message || 'Admin authentication failed');
        }
      } else if (data.authenticated && data.user) {
        login(data.user, token);
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      console.error('Token verification error:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('userData');
    } finally {
      setIsVerifying(false);
      setIsLoading(false);
    }
  };

  // Toggle between Admin/User login
  const toggleAdminLogin = (e) => {
    e.preventDefault();
    setSearchParams({ admin: !isAdminLogin });
    setEmail('');
    setPassword('');
    setError('');
  };

  // Handle login submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password');
      setIsLoading(false);
      return;
    }

    try {
      const endpoint = isAdminLogin ? 'admin/login' : 'auth/login';
      const response = await fetch(`${API_URL}/api/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Login failed');
      if (!data.token) throw new Error('No token received from server');

      // Store token + user info
      localStorage.setItem('token', data.token);
      localStorage.setItem('userData', JSON.stringify(data.user));
      login(data.user, data.token);

      // Redirect to dashboard
      navigate(isAdminLogin ? '/admin/dashboard' : '/dashboard', { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Verification state */}
      {isVerifying && (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-gray-600 mb-4"></div>
            <p className="text-gray-600 text-lg font-medium">Verifying credentials...</p>
          </div>
        </div>
      )}

      {/* Main Login Structure */}
      {!isVerifying && (
        <div className="min-h-screen flex bg-white font-sans">
          {/* Left side - Simple structural placeholder */}
          <div className="hidden lg:flex flex-1 bg-gray-100 p-12 items-center justify-center border-r border-gray-200">
            <div className="max-w-md text-center">
              <h2 className="text-4xl font-bold mb-4 text-gray-900">
                Email Threat Detection
              </h2>
              <p className="text-gray-600 text-lg">Advanced cybersecurity monitoring system</p>
              <div className="mt-8 p-6 border-2 border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-400 italic">Secure access portal</p>
              </div>
            </div>
          </div>

          {/* Right side - Login form */}
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-md">
              <div className="border border-gray-200 p-8 rounded-lg shadow-sm">
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Secure Access
                  </h1>
                  <p className="text-gray-500">Enter credentials to continue</p>
                </div>

                {error && (
                  <div className="mb-6 p-4 border border-red-200 bg-red-50 text-red-600 rounded-lg text-sm flex items-start gap-2">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      required
                      disabled={isLoading}
                      className="w-full px-4 py-3 rounded-md border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                        Password
                      </label>
                      <Link 
                        to="/forgot-password" 
                        className="text-sm text-gray-500 hover:text-gray-900 hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <input
                      type="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      disabled={isLoading}
                      className="w-full px-4 py-3 rounded-md border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none transition-all"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="remember"
                        className="h-4 w-4 text-gray-600 border-gray-300 rounded focus:ring-gray-500"
                      />
                      <label htmlFor="remember" className="ml-2 block text-sm text-gray-600">
                        Remember me
                      </label>
                    </div>
                    
                    <button
                      type="button"
                      onClick={toggleAdminLogin}
                      className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
                    >
                      {isAdminLogin ? 'User Login' : 'Admin Login'}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full py-3 px-4 rounded-md text-white font-semibold transition-all ${
                      isLoading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gray-900 hover:bg-black shadow-sm'
                    }`}
                  >
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-100">
                  <p className="text-xs text-center text-gray-400 mb-4 uppercase tracking-widest font-semibold">Test Access (Development Only)</p>
                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        const code = window.prompt('Enter test access code:');
                        if (code === '2404') {
                          const testUser = { _id: 'test_user', name: 'Test User', email: 'user@test.com', role: 'user' };
                          login(testUser, 'mock_user_token');
                          navigate('/dashboard');
                        } else if (code !== null) {
                          alert('Invalid code');
                        }
                      }}
                      className="flex-1 py-2 px-3 text-xs font-medium border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                    >
                      Test User
                    </button>
                    <button
                      onClick={() => {
                        const code = window.prompt('Enter test access code:');
                        if (code === '2404') {
                          // Log in as admin in the admin context
                          adminLogin('mock_admin_token');
                          navigate('/admin/dashboard');
                        } else if (code !== null) {
                          alert('Invalid code');
                        }
                      }}
                      className="flex-1 py-2 px-3 text-xs font-medium border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                    >
                      Test Admin
                    </button>
                  </div>
                </div>

                {!isAdminLogin && (
                  <div className="mt-6 text-center text-sm">
                    <p className="text-gray-600">
                      Don't have an account?{' '}
                      <Link 
                        to="/signup" 
                        className="font-semibold text-gray-900 hover:underline"
                      >
                        Sign up
                      </Link>
                    </p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 text-center text-xs text-gray-400">
                <p>Protected by advanced encryption • Secure connection</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Login;