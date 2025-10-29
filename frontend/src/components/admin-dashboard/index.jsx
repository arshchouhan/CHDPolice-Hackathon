import React from 'react';
import StatsCard from './StatsCard';
import GaugeCard from './GaugeCard';
import SeverityDial from './SeverityDial';
import GlobalFootprint from './GlobalFootprint';
import ASNOwnership from './ASNOwnership';
import CertificatesCard from './CertificatesCard';
import ExposureCategories from './ExposureCategories';
import ExposedPorts from './ExposedPorts';

const AdminDashboard = () => {
  return (
    <div className="min-h-screen bg-[#0b0e11] text-white p-4">
      {/* Top bar */}
      <header className="sticky top-0 z-10 backdrop-blur bg-[#0b0e11]/70 border-b border-white/5 mb-6 pb-4">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Attack Surface Dashboard</h1>
          <div className="text-xs text-white/60">v1.0 • Mock data</div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-6">
        {/* Stat tiles */}
        <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatsCard 
            label="Domains" 
            value={12} 
            subtitle="For Last month" 
            delta={{ value: "+5%", positive: true }} 
          />
          <StatsCard 
            label="Subdomains" 
            value={373} 
            subtitle="For Last month" 
            delta={{ value: "+2%", positive: true }} 
          />
          <StatsCard 
            label="IPs" 
            value={369} 
            subtitle="For Last month" 
            delta={{ value: "-8%", positive: false }} 
          />
          <StatsCard 
            label="Dormant" 
            value={15} 
            subtitle="For Last month" 
            delta={{ value: "+3%", positive: true }} 
          />
          <StatsCard 
            label="Ports" 
            value={4704} 
            subtitle="For Last month" 
            delta={{ value: "+3%", positive: true }} 
          />
        </section>

        {/* Middle section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <GaugeCard value={75} />
          <SeverityDial />
          <div className="grid grid-cols-1 gap-6">
            <GlobalFootprint />
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ASNOwnership />
          <CertificatesCard />
          <ExposureCategories />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ExposedPorts />
          {/* Empty slots for future widgets */}
          <div className="rounded-2xl border border-dashed border-white/10 p-6 text-white/40">Add widget…</div>
          <div className="rounded-2xl border border-dashed border-white/10 p-6 text-white/40">Add widget…</div>
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;
