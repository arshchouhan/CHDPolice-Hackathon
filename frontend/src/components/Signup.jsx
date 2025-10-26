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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-900">
      {/* Background overlay with subtle pattern */}
      <div className="fixed inset-0 z-0 opacity-20" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1544197150-b99a580bb7a8?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80)', backgroundSize: 'cover' }}></div>
      {/* Blue overlay for depth */}
      <div className="fixed inset-0 z-0 bg-blue-900 opacity-10"></div>
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white/10 backdrop-blur-lg p-6 rounded-lg flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-400 mb-4"></div>
            <p className="text-white">Creating your account...</p>
          </div>
        </div>
      )}

      <div className="max-w-5xl w-full flex flex-col md:flex-row overflow-hidden rounded-xl shadow-2xl relative z-10">
        {/* Left side: Signup form */}
        <div className="w-full md:w-1/2 bg-white/10 backdrop-blur-lg p-8 space-y-6">
          {/* Logo and branding in top corner */}
          <div className="absolute top-6 left-6 flex items-center space-x-2">
            <div className="bg-blue-600 p-2 rounded-lg shadow-lg">
              <FontAwesomeIcon icon={faShieldAlt} className="text-white" />
            </div>
            <span className="text-white font-bold text-sm">CHD Police</span>
          </div>
          
          <div className="mt-10">
            <div className="text-center text-white mb-6">
              <FontAwesomeIcon icon={faUserPlus} className="text-4xl text-blue-400 mb-4" />
              <h2 className="text-3xl font-bold">Create Account</h2>
              <p className="mt-2 text-sm text-gray-300">Join our phishing detection platform</p>
            </div>
            
            <div className="flex justify-center space-x-4 mb-6">
              <div className="text-center">
                <FontAwesomeIcon icon={faEnvelope} className="text-2xl text-blue-400 mb-2" />
                <p className="text-xs text-gray-400">Email<br />Protection</p>
              </div>
              <div className="text-center">
                <FontAwesomeIcon icon={faShield} className="text-2xl text-blue-400 mb-2" />
                <p className="text-xs text-gray-400">Threat<br />Detection</p>
              </div>
              <div className="text-center">
                <FontAwesomeIcon icon={faLock} className="text-2xl text-blue-400 mb-2" />
                <p className="text-xs text-gray-400">Secure<br />Access</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {error && (
              <div className="text-red-400 text-center text-sm p-3 bg-red-900/30 rounded-md">
                {error}
              </div>
            )}
            
            <div className="space-y-4 rounded-md">
              <div>
                <label htmlFor="name" className="text-sm font-medium text-gray-300 block mb-2">
                  <FontAwesomeIcon icon={faUser} className="mr-2" />
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
                  className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                  autoComplete="name"
                />
              </div>

              <div>
                <label htmlFor="email" className="text-sm font-medium text-gray-300 block mb-2">
                  <FontAwesomeIcon icon={faEnvelope} className="mr-2" />
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
                  className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                  autoComplete="email"
                />
              </div>

              <div>
                <label htmlFor="password" className="text-sm font-medium text-gray-300 block mb-2">
                  <FontAwesomeIcon icon={faLock} className="mr-2" />
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
                    className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                    aria-label={showPassword ? "Hide password" : "Show password"}
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
                className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none transition duration-300 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  <FontAwesomeIcon icon={faUserPlus} className="text-blue-400 group-hover:text-blue-300" />
                </span>
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>

            <div className="text-center text-sm mt-6">
              <p className="text-gray-400">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-blue-400 hover:text-blue-300 transition duration-200">
                  Sign in instead
                </Link>
              </p>
            </div>
          </form>
        </div>
        
        {/* Right side: Email Protection Imagery */}
        <div className="hidden md:block md:w-1/2 bg-blue-800 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-800/90 to-blue-900/90 z-10"></div>
          <img 
            src="https://images.unsplash.com/photo-1614064641938-3bbee52942c7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
            alt="Email Security" 
            className="absolute inset-0 h-full w-full object-cover opacity-70"
            loading="lazy"
          />
          
          <div className="relative z-20 p-10 h-full flex flex-col justify-center">
            <h3 className="text-white text-2xl font-bold mb-6">Join Our Phishing Protection Platform</h3>
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="bg-blue-500 p-2 rounded-full">
                  <FontAwesomeIcon icon={faFingerprint} className="text-white" />
                </div>
                <div>
                  <h4 className="text-white font-semibold">Secure Account</h4>
                  <p className="text-blue-200 text-sm">Your data is encrypted and protected at all times</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="bg-blue-500 p-2 rounded-full">
                  <FontAwesomeIcon icon={faShield} className="text-white" />
                </div>
                <div>
                  <h4 className="text-white font-semibold">Real-time Protection</h4>
                  <p className="text-blue-200 text-sm">Get alerts before opening dangerous emails</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="bg-blue-500 p-2 rounded-full">
                  <FontAwesomeIcon icon={faChartLine} className="text-white" />
                </div>
                <div>
                  <h4 className="text-white font-semibold">Detailed Analytics</h4>
                  <p className="text-blue-200 text-sm">Track and analyze email security threats</p>
                </div>
              </div>
            </div>
            
            <div className="mt-auto">
              <p className="text-blue-200 text-sm italic">"Create an account today and take control of your email security"</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
