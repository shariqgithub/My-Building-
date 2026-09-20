import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { useBuilding } from '../context/BuildingContext';
import { FlatReadingEntry } from '../types';
import { generateUpiUrl } from '../utils/billingCalculator';
import {
  X,
  QrCode,
  Smartphone,
  Copy,
  Check,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

interface UpiPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  reading: FlatReadingEntry;
  monthName: string;
}

export const UpiPaymentModal: React.FC<UpiPaymentModalProps> = ({
  isOpen,
  onClose,
  reading,
  monthName,
}) => {
  const { settings, submitResidentPaymentProof } = useBuilding();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [copiedUpi, setCopiedUpi] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [activeQrView, setActiveQrView] = useState<'custom' | 'dynamic'>(
    settings.upiQrCodeUrl ? 'custom' : 'dynamic'
  );

  const amountToPay = reading.netPayableAmount ?? reading.totalBillAmount;
  const transactionNote = `Flat ${reading.flatNumber} Elec Bill ${monthName}`;

  const upiLink = generateUpiUrl({
    upiId: settings.societyUpiId,
    payeeName: settings.societyPayeeName,
    amount: amountToPay,
    transactionNote,
  });

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        upiLink,
        {
          width: 200,
          margin: 1.5,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        },
        (error) => {
          if (error) console.error('QR code generation error', error);
        }
      );
    }
  }, [isOpen, upiLink, activeQrView]);

  if (!isOpen) return null;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(settings.societyUpiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleSubmitUtr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrNumber.trim()) return;

    submitResidentPaymentProof(
      `cycle-${monthName.toLowerCase().replace(' ', '-')}`,
      reading.flatId,
      utrNumber.trim(),
      amountToPay
    );

    setSubmitted(true);
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 },
    });

    setTimeout(() => {
      onClose();
      setSubmitted(false);
      setUtrNumber('');
    }, 2500);
  };

  const hasPreviousDues = (reading.previousBalance ?? 0) > 0;
  const hasPreviousAdvance = (reading.previousBalance ?? 0) < 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-sm sm:max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-8 space-y-3">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Payment Submitted!</h3>
            <p className="text-xs text-slate-600 max-w-xs mx-auto">
              UTR <span className="font-mono font-bold text-slate-900">{utrNumber}</span> has been sent to the building admin for verification. Status is updated to Pending.
            </p>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="text-center mb-3">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                100% Free Direct UPI Payment (₹0 Gateway Fees)
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-2">
                Flat {reading.flatNumber} Electricity Bill
              </h2>
              <div className="mt-1 flex items-baseline justify-center gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  ₹{amountToPay.toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  (Net Payable)
                </span>
              </div>

              {/* Notice if previous balance / advance is included */}
              {hasPreviousDues && (
                <div className="mt-1 inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                  Includes +₹{(reading.previousBalance ?? 0).toLocaleString('en-IN')} previous unpaid dues
                </div>
              )}
              {hasPreviousAdvance && (
                <div className="mt-1 inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Includes -₹{Math.abs(reading.previousBalance ?? 0).toLocaleString('en-IN')} previous advance credit
                </div>
              )}
            </div>

            {/* QR Code Tab Switcher (if admin uploaded custom QR) */}
            {settings.upiQrCodeUrl && (
              <div className="flex p-1 bg-slate-100 rounded-xl mb-3 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveQrView('custom')}
                  className={`flex-1 py-1.5 text-center font-bold rounded-lg transition-colors flex items-center justify-center gap-1 ${
                    activeQrView === 'custom'
                      ? 'bg-white text-emerald-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Society Admin QR
                </button>
                <button
                  type="button"
                  onClick={() => setActiveQrView('dynamic')}
                  className={`flex-1 py-1.5 text-center font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 ${
                    activeQrView === 'dynamic'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5 text-slate-500" />
                  Auto-Filled ₹{amountToPay} QR
                </button>
              </div>
            )}

            {/* QR Code Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center mb-3.5">
              {settings.upiQrCodeUrl && activeQrView === 'custom' ? (
                <div>
                  <div className="inline-block bg-white p-2 rounded-xl border border-slate-200 shadow-xs mb-2">
                    <img
                      src={settings.upiQrCodeUrl}
                      alt="Society Admin UPI QR Code"
                      className="max-h-56 max-w-full mx-auto object-contain rounded-lg"
                    />
                  </div>
                  <div className="text-center">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Official Admin QR Code Verified
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Scan via GPay, PhonePe, Paytm, BHIM & enter ₹{amountToPay}
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="inline-block bg-white p-2 rounded-xl border border-slate-200 shadow-xs mb-2">
                    <canvas ref={canvasRef} className="mx-auto" />
                  </div>
                  <p className="text-xs text-slate-600 font-medium flex items-center justify-center gap-1">
                    <QrCode className="w-3.5 h-3.5 text-slate-500" />
                    Scan with any UPI App • Exact amount ₹{amountToPay} pre-filled
                  </p>
                </div>
              )}
            </div>

            {/* Direct 1-Tap Mobile UPI Intent Button */}
            <div className="space-y-2 mb-4">
              <a
                href={upiLink}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors text-center"
              >
                <Smartphone className="w-4 h-4" />
                Pay via Installed UPI App (GPay/PhonePe)
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>

              {/* Society UPI ID with Copy */}
              <div className="flex items-center justify-between p-2.5 bg-slate-100 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-semibold">
                    Society UPI ID (VPA)
                  </span>
                  <span className="font-mono font-bold text-slate-800 text-[11px] sm:text-xs">
                    {settings.societyUpiId}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="p-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 transition-colors flex items-center gap-1 text-[11px] font-medium"
                >
                  {copiedUpi ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-500" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Submit Reference / UTR Section */}
            <form onSubmit={handleSubmitUtr} className="border-t border-slate-100 pt-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Already Paid? Enter UPI Reference / UTR No.
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  placeholder="e.g. 423982710192"
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-mono"
                  required
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition-colors shrink-0"
                >
                  Submit Proof
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Admin will verify this UTR and mark your bill as officially Paid.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
