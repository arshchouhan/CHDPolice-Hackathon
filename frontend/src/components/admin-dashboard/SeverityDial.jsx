import React from 'react';

const SeverityDial = ({ 
  items = [
    { label: "Exploited", total: 45, color: "#ef4444" },
    { label: "Critical", total: 15, color: "#f97316" },
    { label: "High", total: 55, color: "#f59e0b" },
    { label: "Medium", total: 65, color: "#22c55e" },
    { label: "Low", total: 85, color: "#84cc16" },
  ] 
}) => {
  const ring = (pct) => {
    const c = 2 * Math.PI * 36;
    const dash = (pct / 100) * c;
    return { strokeDasharray: `${dash} ${c - dash}` };
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-6">Threat Exposure Severity</div>
      <div className="grid grid-cols-5 gap-6">
        {items.map((item, idx) => (
          <div key={idx} className="flex flex-col items-center">
            <svg className="h-24 w-24 -rotate-90 filter drop-shadow-sm" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="36" stroke="#f3f4f6" strokeWidth="8" fill="none" />
              <circle
                cx="40"
                cy="40"
                r="36"
                strokeWidth="8"
                fill="none"
                stroke={item.color}
                {...ring(Math.min(100, item.total))}
                strokeLinecap="round"
              />
              <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#111827" transform="rotate(90,40,40)">
                {item.total}
              </text>
            </svg>
            <div className="text-[10px] font-bold uppercase mt-3 text-gray-400 tracking-wider h-8 text-center">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SeverityDial;
