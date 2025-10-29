import React from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import 'chart.js/auto';

const DashboardOverview = () => {
  // Data for Open Alerts by Classification chart
  const alertsData = {
    labels: ['Hacktool', 'Virus', 'Spyware', 'Malware', 'Phishing'],
    datasets: [
      {
        label: 'Critical',
        data: [12, 19, 3, 15, 8],
        backgroundColor: '#7f5ce4',
      },
      {
        label: 'High',
        data: [8, 12, 6, 10, 5],
        backgroundColor: '#b85070',
      },
      {
        label: 'Medium',
        data: [5, 8, 2, 5, 3],
        backgroundColor: '#f59e0b',
      },
    ],
  };

  // Data for Threats Tactics chart
  const tacticsData = {
    labels: ['Defense Evasion', 'Discovery', 'Execution', 'Initial Access'],
    datasets: [
      {
        data: [30, 20, 25, 25],
        backgroundColor: [
          '#7f5ce4',
          '#b85070',
          '#f59e0b',
          '#10b981',
        ],
        borderWidth: 0,
      },
    ],
  };

  // Data for Threats Status chart
  const statusData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Open',
        data: [12, 19, 3, 5, 2, 3],
        backgroundColor: '#f59e0b',
      },
      {
        label: 'In Progress',
        data: [8, 12, 6, 8, 4, 5],
        backgroundColor: '#b85070',
      },
      {
        label: 'Dismissed',
        data: [5, 8, 2, 3, 1, 2],
        backgroundColor: '#7f5ce4',
      },
      {
        label: 'Resolved',
        data: [15, 20, 10, 12, 8, 10],
        backgroundColor: '#10b981',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#9ca3af',
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#9ca3af',
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#9ca3af',
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#9ca3af',
        },
      },
    },
  };

  // Summary cards data
  const summaryCards = [
    {
      title: 'Total Threats',
      value: '1,248',
      change: '+12.5%',
      trend: 'up',
      icon: '🛡️',
      color: 'bg-purple-900/30',
    },
    {
      title: 'High Risk',
      value: '342',
      change: '+5.2%',
      trend: 'up',
      icon: '⚠️',
      color: 'bg-red-900/30',
    },
    {
      title: 'In Progress',
      value: '89',
      change: '-3.1%',
      trend: 'down',
      icon: '⏳',
      color: 'bg-yellow-900/30',
    },
    {
      title: 'Resolved',
      value: '817',
      change: '+8.7%',
      trend: 'up',
      icon: '✅',
      color: 'bg-green-900/30',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, index) => (
          <div 
            key={index} 
            className={`p-5 rounded-xl ${card.color} border border-gray-700/50 backdrop-blur-sm`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-400">{card.title}</p>
                <p className="text-2xl font-bold mt-1">{card.value}</p>
                <p className={`text-sm mt-2 ${
                  card.trend === 'up' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {card.change} from last month
                </p>
              </div>
              <div className="text-3xl">{card.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Open Alerts by Classification */}
        <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
          <h3 className="text-lg font-semibold mb-4">Open Alerts by Classification</h3>
          <div className="h-64">
            <Bar 
              data={alertsData} 
              options={{
                ...chartOptions,
                plugins: {
                  ...chartOptions.plugins,
                  legend: {
                    ...chartOptions.plugins.legend,
                    position: 'bottom',
                  },
                },
              }} 
            />
          </div>
        </div>

        {/* Threats Tactics */}
        <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
          <h3 className="text-lg font-semibold mb-4">Threats Tactics</h3>
          <div className="h-64">
            <Doughnut data={tacticsData} options={doughnutOptions} />
          </div>
        </div>

        {/* Threats Status */}
        <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
          <h3 className="text-lg font-semibold mb-4">Threats Status (Last 6 Months)</h3>
          <div className="h-64">
            <Bar 
              data={statusData} 
              options={{
                ...chartOptions,
                plugins: {
                  ...chartOptions.plugins,
                  legend: {
                    ...chartOptions.plugins.legend,
                    position: 'bottom',
                  },
                },
              }} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
