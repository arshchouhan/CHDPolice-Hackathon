import React from 'react';
import { useAuth } from '../../context/AuthContext';

const AdminDashboard = () => {
  const { admin, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-md">
            <h2 className="text-lg font-semibold mb-4">Welcome, {admin?.email || 'Admin'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Dashboard Cards */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-medium text-gray-700">Total Users</h3>
                <p className="text-2xl font-bold">0</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-medium text-gray-700">Active Sessions</h3>
                <p className="text-2xl font-bold">0</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-medium text-gray-700">Reports</h3>
                <p className="text-2xl font-bold">0</p>
              </div>
            </div>
            
            {/* Add more dashboard content here */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
