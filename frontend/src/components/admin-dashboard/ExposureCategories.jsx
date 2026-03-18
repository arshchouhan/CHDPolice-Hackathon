import React from 'react';

const ExposureCategories = () => {
  const total = 100;
  const slices = [
    { label: "Vulnerabilities", pct: 50, color: "#22c55e" },
    { label: "Certificates", pct: 25, color: "#38bdf8" },
    { label: "Risk Ports", pct: 15, color: "#f97316" },
    { label: "DNS", pct: 10, color: "#ef4444" },
  ];

  let acc = 0;
  const polar = (pct) => {
    const angle = ((acc + pct / 2) / total) * 2 * Math.PI;
    acc += pct;
    return { x: 50 + 35 * Math.cos(angle), y: 50 + 35 * Math.sin(angle) };
  };

  acc = 0;
  const paths = slices.map((s, i) => {
    const start = (acc / total) * 2 * Math.PI;
    const end = ((acc + s.pct) / total) * 2 * Math.PI;
    acc += s.pct;
    const large = s.pct > 50 ? 1 : 0;
    const x1 = 50 + 35 * Math.cos(start), y1 = 50 + 35 * Math.sin(start);
    const x2 = 50 + 35 * Math.cos(end), y2 = 50 + 35 * Math.sin(end);
    return (
      <path
        key={i}
        d={`M50,50 L${x1},${y1} A35,35 0 ${large} 1 ${x2},${y2} Z`}
        fill={s.color}
        opacity={0.9}
      />
    );
  });

  acc = 0;
  const labels = slices.map((s, i) => {
    const { x, y } = polar(s.pct);
    return (
      <text key={i} x={x} y={y} fontSize="6" fontWeight="bold" textAnchor="middle" dominantBaseline="middle" fill="#ffffff">
        {s.pct}%
      </text>
    );
  });

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-6">Threat Exposure Analysis</div>
      <div className="flex items-center gap-10">
        <div className="relative">
          <svg className="w-36 h-36" viewBox="0 0 100 100">
            {paths}
            {labels}
            <circle cx="50" cy="50" r="18" fill="white" />
            <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#111827">100</text>
          </svg>
        </div>
        <ul className="space-y-3 text-xs text-gray-600">
          {slices.map((s, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="inline-block h-3 w-3 rounded border border-gray-100 shadow-sm" style={{ background: s.color }} />
              <span className="font-semibold">{s.label}</span>
              <span className="text-gray-400 ml-auto">• {s.pct}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ExposureCategories;
