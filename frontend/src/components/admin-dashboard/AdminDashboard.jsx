import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../../context/adminauthcontext';
import { useNavigate } from 'react-router-dom';
import { FiLogOut, FiMenu, FiX, FiHome, FiShield, FiAlertCircle, FiGlobe, FiServer, FiBarChart2 } from 'react-icons/fi';
import StatsCard from './StatsCard';
import GaugeCard from './GaugeCard';
import SeverityDial from './SeverityDial';
import GlobalFootprint from './GlobalFootprint';
import ASNOwnership from './ASNOwnership';
import ExposureCategories from './ExposureCategories';
import ExposedPorts from './ExposedPorts';
import CertificatesCard from './CertificatesCard';

const AdminDashboard = () => {
  const { isAdmin, adminLogout, admin } = useAdminAuth();
  const adminEmail = admin?.email || '';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalScans: 0,
    threatsDetected: 0,
    secureDomains: 0,
    highRisk: 0,
  });
  const navigate = useNavigate();

  // Mock data - replace with actual API calls
  useEffect(() => {
    // Simulate API call
    const fetchStats = async () => {
      // Replace with actual API call
      // const response = await fetch('/api/admin/stats');
      // const data = await response.json();
      // setStats(data);
      
      // Mock data
      setStats({
        totalScans: 1247,
        threatsDetected: 42,
        secureDomains: 1150,
        highRisk: 12,
      });
    };
    
    fetchStats();
  }, []);

  const navItems = [
    { id: 'overview', icon: <FiHome className="w-5 h-5" />, label: 'Overview' },
    { id: 'threats', icon: <FiShield className="w-5 h-5" />, label: 'Threat Analysis' },
    { id: 'exposure', icon: <FiAlertCircle className="w-5 h-5" />, label: 'Exposure' },
    { id: 'network', icon: <FiGlobe className="w-5 h-5" />, label: 'Network' },
    { id: 'reports', icon: <FiBarChart2 className="w-5 h-5" />, label: 'Reports' },
  ];

  const handleLogout = async () => {
    try {
      await adminLogout();
      // Clear any remaining tokens to be extra sure
      localStorage.removeItem('token');
      localStorage.removeItem('adminToken');
      navigate('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-gray-800 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b border-gray-700 px-4">
            <div className="flex items-center space-x-2">
              <FiShield className="h-6 w-6 text-emerald-400" />
              <span className="text-xl font-semibold">Admin Panel</span>
            </div>
            <button 
              className="lg:hidden p-1 rounded-md hover:bg-gray-700"
              onClick={() => setSidebarOpen(false)}
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>
          
          <div className="p-4">
            <div className="flex items-center space-x-3 p-2 rounded-lg bg-gray-700 mb-6">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">
                {adminEmail ? adminEmail.charAt(0).toUpperCase() : 'A'}
              </div>
              <div>
                <p className="font-medium">{adminEmail || 'Admin'}</p>
                <p className="text-xs text-gray-400">Administrator</p>
              </div>
            </div>
          
          </div>
          
          <nav className="space-y-1 px-4">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center w-full px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === item.id 
                    ? 'bg-emerald-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
            
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-3 text-left text-gray-300 hover:bg-gray-700 rounded-lg transition-colors mt-4"
            >
              <FiLogOut className="w-5 h-5 mr-3" />
              <span>Logout</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        {/* Top Navigation */}
        <header className="bg-white shadow-sm z-10">
          <div className="flex items-center justify-between p-4">
            <button 
              className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
              onClick={() => setSidebarOpen(true)}
            >
              <FiMenu className="w-6 h-6" />
            </button>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <button className="p-2 rounded-full text-gray-600 hover:bg-gray-100">
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                  <FiServer className="w-6 h-6" />
                </button>
              </div>
              <div className="h-8 w-px bg-gray-200"></div>
              <div className="flex items-center">
                <span className="text-sm text-gray-600 mr-2">{admin?.email || 'Admin'}</span>
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">
                  {admin?.email?.charAt(0).toUpperCase() || 'A'}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {navItems.find(item => item.id === activeTab)?.label || 'Dashboard'}
            </h2>
            
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <StatsCard 
                    title="Total Scans" 
                    value={stats.totalScans} 
                    icon="scan"
                    trend="+12% from last month"
                  />
                  <StatsCard 
                    title="Threats Detected" 
                    value={stats.threatsDetected} 
                    icon="shield"
                    trend="+3 from yesterday"
                    isDanger={stats.threatsDetected > 0}
                  />
                  <StatsCard 
                    title="Secure Domains" 
                    value={stats.secureDomains} 
                    icon="lock"
                    trend="98% secure"
                  />
                  <StatsCard 
                    title="High Risk" 
                    value={stats.highRisk} 
                    icon="alert"
                    trend="Needs attention"
                    isDanger={stats.highRisk > 0}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                  <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Threat Severity</h3>
                    <SeverityDial />
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Global Footprint</h3>
                    <GlobalFootprint />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">ASN Ownership</h3>
                    <ASNOwnership />
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">SSL/TLS Certificates</h3>
                    <CertificatesCard />
                  </div>
                </div>
              </>
            )}

            {/* Threats Tab */}
            {activeTab === 'threats' && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Threat Analysis</h3>
                <p className="text-gray-600">Detailed threat analysis will be displayed here.</p>
              </div>
            )}

            {/* Exposure Tab */}
            {activeTab === 'exposure' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Exposure Categories</h3>
                  <ExposureCategories />
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Exposed Ports</h3>
                  <ExposedPorts />
                </div>
              </div>
            )}

            {/* Network Tab */}
            {activeTab === 'network' && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Network Analysis</h3>
                <p className="text-gray-600">Network analysis and statistics will be displayed here.</p>
              </div>
            )}

            {/* Reports Tab */}
            {activeTab === 'reports' && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Reports</h3>
                <p className="text-gray-600">Generate and view detailed security reports.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
