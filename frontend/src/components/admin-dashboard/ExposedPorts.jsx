import React from 'react';

const ExposedPorts = () => {
  const rows = [
    { port: 22, pct: 28 },
    { port: 80, pct: 50 },
    { port: 443, pct: 52 },
    { port: 3306, pct: 100 },
    { port: 8080, pct: 68 },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm font-bold uppercase tracking-widest text-gray-400">Exposed Ports</div>
        <div className="text-[10px] font-black uppercase text-gray-400 cursor-pointer hover:text-gray-900 transition-colors">View All ▾</div>
      </div>
      <div className="space-y-4">
        {rows.map((row, index) => (
          <div key={index}>
            <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1.5">
              <span>Port {row.port}</span>
              <span className="text-gray-400">{row.pct}%</span>
            </div>
            <div className="h-2 rounded bg-gray-100 overflow-hidden border border-gray-50">
              <div 
                className="h-full rounded bg-gray-400" 
                style={{ width: `${row.pct}%` }} 
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExposedPorts;
