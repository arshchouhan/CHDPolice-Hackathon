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
        borderColor: '#8a63f4',
        tension: 0.4,
        pointBackgroundColor: '#f4f1f9',
        pointBorderColor: '#8a63f4',
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
      y: { grid: { color: 'rgba(244, 241, 249, 0.1)', drawBorder: false }, ticks: { color: '#f4f1f9' } },
      x: { grid: { display: false }, ticks: { color: '#f4f1f9' } },
    },
  };

  return (
    <div className="min-h-screen bg-[#09050d] text-[#f4f1f9]">
      {/* Navigation Bar */}
      <nav className="bg-[#171719] border-b border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between h-16 items-center">
          <div className="flex items-center">
            <span className="text-2xl font-bold text-[#ffff]">TrustMail</span>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-2">
              {navItems.map(item => (
                <Link key={item.path} to={item.path} className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${window.location.pathname === item.path ? 'bg-[#171719] text-[#f4f1f9] shadow-lg shadow-[#ffff]/20' : 'text-[#f4f1f9]/80 hover:bg-[#ffff]/10 hover:text-[#ffff]'}`}>
                  {item.icon}
                  <span className="ml-2">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden sm:flex sm:items-center space-x-4">
            <div className="relative w-64">
              <FaSearch className="absolute left-3 top-2.5 text-white h-4 w-4" />
              <input
                type="text"
                placeholder="Search threats, logs, devices..."
                className="w-full pl-10 pr-3 py-2 border border-white rounded-lg bg-[#262529] text-white placeholder-white focus:outline-none focus:ring-2 focus:ring-[#ffff]"
              />
            </div>

            <button 
              onClick={handleConnectGmail}
              disabled={isConnecting || gmailStatus === 'pending'}
              className={`flex items-center px-4 py-2 ${isConnecting || gmailStatus === 'pending' ? 'bg-gray-500/50 text-white/70 cursor-not-allowed' : 'bg-white/70 text-[#2f2b3a] hover:bg-white/90'} rounded-lg text-sm font-medium transition-all`}
            >
              {isConnecting || gmailStatus === 'pending' ? 'Wait' : (<><FaGoogle className="w-4 h-4 mr-2" /> Connect Gmail</>)}
            </button>

            <button className="p-2 rounded-full text-[#ffff] hover:bg-[#ffff]/10 relative transition-all">
              <FaBell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-[#ffff] ring-2 ring-[#2f2b3a]"></span>
            </button>

            {/* Profile Dropdown */}
            <div className="relative ml-2">
              <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center text-sm rounded-full focus:outline-none">
                <div className="h-9 w-9 rounded-full bg-[#7f5ce4] flex items-center justify-center text-[#f4f1f9] font-medium">A</div>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-lg shadow-xl bg-[#171719] border border-[#8a63f4]/20 py-1 z-50">
                  <div className="px-4 py-3 border-b border-[#8a63f4]/20">
                    <p className="text-sm text-[#f4f1f9]">{user.name}</p>
                    <p className="text-xs text-[#f4f1f9]/60 truncate">{user.email}</p>
                  </div>
                  <a href="#" className="block px-4 py-2.5 text-sm text-[#f4f1f9]/80 hover:bg-[#ffff]/20">Your Profile</a>
                  <a href="#" className="block px-4 py-2.5 text-sm text-[#f4f1f9]/80 hover:bg-[#ffff]/20">Settings</a>
                  <div className="border-t border-[#8a63f4]/20 my-1"></div>
                  <SignOutButton variant="desktop" onSignOut={handleSignOut} />
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="-mr-2 flex sm:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <FaBars className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="sm:hidden">
            <div className="pt-2 pb-3 space-y-1">
              {navItems.map(item => (
                <Link key={item.path} to={item.path} className="block pl-3 pr-4 py-2 border-l-4 text-base font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700">
                  {item.icon}{item.label}
                </Link>
              ))}
            </div>
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="flex items-center px-4">
                <FaUserCircle className="h-10 w-10 text-gray-400" />
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-200">{user.name}</div>
                  <div className="text-sm font-medium text-gray-400">{user.email}</div>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <a href="#" className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100">Your Profile</a>
                <a href="#" className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100">Settings</a>
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
              <div className="bg-[#28282b] rounded-2xl p-6 border border-[#8a63f4]/20">
                <div>
                  <h1 className="text-2xl font-bold text-[#ffff]">Welcome back, {user.name}</h1>
                  {gmailStatus === 'pending' && (
                    <p className="text-sm text-yellow-400 mt-1">
                      Request sent to server. Please wait for confirmation.
                    </p>
                  )}
                </div>
                <p className="text-[#ffff]/40 mt-1">Here's what's happening with your security today</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Active Devices Card */}
                <div className="bg-[#28282b] rounded-2xl p-6 border border-[#8a63f4]/20 hover:border-[#8a63f4]/40 transition-all group">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#ffff]">Active Devices</p>
                      <div className="mt-2">
                        <h3 className="text-3xl font-bold text-[#ffff]">6,300</h3>
                        <p className="text-xs text-[#8a63f4] mt-1">+12% from last week</p>
                      </div>
                    </div>
                    <div className="h-16 w-16 rounded-full bg-[#8a63f4]/10 flex items-center justify-center group-hover:bg-[#8a63f4]/20 transition-colors">
                      <FaDesktop className="h-6 w-6 text-[#8a63f4]" />
                    </div>
                  </div>
                </div>

                {/* Risk Score Card */}
                <div className="bg-[#28282b] rounded-2xl p-6 border border-[#8a63f4]/10 hover:border-[#8a63f4]/40 transition-all group">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#ffff]">Cyber Risk Score</p>
                      <div className="mt-2">
                        <div className="flex items-end">
                          <h3 className="text-3xl font-bold text-[#f4f1f9]">{riskScore}</h3>
                          <span className="text-sm text-[#8a63f4] ml-2 mb-1">Good</span>
                        </div>
                        <div className="w-full bg-[#f4f1f9]/10 rounded-full h-2 mt-2">
                          <div 
                            className="bg-[#8a63f4] h-2 rounded-full" 
                            style={{ width: `${riskScore}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    <div className="h-16 w-16 rounded-full bg-[#8a63f4]/10 flex items-center justify-center group-hover:bg-[#8a63f4]/20 transition-colors">
                      <FaShieldAlt className="h-6 w-6 text-[#8a63f4]" />
                    </div>
                  </div>
                </div>

                {/* Risk Trends Card */}
                <div className="md:col-span-2 bg-[#28282b] rounded-2xl p-6 border border-[#8a63f4]/10 hover:border-[#8a63f4]/40 transition-all">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-[#ffff]">Risk Trends</h3>
                    <div className="flex space-x-2 bg-[#f4f1f9]/10 rounded-lg p-1">
                      {['week', 'month', 'year'].map((period) => (
                        <button
                          key={period}
                          onClick={() => setActiveTab(period)}
                          className={`px-3 py-1 text-xs rounded-md transition-colors ${
                            activeTab === period
                              ? 'bg-[#8a63f4] text-[#f4f1f9]'
                              : 'text-[#f4f1f9]/60 hover:text-[#f4f1f9]'
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
              <div className="bg-[#171719]/40 rounded-2xl p-6 border border-[#8a63f4]/10">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-[#ffff]">Data at Risk</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#28282b] text-[#ffff] text-xs font-medium">
                    {dataAtRisk.length} Alerts
                  </span>
                </div>
                
                <div className="space-y-4">
                  {dataAtRisk.map((item) => (
                    <div 
                      key={item.id} 
                      className="group bg-[#28282b] hover:bg-[#ffff]/15 border border-black hover:border-[#ffff] rounded-xl p-4 transition-all cursor-pointer"
                    >
                      <div className="flex items-start">
                        <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                          item.risk === 'High' ? 'bg-[#8a63f4]/30' : 
                          item.risk === 'Critical' ? 'bg-[#8a63f4]/50' : 'bg-[#8a63f4]/20'
                        }`}>
                          {item.icon}
                        </div>
                        <div className="ml-3 flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-[#f4f1f9]">{item.title}</h4>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              item.risk === 'High' ? 'bg-[#8a63f4]/30 text-[#f4f1f9]' : 
                              item.risk === 'Critical' ? 'bg-[#8a63f4]/50 text-[#f4f1f9]' : 'bg-[#8a63f4]/20 text-[#f4f1f9]'
                            }`}>
                              {item.risk} Risk
                            </span>
                          </div>
                          <div className="mt-1 flex items-center text-xs text-[#f4f1f9]/60">
                            <span className="flex items-center">
                              <FaEnvelope className="mr-1" /> {item.emails} emails
                            </span>
                            <span className="mx-2 text-gray-600">•</span>
                            <span className="flex items-center">
                              <FaCreditCard className="mr-1" /> {item.creditCards} cards
                            </span>
                          </div>
                          <div className="mt-2 flex items-center text-xs text-[#f4f1f9]/40">
                            <FaClock className="mr-1" /> {item.timeAgo}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4">
                  <button className="w-full py-2 px-4 border border-dashed border-[#8a63f4]/30 hover:border-[#8a63f4]/50 text-[#f4f1f9]/60 hover:text-[#8a63f4] rounded-lg text-sm font-medium transition-colors">
                    View all threats
                  </button>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="bg-[#171719]/50 rounded-2xl p-6 border border-[#8a63f4]/20">
                <h3 className="text-lg font-semibold text-[#f4f1f9] mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button className="w-full flex items-center justify-between px-4 py-3 bg-[#28282b] hover:bg-[#ffff]/15  border-[#8a63f4]/30 rounded-lg transition-colors group">
                    <div className="flex items-center">
                      <div className="p-2 rounded-lg bg-[#28282b] mr-3 group-hover:bg-[#ffff]/15">
                        <FaShieldAlt className="h-5 w-5 text-[#ffff]" />
                      </div>
                      <span className="text-sm font-medium text-[#ffff]">Run Security Scan</span>
                    </div>
                    <FaChevronDown className="h-3.5 w-3.5 text-[#ffff]" />
                  </button>
                  
                  <button className="w-full flex items-center justify-between px-4 py-3 bg-[#28282b] hover:bg-[#ffff]/15 border border-[#8a63f4]/20 rounded-lg transition-colors group">
                    <div className="flex items-center">
                      <div className="p-2 rounded-lg bg-[#28282b] mr-3 group-hover:bg-[#ffff]/15">
                        <FaCloud className="h-5 w-5 text-[#ffff]" />
                      </div>
                      <span className="text-sm font-medium text-[#ffff]">Backup Data</span>
                    </div>
                    <FaChevronDown className="h-3.5 w-3.5 text-[#ffff]" />
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