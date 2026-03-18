import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUser, 
  faLock, 
  faEnvelope, 
  faUserPlus,
  faEye,
  faEyeSlash,
  faShieldAlt,
  faFingerprint,
  faShield,
  faChartLine
} from '@fortawesome/free-solid-svg-icons';
import { faGoogle } from '@fortawesome/free-brands-svg-icons';
import '../assets/css/auth.css';

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      // Redirect to login or dashboard after successful registration
      navigate('/login', { state: { registrationSuccess: true } });
    } catch (err) {
      setError(err.message || 'An error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      

      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-white/50 z-50 flex items-center justify-center">
          <div className="p-6 rounded-lg flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-600 mb-4"></div>
            <p className="text-gray-900">Creating your account...</p>
          </div>
        </div>
      )}

      <div className="max-w-5xl w-full flex flex-col md:flex-row overflow-hidden border border-gray-200 shadow-sm bg-white">
        {/* Left side: Signup form */}
        <div className="w-full md:w-1/2 p-8 space-y-6">
          <div className="flex items-center space-x-2 mb-8">
            <div className="bg-gray-900 p-2 rounded">
              <FontAwesomeIcon icon={faShieldAlt} className="text-white" />
            </div>
            <span className="text-gray-900 font-bold text-sm">CHD Police</span>
          </div>
          
          <div>
            <div className="text-center text-gray-900 mb-6">
              <h2 className="text-3xl font-bold">Create Account</h2>
              <p className="mt-2 text-sm text-gray-500">Join our phishing detection platform</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {error && (
              <div className="text-red-600 text-center text-sm p-3 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="text-sm font-medium text-gray-700 block mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your full name"
                  required
                  className="w-full px-4 py-2 rounded-md bg-white text-gray-900 border border-gray-300 focus:border-gray-500 focus:outline-none"
                  autoComplete="name"
                />
              </div>

              <div>
                <label htmlFor="email" className="text-sm font-medium text-gray-700 block mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email"
                  required
                  className="w-full px-4 py-2 rounded-md bg-white text-gray-900 border border-gray-300 focus:border-gray-500 focus:outline-none"
                  autoComplete="email"
                />
              </div>

              <div>
                <label htmlFor="password" className="text-sm font-medium text-gray-700 block mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Password"
                    required
                    className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-500 transition duration-200"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                  </button>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-black focus:outline-none transition duration-300 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>

            <div className="text-center text-sm mt-6">
              <p className="text-gray-500">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-gray-900 hover:underline transition duration-200">
                  Sign in instead
                </Link>
              </p>
            </div>
          </form>
        </div>
        
        {/* Right side: Structural Placeholder */}
        <div className="hidden md:flex md:w-1/2 bg-gray-50 border-l border-gray-200 p-10 flex-col justify-center">
          <h3 className="text-gray-900 text-2xl font-bold mb-6 text-center">Join Our Phishing Protection Platform</h3>
          <div className="space-y-6">
             <div className="p-4 border border-dashed border-gray-300 rounded-lg">
                <h4 className="text-gray-800 font-semibold mb-1">Secure Account</h4>
                <p className="text-gray-500 text-sm">Your data is encrypted and protected at all times</p>
             </div>
             
             <div className="p-4 border border-dashed border-gray-300 rounded-lg">
                <h4 className="text-gray-800 font-semibold mb-1">Real-time Protection</h4>
                <p className="text-gray-500 text-sm">Get alerts before opening dangerous emails</p>
             </div>
             
             <div className="p-4 border border-dashed border-gray-300 rounded-lg">
                <h4 className="text-gray-800 font-semibold mb-1">Detailed Analytics</h4>
                <p className="text-gray-500 text-sm">Track and analyze email security threats</p>
             </div>
          </div>
          
          <div className="mt-12 text-center text-xs text-gray-400">
             <p>Protected by advanced encryption • Secure connection</p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Signup;
