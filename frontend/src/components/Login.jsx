import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faLock, faShieldAlt, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import '../assets/css/login-styles.css';

const GOOGLE_CLIENT_ID =
  '317162009302-294m6fsmrlqfa30q091rnkmo69uos1ba.apps.googleusercontent.com';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const googleButtonRef = useRef(null);
  const googleScriptLoadedRef = useRef(false);

  // If user already has a token, verify and redirect
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const verifyToken = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/auth/verify-token', {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated) navigate('/dashboard', { replace: true });
        }
      } catch (err) {
        console.error('Token verification failed:', err);
        localStorage.removeItem('token');
      }
    };

    verifyToken();
  }, [navigate]);

  // Load Google script once and render the button
  useEffect(() => {
    const ensureGoogleScript = () =>
      new Promise((resolve, reject) => {
        if (window.google?.accounts?.id) {
          resolve();
          return;
        }
        if (googleScriptLoadedRef.current) {
          const check = setInterval(() => {
            if (window.google?.accounts?.id) {
              clearInterval(check);
              resolve();
            }
          }, 50);
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
        if (!window.google?.accounts?.id) throw new Error('Google Identity Services unavailable');

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleSignIn,
          login_uri: '/api/gmail',
        });

        if (googleButtonRef.current) {
          googleButtonRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleButtonRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            width: googleButtonRef.current.offsetWidth || 250,
            text: 'signin_with',
            shape: 'pill',
            logo_alignment: 'left',
          });
        }
      } catch (e) {
        console.error(e);
        setError('Google Sign-In couldn’t be initialized. Please try normal login.');
      }
    };

    initGoogle();

    const handleResize = () => {
      if (window.google?.accounts?.id && googleButtonRef.current) {
        googleButtonRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          width: googleButtonRef.current.offsetWidth || 250,
          text: 'signin_with',
          shape: 'pill',
          logo_alignment: 'left',
        });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Credentials login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Login failed');

      if (!data.token) throw new Error('No token received');

      localStorage.setItem('token', data.token);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  // Google Sign-In callback
  const handleGoogleSignIn = async (googleResponse) => {
    try {
      setIsLoading(true);
      setError('');

      if (!googleResponse?.credential) throw new Error('Google credential missing');

      const res = await fetch(
        `/api/gmail/auth?credential=${encodeURIComponent(googleResponse.credential)}`,
        { method: 'GET', credentials: 'include' }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Google sign-in failed');

      localStorage.setItem('token', data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to sign in with Google');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-grid">
        {/* Left side - Login Form */}
        <div className="login-card">
          {/* Branding */}
          <div className="text-center mb-8">
            <div className="login-icon-container">
              <FontAwesomeIcon icon={faShieldAlt} className="login-brand-icon" />
            </div>
            <h1 className="login-title">Welcome Back</h1>
            <p className="login-subtitle">Sign in to your account to continue</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-message">
              <p>{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email" className="login-label">
                <FontAwesomeIcon icon={faUser} className="mr-2" />
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="login-input"
                placeholder="Enter your email"
                required
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="login-label">
                <FontAwesomeIcon icon={faLock} className="mr-2" />
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input"
                placeholder="Enter your password"
                required
                disabled={isLoading}
              />
            </div>

            <div className="form-options">
              <div className="remember-me">
                <input
                  type="checkbox"
                  id="remember"
                  className="login-checkbox"
                />
                <label htmlFor="remember" className="remember-label">
                  Remember me
                </label>
              </div>
              <Link 
                to="/forgot-password" 
                className="forgot-password"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="login-btn"
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="divider">
            <span>OR</span>
          </div>

          {/* Google Sign-In Button */}
          <div className="google-signin-container">
            <div ref={googleButtonRef} className="google-button"></div>
          </div>

          <p className="signup-link">
            Don't have an account?{' '}
            <Link to="/signup" className="signup-link-text">
              Sign up
            </Link>
          </p>

          {/* Admin Login Link */}
          <div className="mt-4 text-center">
            <Link 
              to="/admin/login" 
              className="text-sm text-muted hover:text-accent transition-colors"
            >
              Admin Login
            </Link>
          </div>
        </div>

        {/* Right side - Features */}
        <div className="hidden md:block bg-gradient-to-br from-primary-10 to-primary-5 rounded-2xl p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-20 to-transparent opacity-30"></div>
          <div className="relative z-10 h-full flex flex-col justify-center">
            <div className="max-w-xs mx-auto text-center">
              <div className="w-20 h-20 bg-primary-20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <FontAwesomeIcon icon={faShieldAlt} className="text-3xl text-accent" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Advanced Email Protection</h2>
              <p className="text-muted mb-8">
                Secure your communications with our advanced threat detection and prevention system.
              </p>
              <ul className="space-y-4 text-left">
                <li className="flex items-start">
                  <FontAwesomeIcon 
                    icon={faCheckCircle} 
                    className="text-green-400 mt-1 mr-3 flex-shrink-0" 
                  />
                  <span className="text-muted">Real-time threat detection</span>
                </li>
                <li className="flex items-start">
                  <FontAwesomeIcon 
                    icon={faCheckCircle} 
                    className="text-green-400 mt-1 mr-3 flex-shrink-0" 
                  />
                  <span className="text-muted">AI-powered analysis</span>
                </li>
                <li className="flex items-start">
                  <FontAwesomeIcon 
                    icon={faCheckCircle} 
                    className="text-green-400 mt-1 mr-3 flex-shrink-0" 
                  />
                  <span className="text-muted">Secure email gateway</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
