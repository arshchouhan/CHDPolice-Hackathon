import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { 
  FaSearch, 
  FaBell, 
  FaUserCircle, 
  FaChevronDown,
  FaBars,
  FaHome,
  FaEnvelope,
  FaShieldAlt,
  FaCog,
  FaDesktop,
  FaChartLine,
  FaDatabase,
  FaCreditCard,
  FaClock,
  FaCloud,
  FaGoogle
} from 'react-icons/fa';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import '../../assets/css/user-dashboard.css';
import { toast } from 'react-toastify';
import SignOutButton from '../../components/common/SignOutButton';
import { useAuth } from '../../context/AuthContext';

const UserDashboard = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [riskScore, setRiskScore] = useState(72);
  const [activeTab, setActiveTab] = useState('week');
  const [gmailStatus, setGmailStatus] = useState('disconnected');
  const [isConnecting, setIsConnecting] = useState(false);
  const navigate = useNavigate();
  const { user, loading, authChecked } = useAuth();
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Redirect to login if not authenticated and auth check is complete
  useEffect(() => {
    if (authChecked && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, authChecked, navigate]);

  // Show loading state while checking auth
  if (loading || !authChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ✅ Check Gmail connection (only when authenticated)
  useEffect(() => {
    if (!user) return;

    const checkGmailStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${API_URL}/api/user/connection-status`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            setIsAuthenticated(false);
            localStorage.removeItem('token');
            navigate('/login', { replace: true });
          }
          return;
        }

        const data = await response.json();
        if (data.success) {
          setGmailStatus(data.status || 'disconnected');
          if (data.user) {
            setUser(prev => ({
              ...prev,
              name: data.user.name || prev.name,
              email: data.user.email || prev.email
            }));
          }
        } else {
          toast.error(data.message || 'Failed to check Gmail status');
        }
      } catch (error) {
        console.error('Gmail status check error:', error);
      }
    };

    checkGmailStatus();
    const intervalId = setInterval(checkGmailStatus, 10000);
    return () => clearInterval(intervalId);
  }, [API_URL, navigate, user]);

  // ✅ Handle Gmail connection
  const handleConnectGmail = async () => {
    try {
      setIsConnecting(true);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication required. Please log in again.');

      const response = await fetch(`${API_URL}/api/user/connect`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to initiate Gmail connection');
      }

      const data = await response.json();
      if (data.success) {
        setGmailStatus('pending');
        toast.info('Gmail connection request sent.');
      } else throw new Error(data.message || 'Failed to connect Gmail');
    } catch (error) {
      toast.error(error.message || 'Failed to connect Gmail');
      setGmailStatus('disconnected');
    } finally {
      setIsConnecting(false);
    }
  };

  // Get the logout function from useAuth at the component level
  const { logout } = useAuth();

  // ✅ Handle sign out (prevents loop)
  const handleSignOut = async () => {
    try {
      const result = await logout();
      if (result && !result.success) {
        throw new Error(result.error || 'Failed to sign out');
      }
      // Only navigate after successful logout
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error(error.message || 'Failed to sign out');
      // Still navigate to login even if there was an error, but show the error
      navigate('/login', { replace: true });
    }
  };

  const navItems = [
    { path: '/dashboard', icon: <FaHome className="mr-2" />, label: 'Dashboard' },
    { path: '/dashboard/emails', icon: <FaEnvelope className="mr-2" />, label: 'Threats' },
    { path: '/dashboard/security', icon: <FaShieldAlt className="mr-2" />, label: 'Security' },
    { path: '/dashboard/settings', icon: <FaCog className="mr-2" />, label: 'Settings' },
  ];

  const dataAtRisk = [
    { id: 1, title: 'cv-bucket', icon: <FaDatabase className="text-orange-400" />, emails: 1243, creditCards: 87, timeAgo: '1 day ago', risk: 'High' },
    { id: 2, title: 'user-data', icon: <FaUserCircle className="text-blue-400" />, emails: 876, creditCards: 23, timeAgo: '2 days ago', risk: 'Medium' },
    { id: 3, title: 'financial-records', icon: <FaCreditCard className="text-green-400" />, emails: 342, creditCards: 156, timeAgo: '3 days ago', risk: 'Critical' },
  ];

  const riskTrendsData = {
    labels: ['Nov 07', 'Nov 08', 'Nov 09', 'Nov 10', 'Nov 11', 'Nov 12', 'Nov 13'],
    datasets: [
      {
        label: 'Risk Level',
        data: [65, 59, 80, 81, 56, 72, 68],
        fill: false,
        borderColor: '#1f2937', // gray-800
        tension: 0.4,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#1f2937',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { grid: { color: 'rgba(0, 0, 0, 0.05)', drawBorder: false }, ticks: { color: '#6b7280' } }, // gray-500
      x: { grid: { display: false }, ticks: { color: '#6b7280' } },
    },
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between h-16 items-center">
          <div className="flex items-center">
            <span className="text-2xl font-bold text-gray-900">TrustMail</span>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-2">
              {navItems.map(item => (
                <Link key={item.path} to={item.path} className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${window.location.pathname === item.path ? 'bg-gray-100 text-gray-900 shadow-sm border border-gray-300' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                  {item.icon}
                  <span className="ml-2">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden sm:flex sm:items-center space-x-4">
            <div className="relative w-64">
              <FaSearch className="absolute left-3 top-2.5 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search threats, logs..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
              />
            </div>

            <button 
              onClick={handleConnectGmail}
              disabled={isConnecting || gmailStatus === 'pending'}
              className={`flex items-center px-4 py-2 ${isConnecting || gmailStatus === 'pending' ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-black'} rounded-md text-sm font-medium transition-all border border-transparent`}
            >
              {isConnecting || gmailStatus === 'pending' ? 'Wait' : (<><FaGoogle className="w-4 h-4 mr-2" /> Connect Gmail</>)}
            </button>

            <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100 relative transition-all border border-gray-200">
              <FaBell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>
            </button>

            {/* Profile Dropdown */}
            <div className="relative ml-2">
              <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center text-sm rounded-full focus:outline-none border border-gray-300">
                <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-medium">A</div>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white border border-gray-200 py-1 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  <a href="#" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">Your Profile</a>
                  <a href="#" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">Settings</a>
                  <div className="border-t border-gray-100 my-1"></div>
                  <SignOutButton variant="desktop" onSignOut={handleSignOut} />
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="-mr-2 flex sm:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 border border-gray-200"
            >
              <FaBars className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="sm:hidden border-t border-gray-100 bg-white">
            <div className="pt-2 pb-3 space-y-1">
              {navItems.map(item => (
                <Link key={item.path} to={item.path} className="flex items-center pl-3 pr-4 py-3 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300">
                  {item.icon}<span className="ml-3">{item.label}</span>
                </Link>
              ))}
            </div>
            <div className="pt-4 pb-3 border-t border-gray-100">
              <div className="flex items-center px-4">
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-medium mr-3">A</div>
                <div>
                  <div className="text-base font-medium text-gray-900">{user.name}</div>
                  <div className="text-sm font-medium text-gray-500">{user.email}</div>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <a href="#" className="block px-4 py-2 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50">Your Profile</a>
                <a href="#" className="block px-4 py-2 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50">Settings</a>
                <SignOutButton variant="mobile" onSignOut={handleSignOut} />
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="min-h-[calc(100vh-4rem)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Welcome Header */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user.name}</h1>
                  {gmailStatus === 'pending' && (
                    <p className="text-sm text-orange-600 mt-1">
                      Request sent. Please wait for confirmation.
                    </p>
                  )}
                </div>
                <p className="text-gray-500 mt-1">Here's what's happening with your security today</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Active Devices Card */}
                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:border-gray-400 transition-all group">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Active Devices</p>
                      <div className="mt-2">
                        <h3 className="text-3xl font-bold text-gray-900">6,300</h3>
                        <p className="text-xs text-gray-400 mt-1">+12% from last week</p>
                      </div>
                    </div>
                    <div className="h-16 w-16 rounded-md bg-gray-50 flex items-center justify-center border border-gray-200 group-hover:bg-gray-100 transition-colors">
                      <FaDesktop className="h-6 w-6 text-gray-600" />
                    </div>
                  </div>
                </div>

                {/* Risk Score Card */}
                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:border-gray-400 transition-all group">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Cyber Risk Score</p>
                      <div className="mt-2">
                        <div className="flex items-end">
                          <h3 className="text-3xl font-bold text-gray-900">{riskScore}</h3>
                          <span className="text-sm text-gray-400 ml-2 mb-1">Good</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
                          <div 
                            className="bg-gray-900 h-2 rounded-full" 
                            style={{ width: `${riskScore}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    <div className="h-16 w-16 rounded-md bg-gray-50 flex items-center justify-center border border-gray-200 group-hover:bg-gray-100 transition-colors">
                      <FaShieldAlt className="h-6 w-6 text-gray-600" />
                    </div>
                  </div>
                </div>

                {/* Risk Trends Card */}
                <div className="md:col-span-2 bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Risk Trends</h3>
                    <div className="flex space-x-2 bg-gray-100 rounded-lg p-1 border border-gray-200">
                      {['week', 'month', 'year'].map((period) => (
                        <button
                          key={period}
                          onClick={() => setActiveTab(period)}
                          className={`px-3 py-1 text-xs rounded-md transition-colors ${
                            activeTab === period
                              ? 'bg-white text-gray-900 shadow-sm border border-gray-200 font-semibold'
                              : 'text-gray-500 hover:text-gray-900'
                          }`}
                        >
                          {period.charAt(0).toUpperCase() + period.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-64">
                    <Line data={riskTrendsData} options={chartOptions} />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Data at Risk */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Data at Risk</h3>
                  <span className="px-2.5 py-0.5 rounded border border-gray-300 bg-gray-50 text-gray-600 text-xs font-medium">
                    {dataAtRisk.length} Alerts
                  </span>
                </div>
                
                <div className="space-y-4">
                  {dataAtRisk.map((item) => (
                    <div 
                      key={item.id} 
                      className="group bg-white hover:bg-gray-50 border border-gray-200 rounded-lg p-4 transition-all cursor-pointer"
                    >
                      <div className="flex items-start">
                        <div className={`flex-shrink-0 h-10 w-10 rounded-md flex items-center justify-center border border-gray-200 bg-gray-50 shadow-sm`}>
                          {item.icon}
                        </div>
                        <div className="ml-3 flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-gray-900">{item.title}</h4>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${
                              item.risk === 'Critical' ? 'border-red-200 bg-red-50 text-red-600' : 'border-gray-200 bg-gray-200 text-gray-600'
                            }`}>
                              {item.risk}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center text-xs text-gray-500">
                            <span className="flex items-center">
                              <FaEnvelope className="mr-1" /> {item.emails}
                            </span>
                            <span className="mx-2 text-gray-300">•</span>
                            <span className="flex items-center">
                              <FaCreditCard className="mr-1" /> {item.creditCards}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center text-[10px] text-gray-400 uppercase font-medium">
                            <FaClock className="mr-1" /> {item.timeAgo}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4">
                  <button className="w-full py-2 px-4 border border-dashed border-gray-300 hover:border-gray-900 text-gray-500 hover:text-gray-900 rounded-lg text-sm font-medium transition-colors">
                    View all threats
                  </button>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors group">
                    <div className="flex items-center">
                      <div className="p-2 rounded-md bg-gray-50 border border-gray-100 mr-3">
                        <FaShieldAlt className="h-5 w-5 text-gray-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">Run Security Scan</span>
                    </div>
                    <FaChevronDown className="h-3.5 w-3.5 text-gray-400" />
                  </button>
                  
                  <button className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors group">
                    <div className="flex items-center">
                      <div className="p-2 rounded-md bg-gray-50 border border-gray-100 mr-3">
                        <FaCloud className="h-5 w-5 text-gray-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">Backup Data</span>
                    </div>
                    <FaChevronDown className="h-3.5 w-3.5 text-gray-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserDashboard;