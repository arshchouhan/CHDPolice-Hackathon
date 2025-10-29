import React from 'react';

const StatsCard = ({ label, value, subtitle, delta, icon }) => {
  return (
    <div className="bg-[#101214] border border-white/5 rounded-2xl p-4 flex items-start gap-3">
      <div className="shrink-0">{icon}</div>
      <div className="flex-1">
        <div className="text-xs text-white/60">{label}</div>
        <div className="text-2xl font-semibold mt-1">{value}</div>
        <div className="mt-1 flex items-center gap-2">
          {subtitle && <span className="text-xs text-white/50">{subtitle}</span>}
          {delta && (
            <span
              className={`text-xs px-1.5 py-0.5 rounded-md ${
                delta.positive ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
              }`}
            >
              {delta.value}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
