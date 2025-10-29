import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FaHome, 
  FaEnvelope, 
  FaChartLine, 
  FaCog, 
  FaSignOutAlt, 
  FaBell, 
  FaChevronLeft, 
  FaChevronRight,
  FaShieldAlt,
  FaSearch,
  FaHistory
} from 'react-icons/fa';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const location = useLocation();
  
  const navItems = [
    { path: '/dashboard', icon: <FaHome />, label: 'Dashboard' },
    { path: '/dashboard/emails', icon: <FaEnvelope />, label: 'Emails' },
    { path: '/dashboard/analytics', icon: <FaChartLine />, label: 'Analytics' },
    { path: '/dashboard/scan', icon: <FaSearch />, label: 'Scan Email' },
    { path: '/dashboard/history', icon: <FaHistory />, label: 'History' },
    { path: '/dashboard/settings', icon: <FaCog />, label: 'Settings' },
  ];

  return (
    <div 
      className={`fixed inset-y-0 left-0 bg-gradient-to-b from-blue-900 to-blue-800 text-white w-64 transform ${isOpen ? 'translate-x-0' : '-translate-x-44'} transition-transform duration-300 ease-in-out z-20`}
    >
      <div className="flex items-center justify-between h-16 px-4 bg-blue-900">
        <h1 className="text-xl font-bold">EmailShield</h1>
        <button 
          onClick={toggleSidebar}
          className="p-1 rounded-md hover:bg-blue-800 focus:outline-none"
        >
          {isOpen ? <FaChevronLeft /> : <FaChevronRight />}
        </button>
      </div>
      
      <div className="p-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search..."
            className="w-full px-4 py-2 rounded-lg bg-blue-800 text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      
      <nav className="mt-4">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center px-6 py-3 text-sm font-medium rounded-lg mx-2 transition-colors ${location.pathname === item.path ? 'bg-blue-700' : 'hover:bg-blue-700'}`}
          >
            <span className="text-lg mr-3">{item.icon}</span>
            {isOpen && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>
      
      <div className="absolute bottom-0 w-full p-4">
        <button className="flex items-center w-full px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
          <FaSignOutAlt className="mr-3" />
          {isOpen && 'Logout'}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
