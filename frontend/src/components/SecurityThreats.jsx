import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEdit, faTrash, faSearch, faFilter, faDownload } from '@fortawesome/free-solid-svg-icons';

const SecurityThreats = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Sample data - replace with actual API data
  const threats = [
    {
      id: 1,
      entity: { name: 'john.doe@example.com', avatar: 'JD' },
      title: 'Suspicious Login Attempt',
      riskLevel: 85,
      lastActivity: '2023-06-15T14:32:10',
      sources: ['email', 'auth'],
      status: 'Open',
      priority: 'High'
    },
    {
      id: 2,
      entity: { name: 'admin@example.com', avatar: 'AD' },
      title: 'Multiple Failed Login Attempts',
      riskLevel: 65,
      lastActivity: '2023-06-14T09:15:22',
      sources: ['auth'],
      status: 'In Progress',
      priority: 'Medium'
    },
    {
      id: 3,
      entity: { name: 'jane.smith@example.com', avatar: 'JS' },
      title: 'Phishing Email Detected',
      riskLevel: 92,
      lastActivity: '2023-06-13T16:45:33',
      sources: ['email'],
      status: 'Open',
      priority: 'Critical'
    },
    {
      id: 4,
      entity: { name: 'marketing@example.com', avatar: 'MK' },
      title: 'Unusual Data Transfer',
      riskLevel: 78,
      lastActivity: '2023-06-12T11:20:45',
      sources: ['network', 'cloud'],
      status: 'In Review',
      priority: 'High'
    },
    {
      id: 5,
      entity: { name: 'support@example.com', avatar: 'SP' },
      title: 'Suspicious File Attachment',
      riskLevel: 55,
      lastActivity: '2023-06-11T13:10:15',
      sources: ['email'],
      status: 'Resolved',
      priority: 'Medium'
    },
    {
      id: 6,
      entity: { name: 'hr@example.com', avatar: 'HR' },
      title: 'Unusual Login Location',
      riskLevel: 70,
      lastActivity: '2023-06-10T08:30:22',
      sources: ['auth', 'location'],
      status: 'Dismissed',
      priority: 'Medium'
    },
    {
      id: 7,
      entity: { name: 'dev@example.com', avatar: 'DV' },
      title: 'Suspicious API Calls',
      riskLevel: 88,
      lastActivity: '2023-06-09T17:25:18',
      sources: ['api', 'cloud'],
      status: 'Open',
      priority: 'High'
    },
  ];

  // Filter and search functionality
  const filteredThreats = threats.filter(threat => {
    const matchesSearch = threat.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         threat.entity.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || 
                         threat.status.toLowerCase() === selectedStatus.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredThreats.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredThreats.length / itemsPerPage);

  const getStatusBadge = (status) => {
    const statusMap = {
      'Open': 'bg-yellow-500/20 text-yellow-400',
      'In Progress': 'bg-blue-500/20 text-blue-400',
      'In Review': 'bg-purple-500/20 text-purple-400',
      'Resolved': 'bg-green-500/20 text-green-400',
      'Dismissed': 'bg-gray-500/20 text-gray-400',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusMap[status] || 'bg-gray-500/20'}`}>
        {status}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const priorityMap = {
      'Critical': 'bg-red-500/20 text-red-400',
      'High': 'bg-orange-500/20 text-orange-400',
      'Medium': 'bg-yellow-500/20 text-yellow-400',
      'Low': 'bg-blue-500/20 text-blue-400',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityMap[priority] || 'bg-gray-500/20'}`}>
        {priority}
      </span>
    );
  };

  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const getSourceIcons = (sources) => {
    const iconMap = {
      'email': '✉️',
      'auth': '🔑',
      'network': '🌐',
      'cloud': '☁️',
      'api': '🔌',
      'location': '📍'
    };
    
    return sources.map((source, index) => (
      <span key={index} className="mr-1" title={source.charAt(0).toUpperCase() + source.slice(1)}>
        {iconMap[source] || '🔍'}
      </span>
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <h2 className="text-2xl font-bold">Security Threats</h2>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FontAwesomeIcon icon={faSearch} className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search threats..."
              className="bg-gray-800 border border-gray-700 text-white rounded-md py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full sm:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex space-x-2">
            <div className="relative">
              <select
                className="appearance-none bg-gray-800 border border-gray-700 text-white rounded-md py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="In Review">In Review</option>
                <option value="Resolved">Resolved</option>
                <option value="Dismissed">Dismissed</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <FontAwesomeIcon icon={faFilter} className="h-3 w-3 text-gray-400" />
              </div>
            </div>
            
            <button className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-md border border-gray-700 flex items-center text-sm">
              <FontAwesomeIcon icon={faDownload} className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Threats Table */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-800">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Entity
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Title
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Risk Level
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Priority
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Last Activity
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Sources
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800/50 divide-y divide-gray-700">
              {currentItems.length > 0 ? (
                currentItems.map((threat) => (
                  <tr key={threat.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-semibold mr-3">
                          {threat.entity.avatar}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">{threat.entity.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{threat.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-full bg-gray-700 rounded-full h-2.5">
                        <div 
                          className={`h-2.5 rounded-full ${
                            threat.riskLevel > 80 ? 'bg-red-500' : 
                            threat.riskLevel > 60 ? 'bg-orange-500' : 
                            threat.riskLevel > 40 ? 'bg-yellow-500' : 'bg-green-500'
                          }`} 
                          style={{ width: `${threat.riskLevel}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{threat.riskLevel}%</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPriorityBadge(threat.priority)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {formatDate(threat.lastActivity)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex">
                        {getSourceIcons(threat.sources)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(threat.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button className="text-blue-400 hover:text-blue-300 p-1">
                          <FontAwesomeIcon icon={faEye} className="h-4 w-4" />
                        </button>
                        <button className="text-yellow-400 hover:text-yellow-300 p-1">
                          <FontAwesomeIcon icon={faEdit} className="h-4 w-4" />
                        </button>
                        <button className="text-red-400 hover:text-red-300 p-1">
                          <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-gray-400">
                    No threats found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredThreats.length > itemsPerPage && (
          <div className="bg-gray-800 px-6 py-3 flex items-center justify-between border-t border-gray-700">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-700 text-sm font-medium rounded-md text-gray-300 bg-gray-800 hover:bg-gray-700 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-700 text-sm font-medium rounded-md text-gray-300 bg-gray-800 hover:bg-gray-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-400">
                  Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(indexOfLastItem, filteredThreats.length)}
                  </span>{' '}
                  of <span className="font-medium">{filteredThreats.length}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-700 bg-gray-800 text-sm font-medium text-gray-400 hover:bg-gray-700 disabled:opacity-50"
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === pageNum
                            ? 'bg-purple-600 border-purple-600 text-white'
                            : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-700 bg-gray-800 text-sm font-medium text-gray-400 hover:bg-gray-700 disabled:opacity-50"
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityThreats;
