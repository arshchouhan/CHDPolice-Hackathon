import React from 'react';

const StatsCard = ({ label, value, subtitle, delta, icon }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-start gap-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="shrink-0 p-2 bg-gray-50 rounded-lg border border-gray-100">{icon}</div>
      <div className="flex-1">
        <div className="text-xs font-bold uppercase tracking-wider text-gray-400">{label}</div>
        <div className="text-3xl font-black mt-1 text-gray-900">{value}</div>
        <div className="mt-2 flex items-center gap-2">
          {subtitle && <span className="text-[10px] uppercase font-bold text-gray-400">{subtitle}</span>}
          {delta && (
            <span
              className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded border ${
                delta.positive ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-700 border-red-100"
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
