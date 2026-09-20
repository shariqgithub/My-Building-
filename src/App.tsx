import React, { useState } from 'react';
import { BuildingProvider, useBuilding } from './context/BuildingContext';
import { Navbar } from './components/Navbar';
import { LoginModal } from './components/LoginModal';
import { ProductionLogin } from './components/ProductionLogin';
import { ResidentDashboard } from './components/ResidentDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { LockScreen } from './components/LockScreen';
import { OfflineIndicator } from './components/OfflineIndicator';

const AppContent: React.FC = () => {
  const { currentSession, isAppLocked } = useBuilding();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isMobileFrame, setIsMobileFrame] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans antialiased">
      {/* Simulation Frame Wrapper for Desktop */}
      <div
        className={
          isMobileFrame
            ? 'max-w-md mx-auto my-4 sm:my-8 bg-white min-h-[840px] rounded-3xl shadow-2xl border-4 border-slate-800 overflow-hidden flex flex-col relative'
            : 'w-full min-h-screen flex flex-col bg-slate-100'
        }
      >
        {/* Mobile Status Bar Simulation if in Mobile Frame */}
        {isMobileFrame && (
          <div className="bg-slate-900 text-white px-5 py-1 text-[11px] font-semibold flex items-center justify-between select-none shrink-0">
            <span>9:41</span>
            <div className="w-16 h-3 bg-slate-800 rounded-full mx-auto" />
            <span className="flex items-center gap-1 font-mono">5G 100%</span>
          </div>
        )}

        {/* Navigation Bar */}
        <Navbar
          onOpenLogin={() => setIsLoginOpen(true)}
          isMobileFrame={isMobileFrame}
          setIsMobileFrame={setIsMobileFrame}
        />

        {/* Main Content Area */}
        <main
          className={`flex-1 ${
            isMobileFrame ? 'px-3.5 py-4 overflow-y-auto' : 'max-w-6xl mx-auto w-full px-3 sm:px-6 py-5'
          }`}
        >
          {!currentSession ? (
            <ProductionLogin />
          ) : isAppLocked ? (
            <LockScreen />
          ) : currentSession.role === 'admin' ? (
            <AdminDashboard />
          ) : (
            <ResidentDashboard />
          )}
        </main>

        {/* Professional Enterprise Footer */}
        <footer className="border-t border-slate-200/80 bg-white py-3.5 px-4 sm:px-6 text-xs text-slate-500">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>
                <strong>Smart Society Sub-Meter Engine</strong> &bull; Bank-grade UPI QR &bull; Firebase SMS Auth &bull; 15-Flat Isolation
              </span>
            </div>
          </div>
        </footer>
      </div>

      {/* Login / OTP Modal */}
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />

      {/* Network Offline Indicator */}
      <OfflineIndicator />
    </div>
  );
};

export default function App() {
  return (
    <BuildingProvider>
      <AppContent />
    </BuildingProvider>
  );
}
