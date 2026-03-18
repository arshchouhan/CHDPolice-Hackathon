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
      navigate('/login?admin=true');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
            <div className="flex items-center space-x-2">
              <FiShield className="h-6 w-6 text-gray-900" />
              <span className="text-xl font-bold tracking-tight">Admin Console</span>
            </div>
            <button 
              className="lg:hidden p-1 rounded-md hover:bg-gray-100"
              onClick={() => setSidebarOpen(false)}
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>
          
          <div className="p-4">
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 border border-gray-200 mb-6">
              <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-white font-bold">
                {adminEmail ? adminEmail.charAt(0).toUpperCase() : 'A'}
              </div>
              <div>
                <p className="font-semibold text-sm truncate w-32">{adminEmail || 'Admin'}</p>
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Super Administrator</p>
              </div>
            </div>
          
          </div>
          
          <nav className="space-y-1 px-4 flex-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center w-full px-4 py-3 text-left rounded-md transition-all ${
                  activeTab === item.id 
                    ? 'bg-gray-900 text-white shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
          
          <div className="p-4 border-t border-gray-100">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-3 text-left text-gray-500 hover:bg-gray-50 hover:text-red-600 rounded-md transition-all"
            >
              <FiLogOut className="w-5 h-5 mr-3" />
              <span className="text-sm font-medium">Log out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <header className="bg-white border-b border-gray-200 z-10 shadow-sm">
          <div className="flex items-center justify-between p-4 px-8">
            <button 
              className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100 border border-gray-200"
              onClick={() => setSidebarOpen(true)}
            >
              <FiMenu className="w-6 h-6" />
            </button>
            
            <div className="flex items-center space-x-6">
              <div className="relative">
                <button className="p-2 rounded-full text-gray-400 hover:text-gray-900 border border-gray-100 bg-gray-50 transition-colors">
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                  <FiServer className="w-5 h-5" />
                </button>
              </div>
              <div className="h-6 w-px bg-gray-200"></div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{admin?.email || 'Admin'}</p>
                  <p className="text-[10px] text-gray-400 uppercase font-black">Authorized</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center text-gray-900 font-bold">
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
                    label="Total Scans" 
                    value={stats.totalScans} 
                    icon={<FiServer className="w-5 h-5 text-gray-400" />}
                    subtitle="Last 30 Days"
                    delta={{ value: "+12%", positive: true }}
                  />
                  <StatsCard 
                    label="Threats Detected" 
                    value={stats.threatsDetected} 
                    icon={<FiShield className="w-5 h-5 text-red-400" />}
                    subtitle="Immediate Action"
                    delta={{ value: "+3", positive: false }}
                  />
                  <StatsCard 
                    label="Secure Domains" 
                    value={stats.secureDomains} 
                    icon={<FiGlobe className="w-5 h-5 text-green-400" />}
                    subtitle="Protected"
                    delta={{ value: "98%", positive: true }}
                  />
                  <StatsCard 
                    label="High Risk Assets" 
                    value={stats.highRisk} 
                    icon={<FiAlertCircle className="w-5 h-5 text-orange-400" />}
                    subtitle="Warning State"
                    delta={{ value: "12", positive: false }}
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
