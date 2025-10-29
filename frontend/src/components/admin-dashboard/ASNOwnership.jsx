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
    <div className="bg-[#101214] border border-white/5 rounded-2xl p-4">
      <div className="text-sm text-white/60 mb-3">ASN Ownership</div>
      <div className="grid grid-cols-6 gap-2 items-end h-40">
        {data.map((d, index) => (
          <div key={index} className="flex flex-col items-center gap-1">
            <div className="w-3 rounded bg-white/20" style={{ height: d.a / 2 }} />
            <div className="w-3 rounded bg-white/35" style={{ height: d.b / 2 }} />
            <div className="w-3 rounded bg-white/50" style={{ height: d.c / 2 }} />
            <div className="text-[10px] text-white/40">{d.month}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-white/50">
        <span className="inline-flex items-center gap-1">
          <i className="h-2 w-2 rounded bg-white/20 inline-block" /> Wade Warren
        </span>
        <span className="inline-flex items-center gap-1">
          <i className="h-2 w-2 rounded bg-white/35 inline-block" /> Jenny Wilson
        </span>
        <span className="inline-flex items-center gap-1">
          <i className="h-2 w-2 rounded bg-white/50 inline-block" /> Guy Hawkins
        </span>
      </div>
    </div>
  );
};

export default ASNOwnership;
