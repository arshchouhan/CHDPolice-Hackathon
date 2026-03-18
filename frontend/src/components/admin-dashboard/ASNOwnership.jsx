import React from 'react';

const ASNOwnership = () => {
  const data = [
    { month: "Jan", a: 120, b: 80, c: 160 },
    { month: "Feb", a: 60, b: 140, c: 90 },
    { month: "Mar", a: 200, b: 110, c: 100 },
    { month: "Apr", a: 90, b: 180, c: 120 },
    { month: "May", a: 150, b: 140, c: 210 },
    { month: "Jun", a: 110, b: 170, c: 230 },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-6">Asset Ownership Trends</div>
      <div className="grid grid-cols-6 gap-3 items-end h-44 border-b border-gray-100 pb-2">
        {data.map((d, index) => (
          <div key={index} className="group flex flex-col items-center gap-2">
            <div className="flex items-end gap-1 w-full justify-center">
              <div className="w-2.5 rounded-t-sm bg-gray-200 group-hover:bg-gray-300 transition-colors" style={{ height: d.a / 2 }} />
              <div className="w-2.5 rounded-t-sm bg-gray-400 group-hover:bg-gray-500 transition-colors" style={{ height: d.b / 2 }} />
              <div className="w-2.5 rounded-t-sm bg-gray-900 group-hover:bg-black transition-colors" style={{ height: d.c / 2 }} />
            </div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{d.month}</div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-6 text-[10px] font-bold uppercase tracking-widest">
        <span className="flex items-center gap-2 text-gray-400">
          <i className="h-3 w-3 rounded-sm bg-gray-200 border border-gray-300" /> Cloud Assets
        </span>
        <span className="flex items-center gap-2 text-gray-400">
          <i className="h-3 w-3 rounded-sm bg-gray-400 border border-gray-500" /> Local Hubs
        </span>
        <span className="flex items-center gap-2 text-gray-900">
          <i className="h-3 w-3 rounded-sm bg-gray-900" /> Edge Nodes
        </span>
      </div>
    </div>
  );
};

export default ASNOwnership;
