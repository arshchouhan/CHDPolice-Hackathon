import React, { useState } from 'react';
import { FaBell, FaUserCircle, FaSearch, FaBars } from 'react-icons/fa';

const Header = ({ toggleSidebar, sidebarOpen }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notifications] = useState([
    { id: 1, message: 'New security alert detected', time: '2 mins ago', read: false },
    { id: 2, message: 'Weekly report is ready', time: '1 hour ago', read: true },
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="bg-gray-800 shadow-sm border-b border-gray-700">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center">
          <button 
            onClick={toggleSidebar}
            className="p-2 text-gray-300 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 mr-4"
          >
            <FaBars className="text-xl" />
          </button>
          <h1 className="text-xl font-semibold text-white">
            {sidebarOpen ? 'Dashboard' : ''}
          </h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                className="w-64 px-4 py-2 pl-10 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
              />
              <FaSearch className="absolute left-3 top-3 text-gray-400" />
            </div>
          </div>
          
          <div className="relative">
            <button 
              className="p-2 text-gray-300 rounded-full hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 relative"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
            >
              <FaUserCircle className="text-2xl" />
            </button>
            
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg py-1 z-10 border border-gray-700">
                <a href="#" className="block px-4 py-2 text-sm text-gray-200 hover:bg-gray-700">Your Profile</a>
                <a href="#" className="block px-4 py-2 text-sm text-gray-200 hover:bg-gray-700">Settings</a>
                <a href="#" className="block px-4 py-2 text-sm text-red-400 hover:bg-gray-700">Sign out</a>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="border-t border-gray-700">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-medium text-white">Welcome back, User!</h2>
            <p className="text-sm text-gray-400">Here's what's happening with your account today.</p>
          </div>
          <div className="flex space-x-3">
            <button className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
              Scan New Email
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
