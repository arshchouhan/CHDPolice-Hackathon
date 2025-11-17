import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const isAdminLogin = searchParams.get('admin') === 'true';

  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mb-4"></div>
          <p className="text-indigo-400 text-lg font-medium">Verifying credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(129, 140, 248, 0.4);
          }
          50% {
            box-shadow: 0 0 30px rgba(129, 140, 248, 0.6);
          }
        }
        
        .animate-fadeInUp {
          animation: fadeInUp 0.6s ease-out forwards;
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.8s ease-out forwards;
        }
        
        .animate-slideInLeft {
          animation: slideInLeft 0.8s ease-out forwards;
        }
        
        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }
        
        .stagger-1 { animation-delay: 0.1s; opacity: 0; }
        .stagger-2 { animation-delay: 0.2s; opacity: 0; }
        .stagger-3 { animation-delay: 0.3s; opacity: 0; }
        .stagger-4 { animation-delay: 0.4s; opacity: 0; }
        
        .input-glow:focus {
          box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.3);
        }
        
        .gradient-border {
          position: relative;
          background: linear-gradient(145deg, #1e293b, #0f172a);
        }
        
        .gradient-border::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 0.75rem;
          padding: 2px;
          background: linear-gradient(145deg, #818cf8, #6366f1, #4f46e5);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          opacity: 0.5;
        }
      `}</style>

      {/* Left side with image */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSIjODE4Y2Y4IiBzdHJva2Utb3BhY2l0eT0iLjA1Ii8+PC9nPjwvc3ZnPg==')] opacity-30"></div>
        
        <div className="flex flex-col justify-center items-center text-white w-full relative z-10">
          <div className="animate-slideInLeft">
            <img 
              src="https://img.freepik.com/free-vector/secure-login-concept-illustration_114360-4582.jpg" 
              alt="Secure Login"
              className="w-full max-w-md mx-auto drop-shadow-2xl"
            />
          </div>
          <div className="mt-8 text-center animate-fadeInUp stagger-1">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-indigo-400 via-purple-400 to-violet-400 bg-clip-text text-transparent">
              Email Threat Detection
            </h2>
            <p className="text-gray-300 text-lg">Advanced cybersecurity monitoring system</p>
            <div className="mt-6 flex items-center justify-center gap-8 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                <span>Real-time Protection</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                <span>AI-Powered Detection</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side with login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-slate-900 to-slate-950">
        <div className="w-full max-w-md">
          <div className="gradient-border p-8 rounded-xl shadow-2xl backdrop-blur-sm animate-fadeInUp">
            <div className="text-center mb-8 animate-fadeInUp stagger-2">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full mb-4 animate-glow">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 mb-2">
                Secure Access
              </h1>
              <p className="text-gray-400">Enter credentials to continue</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-950/50 border border-red-800/50 text-red-300 rounded-lg text-sm animate-fadeIn backdrop-blur-sm flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="animate-fadeInUp stagger-3">
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                  disabled={isLoading || isVerifying}
                  className="w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-indigo-900/30 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-300 input-glow backdrop-blur-sm disabled:opacity-50"
                />
              </div>

              <div className="animate-fadeInUp stagger-4">
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                    Password
                  </label>
                  <Link 
                    to="/forgot-password" 
                    className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors duration-200 hover:underline"
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
                  disabled={isLoading || isVerifying}
                  className="w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-indigo-900/30 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-300 input-glow backdrop-blur-sm disabled:opacity-50"
                />
              </div>

              <div className="flex items-center justify-between animate-fadeInUp stagger-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="remember"
                    className="h-4 w-4 text-indigo-500 focus:ring-indigo-500 border-indigo-700 rounded bg-slate-800 transition-colors duration-200"
                  />
                  <label htmlFor="remember" className="ml-2 block text-sm text-gray-400">
                    Remember me
                  </label>
                </div>
                
                <button
                  type="button"
                  onClick={toggleAdminLogin}
                  className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors duration-200 hover:underline"
                >
                  {isAdminLogin ? 'User Login' : 'Admin Login'}
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading || isVerifying}
                className={`w-full py-3 px-4 rounded-lg text-white font-semibold transition-all duration-300 animate-fadeInUp stagger-4 ${
                  isLoading || isVerifying
                    ? 'bg-slate-700 cursor-not-allowed opacity-50'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-900/50 hover:shadow-indigo-900/70 transform hover:scale-[1.02]'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {!isAdminLogin && (
              <div className="mt-6 text-center text-sm animate-fadeInUp stagger-4">
                <p className="text-gray-400">
                  Don't have an account?{' '}
                  <Link 
                    to="/signup" 
                    className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors duration-200 hover:underline"
                  >
                    Sign up
                  </Link>
                </p>
              </div>
            )}
          </div>
          
          <div className="mt-6 text-center text-xs text-gray-500 animate-fadeIn">
            <p>Protected by advanced encryption • Secure connection</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;