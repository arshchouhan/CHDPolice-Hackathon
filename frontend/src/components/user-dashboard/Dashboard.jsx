import React, { useState } from 'react';
import { 
  FaShieldAlt, 
  FaEnvelope, 
  FaCheckCircle, 
  FaExclamationTriangle, 
  FaArrowUp, 
  FaArrowDown,
  FaSearch,
  FaChartLine,
  FaRegBell,
  FaRegUserCircle,
  FaChevronDown,
  FaEllipsisV,
  FaFileExport,
  FaPlus,
  FaCalendarAlt,
  FaChevronRight
} from 'react-icons/fa';
import { Line, Doughnut } from 'react-chartjs-2';
import 'chart.js/auto';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement,
  Filler
} from 'chart.js';

// Register chart components
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement,
  Filler
);

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('week');

  // Stats data
  const stats = [
    { 
      name: 'Total Scans', 
      value: '1,234', 
      change: '12%', 
      changeType: 'increase',
      icon: <FaSearch className="text-blue-500 text-lg" />,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    { 
      name: 'Threats Blocked', 
      value: '42', 
      change: '5%', 
      changeType: 'increase',
      icon: <FaShieldAlt className="text-green-500 text-lg" />,
      bgColor: 'bg-green-50',
      textColor: 'text-green-600'
    },
    { 
      name: 'Safe Emails', 
      value: '1,180', 
      change: '8%', 
      changeType: 'decrease',
      icon: <FaCheckCircle className="text-yellow-500 text-lg" />,
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-600'
    },
    { 
      name: 'Scan Accuracy', 
      value: '99.5%', 
      change: '0.5%', 
      changeType: 'increase',
      icon: <FaChartLine className="text-purple-500 text-lg" />,
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    },
  ];

  // Recent activity data
  const recentActivity = [
    {
      id: 1,
      subject: 'Suspicious Link Detected',
      email: 'from: unknown@example.com',
      date: '2 min ago',
      status: 'threat',
      icon: <FaExclamationTriangle className="text-red-500" />,
      bgColor: 'bg-red-100',
      statusColor: 'bg-red-100 text-red-800'
    },
    {
      id: 2,
      subject: 'Account Verification',
      email: 'from: security@trusted.com',
      date: '1 hour ago',
      status: 'safe',
      icon: <FaCheckCircle className="text-green-500" />,
      bgColor: 'bg-green-100',
      statusColor: 'bg-green-100 text-green-800'
    },
    {
      id: 3,
      subject: 'Password Reset Request',
      email: 'from: no-reply@service.com',
      date: '3 hours ago',
      status: 'threat',
      icon: <FaExclamationTriangle className="text-red-500" />,
      bgColor: 'bg-red-100',
      statusColor: 'bg-red-100 text-red-800'
    },
    {
      id: 4,
      subject: 'Monthly Security Report',
      email: 'from: reports@security.org',
      date: '1 day ago',
      status: 'safe',
      icon: <FaCheckCircle className="text-green-500" />,
      bgColor: 'bg-green-100',
      statusColor: 'bg-green-100 text-green-800'
    }
  ];  

  // Chart data
  const scanData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Scans',
        data: [45, 25, 60, 80, 45, 30, 65],
        fill: true,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
        tension: 0.4,
        pointBackgroundColor: '#fff',
        pointBorderColor: 'rgba(59, 130, 246, 1)',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(59, 130, 246, 1)',
        pointHoverBorderWidth: 2,
        pointHitRadius: 10,
        pointHoverBorderWidth: 2,
      },
    ],
  };

  const threatData = {
    labels: ['Phishing', 'Malware', 'Spam', 'Safe'],
    datasets: [
      {
        data: [15, 10, 25, 50],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(249, 115, 22, 0.8)',
          'rgba(234, 179, 8, 0.8)',
          'rgba(16, 185, 129, 0.8)',
        ],
        borderColor: [
          'rgba(255, 255, 255, 1)',
          'rgba(255, 255, 255, 1)',
          'rgba(255, 255, 255, 1)',
          'rgba(255, 255, 255, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  // Chart options
  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'white',
        titleColor: '#1F2937',
        bodyColor: '#4B5563',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        padding: 12,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        callbacks: {
          label: function(context) {
            return `Scans: ${context.parsed.y}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 12,
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(229, 231, 235, 0.5)',
          drawBorder: false,
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 12,
          },
          callback: function(value) {
            return value;
          }
        }
      }
    }
  };
  
  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
          color: '#4B5563',
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'white',
        titleColor: '#1F2937',
        bodyColor: '#4B5563',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        padding: 12,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome back! Here's what's happening with your email security.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <FaFileExport className="mr-2" />
            Export
          </button>
          <button className="flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <FaPlus className="mr-2" />
            New Scan
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor} ${stat.textColor}`}>
                {stat.icon}
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className={`inline-flex items-center text-sm font-medium ${
                stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
              }`}>
                {stat.changeType === 'increase' ? (
                  <FaArrowUp className="mr-1" />
                ) : (
                  <FaArrowDown className="mr-1" />
                )}
                {stat.change}
              </span>
              <span className="text-gray-500 text-sm ml-2">vs last week</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scan Activity */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
            <h3 className="text-lg font-semibold text-gray-800">Scan Activity</h3>
            <div className="flex items-center space-x-2 bg-gray-50 p-1 rounded-lg">
              <button 
                onClick={() => setActiveTab('week')}
                className={`px-3 py-1.5 text-sm rounded-md ${activeTab === 'week' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600'}`}
              >
                Week
              </button>
              <button 
                onClick={() => setActiveTab('month')}
                className={`px-3 py-1.5 text-sm rounded-md ${activeTab === 'month' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600'}`}
              >
                Month
              </button>
              <button 
                onClick={() => setActiveTab('year')}
                className={`px-3 py-1.5 text-sm rounded-md ${activeTab === 'year' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600'}`}
              >
                Year
              </button>
            </div>
          </div>
          <div className="h-64">
            <Line data={scanData} options={lineChartOptions} />
          </div>
        </div>

        {/* Threat Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Threat Distribution</h3>
            <div className="relative">
              <button className="flex items-center text-gray-500 hover:text-gray-700 focus:outline-none">
                <FaEllipsisV className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="h-56 flex items-center justify-center">
            <Doughnut data={threatData} options={doughnutOptions} />
          </div>
          <div className="mt-6 flex justify-center">
            <div className="flex items-center text-sm text-gray-500">
              <FaCalendarAlt className="mr-2" />
              <span>Last 7 days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Recent Activity</h3>
            <button className="text-sm font-medium text-blue-600 hover:text-blue-500 focus:outline-none flex items-center">
              View all
              <FaChevronRight className="ml-1 h-3 w-3" />
            </button>
          </div>
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div 
                key={activity.id} 
                className="flex items-center p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
              >
                <div className={`p-2.5 rounded-full ${activity.bgColor} ${activity.status === 'safe' ? 'text-green-500' : 'text-red-500'} mr-4`}>
                  {activity.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <h4 className="font-medium text-gray-900 truncate">{activity.subject}</h4>
                    <span className="text-xs text-gray-500 whitespace-nowrap sm:ml-2">{activity.date}</span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{activity.email}</p>
                </div>
                <span className={`ml-4 px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap ${activity.statusColor}`}>
                  {activity.status === 'safe' ? 'Safe' : 'Threat'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Scan</h3>
          <p className="text-sm text-gray-500 mb-4">
            Quickly scan a suspicious email by pasting its content or URL below.
          </p>
          <div className="flex space-x-3">
            <input
              type="text"
              placeholder="Paste email content or URL..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              Scan Now
            </button>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Security Tips</h3>
          <ul className="space-y-3">
            <li className="flex items-start">
              <FaShieldAlt className="flex-shrink-0 h-5 w-5 text-blue-500 mt-0.5" />
              <span className="ml-3 text-sm text-gray-700">
                Always verify the sender's email address before clicking any links.
              </span>
            </li>
            <li className="flex items-start">
              <FaShieldAlt className="flex-shrink-0 h-5 w-5 text-blue-500 mt-0.5" />
              <span className="ml-3 text-sm text-gray-700">
                Never share your password or personal information via email.
              </span>
            </li>
            <li className="flex items-start">
              <FaShieldAlt className="flex-shrink-0 h-5 w-5 text-blue-500 mt-0.5" />
              <span className="ml-3 text-sm text-gray-700">
                Enable two-factor authentication for added security.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
