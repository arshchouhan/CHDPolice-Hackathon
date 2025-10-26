import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faLock,
  faShieldAlt,
  faCheckCircle
} from '@fortawesome/free-solid-svg-icons';
import '../assets/css/auth.css';

const GOOGLE_CLIENT_ID =
  // keep your real client id here; env inject if you prefer
  '317162009302-294m6fsmrlqfa30q091rnkmo69uos1ba.apps.googleusercontent.com';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const googleButtonRef = useRef(null);
  const googleScriptLoadedRef = useRef(false);

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Verify token and redirect if valid
      const verifyToken = async () => {
        try {
          const response = await fetch('http://localhost:3000/api/auth/verify-token', {
            headers: { 'Authorization': `Bearer ${token}` },
            credentials: 'include'
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.authenticated) {
              navigate('/dashboard');
            }
          }
        } catch (error) {
          console.error('Token verification failed:', error);
          localStorage.removeItem('token');
        }
      };
      
      verifyToken();
    }
  }, [navigate]);

  // ---- Google Sign-In setup (load script once, guard window.google) ----
  useEffect(() => {
    const ensureGoogleScript = () =>
      new Promise((resolve, reject) => {
        if (window.google?.accounts?.id) {
          resolve();
          return;
        }
        if (googleScriptLoadedRef.current) {
          // script tag is there but not ready yet; wait a tick
          const check = setInterval(() => {
            if (window.google?.accounts?.id) {
              clearInterval(check);
              resolve();
            }
          }, 50);
          // bail out after some time
          setTimeout(() => {
            clearInterval(check);
            if (window.google?.accounts?.id) resolve();
            else reject(new Error('Google script load timeout'));
          }, 8000);
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google script'));
        document.body.appendChild(script);
        googleScriptLoadedRef.current = true;
      });

    const initGoogle = async () => {
      try {
        await ensureGoogleScript();
        if (!window.google?.accounts?.id) {
          throw new Error('Google Identity Services unavailable');
        }

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleSignIn,
          // ux_mode defaults to "popup"; fine for this flow
          // Update the authorization endpoint
          login_uri: '/api/gmail'
        });

        if (googleButtonRef.current) {
          window.google.accounts.id.renderButton(googleButtonRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            width: googleButtonRef.current.offsetWidth,
            text: 'signin_with',
            shape: 'pill',
            logo_alignment: 'left'
          });
        }

        // (optional) show One Tap:
        // window.google.accounts.id.prompt();
      } catch (e) {
        console.error(e);
        setError('Google Sign-In couldn’t be initialized. Please try normal login.');
      }
    };

    initGoogle();

    // re-render button on resize to keep width responsive
    const handleResize = () => {
      if (window.google?.accounts?.id && googleButtonRef.current) {
        googleButtonRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          width: googleButtonRef.current.offsetWidth,
          text: 'signin_with',
          shape: 'pill',
          logo_alignment: 'left'
        });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      // No explicit unload required for GIS popup flow
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Credentials login ----
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      if (data.token) {
        localStorage.setItem('token', data.token);
        navigate('/dashboard');
      } else {
        throw new Error('No token received');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  // ---- Google Sign-In callback ----
  const handleGoogleSignIn = async (googleResponse) => {
    try {
      setIsLoading(true);
      setError('');

      if (!googleResponse?.credential) {
        throw new Error('Google credential missing');
      }

    const res = await fetch(`/api/gmail/auth?credential=${encodeURIComponent(googleResponse.credential)}`, {
  method: 'GET',
  credentials: 'include'
});

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Google sign-in failed');
      }

      localStorage.setItem('token', data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to sign in with Google');
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

      <div className="max-w-5xl w-full flex flex-col md:flex-row overflow-hidden rounded-xl shadow-2xl relative z-10">
        {/* Left: form */}
        <div className="w-full md:w-1/2 bg-white/10 backdrop-blur-lg p-8 space-y-6">
          {/* Branding */}
          <div className="absolute top-6 left-6 flex items-center space-x-2">
            <div className="bg-blue-600 p-2 rounded-lg shadow-lg">
              <FontAwesomeIcon icon={faShieldAlt} className="text-white" />
            </div>
            <span className="text-xl font-bold text-white">EmailShield</span>
          </div>

          {/* Welcome */}
          <div className="text-center pt-16 md:pt-8">
            <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-gray-300">Sign in to your account to continue</p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/20 border-l-4 border-red-500 text-red-100 p-4 rounded">
              <p>{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="space-y-4 rounded-md">
              <div>
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-gray-300 block mb-2"
                >
                  <FontAwesomeIcon icon={faUser} className="mr-2" />
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 text-white placeholder-gray-400 transition-all duration-200"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-gray-300"
                  >
                    <FontAwesomeIcon icon={faLock} className="mr-2" />
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Forgot password?
                  </Link>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 text-white placeholder-gray-400 transition-all duration-200"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-700 bg-white/5 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-300">
                Remember me
              </label>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
            
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900 text-gray-400">Or continue with</span>
            </div>
          </div>

          {/* Google button container (GIS renders into here) */}
          <div className="grid grid-cols-1 gap-3 mt-6">
            <div ref={googleButtonRef} id="googleSignInButton" className="w-full" />
          </div>

          {/* Sign up link */}
          <div className="text-center text-sm text-gray-400 mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="font-medium text-blue-400 hover:text-blue-300">
              Sign up
            </Link>
          </div>
            
          {/* Admin Login Link */}
          <div className="text-center mt-6 pt-4 border-t border-gray-700">
            <Link 
              to="/admin/login" 
              className="text-sm font-medium text-blue-400 hover:text-blue-300 hover:underline"
            >
              Admin Login
            </Link>
          </div>
        </div>

        {/* Right: feature panel */}
        <div className="hidden md:block md:w-1/2 bg-blue-800 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 to-blue-800/80" />
          <div className="relative h-full flex flex-col justify-center p-12 text-white">
            <div className="max-w-xs mx-auto text-center">
              <div className="bg-white/20 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <FontAwesomeIcon icon={faShieldAlt} className="text-3xl text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Advanced Email Protection</h2>
              <p className="text-blue-100 mb-8">
                Secure your communications with our advanced threat detection and prevention
                system.
              </p>
              <div className="space-y-4 text-left">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <FontAwesomeIcon icon={faCheckCircle} className="text-green-400" />
                  </div>
                  <p className="ml-3 text-sm text-blue-100">Real-time threat detection</p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <FontAwesomeIcon icon={faCheckCircle} className="text-green-400" />
                  </div>
                  <p className="ml-3 text-sm text-blue-100">AI-powered analysis</p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <FontAwesomeIcon icon={faCheckCircle} className="text-green-400" />
                  </div>
                  <p className="ml-3 text-sm text-blue-100">Secure email gateway</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div> 
    </div>
  );
};

export default Login;
