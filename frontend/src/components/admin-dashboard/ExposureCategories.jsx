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
      <text key={i} x={x} y={y} fontSize="8" textAnchor="middle" dominantBaseline="middle" fill="#0b0e11">
        {s.pct}%
      </text>
    );
  });

  return (
    <div className="bg-[#101214] border border-white/5 rounded-2xl p-4">
      <div className="text-sm text-white/60 mb-3">Threat Exposures Categories</div>
      <div className="flex items-center gap-6">
        <svg className="w-32 h-32" viewBox="0 0 100 100">
          {paths}
          {labels}
          <circle cx="50" cy="50" r="20" fill="#0b0e11" />
          <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="10" fill="#e5e7eb">100</text>
        </svg>
        <ul className="space-y-1 text-xs text-white/70">
          {slices.map((s, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-sm" style={{ background: s.color }} />
              {s.label} • {s.pct}%
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ExposureCategories;
