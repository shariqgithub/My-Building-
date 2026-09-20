import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { AndroidInstallModal } from './AndroidInstallModal';
import { Smartphone, Download, Check } from 'lucide-react';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'nav' | 'banner' | 'pill';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'nav',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  // If already running in standalone installed app mode, show subtle badge or hide
  if (isInstalled) {
    if (variant === 'nav') {
      return (
        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
          <Check className="w-3 h-3 text-emerald-600" />
          App Installed
        </span>
      );
    }
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-1.5 font-bold text-xs transition-all shadow-xs cursor-pointer ${
          variant === 'banner'
            ? 'px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl'
            : variant === 'pill'
            ? 'px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-[11px]'
            : 'px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl'
        } ${className}`}
        title="Install this app on Android mobile phone"
      >
        <Smartphone className="w-3.5 h-3.5 text-emerald-200" />
        <span>Install App</span>
        <span className="text-[10px] font-normal opacity-90 hidden md:inline">
          (Android / Phone)
        </span>
      </button>

      <AndroidInstallModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
};
