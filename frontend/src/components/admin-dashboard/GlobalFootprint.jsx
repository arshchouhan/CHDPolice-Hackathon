import React from 'react';

const GlobalFootprint = () => {
  const rows = [
    { country: "USA", share: 32 },
    { country: "Canada", share: 18 },
    { country: "China", share: 30 },
  ];

  return (
    <div className="bg-[#101214] border border-white/5 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-white/60">Global Footprint</div>
        <div className="text-xs text-white/40">Last Month ▾</div>
      </div>
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={index}>
            <div className="flex justify-between text-xs text-white/70">
              <span>{row.country}</span>
              <span>{row.share}%</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-white/10">
              <div 
                className="h-2 rounded-full bg-white/30" 
                style={{ width: `${row.share}%` }} 
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 text-[10px] text-white/40">* Map placeholder. Plug your map widget here later.</div>
    </div>
  );
};

export default GlobalFootprint;
