import React from 'react';

const CertificatesCard = () => {
  const rows = [
    { label: "Valid", count: 1, tone: "green" },
    { label: "Expired", count: 0, tone: "red" },
    { label: "Revoked", count: 0, tone: "rose" },
    { label: "Untrusted", count: 0, tone: "zinc" },
    { label: "Mismatched", count: 0, tone: "amber" },
  ];

  const toneBg = {
    green: "text-emerald-400",
    red: "text-red-400",
    amber: "text-amber-400",
    zinc: "text-zinc-300",
    rose: "text-rose-400",
  };

  return (
    <div className="bg-[#101214] border border-white/5 rounded-2xl p-4">
      <div className="text-sm text-white/60 mb-2">Certificates</div>
      <div className="divide-y divide-white/5">
        {rows.map((row, index) => (
          <div key={index} className="flex items-center justify-between py-2">
            <span className={`text-sm ${toneBg[row.tone]}`}>{row.label}</span>
            <span className="text-sm text-white/70">{row.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CertificatesCard;
