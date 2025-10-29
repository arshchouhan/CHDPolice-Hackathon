import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faBell, faBars, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';

const Header = ({ onToggleSidebar, onLogout }) => {
  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center">
          <button 
            onClick={onToggleSidebar}
            className="text-gray-400 hover:text-white focus:outline-none"
          >
            <FontAwesomeIcon icon={faBars} className="h-6 w-6" />
          </button>
          <h1 className="ml-4 text-xl font-bold text-white">Security Dashboard</h1>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FontAwesomeIcon icon={faSearch} className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search..."
              className="bg-gray-700 text-white rounded-md py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-purple-500 w-64"
            />
          </div>

          <button className="text-gray-400 hover:text-white relative">
            <FontAwesomeIcon icon={faBell} className="h-5 w-5" />
            <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
          </button>

          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-semibold">
              A
            </div>
            <button 
              onClick={onLogout}
              className="text-gray-400 hover:text-white flex items-center space-x-1"
              title="Logout"
            >
              <FontAwesomeIcon icon={faSignOutAlt} className="h-4 w-4" />
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
