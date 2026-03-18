import React from 'react';

const GaugeCard = ({ value = 75 }) => {
  const clamped = Math.max(0, Math.min(100, value));
  const rotation = (clamped / 100) * 180 - 90;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-6 text-center">Security Risk Level</div>
      <div className="relative w-full aspect-[2/1] overflow-hidden">
        <div className="absolute inset-0 flex items-end justify-center">
          <div className="w-[90%] h-[180%] rounded-[999px] bg-gray-50 border border-gray-100 blur-0" />
        </div>
        <div className="absolute left-1/2 bottom-0 h-3 w-3 -translate-x-1/2 translate-y-1/2 rounded-full bg-gray-200 border border-gray-300" />
        <div
          className="absolute left-1/2 bottom-0 origin-bottom h-[75%] w-1 bg-gray-900 rounded-t-full shadow-sm"
          style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
        />
        <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 h-5 w-5 rounded-full bg-white border-2 border-gray-900 shadow-md" />
      </div>
      <div className="mt-4 text-center">
        <span className="text-3xl font-black text-gray-900">{clamped}%</span>
        <p className="text-[10px] font-bold uppercase text-gray-400 tracking-tighter mt-1">Calculated Exposure</p>
      </div>
    </div>
  );
};

export default GaugeCard;
