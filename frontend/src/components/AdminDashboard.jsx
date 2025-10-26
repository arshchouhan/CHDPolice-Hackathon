import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../assets/css/email-analysis.css';
import '../assets/css/skeleton-loading.css';
import GmailStatus from './GmailStatus';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    emailsAnalyzed: 0,
    threatsDetected: 0,
    recentEmails: [],
    users: [],
    emailStats: {
      total: 0,
      phishing: 0,
      clean: 0,
      suspicious: 0
    }
  });
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [currentEmailPage, setCurrentEmailPage] = useState(1);
  const [riskFilter, setRiskFilter] = useState('all');
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Check admin authentication
  useEffect(() => {
    const checkAdminAccess = async () => {
      const token = localStorage.getItem('adminToken');
      const isLoggedIn = localStorage.getItem('isAdminLoggedIn');

      // If no token or login flag, redirect to login
      if (!token || !isLoggedIn) {
        window.location.href = '/admin/login';
        return;
      }

      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/api/admin/verify-token`, {
          method: 'GET',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Token verification failed');
        }

        // Load dashboard data if authenticated
        fetchDashboardData();
      } catch (error) {
        console.error('Admin access check failed, attempting to refresh session...', error);
        
        // Try to refresh the session before logging out
        try {
          const refreshResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/refresh-token`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (refreshResponse.ok) {
            const data = await refreshResponse.json();
            if (data.token) {
              localStorage.setItem('adminToken', data.token);
              localStorage.setItem('isAdminLoggedIn', 'true');
              fetchDashboardData();
              return;
            }
          }
        } catch (refreshError) {
          console.error('Session refresh failed:', refreshError);
        }
        
        // Only clear storage and redirect if refresh also fails
        localStorage.removeItem('adminToken');
        localStorage.removeItem('isAdminLoggedIn');
        window.location.href = '/admin/login';
      }
    };

    checkAdminAccess();
    
    // Set up periodic token refresh (every 5 minutes)
    const refreshInterval = setInterval(() => {
      const token = localStorage.getItem('adminToken');
      if (token) {
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/refresh-token`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })
        .then(res => res.json())
        .then(data => {
          if (data.token) {
            localStorage.setItem('adminToken', data.token);
          }
        })
        .catch(console.error);
      }
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(refreshInterval);
  }, []);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('adminToken');
      if (!token) {
        throw new Error('No admin token found. Please log in.');
      }
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/admin/dashboard`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      setStats(prev => ({
        ...prev,
        ...data,
        users: data.users || [],
        recentEmails: data.recentEmails || []
      }));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('isAdminLoggedIn');
    window.location.href = '/admin/login';
  };

  // Handle viewing email details
  const viewEmailDetails = async (emailId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/emails/${emailId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch email details');
      }

      const emailData = await response.json();
      setSelectedEmail(emailData);
      setEmailModalOpen(true);
    } catch (error) {
      console.error('Error fetching email details:', error);
      toast.error('Failed to load email details');
    }
  };

  // Chart data for email scanning activity
  const emailScanningData = {
    labels: stats.emailStats?.labels || [],
    datasets: [
      {
        label: 'Emails Scanned',
        data: stats.emailStats?.data || [],
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Chart data for phishing detection
  const phishingRateData = {
    labels: ['Phishing', 'Clean', 'Suspicious'],
    datasets: [
      {
        data: [
          stats.emailStats?.phishing || 0,
          stats.emailStats?.clean || 0,
          stats.emailStats?.suspicious || 0,
        ],
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 206, 86, 0.6)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(255, 206, 86, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cls-4 gap-6 mb-8">
          {[
            { title: 'Total Users', value: stats.totalUsers, icon: '👥', color: 'bg-blue-500' },
            { title: 'Active Users', value: stats.activeUsers, icon: '🟢', color: 'bg-green-500' },
            { title: 'Emails Analyzed', value: stats.emailsAnalyzed, icon: '📧', color: 'bg-purple-500' },
            { title: 'Threats Detected', value: stats.threatsDetected, icon: '🛡️', color: 'bg-red-500' },
          ].map((stat, index) => (
            <div key={index} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 ${stat.color} rounded-md p-3`}>
                    <span className="text-2xl">{stat.icon}</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dt className="text-sm font-medium text-gray-500 truncate">{stat.title}</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">{stat.value}</div>
                    </dd>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {['users', 'emails', 'analytics', 'settings'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`${activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'users' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium">User Management</h2>
                  <button className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                    Add New User
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {stats.users.map((user) => (
                        <tr key={user._id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button className="text-indigo-600 hover:text-indigo-900 mr-3">Edit</button>
                            <button className="text-red-600 hover:text-red-900">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'emails' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium">Analyzed Emails</h2>
                  <div className="flex space-x-2">
                    <select
                      value={riskFilter}
                      onChange={(e) => setRiskFilter(e.target.value)}
                      className="border rounded px-3 py-1 text-sm"
                    >
                      <option value="all">All Risks</option>
                      <option value="high">High Risk</option>
                      <option value="medium">Medium Risk</option>
                      <option value="low">Low Risk</option>
                    </select>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Level</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {stats.recentEmails
                        .filter(email => riskFilter === 'all' || email.riskLevel === riskFilter)
                        .map((email) => (
                          <tr key={email._id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {email.subject || 'No Subject'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {email.from}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                email.riskLevel === 'high' ? 'bg-red-100 text-red-800' :
                                email.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {email.riskLevel}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(email.date).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => viewEmailDetails(email._id)}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <button
                    onClick={() => setCurrentEmailPage(p => Math.max(1, p - 1))}
                    disabled={currentEmailPage === 1}
                    className="px-4 py-2 border rounded-md disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span>Page {currentEmailPage}</span>
                  <button
                    onClick={() => setCurrentEmailPage(p => p + 1)}
                    className="px-4 py-2 border rounded-md"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div>
                <h2 className="text-lg font-medium mb-4">Analytics Dashboard</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-md font-medium mb-4">Email Scanning Activity</h3>
                    <div className="h-64">
                      <Bar data={emailScanningData} options={{ responsive: true, maintainAspectRatio: false }} />
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-md font-medium mb-4">Phishing Detection Rate</h3>
                    <div className="h-64">
                      <Doughnut data={phishingRateData} options={{ responsive: true, maintainAspectRatio: false }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div>
                <h2 className="text-lg font-medium mb-4">System Settings</h2>
                <div className="bg-white p-4 rounded-lg shadow mb-6">
                  <h3 className="text-md font-medium mb-4">Security Configuration</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Enable Two-Factor Authentication</h4>
                        <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Session Timeout</h4>
                        <p className="text-sm text-gray-500">Automatically log out after 30 minutes of inactivity</p>
                      </div>
                      <select className="border rounded px-3 py-1 text-sm">
                        <option value="15">15 minutes</option>
                        <option value="30" defaultValue>30 minutes</option>
                        <option value="60">1 hour</option>
                        <option value="240">4 hours</option>
                      </select>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Last Updated</p>
                      <p className="font-medium">October 23, 2023</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Database</p>
                      <p className="font-medium">MongoDB 6.0</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Server</p>
                      <p className="font-medium">Node.js 18.x</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Email Details Modal */}
      {emailModalOpen && selectedEmail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b p-4 sticky top-0 bg-white">
              <h3 className="text-lg font-semibold">Email Details</h3>
              <button
                onClick={() => setEmailModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500">Subject</h4>
                <p className="mt-1 text-lg font-medium">{selectedEmail.subject || 'No Subject'}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">From</h4>
                  <p className="mt-1">{selectedEmail.from}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">To</h4>
                  <p className="mt-1">{selectedEmail.to}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Date</h4>
                  <p className="mt-1">{new Date(selectedEmail.date).toLocaleString()}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Risk Level</h4>
                  <span className={`mt-1 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    selectedEmail.riskLevel === 'high' ? 'bg-red-100 text-red-800' :
                    selectedEmail.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {selectedEmail.riskLevel}
                  </span>
                </div>
              </div>
              
              {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Attachments</h4>
                  <div className="space-y-2">
                    {selectedEmail.attachments.map((attachment, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                        <div className="flex items-center">
                          <svg className="h-5 w-5 text-gray-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm">{attachment.filename}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {attachment.size > 1024 * 1024 
                            ? `${(attachment.size / (1024 * 1024)).toFixed(1)} MB` 
                            : `${Math.round(attachment.size / 1024)} KB`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Email Body</h4>
                <div className="bg-gray-50 p-4 rounded whitespace-pre-wrap font-sans text-sm">
                  {selectedEmail.text || 'No content available'}
                </div>
              </div>
              
              {selectedEmail.analysis && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Analysis Results</h4>
                  <div className="bg-blue-50 p-4 rounded">
                    <pre className="text-xs text-gray-800 overflow-x-auto">
                      {JSON.stringify(selectedEmail.analysis, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t">
              <button
                type="button"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={() => setEmailModalOpen(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={() => {
                  // Handle mark as safe/dangerous
                  setEmailModalOpen(false);
                }}
              >
                {selectedEmail.riskLevel === 'high' ? 'Mark as Safe' : 'Mark as Dangerous'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
