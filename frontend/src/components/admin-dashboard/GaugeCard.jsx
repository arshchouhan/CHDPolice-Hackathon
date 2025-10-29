import React from 'react';

const GaugeCard = ({ value = 75 }) => {
  const clamped = Math.max(0, Math.min(100, value));
  const rotation = (clamped / 100) * 180 - 90;

  return (
    <div className="bg-[#101214] border border-white/5 rounded-2xl p-4">
      <div className="text-sm text-white/60 mb-3">Dark Web Risk Level</div>
      <div className="relative w-full aspect-[2/1] overflow-hidden">
        <div className="absolute inset-0 flex items-end justify-center">
          <div className="w-[90%] h-[180%] rounded-[999px] bg-gradient-to-b from-emerald-600/30 via-emerald-400/20 to-transparent blur-0" />
        </div>
        <div className="absolute left-1/2 bottom-0 h-2 w-2 -translate-x-1/2 translate-y-1/2 rounded-full bg-white/20" />
        <div
          className="absolute left-1/2 bottom-0 origin-bottom h-[70%] w-0.5 bg-emerald-300"
          style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
        />
        <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 h-4 w-4 rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.6)]" />
      </div>
      <div className="mt-3 text-center text-lg font-semibold">{clamped}%</div>
    </div>
  );
};

export default GaugeCard;
