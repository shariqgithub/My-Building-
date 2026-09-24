import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { useBuilding } from '../context/BuildingContext';
import { FlatReadingEntry } from '../types';
import { generateUpiUrl } from '../utils/billingCalculator';
import {
  X,
  QrCode,
  Copy,
  Check,
  ShieldCheck,
  CheckCircle2,
  ArrowDownToLine,
  Info,
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
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const amountToPay = reading.netPayableAmount ?? reading.totalBillAmount;
  const transactionNote = `Flat ${reading.flatNumber} Elec Bill ${monthName}`;

  const upiLink = generateUpiUrl({
    upiId: settings.societyUpiId,
    payeeName: settings.societyPayeeName,
    amount: amountToPay,
    transactionNote,
  });

  useEffect(() => {
    if (isOpen && canvasRef.current && !settings.upiQrCodeUrl) {
      QRCode.toCanvas(
        canvasRef.current,
        upiLink,
        {
          width: 220,
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
  }, [isOpen, upiLink, settings.upiQrCodeUrl]);

  if (!isOpen) return null;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(settings.societyUpiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleDownloadQr = () => {
    try {
      let dataUrl = '';
      if (settings.upiQrCodeUrl) {
        dataUrl = settings.upiQrCodeUrl;
      } else if (canvasRef.current) {
        dataUrl = canvasRef.current.toDataURL('image/png');
      }

      if (dataUrl) {
        const link = document.createElement('a');
        link.download = `Society_UPI_QR_Flat_${reading.flatNumber}_${monthName.replace(/\s+/g, '_')}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 5000);
      }
    } catch (err) {
      console.error('Error downloading QR code:', err);
    }
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

  const hasPendingAmount = (reading.pendingAmount ?? 0) > 0;
  const hasAdvanceAmount = (reading.advanceAmount ?? 0) > 0;
  const hasPreviousDues = !hasPendingAmount && (reading.previousBalance ?? 0) > 0;
  const hasPreviousAdvance = !hasAdvanceAmount && (reading.previousBalance ?? 0) < 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-sm sm:max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
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

              {/* Notice if pending / advance is included */}
              {hasPendingAmount && (
                <div className="mt-1 inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                  Includes +₹{(reading.pendingAmount ?? 0).toLocaleString('en-IN')} pending dues from previous month
                </div>
              )}
              {hasAdvanceAmount && (
                <div className="mt-1 inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Includes -₹{(reading.advanceAmount ?? 0).toLocaleString('en-IN')} advance credit deduction
                </div>
              )}
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

            {/* QR Code Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center mb-3">
              {settings.upiQrCodeUrl ? (
                <div>
                  <div className="inline-block bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs mb-2">
                    <img
                      src={settings.upiQrCodeUrl}
                      alt="Society Admin UPI QR Code"
                      className="max-h-56 max-w-full mx-auto object-contain rounded-xl"
                    />
                  </div>
                  <div className="text-center">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Official Admin QR Code Verified
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Scan or download &amp; pay exact amount ₹{amountToPay}
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="inline-block bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs mb-2">
                    <canvas ref={canvasRef} className="mx-auto rounded-lg" />
                  </div>
                  <p className="text-xs text-slate-600 font-medium flex items-center justify-center gap-1">
                    <QrCode className="w-3.5 h-3.5 text-slate-500" />
                    Scan with any UPI App • Exact amount ₹{amountToPay}
                  </p>
                </div>
              )}

              {/* Action Button Right Under QR: Download QR */}
              <div className="mt-3">
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <ArrowDownToLine className="w-4 h-4" />
                  <span>Download QR Code (Save to Phone)</span>
                </button>
              </div>

              {downloadSuccess && (
                <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center justify-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>QR Code saved to Gallery! Open GPay/PhonePe → Scan QR → Select from Gallery.</span>
                </div>
              )}
            </div>

            {/* How to Pay on Android Mobile Steps */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 mb-3 text-xs text-amber-950 space-y-1">
              <span className="font-bold flex items-center gap-1 text-amber-900 text-[11px] uppercase tracking-wider">
                <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                How to Pay on Mobile in 2 Easy Steps:
              </span>
              <p className="text-[11px] text-amber-900 leading-snug">
                1. Tap <strong>&quot;Download QR Code&quot;</strong> above to save it to your phone.
              </p>
              <p className="text-[11px] text-amber-900 leading-snug">
                2. Open <strong>GPay / PhonePe / Paytm / BHIM</strong>, tap the <strong>Scan QR</strong> icon, and select <strong>&quot;Upload from Gallery&quot;</strong> to pay.
              </p>
            </div>

            {/* Direct Copy & Mobile Payment Actions */}
            <div className="space-y-2 mb-4">
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
                  className="p-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 transition-colors flex items-center gap-1 text-[11px] font-medium cursor-pointer"
                >
                  {copiedUpi ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-500" />
                      Copy ID
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
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition-colors shrink-0 cursor-pointer"
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

