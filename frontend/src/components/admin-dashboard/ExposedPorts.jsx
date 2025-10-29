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
    <div className="bg-[#101214] border border-white/5 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-white/60">Exposed Ports</div>
        <div className="text-xs text-white/40">View All ▾</div>
      </div>
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={index}>
            <div className="flex justify-between text-xs text-white/70">
              <span>Port {row.port}</span>
              <span>{row.pct}%</span>
            </div>
            <div className="mt-1 h-2 rounded bg-white/10">
              <div 
                className="h-2 rounded bg-white/40" 
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
