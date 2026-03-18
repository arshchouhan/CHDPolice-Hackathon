import React from 'react';

const GlobalFootprint = () => {
  const rows = [
    { country: "USA", share: 32 },
    { country: "Canada", share: 18 },
    { country: "China", share: 30 },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm font-bold uppercase tracking-widest text-gray-400">Global Footprint</div>
        <div className="text-[10px] font-black uppercase text-gray-400 cursor-pointer hover:text-gray-900 transition-colors">Last Month ▾</div>
      </div>
      <div className="space-y-5">
        {rows.map((row, index) => (
          <div key={index}>
            <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1.5">
              <span>{row.country}</span>
              <span className="text-gray-400">{row.share}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden border border-gray-50">
              <div 
                className="h-full rounded-full bg-gray-900 transition-all duration-500" 
                style={{ width: `${row.share}%` }} 
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 text-[10px] text-gray-400 font-medium uppercase tracking-tighter">* Map synchronization pending • Geolocation Active</div>
    </div>
  );
};

export default GlobalFootprint;
