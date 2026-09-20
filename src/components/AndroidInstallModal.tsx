import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  Smartphone,
  Download,
  CheckCircle2,
  Share2,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  Info,
  X,
  Layers,
} from 'lucide-react';

interface AndroidInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidInstallModal: React.FC<AndroidInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [copiedLink, setCopiedLink] = useState(false);
  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';

  if (!isOpen) return null;

  const copyAppUrl = () => {
    navigator.clipboard.writeText(appUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleNativeInstall = async () => {
    if (isInstallable) {
      await install();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-auto max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Install on Android Phones
              </h2>
              <p className="text-xs text-slate-500">
                For Flat Owners & Society Residents
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Already installed banner */}
        {isInstalled && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>App is already installed and running in standalone app mode on this device!</span>
          </div>
        )}

        <div className="mt-4 space-y-4 text-xs">
          {/* Method 1: Instant Direct Android Installation (PWA) */}
          <div className="p-4 bg-gradient-to-br from-emerald-50/80 to-teal-50/50 border border-emerald-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 font-bold text-emerald-900 text-xs">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Recommended: 1-Tap Direct Phone Install
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Zero Setup
              </span>
            </div>

            <p className="text-slate-600 text-[11px] leading-relaxed">
              Flat owners can install this app directly on their Android home screen without needing to enable "unknown APK sources" or pay Google Play fees.
            </p>

            {isInstallable ? (
              <button
                type="button"
                onClick={handleNativeInstall}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 text-xs transition-colors"
              >
                <Download className="w-4 h-4" />
                Install App on This Android Device Now
              </button>
            ) : (
              <div className="bg-white/80 border border-emerald-100 p-3 rounded-xl space-y-2">
                <span className="font-bold text-slate-800 block text-[11px]">
                  How Flat Owners Install on Android Chrome:
                </span>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px]">
                  <li>Open the building app URL in <strong>Google Chrome</strong> on Android.</li>
                  <li>Tap the <strong>three dots (⋮)</strong> menu at the top-right of Chrome.</li>
                  <li>Tap <strong>"Install app"</strong> (or <strong>"Add to Home screen"</strong>).</li>
                  <li>The app icon appears on their Android home screen and opens in full-screen standalone mode!</li>
                </ol>
              </div>
            )}
          </div>

          {/* Share App Link with Flat Owners via WhatsApp */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                Share Install Link with All 15 Flat Owners
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Copy this link and send it in your building WhatsApp group. Flat owners can tap the link and immediately log in with their phone number.
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={appUrl}
                className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-mono text-[11px] text-slate-700 select-all"
              />
              <button
                type="button"
                onClick={copyAppUrl}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors shrink-0"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink ? 'Copied!' : 'Copy Link'}
              </button>
            </div>

            {typeof window !== 'undefined' && window.location.hostname.includes('ais-dev') && (
              <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                💡 <strong>Important:</strong> Development preview URLs (starting with <code>ais-dev-...</code>) can only be opened in your own authenticated browser session. To send a link that other people can open, use the <strong>Share</strong> button in Google AI Studio to generate your public link (<code>ais-pre-...</code>) or deploy it!
              </p>
            )}
          </div>

          {/* Method 2: Building a Standalone .APK File */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                Need a standalone .APK file for WhatsApp?
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                PWA to APK
              </span>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              Because this app is now equipped with an official <strong>Web App Manifest</strong>, <strong>Service Worker</strong>, and <strong>high-res Android launcher icons (192px & 512px)</strong>, you can turn it into an installable Android <code>.apk</code> package in 60 seconds:
            </p>

            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5 text-[11px] text-slate-700">
              <p><strong>1.</strong> Visit <a href="https://www.pwabuilder.com" target="_blank" rel="noreferrer" className="text-indigo-600 font-bold underline inline-flex items-center gap-0.5">PWABuilder.com <ExternalLink className="w-2.5 h-2.5" /></a> (free tool by Microsoft).</p>
              <p><strong>2.</strong> Paste your app URL and click <strong>Start</strong>.</p>
              <p><strong>3.</strong> Click <strong>"Package for Android"</strong> to download a signed <code>.apk</code> ready to install on any Android phone.</p>
            </div>
          </div>

          {/* iOS Safari note if user is on iPhone */}
          {isIOS && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-slate-800 block text-xs">For iPhone / iOS Users:</span>
              <p className="text-[11px] text-slate-600">
                Tap the Safari <strong>Share</strong> button (square with arrow) → tap <strong>"Add to Home Screen"</strong>.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
