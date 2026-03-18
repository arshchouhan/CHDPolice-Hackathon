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
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-4">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200 mb-8 rounded-b-xl shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-black">A</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">Attack Surface Overview</h1>
          </div>
          <div className="px-3 py-1 rounded bg-gray-100 border border-gray-200 text-[10px] font-black uppercase text-gray-400 tracking-widest">v2.0 • Management Suite</div>
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
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 flex flex-col items-center justify-center bg-gray-50/50 hover:bg-gray-100 transition-colors cursor-pointer group">
            <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-300 group-hover:text-gray-500 transition-colors font-bold text-xl">+</div>
            <span className="mt-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Configure Extension</span>
          </div>
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 flex flex-col items-center justify-center bg-gray-50/50 hover:bg-gray-100 transition-colors cursor-pointer group">
            <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-300 group-hover:text-gray-500 transition-colors font-bold text-xl">+</div>
            <span className="mt-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Add Log View</span>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;
