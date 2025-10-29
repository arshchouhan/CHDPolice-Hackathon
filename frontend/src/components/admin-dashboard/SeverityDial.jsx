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
    <div className="bg-[#101214] border border-white/5 rounded-2xl p-4">
      <div className="text-sm text-white/60 mb-3">Threat Exposures Severity</div>
      <div className="grid grid-cols-5 gap-4">
        {items.map((item, idx) => (
          <div key={idx} className="flex flex-col items-center">
            <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="36" stroke="#334155" strokeWidth="8" fill="none" />
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
              <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="12" fill="#e5e7eb" transform="rotate(90,40,40)">
                {item.total}
              </text>
            </svg>
            <div className="text-xs mt-2 text-white/70">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SeverityDial;
