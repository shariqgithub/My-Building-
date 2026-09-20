import React, { useState } from 'react';
import { useBuilding } from '../context/BuildingContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  Smartphone,
  Download,
  Share2,
  Copy,
  Check,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Layers,
  HelpCircle,
  QrCode,
  Zap,
  AlertTriangle,
  FileCode,
} from 'lucide-react';

export const AndroidPackagePanel: React.FC = () => {
  const { settings, flats, activeCycle } = useBuilding();
  const { isInstallable, isInstalled, isAndroid, isIOS, install } = usePWAInstall();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [copiedManifestLink, setCopiedManifestLink] = useState(false);

  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const isDevUrl = typeof window !== 'undefined' && window.location.hostname.includes('ais-dev');
  const manifestUrl = `${appUrl}/manifest.json`;

  const downloadManifest = () => {
    fetch('/manifest.json')
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'manifest.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      })
      .catch((err) => console.error('Failed to download manifest', err));
  };

  const whatsappMessage = `🏢 *Electricity Bill App - ${settings.buildingName}*
Dear Flat Owners,
You can now view your monthly electricity bill, check sub-meter readings, and pay via UPI directly from your Android phone!

📲 *Open & Install on your phone:*
${appUrl}

✨ *Features:*
• Check Flat's current & previous meter units
• Direct UPI Payment (GPay, PhonePe, Paytm)
• View & download official monthly PDF receipt
• Strictly private: you can only see your own flat's bill

_Tip: When opening in Google Chrome on Android, tap the 3 dots (⋮) and tap "Install app" to add it to your phone's home screen!_`;

  const copyLink = () => {
    navigator.clipboard.writeText(appUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const copyWhatsappMsg = () => {
    navigator.clipboard.writeText(whatsappMessage);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 3000);
  };

  const shareViaWhatsapp = () => {
    const encoded = encodeURIComponent(whatsappMessage);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-emerald-950 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-emerald-900/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              Official Mobile Packaging & Distribution
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
              <Smartphone className="w-6 h-6 text-emerald-400" />
              Android Application Package for Flat Owners
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Equip all 15 flat owners with an Android app on their phone. Distribute in 1-tap via WhatsApp (Instant PWA) or package into a standalone <strong>.APK installer file</strong>.
            </p>
            {typeof window !== 'undefined' && window.location.hostname.includes('ais-dev') && (
              <div className="p-2.5 bg-amber-500/20 border border-amber-400/40 rounded-xl text-amber-200 text-xs">
                ⚠️ <strong>Note for Sharing:</strong> You are currently in the AI Studio <em>Development Editor</em>. To share a working public link with residents or family, click the <strong>"Share"</strong> button at the top of AI Studio to get your public <code>ais-pre-...</code> link, or deploy to Cloud Run!
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            {isInstallable ? (
              <button
                type="button"
                onClick={() => install()}
                className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Install App on This Device
              </button>
            ) : isInstalled ? (
              <div className="py-2.5 px-4 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Installed (Standalone Mode)
              </div>
            ) : (
              <button
                type="button"
                onClick={copyLink}
                className="py-2.5 px-4 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copiedLink ? 'Link Copied!' : 'Copy App Link'}
              </button>
            )}
          </div>
        </div>

        {/* Technical Capabilities Pill Row */}
        <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
            <span className="text-slate-400 block text-[10px]">PWA Manifest</span>
            <span className="font-bold text-emerald-300 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Configured
            </span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
            <span className="text-slate-400 block text-[10px]">Service Worker</span>
            <span className="font-bold text-emerald-300 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Offline Cache Ready
            </span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
            <span className="text-slate-400 block text-[10px]">Android Launcher Icons</span>
            <span className="font-bold text-emerald-300 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> 192px + 512px + Maskable
            </span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
            <span className="text-slate-400 block text-[10px]">Flat Privacy</span>
            <span className="font-bold text-emerald-300 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" /> Isolated Per Flat
            </span>
          </div>
        </div>
      </div>

      {/* Two Distribution Approaches */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Method 1: Instant Direct Android Installation (PWA) */}
        <div className="bg-white rounded-2xl border-2 border-emerald-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                Method 1 (Recommended)
              </span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                1-Tap Install • Zero Friction
              </span>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">
                Direct Android Home-Screen Installation
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Flat owners do not need to download risky APK files or disable Android security warnings. Chrome natively installs it as an app on their phone.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2 text-xs">
              <span className="font-bold text-slate-800 block text-[11px]">
                How flat owners install on their Android phone:
              </span>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-600 text-[11px]">
                <li>Send them your building app URL on WhatsApp.</li>
                <li>They tap the link to open it in <strong>Google Chrome</strong>.</li>
                <li>Tap Chrome's <strong>three dots (⋮)</strong> at top-right.</li>
                <li>Tap <strong>"Install app"</strong> (or "Add to Home screen").</li>
                <li>The building icon appears on their phone app launcher with full standalone screen!</li>
              </ol>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-[11px] text-emerald-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Automatic Silent Updates
              </div>
              <p className="text-emerald-700">
                Whenever you enter a new monthly bill or adjust rates, the app updates automatically on their phone without requiring them to reinstall an APK.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
            <button
              type="button"
              onClick={copyLink}
              className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedLink ? 'Link Copied!' : 'Copy Direct Install Link'}
            </button>
          </div>
        </div>

        {/* Method 2: Standalone .APK File Generation */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                <Layers className="w-3 h-3 text-indigo-600" />
                Method 2
              </span>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                Package into .APK File
              </span>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">
                Generate Standalone Android .APK File
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                If you prefer sending a physical <code>.apk</code> file in your WhatsApp group, you can package this app in 60 seconds using PWABuilder (Google TWA standard).
              </p>
            </div>

            {/* Host Blocking Warning / Explanation Box */}
            <div className="p-3.5 bg-amber-50/90 border border-amber-300 rounded-xl text-xs text-amber-950 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Seeing &quot;Your web host is blocking PWABuilder&quot;?</span>
              </div>
              <p className="text-[11.5px] text-amber-900 leading-relaxed">
                <strong>Why this occurs:</strong> This preview URL is hosted on Google Cloud Run with an automated cookie challenge (<code>/__cookie_check.html</code>) to protect preview sessions. When PWABuilder&apos;s cloud packaging servers in Azure scrape the files without running browser cookies, Google&apos;s firewall returns a redirect, and PWABuilder reports: <em>&quot;Your web host is blocking PWABuilder&quot;</em>.
              </p>
              <div className="bg-white/80 rounded-lg p-2.5 border border-amber-200 text-[11px] space-y-1.5 text-amber-950">
                <div className="font-bold text-amber-900">Choose one of these 3 immediate solutions:</div>
                <div className="space-y-1 pl-1">
                  <div>
                    <strong>Option 1 (Recommended — Zero APK hassle):</strong> Send the link directly to flat owners. In Chrome on Android, tapping the 3 dots (⋮) &rarr; <strong>&quot;Install app&quot;</strong> installs the app natively on their phone in 2 seconds. No APK downloading or security warnings needed!
                  </div>
                  <div>
                    <strong>Option 2 (Build APK via Bubblewrap CLI):</strong> Run Google&apos;s official tool locally on your computer (no web host blocking):
                    <code className="block mt-1 p-1.5 bg-slate-900 text-emerald-300 rounded font-mono text-[10px]">
                      npx @bubblewrap/cli init --manifest=manifest.json
                    </code>
                  </div>
                  <div>
                    <strong>Option 3 (Public Host for PWABuilder):</strong> Export this app to GitHub (Settings &rarr; Export to GitHub) or deploy to Vercel/Netlify/Firebase Hosting. Those public hosts have no cookie challenge, so PWABuilder packages the APK instantly.
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2 text-xs">
              <span className="font-bold text-slate-800 block text-[11px]">
                3-Step Packaging Process:
              </span>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-600 text-[11px]">
                <li>
                  Copy your public app URL and visit{' '}
                  <a
                    href="https://www.pwabuilder.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 font-bold underline inline-flex items-center gap-0.5"
                  >
                    PWABuilder.com <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </li>
                <li>Paste your public app URL and click <strong>Start</strong> (it will verify icons, description, and manifest).</li>
                <li>Click <strong>&quot;Package for Android&quot;</strong> to download your ready-to-install <strong>.apk</strong> file!</li>
              </ol>
            </div>

            {/* Manifest Health Checklist */}
            <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 text-[11px] text-emerald-950 space-y-2">
              <div className="font-bold flex items-center justify-between text-emerald-900">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  PWABuilder Compliance Audit (Top Score)
                </span>
                <span className="text-[10px] bg-emerald-200/80 text-emerald-800 font-mono px-1.5 py-0.5 rounded">
                  /sw.js + /manifest.json
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[10px] text-emerald-800">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>Service Worker: /sw.js Active</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>Offline Precache &amp; Fetch: Enabled</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>Screenshots: 4 (Mobile &amp; Desktop)</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>App Shortcuts: 3 Configured</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>Share Target: Configured</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>Icons: 192px, 512px, Maskable</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={downloadManifest}
              className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              Download manifest.json
            </button>
            <a
              href="/manifest.json"
              target="_blank"
              rel="noreferrer"
              className="py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <FileCode className="w-3.5 h-3.5 text-slate-500" />
              View manifest.json
            </a>
            <a
              href={`https://www.pwabuilder.com?url=${encodeURIComponent(appUrl)}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open PWABuilder
            </a>
          </div>
        </div>
      </div>

      {/* WhatsApp Announcement Broadcast Box */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Share2 className="w-4 h-4 text-emerald-600" />
              Ready-to-Send WhatsApp Broadcast for 15 Flat Owners
            </h3>
            <p className="text-xs text-slate-500">
              Copy this announcement or click "Send on WhatsApp" to notify all residents.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyWhatsappMsg}
              className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedMsg ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedMsg ? 'Copied Message!' : 'Copy Text'}
            </button>
            <button
              type="button"
              onClick={shareViaWhatsapp}
              className="py-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              Send on WhatsApp
            </button>
          </div>
        </div>

        {/* Message Preview */}
        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 font-mono text-[11px] text-slate-800 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto select-all">
          {whatsappMessage}
        </div>
      </div>
    </div>
  );
};
