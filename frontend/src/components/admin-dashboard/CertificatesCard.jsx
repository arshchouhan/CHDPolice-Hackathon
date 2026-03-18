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
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">SSL/TLS Certificates</div>
      <div className="divide-y divide-gray-100">
        {rows.map((row, index) => (
          <div key={index} className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${row.tone === 'green' ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-sm font-semibold text-gray-700">{row.label}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded border ${row.tone === 'green' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                {row.tone === 'green' ? 'Active' : 'N/A'}
              </span>
              <span className="text-sm font-black text-gray-900">{row.count}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CertificatesCard;
