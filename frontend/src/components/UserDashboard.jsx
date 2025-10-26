import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const UserDashboard = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    emailsScanned: 0,
    threatsDetected: 0,
    securityScore: 0,
    recentActivity: [],
    username: 'User'
  });
  const [emailContent, setEmailContent] = useState('');

  // Check authentication on component mount
  useEffect(() => {
    checkAuth();
    fetchDashboardData();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    // Additional auth verification can be added here
  };

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const endpoint = 'http://localhost:3000/api/dashboard/stats';
      console.log('Fetching dashboard data from:', endpoint);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        const errorMsg = responseData.message || 'Failed to fetch dashboard data';
        console.error('Server error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMsg
        });
        throw new Error(errorMsg);
      }
      
      console.log('Dashboard data received:', responseData);
      setDashboardData(prev => ({
        ...prev,
        ...responseData,
        // Use responseData.name (from backend) and fallback to email or 'User'
        username: responseData.name || responseData.email?.split('@')[0] || 'User'
      }));
    } catch (error) {
      console.error('Error in fetchDashboardData:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      toast.error(`Error: ${error.message || 'Failed to load dashboard data'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleEmailScan = async (e) => {
    e.preventDefault();
    if (!emailContent.trim()) {
      toast.warning('Please enter email content to scan');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/email/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        credentials: 'include',
        body: JSON.stringify({ content: emailContent })
      });

      if (!response.ok) throw new Error('Scan failed');
      
      const result = await response.json();
      toast.success('Email scanned successfully');
      // Update dashboard data after successful scan
      fetchDashboardData();
    } catch (error) {
      console.error('Error scanning email:', error);
      toast.error('Failed to scan email');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl shadow-xl flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 min-h-screen text-white">
      {/* Navigation Bar */}
      <nav className="bg-gray-800/80 backdrop-blur-sm shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <i className="fas fa-shield-alt text-blue-400 mr-2"></i>
                <span className="text-xl font-bold">Email Security</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <button className="text-gray-300 hover:text-white p-2 rounded-full hover:bg-gray-700 transition duration-150">
                  <i className="fas fa-bell"></i>
                  <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500"></span>
                </button>
              </div>
              <div>
                <span className="text-sm text-gray-300">
                  Welcome, <span className="font-semibold text-blue-400">{dashboardData.username}</span>
                </span>
              </div>
              <button 
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition duration-150 ease-in-out"
              >
                <i className="fas fa-sign-out-alt mr-2"></i>Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-xl p-4">
              <div className="space-y-4">
                <div className="border-b border-gray-700 pb-4">
                  <h3 className="text-lg font-semibold text-white">Dashboard</h3>
                </div>
                <ul className="space-y-2">
                  <li>
                    <a href="#" className="flex items-center text-blue-400 hover:text-blue-300 p-2 hover:bg-white/10 rounded-lg transition">
                      <i className="fas fa-tachometer-alt w-6"></i>
                      <span>Overview</span>
                    </a>
                  </li>
                  <li>
                    <a href="#" className="flex items-center text-gray-300 hover:text-blue-300 p-2 hover:bg-white/10 rounded-lg transition">
                      <i className="fas fa-envelope w-6"></i>
                      <span>My Emails</span>
                    </a>
                  </li>
                  <li>
                    <a href="#" className="flex items-center text-gray-300 hover:text-blue-300 p-2 hover:bg-white/10 rounded-lg transition">
                      <i className="fas fa-shield-alt w-6"></i>
                      <span>Security</span>
                    </a>
                  </li>
                  <li>
                    <a href="#" className="flex items-center text-gray-300 hover:text-blue-300 p-2 hover:bg-white/10 rounded-lg transition">
                      <i className="fas fa-user-cog w-6"></i>
                      <span>Settings</span>
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Main Dashboard Area */}
          <div className="lg:col-span-3 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Emails Scanned Card */}
              <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Emails Scanned</p>
                    <h2 className="text-3xl font-bold text-white">{dashboardData.emailsScanned}</h2>
                    <p className="text-gray-400 text-sm mt-2">This month</p>
                  </div>
                  <div className="bg-blue-500/20 p-4 rounded-full">
                    <i className="fas fa-envelope text-2xl text-blue-400"></i>
                  </div>
                </div>
              </div>

              {/* Threats Detected Card */}
              <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Threats Detected</p>
                    <h2 className="text-3xl font-bold text-white">{dashboardData.threatsDetected}</h2>
                    <p className="text-gray-400 text-sm mt-2">This month</p>
                  </div>
                  <div className="bg-red-500/20 p-4 rounded-full">
                    <i className="fas fa-shield-alt text-2xl text-red-400"></i>
                  </div>
                </div>
              </div>

              {/* Security Score Card */}
              <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Security Score</p>
                    <h2 className="text-3xl font-bold text-white">{dashboardData.securityScore}%</h2>
                    <p className="text-gray-400 text-sm mt-2">Last updated today</p>
                  </div>
                  <div className="bg-blue-500/20 p-4 rounded-full">
                    <i className="fas fa-chart-line text-2xl text-blue-400"></i>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {dashboardData.recentActivity.length > 0 ? (
                  dashboardData.recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start p-3 hover:bg-white/5 rounded-lg transition">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <i className="fas fa-envelope text-blue-400"></i>
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-white">{activity.title}</p>
                        <p className="text-sm text-gray-400">{activity.description}</p>
                        <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-400 py-4">
                    <i className="fas fa-inbox text-3xl mb-2"></i>
                    <p>Your activity will appear here</p>
                  </div>
                )}
              </div>
            </div>

            {/* Email Scanner */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Email Analysis Tool</h3>
              <p className="text-gray-300 mb-6">
                Submit an email to check if it contains phishing threats or malicious content
              </p>
              
              <form onSubmit={handleEmailScan} className="space-y-4">
                <div>
                  <label htmlFor="emailInput" className="text-sm font-medium text-gray-300 block mb-2">
                    Email Content
                  </label>
                  <textarea
                    id="emailInput"
                    rows="4"
                    className="w-full px-4 py-2 rounded-lg border border-gray-600 bg-gray-700 text-white
                      placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Paste the suspicious email content here"
                    value={emailContent}
                    onChange={(e) => setEmailContent(e.target.value)}
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg 
                    flex items-center justify-center transition duration-150 ease-in-out 
                    focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Scanning...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-search mr-2"></i>
                      Scan Email
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
